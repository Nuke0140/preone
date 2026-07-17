/**
 * PaymentAdapter — payment gateway abstraction (Wave 17).
 *
 * Pluggable provider: in dev, uses a console-logging stub. In prod, the
 * real provider (e.g., Razorpay / Stripe / Cashfree) is injected via
 * the `PAYMENT_PROVIDER` token.
 *
 * Three core operations:
 *   - createOrder       — server-to-server order creation before showing
 *                          the checkout widget.
 *   - verifyPayment     — webhook signature verification after the
 *                          client-side checkout completes.
 *   - refundPayment     — full or partial refund against an already-
 *                          captured payment.
 *
 * Money is always in paise (1 INR = 100 paise) — same convention as
 * the Prisma schema's `*Cents` columns.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CircuitBreakerService } from './circuit-breaker.service';
import type { ExternalProvider, ProviderHealthResult } from './integrations.types';

export interface CreateOrderRequest {
  amountCents: number;        // Paise
  currency: string;           // ISO 4217 (e.g., 'INR')
  receiptId: string;          // Internal receipt ID (max 40 chars)
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  ok: boolean;
  providerOrderId?: string;
  amountCents?: number;
  currency?: string;
  error?: string;
  raw?: unknown;
}

export interface VerifyPaymentRequest {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
  expectedAmountCents: number;
  currency: string;
}

export interface VerifyPaymentResult {
  ok: boolean;
  verified?: boolean;
  capturedAmountCents?: number;
  error?: string;
}

export interface RefundRequest {
  providerPaymentId: string;
  amountCents?: number;   // Omit for full refund
  reason?: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  ok: boolean;
  providerRefundId?: string;
  refundedAmountCents?: number;
  error?: string;
  /** Raw provider response (for debugging + audit). */
  raw?: unknown;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
export const PAYMENT_CONFIG = 'PAYMENT_CONFIG';

export interface PaymentConfig {
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  mode?: 'test' | 'live';
}

export interface PaymentProviderPort {
  readonly name: string;
  createOrder(req: CreateOrderRequest, config: PaymentConfig): Promise<CreateOrderResult>;
  verifyPayment(req: VerifyPaymentRequest, config: PaymentConfig): Promise<VerifyPaymentResult>;
  refundPayment(req: RefundRequest, config: PaymentConfig): Promise<RefundResult>;
  checkHealth(): Promise<boolean>;
}

@Injectable()
export class PaymentAdapter implements ExternalProvider {
  readonly name = 'payment';
  private readonly logger = new Logger(PaymentAdapter.name);

  constructor(
    private readonly circuit: CircuitBreakerService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProviderPort,
    @Inject(PAYMENT_CONFIG) private readonly config: PaymentConfig,
  ) {
    this.circuit.register({
      name: this.name,
      failureThreshold: 3,        // Payment is critical — trip fast
      failureWindowSeconds: 60,
      resetTimeoutSeconds: 60,    // Stay open longer — money at stake
      slowCallDurationMs: 8_000,
    });
  }

  async createOrder(req: CreateOrderRequest): Promise<CreateOrderResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.createOrder(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Payment createOrder (receipt=${req.receiptId}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async verifyPayment(req: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.verifyPayment(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Payment verify (order=${req.providerOrderId}) failed: ${(err as Error).message}`);
      return { ok: false, error: (err as Error).message };
    }
  }

  async refundPayment(req: RefundRequest): Promise<RefundResult> {
    try {
      return await this.circuit.exec(this.name, () =>
        this.provider.refundPayment(req, this.config),
      );
    } catch (err) {
      this.logger.error(`Payment refund (payment=${req.providerPaymentId}) failed: ${(err as Error).message}`);
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
export class StubPaymentProvider implements PaymentProviderPort {
  readonly name = 'stub-payment';
  private readonly logger = new Logger(StubPaymentProvider.name);

  async createOrder(req: CreateOrderRequest, _config: PaymentConfig): Promise<CreateOrderResult> {
    const providerOrderId = `stub-order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.logger.debug(
      `[STUB Payment] createOrder amount=${req.amountCents}p ${req.currency} receipt=${req.receiptId}`,
    );
    return {
      ok: true,
      providerOrderId,
      amountCents: req.amountCents,
      currency: req.currency,
      raw: { stub: true },
    };
  }

  async verifyPayment(req: VerifyPaymentRequest, _config: PaymentConfig): Promise<VerifyPaymentResult> {
    this.logger.debug(`[STUB Payment] verify order=${req.providerOrderId}`);
    return {
      ok: true,
      verified: true,
      capturedAmountCents: req.expectedAmountCents,
    };
  }

  async refundPayment(req: RefundRequest, _config: PaymentConfig): Promise<RefundResult> {
    const providerRefundId = `stub-refund-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.logger.debug(`[STUB Payment] refund payment=${req.providerPaymentId} amount=${req.amountCents ?? 'full'}`);
    return {
      ok: true,
      providerRefundId,
      refundedAmountCents: req.amountCents ?? 0,
    };
  }

  async checkHealth(): Promise<boolean> {
    return true;
  }
}
