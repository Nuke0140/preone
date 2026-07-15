/**
 * traceContextStorage — AsyncLocalStorage for cross-cutting context
 * (traceId, requestId, user). Pino logger reads from this for every log.
 *
 * Per BTD §3.3: "traceId, userId, tenantId auto-injected via AsyncLocalStorage"
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TraceContext {
  traceId?: string;
  requestId?: string;
  user?: { id?: string; tenantId?: string; branchId?: string; role?: string };
}

export const traceContextStorage = new AsyncLocalStorage<TraceContext>();

export function getTraceContext(): TraceContext {
  return traceContextStorage.getStore() ?? {};
}
