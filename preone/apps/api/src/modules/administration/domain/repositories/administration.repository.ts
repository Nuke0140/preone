/**
 * Administration Repository Ports — interfaces implemented by Prisma repos.
 */
import type { AssetAggregate } from '../aggregates/asset.aggregate';
import type { MaintenanceRequestAggregate } from '../aggregates/maintenance-request.aggregate';
import type { VisitorLogAggregate } from '../aggregates/visitor-log.aggregate';

export interface AssetRepository {
  save(agg: AssetAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<AssetAggregate | null>;
  findByTag(tenantId: string, assetTag: string): Promise<AssetAggregate | null>;
  findByAssignedTo(userId: string, tenantId: string): Promise<AssetAggregate[]>;
}

export interface MaintenanceRequestRepository {
  save(agg: MaintenanceRequestAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<MaintenanceRequestAggregate | null>;
  findByRequestNumber(tenantId: string, requestNumber: string): Promise<MaintenanceRequestAggregate | null>;
  findByAsset(assetId: string, tenantId: string): Promise<MaintenanceRequestAggregate[]>;
}

export interface VisitorLogRepository {
  save(agg: VisitorLogAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<VisitorLogAggregate | null>;
  findCheckedIn(tenantId: string, limit?: number): Promise<VisitorLogAggregate[]>;
}

export interface FacilityRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findActive(tenantId: string, limit?: number): Promise<any[]>;
}

export interface FacilityInspectionRepository {
  save(agg: any): Promise<void>;
  findById(id: string, tenantId: string): Promise<any | null>;
  findByFacility(facilityId: string, tenantId: string): Promise<any[]>;
}
