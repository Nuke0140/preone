/**
 * OutboxPublisher — drains the outbox table to Redis Streams.
 *
 * Per BTD §13.1 Event Flow:
 *   Publisher Worker (polls outbox) → Event Bus (Redis Stream) → Subscribers
 *
 * Per BTD §17.1 Outbox Pattern:
 *   - Polls PENDING rows from outbox table (FOR UPDATE SKIP LOCKED)
 *   - Pushes each row to the integration event Redis Stream
 *   - On success: marks row PUBLISHED
 *   - On failure (after 5 attempts): marks FAILED + logs error
 *
 * Runs as a periodic job — every 2 seconds by default.
 * Multiple workers can run in parallel — SKIP LOCKED ensures each row
 * is processed by exactly one worker.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { RedisService, RedisDb } from '@infra/redis/redis.service';

import { INTEGRATION_EVENT_STREAM } from '../../domain/events/identity-events';
import { PrismaOutboxRepository } from '../../infrastructure/repositories/prisma-outbox.repository';

import type { OutboxRecord } from '../../domain/repositories/outbox.repository';

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly outbox: PrismaOutboxRepository,
    private readonly redis: RedisService,
  ) {}

  onModuleInit(): void {
    // Start the polling loop — but only in non-test envs
    if (process.env.NODE_ENV !== 'test') {
      this.start();
    }
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log(`OutboxPublisher started (poll every ${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => {
      this.drain().catch((err) => {
        this.logger.error(`Outbox drain failed: ${(err as Error).message}`);
      });
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /**
   * Drain one batch of pending outbox records.
   * Exposed publicly so tests can call it deterministically.
   */
  async drain(): Promise<number> {
    const records = await this.outbox.pollPending(BATCH_SIZE);
    if (records.length === 0) return 0;

    let published = 0;
    for (const record of records) {
      try {
        await this.publishToStream(record);
        await this.outbox.markPublished(record.eventId);
        published += 1;
      } catch (err) {
        const msg = (err as Error).message;
        this.logger.error(
          `Failed to publish outbox event ${record.eventId} (${record.eventType}): ${msg}`,
        );
        if (record.attempts + 1 >= MAX_ATTEMPTS) {
          await this.outbox.markFailed(record.eventId, msg);
          this.logger.warn(
            `Outbox event ${record.eventId} marked FAILED after ${MAX_ATTEMPTS} attempts`,
          );
        }
      }
    }
    return published;
  }

  private async publishToStream(record: OutboxRecord): Promise<void> {
    const stream = this.redis.forDb(RedisDb.PUBSUB);
    const envelope = JSON.stringify({
      eventId: record.eventId,
      eventType: record.eventType,
      schemaVersion: 'v1',
      occurredAt: record.createdAt,
      tenantId: record.tenantId,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      payload: record.payload,
    });
    // XADD with MAXLEN ~ 100k — keeps stream bounded (TTL on stream side)
    await stream.xadd(
      INTEGRATION_EVENT_STREAM,
      'MAXLEN', '~', '100000',
      '*',
      'envelope', envelope,
    );
  }
}
