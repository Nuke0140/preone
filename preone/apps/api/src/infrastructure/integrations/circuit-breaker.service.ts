/**
 * CircuitBreakerService — generic circuit breaker for external integrations.
 *
 * Wave 17 standardizes how all 8 external providers (SMS, WhatsApp, Email,
 * Payment, Biometric, AI/LLM, Cloud Storage, KYC) handle downstream
 * outages. Without a circuit breaker, a slow provider backs up API
 * workers + causes cascading failures (BTD §20.4 — Resilience patterns).
 *
 * States (per Michael Nygard's "Release It!" pattern):
 *
 *   CLOSED      — normal operation. Calls pass through. Failures increment
 *                 a rolling counter. When `failureThreshold` is reached
 *                 within `failureWindowSeconds`, transition to OPEN.
 *
 *   OPEN        — calls fail immediately with CircuitOpenError (no network
 *                 round-trip). After `resetTimeoutSeconds`, transition to
 *                 HALF_OPEN.
 *
 *   HALF_OPEN   — a single probe call is allowed through. If it succeeds,
 *                 transition to CLOSED. If it fails, transition back to
 *                 OPEN (and the reset timer starts again).
 *
 * Concurrency:
 *   - State + counters are kept in-process (per-instance). For multi-replica
 *     deployments, each replica maintains its own breaker — acceptable
 *     because a downstream outage is usually visible to every replica
 *     within seconds.
 *   - State is NOT shared via Redis — that would add latency to every
 *     call. Wave 17.1 can add a Redis-backed shared state if needed.
 *
 * Latency:
 *   - The breaker itself is synchronous + in-memory. It does not touch
 *     the network, disk, or Redis. Adding it to a provider call costs
 *     ~0.01ms (a Map lookup + a few integer ops).
 */
import { Injectable, Logger } from '@nestjs/common';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(
      `Circuit "${circuitName}" is OPEN — calls are failing fast. ` +
        `Retry in ${retryAfterSeconds}s.`,
    );
    this.name = 'CircuitOpenError';
  }
}

export interface CircuitBreakerOptions {
  /** Name of the circuit — used in logs + errors. */
  name: string;
  /** Number of failures within `failureWindowSeconds` that trips the circuit. */
  failureThreshold: number;
  /** Rolling window size for failure counting (seconds). */
  failureWindowSeconds: number;
  /** How long to stay OPEN before transitioning to HALF_OPEN (seconds). */
  resetTimeoutSeconds: number;
  /** Calls slower than this (ms) are counted as failures (latency trip). */
  slowCallDurationMs?: number;
}

interface CircuitState_ {
  state: CircuitState;
  /** Timestamps of recent failures (ms since epoch). Pruned to window. */
  failureTimestamps: number[];
  /** When the circuit opened (ms since epoch). Used to compute reset. */
  openedAt?: number;
  /** True if a HALF_OPEN probe is in flight. */
  halfOpenProbeInFlight: boolean;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  /** Per-circuit state, keyed by circuit name. */
  private readonly circuits = new Map<string, CircuitState_>();
  /** Per-circuit options. */
  private readonly options = new Map<string, CircuitBreakerOptions>();

  /**
   * Register a circuit with its options. Idempotent — re-registering
   * with the same name updates the options without resetting the state.
   */
  register(opts: CircuitBreakerOptions): void {
    this.options.set(opts.name, opts);
    if (!this.circuits.has(opts.name)) {
      this.circuits.set(opts.name, {
        state: 'CLOSED',
        failureTimestamps: [],
        halfOpenProbeInFlight: false,
      });
    }
  }

  /**
   * Execute `fn` under circuit-breaker protection.
   *
   * - CLOSED: call passes through; on failure, increment counter; if
   *   threshold reached within window, open the circuit.
   * - OPEN: fail fast with CircuitOpenError (no call to `fn`).
   * - HALF_OPEN: one probe call allowed; success → CLOSED; failure → OPEN.
   *
   * `fn` is expected to throw on failure. The breaker catches all throws
   * (including timeouts) and counts them as failures.
   */
  async exec<T>(circuitName: string, fn: () => Promise<T>): Promise<T> {
    const opts = this.options.get(circuitName);
    if (!opts) {
      // No circuit registered — just call through. (Defensive: allows
      // providers to be used without a breaker in dev / test.)
      return fn();
    }
    const state = this.circuits.get(circuitName)!;

    // Refresh state — if OPEN and reset timeout has elapsed, transition
    // to HALF_OPEN.
    this.maybeTransitionToHalfOpen(circuitName, state, opts);

    if (state.state === 'OPEN') {
      const retryAfter = Math.max(
        0,
        Math.ceil(
          (state.openedAt! + opts.resetTimeoutSeconds * 1000 - Date.now()) /
            1000,
        ),
      );
      throw new CircuitOpenError(circuitName, retryAfter);
    }

    if (state.state === 'HALF_OPEN' && state.halfOpenProbeInFlight) {
      // Only one probe at a time in HALF_OPEN.
      throw new CircuitOpenError(circuitName, opts.resetTimeoutSeconds);
    }

    if (state.state === 'HALF_OPEN') {
      state.halfOpenProbeInFlight = true;
    }

    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;

      // Slow call detection (optional)
      if (opts.slowCallDurationMs && durationMs > opts.slowCallDurationMs) {
        this.recordFailure(circuitName, state, opts);
      } else if (state.state === 'HALF_OPEN') {
        // Probe succeeded — close the circuit.
        this.closeCircuit(circuitName, state);
      }
      return result;
    } catch (err) {
      this.recordFailure(circuitName, state, opts);
      throw err;
    } finally {
      if (state.state === 'HALF_OPEN') {
        state.halfOpenProbeInFlight = false;
      }
    }
  }

  /** Current state of a circuit — for health checks + dashboards. */
  getState(circuitName: string): CircuitState | undefined {
    return this.circuits.get(circuitName)?.state;
  }

  /** Manually trip a circuit (e.g., from a downstream webhook). */
  trip(circuitName: string): void {
    const state = this.circuits.get(circuitName);
    if (!state) return;
    state.state = 'OPEN';
    state.openedAt = Date.now();
    this.logger.warn(`Circuit "${circuitName}" manually tripped → OPEN`);
  }

  /** Manually reset a circuit (e.g., after a downstream recovery webhook). */
  reset(circuitName: string): void {
    const state = this.circuits.get(circuitName);
    if (!state) return;
    state.state = 'CLOSED';
    state.failureTimestamps = [];
    state.openedAt = undefined;
    state.halfOpenProbeInFlight = false;
    this.logger.log(`Circuit "${circuitName}" manually reset → CLOSED`);
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private maybeTransitionToHalfOpen(
    name: string,
    state: CircuitState_,
    opts: CircuitBreakerOptions,
  ): void {
    if (state.state !== 'OPEN') return;
    const elapsed = Date.now() - (state.openedAt ?? 0);
    if (elapsed >= opts.resetTimeoutSeconds * 1000) {
      state.state = 'HALF_OPEN';
      state.halfOpenProbeInFlight = false;
      this.logger.log(`Circuit "${name}" OPEN → HALF_OPEN (probing)`);
    }
  }

  private recordFailure(
    name: string,
    state: CircuitState_,
    opts: CircuitBreakerOptions,
  ): void {
    const now = Date.now();
    state.failureTimestamps.push(now);
    // Prune failures outside the rolling window.
    const cutoff = now - opts.failureWindowSeconds * 1000;
    state.failureTimestamps = state.failureTimestamps.filter(
      (t) => t >= cutoff,
    );

    if (state.state === 'HALF_OPEN') {
      // Probe failed — back to OPEN.
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit "${name}" HALF_OPEN → OPEN (probe failed)`,
      );
      return;
    }

    if (state.state === 'CLOSED' &&
        state.failureTimestamps.length >= opts.failureThreshold) {
      state.state = 'OPEN';
      state.openedAt = now;
      this.logger.warn(
        `Circuit "${name}" CLOSED → OPEN ` +
          `(${state.failureTimestamps.length} failures in ${opts.failureWindowSeconds}s)`,
      );
    }
  }

  private closeCircuit(name: string, state: CircuitState_): void {
    state.state = 'CLOSED';
    state.failureTimestamps = [];
    state.openedAt = undefined;
    state.halfOpenProbeInFlight = false;
    this.logger.log(`Circuit "${name}" HALF_OPEN → CLOSED (probe succeeded)`);
  }
}
