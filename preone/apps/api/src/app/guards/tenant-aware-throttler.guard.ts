/**
 * TenantAwareThrottlerGuard — per-tenant rate-limit overrides via Redis (BTD §22.6).
 *
 * Wave 10 implementation of the hook left in rate-limit.decorator.ts (Wave 9).
 *
 * Per BTD §22.6 — Operational Tuning:
 *   "Per-tenant overrides via Redis hash key `rl:override:<tenantId>:<policy>`.
 *    Ops can tune limits at runtime without redeploying — e.g., raise the
 *    write limit for a large school during admission season."
 *
 * Per BTD §20.1 — Rate Limiting:
 *   "Rate limiting: per-IP + per-user. Auth routes: per-IP. Write/read/export/
 *    PII routes: per-user. Public routes: per-IP."
 *
 * How it works:
 *   1. The global ThrottlerGuard reads each route's @Throttle metadata and
 *      evaluates each named throttler (auth, write, read, export, public, pii).
 *   2. For EACH throttler, the guard calls handleRequest() with the static
 *      limit/ttl from the metadata.
 *   3. We override handleRequest() to:
 *      a. Read the route's policy name from RATE_LIMIT_POLICY_KEY metadata.
 *      b. If the request is authenticated (req.user.tenantId present),
 *         look up the per-tenant override via TenantRateLimitCache.
 *      c. Replace the static limit/ttl with the override (if any).
 *      d. Call super.handleRequest() with the effective values.
 *   4. We also override getTracker() to return `${tenantId}:${userId}` for
 *      authenticated requests — so rate limits are per-user within a tenant,
 *      not global per-IP. Unauthenticated requests fall back to per-IP.
 *
 * Failure modes:
 *   - Redis unavailable → resolveRateLimitOverride() catches the error and
 *     returns the static default. The request proceeds with default limits.
 *   - Cache stale → up to 5s of staleness (TenantRateLimitCache TTL).
 *     Acceptable since overrides change rarely.
 *   - No req.user (unauthenticated) → static limits apply, per-IP tracking.
 */
import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, type ThrottlerModuleOptions, type ThrottlerRequest } from '@nestjs/throttler';

import { RedisService, RedisDb } from '@infra/redis/redis.service';

import {
  RATE_LIMIT_POLICY_KEY,
  RateLimitPolicy,
  TenantRateLimitCache,
  type RateLimitConfig,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class TenantAwareThrottlerGuard extends ThrottlerGuard {
  private readonly overrideCache: TenantRateLimitCache;

  constructor(
    options: ThrottlerModuleOptions,
    storageService: unknown, // ThrottlerStorage — typed as unknown to avoid import cycle
    reflector: Reflector,
    @Inject('TENANT_RATE_LIMIT_CACHE') cache?: TenantRateLimitCache,
    private readonly redis?: RedisService,
  ) {
    super(options, storageService as never, reflector);
    // Fall back to a default cache if not injected (e.g., in tests)
    this.overrideCache = cache ?? new TenantRateLimitCache(5_000);
  }

  /**
   * Per-user tracker for authenticated requests, per-IP for unauthenticated.
   *
   * Per BTD §20.1:
   *   - Auth routes: per-IP (no authenticated user yet)
   *   - Write/read/export/PII routes: per-user (within tenant scope)
   *   - Public routes: per-IP
   *
   * We achieve this by returning `${tenantId}:${userId}` when authenticated.
   * This means rate limits are scoped per-user-per-tenant — a user with
   * accounts in two tenants gets separate budgets.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user;
    if (user?.tenantId && user?.id) {
      return `tenant:${user.tenantId}:user:${user.id}`;
    }
    // Unauthenticated — fall back to per-IP
    const ip =
      req.ip ??
      req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.connection?.remoteAddress ??
      'unknown';
    return `ip:${ip}`;
  }

  /**
   * Override handleRequest to inject per-tenant limit/ttl before delegation.
   *
   * The throttler v6 API passes a ThrottlerRequest bundle with the static
   * limit/ttl from the @Throttle metadata. We intercept it, look up the
   * per-tenant override (if authenticated), and replace the values.
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const user = req.user;

    // Only apply per-tenant overrides for authenticated requests
    if (user?.tenantId && this.redis) {
      const policyName = throttler.name as RateLimitPolicy;
      // Verify the throttler name is a known policy (the 'default' throttler
      // has name 'default' which is a valid policy — covered here)
      if (policyName && (Object.values(RateLimitPolicy) as string[]).includes(policyName)) {
        const redisClient = this.redis.forDb(RedisDb.RATE_LIMITING);
        const override: RateLimitConfig = await this.overrideCache.get(
          user.tenantId,
          policyName as RateLimitPolicy,
          redisClient,
        );
        // Replace limit/ttl in the request props (mutate the bundle in place)
        requestProps.limit = override.limit;
        requestProps.ttl = override.ttl;
      }
    }

    return super.handleRequest(requestProps);
  }

  /** Expose the cache for tests + admin endpoints to invalidate. */
  getCache(): TenantRateLimitCache {
    return this.overrideCache;
  }
}
