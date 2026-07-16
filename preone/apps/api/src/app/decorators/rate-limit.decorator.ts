/**
 * Rate-limit policy catalog (BTD §20.1 — Rate Limiting).
 *
 * Per BTD §20.1 — Defense-in-Depth:
 *   "Rate limiting: per-IP + per-user. Auth routes: 5 req/min per IP.
 *    Write routes: 30 req/min per user. Read routes: 200 req/min per user.
 *    Export routes: 5 req/min per user (CSV/PDF generation is expensive).
 *    Public routes: 60 req/min per IP (no auth → user-level limit impossible)."
 *
 * Per BTD §22.6 — Operational Tuning:
 *   "Rate-limit thresholds externalised to config — ops can tune without
 *    redeploying. Per-tenant overrides via Redis hash key
 *    `rl:override:<tenantId>:<policy>`."
 *
 * This module exports:
 *   - RateLimitPolicy enum — symbolic name for each policy
 *   - RATE_LIMIT_POLICY_TABLE — concrete { limit, ttl } for each policy
 *   - @RateLimit(policy) decorator — applies the named throttler to a route
 *   - resolveRateLimitOverride(tenantId, policy, redis) — for per-tenant overrides
 *
 * Usage in controllers:
 *   @Post('login')
 *   @RateLimit(RateLimitPolicy.AUTH)
 *   async login(...) { ... }
 *
 *   @Post('students')
 *   @RateLimit(RateLimitPolicy.WRITE)
 *   async create(...) { ... }
 *
 * The decorator expands to @Throttle({ <policy>: { limit, ttl } }) which the
 * global ThrottlerGuard reads. Multiple named throttlers can co-exist on a
 * single route (each is evaluated independently).
 */
import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// ─────────────────────────────────────────────
// Policy enum — symbolic name; concrete values in table below
// ─────────────────────────────────────────────

export enum RateLimitPolicy {
  /** Default fallback for routes without explicit @RateLimit — 100 req/min. */
  DEFAULT = 'default',
  /** Auth routes (login, register, OTP, password reset) — 5 req/min per IP. */
  AUTH = 'auth',
  /** Write routes (POST/PUT/PATCH/DELETE on resource endpoints) — 30 req/min per user. */
  WRITE = 'write',
  /** Read routes (GET list / GET detail) — 200 req/min per user. */
  READ = 'read',
  /** Export routes (CSV/PDF/XLSX generation) — 5 req/min per user. */
  EXPORT = 'export',
  /** Public routes (health, swagger, public marketing pages) — 60 req/min per IP. */
  PUBLIC = 'public',
  /** Sensitive PII access (view Aadhaar, view PAN) — 10 req/min per user. */
  PII = 'pii',
}

// ─────────────────────────────────────────────
// Concrete limit / ttl per policy
// ─────────────────────────────────────────────

export interface RateLimitConfig {
  /** Window size in milliseconds. */
  ttl: number;
  /** Maximum requests per window. */
  limit: number;
}

export const RATE_LIMIT_POLICY_TABLE: Record<RateLimitPolicy, RateLimitConfig> = {
  [RateLimitPolicy.DEFAULT]: { ttl: 60_000, limit: 100 },
  [RateLimitPolicy.AUTH]:    { ttl: 60_000, limit: 5 },
  [RateLimitPolicy.WRITE]:   { ttl: 60_000, limit: 30 },
  [RateLimitPolicy.READ]:    { ttl: 60_000, limit: 200 },
  [RateLimitPolicy.EXPORT]:  { ttl: 60_000, limit: 5 },
  [RateLimitPolicy.PUBLIC]:  { ttl: 60_000, limit: 60 },
  [RateLimitPolicy.PII]:     { ttl: 60_000, limit: 10 },
};

// ─────────────────────────────────────────────
// @RateLimit(policy) decorator
// ─────────────────────────────────────────────

export const RATE_LIMIT_POLICY_KEY = 'rateLimitPolicy';

/**
 * Apply a named rate-limit policy to a route or controller.
 *
 * Expands to @Throttle({ <policy>: { limit, ttl } }) under the hood, so the
 * global ThrottlerGuard evaluates it. Multiple @RateLimit decorators on the
 * same route are NOT supported — use @Throttle directly for that.
 *
 * The policy name is also stored as route metadata for audit logging +
 * metrics tagging.
 *
 * Usage:
 *   @Post('login')
 *   @RateLimit(RateLimitPolicy.AUTH)
 *   async login(...) { ... }
 */
export function RateLimit(policy: RateLimitPolicy): MethodDecorator & ClassDecorator {
  const config = RATE_LIMIT_POLICY_TABLE[policy];
  return function (target: unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Store policy name as metadata for observability
    SetMetadata(RATE_LIMIT_POLICY_KEY, policy)(target as object, propertyKey!, descriptor!);
    // Apply @Throttle with the policy's named throttler
    Throttle({ [policy]: { limit: config.limit, ttl: config.ttl } })(
      target as object,
      propertyKey!,
      descriptor!,
    );
  };
}

// ─────────────────────────────────────────────
// Per-tenant override resolution (BTD §22.6)
// ─────────────────────────────────────────────

/**
 * Resolve an effective rate-limit config for a given tenant + policy.
 *
 * Checks Redis hash key `rl:override:<tenantId>:<policy>` for an override.
 * Falls back to the policy table default if no override is set.
 *
 * Format of override hash fields:
 *   limit: "50"
 *   ttl:   "120000"
 *
 * Per BTD §22.6, ops can set overrides at runtime via:
 *   redis-cli HSET rl:override:<tenantId>:write limit 50 ttl 120000
 *
 * Implementation note: this is intentionally NOT used inside the request hot
 * path (ThrottlerGuard reads the static config). Per-tenant overrides require
 * a custom ThrottlerStorage service — to be added in Wave 10.
 */
export async function resolveRateLimitOverride(
  tenantId: string,
  policy: RateLimitPolicy,
  redis?: { hgetall: (key: string) => Promise<Record<string, string> | null> },
): Promise<RateLimitConfig> {
  const fallback = RATE_LIMIT_POLICY_TABLE[policy];
  if (!redis) return fallback;
  try {
    const override = await redis.hgetall(`rl:override:${tenantId}:${policy}`);
    if (!override) return fallback;
    return {
      ttl: Number(override.ttl ?? fallback.ttl),
      limit: Number(override.limit ?? fallback.limit),
    };
  } catch {
    return fallback;
  }
}
