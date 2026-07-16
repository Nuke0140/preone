/**
 * PrismaFinanceRepository — concrete impl of Finance repos.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { FeePlanAggregate } from '../../domain/aggregates/fee-plan.aggregate';
import { InvoiceAggregate } from '../../domain/aggregates/invoice.aggregate';
import { PaymentAggregate } from '../../domain/aggregates/payment.aggregate';
import { RefundAggregate } from '../../domain/aggregates/refund.aggregate';
import type {
  FeePlanRepository, InvoiceRepository, PaymentRepository,
  RefundRepository, StudentFeePlanRepository,
} from '../../domain/repositories/finance.repository';

// ─── Fee Plan Repository ──────────────────────────────────────

@Injectable()
export class PrismaFeePlanRepository implements FeePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: FeePlanAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.feePlan.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        academicSessionId: p.academicSessionId,
        programType: p.programType,
        name: p.name,
        code: p.code,
        description: p.description,
        frequency: p.frequency,
        status: p.status,
        annualFeeCents: p.annualFeeCents,
        securityDepositCents: p.securityDepositCents,
        admissionFeeCents: p.admissionFeeCents,
        applicationFeeCents: p.applicationFeeCents,
        lateFeePerDayCents: p.lateFeePerDayCents,
        gstApplicable: p.gstApplicable,
        gstRatePercent: p.gstRatePercent,
        effectiveFrom: new Date(p.effectiveFrom),
        effectiveUntil: p.effectiveUntil ? new Date(p.effectiveUntil) : null,
        installments: {
          create: p.installments.map((inst: any) => ({
            id: inst.id,
            schoolId: p.tenantId,
            installmentNumber: inst.installmentNumber,
            label: inst.label,
            dueDate: new Date(inst.dueDate),
            amountCents: inst.amountCents,
            gracePeriodDays: inst.gracePeriodDays,
            isMandatory: inst.isMandatory,
          })),
        },
      },
      update: {
        status: p.status,
        effectiveUntil: p.effectiveUntil ? new Date(p.effectiveUntil) : null,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<FeePlanAggregate | null> {
    const row = await this.prisma.feePlan.findFirst({
      where: { id, schoolId: tenantId },
      include: { installments: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByCode(tenantId: string, code: string): Promise<FeePlanAggregate | null> {
    const row = await this.prisma.feePlan.findFirst({
      where: { schoolId: tenantId, code },
      include: { installments: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findActiveBySession(tenantId: string, academicSessionId: string): Promise<FeePlanAggregate[]> {
    const rows = await this.prisma.feePlan.findMany({
      where: { schoolId: tenantId, academicSessionId, status: 'ACTIVE' },
      include: { installments: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): FeePlanAggregate {
    const agg = Object.create(FeePlanAggregate.prototype) as FeePlanAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      academicSessionId: row.academicSessionId,
      programType: row.programType,
      name: row.name,
      code: row.code,
      description: row.description,
      frequency: row.frequency,
      status: row.status,
      annualFeeCents: row.annualFeeCents,
      securityDepositCents: row.securityDepositCents,
      admissionFeeCents: row.admissionFeeCents,
      applicationFeeCents: row.applicationFeeCents,
      lateFeePerDayCents: row.lateFeePerDayCents,
      gstApplicable: row.gstApplicable,
      gstRatePercent: Number(row.gstRatePercent),
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveUntil: row.effectiveUntil?.toISOString(),
      installments: (row.installments ?? []).map((i: any) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        label: i.label,
        dueDate: i.dueDate.toISOString(),
        amountCents: i.amountCents,
        gracePeriodDays: i.gracePeriodDays,
        isMandatory: i.isMandatory,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Invoice Repository ──────────────────────────────────────

@Injectable()
export class PrismaInvoiceRepository implements InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: InvoiceAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.invoice.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        invoiceNumber: p.invoiceNumber,
        studentFeePlanId: p.studentFeePlanId,
        studentId: p.studentId,
        feePlanInstallmentId: p.feePlanInstallmentId,
        invoiceDate: new Date(p.invoiceDate),
        dueDate: new Date(p.dueDate),
        periodStart: p.periodStart ? new Date(p.periodStart) : null,
        periodEnd: p.periodEnd ? new Date(p.periodEnd) : null,
        status: p.status,
        subtotalCents: p.subtotalCents,
        concessionCents: p.concessionCents,
        taxableAmountCents: p.taxableAmountCents,
        gstCents: p.gstCents,
        lateFeeCents: p.lateFeeCents,
        adjustmentCents: p.adjustmentCents,
        totalCents: p.totalCents,
        paidCents: p.paidCents,
        refundedCents: p.refundedCents,
        outstandingCents: p.outstandingCents,
        issuedAt: p.issuedAt ? new Date(p.issuedAt) : null,
        issuedBy: p.issuedBy,
        voidedAt: p.voidedAt ? new Date(p.voidedAt) : null,
        voidedReason: p.voidedReason,
        notes: p.notes,
        lineItems: {
          create: p.lineItems.map((li: any) => ({
            id: li.id,
            schoolId: p.tenantId,
            lineItemType: li.lineItemType,
            description: li.description,
            quantity: li.quantity,
            rateCents: li.rateCents,
            amountCents: li.amountCents,
            gstRatePercent: li.gstRatePercent,
            gstCents: li.gstCents,
            concessionCents: li.concessionCents,
          })),
        },
      },
      update: {
        status: p.status,
        paidCents: p.paidCents,
        refundedCents: p.refundedCents,
        outstandingCents: p.outstandingCents,
        totalCents: p.totalCents,
        adjustmentCents: p.adjustmentCents,
        lateFeeCents: p.lateFeeCents,
        issuedAt: p.issuedAt ? new Date(p.issuedAt) : null,
        issuedBy: p.issuedBy,
        voidedAt: p.voidedAt ? new Date(p.voidedAt) : null,
        voidedReason: p.voidedReason,
      },
    });
    // Sync adjustments (create new ones)
    for (const adj of p.adjustments as any[]) {
      await this.prisma.invoiceAdjustment.upsert({
        where: { id: adj.id },
        create: {
          id: adj.id,
          schoolId: p.tenantId,
          invoiceId: agg.id,
          adjustmentType: adj.adjustmentType,
          amountCents: adj.amountCents,
          description: adj.description,
          appliedById: adj.appliedById,
          appliedAt: new Date(adj.appliedAt),
          approvedById: adj.approvedById,
          approvedAt: adj.approvedAt ? new Date(adj.approvedAt) : null,
        },
        update: {},
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<InvoiceAggregate | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { id, schoolId: tenantId },
      include: { lineItems: true, adjustments: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByInvoiceNumber(tenantId: string, invoiceNumber: string): Promise<InvoiceAggregate | null> {
    const row = await this.prisma.invoice.findFirst({
      where: { schoolId: tenantId, invoiceNumber },
      include: { lineItems: true, adjustments: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findOverdue(tenantId: string, asOfDate: string, limit = 100): Promise<InvoiceAggregate[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        schoolId: tenantId,
        dueDate: { lt: new Date(asOfDate) },
        status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      take: limit,
      include: { lineItems: true, adjustments: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByStudent(studentId: string, tenantId: string): Promise<InvoiceAggregate[]> {
    const rows = await this.prisma.invoice.findMany({
      where: { studentId, schoolId: tenantId },
      orderBy: { invoiceDate: 'desc' },
      include: { lineItems: true, adjustments: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): InvoiceAggregate {
    const agg = Object.create(InvoiceAggregate.prototype) as InvoiceAggregate;
    const props = {
      tenantId: row.schoolId,
      invoiceNumber: row.invoiceNumber,
      studentFeePlanId: row.studentFeePlanId ?? undefined,
      studentId: row.studentId,
      feePlanInstallmentId: row.feePlanInstallmentId ?? undefined,
      invoiceDate: row.invoiceDate.toISOString(),
      dueDate: row.dueDate.toISOString(),
      periodStart: row.periodStart?.toISOString(),
      periodEnd: row.periodEnd?.toISOString(),
      status: row.status,
      subtotalCents: row.subtotalCents,
      concessionCents: row.concessionCents,
      taxableAmountCents: row.taxableAmountCents,
      gstCents: row.gstCents,
      lateFeeCents: row.lateFeeCents,
      adjustmentCents: row.adjustmentCents,
      totalCents: row.totalCents,
      paidCents: row.paidCents,
      refundedCents: row.refundedCents,
      outstandingCents: row.outstandingCents,
      issuedAt: row.issuedAt?.toISOString(),
      issuedBy: row.issuedBy ?? undefined,
      voidedAt: row.voidedAt?.toISOString(),
      voidedReason: row.voidedReason ?? undefined,
      notes: row.notes ?? undefined,
      lineItems: (row.lineItems ?? []).map((li: any) => ({
        id: li.id,
        lineItemType: li.lineItemType,
        description: li.description,
        quantity: Number(li.quantity),
        rateCents: li.rateCents,
        amountCents: li.amountCents,
        gstRatePercent: Number(li.gstRatePercent),
        gstCents: li.gstCents,
        concessionCents: li.concessionCents,
      })),
      adjustments: (row.adjustments ?? []).map((a: any) => ({
        id: a.id,
        adjustmentType: a.adjustmentType,
        amountCents: a.amountCents,
        description: a.description,
        appliedById: a.appliedById,
        appliedAt: a.appliedAt.toISOString(),
        approvedById: a.approvedById ?? undefined,
        approvedAt: a.approvedAt?.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Payment Repository ──────────────────────────────────────

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: PaymentAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.payment.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        paymentNumber: p.paymentNumber,
        studentId: p.studentId,
        studentFeePlanId: p.studentFeePlanId,
        amountCents: p.amountCents,
        amountRefundedCents: p.amountRefundedCents,
        method: p.method,
        gateway: p.gateway,
        gatewayTransactionId: p.gatewayTransactionId,
        gatewayPaymentId: p.gatewayPaymentId,
        status: p.status,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        failedAt: p.failedAt ? new Date(p.failedAt) : null,
        failureReason: p.failureReason,
        instrumentNumber: p.instrumentNumber,
        instrumentDate: p.instrumentDate ? new Date(p.instrumentDate) : null,
        bankName: p.bankName,
        collectedById: p.collectedById,
        notes: p.notes,
      },
      update: {
        status: p.status,
        amountRefundedCents: p.amountRefundedCents,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        failedAt: p.failedAt ? new Date(p.failedAt) : null,
        failureReason: p.failureReason,
        gatewayTransactionId: p.gatewayTransactionId,
      },
    });
    // Sync allocations
    for (const alloc of p.allocations as any[]) {
      if (alloc.isReversed) continue;
      await this.prisma.paymentAllocation.upsert({
        where: { paymentId_invoiceId: { paymentId: agg.id, invoiceId: alloc.invoiceId } },
        create: {
          id: alloc.id,
          schoolId: p.tenantId,
          paymentId: agg.id,
          invoiceId: alloc.invoiceId,
          allocatedCents: alloc.allocatedCents,
          allocatedAt: new Date(alloc.allocatedAt),
        },
        update: {},
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<PaymentAggregate | null> {
    const row = await this.prisma.payment.findFirst({
      where: { id, schoolId: tenantId },
      include: { allocations: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByPaymentNumber(tenantId: string, paymentNumber: string): Promise<PaymentAggregate | null> {
    const row = await this.prisma.payment.findFirst({
      where: { schoolId: tenantId, paymentNumber },
      include: { allocations: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByStudent(studentId: string, tenantId: string): Promise<PaymentAggregate[]> {
    const rows = await this.prisma.payment.findMany({
      where: { studentId, schoolId: tenantId },
      orderBy: { createdAt: 'desc' },
      include: { allocations: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): PaymentAggregate {
    const agg = Object.create(PaymentAggregate.prototype) as PaymentAggregate;
    const props = {
      tenantId: row.schoolId,
      paymentNumber: row.paymentNumber,
      studentId: row.studentId,
      studentFeePlanId: row.studentFeePlanId ?? undefined,
      amountCents: row.amountCents,
      amountRefundedCents: row.amountRefundedCents,
      method: row.method,
      gateway: row.gateway,
      gatewayTransactionId: row.gatewayTransactionId ?? undefined,
      gatewayPaymentId: row.gatewayPaymentId ?? undefined,
      status: row.status,
      paidAt: row.paidAt?.toISOString(),
      failedAt: row.failedAt?.toISOString(),
      failureReason: row.failureReason ?? undefined,
      instrumentNumber: row.instrumentNumber ?? undefined,
      instrumentDate: row.instrumentDate?.toISOString(),
      bankName: row.bankName ?? undefined,
      collectedById: row.collectedById ?? undefined,
      notes: row.notes ?? undefined,
      allocations: (row.allocations ?? []).map((a: any) => ({
        id: a.id,
        invoiceId: a.invoiceId,
        allocatedCents: a.allocatedCents,
        allocatedAt: a.allocatedAt.toISOString(),
        isReversed: a.isReversed,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Refund Repository ───────────────────────────────────────

@Injectable()
export class PrismaRefundRepository implements RefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: RefundAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.refund.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        refundNumber: p.refundNumber,
        paymentId: p.paymentId,
        studentId: p.studentId,
        amountCents: p.amountCents,
        method: p.method,
        status: p.status,
        reason: p.reason,
        requestedById: p.requestedById,
        requestedAt: new Date(p.requestedAt),
        approvedById: p.approvedById,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        processedAt: p.processedAt ? new Date(p.processedAt) : null,
        gatewayRefundId: p.gatewayRefundId,
        rejectionReason: p.rejectionReason,
        notes: p.notes,
      },
      update: {
        status: p.status,
        approvedById: p.approvedById,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        processedAt: p.processedAt ? new Date(p.processedAt) : null,
        gatewayRefundId: p.gatewayRefundId,
        rejectionReason: p.rejectionReason,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<RefundAggregate | null> {
    const row = await this.prisma.refund.findFirst({
      where: { id, schoolId: tenantId },
      include: { allocations: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<RefundAggregate[]> {
    const rows = await this.prisma.refund.findMany({
      where: { paymentId, schoolId: tenantId },
      include: { allocations: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): RefundAggregate {
    const agg = Object.create(RefundAggregate.prototype) as RefundAggregate;
    const props = {
      tenantId: row.schoolId,
      refundNumber: row.refundNumber,
      paymentId: row.paymentId,
      studentId: row.studentId,
      amountCents: row.amountCents,
      method: row.method,
      status: row.status,
      reason: row.reason,
      requestedById: row.requestedById,
      requestedAt: row.requestedAt.toISOString(),
      approvedById: row.approvedById ?? undefined,
      approvedAt: row.approvedAt?.toISOString(),
      processedAt: row.processedAt?.toISOString(),
      gatewayRefundId: row.gatewayRefundId ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      notes: row.notes ?? undefined,
      allocations: (row.allocations ?? []).map((a: any) => ({
        id: a.id,
        invoiceId: a.invoiceId,
        allocatedCents: a.allocatedCents,
        allocatedAt: a.allocatedAt.toISOString(),
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Student Fee Plan Repository (lightweight wrapper) ───────

@Injectable()
export class PrismaStudentFeePlanRepository implements StudentFeePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: unknown): Promise<void> {
    const sfp = agg as any;
    const p = sfp._props ?? sfp;
    await this.prisma.studentFeePlan.upsert({
      where: { id: sfp.id ?? p.id },
      create: {
        id: sfp.id ?? p.id,
        schoolId: p.tenantId,
        studentId: p.studentId,
        feePlanId: p.feePlanId,
        academicSessionId: p.academicSessionId,
        status: p.status ?? 'ASSIGNED',
        totalPayableCents: p.totalPayableCents,
        totalConcessionCents: p.totalConcessionCents ?? 0,
        totalPaidCents: p.totalPaidCents ?? 0,
        totalRefundedCents: p.totalRefundedCents ?? 0,
        outstandingCents: p.outstandingCents ?? p.totalPayableCents,
        assignedAt: new Date(p.assignedAt ?? new Date()),
      },
      update: {
        status: p.status,
        totalPaidCents: p.totalPaidCents ?? 0,
        totalRefundedCents: p.totalRefundedCents ?? 0,
        outstandingCents: p.outstandingCents,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<unknown | null> {
    return this.prisma.studentFeePlan.findFirst({
      where: { id, schoolId: tenantId },
      include: { feePlan: { include: { installments: true } }, invoices: true },
    });
  }

  async findByStudent(studentId: string, academicSessionId: string, tenantId: string): Promise<unknown | null> {
    return this.prisma.studentFeePlan.findFirst({
      where: { studentId, academicSessionId, schoolId: tenantId },
      include: { feePlan: { include: { installments: true } }, invoices: true },
    });
  }
}
