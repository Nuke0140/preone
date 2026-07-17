/**
 * Unit tests for AiPromptCacheService + AiTokenBudgetService (Wave 18.1).
 *
 * Both services depend on RedisService — we mock it with an in-memory
 * Map-backed fake so tests run offline.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AiPromptCacheService } from '../application/services/ai-prompt-cache.service';
import { AiTokenBudgetService } from '../application/services/ai-token-budget.service';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';

/** In-memory RedisService fake — Map-backed. */
function makeRedisMock() {
  const store = new Map<string, string>();
  return {
    _store: store,
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string, ttl?: number) => {
      store.set(key, value);
    }),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string | string[]) => {
      const keys = Array.isArray(key) ? key : [key];
      let n = 0;
      for (const k of keys) {
        if (store.delete(k)) n++;
      }
      return n;
    }),
    incr: vi.fn(async (key: string) => {
      const v = (parseInt(store.get(key) ?? '0', 10) || 0) + 1;
      store.set(key, String(v));
      return v;
    }),
    incrby: vi.fn(async (key: string, amount: number) => {
      const v = (parseInt(store.get(key) ?? '0', 10) || 0) + amount;
      store.set(key, String(v));
      return v;
    }),
    expire: vi.fn(async (_key: string, _ttl: number) => true),
    exists: vi.fn(async (key: string) => (store.has(key) ? 1 : 0)),
  } as unknown as RedisService & {
    _store: Map<string, string>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    incrby: ReturnType<typeof vi.fn>;
  };
}

describe('AiPromptCacheService', () => {
  let redis: ReturnType<typeof makeRedisMock>;
  let cache: AiPromptCacheService;

  beforeEach(() => {
    redis = makeRedisMock();
    cache = new AiPromptCacheService(redis);
  });

  it('should return undefined on cache miss', async () => {
    const result = await cache.get({
      messages: [{ role: 'user', content: 'hi' }],
      tenantId: 't1',
    });
    expect(result).toBeUndefined();
    expect(redis.get).toHaveBeenCalledTimes(1);
  });

  it('should round-trip a cached completion via set + get', async () => {
    const components = {
      messages: [{ role: 'system', content: 'sys' }, { role: 'user', content: 'hello' }],
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxOutputTokens: 1024,
      tenantId: 't1',
    };
    const result = {
      ok: true,
      text: 'Hello!',
      model: 'gpt-4o-mini',
      totalTokens: 12,
      finishReason: 'stop' as const,
    };
    await cache.set(components, result);
    expect(redis.setex).toHaveBeenCalledTimes(1);

    const fetched = await cache.get(components);
    expect(fetched).toBeDefined();
    expect(fetched?.ok).toBe(true);
    expect(fetched?.text).toBe('Hello!');
    expect(fetched?.totalTokens).toBe(12);
    expect(fetched?.fromCache).toBe(true);
    expect(fetched?.cachedAt).toBeDefined();
  });

  it('should produce DIFFERENT keys for different tenant IDs (PII isolation)', async () => {
    const components1 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      tenantId: 'tenant-A',
    };
    const components2 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      tenantId: 'tenant-B',
    };
    await cache.set(components1, {
      ok: true, text: 'A response', model: 'm', totalTokens: 1, finishReason: 'stop',
    });
    // Tenant B should NOT see tenant A's cache entry.
    const fetched = await cache.get(components2);
    expect(fetched).toBeUndefined();
  });

  it('should produce the SAME key for identical components (cache hit)', async () => {
    const components = {
      messages: [{ role: 'user', content: 'same prompt' }],
      model: 'gpt-4o',
      temperature: 0.5,
      maxOutputTokens: 512,
      tenantId: 't1',
    };
    await cache.set(components, {
      ok: true, text: 'response', model: 'gpt-4o', totalTokens: 10, finishReason: 'stop',
    });
    // Same components → cache hit.
    const fetched = await cache.get(components);
    expect(fetched?.text).toBe('response');
  });

  it('should produce different keys for different temperatures', async () => {
    const components1 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      temperature: 0.7,
      tenantId: 't1',
    };
    const components2 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      temperature: 0.8,
      tenantId: 't1',
    };
    await cache.set(components1, {
      ok: true, text: 'creative', model: 'm', totalTokens: 1, finishReason: 'stop',
    });
    expect(await cache.get(components2)).toBeUndefined();
  });

  it('should treat 0.7 and 0.7001 as the same temperature (2-decimal rounding)', async () => {
    const components1 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      temperature: 0.7,
      tenantId: 't1',
    };
    const components2 = {
      messages: [{ role: 'user', content: 'same prompt' }],
      temperature: 0.7001,
      tenantId: 't1',
    };
    await cache.set(components1, {
      ok: true, text: 'cached', model: 'm', totalTokens: 1, finishReason: 'stop',
    });
    expect(await cache.get(components2)).toBeDefined();
  });

  it('should delete a cache entry on invalidate()', async () => {
    const components = {
      messages: [{ role: 'user', content: 'hi' }],
      tenantId: 't1',
    };
    await cache.set(components, {
      ok: true, text: 'x', model: 'm', totalTokens: 1, finishReason: 'stop',
    });
    await cache.invalidate(components);
    expect(await cache.get(components)).toBeUndefined();
  });

  it('should fail-open (return undefined) when Redis throws on get', async () => {
    redis.get.mockRejectedValueOnce(new Error('ECONNRESET'));
    const result = await cache.get({
      messages: [{ role: 'user', content: 'hi' }],
      tenantId: 't1',
    });
    expect(result).toBeUndefined();
  });

  it('should fail-open (not throw) when Redis throws on set', async () => {
    redis.setex.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(cache.set(
      { messages: [{ role: 'user', content: 'hi' }], tenantId: 't1' },
      { ok: true, text: 'x', model: 'm', totalTokens: 1, finishReason: 'stop' },
    )).resolves.toBeUndefined();
  });
});

// ─── AiTokenBudgetService ──────────────────────────────────────

describe('AiTokenBudgetService', () => {
  let redis: ReturnType<typeof makeRedisMock>;
  let budget: AiTokenBudgetService;

  beforeEach(() => {
    redis = makeRedisMock();
    budget = new AiTokenBudgetService(redis);
  });

  it('should allow a call when usage is below quota', async () => {
    const result = await budget.checkBudget('t1', 100);
    expect(result.allowed).toBe(true);
    expect(result.usedToday).toBe(0);
    expect(result.quota).toBeGreaterThan(0);
    expect(result.remaining).toBe(result.quota);
  });

  it('should deny a call when usage + requested > quota', async () => {
    // Manually set the daily counter to near-quota.
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai:budget:t1:${today}`;
    redis._store.set(key, String(499_900));
    const result = await budget.checkBudget('t1', 200);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/budget exceeded/i);
  });

  it('should record usage atomically via INCRBY', async () => {
    const result = await budget.recordUsage('t1', 42);
    expect(result.recorded).toBe(true);
    expect(result.usedToday).toBe(42);
    expect(redis.incrby).toHaveBeenCalledWith(expect.stringContaining('ai:budget:t1:'), 42);
  });

  it('should accumulate usage across multiple calls', async () => {
    await budget.recordUsage('t1', 30);
    await budget.recordUsage('t1', 20);
    const usage = await budget.getUsage('t1');
    expect(usage.usedToday).toBe(50);
  });

  it('should set TTL on first write of the day', async () => {
    await budget.recordUsage('t1', 10);
    expect(redis.expire).toHaveBeenCalledTimes(1);
    // Second write should NOT call expire again.
    await budget.recordUsage('t1', 5);
    expect(redis.expire).toHaveBeenCalledTimes(1);
  });

  it('should report exceededAfterRecord=true when usage crosses quota', async () => {
    // Set quota low by setting the counter near quota.
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai:budget:t1:${today}`;
    redis._store.set(key, String(499_990));
    const result = await budget.recordUsage('t1', 20);
    expect(result.recorded).toBe(true);
    expect(result.exceededAfterRecord).toBe(true);
  });

  it('should NOT record when totalTokens <= 0', async () => {
    const result = await budget.recordUsage('t1', 0);
    expect(result.recorded).toBe(false);
    expect(redis.incrby).not.toHaveBeenCalled();
  });

  it('should reset a tenant budget via del()', async () => {
    await budget.recordUsage('t1', 50);
    expect((await budget.getUsage('t1')).usedToday).toBe(50);
    await budget.reset('t1');
    expect((await budget.getUsage('t1')).usedToday).toBe(0);
  });

  it('should fail-open (allow) when Redis throws on checkBudget', async () => {
    redis.get.mockRejectedValueOnce(new Error('ECONNRESET'));
    const result = await budget.checkBudget('t1', 100);
    expect(result.allowed).toBe(true);
  });

  it('should fail-safe (not throw) when Redis throws on recordUsage', async () => {
    redis.incrby.mockRejectedValueOnce(new Error('ECONNRESET'));
    const result = await budget.recordUsage('t1', 50);
    expect(result.recorded).toBe(false);
  });

  it('should use a date-stamped key that resets at UTC midnight', async () => {
    await budget.recordUsage('t1', 10);
    const expectedKey = expect.stringMatching(/^ai:budget:t1:\d{4}-\d{2}-\d{2}$/);
    expect(redis.incrby).toHaveBeenCalledWith(expectedKey, 10);
  });
});
