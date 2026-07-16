/**
 * Finance Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by FeePlan, StudentFeePlan, Invoice, Payment, Refund aggregates.
 *
 * Integration events (BTD §14) — published to Redis Stream after outbox drain:
 *   - InvoiceGenerated.v1   → Communication (parent invoice SMS/email)
 *   - PaymentReceived.v1    → Communication (payment receipt)
 *   - RefundProcessed.v1    → Communication (refund confirmation)
 *   - LateFeeCharged.v1     → Communication (late fee warning)
 *
 * Subscribers (this module is itself a SUBSCRIBER to integration events):
 *   - AdmissionApproved.v1  → create StudentFeePlan from FeePlanQuote
 *   - AdmissionCancelled.v1 → initiate refund workflow
 *   - LatePickupRecorded.v1 → create late fee invoice
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Fee Plan
// ─────────────────────────────────────────────

export class FeePlanCreatedEvent extends DomainEvent<{
  feePlanId: string;
  tenantId: string;
  branchId?: string;
  academicSessionId: string;
  programType: string;
  annualFeeCents: number;
  frequency: string;
}> {}

export class FeePlanActivatedEvent extends DomainEvent<{
  feePlanId: string;
  tenantId: string;
}> {}

export class FeePlanArchivedEvent extends DomainEvent<{
  feePlanId: string;
  tenantId: string;
}> {}

// ─────────────────────────────────────────────
// Student Fee Plan
// ─────────────────────────────────────────────

export class StudentFeePlanAssignedEvent extends DomainEvent<{
  studentFeePlanId: string;
  tenantId: string;
  studentId: string;
  feePlanId: string;
  academicSessionId: string;
  totalPayableCents: number;
}> {}

export class StudentFeePlanActivatedEvent extends DomainEvent<{
  studentFeePlanId: string;
  tenantId: string;
  studentId: string;
}> {}

export class StudentFeePlanCompletedEvent extends DomainEvent<{
  studentFeePlanId: string;
  tenantId: string;
  studentId: string;
  completedAt: string;
}> {}

export class StudentFeePlanCancelledEvent extends DomainEvent<{
  studentFeePlanId: string;
  tenantId: string;
  studentId: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Invoice
// ─────────────────────────────────────────────

export class InvoiceGeneratedEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  studentId: string;
  invoiceNumber: string;
  studentFeePlanId?: string;
  totalCents: number;
  dueDate: string;
}> {}

export class InvoiceIssuedEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  issuedAt: string;
  issuedBy: string;
}> {}

export class InvoicePaidEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  paidCents: number;
  paidAt: string;
}> {}

export class InvoiceOverdueEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  dueDate: string;
  overdueDays: number;
}> {}

export class InvoiceVoidedEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  voidedAt: string;
  reason: string;
}> {}

export class InvoiceAdjustedEvent extends DomainEvent<{
  invoiceId: string;
  tenantId: string;
  adjustmentType: string;
  amountCents: number;
  description: string;
}> {}

// ─────────────────────────────────────────────
// Payment
// ─────────────────────────────────────────────

export class PaymentRecordedEvent extends DomainEvent<{
  paymentId: string;
  tenantId: string;
  studentId: string;
  paymentNumber: string;
  amountCents: number;
  method: string;
  gateway: string;
}> {}

export class PaymentSucceededEvent extends DomainEvent<{
  paymentId: string;
  tenantId: string;
  paidAt: string;
  gatewayTransactionId?: string;
}> {}

export class PaymentFailedEvent extends DomainEvent<{
  paymentId: string;
  tenantId: string;
  failureReason: string;
  failedAt: string;
}> {}

export class PaymentAllocatedEvent extends DomainEvent<{
  paymentId: string;
  tenantId: string;
  invoiceId: string;
  allocatedCents: number;
}> {}

export class PaymentRefundedEvent extends DomainEvent<{
  paymentId: string;
  tenantId: string;
  refundId: string;
  refundedCents: number;
}> {}

// ─────────────────────────────────────────────
// Refund
// ─────────────────────────────────────────────

export class RefundRequestedEvent extends DomainEvent<{
  refundId: string;
  tenantId: string;
  studentId: string;
  paymentId: string;
  amountCents: number;
  reason: string;
}> {}

export class RefundApprovedEvent extends DomainEvent<{
  refundId: string;
  tenantId: string;
  approvedBy: string;
  approvedAt: string;
}> {}

export class RefundProcessedEvent extends DomainEvent<{
  refundId: string;
  tenantId: string;
  amountCents: number;
  method: string;
  processedAt: string;
}> {}

export class RefundRejectedEvent extends DomainEvent<{
  refundId: string;
  tenantId: string;
  rejectedBy: string;
  reason: string;
}> {}
