/**
 * @Audit decorator — marks a route for explicit audit logging.
 *
 * Per BTD §20.5 — Audit Logging:
 *   "Routes annotated with @Audit(action, module, entity?) persist an entry
 *    to audit_log after the handler completes successfully. The interceptor
 *    captures actor (req.user), IP, user-agent, traceId, requestId
 *    automatically; the route handler may attach entityId/oldValues/newValues
 *    via AuditContext attached to the response."
 *
 * Usage:
 *   @Post('students')
 *   @Audit('CREATE', 'student', 'Student')
 *   async create(@Body() dto: CreateStudentDto, @ReqUser() user: AuthenticatedUser) {
 *     const student = await this.svc.create(dto, user.tenantId);
 *     // AuditInterceptor will pick up student.id as entityId via AuditContext
 *     AuditContext.setEntityId(student.id);
 *     AuditContext.setNewValues({ name: student.name, admissionNumber: student.admissionNumber });
 *     return student;
 *   }
 *
 * For UPDATE/DELETE flows, also set oldValues BEFORE calling the service:
 *   @Patch(':id')
 *   @Audit('UPDATE', 'student', 'Student')
 *   async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
 *     const before = await this.svc.get(id);
 *     AuditContext.setOldValues(before);
 *     return this.svc.update(id, dto);
 *   }
 *
 * The AuditInterceptor runs AFTER the handler (in the response tap) and
 * reads any context the handler set. If the handler throws, no audit entry
 * is written (we don't audit failed operations — they're logged as errors
 * via the AllExceptionsFilter).
 */
import { AsyncLocalStorage } from 'node:async_hooks';

import { SetMetadata } from '@nestjs/common';

// ─────────────────────────────────────────────
// Decorator metadata
// ─────────────────────────────────────────────

export interface AuditMetadata {
  action: string;
  module: string;
  entity: string;
  /** Optional: extract entityId from route params by name. */
  entityIdParam?: string;
}

export const AUDIT_METADATA_KEY = 'audit:metadata';

export function Audit(
  action: string,
  module: string,
  entity: string,
  options?: { entityIdParam?: string },
): MethodDecorator {
  return SetMetadata(AUDIT_METADATA_KEY, {
    action,
    module,
    entity,
    entityIdParam: options?.entityIdParam,
  } satisfies AuditMetadata);
}

// ─────────────────────────────────────────────
// Per-request audit context (AsyncLocalStorage)
// ─────────────────────────────────────────────

export interface AuditContextShape {
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const auditAls = new AsyncLocalStorage<AuditContextShape>();

/**
 * Per-request audit context. Handlers can set entityId / oldValues / newValues
 * mid-flight; the AuditInterceptor reads them after the handler completes.
 *
 * Backed by AsyncLocalStorage so the context propagates across async hops
 * correctly, including through Prisma transactions.
 */
export const AuditContext = {
  /** Set inside a route handler — see @Audit docs. */
  setEntityId(id: string): void {
    const store = auditAls.getStore();
    if (store) store.entityId = id;
  },
  setOldValues(values: Record<string, unknown>): void {
    const store = auditAls.getStore();
    if (store) store.oldValues = values;
  },
  setNewValues(values: Record<string, unknown>): void {
    const store = auditAls.getStore();
    if (store) store.newValues = values;
  },
  setMetadata(meta: Record<string, unknown>): void {
    const store = auditAls.getStore();
    if (store) store.metadata = meta;
  },
  /** Internal — used by AuditInterceptor to start a fresh context. */
  run<T>(fn: () => T): T {
    return auditAls.run({}, fn);
  },
  /** Internal — used by AuditInterceptor to read the final context. */
  snapshot(): AuditContextShape {
    return { ...auditAls.getStore() };
  },
};
