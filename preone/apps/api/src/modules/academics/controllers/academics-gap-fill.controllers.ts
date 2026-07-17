/**
 * Academics Gap-Fill Controllers — Wave 21.
 *
 * Adds 20 missing REST endpoints across the Academics bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/academics):
 *   PATCH  /v1/academics/sessions/:id                             — Update academic session metadata
 *   DELETE /v1/academics/sessions/:id                             — Archive academic session (soft-delete)
 *   GET    /v1/academics/sessions/:id/sections                    — List sections in academic session
 *   PATCH  /v1/academics/curricula/:id                            — Update curriculum draft
 *   DELETE /v1/academics/curricula/:id                            — Archive curriculum
 *   PATCH  /v1/academics/sections/:id                             — Update section (capacity, room, teacher)
 *   GET    /v1/academics/sections/:id/enrollments                 — List enrollments in section
 *   GET    /v1/academics/sections/:id/students                    — List students enrolled in section
 *   PATCH  /v1/academics/enrollments/:id                          — Update enrollment notes
 *   DELETE /v1/academics/enrollments/:id                          — Cancel enrollment (soft-delete)
 *   PATCH  /v1/academics/observations/:id                         — Update observation text/tags
 *   DELETE /v1/academics/observations/:id                         — Delete observation
 *   GET    /v1/academics/observations/by-section/:sectionId       — List observations filtered by section
 *   PATCH  /v1/academics/assessments/:id                          — Update assessment (title, maxScore)
 *   DELETE /v1/academics/assessments/:id                          — Cancel assessment (soft-delete)
 *   GET    /v1/academics/assessments/:id/scores                   — List scores recorded for an assessment
 *   PATCH  /v1/academics/report-cards/:id                         — Update report card draft
 *   DELETE /v1/academics/report-cards/:id                         — Delete report card draft
 *   GET    /v1/academics/portfolios/:studentId                    — Get student portfolio
 *   PATCH  /v1/academics/portfolios/:studentId/items/:itemId      — Update portfolio item
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

@Controller('v1/academics')
export class AcademicsGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('sessions/:id')
  async patchSessionsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateSession',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('sessions/:id')
  async deleteSessionsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteSession',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('sessions/:id/sections')
  async getSessionsByidSections(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.ListSessionSections',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('curricula/:id')
  async patchCurriculaByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateCurricula',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('curricula/:id')
  async deleteCurriculaByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteCurricula',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('sections/:id')
  async patchSectionsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateSection',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('sections/:id/enrollments')
  async getSectionsByidEnrollments(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.ListSectionEnrollments',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/academics')
export class AcademicsGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('sections/:id/students')
  async getSectionsByidStudents(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.ListSectionStudents',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('enrollments/:id')
  async patchEnrollmentsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateEnrollment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('enrollments/:id')
  async deleteEnrollmentsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteEnrollment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('observations/:id')
  async patchObservationsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateObservation',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('observations/:id')
  async deleteObservationsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteObservation',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('observations/by-section/:sectionId')
  async getObservationsBysectionBysectionid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.GetBySection',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('assessments/:id')
  async patchAssessmentsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateAssessment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/academics')
export class AcademicsGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Delete('assessments/:id')
  async deleteAssessmentsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteAssessment',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('assessments/:id/scores')
  async getAssessmentsByidScores(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.ListAssessmentScores',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('report-cards/:id')
  async patchReportcardsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdateReportCard',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('report-cards/:id')
  async deleteReportcardsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Academics.DeleteReportCard',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('portfolios/:studentId')
  async getPortfoliosBystudentid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Academics.GetPortfolio',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('portfolios/:studentId/items/:itemId')
  async patchPortfoliosBystudentidItemsByitemid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Academics.UpdatePortfolio:Itemid',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}


