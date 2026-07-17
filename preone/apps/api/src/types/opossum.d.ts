/**
 * Ambient declaration for `opossum` circuit breaker.
 *
 * The library ships its own runtime but no bundled .d.ts; @types/opossum is
 * not installed. We declare a minimal shape that matches how
 * `CircuitBreakerFactory` (src/infrastructure/integrations/circuit-breaker.ts)
 * actually uses the API — fire-and-forget event emitters, .fire(), .stats,
 * .opened/.closed/.halfOpen flags.
 */
declare module 'opossum' {
  interface CircuitBreakerOptions {
    timeout?: number;
    resetTimeout?: number;
    errorThresholdPercentage?: number;
    rollingCountTimeout?: number;
    maxRetries?: number;
    name?: string;
    enabled?: boolean;
    volumeThreshold?: number;
    errorFilter?: (err: unknown) => boolean;
  }

  interface CircuitBreakerStats {
    failures: number;
    successes: number;
    fallbacks: number;
    rejects: number;
    fires: number;
    timeouts: number;
    cacheHits: number;
    cacheMisses: number;
    semaphoreRejections: number;
    percentiles: Record<number, number>;
    latencyMean: number;
    latencyTimes: number[];
  }

  class CircuitBreaker<TArgs extends unknown[] = unknown[], TResult = unknown> {
    constructor(
      fn: (...args: TArgs) => Promise<TResult>,
      options?: CircuitBreakerOptions,
    );

    readonly name: string;
    readonly opened: boolean;
    readonly closed: boolean;
    readonly halfOpen: boolean;
    readonly pendingState: boolean;
    readonly warmup: boolean;
    readonly stats: CircuitBreakerStats;

    fire(...args: TArgs): Promise<TResult>;
    call(...args: TArgs): Promise<TResult>;
    execute(...args: TArgs): Promise<TResult>;

    on(event: string, listener: (...args: unknown[]) => void): this;
    off(event: string, listener: (...args: unknown[]) => void): this;
    once(event: string, listener: (...args: unknown[]) => void): this;

    open(): void;
    close(): void;
    shutdown(): Promise<void>;
    isEnabled(): boolean;
    enable(): void;
    disable(): void;
  }

  export = CircuitBreaker;
}
