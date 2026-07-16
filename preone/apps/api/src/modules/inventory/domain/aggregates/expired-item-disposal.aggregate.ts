/**
 * ExpiredItemDisposalAggregate — expired item disposal lifecycle.
 *
 * Per BRC R-INV-004 — Expired Item Disposal:
 *   Trigger: Item crosses expiry date
 *   Action: Mark item as 'Expired - Dispose'; generate disposal log;
 *           Inventory Manager + Branch Head joint approval for write-off
 *   Owners: Inventory Manager + Branch Head
 *
 * Lifecycle:
 *   PENDING_APPROVAL → {INVENTORY_MANAGER_APPROVED | REJECTED}
 *   INVENTORY_MANAGER_APPROVED → BRANCH_HEAD_APPROVED
 *   BRANCH_HEAD_APPROVED → DISPOSED
 *
 * Invariants:
 *   - quantity must be > 0
 *   - expiryDate must be in the past (or today)
 *   - Branch Head approval requires Inventory Manager approval first
 *   - Disposal cannot happen without both approvals
 *   - writeOffValueCents is computed at create time: quantity * unitCostCents
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type DisposalMethod = 'SALE' | 'SCRAP' | 'DONATION' | 'WRITE_OFF';
export type DisposalStatus =
  | 'PENDING_APPROVAL'
  | 'INVENTORY_MANAGER_APPROVED'
  | 'BRANCH_HEAD_APPROVED'
  | 'DISPOSED'
  | 'REJECTED';

export interface ExpiredItemDisposalProps {
  tenantId: string;
  branchId: string;
  itemId: string;
  batchId?: string;
  quantity: number;              // 3-decimal precision
  unitCostCents: bigint;
  expiryDate: string;            // YYYY-MM-DD
  disposedAt?: string;
  disposalMethod: DisposalMethod;
  writeOffValueCents: bigint;    // quantity * unitCostCents
  status: DisposalStatus;
  inventoryManagerApprovedAt?: string;
  branchHeadApprovedAt?: string;
  disposalLogUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<DisposalStatus, DisposalStatus[]> = {
  PENDING_APPROVAL:            ['INVENTORY_MANAGER_APPROVED', 'REJECTED'],
  INVENTORY_MANAGER_APPROVED:  ['BRANCH_HEAD_APPROVED', 'REJECTED'],
  BRANCH_HEAD_APPROVED:        ['DISPOSED'],
  DISPOSED:                    [],
  REJECTED:                    [],
};

// ===== Domain Events =====

export class DisposalCreatedEvent extends DomainEvent<{
  tenantId: string; disposalId: string; itemId: string;
  quantity: number; writeOffValueCents: string; expiryDate: string;
}> {}

export class DisposalInventoryManagerApprovedEvent extends DomainEvent<{
  tenantId: string; disposalId: string; approvedAt: string;
}> {}

export class DisposalBranchHeadApprovedEvent extends DomainEvent<{
  tenantId: string; disposalId: string; approvedAt: string;
}> {}

export class DisposalCompletedEvent extends DomainEvent<{
  tenantId: string; disposalId: string; disposedAt: string;
  disposalMethod: DisposalMethod; writeOffValueCents: string;
}> {}

export class DisposalRejectedEvent extends DomainEvent<{
  tenantId: string; disposalId: string; reason: string;
}> {}

// ===== Aggregate =====

export class ExpiredItemDisposalAggregate extends AggregateRoot<ExpiredItemDisposalProps> {
  get tenantId(): string { return this._props.tenantId; }
  get itemId(): string { return this._props.itemId; }
  get quantity(): number { return this._props.quantity; }
  get writeOffValueCents(): bigint { return this._props.writeOffValueCents; }
  get expiryDate(): string { return this._props.expiryDate; }
  get status(): DisposalStatus { return this._props.status; }
  get disposalMethod(): DisposalMethod { return this._props.disposalMethod; }

  static create(
    tenantId: string,
    branchId: string,
    itemId: string,
    quantity: number,
    unitCostCents: bigint,
    expiryDate: string,
    disposalMethod: DisposalMethod = 'WRITE_OFF',
    batchId?: string,
  ): ExpiredItemDisposalAggregate {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Invariant: quantity > 0
    if (quantity <= 0) {
      throw new Error(`Disposal invariant: quantity ${quantity} must be > 0`);
    }
    // Invariant: unitCostCents >= 0
    if (unitCostCents < 0n) {
      throw new Error('Disposal invariant: unitCostCents must be >= 0');
    }
    // Invariant: expiryDate must be today or earlier (item must have expired)
    if (expiryDate > today) {
      throw new Error(
        `Disposal invariant: expiryDate ${expiryDate} is in the future — item has not yet expired`
      );
    }

    const writeOffValueCents = BigInt(Math.round(quantity * Number(unitCostCents)));

    const agg = new ExpiredItemDisposalAggregate({
      tenantId, branchId, itemId, batchId,
      quantity, unitCostCents, expiryDate,
      disposalMethod, writeOffValueCents,
      status: 'PENDING_APPROVAL',
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new DisposalCreatedEvent({
      tenantId, disposalId: agg.id, itemId,
      quantity, writeOffValueCents: writeOffValueCents.toString(), expiryDate,
    }));
    return agg;
  }

  /** Inventory Manager approval — first approval level. */
  approveByInventoryManager(approvedAt: string): void {
    this._requireTransition('INVENTORY_MANAGER_APPROVED');
    this._props.status = 'INVENTORY_MANAGER_APPROVED';
    this._props.inventoryManagerApprovedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new DisposalInventoryManagerApprovedEvent({
      tenantId: this._props.tenantId, disposalId: this.id, approvedAt,
    }));
  }

  /** Branch Head approval — second approval level. */
  approveByBranchHead(approvedAt: string): void {
    this._requireTransition('BRANCH_HEAD_APPROVED');
    if (!this._props.inventoryManagerApprovedAt) {
      throw new Error('Branch Head approval requires Inventory Manager approval first');
    }
    this._props.status = 'BRANCH_HEAD_APPROVED';
    this._props.branchHeadApprovedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new DisposalBranchHeadApprovedEvent({
      tenantId: this._props.tenantId, disposalId: this.id, approvedAt,
    }));
  }

  /** Execute disposal — physically remove item from inventory. */
  dispose(disposedAt: string, disposalLogUrl?: string): void {
    this._requireTransition('DISPOSED');
    if (!this._props.branchHeadApprovedAt) {
      throw new Error('Disposal requires Branch Head approval');
    }
    this._props.status = 'DISPOSED';
    this._props.disposedAt = disposedAt;
    if (disposalLogUrl) this._props.disposalLogUrl = disposalLogUrl;
    this._touch();
    this._addDomainEvent(new DisposalCompletedEvent({
      tenantId: this._props.tenantId, disposalId: this.id, disposedAt,
      disposalMethod: this._props.disposalMethod,
      writeOffValueCents: this._props.writeOffValueCents.toString(),
    }));
  }

  /** Reject the disposal (item not actually expired, or quantity wrong). */
  reject(reason: string): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.notes = reason;
    this._touch();
    this._addDomainEvent(new DisposalRejectedEvent({
      tenantId: this._props.tenantId, disposalId: this.id, reason,
    }));
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: DisposalStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `ExpiredItemDisposal invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
