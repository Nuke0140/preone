/**
 * ReportsService — orchestrates report execution + analytics.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { ReportExecutionAggregate } from '../../domain/aggregates/report-execution.aggregate';
import type {
  ReportDefinitionRepository, ReportExecutionRepository,
  ReportSubscriptionRepository, SavedReportRepository,
} from '../../domain/repositories/reports.repository';
import {
  REPORT_DEFINITION_REPOSITORY, REPORT_EXECUTION_REPOSITORY,
  REPORT_SUBSCRIPTION_REPOSITORY, SAVED_REPORT_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(REPORT_DEFINITION_REPOSITORY) private readonly defs: ReportDefinitionRepository,
    @Inject(REPORT_EXECUTION_REPOSITORY) private readonly executions: ReportExecutionRepository,
    @Inject(SAVED_REPORT_REPOSITORY) private readonly saved: SavedReportRepository,
    @Inject(REPORT_SUBSCRIPTION_REPOSITORY) private readonly subs: ReportSubscriptionRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Definitions ────────────────────────────────────────────

  async createReportDefinition(props: {
    tenantId?: string;
    key: string;
    name: string;
    description?: string;
    category: any;
    dataSource: string;
    queryTemplate: string;
    parameters?: any;
    defaultFormat?: any;
    allowedFormats?: any[];
    isSystem?: boolean;
  }): Promise<any> {
    return this.prisma.reportDefinition.create({
      data: {
        schoolId: props.tenantId,
        key: props.key,
        name: props.name,
        description: props.description,
        category: props.category,
        dataSource: props.dataSource,
        queryTemplate: props.queryTemplate,
        parameters: props.parameters as any,
        defaultFormat: props.defaultFormat ?? 'PDF',
        allowedFormats: props.allowedFormats ?? ['PDF'],
        isSystem: props.isSystem ?? false,
        isActive: true,
      },
    });
  }

  // ─── Execution ──────────────────────────────────────────────

  async executeReport(props: {
    tenantId: string;
    branchId?: string;
    reportDefId: string;
    requestedById: string;
    format?: any;
    parameters?: any;
  }): Promise<ReportExecutionAggregate> {
    const def = await this.prisma.reportDefinition.findFirst({
      where: { id: props.reportDefId, isActive: true },
    });
    if (!def) throw new Error(`Report definition ${props.reportDefId} not found or inactive`);
    const format = props.format ?? def.defaultFormat;
    const exec = ReportExecutionAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      reportDefId: props.reportDefId,
      requestedById: props.requestedById,
      format,
      parameters: props.parameters,
    });
    await this.executions.save(exec);
    await this.eventBus.publishAll(exec.commit());
    this.logger.log(`Queued report execution ${exec.id} for def ${props.reportDefId}`);
    return exec;
  }

  async startExecution(executionId: string, tenantId: string, startedAt: string): Promise<void> {
    const e = await this._loadExec(executionId, tenantId);
    e.start(startedAt);
    await this.executions.save(e);
    await this.eventBus.publishAll(e.commit());
  }

  async completeExecution(
    executionId: string, tenantId: string, completedAt: string,
    resultUrl: string, rowCount?: number, resultSizeBytes?: number,
  ): Promise<void> {
    const e = await this._loadExec(executionId, tenantId);
    e.complete(completedAt, resultUrl, rowCount, resultSizeBytes);
    await this.executions.save(e);
    await this.eventBus.publishAll(e.commit());
  }

  async failExecution(executionId: string, tenantId: string, errorMessage: string, failedAt: string): Promise<void> {
    const e = await this._loadExec(executionId, tenantId);
    e.fail(errorMessage, failedAt);
    await this.executions.save(e);
    await this.eventBus.publishAll(e.commit());
  }

  async cancelExecution(executionId: string, tenantId: string): Promise<void> {
    const e = await this._loadExec(executionId, tenantId);
    e.cancel();
    await this.executions.save(e);
    await this.eventBus.publishAll(e.commit());
  }

  // ─── Saved Reports ──────────────────────────────────────────

  async createSavedReport(props: {
    tenantId: string;
    userId: string;
    reportDefId: string;
    name: string;
    parameters?: any;
  }): Promise<any> {
    return this.prisma.savedReport.create({
      data: {
        schoolId: props.tenantId,
        userId: props.userId,
        reportDefId: props.reportDefId,
        name: props.name,
        parameters: props.parameters as any,
      },
    });
  }

  // ─── Subscriptions ──────────────────────────────────────────

  async createSubscription(props: {
    tenantId: string;
    userId: string;
    reportDefId: string;
    frequency: any;
    cronExpression?: string;
    parameters?: any;
    channels?: string[];
    nextRunAt: string;
  }): Promise<any> {
    return this.prisma.reportSubscription.create({
      data: {
        schoolId: props.tenantId,
        userId: props.userId,
        reportDefId: props.reportDefId,
        frequency: props.frequency,
        cronExpression: props.cronExpression,
        parameters: props.parameters as any,
        channels: props.channels ?? ['EMAIL'],
        nextRunAt: new Date(props.nextRunAt),
        isActive: true,
      },
    });
  }

  async deleteSubscription(subscriptionId: string, tenantId: string): Promise<void> {
    await this.prisma.reportSubscription.deleteMany({
      where: { id: subscriptionId, schoolId: tenantId },
    });
  }

  // ─── Dashboard / Analytics ──────────────────────────────────

  async getDashboardData(tenantId: string, widgets: string[], branchId?: string, academicSessionId?: string): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const w of widgets) {
      switch (w) {
        case 'enrollment': result[w] = await this._enrollmentStats(tenantId, academicSessionId, branchId); break;
        case 'attendance': result[w] = await this._attendanceStats(tenantId, branchId); break;
        case 'fee_collection': result[w] = await this._feeCollectionStats(tenantId, academicSessionId, branchId); break;
        case 'admissions_pipeline': result[w] = await this._admissionsPipeline(tenantId, academicSessionId); break;
        case 'staff_strength': result[w] = await this._staffStrength(tenantId); break;
        default: result[w] = { error: `Unknown widget: ${w}` };
      }
    }
    return result;
  }

  private async _enrollmentStats(tenantId: string, academicSessionId?: string, branchId?: string): Promise<unknown> {
    const where: any = { schoolId: tenantId, status: 'ACTIVE' };
    if (branchId) where.branchId = branchId;
    const total = await this.prisma.student.count({ where });
    const byGender = await this.prisma.student.groupBy({
      by: ['gender'], where, _count: { _all: true },
    });
    return { total, byGender };
  }

  private async _attendanceStats(tenantId: string, branchId?: string): Promise<unknown> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: any = { schoolId: tenantId, date: today };
    if (branchId) where.branchId = branchId;
    const present = await this.prisma.attendance.count({ where: { ...where, status: 'PRESENT' } });
    const absent = await this.prisma.attendance.count({ where: { ...where, status: 'ABSENT' } });
    const late = await this.prisma.attendance.count({ where: { ...where, status: 'LATE' } });
    return { present, absent, late, total: present + absent + late };
  }

  private async _feeCollectionStats(tenantId: string, academicSessionId?: string, branchId?: string): Promise<unknown> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const where: any = { schoolId: tenantId, createdAt: { gte: startOfMonth } };
    if (branchId) where.branchId = branchId;
    const agg = await this.prisma.payment.aggregate({
      where, _sum: { amountCents: true }, _count: { _all: true },
    });
    return {
      collectedThisMonthCents: agg._sum.amountCents ?? 0,
      paymentCount: agg._count._all,
    };
  }

  private async _admissionsPipeline(tenantId: string, _academicSessionId?: string): Promise<unknown> {
    const byStatus = await this.prisma.application.groupBy({
      by: ['status'], where: { schoolId: tenantId }, _count: { _all: true },
    });
    return { byStatus };
  }

  private async _staffStrength(tenantId: string): Promise<unknown> {
    const byStatus = await this.prisma.employee.groupBy({
      by: ['status'], where: { schoolId: tenantId }, _count: { _all: true },
    });
    return { byStatus };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async _loadExec(id: string, tenantId: string): Promise<ReportExecutionAggregate> {
    const e = await this.executions.findById(id, tenantId);
    if (!e) throw new Error(`Report execution ${id} not found`);
    return e;
  }
}
