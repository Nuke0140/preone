/**
 * AuditService — persists audit log entries to the audit_log table.
 *
 * Per BTD §20.5 — Audit Logging:
 *   "Every state-changing operation (create/update/delete/approve) is audit-
 *    logged with: actor, before/after values, IP, user-agent, traceId.
 *    PII fields are redacted BEFORE storage (maskEmail/maskPhone/maskAadhaar).
 *    Audit logs are immutable — no UPDATE/DELETE on audit_log table."
 *
 * Per BTD §20.3 — PII Protection:
 *   "PII in audit logs is masked using the same masking functions used for
 *    regular logs (maskEmail, maskPhone, maskAadhaar, maskPan)."
 *
 * Per BTD §22.1 — Log Fields (also applies to audit):
 *   "traceId, userId, tenantId, module, method, message, payload, duration,
 *    requestId — every audit entry MUST include traceId + requestId for
 *    cross-correlation with HTTP logs and OTel spans."
 *
 * Implementation notes:
 *   - Writes are SYNCHRONOUS to the same DB as the operation being audited
 *     (so audit survives the same transaction commit). For v1, we accept
 *     the latency cost (typical audit insert <2ms on PG).
 *   - For v1.1: move to BullMQ fire-and-forget (BTD §17.3 Async Pattern).
 *   - Failures are LOGGED but never re-thrown — audit must not break the
 *     request path. Per BTD §20.5, an audit failure is an ops alert, not
 *     a user-facing error.
 *   - PII redaction is applied to oldValues/newValues JSON before insert.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { maskAadhaar, maskEmail, maskPan, maskPhone } from '@common/utils/pii.util';
import { PrismaService } from '@infra/prisma/prisma.service';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AuditEntry {
  userId?: string;
  schoolId?: string;
  branchId?: string;
  /** Short verb: CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, LOGOUT, etc. */
  action: string;
  /** Bounded context: identity, admissions, finance, etc. */
  module: string;
  /** Aggregate / entity type: User, Application, Invoice, etc. */
  entity: string;
  /** UUID of the affected entity (if known). */
  entityId?: string;
  /** Pre-change state (for UPDATE/DELETE). PII redacted before insert. */
  oldValues?: Record<string, unknown>;
  /** Post-change state (for CREATE/UPDATE). PII redacted before insert. */
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  traceId?: string;
  /** Free-form metadata: e.g. { reason: '...', approvalLevel: 2 }. */
  metadata?: Record<string, unknown>;
}

// ─────────────────────────────────────────────
// PII redaction
// ─────────────────────────────────────────────

/** Field names that are considered PII and must be masked before storage. */
const PII_FIELDS = new Set([
  'email', 'emailAddress', 'parentEmail', 'guardianEmail',
  'phone', 'phoneNumber', 'mobile', 'parentPhone', 'guardianPhone',
  'aadhaar', 'aadhaarNumber', 'uid',
  'pan', 'panNumber',
  'password', 'passwordHash',
  'bankAccount', 'accountNumber', 'ifsc',
]);

/**
 * Recursively walk a JSON-serialisable object and mask PII fields.
 * Returns a deep-cloned, redacted copy — never mutates the input.
 */
export function redactPii(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redactPii);
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (PII_FIELDS.has(k)) {
      out[k] = maskPiiValue(k, v);
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactPii(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function maskPiiValue(fieldName: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (fieldName === 'email' || fieldName === 'emailAddress' || fieldName === 'parentEmail' || fieldName === 'guardianEmail') {
    return maskEmail(value);
  }
  if (fieldName === 'phone' || fieldName === 'phoneNumber' || fieldName === 'mobile' || fieldName === 'parentPhone' || fieldName === 'guardianPhone') {
    return maskPhone(value);
  }
  if (fieldName === 'aadhaar' || fieldName === 'aadhaarNumber' || fieldName === 'uid') {
    return maskAadhaar(value);
  }
  if (fieldName === 'pan' || fieldName === 'panNumber') {
    return maskPan(value);
  }
  if (fieldName === 'password' || fieldName === 'passwordHash') {
    return '[REDACTED]';
  }
  if (fieldName === 'bankAccount' || fieldName === 'accountNumber') {
    return value.length > 4 ? '****' + value.slice(-4) : '****';
  }
  return value;
}

// ─────────────────────────────────────────────
// AuditService
// ─────────────────────────────────────────────

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a single audit entry. PII is redacted before insert.
   *
   * Failures are logged but NOT re-thrown — audit failures must not break
   * the user-facing request (BTD §20.5).
   *
   * Returns the persisted audit log ID on success, or null on failure.
   */
  async record(entry: AuditEntry): Promise<string | null> {
    try {
      const oldValues = entry.oldValues !== undefined
        ? (redactPii(entry.oldValues) as Prisma.InputJsonValue)
        : Prisma.JsonNull;
      const newValues = entry.newValues !== undefined
        ? (redactPii(entry.newValues) as Prisma.InputJsonValue)
        : Prisma.JsonNull;
      const metadata = entry.metadata !== undefined
        ? (redactPii(entry.metadata) as Prisma.InputJsonValue)
        : Prisma.JsonNull;

      const row = await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          schoolId: entry.schoolId,
          branchId: entry.branchId,
          action: entry.action.slice(0, 32),
          module: entry.module.slice(0, 64),
          entity: entry.entity.slice(0, 64),
          entityId: entry.entityId,
          oldValues,
          newValues,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          traceId: entry.traceId,
          metadata,
        },
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      this.logger.error(
        `Failed to persist audit entry (action=${entry.action}, module=${entry.module}, entity=${entry.entity}): ${(err as Error).message}`,
        (err as Error).stack,
      );
      return null;
    }
  }

  /**
   * Persist multiple audit entries in a single batch.
   * Useful when one command produces side effects on multiple entities.
   */
  async recordBatch(entries: readonly AuditEntry[]): Promise<void> {
    await Promise.allSettled(entries.map((e) => this.record(e)));
  }
}
