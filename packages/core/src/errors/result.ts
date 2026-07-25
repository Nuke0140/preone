// ============================================================================
// @preone/core — Result Type Implementation
// ============================================================================

import type { Ok, Err, Result } from '../types';

/**
 * Create a successful Result containing a value.
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create a failed Result containing an error.
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard — check if a Result is successful.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard — check if a Result is a failure.
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Execute a synchronous function and return a Result.
 * If the function throws, the error is captured in the Result.
 */
export function tryCatch<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error as E);
  }
}

/**
 * Execute an async function and return a Result.
 * If the function rejects, the error is captured in the Result.
 */
export async function tryCatchAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(error as E);
  }
}
