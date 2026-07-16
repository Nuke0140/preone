/**
 * HR Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/hr):
 *   POST   /employees                  — create employee (prospective)
 *   POST   /employees/:id/onboard      — initiate onboarding + BGV
 *   POST   /employees/:id/clear-bgv    — mark BGV cleared
 *   POST   /employees/:id/activate     — activate employee (post-BGV)
 *   POST   /employees/:id/promote      — promote to new role/designation
 *   POST   /employees/:id/suspend      — suspend employee
 *   POST   /employees/:id/resign       — record resignation
 *   POST   /employees/:id/exit         — complete exit process
 *   GET    /employees                  — list (status, role filters)
 *   GET    /employees/:id              — get single
 *
 *   POST   /leaves                     — apply leave
 *   POST   /leaves/:id/approve         — approve leave
 *   POST   /leaves/:id/reject          — reject leave
 *   POST   /leaves/:id/cancel          — cancel leave
 *   GET    /leaves/pending             — list pending approvals
 *   GET    /employees/:id/leaves       — list employee's leaves
 *   GET    /employees/:id/leave-balance— get leave balance for year
 *
 *   POST   /payrolls                   — generate payroll run
 *   POST   /payrolls/:id/approve       — approve payroll
 *   POST   /payrolls/:id/pay           — mark payroll as paid (with UTRs)
 *   GET    /payrolls                   — list payroll runs
 *   GET    /payrolls/:id               — get single (with payslips)
 *
 *   POST   /reviews/:id/start          — start review cycle
 *   POST   /reviews/:id/complete       — complete HR review
 *   GET    /reviews                    — list reviews (filter by employee, cycle)
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

// ─── Employees ─────────────────────────────────────────────────

@Controller('v1/hr/employees')
export class EmployeesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Hr.CreateEmployee',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/onboard')
  async onboard(@Param('id') id: string, @Body() body: { tenantId: string; bgvVendor?: string }) {
    return this.bus.execute({
      type: 'Hr.OnboardEmployee',
      payload: { employeeId: id, tenantId: body.tenantId, bgvVendor: body.bgvVendor },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/clear-bgv')
  async clearBgv(@Param('id') id: string, @Body() body: { tenantId: string; reportUrl?: string }) {
    return this.bus.execute({
      type: 'Hr.ClearBgv',
      payload: { employeeId: id, tenantId: body.tenantId, reportUrl: body.reportUrl },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Hr.ActivateEmployee',
      payload: { employeeId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/promote')
  async promote(
    @Param('id') id: string,
    @Body() body: { tenantId: string; newRole: string; newDesignation: string; newSalaryCents: number },
  ) {
    return this.bus.execute({
      type: 'Hr.PromoteEmployee',
      payload: { employeeId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string, @Body() body: { tenantId: string; reason: string }) {
    return this.bus.execute({
      type: 'Hr.SuspendEmployee',
      payload: { employeeId: id, tenantId: body.tenantId, reason: body.reason },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/resign')
  async resign(
    @Param('id') id: string,
    @Body() body: { tenantId: string; resignationDate: string; lastWorkingDate: string; reason: string },
  ) {
    return this.bus.execute({
      type: 'Hr.ResignEmployee',
      payload: { employeeId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/exit')
  async exit(
    @Param('id') id: string,
    @Body() body: { tenantId: string; handoverCompleted: boolean; exitInterviewConducted: boolean },
  ) {
    return this.bus.execute({
      type: 'Hr.CompleteExit',
      payload: { employeeId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListEmployees',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        status: q.status,
        role: q.role,
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Hr.GetEmployee',
      payload: { employeeId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }

  @Get(':id/leaves')
  async listLeaves(
    @Param('id') id: string,
    @Query() q: any,
  ) {
    return this.qbus.execute({
      type: 'Hr.ListEmployeeLeaves',
      payload: {
        employeeId: id,
        tenantId: q.tenantId,
        status: q.status,
        year: q.year ? Number(q.year) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id/leave-balance')
  async leaveBalance(
    @Param('id') id: string,
    @Query() q: any,
  ) {
    return this.qbus.execute({
      type: 'Hr.GetLeaveBalance',
      payload: { employeeId: id, tenantId: q.tenantId, year: Number(q.year ?? new Date().getFullYear()) },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}

// ─── Leaves ───────────────────────────────────────────────────

@Controller('v1/hr/leaves')
export class LeavesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async apply(@Body() body: any) {
    return this.bus.execute({
      type: 'Hr.ApplyLeave',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { tenantId: string; approverId: string; substituteEmployeeId?: string; notes?: string },
  ) {
    return this.bus.execute({
      type: 'Hr.ApproveLeave',
      payload: { leaveId: id, ...body },
      metadata: { actorId: body.approverId, tenantId: body.tenantId },
    });
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { tenantId: string; approverId: string; reason: string },
  ) {
    return this.bus.execute({
      type: 'Hr.RejectLeave',
      payload: { leaveId: id, ...body },
      metadata: { actorId: body.approverId, tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { tenantId: string; reason: string }) {
    return this.bus.execute({
      type: 'Hr.CancelLeave',
      payload: { leaveId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get('pending')
  async pending(@Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListPendingLeaves',
      payload: { tenantId: q.tenantId, branchId: q.branchId, approverId: q.approverId },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}

// ─── Payrolls ─────────────────────────────────────────────────

@Controller('v1/hr/payrolls')
export class PayrollsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async generate(@Body() body: any) {
    return this.bus.execute({
      type: 'Hr.GeneratePayroll',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Body() body: { tenantId: string; approverId: string }) {
    return this.bus.execute({
      type: 'Hr.ApprovePayroll',
      payload: { payrollRunId: id, ...body },
      metadata: { actorId: body.approverId, tenantId: body.tenantId },
    });
  }

  @Post(':id/pay')
  async pay(
    @Param('id') id: string,
    @Body() body: { tenantId: string; paymentDate: string; utrByEmployee: Record<string, string> },
  ) {
    return this.bus.execute({
      type: 'Hr.MarkPayrollPaid',
      payload: { payrollRunId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListPayrolls',
      payload: {
        tenantId: q.tenantId,
        branchId: q.branchId,
        payPeriodYear: q.payPeriodYear ? Number(q.payPeriodYear) : undefined,
        status: q.status,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Hr.GetPayroll',
      payload: { payrollRunId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Performance Reviews ──────────────────────────────────────

@Controller('v1/hr/reviews')
export class PerformanceReviewsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post(':id/start')
  async start(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Hr.StartReview',
      payload: { reviewId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { tenantId: string; overallRating: number; goalFinalRatings: Record<string, number> },
  ) {
    return this.bus.execute({
      type: 'Hr.CompleteReview',
      payload: { reviewId: id, ...body },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Hr.ListReviews',
      payload: {
        tenantId: q.tenantId,
        employeeId: q.employeeId,
        cycle: q.cycle,
        cycleYear: q.cycleYear ? Number(q.cycleYear) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
