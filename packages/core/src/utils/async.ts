// ============================================================================
// @preone/core — Async Utilities
// ============================================================================

/**
 * Debounce a function — delays invocation until after `wait` ms have elapsed
 * since the last call. Returns the debounced function with a .cancel() method.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

/**
 * Throttle a function — invokes at most once every `limit` ms.
 * Returns the throttled function with a .cancel() method.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const elapsed = now - lastCall;
    if (elapsed >= limit) {
      lastCall = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn(...args);
      }, limit - elapsed);
    }
  };

  throttled.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return throttled;
}

/**
 * Sleep for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 * @param fn - The function to retry
 * @param retries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @param shouldRetry - Optional predicate to decide if a specific error should be retried
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelay: number = 1000,
  shouldRetry?: (error: unknown) => boolean,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelay * 0.1;
        await sleep(delay + jitter);
      }
    }
  }
  throw lastError;
}

/**
 * Wrap a promise with a timeout. Rejects with a TimeoutError if the promise
 * doesn't resolve within the given milliseconds.
 */
export function timeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message ?? `Operation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Retry wrapper that returns a tuple [result, error] instead of throwing.
 * Uses exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelay: number = 1000,
): Promise<[T | null, unknown]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      return [result, null];
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * baseDelay * 0.1;
        await sleep(delay + jitter);
      }
    }
  }
  return [null, lastError];
}

/**
 * Execute async functions sequentially, passing the result of each to the next.
 */
export async function sequential<T>(
  fns: readonly (() => Promise<T>)[],
): Promise<T[]> {
  const results: T[] = [];
  for (const fn of fns) {
    results.push(await fn());
  }
  return results;
}

/**
 * Execute async functions in parallel with optional concurrency limit.
 */
export async function parallel<T>(
  fns: readonly (() => Promise<T>)[],
  concurrency?: number,
): Promise<T[]> {
  if (!concurrency || concurrency >= fns.length) {
    return Promise.all(fns.map((fn) => fn()));
  }

  const results: T[] = new Array(fns.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < fns.length) {
      const index = nextIndex++;
      const taskFn = fns[index];
      if (taskFn) {
        results[index] = await taskFn();
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, fns.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Concurrent pool — execute tasks with a fixed concurrency limit.
 * Returns results in the order tasks were provided.
 */
export class ConcurrentPool<T> {
  private readonly concurrency: number;
  private readonly tasks: (() => Promise<T>)[];
  private results: (T | Error)[];

  constructor(concurrency: number) {
    if (concurrency < 1) throw new RangeError('Concurrency must be at least 1');
    this.concurrency = concurrency;
    this.tasks = [];
    this.results = [];
  }

  /** Add a task to the pool. */
  add(task: () => Promise<T>): void {
    this.tasks.push(task);
  }

  /** Run all tasks with the configured concurrency. Returns results in order. */
  async run(): Promise<T[]> {
    this.results = new Array(this.tasks.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < this.tasks.length) {
        const index = nextIndex++;
        const taskFn = this.tasks[index];
        if (taskFn) {
          try {
            this.results[index] = await taskFn();
          } catch (error) {
            this.results[index] = error instanceof Error ? error : new Error(String(error));
          }
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(this.concurrency, this.tasks.length) },
      () => worker(),
    );
    await Promise.all(workers);

    // Throw if any task failed
    for (const result of this.results) {
      if (result instanceof Error) {
        throw result;
      }
    }

    return this.results as T[];
  }
}
