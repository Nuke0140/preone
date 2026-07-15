/**
 * AllExceptionsFilter — catches all thrown errors and converts them
 * into the standardised JSON error response (BTD §19.2 + §19.3).
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppException, FieldError } from '@common/errors/exceptions';

interface StandardErrorResponse {
  success: false;
  errorCode: string;
  message: string;
  traceId?: string;
  details: FieldError[];
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = (request as any).traceId as string | undefined;

    const errorResponse = this.mapException(exception, traceId, request.path);

    // Log only 5xx (server errors) — 4xx are client errors, expected flow
    if (errorResponse.errorCode.startsWith('INFRA') || exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.path} → 500`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (response.statusCode >= 500 || (exception instanceof HttpException && exception.getStatus() >= 500)) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.path} → ${errorResponse.errorCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(this.getStatusCode(exception, errorResponse)).json(errorResponse);
  }

  private getStatusCode(exception: unknown, response: StandardErrorResponse): number {
    if (exception instanceof AppException) return exception.httpStatus;
    if (exception instanceof HttpException) return exception.getStatus();
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2025: Record not found
      if (exception.code === 'P2025') return HttpStatus.NOT_FOUND;
      // P2002: Unique constraint violation
      if (exception.code === 'P2002') return HttpStatus.CONFLICT;
      return HttpStatus.BAD_REQUEST;
    }
    if (exception instanceof ZodError) return HttpStatus.UNPROCESSABLE_ENTITY;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private mapException(
    exception: unknown,
    traceId: string | undefined,
    path: string,
  ): StandardErrorResponse {
    const base: StandardErrorResponse = {
      success: false,
      errorCode: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      traceId,
      details: [],
      timestamp: new Date().toISOString(),
      path,
    };

    if (exception instanceof AppException) {
      return {
        ...base,
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      const message =
        typeof resp === 'string'
          ? resp
          : (resp as any).message ?? exception.message;
      const details: FieldError[] =
        typeof resp === 'object' && Array.isArray((resp as any).message)
          ? ((resp as any).message as string[]).map((m) => ({
              field: '',
              code: 'VALIDATION_ERROR',
              message: m,
            }))
          : [];
      return {
        ...base,
        errorCode: status === 401 ? 'AUTHENTICATION_FAILED' : 'HTTP_ERROR',
        message: typeof message === 'string' ? message : 'HTTP error',
        details,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const map: Record<string, { code: string; msg: string }> = {
        P2002: { code: 'DUPLICATE_KEY', msg: 'A record with this value already exists.' },
        P2025: { code: 'NOT_FOUND', msg: 'Record not found.' },
        P2003: { code: 'FK_VIOLATION', msg: 'Referenced record does not exist.' },
      };
      const entry = map[exception.code];
      return {
        ...base,
        errorCode: entry?.code ?? 'DB_ERROR',
        message: entry?.msg ?? `Database error: ${exception.code}`,
      };
    }

    if (exception instanceof ZodError) {
      return {
        ...base,
        errorCode: 'VALIDATION_ERROR',
        message: 'Invalid request payload.',
        details: exception.issues.map((i) => ({
          field: i.path.join('.'),
          code: i.code.toUpperCase(),
          message: i.message,
        })),
      };
    }

    if (exception instanceof Error) {
      return {
        ...base,
        errorCode: 'INTERNAL_ERROR',
        message: exception.message,
      };
    }

    return base;
  }
}
