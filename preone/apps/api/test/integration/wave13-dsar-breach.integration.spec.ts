/**
 * Integration test — Wave 13 DSAR + Breach Notification persistence
 * with real Postgres 16 (BTD §24 — Integration Testing).
 *
 * Per BTD §24:
 *   "Integration tests verify the persistence path against a real Postgres.
 *    The test seeds a school + user, instantiates DsarRequestAggregate and
 *    BreachNotificationAggregate, persists them via Prisma, reloads them,
 *    and asserts that:
 *      - All fields round-trip correctly (no lossy serialisation)
 *      - State transitions persist correctly
 *      - SLA deadline is computed and stored
 *      - 72h notification flag persists
 *
 *    This test covers R-DAT-007/008 (DSAR) and R-DAT-010/R-CMP-008 (Breach)."
 *
 * This test is SKIPPED when Docker is unavailable. CI provides Docker.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import {
  isDockerAvailable,
  startPostgres,
  type PostgresHandle,
} from './helpers/containers';
import { runMigrations } from './helpers/migrations';

import { DsarRequestAggregate } from '@modules/platform/domain/aggregates/dsar-request.aggregate';
import { BreachNotificationAggregate } from '@modules/platform/domain/aggregates/breach-notification.aggregate';

// ─────────────────────────────────────────────
// Docker detection — skip entire suite if unavailable
// ─────────────────────────────────────────────

const dockerAvailable = await isDockerAvailable();

// ─────────────────────────────────────────────
// Shared state
// ─────────────────────────────────────────────

let pg: PostgresHandle | null = null;
let prisma: PrismaClient | null = null;
let schoolId: string | null = null;
let dataSubjectId: string | null = null;

beforeAll(async () => {
  if (!dockerAvailable) return;
  pg = await startPostgres();
  prisma = new PrismaClient({ datasources: { db: { url: pg.url } } });
  await prisma.$connect();
  await runMigrations(prisma);

  // Seed a school + user (minimum fields). The migration creates the schools
  // and users tables; we insert a minimal row to satisfy FK constraints.
  schoolId = randomUUID();
  dataSubjectId = randomUUID();
  await prisma.$executeRawUnsafe(`
    INSERT INTO schools (id, name, email, phone, status, tier, branch_count, max_branches,
                         student_seats, used_seats, timezone, locale, version, created_at, updated_at)
    VALUES ($1, 'Test School', 'test@example.com', '9999999999', 'PROSPECT', 'STARTER',
            0, 1, 100, 0, 'Asia/Kolkata', 'en-IN', 1, NOW(), NOW())
  `, schoolId);
  await prisma.$executeRawUnsafe(`
    INSERT INTO users (id, school_id, email, phone, full_name, status, version, created_at, updated_at)
    VALUES ($1, $2, 'subject@example.com', '8888888888', 'Test Subject', 'ACTIVE', 1, NOW(), NOW())
  `, dataSubjectId, schoolId);
}, 120_000);

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
  if (pg) await pg.stop();
}, 60_000);

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe.skipIf(!dockerAvailable)('Wave 13 — DSAR + Breach persistence (Testcontainers)', () => {

  describe('DsarRequest persistence (R-DAT-007/008)', () => {
    it('should persist a SUBMITTED DSAR with SLA deadline', async () => {
      const agg = DsarRequestAggregate.create({
        tenantId: schoolId!,
        dataSubjectId: dataSubjectId!,
        dataSubjectEmail: 'subject@example.com',
        requestType: 'ACCESS',
        description: 'Requesting full export of personal data',
        submittedAt: '2026-01-01T00:00:00Z',
      });
      expect(agg.domainEvents.length).toBeGreaterThan(0);

      await prisma!.$executeRawUnsafe(`
        INSERT INTO dsar_requests (id, school_id, data_subject_id, data_subject_email,
                                   request_type, status, description, submitted_at, sla_deadline,
                                   version, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW(), NOW())
      `,
        agg.id, schoolId, dataSubjectId, 'subject@example.com',
        'ACCESS', 'SUBMITTED', 'Requesting full export of personal data',
        new Date('2026-01-01T00:00:00Z'), new Date(agg.slaDeadline),
      );

      const rows: Array<{
        id: string; status: string; request_type: string; sla_deadline: Date;
      }> = await prisma!.$queryRawUnsafe(`
        SELECT id, status, request_type, sla_deadline FROM dsar_requests WHERE id = $1
      `, agg.id);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('SUBMITTED');
      expect(rows[0].request_type).toBe('ACCESS');
      // SLA deadline should be 2026-01-31 (30 days from 2026-01-01)
      expect(rows[0].sla_deadline.toISOString()).toContain('2026-01-31');
    });

    it('should advance DSAR through VERIFIED → PROCESSING → COMPLETED', async () => {
      const agg = DsarRequestAggregate.create({
        tenantId: schoolId!,
        dataSubjectId: dataSubjectId!,
        dataSubjectEmail: 'subject@example.com',
        requestType: 'ACCESS',
        submittedAt: '2026-02-01T00:00:00Z',
      });
      await prisma!.$executeRawUnsafe(`
        INSERT INTO dsar_requests (id, school_id, data_subject_id, data_subject_email,
                                   request_type, status, submitted_at, sla_deadline,
                                   version, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'SUBMITTED', $6, $7, 1, NOW(), NOW())
      `,
        agg.id, schoolId, dataSubjectId, 'subject@example.com',
        'ACCESS', new Date('2026-02-01T00:00:00Z'), new Date(agg.slaDeadline),
      );

      // VERIFIED
      agg.verify('dpo-user', '2026-02-02T00:00:00Z');
      await prisma!.$executeRawUnsafe(`
        UPDATE dsar_requests SET status = 'VERIFIED', verified_at = $2, verified_by = $3,
                                version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date('2026-02-02T00:00:00Z'), 'dpo-user');

      // PROCESSING
      agg.startProcessing('2026-02-03T00:00:00Z');
      await prisma!.$executeRawUnsafe(`
        UPDATE dsar_requests SET status = 'PROCESSING', processing_started_at = $2,
                                version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date('2026-02-03T00:00:00Z'));

      // COMPLETED with artifactsUrl (within SLA)
      agg.complete('dpo-user', '2026-02-15T00:00:00Z', 'https://s3/dsar-export.zip');
      await prisma!.$executeRawUnsafe(`
        UPDATE dsar_requests SET status = 'COMPLETED', completed_at = $2, completed_by = $3,
                                artifacts_url = $4, version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date('2026-02-15T00:00:00Z'), 'dpo-user', 'https://s3/dsar-export.zip');

      const rows: Array<{ status: string; artifacts_url: string | null }> =
        await prisma!.$queryRawUnsafe(`
          SELECT status, artifacts_url FROM dsar_requests WHERE id = $1
        `, agg.id);
      expect(rows[0].status).toBe('COMPLETED');
      expect(rows[0].artifacts_url).toBe('https://s3/dsar-export.zip');
    });

    it('should enforce SLA deadline at the aggregate level', () => {
      const agg = DsarRequestAggregate.create({
        tenantId: schoolId!,
        dataSubjectId: dataSubjectId!,
        dataSubjectEmail: 'subject@example.com',
        requestType: 'ACCESS',
        submittedAt: '2026-03-01T00:00:00Z',
      });
      agg.verify('dpo', '2026-03-02T00:00:00Z');
      agg.startProcessing('2026-03-03T00:00:00Z');
      // SLA deadline is 2026-03-31 — completion on 2026-04-15 should fail
      expect(() => agg.complete('dpo', '2026-04-15T00:00:00Z', 'https://s3/x.zip'))
        .toThrow('SLA breach');
    });
  });

  describe('BreachNotification persistence (R-DAT-010 / R-CMP-008 — 72h rule)', () => {
    it('should persist a DETECTED breach', async () => {
      const agg = BreachNotificationAggregate.create({
        tenantId: schoolId!,
        severity: 'HIGH',
        detectedAt: '2026-04-01T00:00:00Z',
        detectedBy: 'soc-bot',
        description: 'Unauthorized DB access from anomalous IP range',
        affectedRecordsEstimate: 1500,
      });

      await prisma!.$executeRawUnsafe(`
        INSERT INTO breach_notifications (id, school_id, severity, status, detected_at,
                                          detected_by, description, affected_records_estimate,
                                          version, created_at, updated_at)
        VALUES ($1, $2, $3, 'DETECTED', $4, $5, $6, $7, 1, NOW(), NOW())
      `,
        agg.id, schoolId, 'HIGH',
        new Date('2026-04-01T00:00:00Z'), 'soc-bot',
        'Unauthorized DB access from anomalous IP range', 1500,
      );

      const rows: Array<{
        id: string; status: string; severity: string; affected_records_estimate: number;
      }> = await prisma!.$queryRawUnsafe(`
        SELECT id, status, severity, affected_records_estimate
        FROM breach_notifications WHERE id = $1
      `, agg.id);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('DETECTED');
      expect(rows[0].severity).toBe('HIGH');
      expect(rows[0].affected_records_estimate).toBe(1500);
    });

    it('should advance through ASSESSED → NOTIFIED → CLOSED within 72h', async () => {
      const detectedAt = '2026-05-01T00:00:00Z';
      const agg = BreachNotificationAggregate.create({
        tenantId: schoolId!,
        severity: 'CRITICAL',
        detectedAt,
        detectedBy: 'soc-bot',
        description: 'Ransomware attempt detected',
        affectedRecordsEstimate: 5000,
      });

      await prisma!.$executeRawUnsafe(`
        INSERT INTO breach_notifications (id, school_id, severity, status, detected_at,
                                          detected_by, description, affected_records_estimate,
                                          version, created_at, updated_at)
        VALUES ($1, $2, 'CRITICAL', 'DETECTED', $3, 'soc-bot', $4, 5000, 1, NOW(), NOW())
      `, agg.id, schoolId, new Date(detectedAt), 'Ransomware attempt detected');

      // ASSESSED (reportable)
      agg.assess('dpo', '2026-05-01T01:00:00Z', true, 4800);
      await prisma!.$executeRawUnsafe(`
        UPDATE breach_notifications
        SET status = 'ASSESSED', assessed_at = $2, assessed_by = $3,
            is_reportable = TRUE, affected_records_confirmed = 4800,
            version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date('2026-05-01T01:00:00Z'), 'dpo');

      // NOTIFIED within 72h (50h after detection)
      const notifiedAt = '2026-05-03T02:00:00Z';
      agg.notify('MEITY', notifiedAt);
      expect(agg.within72h).toBe(true);
      await prisma!.$executeRawUnsafe(`
        UPDATE breach_notifications
        SET status = 'NOTIFIED', notification_sent_at = $2, notification_recipient = 'MEITY',
            within_72h = TRUE, version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date(notifiedAt));

      // CLOSED
      agg.close('dpo', '2026-05-15T00:00:00Z', 'Phishing attack', 'MFA enforcement + IR drill');
      await prisma!.$executeRawUnsafe(`
        UPDATE breach_notifications
        SET status = 'CLOSED', closed_at = $2, closed_by = $3,
            root_cause = $4, remediation = $5,
            version = version + 1, updated_at = NOW()
        WHERE id = $1
      `, agg.id, new Date('2026-05-15T00:00:00Z'), 'dpo',
          'Phishing attack', 'MFA enforcement + IR drill');

      const rows: Array<{
        status: string; within_72h: boolean; root_cause: string; remediation: string;
      }> = await prisma!.$queryRawUnsafe(`
        SELECT status, within_72h, root_cause, remediation
        FROM breach_notifications WHERE id = $1
      `, agg.id);
      expect(rows[0].status).toBe('CLOSED');
      expect(rows[0].within_72h).toBe(true);
      expect(rows[0].root_cause).toBe('Phishing attack');
      expect(rows[0].remediation).toBe('MFA enforcement + IR drill');
    });

    it('should detect 72h violation at the aggregate level', () => {
      const agg = BreachNotificationAggregate.create({
        tenantId: schoolId!,
        severity: 'MEDIUM',
        detectedAt: '2026-06-01T00:00:00Z',
        detectedBy: 'soc-bot',
        description: 'Minor policy violation',
        affectedRecordsEstimate: 50,
      });
      agg.assess('dpo', '2026-06-01T01:00:00Z', true, 45);
      // 73h after detection — overdue
      expect(agg.isOverdueForNotification('2026-06-04T01:00:00Z')).toBe(true);
      // Notify at 80h — within72h should be false
      agg.notify('MEITY', '2026-06-04T08:00:00Z');
      expect(agg.within72h).toBe(false);
    });
  });
});
