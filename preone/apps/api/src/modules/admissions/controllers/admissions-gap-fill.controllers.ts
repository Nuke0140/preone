/**
 * Admissions Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the Admissions bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/admissions):
 *   PATCH  /v1/admissions/applications/:id                         — Update application form fields
 *   DELETE /v1/admissions/applications/:id                         — Hard-delete application (admin only)
 *   GET    /v1/admissions/applications/:id/documents               — List documents uploaded for application
 *   DELETE /v1/admissions/applications/:id/documents/:docId        — Delete an uploaded document
 *   PATCH  /v1/admissions/applications/:id/counselling             — Reschedule counselling slot
 *   GET    /v1/admissions/applications/:id/offers                  — List offers issued for application
 *   POST   /v1/admissions/applications/:id/notes                   — Add an internal admissions note
 *   GET    /v1/admissions/applications/:id/notes                   — List internal admissions notes
 *   GET    /v1/admissions/applications/:id/timeline                — Get application event timeline
 *   GET    /v1/admissions/waiting-list/:id                         — Get waiting list entry
 *   PATCH  /v1/admissions/waiting-list/:id                         — Update waiting list priority
 *   POST   /v1/admissions/applications/:id/sibling-verification    — Verify sibling concession claim
 *   GET    /v1/admissions/applications/by-status/:status           — List applications by status
 *   GET    /v1/admissions/applications/by-counsellor/:counsellorId — List applications assigned to counsellor
 *   GET    /v1/admissions/stats                                    — Admissions funnel statistics
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

@Controller('v1/admissions')
export class AdmissionsGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('applications/:id')
  async patchApplicationsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Admissions.UpdateApplication',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('applications/:id')
  async deleteApplicationsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Admissions.DeleteApplication',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('applications/:id/documents')
  async getApplicationsByidDocuments(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.ListApplicationDocuments',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Delete('applications/:id/documents/:docId')
  async deleteApplicationsByidDocumentsBydocid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Admissions.DeleteApplication',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('applications/:id/counselling')
  async patchApplicationsByidCounselling(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Admissions.UpdateApplicationCounselling',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('applications/:id/offers')
  async getApplicationsByidOffers(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.ListApplicationOffers',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post('applications/:id/notes')
  async postApplicationsByidNotes(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Admissions.Notes',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/admissions')
export class AdmissionsGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('applications/:id/notes')
  async getApplicationsByidNotes(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.ListApplicationNotes',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('applications/:id/timeline')
  async getApplicationsByidTimeline(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.ListApplicationTimeline',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('waiting-list/:id')
  async getWaitinglistByid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.GetWaitingList',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('waiting-list/:id')
  async patchWaitinglistByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Admissions.UpdateWaitingList',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('applications/:id/sibling-verification')
  async postApplicationsByidSiblingverification(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Admissions.SiblingVerification',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('applications/by-status/:status')
  async getApplicationsBystatusBystatus(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.GetByStatu',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('applications/by-counsellor/:counsellorId')
  async getApplicationsBycounsellorBycounsellorid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.GetByCounsellor',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/admissions')
export class AdmissionsGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('stats')
  async getStats(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Admissions.ListStats',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


