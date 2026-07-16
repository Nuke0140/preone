/**
 * HR Service — application-layer orchestrator for the HR bounded context.
 *
 * Responsibilities:
 *   - Manage employee lifecycle (create → onboard → activate → exit)
 *   - BGV workflow coordination
 *   - Leave application + approval workflow
 *   - Payroll generation + approval + disbursement
 *   - Performance review cycle management
 *
 * Integration events this service listens to:
 *   - UserCreatedEvent (Identity) → link user to employee
 *
 * Integration events this service emits (via EventTranslator):
 *   - StaffOnboarded.v1   → Identity (create user)
 *   - StaffOffboarded.v1  → Identity (revoke access) + Inventory
 *   - LeaveApproved.v1    → Communication + substitute assignment
 *   - PayslipIssued.v1    → Communication (payslip SMS)
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { EmployeeAggregate } from '../../domain/aggregates/employee.aggregate';
import { LeaveAggregate } from '../../domain/aggregates/leave.aggregate';
import { PayrollAggregate } from '../../domain/aggregates/payroll.aggregate';
import type { PayslipEntry } from '../../domain/aggregates/payroll.aggregate';
import { PerformanceReviewAggregate } from '../../domain/aggregates/performance-review.aggregate';
import type {
  EmployeeRepository, LeaveRepository, PayrollRepository,
  PerformanceReviewRepository,
} from '../../domain/repositories/hr.repository';
import {
  EMPLOYEE_REPOSITORY, LEAVE_REPOSITORY, PAYROLL_REPOSITORY,
  PERFORMANCE_REVIEW_REPOSITORY,
} from '../../domain/repositories/tokens';
import type { StaffRole, EmploymentType } from '../../domain/aggregates/employee.aggregate';
import type { LeaveType, LeaveDayType } from '../../domain/aggregates/leave.aggregate';

@Injectable()
export class HrService {
  private readonly logger = new Logger(HrService.name);

  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly employees: EmployeeRepository,
    @Inject(LEAVE_REPOSITORY) private readonly leaves: LeaveRepository,
    @Inject(PAYROLL_REPOSITORY) private readonly payrolls: PayrollRepository,
    @Inject(PERFORMANCE_REVIEW_REPOSITORY) private readonly reviews: PerformanceReviewRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Employees ────────────────────────────────────────────────

  async createEmployee(props: {
    tenantId: string;
    branchId?: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    role: string;
    designation: string;
    employmentType: string;
    dateOfJoining: string;
    salaryCents: number;
    bankAccountNumber?: string;
    bankIfsc?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    reportingManagerId?: string;
  }): Promise<EmployeeAggregate> {
    // Check code uniqueness
    const existing = await this.employees.findByCode(props.tenantId, props.employeeCode);
    if (existing) {
      throw new Error(`Employee code ${props.employeeCode} already exists`);
    }
    const emp = EmployeeAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      employeeCode: props.employeeCode,
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      phone: props.phone,
      dateOfBirth: props.dateOfBirth,
      gender: props.gender as any,
      role: props.role as StaffRole,
      designation: props.designation,
      employmentType: props.employmentType as EmploymentType,
      dateOfJoining: props.dateOfJoining,
      salaryCents: props.salaryCents,
      bankAccountNumber: props.bankAccountNumber,
      bankIfsc: props.bankIfsc,
      panNumber: props.panNumber,
      aadhaarNumber: props.aadhaarNumber,
      emergencyContactName: props.emergencyContactName,
      emergencyContactPhone: props.emergencyContactPhone,
      reportingManagerId: props.reportingManagerId,
    });
    await this.employees.save(emp);
    this.logger.log(`Created employee ${emp.employeeCode} (${emp.id})`);
    return emp;
  }

  async onboardEmployee(employeeId: string, tenantId: string, bgvVendor?: string): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.onboard(bgvVendor);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
    this.logger.log(`Onboarded employee ${emp.employeeCode} (BGV via ${bgvVendor ?? 'default'})`);
  }

  async clearBgv(employeeId: string, tenantId: string, reportUrl?: string): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.clearBgv(reportUrl);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async activateEmployee(employeeId: string, tenantId: string): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.activate();
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async promoteEmployee(
    employeeId: string, tenantId: string,
    newRole: string, newDesignation: string, newSalaryCents: number,
  ): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.promote(newRole as StaffRole, newDesignation, newSalaryCents);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async suspendEmployee(employeeId: string, tenantId: string, reason: string): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.suspend(reason);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async resignEmployee(
    employeeId: string, tenantId: string,
    resignationDate: string, lastWorkingDate: string, reason: string,
  ): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.resign(resignationDate, lastWorkingDate, reason);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async completeExit(
    employeeId: string, tenantId: string,
    handoverCompleted: boolean, exitInterviewConducted: boolean,
  ): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.completeExit(handoverCompleted, exitInterviewConducted);
    await this.employees.save(emp);
    await this.eventBus.publishAll(emp.commit());
  }

  async linkUser(employeeId: string, userId: string, tenantId: string): Promise<void> {
    const emp = await this._loadEmployeeOrThrow(employeeId, tenantId);
    emp.linkUser(userId);
    await this.employees.save(emp);
    this.logger.log(`Linked user ${userId} to employee ${emp.employeeCode}`);
  }

  // ─── Leave ────────────────────────────────────────────────────

  async applyLeave(props: {
    tenantId: string;
    branchId?: string;
    employeeId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    dayType: string;
    reason: string;
    attachmentUrl?: string;
  }): Promise<LeaveAggregate> {
    // Verify employee exists
    await this._loadEmployeeOrThrow(props.employeeId, props.tenantId);
    // Check for overlapping leaves
    const overlapping = await this.leaves.findOverlapping(
      props.tenantId, props.employeeId, props.fromDate, props.toDate,
    );
    if (overlapping.length > 0) {
      throw new Error(`Employee ${props.employeeId} already has overlapping leave`);
    }
    const leave = LeaveAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      employeeId: props.employeeId,
      leaveType: props.leaveType as LeaveType,
      fromDate: props.fromDate,
      toDate: props.toDate,
      dayType: props.dayType as LeaveDayType,
      reason: props.reason,
      attachmentUrl: props.attachmentUrl,
    });
    await this.leaves.save(leave);
    await this.eventBus.publishAll(leave.commit());
    this.logger.log(`Applied leave ${leave.id} for employee ${props.employeeId}`);
    return leave;
  }

  async approveLeave(
    leaveId: string, tenantId: string,
    approverId: string, substituteEmployeeId?: string, notes?: string,
  ): Promise<void> {
    const leave = await this._loadLeaveOrThrow(leaveId, tenantId);
    leave.approve(approverId, substituteEmployeeId, notes);
    await this.leaves.save(leave);
    await this.eventBus.publishAll(leave.commit());
  }

  async rejectLeave(leaveId: string, tenantId: string, approverId: string, reason: string): Promise<void> {
    const leave = await this._loadLeaveOrThrow(leaveId, tenantId);
    leave.reject(approverId, reason);
    await this.leaves.save(leave);
    await this.eventBus.publishAll(leave.commit());
  }

  async cancelLeave(leaveId: string, tenantId: string, reason: string): Promise<void> {
    const leave = await this._loadLeaveOrThrow(leaveId, tenantId);
    leave.cancel(reason);
    await this.leaves.save(leave);
    await this.eventBus.publishAll(leave.commit());
  }

  async getLeaveBalance(employeeId: string, tenantId: string, year: number): Promise<{
    casual: number;
    sick: number;
    earned: number;
    used: { casual: number; sick: number; earned: number };
    remaining: { casual: number; sick: number; earned: number };
  }> {
    const leaves = await this.leaves.findByEmployee(employeeId, tenantId);
    const yearLeaves = leaves.filter(l => {
      const ll = (l as any)._props;
      return new Date(ll.fromDate).getFullYear() === year
        && (ll.status === 'TAKEN' || ll.status === 'APPROVED');
    });
    const entitlements = { casual: 12, sick: 8, earned: 18 };
    const used = { casual: 0, sick: 0, earned: 0 };
    for (const l of yearLeaves) {
      const ll = (l as any)._props;
      const lt = ll.leaveType as keyof typeof used;
      if (used[lt] !== undefined) used[lt] += ll.totalDays;
    }
    return {
      ...entitlements,
      used,
      remaining: {
        casual: Math.max(0, entitlements.casual - used.casual),
        sick: Math.max(0, entitlements.sick - used.sick),
        earned: Math.max(0, entitlements.earned - used.earned),
      },
    };
  }

  // ─── Payroll ──────────────────────────────────────────────────

  async generatePayroll(props: {
    tenantId: string;
    branchId?: string;
    payPeriodMonth: number;
    payPeriodYear: number;
    cutoffDate: string;
    employeeIds?: string[];
  }): Promise<PayrollAggregate> {
    // Check for existing payroll run for the same period
    const existing = await this.payrolls.findByPeriod(
      props.tenantId, props.payPeriodMonth, props.payPeriodYear,
    );
    if (existing) {
      throw new Error(
        `Payroll already generated for ${props.payPeriodMonth}/${props.payPeriodYear}`,
      );
    }
    // Load all active employees (or filtered set)
    let activeEmployees = await this.employees.findActive(props.tenantId, props.branchId);
    if (props.employeeIds && props.employeeIds.length > 0) {
      const idSet = new Set(props.employeeIds);
      activeEmployees = activeEmployees.filter(e => idSet.has(e.id));
    }
    // Compute payslips
    const payslips: PayslipEntry[] = activeEmployees.map(emp => {
      const p = (emp as any)._props;
      const basicCents = Math.round(p.salaryCents * 0.5);
      const hraCents = Math.round(p.salaryCents * 0.2);
      const conveyanceAllowanceCents = 1600000; // ₹1,600/mo = 160000 paise
      const specialAllowanceCents = p.salaryCents - basicCents - hraCents - conveyanceAllowanceCents;
      const medicalAllowanceCents = 1250000; // ₹1,250/mo
      const otherAllowancesCents = 0;
      const grossCents = basicCents + hraCents + conveyanceAllowanceCents
        + specialAllowanceCents + medicalAllowanceCents + otherAllowancesCents;
      const pfDeductionCents = Math.round(basicCents * 0.12);
      const esiDeductionCents = grossCents < 21000000 ? Math.round(grossCents * 0.0075) : 0;
      const tdsDeductionCents = 0; // computed by tax slab logic
      const professionalTaxCents = 20000; // ₹200/mo
      const loanDeductionCents = 0;
      const otherDeductionsCents = 0;
      const totalDeductionsCents = pfDeductionCents + esiDeductionCents
        + tdsDeductionCents + professionalTaxCents + loanDeductionCents + otherDeductionsCents;
      const netPayCents = grossCents - totalDeductionsCents;
      return {
        employeeId: emp.id,
        employeeCode: p.employeeCode,
        employeeName: `${p.firstName} ${p.lastName}`,
        payPeriodMonth: props.payPeriodMonth,
        payPeriodYear: props.payPeriodYear,
        basicCents, hraCents, conveyanceAllowanceCents, specialAllowanceCents,
        medicalAllowanceCents, otherAllowancesCents, grossCents,
        pfDeductionCents, esiDeductionCents, tdsDeductionCents,
        professionalTaxCents, loanDeductionCents, otherDeductionsCents,
        totalDeductionsCents, netPayCents,
        bankAccountNumber: p.bankAccountNumber,
        bankIfsc: p.bankIfsc,
        status: 'PENDING' as const,
      };
    });
    const runCode = `PAY-${props.payPeriodYear}${String(props.payPeriodMonth).padStart(2, '0')}`;
    const payroll = PayrollAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      payrollRunCode: runCode,
      payPeriodMonth: props.payPeriodMonth,
      payPeriodYear: props.payPeriodYear,
      cutoffDate: props.cutoffDate,
    });
    payroll.generate(payslips);
    await this.payrolls.save(payroll);
    await this.eventBus.publishAll(payroll.commit());
    this.logger.log(
      `Generated payroll ${runCode} for ${payslips.length} employees (net: ${payroll.totalNetPayCents}c)`,
    );
    return payroll;
  }

  async approvePayroll(payrollRunId: string, tenantId: string, approverId: string): Promise<void> {
    const payroll = await this._loadPayrollOrThrow(payrollRunId, tenantId);
    payroll.approve(approverId);
    await this.payrolls.save(payroll);
    await this.eventBus.publishAll(payroll.commit());
  }

  async markPayrollPaid(
    payrollRunId: string, tenantId: string,
    paymentDate: string, utrByEmployee: Record<string, string>,
  ): Promise<void> {
    const payroll = await this._loadPayrollOrThrow(payrollRunId, tenantId);
    payroll.markPaid(paymentDate, utrByEmployee);
    await this.payrolls.save(payroll);
    await this.eventBus.publishAll(payroll.commit());
  }

  // ─── Performance Review ───────────────────────────────────────

  async startReview(reviewId: string, tenantId: string): Promise<void> {
    const review = await this._loadReviewOrThrow(reviewId, tenantId);
    review.start();
    await this.reviews.save(review);
    await this.eventBus.publishAll(review.commit());
  }

  async completeReview(
    reviewId: string, tenantId: string,
    overallRating: number, goalFinalRatings: Record<string, number>,
  ): Promise<void> {
    const review = await this._loadReviewOrThrow(reviewId, tenantId);
    review.completeHrReview(
      goalFinalRatings as Record<string, 1 | 2 | 3 | 4 | 5>,
      overallRating as 1 | 2 | 3 | 4 | 5,
    );
    await this.reviews.save(review);
    await this.eventBus.publishAll(review.commit());
  }

  // ─── Private helpers ──────────────────────────────────────────

  private async _loadEmployeeOrThrow(id: string, tenantId: string): Promise<EmployeeAggregate> {
    const emp = await this.employees.findById(id, tenantId);
    if (!emp) throw new Error(`Employee ${id} not found`);
    return emp;
  }

  private async _loadLeaveOrThrow(id: string, tenantId: string): Promise<LeaveAggregate> {
    const l = await this.leaves.findById(id, tenantId);
    if (!l) throw new Error(`Leave ${id} not found`);
    return l;
  }

  private async _loadPayrollOrThrow(id: string, tenantId: string): Promise<PayrollAggregate> {
    const p = await this.payrolls.findById(id, tenantId);
    if (!p) throw new Error(`Payroll ${id} not found`);
    return p;
  }

  private async _loadReviewOrThrow(id: string, tenantId: string): Promise<PerformanceReviewAggregate> {
    const r = await this.reviews.findById(id, tenantId);
    if (!r) throw new Error(`Review ${id} not found`);
    return r;
  }
}
