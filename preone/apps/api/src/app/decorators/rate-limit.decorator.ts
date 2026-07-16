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
 *   - TenantRateLimitCache — in-process TTL cache for override lookups (Wave 10)
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
 *
 * Wave 10: per-tenant overrides are now LIVE. The TenantAwareThrottlerGuard
 * looks up Redis hash `rl:override:<tenantId>:<policy>` for each authenticated
 * request and replaces the static limit/ttl. See guards/tenant-aware-throttler.guard.ts.
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
 * metrics tagging + per-tenant override resolution.
 *
 * Usage:
 *   @Post('login')
 *   @RateLimit(RateLimitPolicy.AUTH)
 *   async login(...) { ... }
 */
export function RateLimit(policy: RateLimitPolicy): MethodDecorator & ClassDecorator {
  const config = RATE_LIMIT_POLICY_TABLE[policy];
  return function (target: unknown, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) {
    // Store policy name as metadata for observability + per-tenant override resolution
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
// Per-tenant override resolution (BTD §22.6) — Wave 10 hook made LIVE
// ─────────────────────────────────────────────

/**
 * Minimal Redis-like client interface for override lookups.
 * Decouples the resolver from ioredis so tests can pass a stub.
 */
export interface RateLimitRedisClient {
  hgetall(key: string): Promise<Record<string, string> | null>;
}

/**
 * Resolve an effective rate-limit config for a given tenant + policy.
 *
 * Checks Redis hash key `rl:override:<tenantId>:<policy>` for an override.
 * Falls back to the policy table default if no override is set, or if Redis
 * is unavailable (circuit-breaker semantics — never fail the request due to
 * rate-limit config lookup failure).
 *
 * Format of override hash fields:
 *   limit: "50"
 *   ttl:   "120000"
 *
 * Per BTD §22.6, ops can set overrides at runtime via:
 *   redis-cli HSET rl:override:<tenantId>:write limit 50 ttl 120000
 *
 * Wave 10: this function is now invoked inside TenantAwareThrottlerGuard on
 * every authenticated request. To avoid hitting Redis on every single request,
 * the guard wraps it in TenantRateLimitCache (5-second TTL in-process LRU).
 */
export async function resolveRateLimitOverride(
  tenantId: string,
  policy: RateLimitPolicy,
  redis?: RateLimitRedisClient,
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
    // Circuit-breaker: never fail the request due to rate-limit config lookup
    return fallback;
  }
}

// ─────────────────────────────────────────────
// TenantRateLimitCache — in-process TTL cache (Wave 10)
// ─────────────────────────────────────────────

interface CacheEntry {
  config: RateLimitConfig;
  expiresAt: number;
}

/**
 * In-process TTL cache for per-tenant rate-limit override lookups.
 *
 * Without this cache, every authenticated request would issue an HGETALL to
 * Redis (≈1ms LAN, but adds up under load). With the cache, we issue at most
 * one HGETALL per (tenantId, policy) per `ttlMs` window.
 *
 * Trade-offs:
 *   - Stale overrides: an override set via redis-cli takes up to `ttlMs`
 *     seconds to take effect. Default 5s — acceptable for ops tuning.
 *   - Memory: bounded by (numTenants × numPolicies) entries; each entry is
 *     ~50 bytes. For 10k tenants × 7 policies = 70k entries ≈ 3.5MB. Fine.
 *   - Cache invalidation: ops can call `invalidate(tenantId, policy)` after
 *     setting an override if they need immediate effect. Or simply restart
 *     the API pod — the cache is per-process.
 *
 * The cache is per-process (not distributed). For multi-instance deployments,
 * each pod has its own cache — acceptable since overrides change rarely.
 */
export class TenantRateLimitCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 5_000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get an override config, hitting Redis only on cache miss or stale entry.
   * Falls back to the policy default if Redis is unavailable.
   */
  async get(
    tenantId: string,
    policy: RateLimitPolicy,
    redis?: RateLimitRedisClient,
  ): Promise<RateLimitConfig> {
    const key = `${tenantId}:${policy}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.config;
    }
    const config = await resolveRateLimitOverride(tenantId, policy, redis);
    this.cache.set(key, { config, expiresAt: now + this.ttlMs });
    return config;
  }

  /** Invalidate a single entry — call after setting an override via Redis. */
  invalidate(tenantId: string, policy: RateLimitPolicy): void {
    this.cache.delete(`${tenantId}:${policy}`);
  }

  /** Invalidate all entries for a tenant (e.g., on tenant config update). */
  invalidateTenant(tenantId: string): void {
    const prefix = `${tenantId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  /** Clear all entries — useful in tests. */
  clear(): void {
    this.cache.clear();
  }

  /** Current size — useful for tests + monitoring. */
  get size(): number {
    return this.cache.size;
  }
}
