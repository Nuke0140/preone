/**
 * AdmissionsEventTranslator — translates Admissions domain events →
 * integration events and enqueues them via the Outbox (BTD §14 + §17.1).
 *
 * Wave 4.1 — bridges Admissions → {Identity, Finance, Communication}
 *
 * Subscribed domain events:
 *   - ApplicationSubmittedEvent → ApplicationSubmitted.v1
 *       Subscriber: Communication (parent confirmation SMS)
 *   - ApplicationApprovedEvent  → AdmissionApproved.v1
 *       Subscribers:
 *         Identity     — create Student record (BTD §17.3 saga step 1)
 *         Finance      — create StudentFeePlan from FeePlanQuote
 *         Communication — welcome email
 *   - ApplicationRejectedEvent  → ApplicationRejected.v1
 *       Subscriber: Communication (rejection email)
 *   - AdmissionOfferIssuedEvent → SeatOffered.v1
 *       Subscriber: Communication (offer letter)
 *   - AdmissionCancelledEvent   → AdmissionCancelled.v1
 *       Subscribers:
 *         Finance       — initiate refund workflow
 *         Communication — notify parent of cancellation
 *
 * Per BTD §13.3 — subscribers must be idempotent. Outbox dedupes on
 * event_id (UNIQUE constraint).
 * Per BTD §17.1 — outbox write MUST be in the same transaction as the
 * aggregate save. This translator uses fire-and-forget append for v1
 * (in-process subscribers); the UnitOfWork integration in Wave 5 will
 * wrap these in the calling transaction.
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaOutboxRepository } from '../../../identity/infrastructure/repositories/prisma-outbox.repository';

import {
  AdmissionCancelledEvent, AdmissionOfferIssuedEvent,
  ApplicationApprovedEvent, ApplicationRejectedEvent,
  ApplicationSubmittedEvent,
  toAdmissionApprovedV1, toAdmissionCancelledV1,
  toApplicationRejectedV1, toApplicationSubmittedV1,
  toSeatOfferedV1,
} from '../../domain/events/admissions-events';

@Injectable()
export class AdmissionsEventTranslator {
  private readonly logger = new Logger(AdmissionsEventTranslator.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly outbox: PrismaOutboxRepository,
  ) {}

  /**
   * Register all Admissions → integration event translations on the
   * in-process EventBus. Should be called once at module bootstrap
   * (typically from the module's onModuleInit).
   */
  register(): void {
    // ─── ApplicationSubmitted → ApplicationSubmitted.v1 ─────────
    this.eventBus.subscribe(ApplicationSubmittedEvent.name, async (event) => {
      const e = event as ApplicationSubmittedEvent;
      try {
        await this.outbox.append(toApplicationSubmittedV1(e));
        this.logger.debug(
          `Translated ${ApplicationSubmittedEvent.name} → ApplicationSubmitted.v1 (app=${e.payload.applicationNumber})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${ApplicationSubmittedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── ApplicationApproved → AdmissionApproved.v1 (saga trigger) ───
    // Per BTD §17.3 — Admission Approval Saga:
    //   Step 1: Identity creates Student record from Application child fields
    //   Step 2: Finance creates StudentFeePlan from latest FeePlanQuote
    //   Step 3: Communication sends welcome email
    // Each subscriber acts on the SAME integration event — they are
    // independent + idempotent.
    this.eventBus.subscribe(ApplicationApprovedEvent.name, async (event) => {
      const e = event as ApplicationApprovedEvent;
      try {
        await this.outbox.append(toAdmissionApprovedV1(e));
        this.logger.log(
          `Translated ${ApplicationApprovedEvent.name} → AdmissionApproved.v1 (admission=${e.payload.admissionId}) — Identity/Finance/Communication subscribers will fire`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${ApplicationApprovedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── ApplicationRejected → ApplicationRejected.v1 ─────────
    this.eventBus.subscribe(ApplicationRejectedEvent.name, async (event) => {
      const e = event as ApplicationRejectedEvent;
      try {
        await this.outbox.append(toApplicationRejectedV1(e));
        this.logger.debug(
          `Translated ${ApplicationRejectedEvent.name} → ApplicationRejected.v1`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${ApplicationRejectedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── AdmissionOfferIssued → SeatOffered.v1 ─────────
    this.eventBus.subscribe(AdmissionOfferIssuedEvent.name, async (event) => {
      const e = event as AdmissionOfferIssuedEvent;
      try {
        await this.outbox.append(toSeatOfferedV1(e));
        this.logger.debug(
          `Translated ${AdmissionOfferIssuedEvent.name} → SeatOffered.v1 (offer=${e.payload.offerNumber})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${AdmissionOfferIssuedEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    // ─── AdmissionCancelled → AdmissionCancelled.v1 (refund trigger) ───
    this.eventBus.subscribe(AdmissionCancelledEvent.name, async (event) => {
      const e = event as AdmissionCancelledEvent;
      try {
        await this.outbox.append(toAdmissionCancelledV1(e));
        const refund = e.payload.refundDueCents ?? 0;
        this.logger.log(
          `Translated ${AdmissionCancelledEvent.name} → AdmissionCancelled.v1 (admission=${e.payload.admissionId}, refundDue=${refund > 0 ? `${refund}c` : 'none'})`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to translate ${AdmissionCancelledEvent.name}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    });

    this.logger.log('AdmissionsEventTranslator registered for 5 event types');
  }
}
