/**
 * WhatsAppAdapter — WhatsApp Business API provider abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a console-logging stub. In prod, the
 * real provider (e.g., Gupshup / 360dialog / Twilio WhatsApp) is injected
 * via the `WHATSAPP_PROVIDER` token.
 *
 * WhatsApp requires pre-approved templates for outbound business
 * messages. The adapter validates that the caller passed a `templateName`
 * for outbound messages (24-hour session windows are provider-managed).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { DeliveryResult, ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface WhatsAppMessage {
  to: string;            // E.164 phone number
  templateName: string;  // Pre-approved template name
  templateLanguage?: string; // ISO 639-1 (default 'en')
  variables?: Record<string, string>;
  // For session-window replies, body can be free-form text:
  bodyText?: string;
}

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';
export const WHATSAPP_CONFIG = 'WHATSAPP_CONFIG';

export interface WhatsAppConfig {
  apiKey?: string;
  apiSecret?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

export interface WhatsAppProviderPort {
  readonly name: string;
  send(msg: WhatsAppMessage, config: WhatsAppConfig): Promise<DeliveryResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class WhatsAppAdapter implements ExternalProvider {
  readonly name = 'whatsapp';
  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(WHATSAPP_PROVIDER) private readonly provider: WhatsAppProviderPort,
    @Inject(WHATSAPP_CONFIG) private readonly config: WhatsAppConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 5_000,
    });
  }

  async send(msg: WhatsAppMessage): Promise<DeliveryResult> {
    if (!msg.templateName && !msg.bodyText) {
      return {
        ok: false,
        error: 'WhatsApp message requires either templateName (template) or bodyText (session reply)',
      };
    }
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.send(msg, this.config),
      );
    } catch (err) {
      this.logger.error(`WhatsApp send to ${msg.to.slice(0, 4)}**** failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
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

@Injectable()
export class StubWhatsAppProvider implements WhatsAppProviderPort {
  readonly name = 'stub-whatsapp';
  private readonly logger = new Logger(StubWhatsAppProvider.name);

  async send(msg: WhatsAppMessage, _config: WhatsAppConfig): Promise<DeliveryResult> {
    const providerMessageId = `stub-wa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.logger.debug(
      `[STUB WhatsApp] to=${msg.to.slice(0, 4)}**** template=${msg.templateName} lang=${msg.templateLanguage ?? 'en'}`,
    );
    return { ok: true, providerMessageId, raw: { stub: true } };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
