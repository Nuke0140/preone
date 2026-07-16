/**
 * ReorderAlertAggregate — auto-reorder PR lifecycle.
 *
 * Per BRC R-INV-001 — Auto Reorder Trigger:
 *   Trigger: Stock level update (post-issue / post-GRN)
 *   Action: Create PR with vendor suggestion; route to Branch Admin approval;
 *           auto-set expected delivery date
 *   Owners: Inventory Manager + Branch Admin
 *
 * Lifecycle:
 *   CREATED → {APPROVED | REJECTED}
 *   APPROVED → CONVERTED (PO created from this PR)
 *   {CREATED, APPROVED} → CANCELLED
 *
 * Invariants:
 *   - suggestedQty must be > 0
 *   - currentStock must be <= reorderLevel (otherwise alert shouldn't have been created)
 *   - expectedDeliveryDate must be set when APPROVED
 *   - convertedPoId can only be set once
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type ReorderStatus = 'CREATED' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED';

export interface ReorderAlertProps {
  tenantId: string;
  branchId: string;
  itemId: string;
  currentStock: number;          // 3-decimal precision (kg / litre / unit)
  reorderLevel: number;
  suggestedQty: number;
  suggestedVendorId?: string;
  status: ReorderStatus;
  expectedDeliveryDate?: string;  // YYYY-MM-DD
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
  convertedPoId?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<ReorderStatus, ReorderStatus[]> = {
  CREATED:   ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED:  ['CONVERTED', 'CANCELLED'],
  REJECTED:  [],
  CONVERTED: [],
  CANCELLED: [],
};

// ===== Domain Events =====

export class ReorderAlertCreatedEvent extends DomainEvent<{
  tenantId: string; alertId: string; itemId: string; branchId: string;
  currentStock: number; reorderLevel: number; suggestedQty: number;
  suggestedVendorId?: string;
}> {}

export class ReorderApprovedEvent extends DomainEvent<{
  tenantId: string; alertId: string; approvedById: string;
  expectedDeliveryDate: string;
}> {}

export class ReorderRejectedEvent extends DomainEvent<{
  tenantId: string; alertId: string; rejectionReason: string;
}> {}

export class ReorderConvertedEvent extends DomainEvent<{
  tenantId: string; alertId: string; poId: string;
}> {}

export class ReorderCancelledEvent extends DomainEvent<{
  tenantId: string; alertId: string; reason: string;
}> {}

// ===== Aggregate =====

export class ReorderAlertAggregate extends AggregateRoot<ReorderAlertProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get itemId(): string { return this._props.itemId; }
  get currentStock(): number { return this._props.currentStock; }
  get reorderLevel(): number { return this._props.reorderLevel; }
  get suggestedQty(): number { return this._props.suggestedQty; }
  get status(): ReorderStatus { return this._props.status; }
  get expectedDeliveryDate(): string | undefined { return this._props.expectedDeliveryDate; }
  get convertedPoId(): string | undefined { return this._props.convertedPoId; }

  static create(
    tenantId: string,
    branchId: string,
    itemId: string,
    currentStock: number,
    reorderLevel: number,
    suggestedQty: number,
    suggestedVendorId?: string,
    leadTimeDays = 7,
  ): ReorderAlertAggregate {
    const now = new Date().toISOString();

    // Invariant: currentStock must be at or below reorderLevel
    if (currentStock > reorderLevel) {
      throw new Error(
        `ReorderAlert invariant: currentStock ${currentStock} > reorderLevel ${reorderLevel} — alert should not be created`
      );
    }
    if (suggestedQty <= 0) {
      throw new Error(`ReorderAlert invariant: suggestedQty ${suggestedQty} must be > 0`);
    }
    if (reorderLevel <= 0) {
      throw new Error(`ReorderAlert invariant: reorderLevel ${reorderLevel} must be > 0`);
    }

    const agg = new ReorderAlertAggregate({
      tenantId, branchId, itemId,
      currentStock, reorderLevel, suggestedQty,
      suggestedVendorId,
      status: 'CREATED',
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new ReorderAlertCreatedEvent({
      tenantId, alertId: agg.id, itemId, branchId,
      currentStock, reorderLevel, suggestedQty, suggestedVendorId,
    }));

    // Suppress unused warning
    void leadTimeDays;
    return agg;
  }

  /** Branch Admin approves the PR — sets expected delivery date. */
  approve(approvedById: string, approvedAt: string, expectedDeliveryDate: string, leadTimeDays = 7): void {
    this._requireTransition('APPROVED');

    // Auto-compute expectedDeliveryDate if not provided
    let deliveryDate = expectedDeliveryDate;
    if (!deliveryDate) {
      const d = new Date(approvedAt); d.setDate(d.getDate() + leadTimeDays);
      deliveryDate = d.toISOString().slice(0, 10);
    }

    this._props.status = 'APPROVED';
    this._props.approvedById = approvedById;
    this._props.approvedAt = approvedAt;
    this._props.expectedDeliveryDate = deliveryDate;
    this._touch();
    this._addDomainEvent(new ReorderApprovedEvent({
      tenantId: this._props.tenantId, alertId: this.id,
      approvedById, expectedDeliveryDate: deliveryDate,
    }));
  }

  /** Branch Admin rejects the PR. */
  reject(rejectionReason: string): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.rejectionReason = rejectionReason;
    this._touch();
    this._addDomainEvent(new ReorderRejectedEvent({
      tenantId: this._props.tenantId, alertId: this.id, rejectionReason,
    }));
  }

  /** Convert PR to PurchaseOrder — links the new PO ID. */
  convertToPo(poId: string): void {
    this._requireTransition('CONVERTED');
    if (this._props.convertedPoId) {
      throw new Error(`ReorderAlert already converted to PO ${this._props.convertedPoId}`);
    }
    this._props.status = 'CONVERTED';
    this._props.convertedPoId = poId;
    this._touch();
    this._addDomainEvent(new ReorderConvertedEvent({
      tenantId: this._props.tenantId, alertId: this.id, poId,
    }));
  }

  /** Cancel PR (no longer needed). */
  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.rejectionReason = reason;
    this._touch();
    this._addDomainEvent(new ReorderCancelledEvent({
      tenantId: this._props.tenantId, alertId: this.id, reason,
    }));
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: ReorderStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `ReorderAlert invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
