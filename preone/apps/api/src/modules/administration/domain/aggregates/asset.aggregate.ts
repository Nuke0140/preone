/**
 * AssetAggregate — physical asset (furniture, IT, vehicle, etc.) tracked by school.
 *
 * Per BRC §13 (Facility Rules):
 *   - Asset tag unique per school
 *   - Depreciation calculated on purchase cost
 *   - Disposal requires reason + scrap value
 *
 * Lifecycle: IN_USE → {IN_STORAGE | UNDER_REPAIR | DISPOSED | LOST | WRITTEN_OFF}
 *   IN_USE → ALLOCATED (assigned to user) → IN_USE
 *
 * Invariants:
 *   - assetTag is unique per school
 *   - currentValueCents ≥ 0
 *   - Disposal is terminal
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  AssetAssignedEvent, AssetDisposedEvent, AssetRegisteredEvent, AssetUnassignedEvent,
} from '../events/administration-events';

export type AssetCategory =
  | 'IT_EQUIPMENT' | 'FURNITURE' | 'KITCHEN_EQUIPMENT' | 'TEACHING_AID'
  | 'SPORTS_EQUIPMENT' | 'SAFETY_EQUIPMENT' | 'VEHICLE' | 'BUILDING' | 'OTHER';

export type AssetStatus =
  | 'IN_USE' | 'IN_STORAGE' | 'UNDER_REPAIR' | 'DISPOSED' | 'LOST'
  | 'WRITTEN_OFF' | 'ALLOCATED';

const TERMINAL_STATUSES: AssetStatus[] = ['DISPOSED', 'LOST', 'WRITTEN_OFF'];

export interface AssetProps {
  tenantId: string;
  branchId?: string;
  assetTag: string;
  itemId?: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  purchaseDate?: string;
  purchaseCostCents: number;
  currentValueCents: number;
  depreciationRatePercent: number;
  assignedToId?: string;
  assignedAt?: string;
  location?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  vendorName?: string;
  lastMaintenanceAt?: string;
  nextMaintenanceDue?: string;
  disposedAt?: string;
  disposalReason?: string;
  scrapValueCents?: number;
  createdAt: string;
  updatedAt: string;
}

export class AssetAggregate extends AggregateRoot<AssetProps> {
  get tenantId(): string { return this._props.tenantId; }
  get assetTag(): string { return this._props.assetTag; }
  get name(): string { return this._props.name; }
  get status(): AssetStatus { return this._props.status; }
  get category(): AssetCategory { return this._props.category; }
  get assignedToId(): string | undefined { return this._props.assignedToId; }
  get currentValueCents(): number { return this._props.currentValueCents; }
  get purchaseCostCents(): number { return this._props.purchaseCostCents; }

  static create(props: Omit<
    AssetProps,
    'status' | 'currentValueCents' | 'createdAt' | 'updatedAt'
  >): AssetAggregate {
    const now = new Date().toISOString();
    const agg = new AssetAggregate({
      ...props,
      status: 'IN_USE',
      currentValueCents: props.purchaseCostCents,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new AssetRegisteredEvent({
      assetId: agg.id,
      tenantId: agg._props.tenantId,
      assetTag: agg._props.assetTag,
      name: agg._props.name,
      category: agg._props.category,
    }));
    return agg;
  }

  assignTo(userId: string, assignedAt: string): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Cannot assign ${this._props.status} asset`);
    }
    this._props.assignedToId = userId;
    this._props.assignedAt = assignedAt;
    this._props.status = 'ALLOCATED';
    this._touch();
    this._addDomainEvent(new AssetAssignedEvent({
      assetId: this.id,
      tenantId: this._props.tenantId,
      assignedToId: userId,
    }));
  }

  unassign(): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Cannot unassign ${this._props.status} asset`);
    }
    if (!this._props.assignedToId) return;
    this._props.assignedToId = undefined;
    this._props.assignedAt = undefined;
    this._props.status = 'IN_USE';
    this._touch();
    this._addDomainEvent(new AssetUnassignedEvent({
      assetId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  markUnderRepair(): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Cannot repair ${this._props.status} asset`);
    }
    this._props.status = 'UNDER_REPAIR';
    this._touch();
  }

  markInStorage(): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Cannot store ${this._props.status} asset`);
    }
    this._props.status = 'IN_STORAGE';
    this._touch();
  }

  markInUse(): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Cannot use ${this._props.status} asset`);
    }
    this._props.status = 'IN_USE';
    this._touch();
  }

  dispose(reason: string, scrapValueCents: number, disposedAt: string): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Asset already ${this._props.status}`);
    }
    this._props.status = 'DISPOSED';
    this._props.disposalReason = reason;
    this._props.scrapValueCents = scrapValueCents;
    this._props.disposedAt = disposedAt;
    this._props.assignedToId = undefined;
    this._props.assignedAt = undefined;
    this._touch();
    this._addDomainEvent(new AssetDisposedEvent({
      assetId: this.id,
      tenantId: this._props.tenantId,
      reason,
      scrapValueCents,
    }));
  }

  markLost(reason: string): void {
    if (TERMINAL_STATUSES.includes(this._props.status)) {
      throw new Error(`Asset already ${this._props.status}`);
    }
    this._props.status = 'LOST';
    this._props.disposalReason = reason;
    this._props.disposedAt = new Date().toISOString();
    this._touch();
  }

  updateMaintenance(maintainedAt: string, nextDue?: string): void {
    this._props.lastMaintenanceAt = maintainedAt;
    if (nextDue) this._props.nextMaintenanceDue = nextDue;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
