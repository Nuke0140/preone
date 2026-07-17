/**
 * Attendance Gap-Fill Controllers — Wave 21.
 *
 * Adds 14 missing REST endpoints across the Attendance bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/attendance):
 *   PATCH  /v1/attendance/:id                                      — Correct attendance record
 *   DELETE /v1/attendance/:id                                      — Delete attendance record
 *   GET    /v1/attendance/by-section/:sectionId                    — List attendance filtered by section
 *   GET    /v1/attendance/by-date/:date                            — List attendance filtered by date
 *   PATCH  /v1/attendance/daily-logs/:id                           — Update daily log entry
 *   DELETE /v1/attendance/daily-logs/:id                           — Delete daily log entry
 *   PATCH  /v1/attendance/incidents/:id                            — Update incident report
 *   DELETE /v1/attendance/incidents/:id                            — Delete incident report (admin only)
 *   GET    /v1/attendance/incidents/by-section/:sectionId          — List incidents by section
 *   GET    /v1/attendance/incidents/by-severity/:severity          — List incidents by severity
 *   PATCH  /v1/attendance/daily-reports/:id                        — Update daily report draft
 *   GET    /v1/attendance/daily-reports/by-date/:date              — List daily reports by date
 *   POST   /v1/attendance/medicine-authorizations                  — Grant medicine authorization
 *   GET    /v1/attendance/classroom-summary/:sectionId/:date       — Get classroom attendance summary
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

@Controller('v1/attendance')
export class AttendanceGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch(':id')
  async patchById(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Attendance.Update:Id',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete(':id')
  async deleteById(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Attendance.Delete:Id',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('by-section/:sectionId')
  async getBysectionBysectionid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.GetBySection',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('by-date/:date')
  async getBydateBydate(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.GetByDate',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('daily-logs/:id')
  async patchDailylogsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Attendance.UpdateDailyLog',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('daily-logs/:id')
  async deleteDailylogsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Attendance.DeleteDailyLog',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('incidents/:id')
  async patchIncidentsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Attendance.UpdateIncident',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/attendance')
export class AttendanceGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Delete('incidents/:id')
  async deleteIncidentsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Attendance.DeleteIncident',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('incidents/by-section/:sectionId')
  async getIncidentsBysectionBysectionid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.GetBySection',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('incidents/by-severity/:severity')
  async getIncidentsByseverityByseverity(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.GetBySeverity',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('daily-reports/:id')
  async patchDailyreportsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Attendance.UpdateDailyReport',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('daily-reports/by-date/:date')
  async getDailyreportsBydateBydate(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.GetByDate',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post('medicine-authorizations')
  async postMedicineauthorizations(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Attendance.CreateMedicineAuthorization',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('classroom-summary/:sectionId/:date')
  async getClassroomsummaryBysectionidBydate(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Attendance.ListClassroomSummary:Date',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


