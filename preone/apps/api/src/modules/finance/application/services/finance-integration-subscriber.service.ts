/**
 * FinanceIntegrationEventSubscriber — listens to Admissions integration
 * events and triggers finance workflows (BTD §14.2 + §17.3 saga).
 *
 * Subscribed integration events:
 *   - AdmissionApproved.v1    → auto-create StudentFeePlan from latest
 *     FeePlanQuote for the application's program type + academic session
 *   - AdmissionCancelled.v1   → if refundDueCents > 0, create Refund
 *     workflow against the most recent payment
 *   - LatePickupRecorded.v1   → if feeChargedCents > 0, generate a
 *     one-line LATE_FEE invoice for the student
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { FinanceService } from './finance.service';

import {
  ApplicationApprovedEvent, AdmissionCancelledEvent,
} from '../../../admissions/domain/events/admissions-events';
import { LatePickupRecordedEvent } from '../../../attendance/domain/events/attendance-events';

@Injectable()
export class FinanceIntegrationEventSubscriber {
  private readonly logger = new Logger(FinanceIntegrationEventSubscriber.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly finance: FinanceService,
    private readonly prisma: PrismaService,
  ) {}

  register(): void {
    // ─── AdmissionApproved → auto-create StudentFeePlan ─────────
    this.eventBus.subscribe(ApplicationApprovedEvent.name, async (event) => {
      const e = event as ApplicationApprovedEvent;
      try {
        // Find the admission + application + latest fee plan quote
        const admission = await this.prisma.admission.findUnique({
          where: { id: e.payload.admissionId },
          include: {
            application: {
              include: {
                feePlanQuotes: { orderBy: { createdAt: 'desc' }, take: 1 },
              },
            },
          },
        });
        if (!admission || !admission.studentId) {
          this.logger.log(`AdmissionApproved: admission ${e.payload.admissionId} has no student yet — deferring StudentFeePlan creation`);
          return;
        }
        // Check if StudentFeePlan already exists for this student + session (idempotent)
        const existing = await this.prisma.studentFeePlan.findFirst({
          where: { studentId: admission.studentId, academicSessionId: admission.application.academicSessionId },
        });
        if (existing) {
          this.logger.log(`StudentFeePlan already exists for student ${admission.studentId} — skipping`);
          return;
        }
        const quote = admission.application.feePlanQuotes[0];
        if (!quote) {
          this.logger.warn(`No FeePlanQuote found for application ${admission.applicationId} — manual fee plan assignment needed`);
          return;
        }
        // Find an ACTIVE fee plan matching the program type + academic session
        const feePlan = quote.feePlanId
          ? await this.prisma.feePlan.findUnique({ where: { id: quote.feePlanId } })
          : await this.prisma.feePlan.findFirst({
              where: {
                schoolId: admission.schoolId,
                academicSessionId: admission.application.academicSessionId,
                programType: admission.application.programType,
                status: 'ACTIVE',
              },
            });
        if (!feePlan) {
          this.logger.warn(`No active FeePlan found for program ${admission.application.programType} — manual assignment needed`);
          return;
        }
        // Create StudentFeePlan
        await this.prisma.studentFeePlan.create({
          data: {
            id: crypto.randomUUID(),
            schoolId: admission.schoolId,
            studentId: admission.studentId,
            feePlanId: feePlan.id,
            academicSessionId: admission.application.academicSessionId,
            status: 'ASSIGNED',
            totalPayableCents: quote.netAnnualCents,
            totalConcessionCents: quote.siblingConcessionCents + quote.scholarshipCents,
            outstandingCents: quote.netAnnualCents,
            assignedAt: new Date(),
          },
        });
        this.logger.log(`Auto-created StudentFeePlan for student ${admission.studentId} (payable: ${quote.netAnnualCents}c)`);
      } catch (err) {
        this.logger.error(`Failed to handle AdmissionApproved for Finance: ${(err as Error).message}`, (err as Error).stack);
      }
    });

    // ─── AdmissionCancelled → initiate refund if due ─────────
    this.eventBus.subscribe(AdmissionCancelledEvent.name, async (event) => {
      const e = event as AdmissionCancelledEvent;
      const refundDue = e.payload.refundDueCents ?? 0;
      if (refundDue <= 0) {
        this.logger.log(`AdmissionCancelled: no refund due for ${e.payload.admissionId}`);
        return;
      }
      try {
        const admission = await this.prisma.admission.findUnique({
          where: { id: e.payload.admissionId },
          include: { application: true },
        });
        if (!admission || !admission.studentId) return;
        const studentId: string = admission.studentId;
        // Find the most recent successful payment by this student
        const lastPayment = await this.prisma.payment.findFirst({
          where: { studentId, status: 'SUCCESS' },
          orderBy: { paidAt: 'desc' },
        });
        if (!lastPayment) {
          this.logger.warn(`AdmissionCancelled: refund due ${refundDue}c but no SUCCESS payment found for student ${studentId}`);
          return;
        }
        await this.finance.requestRefund({
          tenantId: e.payload.tenantId,
          paymentId: lastPayment.id,
          studentId,
          amountCents: Math.min(refundDue, lastPayment.amountCents - lastPayment.amountRefundedCents),
          method: 'ORIGINAL_PAYMENT',
          reason: `Admission cancelled: ${e.payload.reason}`,
          requestedById: 'system',
        });
      } catch (err) {
        this.logger.error(`Failed to handle AdmissionCancelled for Finance: ${(err as Error).message}`);
      }
    });

    // ─── LatePickupRecorded → late fee invoice ─────────
    this.eventBus.subscribe(LatePickupRecordedEvent.name, async (event) => {
      const e = event as LatePickupRecordedEvent;
      const fee = e.payload.feeChargedCents ?? 0;
      if (fee <= 0) return;
      try {
        const tenantId: string = e.payload.tenantId;
        const studentId: string = e.payload.studentId;
        const student = await this.prisma.student.findUnique({
          where: { id: studentId },
          select: { schoolId: true, currentSectionId: true },
        });
        if (!student) return;
        const today = new Date().toISOString().split('T')[0] ?? '';
        await this.finance.generateInvoice({
          tenantId,
          studentId,
          invoiceDate: today,
          dueDate: today,
          lineItems: [{
            lineItemType: 'LATE_FEE',
            description: `Late pickup fee — ${e.payload.delayMinutes} min delay`,
            quantity: 1,
            rateCents: fee,
            amountCents: fee,
            gstRatePercent: 0,
            gstCents: 0,
            concessionCents: 0,
          }],
          lateFeeCents: fee,
          notes: `Auto-generated from LatePickupRecorded event (id: ${e.payload.latePickupId})`,
        });
        this.logger.log(`Auto-generated late fee invoice (${fee}c) for student ${studentId}`);
      } catch (err) {
        this.logger.error(`Failed to handle LatePickupRecorded for Finance: ${(err as Error).message}`);
      }
    });

    this.logger.log('FinanceIntegrationEventSubscriber registered for 3 event types');
  }
}
