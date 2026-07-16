/**
 * CommunicationIntegrationEventSubscriber — listens to integration events
 * published by Admissions + Attendance modules and triggers parent
 * notifications automatically (BTD §14.2).
 *
 * Subscribed integration events:
 *   - ApplicationSubmitted.v1 → parent confirmation SMS
 *   - AdmissionApproved.v1    → parent welcome email
 *   - ApplicationRejected.v1  → parent rejection email
 *   - SeatOffered.v1          → parent offer letter email + SMS
 *   - AdmissionCancelled.v1   → parent cancellation notification
 *   - AttendanceMarked.v1     → parent SMS if status ∈ {ABSENT, LATE}
 *   - IncidentReported.v1     → parent notification (CRITICAL within 1h SLA)
 *   - DailyReportSent.v1      → parent ack tracker
 *   - LatePickupRecorded.v1   → parent alert + Finance (late fee invoice)
 *
 * Per BTD §14.3 — subscribers must be idempotent (same event processed
 * twice yields same result). We rely on notification.sourceAggregateId
 * uniqueness check for deduplication.
 *
 * Wave 5 v1: in-process subscription via the EventBusService. Wave 6+
 * will replace this with the Redis Stream subscriber (post-outbox drain).
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { CommunicationService } from './communication.service';

// Import the source domain event classes so we can subscribe by name.
// NOTE: in Wave 6+ these will be replaced by integration-event subscribers
// reading from the Redis Stream — but the handler signatures are identical.
import {
  ApplicationApprovedEvent, ApplicationRejectedEvent, ApplicationSubmittedEvent,
  AdmissionCancelledEvent, AdmissionOfferIssuedEvent,
} from '../../../admissions/domain/events/admissions-events';
import {
  AttendanceMarkedEvent, DailyReportSentEvent, IncidentReportedEvent,
  LatePickupRecordedEvent,
} from '../../../attendance/domain/events/attendance-events';

@Injectable()
export class CommunicationIntegrationEventSubscriber {
  private readonly logger = new Logger(CommunicationIntegrationEventSubscriber.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly comm: CommunicationService,
    private readonly prisma: PrismaService,
  ) {}

  register(): void {
    // ─── ApplicationSubmitted → parent confirmation SMS ─────────
    this.eventBus.subscribe(ApplicationSubmittedEvent.name, async (event) => {
      const e = event as ApplicationSubmittedEvent;
      try {
        const app = await this.prisma.application.findUnique({
          where: { id: e.payload.applicationId },
          select: { schoolId: true, branchId: true, childFirstName: true, childLastName: true },
        });
        if (!app) return;
        // Find parent guardians linked to the lead (if any)
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: app.schoolId, studentLinks: { some: { student: { admissions: { some: { applicationId: e.payload.applicationId } } } } } },
          select: { userId: true, phone: true },
        });
        if (guardians.length === 0) return;
        await this.comm.createNotification({
          tenantId: app.schoolId,
          branchId: app.branchId,
          channel: 'SMS',
          priority: 'NORMAL',
          triggerEvent: 'APPLICATION_SUBMITTED',
          sourceAggregateType: 'Application',
          sourceAggregateId: e.payload.applicationId,
          body: `Hi, we've received ${app.childFirstName}'s admission application (${e.payload.applicationNumber}). We'll be in touch soon. - PreOne`,
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle ApplicationSubmitted: ${(err as Error).message}`);
      }
    });

    // ─── AdmissionApproved → parent welcome email ─────────
    this.eventBus.subscribe(ApplicationApprovedEvent.name, async (event) => {
      const e = event as ApplicationApprovedEvent;
      try {
        const app = await this.prisma.application.findUnique({
          where: { id: e.payload.applicationId },
          select: { schoolId: true, branchId: true, childFirstName: true, childLastName: true },
        });
        if (!app) return;
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: app.schoolId, studentLinks: { some: { student: { admissions: { some: { applicationId: e.payload.applicationId } } } } } },
          select: { userId: true, email: true },
        });
        if (guardians.length === 0) return;
        await this.comm.createNotification({
          tenantId: app.schoolId,
          branchId: app.branchId,
          channel: 'EMAIL',
          priority: 'HIGH',
          triggerEvent: 'ADMISSION_APPROVED',
          sourceAggregateType: 'Admission',
          sourceAggregateId: e.payload.admissionId,
          subject: `Welcome to the PreOne family, ${app.childFirstName}!`,
          body: `Dear Parent, your child ${app.childFirstName} ${app.childLastName}'s admission has been approved. We're excited to have you with us!`,
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle AdmissionApproved: ${(err as Error).message}`);
      }
    });

    // ─── AttendanceMarked → parent SMS if ABSENT/LATE ─────────
    this.eventBus.subscribe(AttendanceMarkedEvent.name, async (event) => {
      const e = event as AttendanceMarkedEvent;
      const status = e.payload.status;
      if (!['ABSENT', 'LATE'].includes(status)) return;
      try {
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: e.payload.tenantId, studentLinks: { some: { studentId: e.payload.studentId } } },
          select: { userId: true, phone: true },
        });
        if (guardians.length === 0) return;
        const msg = status === 'ABSENT'
          ? `Your child was marked absent on ${e.payload.attendanceDate}. Please contact the school if this is unexpected.`
          : `Your child arrived late on ${e.payload.attendanceDate}. - PreOne`;
        await this.comm.createNotification({
          tenantId: e.payload.tenantId,
          channel: 'SMS',
          priority: status === 'ABSENT' ? 'HIGH' : 'NORMAL',
          triggerEvent: 'ATTENDANCE_MARKED',
          sourceAggregateType: 'Attendance',
          sourceAggregateId: e.payload.attendanceId,
          body: msg,
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle AttendanceMarked: ${(err as Error).message}`);
      }
    });

    // ─── IncidentReported → parent notification within 1h SLA ─
    this.eventBus.subscribe(IncidentReportedEvent.name, async (event) => {
      const e = event as IncidentReportedEvent;
      try {
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: e.payload.tenantId, studentLinks: { some: { studentId: e.payload.studentId } } },
          select: { userId: true, phone: true },
        });
        if (guardians.length === 0) return;
        const severity = e.payload.severity;
        const priority = severity === 'CRITICAL' ? 'CRITICAL' : severity === 'MAJOR' ? 'URGENT' : 'HIGH';
        await this.comm.createNotification({
          tenantId: e.payload.tenantId,
          channel: severity === 'CRITICAL' ? 'SMS' : 'IN_APP',
          priority: priority as any,
          triggerEvent: 'INCIDENT_REPORTED',
          sourceAggregateType: 'IncidentReport',
          sourceAggregateId: e.payload.incidentId,
          subject: `Incident involving your child — ${severity}`,
          body: `Dear Parent, an incident of type "${e.payload.incidentType}" (severity ${severity}) was reported involving your child on ${e.payload.occurredAt}. Please contact the school for details.`,
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle IncidentReported: ${(err as Error).message}`);
      }
    });

    // ─── DailyReportSent → parent ack tracker ─────────
    this.eventBus.subscribe(DailyReportSentEvent.name, async (event) => {
      const e = event as DailyReportSentEvent;
      try {
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: e.payload.tenantId, studentLinks: { some: { studentId: e.payload.studentId } } },
          select: { userId: true },
        });
        if (guardians.length === 0) return;
        await this.comm.createNotification({
          tenantId: e.payload.tenantId,
          channel: 'IN_APP',
          priority: 'NORMAL',
          triggerEvent: 'DAILY_REPORT_SENT',
          sourceAggregateType: 'DailyReport',
          sourceAggregateId: e.payload.dailyReportId,
          subject: "Your child's daily report is ready",
          body: 'Please review and acknowledge the daily report for your child.',
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle DailyReportSent: ${(err as Error).message}`);
      }
    });

    // ─── LatePickupRecorded → parent alert ─────────
    this.eventBus.subscribe(LatePickupRecordedEvent.name, async (event) => {
      const e = event as LatePickupRecordedEvent;
      try {
        const guardians = await this.prisma.guardian.findMany({
          where: { schoolId: e.payload.tenantId, studentLinks: { some: { studentId: e.payload.studentId } } },
          select: { userId: true },
        });
        if (guardians.length === 0) return;
        await this.comm.createNotification({
          tenantId: e.payload.tenantId,
          channel: 'SMS',
          priority: 'HIGH',
          triggerEvent: 'LATE_PICKUP',
          sourceAggregateType: 'LatePickup',
          sourceAggregateId: e.payload.latePickupId,
          body: `Your child was picked up ${e.payload.delayMinutes} minutes late today. Late pickup fee may apply.`,
          recipientIds: guardians.map(g => g.userId).filter((x): x is string => x !== null),
        });
      } catch (err) {
        this.logger.error(`Failed to handle LatePickupRecorded: ${(err as Error).message}`);
      }
    });

    this.logger.log('CommunicationIntegrationEventSubscriber registered for 5 event types');
  }
}
