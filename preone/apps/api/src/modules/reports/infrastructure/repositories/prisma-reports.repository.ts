/**
 * PrismaReportsRepository.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { ReportExecutionAggregate } from '../../domain/aggregates/report-execution.aggregate';
import type {
  ReportDefinitionRepository, ReportExecutionRepository,
  ReportSubscriptionRepository, SavedReportRepository,
} from '../../domain/repositories/reports.repository';

@Injectable()
export class PrismaReportDefinitionRepository implements ReportDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: any): Promise<void> {
    await this.prisma.reportDefinition.upsert({
      where: { id: agg.id },
      create: agg, update: agg,
    });
  }

  async findById(id: string, _tenantId?: string): Promise<any | null> {
    return this.prisma.reportDefinition.findUnique({ where: { id } });
  }

  async findByKey(tenantId: string | null, key: string): Promise<any | null> {
    return this.prisma.reportDefinition.findFirst({
      where: { schoolId: tenantId, key },
    });
  }

  async findAll(tenantId?: string, category?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (tenantId) where.schoolId = tenantId;
    if (category) where.category = category;
    return this.prisma.reportDefinition.findMany({ where, orderBy: { name: 'asc' } });
  }
}

@Injectable()
export class PrismaReportExecutionRepository implements ReportExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: ReportExecutionAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.reportExecution.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        reportDefId: p.reportDefId,
        requestedById: p.requestedById,
        status: p.status as any,
        format: p.format as any,
        parameters: p.parameters as any,
        resultUrl: p.resultUrl,
        resultSizeBytes: p.resultSizeBytes,
        rowCount: p.rowCount,
        errorMessage: p.errorMessage,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        durationMs: p.durationMs,
      },
      update: {
        status: p.status as any,
        resultUrl: p.resultUrl,
        resultSizeBytes: p.resultSizeBytes,
        rowCount: p.rowCount,
        errorMessage: p.errorMessage,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        durationMs: p.durationMs,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<ReportExecutionAggregate | null> {
    const row = await this.prisma.reportExecution.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByStatus(tenantId: string, status: string, limit = 50): Promise<ReportExecutionAggregate[]> {
    const rows = await this.prisma.reportExecution.findMany({
      where: { schoolId: tenantId, status: status as any },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): ReportExecutionAggregate {
    const agg = Object.create(ReportExecutionAggregate.prototype) as ReportExecutionAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      reportDefId: row.reportDefId,
      requestedById: row.requestedById,
      status: row.status,
      format: row.format,
      parameters: row.parameters,
      resultUrl: row.resultUrl ?? undefined,
      resultSizeBytes: row.resultSizeBytes ?? undefined,
      rowCount: row.rowCount ?? undefined,
      errorMessage: row.errorMessage ?? undefined,
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      durationMs: row.durationMs ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaSavedReportRepository implements SavedReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: any): Promise<void> {
    await this.prisma.savedReport.upsert({
      where: { id: agg.id },
      create: agg, update: agg,
    });
  }

  async findById(id: string, tenantId: string): Promise<any | null> {
    return this.prisma.savedReport.findFirst({ where: { id, schoolId: tenantId } });
  }

  async findByUser(userId: string, tenantId: string): Promise<any[]> {
    return this.prisma.savedReport.findMany({
      where: { userId, schoolId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class PrismaReportSubscriptionRepository implements ReportSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: any): Promise<void> {
    await this.prisma.reportSubscription.upsert({
      where: { id: agg.id },
      create: agg, update: agg,
    });
  }

  async findById(id: string, tenantId: string): Promise<any | null> {
    return this.prisma.reportSubscription.findFirst({ where: { id, schoolId: tenantId } });
  }

  async findDue(now: string, limit = 50): Promise<any[]> {
    return this.prisma.reportSubscription.findMany({
      where: { isActive: true, nextRunAt: { lte: new Date(now) } },
      take: limit, orderBy: { nextRunAt: 'asc' },
    });
  }

  async findByUser(userId: string, tenantId: string): Promise<any[]> {
    return this.prisma.reportSubscription.findMany({
      where: { userId, schoolId: tenantId, isActive: true },
      orderBy: { nextRunAt: 'asc' },
    });
  }
}
