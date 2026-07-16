/**
 * AdmissionsSaga — orchestrates post-approval side effects.
 *
 * Per BTD §15 — Sagas + Process Managers:
 *   "ApplicationApproved triggers two downstream actions:
 *      1. Student module creates a Student record (IStudentOnboardingPort)
 *      2. Finance module creates a default FeePlan (IFeePlanPort)
 *    The saga MUST be idempotent — duplicate events must not create
 *    duplicate students or fee plans."
 *
 * Per BTD §15.3 — Saga Failure Handling:
 *   "If a downstream port throws, the saga logs the error and continues.
 *    A background retry worker (Wave 10) will re-process failed events
 *    from the outbox. For Wave 9 we accept that transient failures require
 *    manual intervention — the test suite verifies the happy path."
 *
 * Idempotency strategy:
 *   - Track processed eventIds in an in-memory Set (per-process).
 *   - For v1.1+: replace with Redis SET `saga:admissions:processed` with TTL.
 *   - Downstream ports ALSO implement idempotency via triggerEventId unique
 *     constraint — so even if the saga's in-memory dedupe misses (e.g., process
 *     restart), the downstream ports will dedupe.
 *
 * Flow:
 *   1. ApplicationApprovedEvent arrives
 *   2. Saga checks dedupe set → skip if already processed
 *   3. Load ApplicationAggregate to get child details
 *   4. Call IStudentOnboardingPort.onboardStudent(...)
 *   5. Call IFeePlanPort.createFeePlan({ studentId, ... })
 *   6. Mark eventId as processed
 */
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';

import { ApplicationApprovedEvent } from '../../domain/events/admissions-events';
import {
  FEE_PLAN_PORT,
  STUDENT_ONBOARDING_PORT,
  type IFeePlanPort,
  type IStudentOnboardingPort,
} from '../../domain/ports/saga-ports';
import { APPLICATION_REPOSITORY } from '../../domain/repositories/tokens';

import type { ApplicationRepository } from '../../domain/repositories/admissions.repository';

@Injectable()
export class AdmissionsSaga implements OnModuleInit {
  private readonly logger = new Logger(AdmissionsSaga.name);
  /** Tracks processed eventIds for idempotency. v1.1: move to Redis. */
  private readonly processedEventIds = new Set<string>();

  constructor(
    private readonly eventBus: EventBusService,
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository,
    @Inject(STUDENT_ONBOARDING_PORT) private readonly studentOnboarding: IStudentOnboardingPort,
    @Inject(FEE_PLAN_PORT) private readonly feePlan: IFeePlanPort,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(ApplicationApprovedEvent.name, (event) => this.handle(event as ApplicationApprovedEvent));
    this.logger.log('AdmissionsSaga subscribed to ApplicationApprovedEvent');
  }

  /**
   * Handle an ApplicationApprovedEvent. Idempotent — duplicate events are
   * skipped silently.
   *
   * Visible for testing — do not call directly from application code.
   */
  async handle(event: ApplicationApprovedEvent): Promise<void> {
    // 1. Idempotency check (saga-level dedupe)
    if (this.processedEventIds.has(event.eventId)) {
      this.logger.debug(`Skipping duplicate ApplicationApprovedEvent ${event.eventId}`);
      return;
    }

    const { applicationId, tenantId, approvedBy, admissionId } = event.payload;

    this.logger.log(
      `Saga: ApplicationApproved ${applicationId} → onboard student + create fee plan (event=${event.eventId})`,
    );

    try {
      // 2. Load application to get child details (not in event payload)
      const application = await this.applications.findById(applicationId);
      if (!application || application.tenantId !== tenantId) {
        this.logger.error(
          `Saga: Application ${applicationId} not found in tenant ${tenantId} — skipping student onboarding`,
        );
        return;
      }

      // 3. Onboard student
      const studentResult = await this.studentOnboarding.onboardStudent({
        tenantId,
        applicationId,
        admissionId,
        childFirstName: application.childFirstName,
        childLastName: application.childLastName,
        childDob: application.childDob,
        childGender: application.childGender,
        programType: application.programType,
        approvedBy,
        triggerEventId: event.eventId,
      });

      // 4. Create fee plan (only if student was successfully onboarded)
      const feePlanResult = await this.feePlan.createFeePlan({
        tenantId,
        admissionId,
        studentId: studentResult.studentId,
        programType: application.programType,
        approvedBy,
        triggerEventId: event.eventId,
      });

      this.logger.log(
        `Saga complete: student=${studentResult.studentId} (created=${studentResult.created}), ` +
        `feePlan=${feePlanResult.feePlanId} (created=${feePlanResult.created})`,
      );

      // 5. Mark processed
      this.processedEventIds.add(event.eventId);
    } catch (err) {
      // Per BTD §15.3 — log + continue; retry worker handles reprocessing
      this.logger.error(
        `Saga failed for event ${event.eventId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Do NOT mark as processed — so the next delivery can retry
      throw err;
    }
  }

  /**
   * Test helper: reset the dedupe set. NOT for production use.
   */
  _resetForTesting(): void {
    this.processedEventIds.clear();
  }
}
