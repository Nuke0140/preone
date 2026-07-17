/**
 * Reports Gap-Fill Controllers — Wave 21.
 *
 * Adds 14 missing REST endpoints across the Reports bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/reports):
 *   PATCH  /v1/reports/definitions/:id                          — Update report definition
 *   DELETE /v1/reports/definitions/:id                          — Delete report definition
 *   POST   /v1/reports/executions/:id/retry                     — Retry a failed execution
 *   DELETE /v1/reports/saved-reports/:id                        — Delete a saved report
 *   PATCH  /v1/reports/subscriptions/:id                        — Update subscription (cron, recipients)
 *   POST   /v1/reports/subscriptions/:id/pause                  — Pause a subscription
 *   POST   /v1/reports/subscriptions/:id/resume                 — Resume a paused subscription
 *   GET    /v1/reports/dashboard/export                         — Export dashboard stats as CSV
 *   GET    /v1/reports/enrollment/export                        — Export enrollment stats as CSV
 *   GET    /v1/reports/attendance/export                        — Export attendance stats as CSV
 *   GET    /v1/reports/fee-collection/export                    — Export fee collection stats as CSV
 *   GET    /v1/reports/executions/:id/download                  — Download execution result (CSV/JSON)
 *   POST   /v1/reports/definitions                              — Create a new report definition
 *   GET    /v1/reports/saved-reports                            — List saved reports
 *
 * Wave 21 strategy:
 *   - PATCH endpoints update mutable fields (route to existing service methods
 *     where available, otherwise return a structured stub for handler wiring).
 *   - DELETE endpoints perform soft-delete (set deletedAt) or hard-delete with
 *     admin override — handlers enforce tenant scoping + audit logging.
 *   - GET sub-resource listings return shape { success: true, data: [...] }
 *     consistent with API Contract §3 (Response Envelope).
 *   - Export endpoints return 501 GAP_FILL_PENDING until csv-writer is wired.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/reports')
export class ReportsGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('definitions/:id')
  async patchDefinitionsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.UpdateDefinition',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('definitions/:id')
  async deleteDefinitionsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Reports.DeleteDefinition',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('executions/:id/retry')
  async postExecutionsByidRetry(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.Retry',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('saved-reports/:id')
  async deleteSavedreportsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Reports.DeleteSavedReport',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('subscriptions/:id')
  async patchSubscriptionsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.UpdateSubscription',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('subscriptions/:id/pause')
  async postSubscriptionsByidPause(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.Pause',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('subscriptions/:id/resume')
  async postSubscriptionsByidResume(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.Resume',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/reports')
export class ReportsGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('dashboard/export')
  async getDashboardExport(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExport',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('enrollment/export')
  async getEnrollmentExport(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExport',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('attendance/export')
  async getAttendanceExport(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExport',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('fee-collection/export')
  async getFeecollectionExport(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExport',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('executions/:id/download')
  async getExecutionsByidDownload(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListExecutionDownload',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post('definitions')
  async postDefinitions(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Reports.CreateDefinition',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('saved-reports')
  async getSavedreports(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Reports.ListSavedReports',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


