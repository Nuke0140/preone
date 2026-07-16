/**
 * Reports Controllers.
 *
 * Routes (under /v1/reports):
 *   POST   /definitions              — create report definition
 *   GET    /definitions              — list (filter by category)
 *   GET    /definitions/:id          — get single
 *
 *   POST   /executions               — execute report (async — returns executionId)
 *   POST   /executions/:id/cancel    — cancel queued/running execution
 *   GET    /executions               — list (filter by status, reportDefId)
 *   GET    /executions/:id           — get single
 *
 *   POST   /saved-reports            — save report config for user
 *   GET    /saved-reports            — list user's saved reports
 *
 *   POST   /subscriptions            — subscribe to scheduled report
 *   DELETE /subscriptions/:id        — delete subscription
 *   GET    /subscriptions            — list user's subscriptions
 *
 *   GET    /dashboard                — aggregated dashboard data (?widgets=enrollment,attendance,...)
 *   GET    /stats/enrollment         — enrollment stats
 *   GET    /stats/attendance         — attendance stats
 *   GET    /stats/fee-collection     — fee collection stats
 */
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/reports/definitions')
export class ReportDefinitionsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Reports.CreateDefinition',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId ?? 'platform' },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListDefinitions',
      payload: { tenantId: q.tenantId, category: q.category },
      metadata: { actorId: 'system', tenantId: q.tenantId ?? 'platform' },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.qbus.execute({
      type: 'Reports.GetDefinition',
      payload: { reportDefId: id, tenantId },
      metadata: { actorId: 'system', tenantId: tenantId ?? 'platform' },
    });
  }
}

@Controller('v1/reports/executions')
export class ReportExecutionsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async execute(@Body() body: any) {
    return this.bus.execute({
      type: 'Reports.Execute',
      payload: body,
      metadata: { actorId: body.requestedById, tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Reports.CancelExecution',
      payload: { executionId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExecutions',
      payload: {
        tenantId: q.tenantId,
        reportDefId: q.reportDefId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Reports.GetExecution',
      payload: { executionId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

@Controller('v1/reports/saved-reports')
export class SavedReportsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Reports.CreateSavedReport',
      payload: body,
      metadata: { actorId: body.userId, tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListSavedReports',
      payload: { tenantId: q.tenantId, userId: q.userId },
      metadata: { actorId: q.userId, tenantId: q.tenantId },
    });
  }
}

@Controller('v1/reports/subscriptions')
export class ReportSubscriptionsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Reports.CreateSubscription',
      payload: body,
      metadata: { actorId: body.userId, tenantId: body.tenantId },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.bus.execute({
      type: 'Reports.DeleteSubscription',
      payload: { subscriptionId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListSubscriptions',
      payload: { tenantId: q.tenantId, userId: q.userId },
      metadata: { actorId: q.userId ?? 'system', tenantId: q.tenantId },
    });
  }
}

@Controller('v1/reports')
export class AnalyticsController {
  constructor(private readonly qbus: QueryBus) {}

  @Get('dashboard')
  async dashboard(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.GetDashboard',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        widgets: (q.widgets ?? '').split(',').filter(Boolean),
        academicSessionId: q.academicSessionId,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get('stats/enrollment')
  async enrollment(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.GetEnrollmentStats',
      payload: { tenantId: q.tenantId, academicSessionId: q.academicSessionId, branchId: q.branchId },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get('stats/attendance')
  async attendance(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.GetAttendanceStats',
      payload: { tenantId: q.tenantId, dateFrom: q.dateFrom, dateTo: q.dateTo, branchId: q.branchId },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get('stats/fee-collection')
  async feeCollection(@Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.GetFeeCollectionStats',
      payload: { tenantId: q.tenantId, academicSessionId: q.academicSessionId, branchId: q.branchId },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
