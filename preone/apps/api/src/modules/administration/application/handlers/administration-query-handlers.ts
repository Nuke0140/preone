/**
 * Administration Query Handlers — CQRS read side.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import type {
  GetAssetQuery, GetMaintenanceRequestQuery, GetVisitorLogQuery,
  ListAssetsQuery, ListFacilitiesQuery, ListFacilityInspectionsQuery,
  ListMaintenanceRequestsQuery, ListVisitorLogsQuery,
} from '../queries/administration.queries';

@Injectable()
export class GetAssetQueryHandler implements QueryHandler<GetAssetQuery> {
  private static readonly TYPE = 'Administration.GetAsset';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetAssetQueryHandler.TYPE, this);
  }
  async handle(q: GetAssetQuery) {
    return this.prisma.asset.findFirst({
      where: { id: q.payload.assetId, schoolId: q.payload.tenantId },
      include: { item: true, assignedTo: true, maintenanceRequests: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }
}

@Injectable()
export class ListAssetsQueryHandler implements QueryHandler<ListAssetsQuery> {
  private static readonly TYPE = 'Administration.ListAssets';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListAssetsQueryHandler.TYPE, this);
  }
  async handle(q: ListAssetsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.category) where.category = q.payload.category as any;
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.assignedToId) where.assignedToId = q.payload.assignedToId;
    return this.prisma.asset.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { assignedTo: true },
    });
  }
}

@Injectable()
export class GetMaintenanceRequestQueryHandler implements QueryHandler<GetMaintenanceRequestQuery> {
  private static readonly TYPE = 'Administration.GetMaintenanceRequest';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetMaintenanceRequestQueryHandler.TYPE, this);
  }
  async handle(q: GetMaintenanceRequestQuery) {
    return this.prisma.maintenanceRequest.findFirst({
      where: { id: q.payload.requestId, schoolId: q.payload.tenantId },
      include: { asset: true, requestedBy: true, assignedTo: true },
    });
  }
}

@Injectable()
export class ListMaintenanceRequestsQueryHandler implements QueryHandler<ListMaintenanceRequestsQuery> {
  private static readonly TYPE = 'Administration.ListMaintenanceRequests';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListMaintenanceRequestsQueryHandler.TYPE, this);
  }
  async handle(q: ListMaintenanceRequestsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.priority) where.priority = q.payload.priority as any;
    if (q.payload.assetId) where.assetId = q.payload.assetId;
    return this.prisma.maintenanceRequest.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { asset: true, requestedBy: true },
    });
  }
}

@Injectable()
export class GetVisitorLogQueryHandler implements QueryHandler<GetVisitorLogQuery> {
  private static readonly TYPE = 'Administration.GetVisitorLog';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetVisitorLogQueryHandler.TYPE, this);
  }
  async handle(q: GetVisitorLogQuery) {
    return this.prisma.visitorLog.findFirst({
      where: { id: q.payload.visitorLogId, schoolId: q.payload.tenantId },
      include: { personToMeet: true, approvedBy: true },
    });
  }
}

@Injectable()
export class ListVisitorLogsQueryHandler implements QueryHandler<ListVisitorLogsQuery> {
  private static readonly TYPE = 'Administration.ListVisitorLogs';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListVisitorLogsQueryHandler.TYPE, this);
  }
  async handle(q: ListVisitorLogsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.visitorType) where.visitorType = q.payload.visitorType as any;
    if (q.payload.dateFrom || q.payload.dateTo) {
      where.checkInAt = {};
      if (q.payload.dateFrom) where.checkInAt.gte = new Date(q.payload.dateFrom);
      if (q.payload.dateTo) where.checkInAt.lte = new Date(q.payload.dateTo);
    }
    return this.prisma.visitorLog.findMany({
      where, orderBy: { checkInAt: 'desc' }, take: limit, skip: offset,
    });
  }
}

@Injectable()
export class ListFacilitiesQueryHandler implements QueryHandler<ListFacilitiesQuery> {
  private static readonly TYPE = 'Administration.ListFacilities';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListFacilitiesQueryHandler.TYPE, this);
  }
  async handle(q: ListFacilitiesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.type) where.type = q.payload.type;
    if (q.payload.activeOnly) where.isActive = true;
    return this.prisma.facility.findMany({
      where, orderBy: { name: 'asc' }, take: limit,
      include: { _count: { select: { inspections: true } } },
    });
  }
}

@Injectable()
export class ListFacilityInspectionsQueryHandler implements QueryHandler<ListFacilityInspectionsQuery> {
  private static readonly TYPE = 'Administration.ListFacilityInspections';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListFacilityInspectionsQueryHandler.TYPE, this);
  }
  async handle(q: ListFacilityInspectionsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.facilityId) where.facilityId = q.payload.facilityId;
    return this.prisma.facilityInspection.findMany({
      where, orderBy: { inspectionDate: 'desc' }, take: limit,
      include: { facility: true, inspectedBy: true },
    });
  }
}
