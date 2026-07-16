/**
 * SagaRetryWorker — drains FAILED outbox rows and republishes them with
 * exponential backoff (BTD §15.3 + §17.1).
 *
 * Per BTD §15.3 — Saga Failure Handling:
 *   "Transient failures (network blip, downstream 5xx) are retried with
 *    exponential backoff. Permanent failures (invalid payload, missing
 *    aggregate) are moved to a dead-letter queue after max_attempts (default 5)
 *    for manual inspection."
 *
 * Per BTD §17.1 — Outbox Pattern:
 *   "The publisher drains PENDING rows. A separate retry worker drains
 *    FAILED rows after a backoff window. DEAD_LETTER rows require manual
 *    intervention."
 *
 * Flow:
 *   1. Poll FAILED rows where next_retry_at <= now() (every 30s by default)
 *   2. For each row, attempt to republish to Redis Stream (same stream as
 *      OutboxPublisher — subscribers don't care whether delivery is initial
 *      or retry; they handle idempotency via eventId).
 *   3. On success: markPublished
 *   4. On failure:
 *      a. Compute next backoff: min(2^attempts * BASE_MS, MAX_BACKOFF_MS) + jitter
 *      b. If attempts + 1 >= MAX_ATTEMPTS: markDeadLetter (terminal state)
 *      c. Else: markRetryAttempt (increment attempts, schedule next_retry_at)
 *
 * Backoff schedule (BASE_MS=30s, MAX_BACKOFF_MS=30min, jitter=±20%):
 *   attempt 1 → ~60s     (30s × 2^1, ±20%)
 *   attempt 2 → ~120s
 *   attempt 3 → ~240s
 *   attempt 4 → ~480s
 *   attempt 5 → DEAD_LETTER (max attempts reached)
 *
 * The worker uses FOR UPDATE SKIP LOCKED (in pollRetryable) so multiple
 * worker instances can run in parallel without double-processing.
 *
 * Lifecycle:
 *   - Started by NestJS OnModuleInit (skipped in test env)
 *   - Stopped by OnModuleDestroy (clears the polling timer)
 *   - drain() is exposed publicly for deterministic test invocation
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { RedisService, RedisDb } from '@infra/redis/redis.service';

import { INTEGRATION_EVENT_STREAM } from '../../domain/events/identity-events';
import { PrismaOutboxRepository } from '../../infrastructure/repositories/prisma-outbox.repository';

import type { OutboxRecord } from '../../domain/repositories/outbox.repository';

// ─────────────────────────────────────────────
// Configuration constants
// ─────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000; // 30 seconds — base for exponential growth
const MAX_BACKOFF_MS = 30 * 60_000; // 30 minutes — cap to avoid excessive delays
const JITTER_RATIO = 0.2; // ±20% jitter to avoid thundering herd

// ─────────────────────────────────────────────
// Pure functions — exported for unit testing
// ─────────────────────────────────────────────

/**
 * Compute the next backoff duration for a retry attempt.
 *
 * Formula: min(2^attempts × BASE_BACKOFF_MS, MAX_BACKOFF_MS) × (1 ± JITTER_RATIO)
 *
 * The jitter is uniform in [-JITTER_RATIO, +JITHER_RATIO] of the base backoff.
 * This avoids the "thundering herd" problem where multiple workers retry
 * simultaneously after a downstream outage.
 *
 * @param attempts The current attempt count (BEFORE this retry; will be
 *                 incremented to attempts+1 by markRetryAttempt).
 * @returns Backoff duration in milliseconds.
 */
export function computeBackoffMs(attempts: number): number {
  const exponential = Math.min(
    Math.pow(2, attempts) * BASE_BACKOFF_MS,
    MAX_BACKOFF_MS,
  );
  // Jitter: uniform in [1 - JITTER_RATIO, 1 + JITTER_RATIO]
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * JITTER_RATIO;
  return Math.round(exponential * jitterMultiplier);
}

/**
 * Compute the next retry Date — now + backoff.
 *
 * Pure function exposed for testing — does NOT read the clock inside.
 */
export function computeNextRetryAt(attempts: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + computeBackoffMs(attempts));
}

/**
 * Decide whether a failed row should be moved to DEAD_LETTER.
 *
 * Per BTD §15.3: after MAX_ATTEMPTS retries, move to DEAD_LETTER.
 * Note: `attempts` here is the count BEFORE the current retry attempt.
 * If attempts + 1 >= MAX_ATTEMPTS, the next failure is terminal.
 */
export function shouldDeadLetter(attempts: number): boolean {
  return attempts + 1 >= MAX_ATTEMPTS;
}

// ─────────────────────────────────────────────
// Worker
// ─────────────────────────────────────────────

@Injectable()
export class SagaRetryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SagaRetryWorker.name);
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
    this.logger.log(`SagaRetryWorker started (poll every ${POLL_INTERVAL_MS}ms)`);
    this.timer = setInterval(() => {
      this.drain().catch((err) => {
        this.logger.error(`SagaRetry drain failed: ${(err as Error).message}`);
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
   * Drain one batch of retryable outbox records.
   *
   * Exposed publicly so tests can call it deterministically without waiting
   * for the polling interval.
   *
   * @returns Number of rows successfully republished (0 if no retryable rows).
   */
  async drain(): Promise<{ republished: number; rescheduled: number; deadLettered: number }> {
    const records = await this.outbox.pollRetryable(BATCH_SIZE);
    if (records.length === 0) {
      return { republished: 0, rescheduled: 0, deadLettered: 0 };
    }

    let republished = 0;
    let rescheduled = 0;
    let deadLettered = 0;

    for (const record of records) {
      try {
        await this.publishToStream(record);
        await this.outbox.markPublished(record.eventId);
        republished += 1;
        this.logger.log(
          `Retry OK: event ${record.eventId} (${record.eventType}) republished after ${record.attempts} attempt(s)`,
        );
      } catch (err) {
        const msg = (err as Error).message;
        if (shouldDeadLetter(record.attempts)) {
          // Terminal failure — move to dead-letter queue
          await this.outbox.markDeadLetter(
            record.eventId,
            `Max attempts (${MAX_ATTEMPTS}) reached after retry. Last error: ${msg}`,
          );
          deadLettered += 1;
          this.logger.error(
            `DEAD_LETTER: event ${record.eventId} (${record.eventType}) moved to dead-letter ` +
              `queue after ${record.attempts + 1} attempts. Reason: ${msg}`,
          );
        } else {
          // Schedule next retry with exponential backoff
          const nextRetryAt = computeNextRetryAt(record.attempts);
          await this.outbox.markRetryAttempt(record.eventId, msg, nextRetryAt);
          rescheduled += 1;
          this.logger.warn(
            `Retry FAIL: event ${record.eventId} (${record.eventType}) — attempt ${record.attempts + 1}/${MAX_ATTEMPTS}, ` +
              `next retry at ${nextRetryAt.toISOString()}. Error: ${msg}`,
          );
        }
      }
    }

    if (republished + rescheduled + deadLettered > 0) {
      this.logger.log(
        `SagaRetry drain complete: ${republished} republished, ${rescheduled} rescheduled, ${deadLettered} dead-lettered`,
      );
    }

    return { republished, rescheduled, deadLettered };
  }

  /**
   * Republish an outbox row to the integration event Redis Stream.
   *
   * Identical to OutboxPublisher.publishToStream — subscribers see the same
   * envelope format whether the event is initial or retry. Idempotency is
   * the subscriber's responsibility (via eventId deduplication).
   */
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
      // Wave 10b: include retry metadata for observability
      retryAttempt: record.attempts,
      isRetry: record.attempts > 0,
    });
    await stream.xadd(
      INTEGRATION_EVENT_STREAM,
      'MAXLEN', '~', '100000',
      '*',
      'envelope', envelope,
    );
  }
}
