/**
 * Finance Commands — CQRS write side (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

export class CreateFeePlanCommand implements Command<{
  tenantId: string;
  branchId?: string;
  academicSessionId: string;
  programType: string;
  name: string;
  code: string;
  description?: string;
  frequency: 'ONE_TIME' | 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'TERM_WISE';
  annualFeeCents: number;
  securityDepositCents: number;
  admissionFeeCents: number;
  applicationFeeCents: number;
  lateFeePerDayCents: number;
  gstApplicable: boolean;
  gstRatePercent: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  installments?: Array<{
    installmentNumber: number;
    label: string;
    dueDate: string;
    amountCents: number;
    gracePeriodDays: number;
    isMandatory: boolean;
  }>;
}, { id: string }> {
  readonly type = 'Finance.CreateFeePlan';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ActivateFeePlanCommand implements Command<{ feePlanId: string; tenantId: string }, { id: string }> {
  readonly type = 'Finance.ActivateFeePlan';
  constructor(readonly payload: { feePlanId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class GenerateInvoiceCommand implements Command<{
  tenantId: string;
  studentId: string;
  studentFeePlanId?: string;
  feePlanInstallmentId?: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  lineItems: any[];
  concessionCents?: number;
  gstCents?: number;
  lateFeeCents?: number;
  adjustmentCents?: number;
  notes?: string;
}, { id: string; invoiceNumber: string }> {
  readonly type = 'Finance.GenerateInvoice';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class IssueInvoiceCommand implements Command<{ invoiceId: string; issuedBy: string; tenantId: string }, { id: string }> {
  readonly type = 'Finance.IssueInvoice';
  constructor(readonly payload: { invoiceId: string; issuedBy: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class VoidInvoiceCommand implements Command<{ invoiceId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Finance.VoidInvoice';
  constructor(readonly payload: { invoiceId: string; reason: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class ApplyInvoiceAdjustmentCommand implements Command<{
  invoiceId: string;
  adjustmentType: any;
  amountCents: number;
  description: string;
  appliedById: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Finance.ApplyInvoiceAdjustment';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class RecordPaymentCommand implements Command<{
  tenantId: string;
  studentId: string;
  studentFeePlanId?: string;
  amountCents: number;
  method: any;
  gateway?: any;
  gatewayTransactionId?: string;
  gatewayPaymentId?: string;
  instrumentNumber?: string;
  instrumentDate?: string;
  bankName?: string;
  collectedById?: string;
  notes?: string;
}, { id: string; paymentNumber: string }> {
  readonly type = 'Finance.RecordPayment';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AllocatePaymentCommand implements Command<{
  paymentId: string;
  invoiceId: string;
  allocatedCents: number;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Finance.AllocatePayment';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class RequestRefundCommand implements Command<{
  tenantId: string;
  paymentId: string;
  studentId: string;
  amountCents: number;
  method: any;
  reason: string;
  requestedById: string;
  notes?: string;
}, { id: string; refundNumber: string }> {
  readonly type = 'Finance.RequestRefund';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ApproveRefundCommand implements Command<{ refundId: string; approvedBy: string; tenantId: string }, { id: string }> {
  readonly type = 'Finance.ApproveRefund';
  constructor(readonly payload: { refundId: string; approvedBy: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class ProcessRefundCommand implements Command<{ refundId: string; tenantId: string; gatewayRefundId?: string }, { id: string }> {
  readonly type = 'Finance.ProcessRefund';
  constructor(readonly payload: { refundId: string; tenantId: string; gatewayRefundId?: string }, readonly metadata: CommandMetadata) {}
}

export class RejectRefundCommand implements Command<{ refundId: string; rejectedBy: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Finance.RejectRefund';
  constructor(readonly payload: { refundId: string; rejectedBy: string; reason: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}
