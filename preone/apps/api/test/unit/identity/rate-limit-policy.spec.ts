/**
 * Unit tests for rate-limit policy catalog (Wave 9b, BTD §20.1).
 *
 * Verifies:
 *   - All 7 policies are present in the policy table with concrete { limit, ttl }
 *   - Limits match BTD §20.1 specifications (auth=5, write=30, read=200, etc.)
 *   - @RateLimit decorator stores the policy name as route metadata
 *   - @RateLimit decorator attaches @Throttle metadata with the right config
 *   - resolveRateLimitOverride falls back to policy table when Redis is unavailable
 *   - resolveRateLimitOverride reads overrides from Redis hash key when present
 */
import { describe, it, expect, vi } from 'vitest';
import { Reflector } from '@nestjs/core';

import {
  RateLimit,
  RateLimitPolicy,
  RATE_LIMIT_POLICY_TABLE,
  RATE_LIMIT_POLICY_KEY,
  resolveRateLimitOverride,
} from '@app/decorators/rate-limit.decorator';

describe('Rate-limit policy table (Wave 9b, BTD §20.1)', () => {
  it('defines all 7 policies', () => {
    const policies = Object.values(RateLimitPolicy);
    expect(policies.length).toBe(7);
    expect(policies).toContain('default');
    expect(policies).toContain('auth');
    expect(policies).toContain('write');
    expect(policies).toContain('read');
    expect(policies).toContain('export');
    expect(policies).toContain('public');
    expect(policies).toContain('pii');
  });

  it('policy table has an entry for every policy', () => {
    for (const policy of Object.values(RateLimitPolicy)) {
      const cfg = RATE_LIMIT_POLICY_TABLE[policy];
      expect(cfg).toBeDefined();
      expect(typeof cfg.ttl).toBe('number');
      expect(typeof cfg.limit).toBe('number');
      expect(cfg.ttl).toBeGreaterThan(0);
      expect(cfg.limit).toBeGreaterThan(0);
    }
  });

  it('concrete limits match BTD §20.1 specs', () => {
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.AUTH].limit).toBe(5);
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.WRITE].limit).toBe(30);
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.READ].limit).toBe(200);
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.EXPORT].limit).toBe(5);
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.PUBLIC].limit).toBe(60);
    expect(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.PII].limit).toBe(10);
  });

  it('all policies use a 1-minute window by default', () => {
    for (const cfg of Object.values(RATE_LIMIT_POLICY_TABLE)) {
      expect(cfg.ttl).toBe(60_000);
    }
  });
});

describe('@RateLimit decorator (Wave 9b)', () => {
  const reflector = new Reflector();

  it('stores the policy name under RATE_LIMIT_POLICY_KEY', () => {
    class FakeController {
      @RateLimit(RateLimitPolicy.AUTH)
      login() {}
    }
    const policy = reflector.get<RateLimitPolicy>(RATE_LIMIT_POLICY_KEY, FakeController.prototype.login);
    expect(policy).toBe(RateLimitPolicy.AUTH);
  });

  it('attaches @Throttle metadata with the policy config (Throttler v6)', () => {
    // Throttler v6 stores metadata on descriptor.value (the function itself),
    // using keys "THROTTLER:LIMIT<policyName>" and "THROTTLER:TTL<policyName>".
    class FakeController {
      @RateLimit(RateLimitPolicy.WRITE)
      create() {}
    }
    const target = FakeController.prototype.create;
    const limit = Reflect.getMetadata('THROTTLER:LIMITwrite', target);
    const ttl = Reflect.getMetadata('THROTTLER:TTLwrite', target);
    expect(limit).toBe(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.WRITE].limit);
    expect(ttl).toBe(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.WRITE].ttl);
  });

  it('different policies produce different throttle metadata', () => {
    class FakeController {
      @RateLimit(RateLimitPolicy.READ)
      list() {}

      @RateLimit(RateLimitPolicy.EXPORT)
      exportCsv() {}
    }
    const readLimit = Reflect.getMetadata('THROTTLER:LIMITread', FakeController.prototype.list);
    const exportLimit = Reflect.getMetadata('THROTTLER:LIMITexport', FakeController.prototype.exportCsv);
    expect(readLimit).toBe(200);
    expect(exportLimit).toBe(5);
  });
});

describe('resolveRateLimitOverride (Wave 9b, BTD §22.6)', () => {
  it('returns policy table default when redis is undefined', async () => {
    const cfg = await resolveRateLimitOverride('tenant-1', RateLimitPolicy.WRITE);
    expect(cfg).toEqual(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.WRITE]);
  });

  it('returns policy table default when Redis returns null', async () => {
    const redis = { hgetall: vi.fn(async () => null) };
    const cfg = await resolveRateLimitOverride('tenant-1', RateLimitPolicy.WRITE, redis);
    expect(cfg).toEqual(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.WRITE]);
    expect(redis.hgetall).toHaveBeenCalledWith('rl:override:tenant-1:write');
  });

  it('returns override when Redis hash has limit + ttl fields', async () => {
    const redis = {
      hgetall: vi.fn(async () => ({ limit: '50', ttl: '120000' })),
    };
    const cfg = await resolveRateLimitOverride('tenant-1', RateLimitPolicy.WRITE, redis);
    expect(cfg).toEqual({ limit: 50, ttl: 120_000 });
  });

  it('falls back to default on Redis error', async () => {
    const redis = { hgetall: vi.fn(async () => { throw new Error('redis down'); }) };
    const cfg = await resolveRateLimitOverride('tenant-1', RateLimitPolicy.READ, redis);
    expect(cfg).toEqual(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.READ]);
  });

  it('falls back individual fields when override is partial', async () => {
    const redis = { hgetall: vi.fn(async () => ({ limit: '500' })) }; // missing ttl
    const cfg = await resolveRateLimitOverride('tenant-1', RateLimitPolicy.READ, redis);
    expect(cfg.limit).toBe(500);
    expect(cfg.ttl).toBe(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.READ].ttl);
  });
});
