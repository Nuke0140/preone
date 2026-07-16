/**
 * Finance Queries — CQRS read side (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetFeePlanQuery implements Query<{ feePlanId: string; tenantId: string }, unknown> {
  readonly type = 'Finance.GetFeePlan';
  constructor(readonly payload: { feePlanId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListFeePlansQuery implements Query<{
  tenantId: string;
  academicSessionId?: string;
  status?: string;
  programType?: string;
}, unknown> {
  readonly type = 'Finance.ListFeePlans';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetInvoiceQuery implements Query<{ invoiceId: string; tenantId: string }, unknown> {
  readonly type = 'Finance.GetInvoice';
  constructor(readonly payload: { invoiceId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListInvoicesQuery implements Query<{
  tenantId: string;
  studentId?: string;
  status?: string;
  overdueOnly?: boolean;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Finance.ListInvoices';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetPaymentQuery implements Query<{ paymentId: string; tenantId: string }, unknown> {
  readonly type = 'Finance.GetPayment';
  constructor(readonly payload: { paymentId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListPaymentsQuery implements Query<{
  tenantId: string;
  studentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Finance.ListPayments';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetRefundQuery implements Query<{ refundId: string; tenantId: string }, unknown> {
  readonly type = 'Finance.GetRefund';
  constructor(readonly payload: { refundId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListRefundsQuery implements Query<{
  tenantId: string;
  paymentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Finance.ListRefunds';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetStudentFeePlanQuery implements Query<{ studentId: string; academicSessionId: string; tenantId: string }, unknown> {
  readonly type = 'Finance.GetStudentFeePlan';
  constructor(readonly payload: { studentId: string; academicSessionId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}
