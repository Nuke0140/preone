/**
 * Reports Query Handlers.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import { ReportsService } from '../services/reports.service';
import type {
  GetAttendanceStatsQuery, GetDashboardDataQuery, GetEnrollmentStatsQuery,
  GetFeeCollectionStatsQuery, GetReportDefinitionQuery, GetReportExecutionQuery,
  ListReportDefinitionsQuery, ListReportExecutionsQuery, ListReportSubscriptionsQuery,
  ListSavedReportsQuery,
} from '../queries/reports.queries';

@Injectable()
export class GetReportDefinitionQueryHandler implements QueryHandler<GetReportDefinitionQuery> {
  private static readonly TYPE = 'Reports.GetDefinition';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetReportDefinitionQueryHandler.TYPE, this);
  }
  async handle(q: GetReportDefinitionQuery) {
    const where: any = { id: q.payload.reportDefId };
    if (q.payload.tenantId) where.schoolId = q.payload.tenantId;
    return this.prisma.reportDefinition.findFirst({ where });
  }
}

@Injectable()
export class ListReportDefinitionsQueryHandler implements QueryHandler<ListReportDefinitionsQuery> {
  private static readonly TYPE = 'Reports.ListDefinitions';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListReportDefinitionsQueryHandler.TYPE, this);
  }
  async handle(q: ListReportDefinitionsQuery) {
    const where: any = { isActive: true };
    if (q.payload.tenantId) where.OR = [{ schoolId: q.payload.tenantId }, { schoolId: null, isSystem: true }];
    if (q.payload.category) where.category = q.payload.category as any;
    return this.prisma.reportDefinition.findMany({
      where, orderBy: { name: 'asc' },
    });
  }
}

@Injectable()
export class GetReportExecutionQueryHandler implements QueryHandler<GetReportExecutionQuery> {
  private static readonly TYPE = 'Reports.GetExecution';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetReportExecutionQueryHandler.TYPE, this);
  }
  async handle(q: GetReportExecutionQuery) {
    return this.prisma.reportExecution.findFirst({
      where: { id: q.payload.executionId, schoolId: q.payload.tenantId },
      include: { reportDef: true, requestedBy: true },
    });
  }
}

@Injectable()
export class ListReportExecutionsQueryHandler implements QueryHandler<ListReportExecutionsQuery> {
  private static readonly TYPE = 'Reports.ListExecutions';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListReportExecutionsQueryHandler.TYPE, this);
  }
  async handle(q: ListReportExecutionsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.reportDefId) where.reportDefId = q.payload.reportDefId;
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.reportExecution.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { reportDef: true },
    });
  }
}

@Injectable()
export class ListSavedReportsQueryHandler implements QueryHandler<ListSavedReportsQuery> {
  private static readonly TYPE = 'Reports.ListSavedReports';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListSavedReportsQueryHandler.TYPE, this);
  }
  async handle(q: ListSavedReportsQuery) {
    return this.prisma.savedReport.findMany({
      where: { schoolId: q.payload.tenantId, userId: q.payload.userId },
      orderBy: { createdAt: 'desc' },
      include: { reportDef: true },
    });
  }
}

@Injectable()
export class ListReportSubscriptionsQueryHandler implements QueryHandler<ListReportSubscriptionsQuery> {
  private static readonly TYPE = 'Reports.ListSubscriptions';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListReportSubscriptionsQueryHandler.TYPE, this);
  }
  async handle(q: ListReportSubscriptionsQuery) {
    const where: any = { schoolId: q.payload.tenantId, isActive: true };
    if (q.payload.userId) where.userId = q.payload.userId;
    return this.prisma.reportSubscription.findMany({
      where, orderBy: { nextRunAt: 'asc' },
      include: { reportDef: true },
    });
  }
}

@Injectable()
export class GetDashboardDataQueryHandler implements QueryHandler<GetDashboardDataQuery> {
  private static readonly TYPE = 'Reports.GetDashboard';
  constructor(private readonly bus: QueryBus, private readonly svc: ReportsService) {
    bus.register(GetDashboardDataQueryHandler.TYPE, this);
  }
  async handle(q: GetDashboardDataQuery) {
    return this.svc.getDashboardData(
      q.payload.tenantId, q.payload.widgets, q.payload.branchId, q.payload.academicSessionId,
    );
  }
}

@Injectable()
export class GetEnrollmentStatsQueryHandler implements QueryHandler<GetEnrollmentStatsQuery> {
  private static readonly TYPE = 'Reports.GetEnrollmentStats';
  constructor(private readonly bus: QueryBus, private readonly svc: ReportsService) {
    bus.register(GetEnrollmentStatsQueryHandler.TYPE, this);
  }
  async handle(q: GetEnrollmentStatsQuery) {
    return this.svc.getDashboardData(
      q.payload.tenantId, ['enrollment'], q.payload.branchId, q.payload.academicSessionId,
    );
  }
}

@Injectable()
export class GetAttendanceStatsQueryHandler implements QueryHandler<GetAttendanceStatsQuery> {
  private static readonly TYPE = 'Reports.GetAttendanceStats';
  constructor(private readonly bus: QueryBus, private readonly svc: ReportsService) {
    bus.register(GetAttendanceStatsQueryHandler.TYPE, this);
  }
  async handle(q: GetAttendanceStatsQuery) {
    return this.svc.getDashboardData(q.payload.tenantId, ['attendance'], q.payload.branchId);
  }
}

@Injectable()
export class GetFeeCollectionStatsQueryHandler implements QueryHandler<GetFeeCollectionStatsQuery> {
  private static readonly TYPE = 'Reports.GetFeeCollectionStats';
  constructor(private readonly bus: QueryBus, private readonly svc: ReportsService) {
    bus.register(GetFeeCollectionStatsQueryHandler.TYPE, this);
  }
  async handle(q: GetFeeCollectionStatsQuery) {
    return this.svc.getDashboardData(
      q.payload.tenantId, ['fee_collection'], q.payload.branchId, q.payload.academicSessionId,
    );
  }
}
