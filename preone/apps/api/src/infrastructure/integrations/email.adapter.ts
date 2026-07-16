/**
 * EmailAdapter — transactional email provider abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a console-logging stub. In prod, the
 * real provider (e.g., AWS SES / SendGrid / Postmark) is injected via
 * the `EMAIL_PROVIDER` token.
 *
 * All emails are multipart text+HTML by default — callers provide both
 * `textBody` and `htmlBody`. PII (recipient email addresses) are logged
 * at DEBUG only.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { DeliveryResult, ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface EmailMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  fromName?: string;
  replyTo?: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    contentBase64: string;
  }>;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  tags?: string[];
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
export const EMAIL_CONFIG = 'EMAIL_CONFIG';

export interface EmailConfig {
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
  apiKey?: string;
  apiSecret?: string;
  region?: string;
}

export interface EmailProviderPort {
  readonly name: string;
  send(msg: EmailMessage, config: EmailConfig): Promise<DeliveryResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class EmailAdapter implements ExternalProvider {
  readonly name = 'email';
  private readonly logger = new Logger(EmailAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProviderPort,
    @Inject(EMAIL_CONFIG) private readonly config: EmailConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 5,
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 30,
      slowCallDurationMs: 10_000, // SES can be slower than SMS
    });
  }

  async send(msg: EmailMessage): Promise<DeliveryResult> {
    if (!msg.subject || (!msg.textBody && !msg.htmlBody)) {
      return {
        ok: false,
        error: 'Email requires subject + at least one of textBody/htmlBody',
      };
    }
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.send(msg, this.config),
      );
    } catch (err) {
      const toCount = Array.isArray(msg.to) ? msg.to.length : 1;
      this.logger.error(`Email send to ${toCount} recipient(s) failed: ${(err as Error).message}`);
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
export class StubEmailProvider implements EmailProviderPort {
  readonly name = 'stub-email';
  private readonly logger = new Logger(StubEmailProvider.name);

  async send(msg: EmailMessage, _config: EmailConfig): Promise<DeliveryResult> {
    const providerMessageId = `stub-email-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const to = Array.isArray(msg.to) ? msg.to : [msg.to];
    this.logger.debug(
      `[STUB Email] to=${to.length} recipient(s) subject="${msg.subject}"`,
    );
    return { ok: true, providerMessageId, raw: { stub: true } };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
