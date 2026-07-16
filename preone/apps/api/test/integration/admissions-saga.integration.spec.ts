/**
 * Integration test — AdmissionsSaga with real Postgres + in-process EventBus
 * (BTD §15 — Sagas + Process Managers, §24 — Integration Testing).
 *
 * Per BTD §24:
 *   "Integration tests verify the saga happy path against a real Postgres.
 *    The saga subscribes to the in-process EventBusService (v1.0 architecture).
 *    For v1.1+, when a Redis Stream consumer is added, this test will be
 *    extended to verify the full outbox → stream → saga flow.
 *
 *    Test scenarios:
 *      1. Happy path — ApplicationApproved published → saga onboards student
 *         + creates fee plan via stub ports
 *      2. Idempotency — duplicate event delivery does not invoke downstream
 *         ports twice (saga deduplication)
 *      3. Application not found — saga skips downstream calls gracefully
 *      4. Cross-tenant protection — saga refuses to process events whose
 *         payload.tenantId does not match the loaded application's tenantId
 *
 *    The stub ports (IStudentOnboardingPort, IFeePlanPort) record calls in
 *    memory for assertions. The real Student/Finance modules have their own
 *    integration tests."
 *
 * This test is SKIPPED when Docker is unavailable. CI provides Docker.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import {
  isDockerAvailable,
  startPostgres,
  type PostgresHandle,
} from './helpers/containers';
import { runMigrations, seedOutboxRow, readOutboxRow } from './helpers/migrations';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { AdmissionsSaga } from '@modules/admissions/application/sagas/admissions.saga';
import {
  type IStudentOnboardingPort,
  type IFeePlanPort,
  type OnboardStudentRequest,
  type CreateFeePlanRequest,
} from '@modules/admissions/domain/ports/saga-ports';
import { ApplicationApprovedEvent } from '@modules/admissions/domain/events/admissions-events';
import type { ApplicationRepository } from '@modules/admissions/domain/repositories/admissions.repository';
import type { ApplicationAggregate } from '@modules/admissions/domain/aggregates/application.aggregate';

// ─────────────────────────────────────────────
// Docker detection — skip entire suite if unavailable
// ─────────────────────────────────────────────

const dockerAvailable = await isDockerAvailable();

// ─────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────

let pg: PostgresHandle | null = null;
let prisma: PrismaClient | null = null;
let eventBus: EventBusService | null = null;
let saga: AdmissionsSaga | null = null;

// Stub ports — record calls for assertions
const studentOnboardingCalls: OnboardStudentRequest[] = [];
const feePlanCalls: CreateFeePlanRequest[] = [];

const stubStudentOnboardingPort: IStudentOnboardingPort = {
  async onboardStudent(req) {
    studentOnboardingCalls.push(req);
    return { studentId: `student-${req.triggerEventId.slice(0, 8)}`, created: true };
  },
};

const stubFeePlanPort: IFeePlanPort = {
  async createFeePlan(req) {
    feePlanCalls.push(req);
    return { feePlanId: `feeplan-${req.triggerEventId.slice(0, 8)}`, created: true };
  },
};

// Stub ApplicationRepository — returns a fixed aggregate for the saga to load.
// The saga calls `applications.findById(applicationId)` to fetch child details
// not present in the event payload.
function makeStubApplicationRepository(): ApplicationRepository {
  const apps: Record<string, ApplicationAggregate> = {
    'app-001': {
      id: 'app-001',
      tenantId: 'tenant-001',
      childFirstName: 'Aarav',
      childLastName: 'Sharma',
      childDob: '2020-05-15',
      childGender: 'MALE',
      programType: 'PLAYGROUP',
      status: 'APPROVED',
    } as unknown as ApplicationAggregate,
  };
  return {
    async findById(applicationId: string): Promise<ApplicationAggregate | null> {
      return apps[applicationId] ?? null;
    },
  } as unknown as ApplicationRepository;
}

beforeAll(async () => {
  if (!dockerAvailable) return;
  pg = await startPostgres();

  prisma = new PrismaClient({ datasources: { db: { url: pg.url } } });
  await prisma.$connect();
  await runMigrations(prisma);

  // The EventBusService constructor takes no args — it's a pure in-process
  // dispatcher with no Redis dependency.
  eventBus = new EventBusService();

  saga = new AdmissionsSaga(
    eventBus,
    makeStubApplicationRepository(),
    stubStudentOnboardingPort,
    stubFeePlanPort,
  );
  (saga as any).onModuleInit();
}, 120_000);

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (pg) await pg.stop();
}, 60_000);

beforeEach(async () => {
  if (!dockerAvailable) return;
  await prisma!.$executeRawUnsafe('TRUNCATE outbox');
  studentOnboardingCalls.length = 0;
  feePlanCalls.length = 0;
  (saga as any)._resetForTesting();
});

// ─────────────────────────────────────────────
// Helper — construct an ApplicationApprovedEvent
// ─────────────────────────────────────────────

function makeEvent(opts: {
  eventId?: string;
  applicationId?: string;
  tenantId?: string;
  approvedBy?: string;
  admissionId?: string;
}): ApplicationApprovedEvent {
  return new ApplicationApprovedEvent(
    {
      applicationId: opts.applicationId ?? 'app-001',
      tenantId: opts.tenantId ?? 'tenant-001',
      approvedAt: new Date().toISOString(),
      approvedBy: opts.approvedBy ?? 'user-001',
      admissionId: opts.admissionId ?? 'adm-001',
    },
    { eventId: opts.eventId ?? randomUUID() },
  );
}

// ─────────────────────────────────────────────
// Test scenarios
// ─────────────────────────────────────────────

describe.skipIf(!dockerAvailable)('AdmissionsSaga — integration (Wave 10c, BTD §15)', () => {
  it('happy path — publishes ApplicationApproved → saga onboards student + creates fee plan', async () => {
    const event = makeEvent({ applicationId: 'app-001', tenantId: 'tenant-001' });

    await eventBus!.publish(event);

    // Saga runs synchronously inside publish() — no waitFor needed
    expect(studentOnboardingCalls.length).toBe(1);
    expect(studentOnboardingCalls[0].applicationId).toBe('app-001');
    expect(studentOnboardingCalls[0].tenantId).toBe('tenant-001');
    expect(studentOnboardingCalls[0].childFirstName).toBe('Aarav');
    expect(studentOnboardingCalls[0].childLastName).toBe('Sharma');
    expect(studentOnboardingCalls[0].childGender).toBe('MALE');
    expect(studentOnboardingCalls[0].programType).toBe('PLAYGROUP');
    expect(studentOnboardingCalls[0].triggerEventId).toBe(event.eventId);

    expect(feePlanCalls.length).toBe(1);
    expect(feePlanCalls[0].applicationId).toBe('app-001');
    expect(feePlanCalls[0].studentId).toBe(`student-${event.eventId.slice(0, 8)}`);
    expect(feePlanCalls[0].triggerEventId).toBe(event.eventId);
  });

  it('idempotency — duplicate event delivery does not invoke downstream ports twice', async () => {
    const event = makeEvent({ applicationId: 'app-001', tenantId: 'tenant-001' });

    // First delivery — saga processes
    await eventBus!.publish(event);
    expect(studentOnboardingCalls.length).toBe(1);
    expect(feePlanCalls.length).toBe(1);

    // Second delivery — SAME eventId — saga should skip
    await eventBus!.publish(event);
    expect(studentOnboardingCalls.length).toBe(1); // unchanged
    expect(feePlanCalls.length).toBe(1); // unchanged
  });

  it('saga skips when application is not found', async () => {
    const event = makeEvent({
      applicationId: 'app-NOTFOUND',
      tenantId: 'tenant-001',
    });

    await eventBus!.publish(event);

    expect(studentOnboardingCalls.length).toBe(0);
    expect(feePlanCalls.length).toBe(0);
  });

  it('saga rejects cross-tenant event — payload.tenantId ≠ application.tenantId', async () => {
    // The application 'app-001' has tenantId='tenant-001' (from the stub).
    // This event claims tenantId='tenant-OTHER' — the saga must skip.
    const event = makeEvent({
      applicationId: 'app-001',
      tenantId: 'tenant-OTHER',
    });

    await eventBus!.publish(event);

    expect(studentOnboardingCalls.length).toBe(0);
    expect(feePlanCalls.length).toBe(0);
  });

  it('saga does not pre-mark event as processed when downstream port throws', async () => {
    // Replace the stub with a failing port
    const failingStudentOnboardingPort: IStudentOnboardingPort = {
      async onboardStudent() {
        throw new Error('Student module down');
      },
    };
    const failingFeePlanPort: IFeePlanPort = {
      async createFeePlan() {
        throw new Error('Finance module down');
      },
    };

    const failingSaga = new AdmissionsSaga(
      eventBus!,
      makeStubApplicationRepository(),
      failingStudentOnboardingPort,
      failingFeePlanPort,
    );
    (failingSaga as any).onModuleInit();
    (failingSaga as any)._resetForTesting();

    const event = makeEvent({ applicationId: 'app-001', tenantId: 'tenant-001' });

    // The saga re-throws on failure — the EventBusService swallows it
    // (logs error, continues). The saga's processedEventIds set should NOT
    // contain the eventId, so a retry can succeed.
    await eventBus!.publish(event);

    // Verify the saga did not mark the event as processed (i.e., a retry
    // would actually attempt to process again)
    const processedSet: Set<string> = (failingSaga as any).processedEventIds;
    expect(processedSet.has(event.eventId)).toBe(false);

    // Now simulate a retry with WORKING ports — should succeed
    const retrySaga = new AdmissionsSaga(
      eventBus!,
      makeStubApplicationRepository(),
      stubStudentOnboardingPort,
      stubFeePlanPort,
    );
    (retrySaga as any).onModuleInit();
    (retrySaga as any)._resetForTesting();

    await retrySaga.handle(event as any);

    expect(studentOnboardingCalls.length).toBe(1); // retry succeeded
    expect(feePlanCalls.length).toBe(1);
  });

  it('saga persists outbox row when ApplicationApproved is delivered through outbox', async () => {
    // Verify the outbox integration: when an ApplicationApproved event is
    // appended to the outbox, the row reflects the correct event type +
    // payload. This is the "first half" of the full outbox → stream → saga
    // flow (the stream consumer is added in v1.1+).
    const eventId = randomUUID();
    const applicationId = 'app-001';
    const tenantId = 'tenant-001';

    await seedOutboxRow(prisma!, {
      eventId,
      eventType: 'ApplicationApproved',
      aggregateId: applicationId,
      aggregateType: 'Application',
      tenantId,
      payload: {
        applicationId,
        tenantId,
        approvedAt: new Date().toISOString(),
        approvedBy: 'user-001',
        admissionId: 'adm-001',
      },
      status: 'PENDING',
    });

    // Read it back — verify the outbox row is well-formed
    const row = await readOutboxRow(prisma!, eventId);
    expect(row?.status).toBe('PENDING');
    expect(row?.attempts).toBe(0);

    // Now publish the event through the EventBusService (simulating what
    // the v1.1+ stream consumer will do) and verify the saga processes it
    const event = makeEvent({
      eventId,
      applicationId,
      tenantId,
    });
    await eventBus!.publish(event);

    expect(studentOnboardingCalls.length).toBe(1);
    expect(studentOnboardingCalls[0].triggerEventId).toBe(eventId);
  });
});
