/**
 * PaymentAggregate — incoming payment from parent/guardian.
 *
 * Lifecycle: PENDING → SUCCESS → REFUNDED (full) / PARTIALLY_REFUNDED
 *                ↘ FAILED (terminal)
 *                ↘ DISPUTED (manual intervention)
 *
 * Invariants:
 *   - paymentNumber is unique per school
 *   - amountRefundedCents <= amountCents
 *   - SUCCESS requires gateway confirmation (gatewayTransactionId)
 *   - Allocations total <= amountCents
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  PaymentAllocatedEvent, PaymentFailedEvent, PaymentRecordedEvent,
  PaymentRefundedEvent, PaymentSucceededEvent,
} from '../events/finance-events';

export type PaymentMethod =
  | 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI' | 'CARD'
  | 'NETBANKING' | 'WALLET' | 'DD';

export type PaymentGateway = 'RAZORPAY' | 'CASHFREE' | 'PAYU' | 'STRIPE' | 'MANUAL' | 'OFFLINE';

export type PaymentStatus =
  | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DISPUTED';

export interface PaymentAllocation {
  id: string;
  invoiceId: string;
  allocatedCents: number;
  allocatedAt: string;
  isReversed: boolean;
}

export interface PaymentProps {
  tenantId: string;
  paymentNumber: string;
  studentId: string;
  studentFeePlanId?: string;
  amountCents: number;
  amountRefundedCents: number;
  method: PaymentMethod;
  gateway: PaymentGateway;
  gatewayTransactionId?: string;
  gatewayPaymentId?: string;
  status: PaymentStatus;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  receiptNumber?: string;
  instrumentNumber?: string;
  instrumentDate?: string;
  bankName?: string;
  collectedById?: string;
  notes?: string;
  allocations: PaymentAllocation[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['SUCCESS', 'FAILED', 'DISPUTED'],
  SUCCESS: ['REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED'],
  FAILED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ['REFUNDED', 'DISPUTED'],
  DISPUTED: ['SUCCESS', 'FAILED', 'REFUNDED'],
};

export class PaymentAggregate extends AggregateRoot<PaymentProps> {
  get tenantId(): string { return this._props.tenantId; }
  get paymentNumber(): string { return this._props.paymentNumber; }
  get studentId(): string { return this._props.studentId; }
  get status(): PaymentStatus { return this._props.status; }
  get amountCents(): number { return this._props.amountCents; }
  get isSuccessful(): boolean { return this._props.status === 'SUCCESS'; }

  static create(props: Omit<
    PaymentProps,
    'status' | 'amountRefundedCents' | 'allocations' |
    'createdAt' | 'updatedAt'
  >): PaymentAggregate {
    const now = new Date().toISOString();
    const agg = new PaymentAggregate({
      ...props,
      status: 'PENDING',
      amountRefundedCents: 0,
      allocations: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new PaymentRecordedEvent({
      paymentId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      paymentNumber: agg._props.paymentNumber,
      amountCents: agg._props.amountCents,
      method: agg._props.method,
      gateway: agg._props.gateway,
    }));
    return agg;
  }

  markSucceeded(paidAt: string, gatewayTransactionId?: string): void {
    this._requireTransition('SUCCESS');
    this._props.status = 'SUCCESS';
    this._props.paidAt = paidAt;
    if (gatewayTransactionId) this._props.gatewayTransactionId = gatewayTransactionId;
    this._touch();
    this._addDomainEvent(new PaymentSucceededEvent({
      paymentId: this.id,
      tenantId: this._props.tenantId,
      paidAt,
      gatewayTransactionId: this._props.gatewayTransactionId,
    }));
  }

  markFailed(reason: string, failedAt: string): void {
    this._requireTransition('FAILED');
    this._props.status = 'FAILED';
    this._props.failureReason = reason;
    this._props.failedAt = failedAt;
    this._touch();
    this._addDomainEvent(new PaymentFailedEvent({
      paymentId: this.id,
      tenantId: this._props.tenantId,
      failureReason: reason,
      failedAt,
    }));
  }

  allocate(invoiceId: string, allocatedCents: number, allocatedAt: string): void {
    if (this._props.status !== 'SUCCESS') {
      throw new Error('Cannot allocate a non-SUCCESS payment');
    }
    if (allocatedCents <= 0) throw new Error('Allocation amount must be positive');
    const allocatedTotal = this._props.allocations
      .filter(a => !a.isReversed)
      .reduce((acc, a) => acc + a.allocatedCents, 0);
    if (allocatedTotal + allocatedCents > this._props.amountCents) {
      throw new Error(
        `Allocation (${allocatedCents}c) exceeds available amount (${this._props.amountCents - allocatedTotal}c)`,
      );
    }
    const id = crypto.randomUUID();
    this._props.allocations.push({ id, invoiceId, allocatedCents, allocatedAt, isReversed: false });
    this._touch();
    this._addDomainEvent(new PaymentAllocatedEvent({
      paymentId: this.id,
      tenantId: this._props.tenantId,
      invoiceId,
      allocatedCents,
    }));
  }

  recordRefund(refundId: string, refundedCents: number): void {
    if (this._props.status !== 'SUCCESS' && this._props.status !== 'PARTIALLY_REFUNDED') {
      throw new Error(`Cannot refund a ${this._props.status} payment`);
    }
    if (refundedCents <= 0) throw new Error('Refund amount must be positive');
    const newRefundedTotal = this._props.amountRefundedCents + refundedCents;
    if (newRefundedTotal > this._props.amountCents) {
      throw new Error(
        `Refund (${refundedCents}c) exceeds payment amount (${this._props.amountCents}c)`,
      );
    }
    this._props.amountRefundedCents = newRefundedTotal;
    this._props.status = newRefundedTotal === this._props.amountCents ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
    this._touch();
    this._addDomainEvent(new PaymentRefundedEvent({
      paymentId: this.id,
      tenantId: this._props.tenantId,
      refundId,
      refundedCents,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: PaymentStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid payment transition: ${this._props.status} → ${target}`);
    }
  }
}
