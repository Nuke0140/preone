/**
 * Administration Queries — CQRS read side.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetAssetQuery implements Query<{ assetId: string; tenantId: string }, unknown> {
  readonly type = 'Administration.GetAsset';
  constructor(readonly payload: { assetId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListAssetsQuery implements Query<{
  tenantId: string;
  category?: string;
  status?: string;
  assignedToId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Administration.ListAssets';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetMaintenanceRequestQuery implements Query<{ requestId: string; tenantId: string }, unknown> {
  readonly type = 'Administration.GetMaintenanceRequest';
  constructor(readonly payload: { requestId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListMaintenanceRequestsQuery implements Query<{
  tenantId: string;
  status?: string;
  priority?: string;
  assetId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Administration.ListMaintenanceRequests';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetVisitorLogQuery implements Query<{ visitorLogId: string; tenantId: string }, unknown> {
  readonly type = 'Administration.GetVisitorLog';
  constructor(readonly payload: { visitorLogId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListVisitorLogsQuery implements Query<{
  tenantId: string;
  status?: string;
  visitorType?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Administration.ListVisitorLogs';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListFacilitiesQuery implements Query<{
  tenantId: string;
  type?: string;
  activeOnly?: boolean;
  limit?: number;
}, unknown> {
  readonly type = 'Administration.ListFacilities';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListFacilityInspectionsQuery implements Query<{
  tenantId: string;
  facilityId?: string;
  limit?: number;
}, unknown> {
  readonly type = 'Administration.ListFacilityInspections';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
