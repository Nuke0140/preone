/**
 * Administration Commands — CQRS write side.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Assets ───────────────────────────────────────────────────

export class RegisterAssetCommand implements Command<{
  tenantId: string;
  branchId?: string;
  assetTag: string;
  itemId?: string;
  name: string;
  category: any;
  purchaseDate?: string;
  purchaseCostCents: number;
  depreciationRatePercent?: number;
  location?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  vendorName?: string;
}, { id: string }> {
  readonly type = 'Administration.RegisterAsset';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AssignAssetCommand implements Command<{
  assetId: string;
  assignedToId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Administration.AssignAsset';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UnassignAssetCommand implements Command<{ assetId: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.UnassignAsset';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DisposeAssetCommand implements Command<{
  assetId: string;
  reason: string;
  scrapValueCents: number;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Administration.DisposeAsset';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Maintenance ──────────────────────────────────────────────

export class CreateMaintenanceRequestCommand implements Command<{
  tenantId: string;
  branchId?: string;
  requestNumber: string;
  assetId?: string;
  requestedById: string;
  type: any;
  priority: any;
  title: string;
  description: string;
  estimatedCostCents?: number;
}, { id: string; requestNumber: string }> {
  readonly type = 'Administration.CreateMaintenanceRequest';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ApproveMaintenanceCommand implements Command<{ requestId: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.ApproveMaintenance';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class StartMaintenanceCommand implements Command<{ requestId: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.StartMaintenance';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteMaintenanceCommand implements Command<{
  requestId: string;
  resolutionNotes: string;
  actualCostCents?: number;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Administration.CompleteMaintenance';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelMaintenanceCommand implements Command<{ requestId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.CancelMaintenance';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Visitors ─────────────────────────────────────────────────

export class CheckInVisitorCommand implements Command<{
  tenantId: string;
  branchId?: string;
  visitorType: any;
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  purposeOfVisit: string;
  personToMeetId?: string;
  numVisitors?: number;
  idProofType?: string;
  idProofNumber?: string;
  photoUrl?: string;
  notes?: string;
}, { id: string }> {
  readonly type = 'Administration.CheckInVisitor';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CheckOutVisitorCommand implements Command<{ visitorLogId: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.CheckOutVisitor';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DenyVisitorEntryCommand implements Command<{ visitorLogId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Administration.DenyVisitorEntry';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
