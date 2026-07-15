/**
 * TimeoutInterceptor — aborts requests that exceed the configured duration.
 *
 * Per BTD §17.2: "Max transaction duration: 5s; longer = suspect deadlock — alert"
 *
 * Default 30s for HTTP requests. Internal application services / repositories
 * set their own shorter timeouts (e.g., 5s for transactions).
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, throwError, timeout, catchError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs = 30_000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((err) => {
        const req = context.switchToHttp().getRequest<Request>();
        if (err?.name === 'TimeoutError') {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request to ${req.method} ${req.path} timed out after ${this.timeoutMs}ms`,
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
