/**
 * Standardised Exception Hierarchy — per BTD §19.1.
 *
 * Every exception inherits from AppException and carries:
 *   - errorCode: stable machine-readable string (STUDENT_NOT_FOUND)
 *   - message: human-readable default
 *   - details: optional field-level error array
 *   - httpStatus: HTTP status code
 *   - cause: optional underlying error
 *
 * The global AllExceptionsFilter catches all thrown errors and
 * converts them into the standardised JSON response shape (BTD §19.2).
 */

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export abstract class AppException extends Error {
  public abstract readonly httpStatus: number;
  public readonly errorCode: string;
  public readonly details: FieldError[];
  public readonly cause?: Error;
  public readonly timestamp: string;

  constructor(
    errorCode: string,
    message: string,
    options?: { details?: FieldError[]; cause?: Error },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.errorCode = errorCode;
    this.details = options?.details ?? [];
    this.cause = options?.cause;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain (TS quirk when extending Error)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(traceId?: string) {
    return {
      success: false,
      errorCode: this.errorCode,
      message: this.message,
      traceId,
      details: this.details,
      timestamp: this.timestamp,
      path: undefined, // filled by AllExceptionsFilter
    };
  }
}

// ─────────────────────────────────────────────
// §19.1 — Exception Types
// ─────────────────────────────────────────────

/** 422 — DTO schema violation */
export class ValidationException extends AppException {
  readonly httpStatus = 422;
  constructor(message: string, details: FieldError[] = [], cause?: Error) {
    super('VALIDATION_ERROR', message, { details, cause });
  }
}

/** 409 — Business rule violation */
export class BusinessException extends AppException {
  readonly httpStatus = 409;
  constructor(errorCode: string, message: string, details: FieldError[] = [], cause?: Error) {
    super(errorCode, message, { details, cause });
  }
}

/** 403 — Insufficient permissions */
export class AuthorizationException extends AppException {
  readonly httpStatus = 403;
  constructor(errorCode = 'PERMISSION_DENIED', message = 'You do not have permission to perform this action.') {
    super(errorCode, message);
  }
}

/** 401 — Invalid or expired token */
export class AuthenticationException extends AppException {
  readonly httpStatus = 401;
  constructor(errorCode = 'AUTHENTICATION_FAILED', message = 'Authentication required or token expired.') {
    super(errorCode, message);
  }
}

/** 404 — Resource does not exist */
export class NotFoundException extends AppException {
  readonly httpStatus = 404;
  constructor(resource: string, id?: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      id ? `${resource} with ID ${id} does not exist` : `${resource} not found`,
    );
  }
}

/** 409 — Concurrent modification (optimistic lock failure) */
export class ConflictException extends AppException {
  readonly httpStatus = 409;
  constructor(errorCode = 'CONFLICT', message = 'Conflict occurred.', cause?: Error) {
    super(errorCode, message, { cause });
  }
}

/** 429 — Rate limit exceeded */
export class RateLimitException extends AppException {
  readonly httpStatus = 429;
  constructor(retryAfter: number) {
    super('RATE_LIMIT_EXCEEDED', `Too many requests. Retry after ${retryAfter} seconds.`);
  }
}

/** 502 — Downstream service failure */
export class ExternalServiceException extends AppException {
  readonly httpStatus = 502;
  constructor(service: string, cause?: Error) {
    super(`${service.toUpperCase()}_UNAVAILABLE`, `External service ${service} is unavailable`, { cause });
  }
}

/** 500 — DB/Redis failure */
export class InfrastructureException extends AppException {
  readonly httpStatus = 500;
  constructor(errorCode: string, message: string, cause?: Error) {
    super(errorCode, message, { cause });
  }
}

/** 400 — Invalid value object construction */
export class DomainException extends AppException {
  readonly httpStatus = 400;
  constructor(errorCode: string, message: string, details: FieldError[] = []) {
    super(errorCode, message, { details });
  }
}
