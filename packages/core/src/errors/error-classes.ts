// ============================================================================
// @preone/core — Error Classes
// ============================================================================

/** Error type enum for categorizing application errors. */
export type AppErrorType =
  | 'validation'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'rate_limit'
  | 'network'
  | 'timeout'
  | 'server';

/** Options for constructing an AppError. */
export interface AppErrorOptions {
  readonly code?: string;
  readonly statusCode?: number;
  readonly details?: Record<string, unknown>;
  readonly cause?: Error;
}

// ----------------------------------------------------------------------------
// Base AppError
// ----------------------------------------------------------------------------

/**
 * Base application error class.
 * All domain-specific errors extend this class.
 */
export class AppError extends Error {
  readonly type: AppErrorType;
  readonly code: string;
  readonly statusCode: number;
  readonly details: Record<string, unknown>;

  constructor(
    message: string,
    type: AppErrorType = 'server',
    options: AppErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.type = type;
    this.code = options.code ?? type.toUpperCase().replace('_', '_');
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details ?? {};

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

// ----------------------------------------------------------------------------
// Domain Errors
// ----------------------------------------------------------------------------

/** Validation error — input data is invalid. */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    options: AppErrorOptions = {},
  ) {
    super(message, 'validation', { ...options, statusCode: options.statusCode ?? 400, code: options.code ?? 'VALIDATION_ERROR' });
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** Not found error — requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    options: AppErrorOptions = {},
  ) {
    super(message, 'not_found', { ...options, statusCode: options.statusCode ?? 404, code: options.code ?? 'NOT_FOUND' });
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/** Unauthorized error — authentication is required. */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    options: AppErrorOptions = {},
  ) {
    super(message, 'unauthorized', { ...options, statusCode: options.statusCode ?? 401, code: options.code ?? 'UNAUTHORIZED' });
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/** Forbidden error — user lacks permission. */
export class ForbiddenError extends AppError {
  constructor(
    message: string = 'Access denied',
    options: AppErrorOptions = {},
  ) {
    super(message, 'forbidden', { ...options, statusCode: options.statusCode ?? 403, code: options.code ?? 'FORBIDDEN' });
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** Conflict error — resource state conflict. */
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource conflict',
    options: AppErrorOptions = {},
  ) {
    super(message, 'conflict', { ...options, statusCode: options.statusCode ?? 409, code: options.code ?? 'CONFLICT' });
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/** Rate limit error — too many requests. */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    options: AppErrorOptions = {},
  ) {
    super(message, 'rate_limit', { ...options, statusCode: options.statusCode ?? 429, code: options.code ?? 'RATE_LIMIT_EXCEEDED' });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/** Network error — connection or transport issue. */
export class NetworkError extends AppError {
  constructor(
    message: string = 'Network error',
    options: AppErrorOptions = {},
  ) {
    super(message, 'network', { ...options, statusCode: options.statusCode ?? 0, code: options.code ?? 'NETWORK_ERROR' });
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/** Timeout error — operation took too long. */
export class TimeoutError extends AppError {
  constructor(
    message: string = 'Operation timed out',
    options: AppErrorOptions = {},
  ) {
    super(message, 'timeout', { ...options, statusCode: options.statusCode ?? 408, code: options.code ?? 'TIMEOUT' });
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/** Server error — unexpected server-side failure. */
export class ServerError extends AppError {
  constructor(
    message: string = 'Internal server error',
    options: AppErrorOptions = {},
  ) {
    super(message, 'server', { ...options, statusCode: options.statusCode ?? 500, code: options.code ?? 'SERVER_ERROR' });
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}
