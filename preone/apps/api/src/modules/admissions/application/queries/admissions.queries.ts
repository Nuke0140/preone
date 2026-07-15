/**
 * Admissions Queries — read-side projections (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

import type { ListApplicationsQuery, ListAdmissionsQuery } from '../dto/admissions.dto';

export class GetApplicationQuery implements Query<{ applicationId: string; tenantId: string }, unknown> {
  readonly type = 'Admissions.GetApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListApplicationsQueryQuery implements Query<ListApplicationsQuery & { tenantId: string }, { items: unknown[]; total: number; page: number; pageSize: number }> {
  readonly type = 'Admissions.ListApplications';
  constructor(readonly payload: ListApplicationsQuery & { tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetAdmissionQuery implements Query<{ admissionId: string; tenantId: string }, unknown> {
  readonly type = 'Admissions.GetAdmission';
  constructor(readonly payload: { admissionId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListAdmissionsQueryQuery implements Query<ListAdmissionsQuery & { tenantId: string }, { items: unknown[]; total: number; page: number; pageSize: number }> {
  readonly type = 'Admissions.ListAdmissions';
  constructor(readonly payload: ListAdmissionsQuery & { tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetAdmissionPipelineQuery implements Query<{ tenantId: string; branchId: string; academicSessionId: string }, unknown> {
  readonly type = 'Admissions.GetPipeline';
  constructor(readonly payload: { tenantId: string; branchId: string; academicSessionId: string }, readonly metadata: QueryMetadata) {}
}

export class ListWaitingListQuery implements Query<{ tenantId: string; branchId: string; programType: string; academicSessionId: string }, unknown[]> {
  readonly type = 'Admissions.ListWaitingList';
  constructor(readonly payload: { tenantId: string; branchId: string; programType: string; academicSessionId: string }, readonly metadata: QueryMetadata) {}
}
