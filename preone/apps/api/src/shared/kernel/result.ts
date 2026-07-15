/**
 * Result<T, E> — Railway-oriented programming type for fallible operations.
 *
 * Per Backend TD §26.1: "Use Result<T, E> type for fallible operations
 * (no thrown exceptions in domain layer)."
 *
 * Usage:
 *   const result = StudentAggregate.create(props);
 *   if (result.isErr()) return handleErr(result.error);
 *   const student = result.value;
 */

export interface Ok<T> { ok: true; value: T }
export interface Err<E> { ok: false; error: E }

export type Result<T, E = Error> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export function isOk<T, E>(r: Result<T, E>): r is Ok<T> {
  return r.ok === true;
}

export function isErr<T, E>(r: Result<T, E>): r is Err<E> {
  return r.ok === false;
}

export function unwrap<T, E>(r: Result<T, E>): T {
  if (isErr(r)) throw r.error;
  return r.value;
}
