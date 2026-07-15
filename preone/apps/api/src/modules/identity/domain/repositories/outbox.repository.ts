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
 */
import type { IntegrationEventEnvelope } from '../events/identity-events';

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

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
}
