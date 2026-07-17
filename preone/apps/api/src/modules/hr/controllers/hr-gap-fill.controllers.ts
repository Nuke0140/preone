/**
 * HR Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the HR bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/hr):
 *   PATCH  /v1/hr/employees/:id                            — Update employee basic info
 *   DELETE /v1/hr/employees/:id                            — Soft-delete employee record
 *   POST   /v1/hr/employees/:id/link-user                  — Link employee to identity user
 *   GET    /v1/hr/employees/:id/payrolls                   — List payrolls for an employee
 *   GET    /v1/hr/employees/:id/reviews                    — List performance reviews for an employee
 *   PATCH  /v1/hr/leaves/:id                               — Update leave (notes)
 *   DELETE /v1/hr/leaves/:id                               — Delete leave request
 *   GET    /v1/hr/leaves/by-status/:status                 — List leaves by status
 *   PATCH  /v1/hr/payrolls/:id                             — Update payroll (cancel pending)
 *   POST   /v1/hr/payrolls/:id/cancel                      — Cancel a pending payroll run
 *   GET    /v1/hr/payrolls/:id/payslips                    — List payslips in a payroll run
 *   PATCH  /v1/hr/reviews/:id                              — Update review (notes)
 *   POST   /v1/hr/reviews/:id/cancel                       — Cancel an in-progress review
 *   GET    /v1/hr/positions                                — List open position openings
 *   POST   /v1/hr/positions                                — Create a position opening
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

@Controller('v1/hr')
export class HrGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('employees/:id')
  async patchEmployeesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.UpdateEmployee',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('employees/:id')
  async deleteEmployeesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Hr.DeleteEmployee',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('employees/:id/link-user')
  async postEmployeesByidLinkuser(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.LinkUser',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('employees/:id/payrolls')
  async getEmployeesByidPayrolls(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListEmployeePayrolls',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('employees/:id/reviews')
  async getEmployeesByidReviews(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListEmployeeReviews',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('leaves/:id')
  async patchLeavesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.UpdateLeave',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('leaves/:id')
  async deleteLeavesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Hr.DeleteLeave',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/hr')
export class HrGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Get('leaves/by-status/:status')
  async getLeavesBystatusBystatus(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.GetByStatu',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('payrolls/:id')
  async patchPayrollsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.UpdatePayroll',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('payrolls/:id/cancel')
  async postPayrollsByidCancel(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.Cancel',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('payrolls/:id/payslips')
  async getPayrollsByidPayslips(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListPayrollPayslips',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('reviews/:id')
  async patchReviewsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.UpdateReview',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Post('reviews/:id/cancel')
  async postReviewsByidCancel(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.Cancel',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('positions')
  async getPositions(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListPositions',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/hr')
export class HrGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Post('positions')
  async postPositions(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Hr.CreatePosition',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}


