/**
 * ReturnNoteAggregate — vendor return lifecycle.
 *
 * Per BRC R-INV-010 — Return Window:
 *   Trigger: Item return request
 *   Action: Generate return note; vendor pickup arranged; credit note raised
 *   Owners: Inventory Manager
 *
 * Lifecycle:
 *   INITIATED → APPROVED → PICKUP_SCHEDULED → RETURNED → CREDIT_RECEIVED
 *   Any state before CREDIT_RECEIVED → CANCELLED
 *
 * Invariants:
 *   - returnNumber unique per school
 *   - At least one line required to initiate
 *   - Total credit = sum(line.quantity * line.unitCostCents) — cannot be negative
 *   - Credit note number + amount required to mark CREDIT_RECEIVED
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type ReturnReason =
  | 'DAMAGED' | 'EXPIRED' | 'WRONG_ITEM' | 'QUALITY_ISSUE'
  | 'EXCESS_QUANTITY' | 'RECALL' | 'OTHER';
export type ReturnStatus =
  | 'INITIATED' | 'APPROVED' | 'PICKUP_SCHEDULED' | 'RETURNED'
  | 'CREDIT_RECEIVED' | 'CANCELLED';

export interface ReturnNoteLineProps {
  id: string;
  itemId: string;
  batchId?: string;
  quantity: number;
  unitCostCents: bigint;
  totalValueCents: bigint;
  notes?: string;
}

export interface ReturnNoteProps {
  tenantId: string;
  branchId: string;
  returnNumber: string;
  supplierId: string;
  poId?: string;
  grnId?: string;
  reason: ReturnReason;
  status: ReturnStatus;
  initiatedAt: string;
  approvedAt?: string;
  pickupScheduledAt?: string;
  returnedAt?: string;
  creditNoteNumber?: string;
  creditNoteAmountCents?: bigint;
  creditReceivedAt?: string;
  notes?: string;
  lines: ReturnNoteLineProps[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  INITIATED:        ['APPROVED', 'CANCELLED'],
  APPROVED:         ['PICKUP_SCHEDULED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['RETURNED', 'CANCELLED'],
  RETURNED:         ['CREDIT_RECEIVED', 'CANCELLED'],
  CREDIT_RECEIVED:  [],
  CANCELLED:        [],
};

// ===== Domain Events =====

export class ReturnNoteInitiatedEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string; returnNumber: string;
  supplierId: string; reason: ReturnReason; lineCount: number;
  totalValueCents: string;
}> {}

export class ReturnNoteApprovedEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string; approvedAt: string;
}> {}

export class ReturnPickupScheduledEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string; pickupScheduledAt: string;
}> {}

export class ReturnCompletedEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string; returnedAt: string;
}> {}

export class CreditNoteReceivedEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string;
  creditNoteNumber: string; creditNoteAmountCents: string;
  creditReceivedAt: string;
}> {}

export class ReturnCancelledEvent extends DomainEvent<{
  tenantId: string; returnNoteId: string; reason: string;
}> {}

// ===== Aggregate =====

export class ReturnNoteAggregate extends AggregateRoot<ReturnNoteProps> {
  get tenantId(): string { return this._props.tenantId; }
  get returnNumber(): string { return this._props.returnNumber; }
  get supplierId(): string { return this._props.supplierId; }
  get reason(): ReturnReason { return this._props.reason; }
  get status(): ReturnStatus { return this._props.status; }
  get lines(): readonly ReturnNoteLineProps[] { return this._props.lines; }
  get creditNoteNumber(): string | undefined { return this._props.creditNoteNumber; }
  get creditNoteAmountCents(): bigint | undefined { return this._props.creditNoteAmountCents; }

  static create(
    tenantId: string,
    branchId: string,
    returnNumber: string,
    supplierId: string,
    reason: ReturnReason,
    poId?: string,
    grnId?: string,
  ): ReturnNoteAggregate {
    const now = new Date().toISOString();
    const agg = new ReturnNoteAggregate({
      tenantId, branchId, returnNumber, supplierId, poId, grnId, reason,
      status: 'INITIATED',
      initiatedAt: now,
      lines: [],
      createdAt: now, updatedAt: now,
    });
    return agg;
  }

  /** Add a return line. Can only be done in INITIATED state. */
  addLine(itemId: string, quantity: number, unitCostCents: bigint, batchId?: string, notes?: string): void {
    if (this._props.status !== 'INITIATED') {
      throw new Error(`ReturnNote: cannot add lines in status ${this._props.status}`);
    }
    if (quantity <= 0) {
      throw new Error(`ReturnNote invariant: quantity ${quantity} must be > 0`);
    }
    if (unitCostCents < 0n) {
      throw new Error('ReturnNote invariant: unitCostCents must be >= 0');
    }
    const totalValueCents = BigInt(Math.round(quantity * Number(unitCostCents)));
    this._props.lines.push({
      id: crypto.randomUUID(),
      itemId, batchId, quantity, unitCostCents, totalValueCents, notes,
    });
    this._touch();
  }

  /** Approve the return note (Inventory Manager approval). */
  approve(approvedAt: string): void {
    this._requireTransition('APPROVED');
    if (this._props.lines.length === 0) {
      throw new Error('ReturnNote invariant: cannot approve with zero lines');
    }
    this._props.status = 'APPROVED';
    this._props.approvedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new ReturnNoteApprovedEvent({
      tenantId: this._props.tenantId, returnNoteId: this.id, approvedAt,
    }));
  }

  /** Schedule vendor pickup. */
  schedulePickup(pickupScheduledAt: string): void {
    this._requireTransition('PICKUP_SCHEDULED');
    this._props.status = 'PICKUP_SCHEDULED';
    this._props.pickupScheduledAt = pickupScheduledAt;
    this._touch();
    this._addDomainEvent(new ReturnPickupScheduledEvent({
      tenantId: this._props.tenantId, returnNoteId: this.id, pickupScheduledAt,
    }));
  }

  /** Mark items as handed over to vendor. */
  markReturned(returnedAt: string): void {
    this._requireTransition('RETURNED');
    this._props.status = 'RETURNED';
    this._props.returnedAt = returnedAt;
    this._touch();
    this._addDomainEvent(new ReturnCompletedEvent({
      tenantId: this._props.tenantId, returnNoteId: this.id, returnedAt,
    }));
  }

  /** Record credit note receipt from vendor. */
  recordCredit(creditNoteNumber: string, creditNoteAmountCents: bigint, creditReceivedAt: string): void {
    this._requireTransition('CREDIT_RECEIVED');
    if (!creditNoteNumber) {
      throw new Error('ReturnNote invariant: creditNoteNumber required');
    }
    if (creditNoteAmountCents < 0n) {
      throw new Error('ReturnNote invariant: creditNoteAmountCents must be >= 0');
    }
    this._props.status = 'CREDIT_RECEIVED';
    this._props.creditNoteNumber = creditNoteNumber;
    this._props.creditNoteAmountCents = creditNoteAmountCents;
    this._props.creditReceivedAt = creditReceivedAt;
    this._touch();
    this._addDomainEvent(new CreditNoteReceivedEvent({
      tenantId: this._props.tenantId, returnNoteId: this.id,
      creditNoteNumber, creditNoteAmountCents: creditNoteAmountCents.toString(),
      creditReceivedAt,
    }));
  }

  /** Cancel return (vendor refused / item returned to stock). */
  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.notes = reason;
    this._touch();
    this._addDomainEvent(new ReturnCancelledEvent({
      tenantId: this._props.tenantId, returnNoteId: this.id, reason,
    }));
  }

  /** Total value of all lines (sum of quantity * unitCostCents). */
  get totalValueCents(): bigint {
    return this._props.lines.reduce((sum, l) => sum + l.totalValueCents, 0n);
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: ReturnStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `ReturnNote invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
