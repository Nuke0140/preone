// ============================================================================
// @preone/core — Error Factory
// ============================================================================

import {
  AppError,
  AppErrorType,
  AppErrorOptions,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ServerError,
} from './error-classes';

/** Map of error types to factory functions. */
const ERROR_FACTORY_MAP: Record<AppErrorType, (message: string, options: AppErrorOptions) => AppError> = {
  validation: (msg, opts) => new ValidationError(msg, opts),
  not_found: (msg, opts) => new NotFoundError(msg, opts),
  unauthorized: (msg, opts) => new UnauthorizedError(msg, opts),
  forbidden: (msg, opts) => new ForbiddenError(msg, opts),
  conflict: (msg, opts) => new ConflictError(msg, opts),
  rate_limit: (msg, opts) => new RateLimitError(msg, opts),
  network: (msg, opts) => new NetworkError(msg, opts),
  timeout: (msg, opts) => new TimeoutError(msg, opts),
  server: (msg, opts) => new ServerError(msg, opts),
};

/**
 * Create an AppError of the given type.
 */
export function createError(
  type: AppErrorType,
  message: string,
  options: AppErrorOptions = {},
): AppError {
  const factory = ERROR_FACTORY_MAP[type];
  return factory(message, options);
}

/**
 * Convert an unknown thrown value into an AppError.
 * If it's already an AppError, return it as-is.
 * If it's a native Error, wrap it in a ServerError.
 * Otherwise, wrap the stringified value in a ServerError.
 */
export function fromUnknown(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return new ServerError(error.message, { cause: error });
  }
  const message = typeof error === 'string' ? error : String(error);
  return new ServerError(message);
}

/**
 * Type guard — check if a value is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get the error type from an unknown error.
 * Returns 'unknown' if the error is not an AppError.
 */
export function getErrorType(error: unknown): AppErrorType | 'unknown' {
  if (isAppError(error)) return error.type;
  return 'unknown';
}
