/**
 * HR Repository Ports — interfaces implemented by Prisma repos.
 */
import type { EmployeeAggregate } from '../aggregates/employee.aggregate';
import type { LeaveAggregate } from '../aggregates/leave.aggregate';
import type { PayrollAggregate } from '../aggregates/payroll.aggregate';
import type { PerformanceReviewAggregate } from '../aggregates/performance-review.aggregate';

export interface EmployeeRepository {
  save(agg: EmployeeAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<EmployeeAggregate | null>;
  findByCode(tenantId: string, employeeCode: string): Promise<EmployeeAggregate | null>;
  findByUserId(userId: string, tenantId: string): Promise<EmployeeAggregate | null>;
  findActive(tenantId: string, branchId?: string): Promise<EmployeeAggregate[]>;
  findOnboarding(tenantId: string): Promise<EmployeeAggregate[]>;
}

export interface LeaveRepository {
  save(agg: LeaveAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<LeaveAggregate | null>;
  findByEmployee(employeeId: string, tenantId: string): Promise<LeaveAggregate[]>;
  findPending(tenantId: string): Promise<LeaveAggregate[]>;
  findOverlapping(
    tenantId: string, employeeId: string, fromDate: string, toDate: string,
  ): Promise<LeaveAggregate[]>;
}

export interface PayrollRepository {
  save(agg: PayrollAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<PayrollAggregate | null>;
  findByRunCode(tenantId: string, runCode: string): Promise<PayrollAggregate | null>;
  findByPeriod(tenantId: string, month: number, year: number): Promise<PayrollAggregate | null>;
}

export interface PerformanceReviewRepository {
  save(agg: PerformanceReviewAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<PerformanceReviewAggregate | null>;
  findByEmployee(employeeId: string, tenantId: string): Promise<PerformanceReviewAggregate[]>;
  findByCycle(
    tenantId: string, cycle: string, cycleYear: number,
  ): Promise<PerformanceReviewAggregate[]>;
}
