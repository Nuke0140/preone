/**
 * RefundAggregate — refund workflow for a payment.
 *
 * Lifecycle: REQUESTED → APPROVED → PROCESSED
 *                  ↘ REJECTED (terminal)
 *                  ↘ CANCELLED (terminal, by requester)
 *
 * Invariants:
 *   - refundNumber is unique per school
 *   - amountCents cannot exceed payment.amountCents - already refunded
 *   - APPROVED requires approver (different from requester)
 *   - PROCESSED requires gateway confirmation (gatewayRefundId for online methods)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  RefundApprovedEvent, RefundProcessedEvent, RefundRejectedEvent,
  RefundRequestedEvent,
} from '../events/finance-events';

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'CASH';
export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED' | 'CANCELLED';

export interface RefundAllocation {
  id: string;
  invoiceId: string;
  allocatedCents: number;
  allocatedAt: string;
}

export interface RefundProps {
  tenantId: string;
  refundNumber: string;
  paymentId: string;
  studentId: string;
  amountCents: number;
  method: RefundMethod;
  status: RefundStatus;
  reason: string;
  requestedById: string;
  requestedAt: string;
  approvedById?: string;
  approvedAt?: string;
  processedAt?: string;
  gatewayRefundId?: string;
  rejectionReason?: string;
  notes?: string;
  allocations: RefundAllocation[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSED', 'CANCELLED'],
  PROCESSED: [],
  REJECTED: [],
  CANCELLED: [],
};

export class RefundAggregate extends AggregateRoot<RefundProps> {
  get tenantId(): string { return this._props.tenantId; }
  get refundNumber(): string { return this._props.refundNumber; }
  get paymentId(): string { return this._props.paymentId; }
  get amountCents(): number { return this._props.amountCents; }
  get status(): RefundStatus { return this._props.status; }

  static create(props: Omit<
    RefundProps,
    'status' | 'allocations' | 'createdAt' | 'updatedAt'
  >): RefundAggregate {
    const now = new Date().toISOString();
    const agg = new RefundAggregate({
      ...props,
      status: 'REQUESTED',
      allocations: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new RefundRequestedEvent({
      refundId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      paymentId: agg._props.paymentId,
      amountCents: agg._props.amountCents,
      reason: agg._props.reason,
    }));
    return agg;
  }

  approve(approvedBy: string, approvedAt: string): void {
    this._requireTransition('APPROVED');
    if (approvedBy === this._props.requestedById) {
      throw new Error('Approver cannot be the same as requester (segregation of duties)');
    }
    this._props.status = 'APPROVED';
    this._props.approvedById = approvedBy;
    this._props.approvedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new RefundApprovedEvent({
      refundId: this.id,
      tenantId: this._props.tenantId,
      approvedBy,
      approvedAt,
    }));
  }

  reject(rejectedBy: string, reason: string): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.rejectionReason = reason;
    this._props.approvedById = rejectedBy;
    this._touch();
    this._addDomainEvent(new RefundRejectedEvent({
      refundId: this.id,
      tenantId: this._props.tenantId,
      rejectedBy,
      reason,
    }));
  }

  process(processedAt: string, gatewayRefundId?: string): void {
    this._requireTransition('PROCESSED');
    // For online methods, gateway confirmation is required
    if (['ORIGINAL_PAYMENT', 'BANK_TRANSFER', 'UPI'].includes(this._props.method) && !gatewayRefundId) {
      throw new Error(`gatewayRefundId required for ${this._props.method} refund`);
    }
    this._props.status = 'PROCESSED';
    this._props.processedAt = processedAt;
    if (gatewayRefundId) this._props.gatewayRefundId = gatewayRefundId;
    this._touch();
    this._addDomainEvent(new RefundProcessedEvent({
      refundId: this.id,
      tenantId: this._props.tenantId,
      amountCents: this._props.amountCents,
      method: this._props.method,
      processedAt,
    }));
  }

  allocate(invoiceId: string, allocatedCents: number, allocatedAt: string): void {
    if (this._props.status !== 'APPROVED' && this._props.status !== 'PROCESSED') {
      throw new Error(`Cannot allocate ${this._props.status} refund`);
    }
    const allocatedTotal = this._props.allocations.reduce((acc, a) => acc + a.allocatedCents, 0);
    if (allocatedTotal + allocatedCents > this._props.amountCents) {
      throw new Error('Refund allocation exceeds refund amount');
    }
    this._props.allocations.push({
      id: crypto.randomUUID(),
      invoiceId,
      allocatedCents,
      allocatedAt,
    });
    this._touch();
  }

  cancel(): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: RefundStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid refund transition: ${this._props.status} → ${target}`);
    }
  }
}
