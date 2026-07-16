/**
 * Integration test — SagaRetryWorker with real Postgres + Redis (BTD §15.3, §17.1).
 *
 * Per BTD §24 — Integration Testing:
 *   "Integration tests verify the outbox retry path against a real Postgres
 *    16 + Redis 7. The test seeds a FAILED outbox row, invokes
 *    SagaRetryWorker.drain(), and asserts that:
 *      - The row is republished to the Redis stream
 *      - The row is marked PUBLISHED in Postgres
 *      - Retry metadata (retryAttempt, isRetry) is included in the envelope
 *
 *    A second scenario seeds a row that fails republish — the worker should
 *    increment attempts and schedule the next retry with exponential backoff.
 *
 *    A third scenario seeds a row at MAX_ATTEMPTS-1 — the next failure should
 *    move it to DEAD_LETTER."
 *
 * This test is SKIPPED when Docker is unavailable (e.g., local dev without
 * Docker). CI provides Docker — the test runs there.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import IORedis from 'ioredis';

import {
  isDockerAvailable,
  startPostgres,
  startRedis,
  type PostgresHandle,
  type RedisHandle,
} from './helpers/containers';
import { runMigrations, seedOutboxRow, readOutboxRow } from './helpers/migrations';

import { PrismaOutboxRepository } from '@modules/identity/infrastructure/repositories/prisma-outbox.repository';
import { SagaRetryWorker } from '@modules/identity/infrastructure/jobs/saga-retry.worker';
import { RedisService, RedisDb } from '@infra/redis/redis.service';

import type { IntegrationEventEnvelope } from '@modules/identity/domain/events/identity-events';

// ─────────────────────────────────────────────
// Docker detection — skip entire suite if unavailable
// ─────────────────────────────────────────────

const dockerAvailable = await isDockerAvailable();

// ─────────────────────────────────────────────
// Shared container state — one Postgres + one Redis for this test file
// ─────────────────────────────────────────────

let pg: PostgresHandle | null = null;
let redis: RedisHandle | null = null;
let prisma: PrismaClient | null = null;
let redisService: RedisService | null = null;
let streamConsumer: IORedis | null = null;

const INTEGRATION_EVENT_STREAM = 'preone:integration-events';

beforeAll(async () => {
  if (!dockerAvailable) return;
  pg = await startPostgres();
  redis = await startRedis();

  prisma = new PrismaClient({ datasources: { db: { url: pg.url } } });
  await prisma.$connect();

  // Apply all migrations (outbox + audit_log + retry schema)
  await runMigrations(prisma);

  // Build a minimal RedisService stub that points at the testcontainer.
  // We don't boot the full NestJS module graph — the worker only needs
  // redis.forDb(RedisDb.PUBSUB).xadd(...).
  redisService = {
    forDb: (_db: RedisDb) => {
      const client = new IORedis({ host: redis!.host, port: redis!.port, db: 0 });
      return client;
    },
  } as unknown as RedisService;

  // Set up a stream consumer that reads from the integration event stream.
  // We use XREAD instead of a consumer group so we don't have to manage ACKs.
  streamConsumer = new IORedis({ host: redis.host, port: redis.port, db: 0 });
}, 120_000);

afterAll(async () => {
  if (streamConsumer) await streamConsumer.quit();
  if (prisma) await prisma.$disconnect();
  if (pg) await pg.stop();
  if (redis) await redis.stop();
}, 60_000);

beforeEach(async () => {
  if (!dockerAvailable) return;
  // Clean outbox + Redis stream between tests
  await prisma!.$executeRawUnsafe('TRUNCATE outbox');
  await streamConsumer!.del(INTEGRATION_EVENT_STREAM);
});

// ─────────────────────────────────────────────
// Helper: drain the Redis stream and return all envelopes received
// ─────────────────────────────────────────────

async function readStreamMessages(count: number, timeoutMs = 3_000): Promise<IntegrationEventEnvelope[]> {
  const envelopes: IntegrationEventEnvelope[] = [];
  const deadline = Date.now() + timeoutMs;

  while (envelopes.length < count && Date.now() < deadline) {
    // XREAD BLOCK 500 streams preone:integration-events $
    const reply = await streamConsumer!.xread(
      'COUNT', count - envelopes.length,
      'BLOCK', 500,
      'STREAMS', INTEGRATION_EVENT_STREAM, '$',
    );
    if (!reply) continue;
    for (const [, fields] of reply) {
      // fields is a flat array [key, value, key, value, ...]
      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === 'envelope') {
          envelopes.push(JSON.parse(fields[i + 1] as string));
        }
      }
    }
  }

  return envelopes;
}

// ─────────────────────────────────────────────
// Test scenarios
// ─────────────────────────────────────────────

describe.skipIf(!dockerAvailable)('SagaRetryWorker — integration (Wave 10c, BTD §15.3 + §17.1)', () => {
  it('republishes a FAILED outbox row to the Redis stream and marks it PUBLISHED', async () => {
    const eventId = '00000000-0000-7000-8000-000000000001';
    await seedOutboxRow(prisma!, {
      eventId,
      eventType: 'UserOnboarded.v1',
      aggregateId: '00000000-0000-7000-8000-000000000aaa',
      tenantId: '00000000-0000-7000-8000-000000000bbb',
      payload: { userId: 'u1', tenantId: '00000000-0000-7000-8000-000000000bbb' },
      status: 'FAILED',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 60_000), // past — eligible for retry
    });

    const outbox = new PrismaOutboxRepository(prisma!);
    const worker = new SagaRetryWorker(outbox, redisService!);

    const result = await worker.drain();

    expect(result.republished).toBe(1);
    expect(result.rescheduled).toBe(0);
    expect(result.deadLettered).toBe(0);

    // Verify the row is now PUBLISHED in Postgres
    const row = await readOutboxRow(prisma!, eventId);
    expect(row?.status).toBe('PUBLISHED');
    expect(row?.publishedAt).not.toBeNull();
    expect(row?.attempts).toBe(2); // 1 prior + 1 successful retry

    // Verify the envelope was published to Redis stream
    const envelopes = await readStreamMessages(1);
    expect(envelopes.length).toBe(1);
    expect(envelopes[0].eventId).toBe(eventId);
    expect(envelopes[0].eventType).toBe('UserOnboarded.v1');
    // retryAttempt + isRetry metadata included
    expect((envelopes[0] as any).retryAttempt).toBe(1);
    expect((envelopes[0] as any).isRetry).toBe(true);
  });

  it('reschedules with exponential backoff when republish fails', async () => {
    const eventId = '00000000-0000-7000-8000-000000000002';
    await seedOutboxRow(prisma!, {
      eventId,
      status: 'FAILED',
      attempts: 2,
      nextRetryAt: new Date(Date.now() - 1_000), // eligible
    });

    const outbox = new PrismaOutboxRepository(prisma!);

    // Build a worker with a Redis service that throws on xadd
    const failingRedisService = {
      forDb: () => ({
        xadd: async () => { throw new Error('Redis Stream unavailable (test)'); },
      }),
    } as unknown as RedisService;

    const worker = new SagaRetryWorker(outbox, failingRedisService);
    // Make Math.random deterministic for the backoff assertion
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const result = await worker.drain();
    vi.restoreAllMocks();

    expect(result.republished).toBe(0);
    expect(result.rescheduled).toBe(1);
    expect(result.deadLettered).toBe(0);

    const row = await readOutboxRow(prisma!, eventId);
    expect(row?.status).toBe('FAILED');
    expect(row?.attempts).toBe(3); // 2 prior + 1 failed retry
    expect(row?.lastError).toContain('Redis Stream unavailable (test)');
    expect(row?.lastAttemptAt).not.toBeNull();
    expect(row?.nextRetryAt).not.toBeNull();
    // Backoff for attempts=2 → 2^2 × 30s = 120s ± 20% → ~96-144s
    const backoffMs = row!.nextRetryAt!.getTime() - Date.now();
    expect(backoffMs).toBeGreaterThan(90_000);
    expect(backoffMs).toBeLessThan(150_000);
  });

  it('moves a row to DEAD_LETTER when attempts+1 reaches MAX_ATTEMPTS (5)', async () => {
    const eventId = '00000000-0000-7000-8000-000000000003';
    await seedOutboxRow(prisma!, {
      eventId,
      status: 'FAILED',
      attempts: 4, // 4+1=5 ≥ MAX_ATTEMPTS → dead-letter on next failure
      nextRetryAt: new Date(Date.now() - 1_000),
    });

    const outbox = new PrismaOutboxRepository(prisma!);
    const failingRedisService = {
      forDb: () => ({
        xadd: async () => { throw new Error('Permanent stream failure'); },
      }),
    } as unknown as RedisService;

    const worker = new SagaRetryWorker(outbox, failingRedisService);

    const result = await worker.drain();

    expect(result.republished).toBe(0);
    expect(result.rescheduled).toBe(0);
    expect(result.deadLettered).toBe(1);

    const row = await readOutboxRow(prisma!, eventId);
    expect(row?.status).toBe('DEAD_LETTER');
    expect(row?.deadLetterReason).toContain('Max attempts (5) reached');
    expect(row?.deadLetterReason).toContain('Permanent stream failure');
    expect(row?.nextRetryAt).toBeNull(); // dead-lettered rows don't retry
  });

  it('is a no-op when no FAILED rows are eligible for retry', async () => {
    // Seed a PENDING row — retry worker should NOT touch it
    await seedOutboxRow(prisma!, {
      eventId: '00000000-0000-7000-8000-000000000004',
      status: 'PENDING',
    });
    // Seed a FAILED row whose next_retry_at is in the future — NOT eligible
    await seedOutboxRow(prisma!, {
      eventId: '00000000-0000-7000-8000-000000000005',
      status: 'FAILED',
      attempts: 1,
      nextRetryAt: new Date(Date.now() + 60_000), // future — not eligible
    });

    const outbox = new PrismaOutboxRepository(prisma!);
    const worker = new SagaRetryWorker(outbox, redisService!);

    const result = await worker.drain();

    expect(result.republished).toBe(0);
    expect(result.rescheduled).toBe(0);
    expect(result.deadLettered).toBe(0);

    // Both rows untouched
    const pending = await readOutboxRow(prisma!, '00000000-0000-7000-8000-000000000004');
    expect(pending?.status).toBe('PENDING');
    const futureRetry = await readOutboxRow(prisma!, '00000000-0000-7000-8000-000000000005');
    expect(futureRetry?.status).toBe('FAILED');
    expect(futureRetry?.attempts).toBe(1); // unchanged
  });

  it('respects backoff window — does not retry rows whose next_retry_at is in the future', async () => {
    const eventId = '00000000-0000-7000-8000-000000000006';
    const futureRetryAt = new Date(Date.now() + 5 * 60_000); // 5 min in future
    await seedOutboxRow(prisma!, {
      eventId,
      status: 'FAILED',
      attempts: 1,
      nextRetryAt: futureRetryAt,
    });

    const outbox = new PrismaOutboxRepository(prisma!);
    const worker = new SagaRetryWorker(outbox, redisService!);

    const result = await worker.drain();

    expect(result.republished).toBe(0);
    expect(result.rescheduled).toBe(0);
    expect(result.deadLettered).toBe(0);

    const row = await readOutboxRow(prisma!, eventId);
    expect(row?.status).toBe('FAILED');
    expect(row?.attempts).toBe(1); // unchanged
    // next_retry_at should be unchanged (not advanced)
    expect(row?.nextRetryAt).not.toBeNull();
    const drift = Math.abs(row!.nextRetryAt!.getTime() - futureRetryAt.getTime());
    expect(drift).toBeLessThan(1_000); // within 1 second
  });
});
