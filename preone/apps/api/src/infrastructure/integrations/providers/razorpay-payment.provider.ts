/**
 * RazorpayPaymentProvider — real Razorpay integration (Wave 17.1).
 *
 * Razorpay API docs: https://razorpay.com/docs/api/orders/
 *
 * Three operations (matching PaymentProviderPort):
 *   - createOrder       — POST /v1/orders
 *   - verifyPayment     — HMAC-SHA256 signature verification (no API call)
 *   - refundPayment     — POST /v1/payments/<id>/refund
 *
 * Auth: HTTP Basic with key_id:key_secret.
 *
 * All amounts are in paise (1 INR = 100 paise) — matches the Prisma
 * schema's *Cents columns.
 *
 * Network: uses the global `fetch` (Node 18+). Timeouts are enforced
 * by the CircuitBreakerService via slowCallDurationMs — the provider
 * itself does NOT add its own timeout, to avoid double-wrapping.
 */
import { Injectable, Logger } from '@nestjs/common';

import type {
  CreateOrderRequest, CreateOrderResult,
  VerifyPaymentRequest, VerifyPaymentResult,
  RefundRequest, RefundResult,
  PaymentProviderPort, PaymentConfig,
} from '../payment.adapter';

@Injectable()
export class RazorpayPaymentProvider implements PaymentProviderPort {
  readonly name = 'razorpay';
  private readonly logger = new Logger(RazorpayPaymentProvider.name);

  private static readonly API_BASE = 'https://api.razorpay.com/v1';

  async createOrder(req: CreateOrderRequest, config: PaymentConfig): Promise<CreateOrderResult> {
    if (!config.apiKey || !config.apiSecret) {
      return { ok: false, error: 'Razorpay requires apiKey + apiSecret' };
    }
    const url = `${RazorpayPaymentProvider.API_BASE}/orders`;
    const body = {
      amount: req.amountCents,
      currency: req.currency,
      receipt: req.receiptId,
      notes: req.notes,
      payment_capture: 1,
    };
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.headers(config),
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        return {
          ok: false,
          error: `Razorpay createOrder failed: ${resp.status} ${json['error_description'] ?? json['error'] ?? JSON.stringify(json)}`,
          raw: json,
        };
      }
      return {
        ok: true,
        providerOrderId: json['id'] as string,
        amountCents: Number(json['amount']),
        currency: json['currency'] as string,
        raw: json,
      };
    } catch (err) {
      return { ok: false, error: `Razorpay createOrder network error: ${(err as Error).message}` };
    }
  }

  /**
   * Verify the payment signature returned by Razorpay Checkout.
   * This is a pure cryptographic check — no API call.
   *
   * Razorpay generates the signature as:
   *   HMAC_SHA256(order_id + '|' + payment_id, apiSecret)
   */
  async verifyPayment(req: VerifyPaymentRequest, config: PaymentConfig): Promise<VerifyPaymentResult> {
    if (!config.apiSecret) {
      return { ok: false, error: 'Razorpay verify requires apiSecret' };
    }
    try {
      const payload = `${req.providerOrderId}|${req.providerPaymentId}`;
      const expectedSig = await this.hmacSha256(payload, config.apiSecret);
      const verified = expectedSig === req.providerSignature;
      return {
        ok: true,
        verified,
        capturedAmountCents: verified ? req.expectedAmountCents : 0,
        ...(verified ? {} : { error: 'Signature mismatch' }),
      };
    } catch (err) {
      return { ok: false, error: `Razorpay verify error: ${(err as Error).message}` };
    }
  }

  async refundPayment(req: RefundRequest, config: PaymentConfig): Promise<RefundResult> {
    if (!config.apiKey || !config.apiSecret) {
      return { ok: false, error: 'Razorpay refund requires apiKey + apiSecret' };
    }
    const url = `${RazorpayPaymentProvider.API_BASE}/payments/${req.providerPaymentId}/refund`;
    const body: Record<string, unknown> = {};
    if (req.amountCents) body['amount'] = req.amountCents;
    if (req.notes) body['notes'] = req.notes;
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.headers(config),
        body: JSON.stringify(body),
      });
      const json = await resp.json() as Record<string, unknown>;
      if (!resp.ok) {
        return {
          ok: false,
          error: `Razorpay refund failed: ${resp.status} ${json['error_description'] ?? json['error'] ?? JSON.stringify(json)}`,
          raw: json,
        };
      }
      return {
        ok: true,
        providerRefundId: json['id'] as string,
        refundedAmountCents: Number(json['amount'] ?? req.amountCents ?? 0),
        raw: json,
      };
    } catch (err) {
      return { ok: false, error: `Razorpay refund network error: ${(err as Error).message}` };
    }
  }

  async checkHealth(): Promise<boolean> {
    // Razorpay has no public health endpoint — we ping the API root
    // with a HEAD request. A 401 (auth required) is "healthy" because
    // it means the API is reachable.
    try {
      const resp = await fetch(`${RazorpayPaymentProvider.API_BASE}/`, { method: 'HEAD' });
      return resp.status < 500;
    } catch {
      return false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private headers(config: PaymentConfig): Record<string, string> {
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-Razorpay-Account': config.mode === 'live' ? 'live' : 'test',
    };
  }

  private async hmacSha256(payload: string, secret: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    return Buffer.from(new Uint8Array(sig)).toString('hex');
  }
}
