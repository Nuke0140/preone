/**
 * HttpLoggingInterceptor — logs every HTTP request with method, path,
 * status, and duration. Pino logger picks up traceId via AsyncLocalStorage.
 *
 * Per BTD §3.2 Request Lifecycle: "Interceptor (LoggingInterceptor): request/response logging with duration"
 * Per BTD §22.1 Log Fields: every log includes traceId, userId, tenantId, module,
 *   method, message, payload, duration, requestId
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const startTime = Date.now();
    const { method, path: url } = req;
    const traceId = (req as any).traceId as string | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} → ${res.statusCode} ${duration}ms [${traceId ?? '-'}]`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} → ERROR ${duration}ms [${traceId ?? '-'}] — ${err?.message ?? err}`,
          );
        },
      }),
    );
  }
}
