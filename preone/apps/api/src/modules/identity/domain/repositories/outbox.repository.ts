/**
 * OutboxRepository — port for the transactional outbox pattern (BTD §17.1).
 *
 * Per BTD §13.1 Event Flow:
 *   Aggregate (state change) → Application Service (within transaction)
 *     → Outbox Table (same DB transaction)
 *     → Publisher Worker (polls outbox)
 *     → Event Bus (Redis Stream)
 *     → Subscribers
 *
 * Per BTD §17.1 Outbox Pattern: "DB transaction writes events to outbox table;
 *   publisher drains to stream."
 *
 * The outbox row is written in the SAME Prisma transaction as the aggregate
 * save — guaranteeing at-least-once delivery. The publisher worker polls
 * unpublished rows and pushes them to Redis Streams.
 *
 * Wave 10b additions (BTD §15.3 — Saga Failure Handling):
 *   - pollRetryable(limit) — fetch FAILED rows whose backoff window has elapsed
 *   - markRetryAttempt(eventId, error, nextRetryAt) — increment attempts, set
 *     last_attempt_at, schedule next_retry_at with exponential backoff
 *   - markDeadLetter(eventId, reason) — move to DEAD_LETTER status when
 *     attempts >= max_attempts; requires manual intervention to re-publish
 *
 * Status lifecycle:
 *   PENDING ──publish ok──► PUBLISHED
 *   PENDING ──publish fail──► FAILED (attempts=1, next_retry_at=now()+backoff)
 *   FAILED ──retry ok──► PUBLISHED
 *   FAILED ──retry fail, attempts < max──► FAILED (attempts++, next_retry_at=now()+backoff)
 *   FAILED ──retry fail, attempts >= max──► DEAD_LETTER (dead_letter_reason set)
 */
import type { IntegrationEventEnvelope } from '../events/identity-events';

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxRecord {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  tenantId?: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  /** Wave 10b: when the retry worker last attempted to republish. */
  lastAttemptAt?: string;
  /** Wave 10b: earliest time the retry worker should retry this row. */
  nextRetryAt?: string;
  /** Wave 10b: final failure reason when status = DEAD_LETTER. */
  deadLetterReason?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface OutboxRepository {
  /**
   * Append an integration event to the outbox. MUST be called within the
   * same transaction as the aggregate save.
   */
  append(envelope: IntegrationEventEnvelope): Promise<void>;

  /** Poll unpublished records (oldest first), up to `limit` rows. */
  pollPending(limit: number): Promise<OutboxRecord[]>;

  /** Mark a record as successfully published. */
  markPublished(eventId: string): Promise<void>;

  /** Mark a record as failed (after max retries). */
  markFailed(eventId: string, error: string): Promise<void>;

  // ─── Wave 10b: retry worker methods ───────────────────────────────────

  /**
   * Poll FAILED rows whose backoff window has elapsed (next_retry_at <= now()
   * OR next_retry_at IS NULL), up to `limit` rows. Uses FOR UPDATE SKIP LOCKED
   * so multiple retry workers can run in parallel without double-processing.
   *
   * Per BTD §15.3 — exponential backoff: rows that just failed are not
   * eligible for retry until their next_retry_at window expires.
   */
  pollRetryable(limit: number): Promise<OutboxRecord[]>;

  /**
   * Record a retry attempt failure. Increments attempts, sets last_error,
   * sets last_attempt_at = now(), and schedules next_retry_at = now() + backoff.
   *
   * The caller computes the backoff duration (SagaRetryWorker uses
   * min(2^attempts * baseMs, maxBackoffMs) with jitter).
   *
   * Does NOT change status — the row remains FAILED until either:
   *   - A subsequent retry succeeds → markPublished()
   *   - attempts >= max_attempts → markDeadLetter()
   */
  markRetryAttempt(eventId: string, error: string, nextRetryAt: Date): Promise<void>;

  /**
   * Move a row to DEAD_LETTER status — terminal state requiring manual
   * intervention. Sets dead_letter_reason. The row will no longer be polled
   * by pollRetryable().
   *
   * Per BTD §15.3 — "Permanent failures (invalid payload, missing aggregate)
   * are moved to a dead-letter queue after max_attempts for manual inspection."
   */
  markDeadLetter(eventId: string, reason: string): Promise<void>;
}
