/**
 * Finance Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import type {
  GetFeePlanQuery, GetInvoiceQuery, GetPaymentQuery, GetRefundQuery,
  GetStudentFeePlanQuery, ListFeePlansQuery, ListInvoicesQuery,
  ListPaymentsQuery, ListRefundsQuery,
} from '../queries/finance.queries';

@Injectable()
export class GetFeePlanQueryHandler implements QueryHandler<GetFeePlanQuery> {
  private static readonly TYPE = 'Finance.GetFeePlan';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetFeePlanQueryHandler.TYPE, this);
  }
  async handle(q: GetFeePlanQuery) {
    return this.prisma.feePlan.findFirst({
      where: { id: q.payload.feePlanId, schoolId: q.payload.tenantId },
      include: { installments: true, concessions: true },
    });
  }
}

@Injectable()
export class ListFeePlansQueryHandler implements QueryHandler<ListFeePlansQuery> {
  private static readonly TYPE = 'Finance.ListFeePlans';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListFeePlansQueryHandler.TYPE, this);
  }
  async handle(q: ListFeePlansQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    return this.prisma.feePlan.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.academicSessionId && { academicSessionId: q.payload.academicSessionId }),
        ...(q.payload.status && { status: q.payload.status as any }),
        ...(q.payload.programType && { programType: q.payload.programType as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { installments: true },
    });
  }
}

@Injectable()
export class GetInvoiceQueryHandler implements QueryHandler<GetInvoiceQuery> {
  private static readonly TYPE = 'Finance.GetInvoice';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetInvoiceQueryHandler.TYPE, this);
  }
  async handle(q: GetInvoiceQuery) {
    return this.prisma.invoice.findFirst({
      where: { id: q.payload.invoiceId, schoolId: q.payload.tenantId },
      include: { lineItems: true, adjustments: true, paymentAllocations: { include: { payment: true } } },
    });
  }
}

@Injectable()
export class ListInvoicesQueryHandler implements QueryHandler<ListInvoicesQuery> {
  private static readonly TYPE = 'Finance.ListInvoices';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListInvoicesQueryHandler.TYPE, this);
  }
  async handle(q: ListInvoicesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const now = new Date();
    return this.prisma.invoice.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.studentId && { studentId: q.payload.studentId }),
        ...(q.payload.status && { status: q.payload.status as any }),
        ...(q.payload.overdueOnly && {
          dueDate: { lt: now },
          status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        }),
      },
      orderBy: { invoiceDate: 'desc' },
      take: limit,
      skip: offset,
      include: { lineItems: true },
    });
  }
}

@Injectable()
export class GetPaymentQueryHandler implements QueryHandler<GetPaymentQuery> {
  private static readonly TYPE = 'Finance.GetPayment';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetPaymentQueryHandler.TYPE, this);
  }
  async handle(q: GetPaymentQuery) {
    return this.prisma.payment.findFirst({
      where: { id: q.payload.paymentId, schoolId: q.payload.tenantId },
      include: { allocations: { include: { invoice: true } } },
    });
  }
}

@Injectable()
export class ListPaymentsQueryHandler implements QueryHandler<ListPaymentsQuery> {
  private static readonly TYPE = 'Finance.ListPayments';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListPaymentsQueryHandler.TYPE, this);
  }
  async handle(q: ListPaymentsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    return this.prisma.payment.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.studentId && { studentId: q.payload.studentId }),
        ...(q.payload.status && { status: q.payload.status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { allocations: true },
    });
  }
}

@Injectable()
export class GetRefundQueryHandler implements QueryHandler<GetRefundQuery> {
  private static readonly TYPE = 'Finance.GetRefund';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetRefundQueryHandler.TYPE, this);
  }
  async handle(q: GetRefundQuery) {
    return this.prisma.refund.findFirst({
      where: { id: q.payload.refundId, schoolId: q.payload.tenantId },
      include: { allocations: true, payment: true },
    });
  }
}

@Injectable()
export class ListRefundsQueryHandler implements QueryHandler<ListRefundsQuery> {
  private static readonly TYPE = 'Finance.ListRefunds';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListRefundsQueryHandler.TYPE, this);
  }
  async handle(q: ListRefundsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    return this.prisma.refund.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.paymentId && { paymentId: q.payload.paymentId }),
        ...(q.payload.status && { status: q.payload.status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

@Injectable()
export class GetStudentFeePlanQueryHandler implements QueryHandler<GetStudentFeePlanQuery> {
  private static readonly TYPE = 'Finance.GetStudentFeePlan';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetStudentFeePlanQueryHandler.TYPE, this);
  }
  async handle(q: GetStudentFeePlanQuery) {
    return this.prisma.studentFeePlan.findFirst({
      where: {
        studentId: q.payload.studentId,
        academicSessionId: q.payload.academicSessionId,
        schoolId: q.payload.tenantId,
      },
      include: {
        feePlan: { include: { installments: true } },
        invoices: { include: { lineItems: true } },
        scholarshipAwards: true,
      },
    });
  }
}
