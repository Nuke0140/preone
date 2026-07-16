/**
 * Unit tests for SagaRetryWorker (Wave 10b, BTD §15.3 + §17.1).
 *
 * Verifies:
 *   - computeBackoffMs grows exponentially, capped at MAX_BACKOFF_MS, with jitter
 *   - computeNextRetryAt adds backoff to "now"
 *   - shouldDeadLetter returns true when attempts+1 >= MAX_ATTEMPTS
 *   - drain() republishes retryable rows and marks them PUBLISHED on success
 *   - drain() reschedules rows with backoff on transient failure
 *   - drain() dead-letters rows that have exhausted max attempts
 *   - drain() is a no-op when pollRetryable returns []
 *   - drain() includes retryAttempt + isRetry metadata in the republished envelope
 *   - start()/stop() manage the polling timer
 *   - onModuleInit() skips start in test env (NODE_ENV=test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  SagaRetryWorker,
  computeBackoffMs,
  computeNextRetryAt,
  shouldDeadLetter,
} from '@modules/identity/infrastructure/jobs/saga-retry.worker';
import { PrismaOutboxRepository } from '@modules/identity/infrastructure/repositories/prisma-outbox.repository';
import { RedisService } from '@infra/redis/redis.service';

import type { OutboxRecord } from '@modules/identity/domain/repositories/outbox.repository';

// ─────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────

function makeRecord(overrides: Partial<OutboxRecord> = {}): OutboxRecord {
  return {
    id: 'row-1',
    eventId: 'evt-001',
    eventType: 'UserOnboarded.v1',
    aggregateId: 'agg-1',
    aggregateType: 'User',
    tenantId: 'tenant-1',
    payload: { foo: 'bar' },
    status: 'FAILED',
    attempts: 1,
    lastError: 'transient',
    lastAttemptAt: new Date(Date.now() - 60_000).toISOString(),
    nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    publishedAt: undefined,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
    ...overrides,
  };
}

function makeRedisStub(shouldFail = false) {
  const xaddCalls: any[] = [];
  return {
    _xaddCalls: xaddCalls,
    forDb: () => ({
      xadd: async (...args: any[]) => {
        xaddCalls.push(args);
        if (shouldFail) throw new Error('Redis Stream unavailable');
        return '0-1';
      },
    }),
  };
}

function makeWorker(opts: {
  outbox: Partial<PrismaOutboxRepository>;
  redis: any;
}): SagaRetryWorker {
  const outbox = {
    pollRetryable: vi.fn(async (): Promise<OutboxRecord[]> => []),
    markPublished: vi.fn(async (_id: string) => undefined),
    markRetryAttempt: vi.fn(async (_id: string, _err: string, _next: Date) => undefined),
    markDeadLetter: vi.fn(async (_id: string, _reason: string) => undefined),
    ...opts.outbox,
  } as unknown as PrismaOutboxRepository;

  const redis = opts.redis as unknown as RedisService;
  return new SagaRetryWorker(outbox, redis);
}

// ─────────────────────────────────────────────
// Pure function tests
// ─────────────────────────────────────────────

describe('computeBackoffMs (Wave 10b)', () => {
  beforeEach(() => {
    // Mock Math.random to return 0.5 (no jitter) for deterministic assertions
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns 2^attempts × 30s with no jitter (Math.random=0.5)', () => {
    // Math.random=0.5 → jitter multiplier = 1 + (0.5*2 - 1) * 0.2 = 1.0 (no change)
    expect(computeBackoffMs(1)).toBe(60_000); // 2^1 × 30s × 1.0
    expect(computeBackoffMs(2)).toBe(120_000); // 2^2 × 30s × 1.0
    expect(computeBackoffMs(3)).toBe(240_000); // 2^3 × 30s × 1.0
    expect(computeBackoffMs(4)).toBe(480_000); // 2^4 × 30s × 1.0
  });

  it('caps at MAX_BACKOFF_MS (30 minutes)', () => {
    expect(computeBackoffMs(10)).toBe(30 * 60_000); // 2^10 × 30s = 512min → capped at 30min
    expect(computeBackoffMs(20)).toBe(30 * 60_000);
  });

  it('applies jitter in [-20%, +20%] range', () => {
    vi.restoreAllMocks();
    // Mock Math.random to return 1.0 → max positive jitter
    vi.spyOn(Math, 'random').mockReturnValue(1.0);
    const maxJitter = computeBackoffMs(1);
    // 2^1 × 30s × 1.2 = 72000
    expect(maxJitter).toBe(72_000);

    // Mock Math.random to return 0.0 → max negative jitter
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const minJitter = computeBackoffMs(1);
    // 2^1 × 30s × 0.8 = 48000
    expect(minJitter).toBe(48_000);

    vi.restoreAllMocks();
  });
});

describe('computeNextRetryAt (Wave 10b)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('returns a Date ~now + backoff', () => {
    const now = new Date('2026-07-16T10:00:00Z');
    const next = computeNextRetryAt(1, now);
    expect(next.getTime() - now.getTime()).toBe(60_000); // 1 minute
  });

  it('does not mutate the input Date', () => {
    const now = new Date('2026-07-16T10:00:00Z');
    const original = now.getTime();
    computeNextRetryAt(2, now);
    expect(now.getTime()).toBe(original);
  });
});

describe('shouldDeadLetter (Wave 10b)', () => {
  it('returns false for low attempt counts', () => {
    expect(shouldDeadLetter(0)).toBe(false);
    expect(shouldDeadLetter(1)).toBe(false);
    expect(shouldDeadLetter(2)).toBe(false);
    expect(shouldDeadLetter(3)).toBe(false);
  });

  it('returns true when attempts+1 >= MAX_ATTEMPTS (5)', () => {
    expect(shouldDeadLetter(4)).toBe(true); // 4+1 = 5 >= 5
    expect(shouldDeadLetter(5)).toBe(true);
    expect(shouldDeadLetter(10)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// drain() — happy path
// ─────────────────────────────────────────────

describe('SagaRetryWorker.drain() — happy path (Wave 10b)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('republishes retryable rows and marks them PUBLISHED', async () => {
    const record = makeRecord({ eventId: 'evt-ok', attempts: 1 });
    const redis = makeRedisStub(false);
    const worker = makeWorker({
      outbox: { pollRetryable: vi.fn(async () => [record]) },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 1, rescheduled: 0, deadLettered: 0 });
    expect(redis._xaddCalls.length).toBe(1);
    // Verify envelope includes retryAttempt + isRetry metadata
    const envelopeArg = redis._xaddCalls[0].find((a: any) => typeof a === 'string' && a.startsWith('{'));
    const envelope = JSON.parse(envelopeArg);
    expect(envelope.eventId).toBe('evt-ok');
    expect(envelope.retryAttempt).toBe(1);
    expect(envelope.isRetry).toBe(true);
  });

  it('sets isRetry=false when attempts=0 (first retry of an initially-failed row)', async () => {
    const record = makeRecord({ eventId: 'evt-first', attempts: 0 });
    const redis = makeRedisStub(false);
    const worker = makeWorker({
      outbox: { pollRetryable: vi.fn(async () => [record]) },
      redis,
    });

    await worker.drain();

    const envelopeArg = redis._xaddCalls[0].find((a: any) => typeof a === 'string' && a.startsWith('{'));
    const envelope = JSON.parse(envelopeArg);
    expect(envelope.retryAttempt).toBe(0);
    expect(envelope.isRetry).toBe(false);
  });

  it('is a no-op when pollRetryable returns []', async () => {
    const redis = makeRedisStub(false);
    const worker = makeWorker({
      outbox: { pollRetryable: vi.fn(async () => []) },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 0, rescheduled: 0, deadLettered: 0 });
    expect(redis._xaddCalls.length).toBe(0);
  });

  it('processes multiple rows in a single drain', async () => {
    const records = [
      makeRecord({ eventId: 'evt-a', attempts: 1 }),
      makeRecord({ eventId: 'evt-b', attempts: 2 }),
      makeRecord({ eventId: 'evt-c', attempts: 1 }),
    ];
    const redis = makeRedisStub(false);
    const worker = makeWorker({
      outbox: { pollRetryable: vi.fn(async () => records) },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 3, rescheduled: 0, deadLettered: 0 });
    expect(redis._xaddCalls.length).toBe(3);
  });
});

// ─────────────────────────────────────────────
// drain() — transient failure → reschedule
// ─────────────────────────────────────────────

describe('SagaRetryWorker.drain() — transient failure (Wave 10b)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('reschedules with exponential backoff on transient failure', async () => {
    const record = makeRecord({ eventId: 'evt-retry', attempts: 1 });
    const redis = makeRedisStub(true); // throws
    const markRetryAttempt = vi.fn(async (_id: string, _err: string, _next: Date) => undefined);
    const worker = makeWorker({
      outbox: {
        pollRetryable: vi.fn(async () => [record]),
        markRetryAttempt,
      },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 0, rescheduled: 1, deadLettered: 0 });
    expect(markRetryAttempt).toHaveBeenCalledTimes(1);
    const [eventId, error, nextRetryAt] = markRetryAttempt.mock.calls[0];
    expect(eventId).toBe('evt-retry');
    expect(error).toContain('Redis Stream unavailable');
    // attempts=1 → backoff = 2^1 × 30s × 1.0 = 60s
    expect(nextRetryAt).toBeInstanceOf(Date);
    const backoffMs = nextRetryAt.getTime() - Date.now();
    expect(backoffMs).toBeGreaterThan(50_000);
    expect(backoffMs).toBeLessThan(70_000);
  });

  it('does not call markPublished on failure', async () => {
    const record = makeRecord({ eventId: 'evt-x', attempts: 1 });
    const redis = makeRedisStub(true);
    const markPublished = vi.fn(async (_id: string) => undefined);
    const worker = makeWorker({
      outbox: {
        pollRetryable: vi.fn(async () => [record]),
        markPublished,
      },
      redis,
    });

    await worker.drain();

    expect(markPublished).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// drain() — terminal failure → dead-letter
// ─────────────────────────────────────────────

describe('SagaRetryWorker.drain() — dead-letter (Wave 10b)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('moves to DEAD_LETTER when attempts+1 >= MAX_ATTEMPTS', async () => {
    // attempts=4 → shouldDeadLetter(4) = true (4+1=5 >= 5)
    const record = makeRecord({ eventId: 'evt-dlq', attempts: 4 });
    const redis = makeRedisStub(true);
    const markDeadLetter = vi.fn(async (_id: string, _reason: string) => undefined);
    const markRetryAttempt = vi.fn(async (_id: string, _err: string, _next: Date) => undefined);
    const worker = makeWorker({
      outbox: {
        pollRetryable: vi.fn(async () => [record]),
        markDeadLetter,
        markRetryAttempt,
      },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 0, rescheduled: 0, deadLettered: 1 });
    expect(markDeadLetter).toHaveBeenCalledTimes(1);
    const [eventId, reason] = markDeadLetter.mock.calls[0];
    expect(eventId).toBe('evt-dlq');
    expect(reason).toContain('Max attempts (5) reached');
    expect(reason).toContain('Redis Stream unavailable');
    // Should NOT have been rescheduled
    expect(markRetryAttempt).not.toHaveBeenCalled();
  });

  it('does not dead-letter when attempts+1 < MAX_ATTEMPTS', async () => {
    const record = makeRecord({ eventId: 'evt-no-dlq', attempts: 3 });
    const redis = makeRedisStub(true);
    const markDeadLetter = vi.fn(async () => undefined);
    const worker = makeWorker({
      outbox: {
        pollRetryable: vi.fn(async () => [record]),
        markDeadLetter,
      },
      redis,
    });

    await worker.drain();

    // attempts=3 → 3+1=4 < 5 → reschedule, not dead-letter
    expect(markDeadLetter).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// drain() — mixed batch
// ─────────────────────────────────────────────

describe('SagaRetryWorker.drain() — mixed batch (Wave 10b)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  it('handles a mix of success, retry, and dead-letter in one drain', async () => {
    // Row 1: succeeds (attempts=1, redis OK)
    // Row 2: fails (attempts=2, redis throws → reschedule)
    // Row 3: fails terminally (attempts=4, redis throws → dead-letter)
    const records = [
      makeRecord({ eventId: 'ok', attempts: 1 }),
      makeRecord({ eventId: 'retry', attempts: 2 }),
      makeRecord({ eventId: 'dlq', attempts: 4 }),
    ];

    // Redis stub: fail for 'retry' and 'dlq' but succeed for 'ok'
    const xaddCalls: any[] = [];
    const redis = {
      _xaddCalls: xaddCalls,
      forDb: () => ({
        xadd: async (...args: any[]) => {
          xaddCalls.push(args);
          const envelope = JSON.parse(args.find((a: any) => typeof a === 'string' && a.startsWith('{')));
          if (envelope.eventId === 'retry' || envelope.eventId === 'dlq') {
            throw new Error('Redis Stream unavailable');
          }
          return '0-1';
        },
      }),
    };

    const markPublished = vi.fn(async (id: string) => undefined);
    const markRetryAttempt = vi.fn(async (_id: string, _err: string, _next: Date) => undefined);
    const markDeadLetter = vi.fn(async (_id: string, _reason: string) => undefined);

    const worker = makeWorker({
      outbox: {
        pollRetryable: vi.fn(async () => records),
        markPublished,
        markRetryAttempt,
        markDeadLetter,
      },
      redis,
    });

    const result = await worker.drain();

    expect(result).toEqual({ republished: 1, rescheduled: 1, deadLettered: 1 });
    expect(markPublished).toHaveBeenCalledWith('ok');
    expect(markRetryAttempt).toHaveBeenCalledTimes(1);
    expect(markRetryAttempt.mock.calls[0][0]).toBe('retry');
    expect(markDeadLetter).toHaveBeenCalledTimes(1);
    expect(markDeadLetter.mock.calls[0][0]).toBe('dlq');
  });
});

// ─────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────

describe('SagaRetryWorker lifecycle (Wave 10b)', () => {
  it('start() schedules the polling interval', () => {
    const setSpy = vi.spyOn(global, 'setInterval').mockReturnValue({} as any);
    const worker = makeWorker({ outbox: {}, redis: makeRedisStub() });
    worker.start();
    expect(setSpy).toHaveBeenCalled();
    worker.stop();
    setSpy.mockRestore();
  });

  it('stop() clears the polling interval', () => {
    const fakeHandle = {} as NodeJS.Timeout;
    vi.spyOn(global, 'setInterval').mockReturnValue(fakeHandle);
    const clearSpy = vi.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
    const worker = makeWorker({ outbox: {}, redis: makeRedisStub() });
    worker.start();
    worker.stop();
    expect(clearSpy).toHaveBeenCalledWith(fakeHandle);
    vi.restoreAllMocks();
  });

  it('start() is idempotent — calling twice does not start two timers', () => {
    const setSpy = vi.spyOn(global, 'setInterval').mockReturnValue({} as any);
    const worker = makeWorker({ outbox: {}, redis: makeRedisStub() });
    worker.start();
    worker.start();
    expect(setSpy).toHaveBeenCalledTimes(1);
    worker.stop();
    setSpy.mockRestore();
  });

  it('onModuleInit() does not start the timer when NODE_ENV=test', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const setSpy = vi.spyOn(global, 'setInterval').mockReturnValue({} as any);
    const worker = makeWorker({ outbox: {}, redis: makeRedisStub() });
    worker.onModuleInit();
    expect(setSpy).not.toHaveBeenCalled();
    worker.onModuleDestroy();
    process.env.NODE_ENV = originalEnv;
    setSpy.mockRestore();
  });

  it('onModuleInit() starts the timer when NODE_ENV is not test', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const setSpy = vi.spyOn(global, 'setInterval').mockReturnValue({} as any);
    const worker = makeWorker({ outbox: {}, redis: makeRedisStub() });
    worker.onModuleInit();
    expect(setSpy).toHaveBeenCalled();
    worker.onModuleDestroy();
    process.env.NODE_ENV = originalEnv;
    setSpy.mockRestore();
  });
});
