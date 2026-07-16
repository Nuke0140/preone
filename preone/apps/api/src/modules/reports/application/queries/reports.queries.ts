/**
 * Reports Queries.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetReportDefinitionQuery implements Query<{ reportDefId: string; tenantId?: string }, unknown> {
  readonly type = 'Reports.GetDefinition';
  constructor(readonly payload: { reportDefId: string; tenantId?: string }, readonly metadata: QueryMetadata) {}
}

export class ListReportDefinitionsQuery implements Query<{
  tenantId?: string;
  category?: string;
}, unknown> {
  readonly type = 'Reports.ListDefinitions';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetReportExecutionQuery implements Query<{ executionId: string; tenantId: string }, unknown> {
  readonly type = 'Reports.GetExecution';
  constructor(readonly payload: { executionId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListReportExecutionsQuery implements Query<{
  tenantId: string;
  reportDefId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Reports.ListExecutions';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListSavedReportsQuery implements Query<{ tenantId: string; userId: string }, unknown> {
  readonly type = 'Reports.ListSavedReports';
  constructor(readonly payload: { tenantId: string; userId: string }, readonly metadata: QueryMetadata) {}
}

export class ListReportSubscriptionsQuery implements Query<{ tenantId: string; userId?: string }, unknown> {
  readonly type = 'Reports.ListSubscriptions';
  constructor(readonly payload: { tenantId: string; userId?: string }, readonly metadata: QueryMetadata) {}
}

export class GetDashboardDataQuery implements Query<{
  tenantId: string;
  branchId?: string;
  widgets: string[];
  academicSessionId?: string;
}, unknown> {
  readonly type = 'Reports.GetDashboard';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetEnrollmentStatsQuery implements Query<{
  tenantId: string;
  academicSessionId: string;
  branchId?: string;
}, unknown> {
  readonly type = 'Reports.GetEnrollmentStats';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetAttendanceStatsQuery implements Query<{
  tenantId: string;
  dateFrom: string;
  dateTo: string;
  branchId?: string;
}, unknown> {
  readonly type = 'Reports.GetAttendanceStats';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetFeeCollectionStatsQuery implements Query<{
  tenantId: string;
  academicSessionId: string;
  branchId?: string;
}, unknown> {
  readonly type = 'Reports.GetFeeCollectionStats';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
