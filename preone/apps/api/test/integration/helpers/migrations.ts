/**
 * Migration runner — applies SQL migrations to a Testcontainers Postgres.
 *
 * Per BTD §24: integration tests must run against a schema that mirrors
 * production. We apply the raw SQL migrations directly (bypassing Prisma
 * migrate) because:
 *   1. Prisma migrations are tracked in a _prisma_migrations table — using
 *      them in tests creates state that's hard to reset.
 *   2. The outbox + audit_log tables are NOT in the Prisma schema (they're
 *      raw SQL by design — see prisma-outbox.repository.ts comment).
 *   3. Raw SQL is faster and gives us explicit control over what's applied.
 *
 * Migrations are read from packages/database/prisma/migrations/ and executed
 * in filename order (which is also chronological — they're prefixed with
 * YYYYMMDD timestamps).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PrismaClient } from '@prisma/client';

const MIGRATIONS_DIR = resolve(
  __dirname,
  '../../../../../../packages/database/prisma/migrations',
);

/**
 * Run all SQL migrations against the given Prisma client (connected to a
 * Testcontainers Postgres). Migrations are applied in filename order.
 *
 * Each migration file is executed as a single $executeRawUnsafe call.
 * PostgreSQL treats the entire file as one implicit transaction — if any
 * statement fails, the whole file is rolled back.
 *
 * NOTE: the migration files are written to be idempotent (CREATE TABLE IF
 * NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS, etc.) — safe to re-run.
 */
export async function runMigrations(prisma: PrismaClient): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // chronological order by filename prefix

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Re-throw with context — which migration failed
      throw new Error(
        `Migration ${file} failed: ${(err as Error).message}`,
      );
    }
  }
}

/**
 * Insert a single outbox row directly via SQL. Used by integration tests to
 * seed the outbox table without going through the application layer.
 *
 * Returns the inserted row's eventId for assertions.
 */
export async function seedOutboxRow(
  prisma: PrismaClient,
  opts: {
    eventId: string;
    eventType?: string;
    aggregateId?: string;
    aggregateType?: string;
    tenantId?: string;
    payload?: Record<string, unknown>;
    status?: string;
    attempts?: number;
    nextRetryAt?: Date;
  },
): Promise<void> {
  const {
    eventId,
    eventType = 'UserOnboarded.v1',
    aggregateId = '00000000-0000-7000-8000-000000000001',
    aggregateType = 'User',
    tenantId = null,
    payload = { test: true },
    status = 'PENDING',
    attempts = 0,
    nextRetryAt = null,
  } = opts;

  await prisma.$executeRawUnsafe(
    `INSERT INTO outbox (event_id, event_type, aggregate_id, aggregate_type,
                         tenant_id, payload, status, attempts, next_retry_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, NOW())
     ON CONFLICT (event_id) DO NOTHING`,
    eventId,
    eventType,
    aggregateId,
    aggregateType,
    tenantId,
    JSON.stringify(payload),
    status,
    attempts,
    nextRetryAt,
  );
}

/**
 * Read a single outbox row by eventId. Used by integration tests to verify
 * state changes (status transitions, attempts increments, etc.).
 */
export async function readOutboxRow(
  prisma: PrismaClient,
  eventId: string,
): Promise<{
  eventId: string;
  status: string;
  attempts: number;
  lastError: string | null;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  deadLetterReason: string | null;
  publishedAt: Date | null;
} | null> {
  const rows = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT event_id, status, attempts, last_error, last_attempt_at,
            next_retry_at, dead_letter_reason, published_at
       FROM outbox
       WHERE event_id = $1`,
    eventId,
  );
  return rows[0] ?? null;
}
