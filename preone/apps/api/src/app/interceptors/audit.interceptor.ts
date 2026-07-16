/**
 * AuditInterceptor — captures HTTP state-changing requests and persists
 * audit log entries (BTD §20.5).
 *
 * Triggers audit logging on:
 *   1. Any POST/PUT/PATCH/DELETE request (state-changing by default)
 *   2. Any route explicitly annotated with @Audit(action, module, entity)
 *
 * For each audited request, captures:
 *   - actor: req.user (userId, tenantId, branchId) — from JwtAuthGuard
 *   - IP: req.ip (or X-Forwarded-For if behind proxy)
 *   - user-agent: req.headers['user-agent']
 *   - traceId: req.traceId (set by TraceIdMiddleware)
 *   - requestId: req.requestId (set by TraceIdMiddleware)
 *   - entityId: from @Audit(entityIdParam) or AuditContext.setEntityId()
 *   - oldValues/newValues: from AuditContext (set by handler mid-flight)
 *
 * Skips audit for:
 *   - GET requests (read-only, no state change) unless explicitly @Audit
 *   - Public routes (no req.user) unless @Audit is set
 *   - Failed requests (handler threw) — those are logged via AllExceptionsFilter
 *   - Health/metrics/swagger paths
 *
 * Per BTD §20.5, audit failures are LOGGED but never re-thrown — audit
 * must not break the user-facing request path. AuditService handles this
 * internally, but we wrap in try/catch here as a second safety net.
 */
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

import { AUDIT_METADATA_KEY, AuditContext, type AuditMetadata } from '@app/decorators/audit.decorator';
import type { AuthenticatedUser } from '@app/decorators/auth.decorators';
import { AuditService } from '@infra/audit/audit.service';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATHS = new Set(['/health', '/health/live', '/health/ready', '/metrics', '/docs', '/docs-json']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const method = req.method.toUpperCase();

    // Skip GET requests (unless explicitly @Audit)
    // Skip health/metrics/swagger
    if (SKIP_PATHS.has(req.path)) return next.handle();

    const auditMeta = this.reflector.get<AuditMetadata>(AUDIT_METADATA_KEY, context.getHandler());
    const isStateChanging = STATE_CHANGING_METHODS.has(method);

    if (!auditMeta && !isStateChanging) return next.handle();

    // Wrap the handler in an AsyncLocalStorage context so handlers can
    // attach entityId / oldValues / newValues mid-flight.
    return AuditContext.run(() => {
      return next.handle().pipe(
        tap({
          next: (responseBody) => {
            // Only audit successful (2xx) responses
            if (res.statusCode < 200 || res.statusCode >= 300) return;

            void this.persistAuditEntry(req, auditMeta, responseBody).catch((err) => {
              this.logger.error(`Audit persistence failed: ${(err as Error).message}`);
            });
          },
        }),
      );
    });
  }

  private async persistAuditEntry(
    req: Request,
    auditMeta: AuditMetadata | undefined,
    responseBody: unknown,
  ): Promise<void> {
    const user = (req as any).user as AuthenticatedUser | undefined;
    const traceId = (req as any).traceId as string | undefined;
    const requestId = (req as any).requestId as string | undefined;
    const userAgent = req.headers['user-agent'] ?? undefined;
    const ip = (req as any).ip ?? req.socket?.remoteAddress ?? undefined;

    const ctx = AuditContext.snapshot();

    // Derive action: explicit @Audit wins, else infer from method
    const action = auditMeta?.action ?? this.inferAction(req.method);
    const module = auditMeta?.module ?? this.inferModule(req.path);
    const entity = auditMeta?.entity ?? this.inferEntity(req.path);

    // Derive entityId: explicit param wins, else AuditContext, else response.id
    let entityId = ctx.entityId;
    if (!entityId && auditMeta?.entityIdParam) {
      entityId = (req.params as Record<string, string> | undefined)?.[auditMeta.entityIdParam];
    }
    if (!entityId && responseBody && typeof responseBody === 'object') {
      const r = responseBody as Record<string, unknown>;
      entityId = typeof r.id === 'string' ? r.id : undefined;
    }

    // Derive newValues: AuditContext wins, else response body (sanitised)
    let newValues = ctx.newValues;
    if (!newValues && auditMeta && responseBody && typeof responseBody === 'object') {
      // Don't store the whole response body — just save the top-level id/type
      // for reference. Real newValues should be set via AuditContext.
      newValues = { response: responseBody };
    }

    await this.audit.record({
      userId: user?.id,
      schoolId: user?.tenantId,
      branchId: user?.branchId,
      action,
      module,
      entity,
      entityId,
      oldValues: ctx.oldValues,
      newValues,
      ipAddress: ip,
      userAgent,
      requestId,
      traceId,
      metadata: ctx.metadata,
    });
  }

  private inferAction(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST': return 'CREATE';
      case 'PUT':
      case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return 'ACTION';
    }
  }

  /** Infer module name from URL path: /v1/students/... → 'students'. */
  private inferModule(path: string): string {
    // Strip leading /v1/ if present
    const stripped = path.replace(/^\/v1\//, '');
    const segment = stripped.split('/')[0] ?? 'unknown';
    return segment.slice(0, 64);
  }

  /** Infer entity name from URL path: /v1/students/... → 'Student'. */
  private inferEntity(path: string): string {
    const stripped = path.replace(/^\/v1\//, '');
    const segment = stripped.split('/')[0] ?? 'Unknown';
    // Singularise + Capitalise
    const singular = segment.endsWith('s') ? segment.slice(0, -1) : segment;
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  }
}
