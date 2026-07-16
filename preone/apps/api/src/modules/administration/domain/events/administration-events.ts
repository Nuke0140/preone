/**
 * Administration Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Asset, MaintenanceRequest, VisitorLog, Facility aggregates.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─── Asset ────────────────────────────────────────────────────

export class AssetRegisteredEvent extends DomainEvent<{
  assetId: string;
  tenantId: string;
  assetTag: string;
  name: string;
  category: string;
}> {}

export class AssetAssignedEvent extends DomainEvent<{
  assetId: string;
  tenantId: string;
  assignedToId: string;
}> {}

export class AssetUnassignedEvent extends DomainEvent<{
  assetId: string;
  tenantId: string;
}> {}

export class AssetDisposedEvent extends DomainEvent<{
  assetId: string;
  tenantId: string;
  reason: string;
  scrapValueCents?: number;
}> {}

// ─── Maintenance Request ──────────────────────────────────────

export class MaintenanceRequestedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  requestNumber: string;
  assetId?: string;
  priority: string;
}> {}

export class MaintenanceApprovedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
}> {}

export class MaintenanceStartedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  startedAt: string;
}> {}

export class MaintenanceCompletedEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  completedAt: string;
}> {}

export class MaintenanceCancelledEvent extends DomainEvent<{
  requestId: string;
  tenantId: string;
  reason: string;
}> {}

// ─── Visitor Log ──────────────────────────────────────────────

export class VisitorCheckedInEvent extends DomainEvent<{
  visitorLogId: string;
  tenantId: string;
  name: string;
  visitorType: string;
  checkInAt: string;
}> {}

export class VisitorCheckedOutEvent extends DomainEvent<{
  visitorLogId: string;
  tenantId: string;
  checkOutAt: string;
  durationMinutes: number;
}> {}

export class VisitorDeniedEntryEvent extends DomainEvent<{
  visitorLogId: string;
  tenantId: string;
  reason: string;
}> {}

// ─── Facility ─────────────────────────────────────────────────

export class FacilityCreatedEvent extends DomainEvent<{
  facilityId: string;
  tenantId: string;
  name: string;
  type: string;
}> {}

export class FacilityInspectionRecordedEvent extends DomainEvent<{
  inspectionId: string;
  tenantId: string;
  facilityId: string;
  outcome: string;
}> {}
