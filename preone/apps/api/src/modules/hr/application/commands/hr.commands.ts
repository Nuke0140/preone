/**
 * HR Commands — CQRS write side (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Employee ──────────────────────────────────────────────

export class OnboardEmployeeCommand implements Command<{
  tenantId: string;
  branchId?: string;
  employeeId: string;
  bgvVendor?: string;
}, { id: string }> {
  readonly type = 'Hr.OnboardEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ClearBgvCommand implements Command<{
  employeeId: string;
  tenantId: string;
  reportUrl?: string;
}, { id: string }> {
  readonly type = 'Hr.ClearBgv';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ActivateEmployeeCommand implements Command<{
  employeeId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Hr.ActivateEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class PromoteEmployeeCommand implements Command<{
  employeeId: string;
  tenantId: string;
  newRole: string;
  newDesignation: string;
  newSalaryCents: number;
}, { id: string }> {
  readonly type = 'Hr.PromoteEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class SuspendEmployeeCommand implements Command<{
  employeeId: string;
  tenantId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Hr.SuspendEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ResignEmployeeCommand implements Command<{
  employeeId: string;
  tenantId: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Hr.ResignEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteExitCommand implements Command<{
  employeeId: string;
  tenantId: string;
  handoverCompleted: boolean;
  exitInterviewConducted: boolean;
}, { id: string }> {
  readonly type = 'Hr.CompleteExit';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CreateEmployeeCommand implements Command<{
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
}, { id: string }> {
  readonly type = 'Hr.CreateEmployee';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Leave ──────────────────────────────────────────────────

export class ApplyLeaveCommand implements Command<{
  tenantId: string;
  branchId?: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  dayType: string;
  reason: string;
  attachmentUrl?: string;
}, { id: string }> {
  readonly type = 'Hr.ApplyLeave';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ApproveLeaveCommand implements Command<{
  leaveId: string;
  tenantId: string;
  approverId: string;
  substituteEmployeeId?: string;
  notes?: string;
}, { id: string }> {
  readonly type = 'Hr.ApproveLeave';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class RejectLeaveCommand implements Command<{
  leaveId: string;
  tenantId: string;
  approverId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Hr.RejectLeave';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelLeaveCommand implements Command<{
  leaveId: string;
  tenantId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Hr.CancelLeave';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Payroll ────────────────────────────────────────────────

export class GeneratePayrollCommand implements Command<{
  tenantId: string;
  branchId?: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  cutoffDate: string;
  employeeIds?: string[];
}, { id: string; payrollRunCode: string }> {
  readonly type = 'Hr.GeneratePayroll';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ApprovePayrollCommand implements Command<{
  payrollRunId: string;
  tenantId: string;
  approverId: string;
}, { id: string }> {
  readonly type = 'Hr.ApprovePayroll';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class MarkPayrollPaidCommand implements Command<{
  payrollRunId: string;
  tenantId: string;
  paymentDate: string;
  utrByEmployee: Record<string, string>;
}, { id: string }> {
  readonly type = 'Hr.MarkPayrollPaid';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Performance Review ─────────────────────────────────────

export class StartReviewCommand implements Command<{
  reviewId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Hr.StartReview';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteReviewCommand implements Command<{
  reviewId: string;
  tenantId: string;
  overallRating: number;
  goalFinalRatings: Record<string, number>;
}, { id: string }> {
  readonly type = 'Hr.CompleteReview';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
