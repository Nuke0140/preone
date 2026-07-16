/**
 * HR Queries — CQRS read side (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetEmployeeQuery implements Query<{
  employeeId: string;
  tenantId: string;
}> {
  readonly type = 'Hr.GetEmployee';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListEmployeesQuery implements Query<{
  tenantId: string;
  branchId?: string;
  status?: string;
  role?: string;
  limit?: number;
  offset?: number;
}> {
  readonly type = 'Hr.ListEmployees';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListPendingLeavesQuery implements Query<{
  tenantId: string;
  branchId?: string;
  approverId?: string;
}> {
  readonly type = 'Hr.ListPendingLeaves';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetEmployeeLeaveBalanceQuery implements Query<{
  employeeId: string;
  tenantId: string;
  year: number;
}> {
  readonly type = 'Hr.GetLeaveBalance';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListEmployeeLeavesQuery implements Query<{
  employeeId: string;
  tenantId: string;
  status?: string;
  year?: number;
}> {
  readonly type = 'Hr.ListEmployeeLeaves';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetPayrollQuery implements Query<{
  payrollRunId: string;
  tenantId: string;
}> {
  readonly type = 'Hr.GetPayroll';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListPayrollsQuery implements Query<{
  tenantId: string;
  branchId?: string;
  payPeriodYear?: number;
  status?: string;
}> {
  readonly type = 'Hr.ListPayrolls';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class ListReviewsQuery implements Query<{
  tenantId: string;
  employeeId?: string;
  cycle?: string;
  cycleYear?: number;
}> {
  readonly type = 'Hr.ListReviews';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
