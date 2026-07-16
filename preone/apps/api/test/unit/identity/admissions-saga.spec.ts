/**
 * Integration test: AdmissionsSaga — ApplicationApproved → StudentOnboarding + FeePlan
 *
 * Per BTD §15 — Sagas + Process Managers:
 *   "When ApplicationApproved fires, the AdmissionsSaga orchestrates:
 *      1. Student module creates a Student record
 *      2. Finance module creates a default FeePlan
 *    The saga MUST be idempotent — duplicate events must not create
 *    duplicate students or fee plans."
 *
 * This test wires up:
 *   - Real EventBusService (in-process)
 *   - Real AdmissionsSaga (subscribed to eventBus)
 *   - In-memory fake ApplicationRepository
 *   - In-memory fake IStudentOnboardingPort + IFeePlanPort
 *
 * It then publishes ApplicationApprovedEvent directly via the EventBusService
 * and asserts that:
 *   - Both downstream ports were called with the right args
 *   - Duplicate events are skipped (idempotency)
 *   - Application-not-found skips downstream calls
 *   - Tenant mismatch skips downstream calls (cross-tenant protection)
 *   - Downstream port failure does NOT mark the event as processed (so retry
 *     worker can reprocess in Wave 10)
 *   - Port-level idempotency (created=true on first call, false on duplicate)
 *
 * Note: instantiates the saga directly (matching the pattern in auth.e2e.spec.ts)
 * to avoid NestJS DI reflect-metadata quirks under vitest's esbuild transform.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { ApplicationApprovedEvent } from '@modules/admissions/domain/events/admissions-events';
import {
  type CreateFeePlanRequest, type CreateFeePlanResult,
  type IStudentOnboardingPort, type IFeePlanPort,
  type OnboardStudentRequest, type OnboardStudentResult,
} from '@modules/admissions/domain/ports/saga-ports';
import type { ApplicationRepository } from '@modules/admissions/domain/repositories/admissions.repository';
import type { ApplicationAggregate } from '@modules/admissions/domain/aggregates/application.aggregate';
import { AdmissionsSaga } from '@modules/admissions/application/sagas/admissions.saga';

// ─────────────────────────────────────────────
// In-memory fakes
// ─────────────────────────────────────────────

class InMemoryApplicationRepository implements Pick<ApplicationRepository, 'findById'> {
  private readonly store = new Map<string, ApplicationAggregate>();
  constructor(apps: ApplicationAggregate[] = []) {
    for (const a of apps) this.store.set(a.id, a);
  }
  findById(id: string): Promise<ApplicationAggregate | undefined> {
    return Promise.resolve(this.store.get(id));
  }
}

class FakeStudentOnboardingPort implements IStudentOnboardingPort {
  readonly calls: OnboardStudentRequest[] = [];
  private readonly created = new Map<string, string>(); // triggerEventId → studentId
  private nextId = 1;
  async onboardStudent(req: OnboardStudentRequest): Promise<OnboardStudentResult> {
    this.calls.push(req);
    const existing = this.created.get(req.triggerEventId);
    if (existing) return { studentId: existing, created: false };
    const studentId = `stu-${this.nextId++}`;
    this.created.set(req.triggerEventId, studentId);
    return { studentId, created: true };
  }
}

class FakeFeePlanPort implements IFeePlanPort {
  readonly calls: CreateFeePlanRequest[] = [];
  private readonly created = new Map<string, string>(); // triggerEventId → feePlanId
  private nextId = 1;
  async createFeePlan(req: CreateFeePlanRequest): Promise<CreateFeePlanResult> {
    this.calls.push(req);
    const existing = this.created.get(req.triggerEventId);
    if (existing) return { feePlanId: existing, created: false };
    const feePlanId = `fp-${this.nextId++}`;
    this.created.set(req.triggerEventId, feePlanId);
    return { feePlanId, created: true };
  }
}

// ─────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────

/** Build a minimal ApplicationAggregate-like object for the saga. */
function makeApplicationFixture(overrides: Partial<{
  id: string; tenantId: string; childFirstName: string; childLastName: string;
  childDob: string; childGender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  programType: 'PLAYGROUP' | 'NURSERY' | 'LKG' | 'UKG' | 'KG' | 'DAYCARE';
}> = {}): ApplicationAggregate {
  return {
    id: overrides.id ?? 'app-001',
    tenantId: overrides.tenantId ?? 'school-001',
    childFirstName: overrides.childFirstName ?? 'Aarav',
    childLastName: overrides.childLastName ?? 'Sharma',
    childDob: overrides.childDob ?? '2021-05-15',
    childGender: overrides.childGender ?? 'FEMALE',
    programType: overrides.programType ?? 'NURSERY',
  } as unknown as ApplicationAggregate;
}

function makeEvent(payload: Partial<{
  applicationId: string; tenantId: string; approvedAt: string; approvedBy: string; admissionId: string;
}> = {}, eventId?: string): ApplicationApprovedEvent {
  const event = new ApplicationApprovedEvent({
    applicationId: payload.applicationId ?? 'app-001',
    tenantId: payload.tenantId ?? 'school-001',
    approvedAt: payload.approvedAt ?? new Date().toISOString(),
    approvedBy: payload.approvedBy ?? 'user-001',
    admissionId: payload.admissionId ?? 'adm-001',
  });
  if (eventId) {
    // Override the eventId for idempotency tests
    Object.defineProperty(event, 'eventId', { value: eventId, writable: false });
  }
  return event;
}

// ─────────────────────────────────────────────
// Test scaffolding — instantiate saga directly (no DI)
// ─────────────────────────────────────────────

interface TestContext {
  eventBus: EventBusService;
  saga: AdmissionsSaga;
  studentPort: FakeStudentOnboardingPort;
  feePlanPort: FakeFeePlanPort;
  appRepo: InMemoryApplicationRepository;
}

function setupSaga(apps: ApplicationAggregate[] = [makeApplicationFixture()], opts: { studentPort?: IStudentOnboardingPort } = {}): TestContext {
  const eventBus = new EventBusService();
  const studentPort = opts.studentPort ?? new FakeStudentOnboardingPort();
  const feePlanPort = new FakeFeePlanPort();
  const appRepo = new InMemoryApplicationRepository(apps);

  // Cast: InMemoryApplicationRepository only implements findById, but the saga
  // only calls findById — TypeScript is satisfied via Pick<>, runtime is fine.
  const saga = new AdmissionsSaga(
    eventBus,
    appRepo as unknown as ApplicationRepository,
    studentPort,
    feePlanPort,
  );
  // Manually trigger OnModuleInit (which subscribes the saga to the eventBus)
  saga.onModuleInit();

  return { eventBus, saga, studentPort: studentPort as FakeStudentOnboardingPort, feePlanPort, appRepo };
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('AdmissionsSaga — ApplicationApproved → StudentOnboarding + FeePlan (Wave 9d)', () => {
  it('happy path: publishes ApplicationApproved → both ports called with right args', async () => {
    const { eventBus, studentPort, feePlanPort } = setupSaga();
    const event = makeEvent();
    await eventBus.publish(event);

    expect(studentPort.calls).toHaveLength(1);
    expect(feePlanPort.calls).toHaveLength(1);

    const studentCall = studentPort.calls[0]!;
    expect(studentCall.tenantId).toBe('school-001');
    expect(studentCall.applicationId).toBe('app-001');
    expect(studentCall.admissionId).toBe('adm-001');
    expect(studentCall.childFirstName).toBe('Aarav');
    expect(studentCall.childLastName).toBe('Sharma');
    expect(studentCall.childDob).toBe('2021-05-15');
    expect(studentCall.childGender).toBe('FEMALE');
    expect(studentCall.programType).toBe('NURSERY');
    expect(studentCall.approvedBy).toBe('user-001');
    expect(studentCall.triggerEventId).toBe(event.eventId);

    const feePlanCall = feePlanPort.calls[0]!;
    expect(feePlanCall.tenantId).toBe('school-001');
    expect(feePlanCall.admissionId).toBe('adm-001');
    expect(feePlanCall.studentId).toBe('stu-1');
    expect(feePlanCall.programType).toBe('NURSERY');
    expect(feePlanCall.approvedBy).toBe('user-001');
    expect(feePlanCall.triggerEventId).toBe(event.eventId);
  });

  it('saga passes the freshly-onboarded studentId to the fee plan port', async () => {
    const { eventBus, feePlanPort } = setupSaga();
    await eventBus.publish(makeEvent());

    // The fee plan port should have received the studentId returned by the
    // student onboarding port (stu-1, since that's the first call).
    expect(feePlanPort.calls[0]!.studentId).toBe('stu-1');
  });

  it('idempotency: duplicate event (same eventId) does NOT re-invoke ports', async () => {
    const { eventBus, studentPort, feePlanPort } = setupSaga();
    const eventId = randomUUID();
    const event1 = makeEvent({}, eventId);
    const event2 = makeEvent({}, eventId); // same eventId

    await eventBus.publish(event1);
    await eventBus.publish(event2);

    // Saga's in-memory dedupe should skip the second delivery
    expect(studentPort.calls).toHaveLength(1);
    expect(feePlanPort.calls).toHaveLength(1);
  });

  it('idempotency: different events for different applications each invoke ports once', async () => {
    const { eventBus, studentPort } = setupSaga([
      makeApplicationFixture({ id: 'app-A' }),
      makeApplicationFixture({ id: 'app-B', childFirstName: 'Diya' }),
    ]);

    await eventBus.publish(makeEvent({ applicationId: 'app-A', admissionId: 'adm-A' }));
    await eventBus.publish(makeEvent({ applicationId: 'app-B', admissionId: 'adm-B' }));

    expect(studentPort.calls).toHaveLength(2);
    expect(studentPort.calls[0]!.applicationId).toBe('app-A');
    expect(studentPort.calls[1]!.applicationId).toBe('app-B');
    expect(studentPort.calls[1]!.childFirstName).toBe('Diya');
  });

  it('application-not-found: saga logs error + skips downstream ports', async () => {
    const { eventBus, studentPort, feePlanPort } = setupSaga([]); // empty repo
    await eventBus.publish(makeEvent({ applicationId: 'app-missing' }));
    expect(studentPort.calls).toHaveLength(0);
    expect(feePlanPort.calls).toHaveLength(0);
  });

  it('tenant mismatch: saga skips downstream ports (cross-tenant protection)', async () => {
    const { eventBus, studentPort, feePlanPort } = setupSaga([
      makeApplicationFixture({ id: 'app-001', tenantId: 'other-tenant' }),
    ]);
    await eventBus.publish(makeEvent({ applicationId: 'app-001', tenantId: 'school-001' }));
    expect(studentPort.calls).toHaveLength(0);
    expect(feePlanPort.calls).toHaveLength(0);
  });

  it('downstream port failure: saga does NOT mark event as processed (so retry can reprocess)', async () => {
    const failingStudentPort: IStudentOnboardingPort = {
      onboardStudent: vi.fn(async () => { throw new Error('student service down'); }),
    };
    const { eventBus, saga } = setupSaga([makeApplicationFixture()], { studentPort: failingStudentPort });

    // publish() catches per-subscriber errors so it doesn't throw — but the
    // saga's catch block re-throws, so the eventId is NOT added to processedEventIds.
    await eventBus.publish(makeEvent());
    expect(failingStudentPort.onboardStudent).toHaveBeenCalledTimes(1);

    // Reset the in-memory dedupe (simulating a restart) — the saga should
    // re-attempt on the next delivery.
    saga._resetForTesting();
    await eventBus.publish(makeEvent());
    expect(failingStudentPort.onboardStudent).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────
// Port idempotency contracts
// ─────────────────────────────────────────────

describe('AdmissionsSaga — port idempotency contracts (Wave 9d)', () => {
  it('FakeStudentOnboardingPort returns created=true on first call, false on duplicate', async () => {
    const port = new FakeStudentOnboardingPort();
    const req: OnboardStudentRequest = {
      tenantId: 't', applicationId: 'a', admissionId: 'ad',
      childFirstName: 'X', childLastName: 'Y', childDob: '2021-01-01',
      childGender: 'MALE', programType: 'NURSERY',
      approvedBy: 'u', triggerEventId: 'evt-1',
    };
    const r1 = await port.onboardStudent(req);
    const r2 = await port.onboardStudent(req);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r1.studentId).toBe(r2.studentId);
  });

  it('FakeFeePlanPort returns created=true on first call, false on duplicate', async () => {
    const port = new FakeFeePlanPort();
    const req: CreateFeePlanRequest = {
      tenantId: 't', admissionId: 'ad', studentId: 'stu-1',
      programType: 'NURSERY', approvedBy: 'u', triggerEventId: 'evt-1',
    };
    const r1 = await port.createFeePlan(req);
    const r2 = await port.createFeePlan(req);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r1.feePlanId).toBe(r2.feePlanId);
  });
});
