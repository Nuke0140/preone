/**
 * SmsAdapter — SMS provider abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a console-logging stub. In prod, the
 * real provider (e.g., Twilio / MSG91 / Gupshup) is injected via the
 * `SMS_PROVIDER` token. The adapter wraps every call in the circuit
 * breaker so a Twilio outage fails fast instead of backing up workers.
 *
 * Configuration:
 *   SMS_PROVIDER=twilio|msg91|gupshup|stub
 *   SMS_FROM=+91XXXXXXXXXX
 *   SMS_API_KEY=...
 *   SMS_API_SECRET=...
 *
 * All PII (phone numbers) is logged at DEBUG only, never at INFO+.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { DeliveryResult, ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface SmsMessage {
  to: string;            // E.164 phone number
  body: string;          // Max 1400 chars (10 SMS segments)
  templateId?: string;   // DLT template ID (India TRAI compliance)
  variables?: Record<string, string>;
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
  private readonly logger = new Logger(SmsAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(SMS_PROVIDER) private readonly provider: SmsProviderPort,
    @Inject(SMS_CONFIG) private readonly config: SmsConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 5_000,
    });
  }

  async send(msg: SmsMessage): Promise<DeliveryResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.send(msg, this.config),
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
