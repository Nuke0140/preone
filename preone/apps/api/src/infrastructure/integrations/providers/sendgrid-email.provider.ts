/**
 * SendGridEmailProvider — real SendGrid integration (Wave 17.1).
 *
 * SendGrid API docs: https://docs.sendgrid.com/api-reference/mail-send
 *
 * Single operation:
 *   - send  — POST /v3/mail/send
 *
 * Auth: Bearer token (api_key).
 *
 * Multipart: SendGrid accepts a single `content` array — we map
 * textBody → text/plain and htmlBody → text/html.
 */
import { Injectable, Logger } from '@nestjs/common';

import type { DeliveryResult } from '../integrations.types';
import type { EmailMessage, EmailProviderPort, EmailConfig } from '../email.adapter';

@Injectable()
export class SendGridEmailProvider implements EmailProviderPort {
  readonly name = 'sendgrid';
  private readonly logger = new Logger(SendGridEmailProvider.name);

  private static readonly API_BASE = 'https://api.sendgrid.com/v3';

  async send(msg: EmailMessage, config: EmailConfig): Promise<DeliveryResult> {
    if (!config.apiKey) {
      return { ok: false, error: 'SendGrid requires apiKey' };
    }
    const url = `${SendGridEmailProvider.API_BASE}/mail/send`;
    const to = Array.isArray(msg.to) ? msg.to : [msg.to];
    const content: Array<{ type: string; value: string }> = [];
    if (msg.textBody) content.push({ type: 'text/plain', value: msg.textBody });
    if (msg.htmlBody) content.push({ type: 'text/html', value: msg.htmlBody });

    const body: Record<string, unknown> = {
      personalizations: [
        {
          to: to.map((email) => ({ email })),
          ...(msg.cc?.length ? { cc: msg.cc.map((email) => ({ email })) } : {}),
          ...(msg.bcc?.length ? { bcc: msg.bcc.map((email) => ({ email })) } : {}),
        },
      ],
      from: { email: config.fromAddress, name: config.fromName ?? 'PreOne' },
      subject: msg.subject,
      content,
      ...(msg.replyTo ? { reply_to: { email: msg.replyTo } } : {}),
      ...(msg.tags?.length ? { categories: msg.tags } : {}),
    };

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      // SendGrid returns 202 Accepted with empty body on success.
      if (resp.status === 202) {
        const messageId = resp.headers.get('x-message-id') ?? undefined;
        return { ok: true, providerMessageId: messageId ?? `sg-${Date.now()}`, raw: { status: 202 } };
      }
      const errJson = await resp.json().catch(() => ({})) as Record<string, unknown>;
      return {
        ok: false,
        error: `SendGrid send failed: ${resp.status} ${JSON.stringify(errJson)}`,
        raw: errJson,
      };
    } catch (err) {
      return { ok: false, error: `SendGrid network error: ${(err as Error).message}` };
    }
  }

  async checkHealth(): Promise<boolean> {
    // SendGrid has no public health endpoint — we ping /v3/user/account
    // with a HEAD. A 401 means the API is up (just unauthorized).
    try {
      const resp = await fetch(`${SendGridEmailProvider.API_BASE}/user/account`, { method: 'HEAD' });
      return resp.status < 500;
    } catch {
      return false;
    }
  }
}
