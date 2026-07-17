/**
 * InvoiceAggregate — fee invoice for a student.
 *
 * Lifecycle: DRAFT → ISSUED → PARTIALLY_PAID → PAID
 *                  ↘ OVERDUE (issued but past due date with outstanding)
 *                  ↘ VOIDED / CANCELLED (terminal)
 *
 * Invariants:
 *   - invoiceNumber is unique per school
 *   - total = subtotal - concession + gst + lateFee + adjustment
 *   - paidCents + outstandingCents = totalCents (invariant)
 *   - Cannot void a PAID invoice (use refund instead)
 *   - Adjustments recorded with type + approver
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { EnforcesRule } from '@common/brc/brc-trace.decorator';

import {
  InvoiceAdjustedEvent, InvoiceGeneratedEvent, InvoiceIssuedEvent,
  InvoiceOverdueEvent, InvoicePaidEvent, InvoiceVoidedEvent,
} from '../events/finance-events';

export type InvoiceStatus =
  | 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOIDED' | 'CANCELLED';

export type InvoiceLineItemType =
  | 'TUITION' | 'ADMISSION_FEE' | 'SECURITY_DEPOSIT' | 'ANNUAL_CHARGE'
  | 'TRANSPORT' | 'MEALS' | 'EXTRACURRICULAR' | 'LATE_FEE'
  | 'CONCESSION' | 'SCHOLARSHIP' | 'REFUND' | 'OTHER';

export type InvoiceAdjustmentType =
  | 'WAIVER' | 'DISCOUNT' | 'LATE_FEE' | 'PENALTY' | 'CORRECTION' | 'WRITE_OFF';

export interface InvoiceLineItem {
  id: string;
  lineItemType: InvoiceLineItemType;
  description: string;
  quantity: number;
  rateCents: number;
  amountCents: number;
  gstRatePercent: number;
  gstCents: number;
  concessionCents: number;
}

export interface InvoiceAdjustment {
  id: string;
  adjustmentType: InvoiceAdjustmentType;
  amountCents: number;
  description: string;
  appliedById: string;
  appliedAt: string;
  approvedById?: string;
  approvedAt?: string;
}

export interface InvoiceProps {
  tenantId: string;
  invoiceNumber: string;
  studentFeePlanId?: string;
  studentId: string;
  feePlanInstallmentId?: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  status: InvoiceStatus;
  subtotalCents: number;
  concessionCents: number;
  taxableAmountCents: number;
  gstCents: number;
  lateFeeCents: number;
  adjustmentCents: number;
  totalCents: number;
  paidCents: number;
  refundedCents: number;
  outstandingCents: number;
  issuedAt?: string;
  issuedBy?: string;
  voidedAt?: string;
  voidedReason?: string;
  notes?: string;
  lineItems: InvoiceLineItem[];
  adjustments: InvoiceAdjustment[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['ISSUED', 'VOIDED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOIDED', 'CANCELLED'],
  PARTIALLY_PAID: ['PAID', 'OVERDUE', 'VOIDED'],
  PAID: [],
  OVERDUE: ['PARTIALLY_PAID', 'PAID', 'VOIDED'],
  VOIDED: [],
  CANCELLED: [],
};

@EnforcesRule('R-FIN-001', { kind: 'aggregate' })
@EnforcesRule('R-FIN-002', { kind: 'aggregate' })
@EnforcesRule('R-FIN-005', { kind: 'aggregate' })
@EnforcesRule('R-FIN-006', { kind: 'aggregate' })
@EnforcesRule('R-FIN-007', { kind: 'aggregate' })
@EnforcesRule('R-FIN-008', { kind: 'aggregate' })
@EnforcesRule('R-FIN-013', { kind: 'aggregate' })
@EnforcesRule('R-FIN-014', { kind: 'aggregate' })
@EnforcesRule('R-APR-001', { kind: 'aggregate' })
export class InvoiceAggregate extends AggregateRoot<InvoiceProps> {
  get tenantId(): string { return this._props.tenantId; }
  get invoiceNumber(): string { return this._props.invoiceNumber; }
  get studentId(): string { return this._props.studentId; }
  get status(): InvoiceStatus { return this._props.status; }
  get totalCents(): number { return this._props.totalCents; }
  get outstandingCents(): number { return this._props.outstandingCents; }
  get isPaid(): boolean { return this._props.status === 'PAID'; }
  get lineItems(): readonly InvoiceLineItem[] {
    return Object.freeze([...this._props.lineItems]);
  }

  static create(props: Omit<
    InvoiceProps,
    'status' | 'lineItems' | 'adjustments' | 'paidCents' |
    'refundedCents' | 'outstandingCents' | 'totalCents' |
    'createdAt' | 'updatedAt'
  > & { lineItems: InvoiceLineItem[] }): InvoiceAggregate {
    const now = new Date().toISOString();
    const total = props.subtotalCents - props.concessionCents + props.gstCents + props.lateFeeCents + props.adjustmentCents;
    const agg = new InvoiceAggregate({
      ...props,
      status: 'DRAFT',
      lineItems: [...props.lineItems],
      adjustments: [],
      paidCents: 0,
      refundedCents: 0,
      outstandingCents: total,
      totalCents: total,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new InvoiceGeneratedEvent({
      invoiceId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      invoiceNumber: agg._props.invoiceNumber,
      studentFeePlanId: agg._props.studentFeePlanId,
      totalCents: agg._props.totalCents,
      dueDate: agg._props.dueDate,
    }));
    return agg;
  }

  issue(issuedBy: string, issuedAt: string): void {
    this._requireTransition('ISSUED');
    this._props.status = 'ISSUED';
    this._props.issuedAt = issuedAt;
    this._props.issuedBy = issuedBy;
    this._touch();
    this._addDomainEvent(new InvoiceIssuedEvent({
      invoiceId: this.id,
      tenantId: this._props.tenantId,
      issuedAt,
      issuedBy,
    }));
  }

  recordPayment(amountCents: number, paidAt: string): void {
    if (this._props.status === 'VOIDED' || this._props.status === 'CANCELLED') {
      throw new Error(`Cannot record payment on ${this._props.status} invoice`);
    }
    if (amountCents <= 0) throw new Error('Payment amount must be positive');
    this._props.paidCents += amountCents;
    this._props.outstandingCents = Math.max(0, this._props.totalCents - this._props.paidCents);
    if (this._props.outstandingCents === 0) {
      this._props.status = 'PAID';
    } else if (this._props.paidCents > 0) {
      this._props.status = 'PARTIALLY_PAID';
    }
    this._touch();
    if (this._props.status === 'PAID') {
      this._addDomainEvent(new InvoicePaidEvent({
        invoiceId: this.id,
        tenantId: this._props.tenantId,
        paidCents: this._props.paidCents,
        paidAt,
      }));
    }
  }

  markOverdue(overdueDays: number): void {
    if (this._props.status !== 'ISSUED' && this._props.status !== 'PARTIALLY_PAID') {
      throw new Error(`Cannot mark ${this._props.status} invoice as OVERDUE`);
    }
    this._props.status = 'OVERDUE';
    this._touch();
    this._addDomainEvent(new InvoiceOverdueEvent({
      invoiceId: this.id,
      tenantId: this._props.tenantId,
      dueDate: this._props.dueDate,
      overdueDays,
    }));
  }

  applyAdjustment(adj: Omit<InvoiceAdjustment, 'id' | 'appliedAt'>, appliedAt: string): void {
    if (this._props.status === 'VOIDED' || this._props.status === 'CANCELLED' || this._props.status === 'PAID') {
      throw new Error(`Cannot adjust ${this._props.status} invoice`);
    }
    const id = crypto.randomUUID();
    const adjustment: InvoiceAdjustment = { ...adj, id, appliedAt };
    this._props.adjustments.push(adjustment);
    // Adjustments: WAIVER/DISCOUNT reduce outstanding, LATE_FEE/PENALTY increase
    if (adj.adjustmentType === 'WAIVER' || adj.adjustmentType === 'DISCOUNT' || adj.adjustmentType === 'WRITE_OFF') {
      this._props.adjustmentCents -= adj.amountCents;
      this._props.totalCents -= adj.amountCents;
      this._props.outstandingCents = Math.max(0, this._props.outstandingCents - adj.amountCents);
    } else {
      this._props.adjustmentCents += adj.amountCents;
      this._props.totalCents += adj.amountCents;
      this._props.outstandingCents += adj.amountCents;
    }
    this._touch();
    this._addDomainEvent(new InvoiceAdjustedEvent({
      invoiceId: this.id,
      tenantId: this._props.tenantId,
      adjustmentType: adj.adjustmentType,
      amountCents: adj.amountCents,
      description: adj.description,
    }));
  }

  void(reason: string, voidedAt: string): void {
    if (this._props.status === 'PAID') {
      throw new Error('Cannot void a PAID invoice (use refund instead)');
    }
    this._requireTransition('VOIDED');
    this._props.status = 'VOIDED';
    this._props.voidedAt = voidedAt;
    this._props.voidedReason = reason;
    this._touch();
    this._addDomainEvent(new InvoiceVoidedEvent({
      invoiceId: this.id,
      tenantId: this._props.tenantId,
      voidedAt,
      reason,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: InvoiceStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid invoice transition: ${this._props.status} → ${target}`);
    }
  }
}
