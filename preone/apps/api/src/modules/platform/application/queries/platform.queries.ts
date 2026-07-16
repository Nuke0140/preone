/**
 * Platform Queries.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetTenantProvisioningQuery implements Query<{ provisioningId: string }, unknown> {
  readonly type = 'Platform.GetProvisioning';
  constructor(readonly payload: { provisioningId: string }, readonly metadata: QueryMetadata) {}
}

export class GetTenantProvisioningBySchoolQuery implements Query<{ schoolId: string }, unknown> {
  readonly type = 'Platform.GetProvisioningBySchool';
  constructor(readonly payload: { schoolId: string }, readonly metadata: QueryMetadata) {}
}

export class ListProvisioningsQuery implements Query<{ status?: string; limit?: number }, unknown> {
  readonly type = 'Platform.ListProvisionings';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetFeatureFlagQuery implements Query<{
  key: string;
  scope: string;
  schoolId?: string;
  plan?: string;
}, unknown> {
  readonly type = 'Platform.GetFeatureFlag';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListFeatureFlagsQuery implements Query<{ schoolId?: string }, unknown> {
  readonly type = 'Platform.ListFeatureFlags';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetSupportTicketQuery implements Query<{ ticketId: string; tenantId: string }, unknown> {
  readonly type = 'Platform.GetSupportTicket';
  constructor(readonly payload: { ticketId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListSupportTicketsQuery implements Query<{
  tenantId: string;
  status?: string;
  priority?: string;
  assignedToId?: string;
  raisedById?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Platform.ListSupportTickets';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListSupportTicketCommentsQuery implements Query<{ ticketId: string; tenantId: string }, unknown> {
  readonly type = 'Platform.ListTicketComments';
  constructor(readonly payload: { ticketId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetPlatformMetricsQuery implements Query<{ dateFrom?: string; dateTo?: string }, unknown> {
  readonly type = 'Platform.GetMetrics';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
