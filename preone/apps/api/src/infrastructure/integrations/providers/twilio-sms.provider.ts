/**
 * TwilioSmsProvider — real Twilio integration (Wave 17.1).
 *
 * Twilio API docs: https://www.twilio.com/docs/sms/api/message-resource
 *
 * Single operation:
 *   - send  — POST /2010-04-01/Accounts/<Sid>/Messages.json
 *
 * Auth: HTTP Basic with AccountSid:AuthToken.
 *
 * The `from` field must be a Twilio-purchased phone number (E.164) or
 * a Messaging Service SID (prefix: MGXXX). Set via SmsConfig.from.
 */
import { Injectable, Logger } from '@nestjs/common';

import type { DeliveryResult } from '../integrations.types';
import type { SmsMessage, SmsProviderPort, SmsConfig } from '../sms.adapter';

@Injectable()
export class TwilioSmsProvider implements SmsProviderPort {
  readonly name = 'twilio';
  private readonly logger = new Logger(TwilioSmsProvider.name);

  async send(msg: SmsMessage, config: SmsConfig): Promise<DeliveryResult> {
    if (!config.apiKey || !config.apiSecret) {
      return { ok: false, error: 'Twilio requires apiKey (AccountSid) + apiSecret (AuthToken)' };
    }
    if (!config.from) {
      return { ok: false, error: 'Twilio requires a from number (SmsConfig.from)' };
    }
    // Twilio AccountSid is in apiKey, AuthToken in apiSecret.
    const sid = config.apiKey;
    const token = config.apiSecret;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const body = new URLSearchParams();
    body.append('To', msg.to);
    body.append('From', config.from);
    body.append('Body', msg.body);
    if (config.senderId) body.append('MessagingServiceSid', config.senderId);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        return {
          ok: false,
          error: `Twilio send failed: ${resp.status} ${json['message'] ?? JSON.stringify(json)}`,
          raw: json,
        };
      }
      return {
        ok: true,
        providerMessageId: json['sid'] as string,
        raw: json,
      };
    } catch (err) {
      return { ok: false, error: `Twilio network error: ${(err as Error).message}` };
    }
  }

  async checkHealth(): Promise<boolean> {
    // Twilio has no public health endpoint — we ping /2010-04-01/Accounts
    // with a HEAD. A 401 means the API is up.
    try {
      const resp = await fetch('https://api.twilio.com/2010-04-01/Accounts.json', { method: 'HEAD' });
      return resp.status < 500;
    } catch {
      return false;
    }
  }
}
