/**
 * Application error classes for the PreOne platform.
 *
 * Provides a hierarchy of typed errors with machine-readable error codes,
 * optional context payloads, and safe serialization for API responses.
 *
 * @module errors
 */

/** Machine-readable error code for categorisation and routing. */
export type ErrorCode =
  | 'APP_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

/** Arbitrary context attached to an error for debugging and logging. */
export type ErrorContext = Record<string, unknown>;

/**
 * Base application error class.
 *
 * Extends the native `Error` with a structured `code`, optional `context`,
 * and a safe `toJSON()` method for API responses.
 *
 * @example
 * ```ts
 * throw new AppError('Something went wrong', {
 *   code: 'APP_ERROR',
 *   context: { requestId: 'abc-123' },
 * });
 * ```
 */
export class AppError extends Error {
  /** Machine-readable error code. */
  public readonly code: ErrorCode;
  /** Arbitrary debugging context. */
  public readonly context: ErrorContext;
  /** HTTP status code hint (defaults to 500). */
  public readonly statusCode: number;

  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      context?: ErrorContext;
      statusCode?: number;
      cause?: Error;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'AppError';
    this.code = options?.code ?? 'APP_ERROR';
    this.context = options?.context ?? {};
    this.statusCode = options?.statusCode ?? 500;
  }

  /**
   * Return a safe, JSON-serialisable representation of the error.
   *
   * Excludes the stack trace and any non-serialisable context values.
   */
  toJSON(): { name: string; message: string; code: ErrorCode; context: ErrorContext; statusCode: number } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Error thrown when input validation fails.
 *
 * @example
 * ```ts
 * throw new ValidationError('Email is invalid', {
 *   context: { field: 'email', value: userInput.email },
 * });
 * ```
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    options?: { context?: ErrorContext; cause?: Error },
  ) {
    super(message, {
      code: 'VALIDATION_ERROR',
      context: options?.context,
      statusCode: 400,
      cause: options?.cause,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a requested resource cannot be found.
 *
 * @example
 * ```ts
 * throw new NotFoundError('User', { context: { userId: id } });
 * ```
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    options?: { context?: ErrorContext; cause?: Error },
  ) {
    super(`${resource} not found`, {
      code: 'NOT_FOUND',
      context: options?.context,
      statusCode: 404,
      cause: options?.cause,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Error thrown when authentication fails or is absent.
 *
 * @example
 * ```ts
 * throw new UnauthorizedError('Invalid or expired token');
 * ```
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    options?: { context?: ErrorContext; cause?: Error },
  ) {
    super(message, {
      code: 'UNAUTHORIZED',
      context: options?.context,
      statusCode: 401,
      cause: options?.cause,
    });
    this.name = 'UnauthorizedError';
  }
}

/**
 * Error thrown when an authenticated user lacks permission.
 *
 * @example
 * ```ts
 * throw new ForbiddenError('Insufficient role permissions');
 * ```
 */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Access denied',
    options?: { context?: ErrorContext; cause?: Error },
  ) {
    super(message, {
      code: 'FORBIDDEN',
      context: options?.context,
      statusCode: 403,
      cause: options?.cause,
    });
    this.name = 'ForbiddenError';
  }
}
