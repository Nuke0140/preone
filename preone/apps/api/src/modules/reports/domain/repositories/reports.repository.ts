/**
 * Reports Repository Ports.
 */
import type { ReportExecutionAggregate } from '../aggregates/report-execution.aggregate';

export interface ReportDefinitionRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId?: string): Promise<any | null>;
  findByKey(tenantId: string | null, key: string): Promise<any | null>;
  findAll(tenantId?: string, category?: string): Promise<any[]>;
}

export interface ReportExecutionRepository {
  save(agg: ReportExecutionAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<ReportExecutionAggregate | null>;
  findByStatus(tenantId: string, status: string, limit?: number): Promise<ReportExecutionAggregate[]>;
}

export interface SavedReportRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByUser(userId: string, tenantId: string): Promise<any[]>;
}

export interface ReportSubscriptionRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findDue(now: string, limit?: number): Promise<any[]>;
  findByUser(userId: string, tenantId: string): Promise<any[]>;
}
