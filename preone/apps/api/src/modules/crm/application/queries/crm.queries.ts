/**
 * CRM Queries — CQRS read side (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetLeadQuery implements Query<{
  leadId: string;
  tenantId: string;
}> {
  readonly type = 'Crm.GetLead';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListLeadsQuery implements Query<{
  tenantId: string;
  branchId?: string;
  status?: string;
  source?: string;
  counsellorId?: string;
  campaignId?: string;
  limit?: number;
  offset?: number;
}> {
  readonly type = 'Crm.ListLeads';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetCampaignQuery implements Query<{
  campaignId: string;
  tenantId: string;
}> {
  readonly type = 'Crm.GetCampaign';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListCampaignsQuery implements Query<{
  tenantId: string;
  branchId?: string;
  status?: string;
  channel?: string;
}> {
  readonly type = 'Crm.ListCampaigns';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListFollowUpsQuery implements Query<{
  tenantId: string;
  leadId?: string;
  counsellorId?: string;
  status?: string;
  beforeDate?: string;
}> {
  readonly type = 'Crm.ListFollowUps';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetCounsellorDashboardQuery implements Query<{
  counsellorId: string;
  tenantId: string;
  periodStart?: string;
  periodEnd?: string;
}> {
  readonly type = 'Crm.GetCounsellorDashboard';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
