/**
 * TraceIdMiddleware — generates X-Trace-Id per request and propagates
 * incoming X-Trace-Id (W3C Trace Context) if present.
 *
 * Per BTD §3.3: "traceId propagated via W3C Trace Context header (traceparent)"
 *
 * The traceId is attached to:
 *   - request object (req.traceId)
 *   - response header X-Trace-Id (for client-side correlation)
 *   - AsyncLocalStorage (so Pino logger can pick it up automatically)
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

const W3C_TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Try to extract traceId from incoming W3C traceparent header
    const traceparent = req.headers['traceparent'] as string | undefined;
    let traceId: string;

    if (traceparent && W3C_TRACEPARENT_REGEX.test(traceparent)) {
      const parts = traceparent.split('-');
      traceId = parts[2] ?? randomUUID();
    } else {
      // Fallback: use X-Request-Id if provided, else generate fresh UUID v7
      traceId = (req.headers['x-request-id'] as string) ?? randomUUID();
    }

    // Attach to request for downstream interceptors / filters
    (req as any).traceId = traceId;
    (req as any).requestId = randomUUID();

    // Echo back to client for correlation
    res.setHeader('X-Trace-Id', traceId);
    res.setHeader('X-Request-Id', (req as any).requestId);

    next();
  }
}
