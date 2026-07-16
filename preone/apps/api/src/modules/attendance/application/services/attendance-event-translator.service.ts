/**
 * AttendanceEventTranslator — translates Attendance domain events →
 * integration events and enqueues them via the Outbox (BTD §14 + §17.1).
 *
 * Wave 4.1 — bridges Attendance → Communication (parent notifications).
 *
 * Subscribed domain events:
 *   - AttendanceMarkedEvent      → AttendanceMarked.v1
 *       Subscriber: Communication (parent SMS if status ∈ {ABSENT, LATE})
 *   - IncidentReportedEvent      → IncidentReported.v1
 *       Subscriber: Communication (parent notification within 1h SLA;
 *                   CRITICAL severity → immediate)
 *   - DailyReportSentEvent       → DailyReportSent.v1
 *       Subscriber: Communication (parent ack tracker + delivery confirm)
 *   - LatePickupRecordedEvent    → LatePickupRecorded.v1
 *       Subscriber: Communication (parent alert + Finance (late fee invoice))
 *
 * Per BTD §13.3 — subscribers must be idempotent.
 * Per BTD §17.1 — outbox write is atomic with aggregate save when called
 * via UnitOfWork; otherwise fire-and-forget append (acceptable for v1).
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaOutboxRepository } from '../../../identity/infrastructure/repositories/prisma-outbox.repository';

import {
  AttendanceMarkedEvent, DailyReportSentEvent,
  IncidentReportedEvent, LatePickupRecordedEvent,
  toAttendanceMarkedV1, toDailyReportSentV1,
  toIncidentReportedV1, toLatePickupRecordedV1,
} from '../../domain/events/attendance-events';

@Injectable()
export class AttendanceEventTranslator {
  private readonly logger = new Logger(AttendanceEventTranslator.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly outbox: PrismaOutboxRepository,
  ) {}

  /**
   * Register all Attendance → integration event translations on the
   * in-process EventBus. Called once at module bootstrap.
   */
  register(): void {
    // ─── AttendanceMarked → AttendanceMarked.v1 ─────────
    // Communication module filters: only ABSENT + LATE statuses trigger
    // parent SMS. PRESENT + HALF_DAY + LEAVE do not.
    this.eventBus.subscribe(AttendanceMarkedEvent.name, async (event) => {
      const e = event as AttendanceMarkedEvent;
      try {
        await this.outbox.append(toAttendanceMarkedV1(e));
        const willNotify = ['ABSENT', 'LATE'].includes(e.payload.status);
        this.logger.log(
          `Translated ${AttendanceMarkedEvent.name} → AttendanceMarked.v1 (student=${e.payload.studentId}, status=${e.payload.status}, parentSMS=${willNotify ? 'YES' : 'no'})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${AttendanceMarkedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── IncidentReported → IncidentReported.v1 ─────────
    // Per BTD §22.3 — CRITICAL severity incidents require guardian
    // notification within 1 hour SLA. The Communication module's
    // subscriber implements the SLA timer + escalation.
    this.eventBus.subscribe(IncidentReportedEvent.name, async (event) => {
      const e = event as IncidentReportedEvent;
      try {
        await this.outbox.append(toIncidentReportedV1(e));
        this.logger.log(
          `Translated ${IncidentReportedEvent.name} → IncidentReported.v1 (student=${e.payload.studentId}, severity=${e.payload.severity}, type=${e.payload.incidentType})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${IncidentReportedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── DailyReportSent → DailyReportSent.v1 ─────────
    this.eventBus.subscribe(DailyReportSentEvent.name, async (event) => {
      const e = event as DailyReportSentEvent;
      try {
        await this.outbox.append(toDailyReportSentV1(e));
        this.logger.debug(
          `Translated ${DailyReportSentEvent.name} → DailyReportSent.v1 (student=${e.payload.studentId})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${DailyReportSentEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── LatePickupRecorded → LatePickupRecorded.v1 ─────────
    // Subscribers:
    //   Communication — parent alert
    //   Finance       — late fee invoice (auto-charge per school policy)
    this.eventBus.subscribe(LatePickupRecordedEvent.name, async (event) => {
      const e = event as LatePickupRecordedEvent;
      try {
        await this.outbox.append(toLatePickupRecordedV1(e));
        this.logger.log(
          `Translated ${LatePickupRecordedEvent.name} → LatePickupRecorded.v1 (student=${e.payload.studentId}, delay=${e.payload.delayMinutes}min, fee=${e.payload.feeChargedCents ?? 0}c)`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${LatePickupRecordedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    this.logger.log('AttendanceEventTranslator registered for 4 event types');
  }
}
