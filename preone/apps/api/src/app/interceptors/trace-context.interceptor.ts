/**
 * TraceContextInterceptor — propagates traceId + userId + tenantId into
 * AsyncLocalStorage so Pino logger can auto-include them in every log.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { traceContextStorage } from '@app/bootstrap/context/trace-context.storage';

@Injectable()
export class TraceContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const traceId = (req as any).traceId as string | undefined;
    const requestId = (req as any).requestId as string | undefined;
    const user = (req as any).user as { id?: string; tenantId?: string; branchId?: string } | undefined;

    return new Observable((subscriber) => {
      traceContextStorage.run({ traceId, requestId, user }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
