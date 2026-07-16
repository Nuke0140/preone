/**
 * HR Query Handlers — CQRS read side (BTD §12.3).
 *
 * Reads bypass aggregates and hit Prisma read models directly.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import {
  GetEmployeeQuery, GetEmployeeLeaveBalanceQuery, GetPayrollQuery,
  ListEmployeesQuery, ListEmployeeLeavesQuery, ListPayrollsQuery,
  ListPendingLeavesQuery, ListReviewsQuery,
} from '../queries/hr.queries';

@Injectable()
export class GetEmployeeQueryHandler implements QueryHandler<GetEmployeeQuery> {
  private static readonly TYPE = 'Hr.GetEmployee';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetEmployeeQueryHandler.TYPE, this);
  }
  async handle(q: GetEmployeeQuery) {
    return this.prisma.employee.findFirst({
      where: { id: q.payload.employeeId, schoolId: q.payload.tenantId },
      include: {
        qualifications: true,
        documents: true,
        leaves: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }
}

@Injectable()
export class ListEmployeesQueryHandler implements QueryHandler<ListEmployeesQuery> {
  private static readonly TYPE = 'Hr.ListEmployees';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListEmployeesQueryHandler.TYPE, this);
  }
  async handle(q: ListEmployeesQuery) {
    return this.prisma.employee.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.branchId ? { branchId: q.payload.branchId } : {}),
        ...(q.payload.status ? { status: q.payload.status } : {}),
        ...(q.payload.role ? { role: q.payload.role } : {}),
      },
      take: q.payload.limit ?? 50,
      skip: q.payload.offset ?? 0,
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class ListPendingLeavesQueryHandler implements QueryHandler<ListPendingLeavesQuery> {
  private static readonly TYPE = 'Hr.ListPendingLeaves';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListPendingLeavesQueryHandler.TYPE, this);
  }
  async handle(q: ListPendingLeavesQuery) {
    return this.prisma.leaveRequest.findMany({
      where: {
        schoolId: q.payload.tenantId,
        status: 'PENDING',
        ...(q.payload.branchId ? { branchId: q.payload.branchId } : {}),
      },
      include: { employee: true },
      orderBy: { appliedAt: 'asc' },
    });
  }
}

@Injectable()
export class ListEmployeeLeavesQueryHandler implements QueryHandler<ListEmployeeLeavesQuery> {
  private static readonly TYPE = 'Hr.ListEmployeeLeaves';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListEmployeeLeavesQueryHandler.TYPE, this);
  }
  async handle(q: ListEmployeeLeavesQuery) {
    const where: any = {
      schoolId: q.payload.tenantId,
      employeeId: q.payload.employeeId,
    };
    if (q.payload.status) where.status = q.payload.status;
    if (q.payload.year) {
      where.fromDate = { gte: new Date(`${q.payload.year}-01-01`) };
      where.toDate = { lte: new Date(`${q.payload.year}-12-31T23:59:59Z`) };
    }
    return this.prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class GetEmployeeLeaveBalanceQueryHandler
implements QueryHandler<GetEmployeeLeaveBalanceQuery> {
  private static readonly TYPE = 'Hr.GetLeaveBalance';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetEmployeeLeaveBalanceQueryHandler.TYPE, this);
  }
  async handle(q: GetEmployeeLeaveBalanceQuery) {
    const yearStart = new Date(`${q.payload.year}-01-01`);
    const yearEnd = new Date(`${q.payload.year}-12-31T23:59:59Z`);
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        schoolId: q.payload.tenantId,
        employeeId: q.payload.employeeId,
        status: { in: ['TAKEN', 'APPROVED'] },
        fromDate: { gte: yearStart },
        toDate: { lte: yearEnd },
      },
    });
    const entitlements = { CASUAL: 12, SICK: 8, EARNED: 18 };
    const used: Record<string, number> = { CASUAL: 0, SICK: 0, EARNED: 0 };
    for (const l of leaves) {
      if (used[l.leaveType] !== undefined) used[l.leaveType] += Number(l.totalDays);
    }
    const remaining: Record<string, number> = {};
    for (const k of Object.keys(entitlements)) {
      const ent: number = (entitlements as Record<string, number>)[k] ?? 0;
      remaining[k] = Math.max(0, ent - (used[k] ?? 0));
    }
    return { entitlements, used, remaining };
  }
}

@Injectable()
export class GetPayrollQueryHandler implements QueryHandler<GetPayrollQuery> {
  private static readonly TYPE = 'Hr.GetPayroll';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetPayrollQueryHandler.TYPE, this);
  }
  async handle(q: GetPayrollQuery) {
    return this.prisma.payrollRun.findFirst({
      where: { id: q.payload.payrollRunId, schoolId: q.payload.tenantId },
      include: { payslips: true },
    });
  }
}

@Injectable()
export class ListPayrollsQueryHandler implements QueryHandler<ListPayrollsQuery> {
  private static readonly TYPE = 'Hr.ListPayrolls';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListPayrollsQueryHandler.TYPE, this);
  }
  async handle(q: ListPayrollsQuery) {
    return this.prisma.payrollRun.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.branchId ? { branchId: q.payload.branchId } : {}),
        ...(q.payload.payPeriodYear ? { payPeriodYear: q.payload.payPeriodYear } : {}),
        ...(q.payload.status ? { status: q.payload.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class ListReviewsQueryHandler implements QueryHandler<ListReviewsQuery> {
  private static readonly TYPE = 'Hr.ListReviews';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListReviewsQueryHandler.TYPE, this);
  }
  async handle(q: ListReviewsQuery) {
    return this.prisma.performanceReview.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.employeeId ? { employeeId: q.payload.employeeId } : {}),
        ...(q.payload.cycle ? { cycle: q.payload.cycle } : {}),
        ...(q.payload.cycleYear ? { cycleYear: q.payload.cycleYear } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
