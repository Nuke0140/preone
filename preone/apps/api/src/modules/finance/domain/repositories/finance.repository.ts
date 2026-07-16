/**
 * Finance Repository Ports — interfaces implemented by Prisma repos.
 */
import type { FeePlanAggregate } from '../aggregates/fee-plan.aggregate';
import type { InvoiceAggregate } from '../aggregates/invoice.aggregate';
import type { PaymentAggregate } from '../aggregates/payment.aggregate';
import type { RefundAggregate } from '../aggregates/refund.aggregate';

export interface FeePlanRepository {
  save(agg: FeePlanAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<FeePlanAggregate | null>;
  findByCode(tenantId: string, code: string): Promise<FeePlanAggregate | null>;
  findActiveBySession(tenantId: string, academicSessionId: string): Promise<FeePlanAggregate[]>;
}

export interface InvoiceRepository {
  save(agg: InvoiceAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<InvoiceAggregate | null>;
  findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<InvoiceAggregate | null>;
  findOverdue(tenantId: string, asOfDate: string, limit?: number): Promise<InvoiceAggregate[]>;
  findByStudent(studentId: string, tenantId: string): Promise<InvoiceAggregate[]>;
}

export interface PaymentRepository {
  save(agg: PaymentAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<PaymentAggregate | null>;
  findByPaymentNumber(tenantId: string, paymentNumber: string): Promise<PaymentAggregate | null>;
  findByStudent(studentId: string, tenantId: string): Promise<PaymentAggregate[]>;
}

export interface RefundRepository {
  save(agg: RefundAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<RefundAggregate | null>;
  findByPayment(paymentId: string, tenantId: string): Promise<RefundAggregate[]>;
}

export interface StudentFeePlanRepository {
  save(agg: unknown): Promise<void>;
  findById(id: string, tenantId: string): Promise<unknown | null>;
  findByStudent(studentId: string, academicSessionId: string, tenantId: string): Promise<unknown | null>;
}
