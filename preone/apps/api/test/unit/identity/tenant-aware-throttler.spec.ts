/**
 * Unit tests for TenantAwareThrottlerGuard + TenantRateLimitCache (Wave 10a, BTD §22.6).
 *
 * Verifies:
 *   - TenantRateLimitCache hits Redis on miss, returns cached value on hit
 *   - TenantRateLimitCache invalidates single entry + per-tenant + all
 *   - TenantRateLimitCache TTL expiry triggers Redis re-fetch
 *   - TenantRateLimitCache falls back to policy default when Redis throws
 *   - TenantAwareThrottlerGuard.getTracker() returns per-user key for authed reqs
 *   - TenantAwareThrottlerGuard.getTracker() returns per-IP key for unauth reqs
 *   - TenantAwareThrottlerGuard.handleRequest() injects override limit/ttl
 *   - TenantAwareThrottlerGuard.handleRequest() skips override for unauth reqs
 *   - TenantAwareThrottlerGuard.handleRequest() skips override when Redis absent
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';

import {
  RateLimitPolicy,
  RATE_LIMIT_POLICY_TABLE,
  TenantRateLimitCache,
  type RateLimitRedisClient,
} from '@app/decorators/rate-limit.decorator';

// ─────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────

function makeRedisStub(overrides: Record<string, Record<string, string>> = {}): RateLimitRedisClient & {
  _calls: string[];
} {
  const calls: string[] = [];
  return {
    _calls: calls,
    async hgetall(key: string) {
      calls.push(key);
      return overrides[key] ?? null;
    },
  };
}

// We construct the guard via Object.create to bypass the heavy NestJS DI
// (ThrottlerGuard constructor expects options + storageService + reflector).
// For these unit tests we only exercise getTracker() and the override
// injection logic — we don't actually run the full canActivate pipeline.
async function makeGuard(redis?: any, cache?: TenantRateLimitCache) {
  // Lazy import to avoid loading the full NestJS module graph in unit tests
  const { TenantAwareThrottlerGuard } = await import('@app/guards/tenant-aware-throttler.guard');
  // Cast to any to bypass constructor signature checks — we only call
  // getTracker() and the override lookup, which don't depend on the
  // parent constructor's injected deps.
  const guard = Object.create(TenantAwareThrottlerGuard.prototype) as InstanceType<
    typeof TenantAwareThrottlerGuard
  >;
  // Manually wire the private fields the methods use
  (guard as any).overrideCache = cache ?? new TenantRateLimitCache(5_000);
  (guard as any).redis = redis;
  return guard;
}

function makeContext(req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
    getType: () => 'http',
    getHandler: () => ({} as any),
    getClass: () => ({} as any),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
  } as unknown as ExecutionContext;
}

// ─────────────────────────────────────────────
// TenantRateLimitCache
// ─────────────────────────────────────────────

describe('TenantRateLimitCache (Wave 10a)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('hits Redis on cache miss and caches the result', async () => {
    vi.clearAllTimers();
    vi.useRealTimers();
    const redis = makeRedisStub({
      'rl:override:tenant-123:write': { limit: '50', ttl: '120000' },
    });
    const cache = new TenantRateLimitCache(5_000);

    const r1 = await cache.get('tenant-123', RateLimitPolicy.WRITE, redis);
    expect(r1).toEqual({ limit: 50, ttl: 120_000 });
    expect(redis._calls.length).toBe(1);

    // Second call should hit the cache — no new Redis call
    const r2 = await cache.get('tenant-123', RateLimitPolicy.WRITE, redis);
    expect(r2).toEqual({ limit: 50, ttl: 120_000 });
    expect(redis._calls.length).toBe(1);
  });

  it('re-fetches from Redis after TTL expires', async () => {
    const redis = makeRedisStub({
      'rl:override:tenant-1:read': { limit: '500', ttl: '60000' },
    });
    const cache = new TenantRateLimitCache(5_000);

    await cache.get('tenant-1', RateLimitPolicy.READ, redis);
    expect(redis._calls.length).toBe(1);

    // Advance past TTL
    vi.advanceTimersByTime(5_001);

    await cache.get('tenant-1', RateLimitPolicy.READ, redis);
    expect(redis._calls.length).toBe(2);
  });

  it('falls back to policy default when Redis hash is absent', async () => {
    const redis = makeRedisStub({}); // no overrides
    const cache = new TenantRateLimitCache(5_000);

    const r = await cache.get('tenant-1', RateLimitPolicy.AUTH, redis);
    expect(r).toEqual(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.AUTH]);
  });

  it('falls back to policy default when Redis throws', async () => {
    const redis: RateLimitRedisClient = {
      async hgetall() {
        throw new Error('Redis EOF');
      },
    };
    const cache = new TenantRateLimitCache(5_000);

    const r = await cache.get('tenant-1', RateLimitPolicy.PII, redis);
    expect(r).toEqual(RATE_LIMIT_POLICY_TABLE[RateLimitPolicy.PII]);
  });

  it('invalidate(single) forces next get to re-fetch', async () => {
    const redis = makeRedisStub({
      'rl:override:t1:write': { limit: '99', ttl: '60000' },
    });
    const cache = new TenantRateLimitCache(5_000);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    expect(redis._calls.length).toBe(1);

    cache.invalidate('t1', RateLimitPolicy.WRITE);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    expect(redis._calls.length).toBe(2);
  });

  it('invalidateTenant clears all policies for a tenant', async () => {
    const redis = makeRedisStub({
      'rl:override:t1:write': { limit: '50', ttl: '60000' },
      'rl:override:t1:read': { limit: '500', ttl: '60000' },
    });
    const cache = new TenantRateLimitCache(5_000);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    await cache.get('t1', RateLimitPolicy.READ, redis);
    expect(redis._calls.length).toBe(2);
    expect(cache.size).toBe(2);

    cache.invalidateTenant('t1');
    expect(cache.size).toBe(0);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    expect(redis._calls.length).toBe(3);
  });

  it('clear() empties the entire cache', async () => {
    const redis = makeRedisStub({
      'rl:override:t1:write': { limit: '50', ttl: '60000' },
      'rl:override:t2:read': { limit: '500', ttl: '60000' },
    });
    const cache = new TenantRateLimitCache(5_000);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    await cache.get('t2', RateLimitPolicy.READ, redis);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('size reflects distinct (tenant, policy) keys', async () => {
    const redis = makeRedisStub({});
    const cache = new TenantRateLimitCache(5_000);

    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    await cache.get('t1', RateLimitPolicy.READ, redis);
    await cache.get('t2', RateLimitPolicy.WRITE, redis);
    expect(cache.size).toBe(3);

    // Same key — no growth
    await cache.get('t1', RateLimitPolicy.WRITE, redis);
    expect(cache.size).toBe(3);
  });
});

// ─────────────────────────────────────────────
// TenantAwareThrottlerGuard — getTracker
// ─────────────────────────────────────────────

describe('TenantAwareThrottlerGuard.getTracker() (Wave 10a)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns tenant:user tracker for authenticated requests', async () => {
    const guard = await makeGuard();
    const req = {
      user: { id: 'user-42', tenantId: 'tenant-7' },
      ip: '203.0.113.1',
    };
    const tracker = await guard.getTracker(req as any);
    expect(tracker).toBe('tenant:tenant-7:user:user-42');
  });

  it('returns ip: tracker for unauthenticated requests', async () => {
    const guard = await makeGuard();
    const req = { ip: '203.0.113.5' };
    const tracker = await guard.getTracker(req as any);
    expect(tracker).toBe('ip:203.0.113.5');
  });

  it('uses x-forwarded-for when req.ip is absent', async () => {
    const guard = await makeGuard();
    const req = {
      headers: { 'x-forwarded-for': '198.51.100.7, 10.0.0.1' },
    };
    const tracker = await guard.getTracker(req as any);
    expect(tracker).toBe('ip:198.51.100.7');
  });

  it('falls back to "unknown" when no IP can be determined', async () => {
    const guard = await makeGuard();
    const req = {};
    const tracker = await guard.getTracker(req as any);
    expect(tracker).toBe('ip:unknown');
  });

  it('ignores user object missing tenantId or id', async () => {
    const guard = await makeGuard();
    const req = { user: { id: 'user-1' }, ip: '203.0.113.9' };
    const tracker = await guard.getTracker(req as any);
    expect(tracker).toBe('ip:203.0.113.9');
  });
});

// ─────────────────────────────────────────────
// TenantAwareThrottlerGuard — handleRequest override injection
// ─────────────────────────────────────────────

describe('TenantAwareThrottlerGuard.handleRequest() override injection (Wave 10a)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  /**
   * We can't easily exercise the full super.handleRequest() pipeline in a unit
   * test (it depends on ThrottlerStorage). Instead, we verify the override
   * lookup + mutation of requestProps.limit / requestProps.ttl by spying on
   * super.handleRequest and inspecting the mutated props.
   */
  it('injects per-tenant override limit/ttl for authenticated requests', async () => {
    const redisStub = {
      forDb: () => ({
        hgetall: async (key: string) => {
          if (key === 'rl:override:tenant-9:write') {
            return { limit: '77', ttl: '99000' };
          }
          return null;
        },
      }),
    };
    const cache = new TenantRateLimitCache(5_000);
    const guard = await makeGuard(redisStub as any, cache);

    // Spy on super.handleRequest — capture the mutated requestProps
    let capturedLimit: number | undefined;
    let capturedTtl: number | undefined;
    const originalSuper = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    vi.spyOn(originalSuper, 'handleRequest').mockImplementation(async (props: any) => {
      capturedLimit = props.limit;
      capturedTtl = props.ttl;
      return true;
    });

    const req = { user: { id: 'u1', tenantId: 'tenant-9' } };
    const requestProps = {
      context: makeContext(req),
      limit: 30, // WRITE default
      ttl: 60_000,
      throttler: { name: 'write' },
      blockDuration: 0,
      getTracker: async () => 't',
      generateKey: () => 'k',
    };

    await (guard as any).handleRequest(requestProps);

    expect(capturedLimit).toBe(77);
    expect(capturedTtl).toBe(99_000);

    vi.restoreAllMocks();
  });

  it('leaves limit/ttl unchanged for unauthenticated requests', async () => {
    const redisStub = { forDb: () => ({ hgetall: async () => null }) };
    const cache = new TenantRateLimitCache(5_000);
    const guard = await makeGuard(redisStub as any, cache);

    let capturedLimit: number | undefined;
    let capturedTtl: number | undefined;
    const originalSuper = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    vi.spyOn(originalSuper, 'handleRequest').mockImplementation(async (props: any) => {
      capturedLimit = props.limit;
      capturedTtl = props.ttl;
      return true;
    });

    const req = { ip: '203.0.113.1' }; // no user
    const requestProps = {
      context: makeContext(req),
      limit: 30,
      ttl: 60_000,
      throttler: { name: 'write' },
      blockDuration: 0,
      getTracker: async () => 't',
      generateKey: () => 'k',
    };

    await (guard as any).handleRequest(requestProps);

    expect(capturedLimit).toBe(30);
    expect(capturedTtl).toBe(60_000);

    vi.restoreAllMocks();
  });

  it('leaves limit/ttl unchanged when Redis service is absent', async () => {
    const cache = new TenantRateLimitCache(5_000);
    const guard = await makeGuard(undefined, cache);

    let capturedLimit: number | undefined;
    const originalSuper = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    vi.spyOn(originalSuper, 'handleRequest').mockImplementation(async (props: any) => {
      capturedLimit = props.limit;
      return true;
    });

    const req = { user: { id: 'u1', tenantId: 'tenant-9' } };
    const requestProps = {
      context: makeContext(req),
      limit: 30,
      ttl: 60_000,
      throttler: { name: 'write' },
      blockDuration: 0,
      getTracker: async () => 't',
      generateKey: () => 'k',
    };

    await (guard as any).handleRequest(requestProps);

    expect(capturedLimit).toBe(30);

    vi.restoreAllMocks();
  });

  it('leaves limit/ttl unchanged when throttler name is not a known policy', async () => {
    const redisStub = { forDb: () => ({ hgetall: async () => null }) };
    const cache = new TenantRateLimitCache(5_000);
    const guard = await makeGuard(redisStub as any, cache);

    let capturedLimit: number | undefined;
    const originalSuper = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    vi.spyOn(originalSuper, 'handleRequest').mockImplementation(async (props: any) => {
      capturedLimit = props.limit;
      return true;
    });

    const req = { user: { id: 'u1', tenantId: 'tenant-9' } };
    const requestProps = {
      context: makeContext(req),
      limit: 100,
      ttl: 60_000,
      throttler: { name: 'some-custom-throttler-not-a-policy' },
      blockDuration: 0,
      getTracker: async () => 't',
      generateKey: () => 'k',
    };

    await (guard as any).handleRequest(requestProps);

    expect(capturedLimit).toBe(100);

    vi.restoreAllMocks();
  });

  it('caches override lookups across multiple requests (5s TTL)', async () => {
    const hgetallCalls: string[] = [];
    const redisStub = {
      forDb: () => ({
        hgetall: async (key: string) => {
          hgetallCalls.push(key);
          if (key === 'rl:override:tenant-9:write') {
            return { limit: '50', ttl: '120000' };
          }
          return null;
        },
      }),
    };
    const cache = new TenantRateLimitCache(5_000);
    const guard = await makeGuard(redisStub as any, cache);

    const originalSuper = Object.getPrototypeOf(Object.getPrototypeOf(guard));
    vi.spyOn(originalSuper, 'handleRequest').mockImplementation(async () => true);

    const req = { user: { id: 'u1', tenantId: 'tenant-9' } };
    const mkProps = (limit: number) => ({
      context: makeContext(req),
      limit,
      ttl: 60_000,
      throttler: { name: 'write' },
      blockDuration: 0,
      getTracker: async () => 't',
      generateKey: () => 'k',
    });

    // Three requests with the same tenant + policy — should only hit Redis once
    await (guard as any).handleRequest(mkProps(30));
    await (guard as any).handleRequest(mkProps(30));
    await (guard as any).handleRequest(mkProps(30));

    expect(hgetallCalls.length).toBe(1);

    vi.restoreAllMocks();
  });
});
