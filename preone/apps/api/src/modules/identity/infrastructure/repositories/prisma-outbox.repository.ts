/**
 * PrismaOutboxRepository — concrete implementation of OutboxRepository.
 *
 * Per BTD §13.1 + §17.1 Outbox Pattern.
 *
 * NOTE: This repository is special — it does NOT own its own transaction.
 * It MUST be called from within a Prisma transaction (via tx handle passed
 * by the UnitOfWork). The caller (UnitOfWork) is responsible for ensuring
 * the outbox write is atomic with the aggregate save.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';

import type { IntegrationEventEnvelope } from '../../domain/events/identity-events';
import type { OutboxRecord, OutboxRepository, OutboxStatus } from '../../domain/repositories/outbox.repository';

interface OutboxRow {
  id: string;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  tenant_id: string | null;
  payload: unknown;
  status: string;
  attempts: number;
  last_error: string | null;
  published_at: Date | null;
  created_at: Date;
}

/**
 * The outbox table is created via a SQL migration in
 * `packages/database/migrations/`. It is intentionally NOT in the Prisma
 * schema as a model — the outbox is a pure infrastructure concern and we
 * don't want application code accidentally reading/writing it directly.
 */
const RAW_INSERT = `
  INSERT INTO outbox (event_id, event_type, aggregate_id, aggregate_type,
                      tenant_id, payload, status, attempts, created_at)
  VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'PENDING', 0, NOW())
  ON CONFLICT (event_id) DO NOTHING
`;

const RAW_POLL = `
  SELECT id, event_id, event_type, aggregate_id, aggregate_type,
         tenant_id, payload, status, attempts, last_error,
         published_at, created_at
  FROM outbox
  WHERE status = 'PENDING'
  ORDER BY created_at ASC
  LIMIT $1
  FOR UPDATE SKIP LOCKED
`

const RAW_MARK_PUBLISHED = `
  UPDATE outbox SET status = 'PUBLISHED', published_at = NOW(), attempts = attempts + 1
  WHERE event_id = $1
`

const RAW_MARK_FAILED = `
  UPDATE outbox SET status = 'FAILED', last_error = $2, attempts = attempts + 1
  WHERE event_id = $1
`

function mapRow(row: OutboxRow): OutboxRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    tenantId: row.tenant_id ?? undefined,
    payload: (row.payload as Record<string, unknown>) ?? {},
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
    publishedAt: row.published_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Outbox repository that accepts an explicit Prisma transaction client.
 * This is the key design — UnitOfWork owns the transaction and passes the
 * tx handle, ensuring atomicity.
 */
@Injectable()
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Append within an existing transaction. Caller MUST pass tx.
   * Throws if called outside a transaction context.
   */
  async append(
    envelope: IntegrationEventEnvelope,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.$executeRawUnsafe(
      RAW_INSERT,
      envelope.eventId,
      envelope.eventType,
      envelope.aggregateId,
      envelope.aggregateType,
      envelope.tenantId ?? null,
      JSON.stringify(envelope),
    );
  }

  async pollPending(limit: number): Promise<OutboxRecord[]> {
    const rows = await this.prisma.$queryRawUnsafe<OutboxRow[]>(RAW_POLL, limit);
    return rows.map(mapRow);
  }

  async markPublished(eventId: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(RAW_MARK_PUBLISHED, eventId);
  }

  async markFailed(eventId: string, error: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(RAW_MARK_FAILED, eventId, error);
  }
}
