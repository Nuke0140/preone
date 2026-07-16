/**
 * Platform Repository Ports.
 */
import type { SupportTicketAggregate } from '../aggregates/support-ticket.aggregate';
import type { TenantProvisioningAggregate } from '../aggregates/tenant-provisioning.aggregate';

export interface TenantProvisioningRepository {
  save(agg: TenantProvisioningAggregate): Promise<void>;
  findById(id: string): Promise<TenantProvisioningAggregate | null>;
  findBySchool(schoolId: string): Promise<TenantProvisioningAggregate | null>;
  findByStatus(status: string, limit?: number): Promise<TenantProvisioningAggregate[]>;
}

export interface FeatureFlagRepository {
  save(agg: any): Promise<void>;
  findById(id: string): Promise<any | null>;
  findByKeyAndScope(key: string, scope: string, schoolId?: string, plan?: string): Promise<any | null>;
  findAll(schoolId?: string): Promise<any[]>;
  delete(id: string): Promise<void>;
}

export interface SupportTicketRepository {
  save(agg: SupportTicketAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<SupportTicketAggregate | null>;
  findByTicketNumber(tenantId: string, ticketNumber: string): Promise<SupportTicketAggregate | null>;
  findByStatus(tenantId: string, status: string, limit?: number): Promise<SupportTicketAggregate[]>;
}

export interface SupportTicketCommentRepository {
  save(agg: any): Promise<void>;
  findByTicket(ticketId: string): Promise<any[]>;
}
