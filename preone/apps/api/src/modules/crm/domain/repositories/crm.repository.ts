/**
 * CRM Repository Ports — interfaces implemented by Prisma repos.
 */
import type { LeadAggregate } from '../aggregates/lead.aggregate';
import type { CampaignAggregate } from '../aggregates/campaign.aggregate';
import type { FollowUpAggregate } from '../aggregates/follow-up.aggregate';

export interface LeadRepository {
  save(agg: LeadAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<LeadAggregate | null>;
  findByCode(tenantId: string, leadCode: string): Promise<LeadAggregate | null>;
  findByPhone(tenantId: string, phone: string): Promise<LeadAggregate | null>;
  findByEmail(tenantId: string, email: string): Promise<LeadAggregate | null>;
  findByCounsellor(counsellorId: string, tenantId: string, status?: string): Promise<LeadAggregate[]>;
  findByCampaign(campaignId: string, tenantId: string): Promise<LeadAggregate[]>;
  findByStatus(tenantId: string, status: string, limit?: number): Promise<LeadAggregate[]>;
}

export interface CampaignRepository {
  save(agg: CampaignAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<CampaignAggregate | null>;
  findByCode(tenantId: string, code: string): Promise<CampaignAggregate | null>;
  findActive(tenantId: string): Promise<CampaignAggregate[]>;
  findByStatus(tenantId: string, status: string): Promise<CampaignAggregate[]>;
}

export interface FollowUpRepository {
  save(agg: FollowUpAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<FollowUpAggregate | null>;
  findByLead(leadId: string, tenantId: string): Promise<FollowUpAggregate[]>;
  findByCounsellor(counsellorId: string, tenantId: string, status?: string): Promise<FollowUpAggregate[]>;
  findPending(tenantId: string, beforeDate: string): Promise<FollowUpAggregate[]>;
}
