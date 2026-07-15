/**
 * DomainEvent — base class for all domain events.
 *
 * Per BTD §13.3 — Event Schema Rules:
 *   - Event names: past-tense verb (StudentCreated, not CreateStudent)
 *   - Events are immutable — once published, never modified
 *   - Event payload includes: eventId (UUID v7), occurredAt, tenantId, userId,
 *     aggregateId, version
 *   - Schema versioned via .v1, .v2 suffix — backward-compatible evolution only
 *   - Subscribers must be idempotent
 *   - Events published after transaction commit — never before
 *   - Event payload size max 64 KB
 *   - PII in events encrypted at rest
 */
import { randomUUID } from 'node:crypto';

export interface DomainEventPayload {
  readonly [key: string]: unknown;
}

export abstract class DomainEvent<P extends DomainEventPayload = DomainEventPayload> {
  public readonly eventId: string;
  public readonly occurredAt: string; // ISO-8601 UTC
  public readonly eventType: string;
  public readonly schemaVersion: string;
  public readonly payload: P;

  constructor(
    payload: P,
    options?: { eventId?: string; occurredAt?: string },
  ) {
    this.eventId = options?.eventId ?? randomUUID();
    this.occurredAt = options?.occurredAt ?? new Date().toISOString();
    this.eventType = this.constructor.name;
    this.schemaVersion = 'v1';
    this.payload = Object.freeze({ ...payload });
  }

  /** Convert to plain object for serialisation (Redis Stream, outbox). */
  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      schemaVersion: this.schemaVersion,
      occurredAt: this.occurredAt,
      payload: this.payload,
    };
  }
}
