/**
 * HR Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Employee, Leave, Payroll, PerformanceReview aggregates.
 *
 * Integration events (BTD §14.1):
 *   - StaffOnboarded.v1   → Identity (create user account, sync HTTP)
 *   - StaffOffboarded.v1  → Identity (revoke access) + Inventory (asset recovery)
 *   - LeaveApproved.v1    → Substitutes (auto-assign) + Communication (notify)
 *   - PayrollPaid.v1      → Finance (ledger entry) + Communication (payslip SMS)
 *
 * Per BRC §6 (HR Rules) + §9 (Compliance, POSH) + §10 (Approval Matrix).
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Employee
// ─────────────────────────────────────────────

export class EmployeeOnboardedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  branchId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  designation: string;
  dateOfJoining: string;
}> {}

export class EmployeeOffboardedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  exitDate: string;
  reason: string;
}> {}

export class EmployeePromotedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  oldRole: string;
  newRole: string;
  newDesignation: string;
  oldSalaryCents: number;
  newSalaryCents: number;
}> {}

export class EmployeeSuspendedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  reason: string;
}> {}

export class EmployeeReactivatedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
}> {}

export class EmployeeResignedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  resignationDate: string;
  lastWorkingDate: string;
  reason: string;
}> {}

export class BgvClearedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  bgvVendor?: string;
}> {}

export class BgvFailedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  reason: string;
}> {}

export class ProbationCompletedEvent extends DomainEvent<{
  employeeId: string;
  tenantId: string;
  completedAt: string;
}> {}

// ─────────────────────────────────────────────
// Leave
// ─────────────────────────────────────────────

export class LeaveAppliedEvent extends DomainEvent<{
  leaveId: string;
  tenantId: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason: string;
}> {}

export class LeaveApprovedEvent extends DomainEvent<{
  leaveId: string;
  tenantId: string;
  employeeId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  approverId: string;
  substituteEmployeeId?: string;
}> {}

export class LeaveRejectedEvent extends DomainEvent<{
  leaveId: string;
  tenantId: string;
  employeeId: string;
  reason: string;
}> {}

export class LeaveCancelledEvent extends DomainEvent<{
  leaveId: string;
  tenantId: string;
  employeeId: string;
  reason: string;
}> {}

export class LeaveTakenEvent extends DomainEvent<{
  leaveId: string;
  tenantId: string;
  employeeId: string;
  totalDays: number;
  leaveType: string;
}> {}

// ─────────────────────────────────────────────
// Payroll
// ─────────────────────────────────────────────

export class PayrollGeneratedEvent extends DomainEvent<{
  payrollRunId: string;
  tenantId: string;
  payrollRunCode: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  employeeCount: number;
  totalNetPayCents: number;
}> {}

export class PayrollApprovedEvent extends DomainEvent<{
  payrollRunId: string;
  tenantId: string;
  approverId: string;
  totalNetPayCents: number;
}> {}

export class PayslipIssuedEvent extends DomainEvent<{
  payrollRunId: string;
  tenantId: string;
  employeeId: string;
  netPayCents: number;
  payPeriodMonth: number;
  payPeriodYear: number;
  utrNumber?: string;
}> {}

export class PayrollHoldReleasedEvent extends DomainEvent<{
  payrollRunId: string;
  tenantId: string;
}> {}

// ─────────────────────────────────────────────
// Performance Review
// ─────────────────────────────────────────────

export class PerformanceReviewStartedEvent extends DomainEvent<{
  reviewId: string;
  tenantId: string;
  employeeId: string;
  cycle: string;
  cycleYear: number;
}> {}

export class PerformanceReviewSelfSubmittedEvent extends DomainEvent<{
  reviewId: string;
  tenantId: string;
  employeeId: string;
}> {}

export class PerformanceReviewManagerSubmittedEvent extends DomainEvent<{
  reviewId: string;
  tenantId: string;
  employeeId: string;
  reviewerId: string;
}> {}

export class PerformanceReviewCompletedEvent extends DomainEvent<{
  reviewId: string;
  tenantId: string;
  employeeId: string;
  overallRating: number;
  promotionRecommended: boolean;
}> {}

export class PerformanceReviewArchivedEvent extends DomainEvent<{
  reviewId: string;
  tenantId: string;
  employeeId: string;
}> {}
