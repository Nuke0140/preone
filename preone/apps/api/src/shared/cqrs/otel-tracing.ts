/**
 * OTel Tracing Helpers for CQRS + Event Bus (BTD §3.3, §22.2).
 *
 * Per BTD §22.2 — Distributed Tracing:
 *   "OpenTelemetry spans auto-created for HTTP, DB, Redis, BullMQ.
 *    Custom spans for CQRS command/query/event handlers — span name =
 *    `<command.type>` / `<query.type>` / `<event.eventType>`."
 *
 * Per BTD §22.3 — Span Attributes (standardised):
 *   - preone.actor.id        — user ID from command/query metadata
 *   - preone.tenant.id       — tenant (school) ID
 *   - preone.branch.id       — optional branch ID
 *   - preone.trace.id        — trace ID (auto from OTel context)
 *   - preone.cqrs.kind       — "command" | "query" | "event"
 *   - preone.cqrs.type       — the command/query/event type string
 *   - preone.cqrs.handler    — handler class name (best effort)
 *   - preone.cqrs.subscribers — for events: # of subscribers dispatched
 *   - preone.cqrs.error      — set on exception
 *   - preone.cqrs.duration_ms — span duration (auto)
 *
 * When OTel SDK is not started (OTEL_ENABLED=false), trace.getTracer()
 * returns a NoopTracer → startActiveSpan() is essentially a no-op,
 * so there is zero overhead in development.
 */
import { trace, SpanStatusCode, type Tracer, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'preone-cqrs';

/**
 * Get the CQRS tracer. Returns NoopTracer if SDK not started.
 *
 * Note: trace.getTracer() is cheap (provider lookup) and idempotent — it
 * returns the same tracer instance for a given name from the global provider.
 * No need for our own cache layer.
 */
export function getCqrsTracer(): Tracer {
  return trace.getTracer(TRACER_NAME);
}

/**
 * Standard span attribute keys — kept in sync with BTD §22.3.
 */
export const CqrsSpanAttributes = {
  ACTOR_ID: 'preone.actor.id',
  TENANT_ID: 'preone.tenant.id',
  BRANCH_ID: 'preone.branch.id',
  TRACE_ID: 'preone.trace.id',
  CQRS_KIND: 'preone.cqrs.kind',
  CQRS_TYPE: 'preone.cqrs.type',
  CQRS_HANDLER: 'preone.cqrs.handler',
  CQRS_SUBSCRIBERS: 'preone.cqrs.subscribers',
  CQRS_ERROR: 'preone.cqrs.error',
  CQRS_IDEMPOTENCY_KEY: 'preone.cqrs.idempotency_key',
} as const;

/**
 * Run `fn` inside an active OTel span, recording exceptions + status.
 * Returns whatever `fn` returns (Promise or sync).
 *
 * Usage:
 *   return runCqrsSpan('command', cmd.type, span => {
 *     span.setAttribute(...);
 *     return handler.handle(cmd);
 *   });
 */
export function runCqrsSpan<T>(
  kind: 'command' | 'query' | 'event',
  type: string,
  fn: (span: Span) => T | Promise<T>,
  options?: { handlerName?: string },
): Promise<T> | T {
  const tracer = getCqrsTracer();
  const spanName = `${kind}:${type}`;

  // startActiveSpan returns synchronously; if fn returns a Promise,
  // we wrap the promise chain to end the span after resolution.
  return tracer.startActiveSpan(spanName, (span) => {
    span.setAttribute(CqrsSpanAttributes.CQRS_KIND, kind);
    span.setAttribute(CqrsSpanAttributes.CQRS_TYPE, type);
    if (options?.handlerName) {
      span.setAttribute(CqrsSpanAttributes.CQRS_HANDLER, options.handlerName);
    }

    try {
      const result = fn(span);
      // Handle both sync + async results
      if (result && typeof (result as Promise<T>).then === 'function') {
        return (result as Promise<T>)
          .then((value) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return value;
          })
          .catch((err: unknown) => {
            recordException(span, err);
            span.end();
            throw err;
          });
      }
      // Sync path
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (err) {
      recordException(span, err);
      span.end();
      throw err;
    }
  });
}

/**
 * Record an exception on a span + set ERROR status.
 */
function recordException(span: Span, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  span.setAttribute(CqrsSpanAttributes.CQRS_ERROR, message);
  span.recordException(err as Error);
  span.setStatus({ code: SpanStatusCode.ERROR, message });
}

/**
 * Helper to set actor/tenant attributes from CQRS metadata.
 */
export function setActorAttributes(
  span: Span,
  meta: { actorId?: string; tenantId?: string; branchId?: string; traceId?: string; idempotencyKey?: string },
): void {
  if (meta.actorId) span.setAttribute(CqrsSpanAttributes.ACTOR_ID, meta.actorId);
  if (meta.tenantId) span.setAttribute(CqrsSpanAttributes.TENANT_ID, meta.tenantId);
  if (meta.branchId) span.setAttribute(CqrsSpanAttributes.BRANCH_ID, meta.branchId);
  if (meta.traceId) span.setAttribute(CqrsSpanAttributes.TRACE_ID, meta.traceId);
  if (meta.idempotencyKey) span.setAttribute(CqrsSpanAttributes.CQRS_IDEMPOTENCY_KEY, meta.idempotencyKey);
}
