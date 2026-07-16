/**
 * MaintenanceRequestAggregate — maintenance work order.
 *
 * Lifecycle:
 *   REQUESTED → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED (terminal)
 *                       ↘ DEFERRED → APPROVED
 *                       ↘ CANCELLED (terminal)
 *
 * Per BRC §13 (R-FAC-001): Preventive maintenance scheduling
 *
 * Invariants:
 *   - requestNumber unique per school
 *   - Cannot skip states (REQUESTED → IN_PROGRESS is invalid)
 *   - Completion requires resolutionNotes
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  MaintenanceApprovedEvent, MaintenanceCancelledEvent, MaintenanceCompletedEvent,
  MaintenanceRequestedEvent, MaintenanceStartedEvent,
} from '../events/administration-events';

export type MaintenanceType =
  | 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY' | 'INSPECTION' | 'CALIBRATION';

export type MaintenanceStatus =
  | 'REQUESTED' | 'APPROVED' | 'SCHEDULED' | 'IN_PROGRESS'
  | 'COMPLETED' | 'CANCELLED' | 'DEFERRED';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  REQUESTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'CANCELLED', 'DEFERRED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'DEFERRED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'DEFERRED'],
  COMPLETED: [],
  CANCELLED: [],
  DEFERRED: ['APPROVED', 'CANCELLED'],
};

export interface MaintenanceRequestProps {
  tenantId: string;
  branchId?: string;
  requestNumber: string;
  assetId?: string;
  requestedById: string;
  assignedToId?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  title: string;
  description: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCostCents: number;
  actualCostCents: number;
  vendorName?: string;
  vendorInvoiceNumber?: string;
  resolutionNotes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export class MaintenanceRequestAggregate extends AggregateRoot<MaintenanceRequestProps> {
  get tenantId(): string { return this._props.tenantId; }
  get requestNumber(): string { return this._props.requestNumber; }
  get status(): MaintenanceStatus { return this._props.status; }
  get priority(): MaintenancePriority { return this._props.priority; }
  get assetId(): string | undefined { return this._props.assetId; }

  static create(props: Omit<
    MaintenanceRequestProps,
    'status' | 'estimatedCostCents' | 'actualCostCents' | 'createdAt' | 'updatedAt'
  > & { estimatedCostCents?: number }): MaintenanceRequestAggregate {
    const now = new Date().toISOString();
    const agg = new MaintenanceRequestAggregate({
      ...props,
      status: 'REQUESTED',
      estimatedCostCents: props.estimatedCostCents ?? 0,
      actualCostCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new MaintenanceRequestedEvent({
      requestId: agg.id,
      tenantId: agg._props.tenantId,
      requestNumber: agg._props.requestNumber,
      assetId: agg._props.assetId,
      priority: agg._props.priority,
    }));
    return agg;
  }

  approve(): void {
    this._requireTransition('APPROVED');
    this._props.status = 'APPROVED';
    this._touch();
    this._addDomainEvent(new MaintenanceApprovedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  schedule(scheduledAt: string, assignedToId?: string): void {
    this._requireTransition('SCHEDULED');
    this._props.status = 'SCHEDULED';
    this._props.scheduledAt = scheduledAt;
    if (assignedToId) this._props.assignedToId = assignedToId;
    this._touch();
  }

  start(startedAt: string): void {
    this._requireTransition('IN_PROGRESS');
    this._props.status = 'IN_PROGRESS';
    this._props.startedAt = startedAt;
    this._touch();
    this._addDomainEvent(new MaintenanceStartedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      startedAt,
    }));
  }

  complete(completedAt: string, resolutionNotes: string, actualCostCents?: number): void {
    this._requireTransition('COMPLETED');
    if (!resolutionNotes.trim()) {
      throw new Error('Resolution notes are required to complete maintenance');
    }
    this._props.status = 'COMPLETED';
    this._props.completedAt = completedAt;
    this._props.resolutionNotes = resolutionNotes;
    if (actualCostCents !== undefined) this._props.actualCostCents = actualCostCents;
    this._touch();
    this._addDomainEvent(new MaintenanceCompletedEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      completedAt,
    }));
  }

  defer(): void {
    this._requireTransition('DEFERRED');
    this._props.status = 'DEFERRED';
    this._touch();
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelReason = reason;
    this._touch();
    this._addDomainEvent(new MaintenanceCancelledEvent({
      requestId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: MaintenanceStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid maintenance transition: ${this._props.status} → ${target}`);
    }
  }
}
