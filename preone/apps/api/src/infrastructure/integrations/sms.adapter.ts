/**
 * SmsAdapter — SMS provider abstraction (Wave 17 + Wave 17.1).
 *
 * Wave 17:
 *   - Pluggable provider via SMS_PROVIDER token (stub default).
 *   - Circuit-breaker wrapping every call.
 *
 * Wave 17.1 (this version) adds tenant-aware provider selection:
 *   - Adapters accept an optional `tenantCtx` parameter.
 *   - If provided, the adapter:
 *       1. Checks IntegrationFeatureFlagService — if integration is
 *          disabled for the tenant, falls back to stub.
 *       2. Resolves tenant-specific config via
 *          TenantIntegrationConfigService (DB override or env fallback).
 *       3. Looks up the tenant's preferred provider in the
 *          SMS_PROVIDER_REGISTRY.
 *   - If no tenantCtx, uses the global env-configured provider
 *     (backward compatible with Wave 17 callers).
 *
 * All PII (phone numbers) is logged at DEBUG only, never at INFO+.
 *
 * Configuration:
 *   SMS_PROVIDER=twilio|msg91|gupshup|stub   (global default)
 *   SMS_FROM=+91XXXXXXXXXX
 *   SMS_API_KEY=...
 *   SMS_API_SECRET=...
 *   INTEGRATIONS_SMS_LIVE=auto|enabled|disabled   (Wave 17.1)
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { DeliveryResult, ExternalProvider, ProviderHealthResult } from './integrations.types';
import { IntegrationFeatureFlagService, type IntegrationKey } from './integration-feature-flag.service';
import { TenantIntegrationConfigService } from './tenant-integration-config.service';
import { SMS_PROVIDER_REGISTRY } from './integrations.module';

export interface SmsMessage {
  to: string;            // E.164 phone number
  body: string;          // Max 1400 chars (10 SMS segments)
  templateId?: string;   // DLT template ID (India TRAI compliance)
  variables?: Record<string, string>;
}

/** Tenant context — pass to make a call tenant-aware (Wave 17.1). */
export interface TenantCtx {
  tenantId: string;
  userId?: string;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';
export const SMS_CONFIG = 'SMS_CONFIG';

export interface SmsConfig {
  from: string;
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
}

export interface SmsProviderPort {
  readonly name: string;
  send(msg: SmsMessage, config: SmsConfig): Promise<DeliveryResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class SmsAdapter implements ExternalProvider {
  readonly name = 'sms';
  private readonly integrationKey: IntegrationKey = 'sms';
  private readonly logger = new Logger(SmsAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    private readonly flagService: IntegrationFeatureFlagService,
    private readonly tenantConfig: TenantIntegrationConfigService,
    @Inject(SMS_PROVIDER) private readonly provider: SmsProviderPort,
    @Inject(SMS_CONFIG) private readonly config: SmsConfig,
    @Inject(SMS_PROVIDER_REGISTRY) private readonly registry: Map<string, SmsProviderPort>,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 5_000,
    });
  }

  /**
   * Send an SMS. If `tenantCtx` is provided, resolves per-tenant
   * provider + config (Wave 17.1). Otherwise uses the global default
   * provider + config (Wave 17 behaviour).
   */
  async send(msg: SmsMessage, tenantCtx?: TenantCtx): Promise<DeliveryResult> {
    try {
      const { provider, config } = await this.resolveProvider(tenantCtx);
      return await this.circuit.exec(this.name, () =>
        provider.send(msg, config),
      );
    } catch (err) {
      this.logger.error(`SMS send to ${msg.to.slice(0, 4)}**** failed: ${(err as Error).message}`);
      return {
        ok: false,
        error: (err as Error).message,
      };
    }
  }

  async checkHealth(): Promise<ProviderHealthResult> {
    const start = Date.now();
    try {
      const healthy = await this.provider.checkHealth();
      return {
        name: this.name,
        healthy,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        name: this.name,
        healthy: false,
        circuitState: this.circuit.getState(this.name) ?? 'UNREGISTERED',
        lastError: (err as Error).message,
      };
    }
  }

  // ─── Wave 17.1 tenant-aware resolution ────────────────────────

  private async resolveProvider(
    tenantCtx?: TenantCtx,
  ): Promise<{ provider: SmsProviderPort; config: SmsConfig }> {
    if (!tenantCtx) {
      // No tenant context — use global default (Wave 17 behaviour).
      return { provider: this.provider, config: this.config };
    }

    // 1. Feature-flag check.
    const flag = await this.flagService.resolve(this.integrationKey, tenantCtx.tenantId, tenantCtx.userId);
    if (flag.resolution === 'disabled') {
      // Tenant has the integration disabled — fall back to stub.
      const stub = this.registry.get('stub');
      if (stub) {
        this.logger.debug(`SMS for tenant ${tenantCtx.tenantId} falling back to stub (flag=disabled)`);
        return { provider: stub, config: this.config };
      }
    }

    // 2. Resolve tenant-specific config (DB override or env fallback).
    const tenantCfg = await this.tenantConfig.resolve(this.integrationKey, tenantCtx.tenantId, {
      providerName: process.env.SMS_PROVIDER ?? 'stub',
      apiKey: this.config.apiKey,
      apiSecret: this.config.apiSecret,
      webhookSecret: undefined,
    });

    // 3. Pick provider from the registry.
    const resolved = this.registry.get(tenantCfg.providerName);
    if (!resolved) {
      this.logger.warn(`SMS provider '${tenantCfg.providerName}' not registered — falling back to stub`);
      const stub = this.registry.get('stub');
      return { provider: stub ?? this.provider, config: this.config };
    }

    // 4. Build per-call config from tenant override.
    const callConfig: SmsConfig = {
      from: (tenantCfg.metadata?.['from'] as string | undefined) ?? this.config.from,
      apiKey: tenantCfg.apiKey ?? this.config.apiKey,
      apiSecret: tenantCfg.apiSecret ?? this.config.apiSecret,
      senderId: (tenantCfg.metadata?.['senderId'] as string | undefined) ?? this.config.senderId,
    };
    return { provider: resolved, config: callConfig };
  }
}

/**
 * Stub provider — used in dev + tests. Logs the message to the console
 * and returns a fake provider message ID.
 */
@Injectable()
export class StubSmsProvider implements SmsProviderPort {
  readonly name = 'stub-sms';
  private readonly logger = new Logger(StubSmsProvider.name);

  async send(msg: SmsMessage, _config: SmsConfig): Promise<DeliveryResult> {
    const providerMessageId = `stub-sms-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.logger.debug(
      `[STUB SMS] to=${msg.to.slice(0, 4)}**** templateId=${msg.templateId ?? '-'} body="${msg.body.slice(0, 80)}${msg.body.length > 80 ? '...' : ''}"`,
    );
    return { ok: true, providerMessageId, raw: { stub: true } };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
