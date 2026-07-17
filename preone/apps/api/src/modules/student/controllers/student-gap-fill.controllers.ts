/**
 * Student Gap-Fill Controllers — Wave 21.
 *
 * Adds 12 missing REST endpoints across the Student bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/students):
 *   PATCH  /v1/students/:id                                      — Update student profile
 *   GET    /v1/students/:id/guardians                            — List guardians of a student
 *   POST   /v1/students/:id/guardians                            — Add a guardian to a student
 *   PATCH  /v1/students/:id/guardians/:guardianId                — Update a guardian
 *   DELETE /v1/students/:id/guardians/:guardianId                — Remove a guardian from a student
 *   GET    /v1/students/:id/enrollments                          — List enrollments for a student
 *   GET    /v1/students/:id/attendance                           — Attendance history for a student
 *   GET    /v1/students/:id/medical-history                      — Medical history for a student
 *   PATCH  /v1/students/:id/medical-history                      — Update medical info (allergies, conditions)
 *   GET    /v1/students/search                                   — Advanced student search
 *   GET    /v1/students/by-section/:sectionId                    — List students by section
 *   GET    /v1/students/by-status/:status                        — List students by status
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

@Controller('v1/students')
export class StudentGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch(':id')
  async patchById(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Student.Update:Id',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get(':id/guardians')
  async getByIdGuardians(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.ListResourceGuardians',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Post(':id/guardians')
  async postByIdGuardians(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Student.Guardians',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch(':id/guardians/:guardianId')
  async patchByIdGuardiansByguardianid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Student.Update:Id:Guardianid',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete(':id/guardians/:guardianId')
  async deleteByIdGuardiansByguardianid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Student.Delete:Id',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get(':id/enrollments')
  async getByIdEnrollments(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.ListResourceEnrollments',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get(':id/attendance')
  async getByIdAttendance(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.ListResourceAttendance',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/students')
export class StudentGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get(':id/medical-history')
  async getByIdMedicalhistory(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.ListResourceMedicalHistory',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch(':id/medical-history')
  async patchByIdMedicalhistory(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Student.Update:IdMedicalHistory',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('search')
  async getSearch(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.ListSearch',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('by-section/:sectionId')
  async getBysectionBysectionid(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.GetBySection',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('by-status/:status')
  async getBystatusBystatus(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Student.GetByStatu',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}


