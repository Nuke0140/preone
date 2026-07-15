/**
 * Unit tests for OutboxPublisher — drains outbox → Redis Stream (BTD §13.1, §17.1).
 *
 * Verifies:
 *   - Polls PENDING records, publishes each to Redis Stream
 *   - On publish success: marks record PUBLISHED
 *   - On publish failure (after max attempts): marks FAILED
 *   - Empty outbox returns 0 published
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { OutboxPublisher } from '@modules/identity/infrastructure/jobs/outbox-publisher';
import { PrismaOutboxRepository } from '@modules/identity/infrastructure/repositories/prisma-outbox.repository';
import { RedisService, RedisDb } from '@infra/redis/redis.service';

import type { OutboxRecord } from '@modules/identity/domain/repositories/outbox.repository';

function makeRecord(overrides: Partial<OutboxRecord> = {}): OutboxRecord {
  return {
    id: 'rec-001',
    eventId: 'evt-001',
    eventType: 'UserOnboarded.v1',
    aggregateId: 'user-001',
    aggregateType: 'User',
    tenantId: 'sch-001',
    payload: { userId: 'user-001', email: 'a@b.com' },
    status: 'PENDING',
    attempts: 0,
    createdAt: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

function mockRedis(xaddImpl: (stream: string, ...args: any[]) => Promise<string>) {
  const streamClient = {
    xadd: vi.fn(xaddImpl),
  };
  return {
    forDb: vi.fn(() => streamClient),
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
  } as unknown as RedisService;
}

function mockOutbox(opts: {
  pending?: OutboxRecord[];
  publishShouldFail?: boolean;
} = {}) {
  return {
    pollPending: vi.fn(async () => opts.pending ?? []),
    markPublished: vi.fn(async () => undefined),
    markFailed: vi.fn(async () => undefined),
    append: vi.fn(async () => undefined),
  } as unknown as PrismaOutboxRepository;
}

describe('OutboxPublisher — BTD §13.1 + §17.1', () => {
  let outbox: PrismaOutboxRepository;
  let redis: RedisService;
  let publisher: OutboxPublisher;

  beforeEach(() => {
    outbox = mockOutbox();
    redis = mockRedis(async () => '1234-0');
    publisher = new OutboxPublisher(outbox, redis);
  });

  describe('drain()', () => {
    it('should return 0 when outbox is empty', async () => {
      const count = await publisher.drain();
      expect(count).toBe(0);
      expect(outbox.pollPending).toHaveBeenCalledWith(50);
    });

    it('should publish each pending record to Redis Stream', async () => {
      const records = [makeRecord(), makeRecord({ eventId: 'evt-002', id: 'rec-002' })];
      outbox.pollPending.mockResolvedValueOnce(records);

      const count = await publisher.drain();

      expect(count).toBe(2);
      const stream = (redis.forDb as any).mock.results[0].value;
      expect(stream.xadd).toHaveBeenCalledTimes(2);
      expect(stream.xadd).toHaveBeenCalledWith(
        'preone:integration-events',
        'MAXLEN', '~', '100000',
        '*',
        'envelope',
        expect.stringContaining('UserOnboarded.v1'),
      );
    });

    it('should mark each record as PUBLISHED on success', async () => {
      const records = [makeRecord({ eventId: 'evt-001' }), makeRecord({ eventId: 'evt-002', id: 'rec-002' })];
      outbox.pollPending.mockResolvedValueOnce(records);

      await publisher.drain();

      expect(outbox.markPublished).toHaveBeenCalledWith('evt-001');
      expect(outbox.markPublished).toHaveBeenCalledWith('evt-002');
    });

    it('should mark FAILED after MAX_ATTEMPTS reached', async () => {
      const records = [makeRecord({ eventId: 'evt-fail', attempts: 4 })]; // attempts+1=5=max
      outbox.pollPending.mockResolvedValueOnce(records);
      redis = mockRedis(async () => { throw new Error('Redis Stream unavailable'); });
      publisher = new OutboxPublisher(outbox, redis);

      await publisher.drain();

      expect(outbox.markFailed).toHaveBeenCalledWith('evt-fail', 'Redis Stream unavailable');
      expect(outbox.markPublished).not.toHaveBeenCalled();
    });

    it('should NOT mark FAILED before max attempts (retry)', async () => {
      const records = [makeRecord({ eventId: 'evt-retry', attempts: 1 })]; // attempts+1=2 < 5
      outbox.pollPending.mockResolvedValueOnce(records);
      redis = mockRedis(async () => { throw new Error('transient'); });
      publisher = new OutboxPublisher(outbox, redis);

      await publisher.drain();

      expect(outbox.markFailed).not.toHaveBeenCalled();
      expect(outbox.markPublished).not.toHaveBeenCalled();
    });

    it('should serialize envelope as JSON with required fields', async () => {
      const record = makeRecord({
        eventId: 'evt-001',
        eventType: 'UserOnboarded.v1',
        tenantId: 'sch-001',
        aggregateId: 'user-001',
        aggregateType: 'User',
        payload: { userId: 'user-001', email: 'priya@school.com' },
      });
      outbox.pollPending.mockResolvedValueOnce([record]);

      await publisher.drain();

      const stream = (redis.forDb as any).mock.results[0].value;
      const envelopeArg = stream.xadd.mock.calls[0][6]; // 7th positional arg
      const parsed = JSON.parse(envelopeArg);
      expect(parsed.eventId).toBe('evt-001');
      expect(parsed.eventType).toBe('UserOnboarded.v1');
      expect(parsed.aggregateId).toBe('user-001');
      expect(parsed.tenantId).toBe('sch-001');
      expect(parsed.payload.userId).toBe('user-001');
    });

    it('should use Redis DB 6 (PUBSUB) for stream', async () => {
      outbox.pollPending.mockResolvedValueOnce([makeRecord()]);
      await publisher.drain();
      expect(redis.forDb).toHaveBeenCalledWith(RedisDb.PUBSUB);
    });
  });

  describe('start()/stop()', () => {
    it('should be safe to start multiple times', () => {
      publisher.start();
      publisher.start();
      // Should not throw — idempotent
    });

    it('should be safe to stop without starting', () => {
      publisher.stop();
      // Should not throw
    });
  });
});
