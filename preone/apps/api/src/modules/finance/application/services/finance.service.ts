/**
 * FinanceService — application-layer orchestrator for the Finance bounded
 * context (BTD §4.3 #8).
 *
 * Responsibilities:
 *   - Manage fee plans + installments
 *   - Assign fee plans to students (auto-triggered by AdmissionApproved.v1)
 *   - Generate invoices per installment
 *   - Record payments + allocate to invoices
 *   - Process refund workflow (request → approve → process)
 *   - Apply late fees + adjustments
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { FeePlanAggregate } from '../../domain/aggregates/fee-plan.aggregate';
import { InvoiceAggregate } from '../../domain/aggregates/invoice.aggregate';
import { PaymentAggregate } from '../../domain/aggregates/payment.aggregate';
import { RefundAggregate } from '../../domain/aggregates/refund.aggregate';
import type {
  FeePlanRepository, InvoiceRepository, PaymentRepository,
  RefundRepository, StudentFeePlanRepository,
} from '../../domain/repositories/finance.repository';
import {
  FEE_PLAN_REPOSITORY, INVOICE_REPOSITORY, PAYMENT_REPOSITORY,
  REFUND_REPOSITORY, STUDENT_FEE_PLAN_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @Inject(FEE_PLAN_REPOSITORY) private readonly feePlans: FeePlanRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(PAYMENT_REPOSITORY) private readonly payments: PaymentRepository,
    @Inject(REFUND_REPOSITORY) private readonly refunds: RefundRepository,
    @Inject(STUDENT_FEE_PLAN_REPOSITORY) private readonly studentFeePlans: StudentFeePlanRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Fee Plans ──────────────────────────────────────────────

  async createFeePlan(props: {
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
  }): Promise<FeePlanAggregate> {
    const fp = FeePlanAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      academicSessionId: props.academicSessionId,
      programType: props.programType,
      name: props.name,
      code: props.code,
      description: props.description,
      frequency: props.frequency,
      annualFeeCents: props.annualFeeCents,
      securityDepositCents: props.securityDepositCents,
      admissionFeeCents: props.admissionFeeCents,
      applicationFeeCents: props.applicationFeeCents,
      lateFeePerDayCents: props.lateFeePerDayCents,
      gstApplicable: props.gstApplicable,
      gstRatePercent: props.gstRatePercent,
      effectiveFrom: props.effectiveFrom,
      effectiveUntil: props.effectiveUntil,
    });
    for (const inst of props.installments ?? []) {
      fp.addInstallment(inst);
    }
    await this.feePlans.save(fp);
    await this.eventBus.publishAll(fp.commit());
    this.logger.log(`Created fee plan ${fp.code} (${fp.id})`);
    return fp;
  }

  async activateFeePlan(feePlanId: string, tenantId: string): Promise<void> {
    const fp = await this.feePlans.findById(feePlanId, tenantId);
    if (!fp) throw new Error(`Fee plan ${feePlanId} not found`);
    fp.activate();
    await this.feePlans.save(fp);
    await this.eventBus.publishAll(fp.commit());
  }

  // ─── Invoices ───────────────────────────────────────────────

  async generateInvoice(props: {
    tenantId: string;
    studentId: string;
    studentFeePlanId?: string;
    feePlanInstallmentId?: string;
    invoiceDate: string;
    dueDate: string;
    periodStart?: string;
    periodEnd?: string;
    lineItems: Array<{
      lineItemType: any;
      description: string;
      quantity: number;
      rateCents: number;
      amountCents: number;
      gstRatePercent: number;
      gstCents: number;
      concessionCents: number;
    }>;
    concessionCents?: number;
    gstCents?: number;
    lateFeeCents?: number;
    adjustmentCents?: number;
    notes?: string;
  }): Promise<InvoiceAggregate> {
    const subtotal = props.lineItems.reduce((acc, li) => acc + li.amountCents, 0);
    const invoiceNumber = await this.generateInvoiceNumber(props.tenantId);
    const inv = InvoiceAggregate.create({
      tenantId: props.tenantId,
      invoiceNumber,
      studentId: props.studentId,
      studentFeePlanId: props.studentFeePlanId,
      feePlanInstallmentId: props.feePlanInstallmentId,
      invoiceDate: props.invoiceDate,
      dueDate: props.dueDate,
      periodStart: props.periodStart,
      periodEnd: props.periodEnd,
      subtotalCents: subtotal,
      concessionCents: props.concessionCents ?? 0,
      taxableAmountCents: subtotal - (props.concessionCents ?? 0),
      gstCents: props.gstCents ?? 0,
      lateFeeCents: props.lateFeeCents ?? 0,
      adjustmentCents: props.adjustmentCents ?? 0,
      notes: props.notes,
      lineItems: props.lineItems.map(li => ({ ...li, id: crypto.randomUUID() })),
    });
    await this.invoices.save(inv);
    await this.eventBus.publishAll(inv.commit());
    this.logger.log(`Generated invoice ${inv.invoiceNumber} for student ${props.studentId} (total ${inv.totalCents}c)`);
    return inv;
  }

  async issueInvoice(invoiceId: string, issuedBy: string, tenantId: string): Promise<void> {
    const inv = await this.invoices.findById(invoiceId, tenantId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    inv.issue(issuedBy, new Date().toISOString());
    await this.invoices.save(inv);
    await this.eventBus.publishAll(inv.commit());
  }

  async voidInvoice(invoiceId: string, reason: string, tenantId: string): Promise<void> {
    const inv = await this.invoices.findById(invoiceId, tenantId);
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`);
    inv.void(reason, new Date().toISOString());
    await this.invoices.save(inv);
    await this.eventBus.publishAll(inv.commit());
  }

  async applyInvoiceAdjustment(props: {
    invoiceId: string;
    adjustmentType: 'WAIVER' | 'DISCOUNT' | 'LATE_FEE' | 'PENALTY' | 'CORRECTION' | 'WRITE_OFF';
    amountCents: number;
    description: string;
    appliedById: string;
    tenantId: string;
  }): Promise<void> {
    const inv = await this.invoices.findById(props.invoiceId, props.tenantId);
    if (!inv) throw new Error(`Invoice ${props.invoiceId} not found`);
    inv.applyAdjustment({
      adjustmentType: props.adjustmentType,
      amountCents: props.amountCents,
      description: props.description,
      appliedById: props.appliedById,
    }, new Date().toISOString());
    await this.invoices.save(inv);
    await this.eventBus.publishAll(inv.commit());
  }

  // ─── Payments ───────────────────────────────────────────────

  async recordPayment(props: {
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
  }): Promise<PaymentAggregate> {
    const paymentNumber = await this.generatePaymentNumber(props.tenantId);
    const p = PaymentAggregate.create({
      tenantId: props.tenantId,
      paymentNumber,
      studentId: props.studentId,
      studentFeePlanId: props.studentFeePlanId,
      amountCents: props.amountCents,
      method: props.method,
      gateway: props.gateway ?? 'MANUAL',
      gatewayTransactionId: props.gatewayTransactionId,
      gatewayPaymentId: props.gatewayPaymentId,
      instrumentNumber: props.instrumentNumber,
      instrumentDate: props.instrumentDate,
      bankName: props.bankName,
      collectedById: props.collectedById,
      notes: props.notes,
    });
    // For manual/offline payments, auto-mark as SUCCESS (cash, cheque verified at counter)
    if (props.gateway === 'MANUAL' || props.gateway === 'OFFLINE' || !props.gateway) {
      p.markSucceeded(new Date().toISOString(), props.gatewayTransactionId);
    }
    await this.payments.save(p);
    await this.eventBus.publishAll(p.commit());
    this.logger.log(`Recorded payment ${p.paymentNumber} for student ${props.studentId} (${props.amountCents}c via ${props.method})`);
    return p;
  }

  async allocatePayment(props: {
    paymentId: string;
    invoiceId: string;
    allocatedCents: number;
    tenantId: string;
  }): Promise<void> {
    const p = await this.payments.findById(props.paymentId, props.tenantId);
    if (!p) throw new Error(`Payment ${props.paymentId} not found`);
    p.allocate(props.invoiceId, props.allocatedCents, new Date().toISOString());
    await this.payments.save(p);
    await this.eventBus.publishAll(p.commit());
    // Also record payment on invoice side
    const inv = await this.invoices.findById(props.invoiceId, props.tenantId);
    if (inv) {
      inv.recordPayment(props.allocatedCents, new Date().toISOString());
      await this.invoices.save(inv);
      await this.eventBus.publishAll(inv.commit());
    }
  }

  // ─── Refunds ────────────────────────────────────────────────

  async requestRefund(props: {
    tenantId: string;
    paymentId: string;
    studentId: string;
    amountCents: number;
    method: any;
    reason: string;
    requestedById: string;
    notes?: string;
  }): Promise<RefundAggregate> {
    const refundNumber = await this.generateRefundNumber(props.tenantId);
    const r = RefundAggregate.create({
      tenantId: props.tenantId,
      refundNumber,
      paymentId: props.paymentId,
      studentId: props.studentId,
      amountCents: props.amountCents,
      method: props.method,
      reason: props.reason,
      requestedById: props.requestedById,
      requestedAt: new Date().toISOString(),
      notes: props.notes,
    });
    await this.refunds.save(r);
    await this.eventBus.publishAll(r.commit());
    this.logger.log(`Refund ${r.refundNumber} requested for payment ${props.paymentId} (${props.amountCents}c)`);
    return r;
  }

  async approveRefund(refundId: string, approvedBy: string, tenantId: string): Promise<void> {
    const r = await this.refunds.findById(refundId, tenantId);
    if (!r) throw new Error(`Refund ${refundId} not found`);
    r.approve(approvedBy, new Date().toISOString());
    await this.refunds.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  async processRefund(refundId: string, tenantId: string, gatewayRefundId?: string): Promise<void> {
    const r = await this.refunds.findById(refundId, tenantId);
    if (!r) throw new Error(`Refund ${refundId} not found`);
    r.process(new Date().toISOString(), gatewayRefundId);
    await this.refunds.save(r);
    await this.eventBus.publishAll(r.commit());
    // Mark refund on the payment
    const p = await this.payments.findById(r.paymentId, tenantId);
    if (p) {
      p.recordRefund(r.id, r.amountCents);
      await this.payments.save(p);
      await this.eventBus.publishAll(p.commit());
    }
  }

  async rejectRefund(refundId: string, rejectedBy: string, reason: string, tenantId: string): Promise<void> {
    const r = await this.refunds.findById(refundId, tenantId);
    if (!r) throw new Error(`Refund ${refundId} not found`);
    r.reject(rejectedBy, reason);
    await this.refunds.save(r);
    await this.eventBus.publishAll(r.commit());
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({ where: { schoolId: tenantId } });
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({ where: { schoolId: tenantId } });
    return `PAY-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private async generateRefundNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.refund.count({ where: { schoolId: tenantId } });
    return `REF-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
