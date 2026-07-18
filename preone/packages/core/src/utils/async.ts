/**
 * Async utility functions for the PreOne platform.
 *
 * Uses `globalThis.setTimeout` / `globalThis.clearTimeout` for cross-platform
 * compatibility (Node.js, browsers, edge runtimes).
 *
 * @module utils/async
 */

/** @internal Cross-platform timer references. */
const _setTimeout = globalThis.setTimeout.bind(globalThis);
/** @internal Cross-platform timer references. */
const _clearTimeout = globalThis.clearTimeout.bind(globalThis);
/** @internal Cross-platform console reference. */
const _console = globalThis.console;

/**
 * Create a debounced version of a function.
 *
 * The debounced function delays invocation until `delayMs` milliseconds have
 * elapsed since the last call. An optional `options.maxWait` guarantees
 * at least one invocation within that window.
 *
 * @typeParam T - The function signature to debounce.
 * @param fn - The function to debounce.
 * @param delayMs - The debounce delay in milliseconds.
 * @param options - Optional configuration.
 * @param options.maxWait - Maximum time (ms) the function can be delayed
 *   before being called regardless of debounce.
 * @returns A debounced function with `.cancel()` and `.flush()` methods.
 *
 * @example
 * ```ts
 * const debounced = debounce(save, 300);
 * input.addEventListener('input', debounced);
 * // Later…
 * debounced.cancel(); // discard pending call
 * ```
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
  options?: { maxWait?: number },
): ((...args: Parameters<T>) => void) & { cancel: () => void; flush: () => void } {
  let timerId: ReturnType<typeof _setTimeout> | undefined;
  let maxTimerId: ReturnType<typeof _setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;

  function invoke() {
    _clearTimeout(timerId);
    _clearTimeout(maxTimerId);
    timerId = undefined;
    maxTimerId = undefined;
    if (lastArgs !== undefined) {
      fn(...lastArgs);
      lastArgs = undefined;
    }
  }

  function debounced(...args: Parameters<T>) {
    lastArgs = args;

    _clearTimeout(timerId);

    if (options?.maxWait !== undefined && maxTimerId === undefined) {
      maxTimerId = _setTimeout(() => {
        invoke();
      }, options.maxWait);
    }

    timerId = _setTimeout(() => {
      invoke();
    }, delayMs);
  }

  debounced.cancel = () => {
    _clearTimeout(timerId);
    _clearTimeout(maxTimerId);
    timerId = undefined;
    maxTimerId = undefined;
    lastArgs = undefined;
  };

  debounced.flush = () => {
    invoke();
  };

  return debounced;
}

/**
 * Create a throttled version of a function.
 *
 * The throttled function executes at most once every `intervalMs` milliseconds.
 * The **first** call is always executed immediately; subsequent calls within
 * the interval are dropped unless `options.trailing` is `true`, in which case
 * the last call is deferred to the end of the interval.
 *
 * @typeParam T - The function signature to throttle.
 * @param fn - The function to throttle.
 * @param intervalMs - The minimum interval between invocations in milliseconds.
 * @param options - Optional configuration.
 * @param options.trailing - Whether to invoke the function with the last set
 *   of arguments at the end of the interval. Defaults to `true`.
 * @returns A throttled function with `.cancel()` method.
 *
 * @example
 * ```ts
 * const throttled = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttled);
 * ```
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number,
  options?: { trailing?: boolean },
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  const trailing = options?.trailing ?? true;
  let timerId: ReturnType<typeof _setTimeout> | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastCallTime = 0;

  function invoke(args: Parameters<T>) {
    lastCallTime = Date.now();
    fn(...args);
  }

  function trailingCall() {
    timerId = undefined;
    if (lastArgs !== undefined && trailing) {
      invoke(lastArgs);
      lastArgs = undefined;
    }
  }

  function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const elapsed = now - lastCallTime;

    if (elapsed >= intervalMs) {
      _clearTimeout(timerId);
      timerId = undefined;
      lastArgs = undefined;
      invoke(args);
    } else {
      lastArgs = args;
      if (timerId === undefined) {
        timerId = _setTimeout(trailingCall, intervalMs - elapsed);
      }
    }
  }

  throttled.cancel = () => {
    _clearTimeout(timerId);
    timerId = undefined;
    lastArgs = undefined;
  };

  return throttled;
}

/**
 * Return a promise that resolves after the specified delay.
 *
 * @param ms - Duration in milliseconds.
 * @returns A promise that resolves with `void` after `ms`.
 *
 * @example
 * ```ts
 * await sleep(1000);
 * console.log('1 second later');
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => _setTimeout(resolve, ms));
}

/** Options for the `retry` function. */
export interface RetryOptions {
  /** Maximum number of attempts (including the first call). Defaults to `3`. */
  maxAttempts?: number;
  /** Base delay in milliseconds between retries. Defaults to `1000`. */
  delayMs?: number;
  /** Exponential back-off multiplier. Defaults to `2`. */
  backoffFactor?: number;
  /** Maximum delay cap in milliseconds. Defaults to `30000`. */
  maxDelayMs?: number;
  /** Optional predicate to decide whether a specific error is retryable. */
  retryIf?: (error: unknown) => boolean;
}

/**
 * Retry an async operation with exponential back-off.
 *
 * @typeParam T - The return type of the operation.
 * @param fn - The async function to execute.
 * @param options - Retry configuration.
 * @returns The result of `fn` if it succeeds within the allowed attempts.
 * @throws The last encountered error if all attempts fail or the error is
 *   not retryable.
 *
 * @example
 * ```ts
 * const data = await retry(fetchData, {
 *   maxAttempts: 5,
 *   delayMs: 500,
 *   retryIf: (err) => err instanceof NetworkError,
 * });
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    maxDelayMs = 30_000,
    retryIf,
  } = options ?? {};

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (retryIf && !retryIf(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const jitter = Math.random() * 0.2 * delayMs;
        const delay = Math.min(delayMs * Math.pow(backoffFactor, attempt - 1) + jitter, maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Wrap an async operation with a timeout.
 *
 * If the promise does not settle within `ms` milliseconds, it is rejected
 * with a `TimeoutError`.
 *
 * @typeParam T - The return type of the operation.
 * @param fn - The async function or promise to race against the timeout.
 * @param ms - Timeout threshold in milliseconds.
 * @param message - Custom error message. Defaults to `"Operation timed out"`.
 * @returns The result of `fn` if it settles within the timeout.
 * @throws {TimeoutError} When the timeout expires.
 *
 * @example
 * ```ts
 * const result = await timeout(fetchData(), 5000, 'Data fetch took too long');
 * ```
 */
export async function timeout<T>(
  fn: Promise<T> | (() => Promise<T>),
  ms: number,
  message: string = 'Operation timed out',
): Promise<T> {
  const promise = typeof fn === 'function' ? fn() : fn;

  let timerId: ReturnType<typeof _setTimeout>;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timerId = _setTimeout(() => {
      reject(new TimeoutError(message));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    _clearTimeout(timerId!);
  }
}

/**
 * Error thrown by `timeout` when an operation exceeds its time limit.
 */
export class TimeoutError extends Error {
  constructor(message: string = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}
