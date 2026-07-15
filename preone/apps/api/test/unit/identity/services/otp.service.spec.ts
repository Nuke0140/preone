/**
 * Unit tests for OtpService — Redis-backed OTP generation + verification.
 *
 * Mocks RedisService so tests are pure + fast.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OtpService } from '@modules/identity/application/services/otp.service';
import { RedisService, RedisDb } from '@infra/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { BusinessException } from '@common/errors/exceptions';

function mockRedisClient() {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    incr: vi.fn(async (key: string) => {
      const existing = store.get(key);
      const next = existing ? Number(existing.value) + 1 : 1;
      store.set(key, { value: String(next) });
      return next;
    }),
    expire: vi.fn(async (key: string, ttl: number) => {
      const e = store.get(key);
      if (e) { e.ttl = ttl; return true; }
      return false;
    }),
    setex: vi.fn(async (key: string, ttl: number, value: string) => {
      store.set(key, { value, ttl });
      return 'OK';
    }),
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    del: vi.fn(async (...keys: string[]) => {
      let n = 0;
      for (const k of keys) { if (store.delete(k)) n++; }
      return n;
    }),
  };
}

function buildService() {
  const client = mockRedisClient();
  const redis = {
    forDb: vi.fn(() => client),
  } as unknown as RedisService;
  const config = {
    get: vi.fn((key: string) => {
      if (key === 'otp.ttlSeconds') return 300;
      if (key === 'otp.maxAttempts') return 3;
      return undefined;
    }),
  } as unknown as ConfigService;
  return { service: new OtpService(redis, config), client };
}

describe('OtpService', () => {
  let svc: OtpService;
  let client: ReturnType<typeof mockRedisClient>;

  beforeEach(() => {
    const r = buildService();
    svc = r.service;
    client = r.client;
  });

  describe('store()', () => {
    it('should store OTP with TTL + reset attempt counter', async () => {
      await svc.store('+919876543210', '123456', 300);
      expect(client.setex).toHaveBeenCalledWith('otp:+919876543210', 300, '123456');
      expect(client.del).toHaveBeenCalledWith('otp_attempts:+919876543210');
    });

    it('should allow up to 3 OTP sends per 5 minutes', async () => {
      await svc.store('+919876543210', '111111', 300);
      await svc.store('+919876543210', '222222', 300);
      await svc.store('+919876543210', '333333', 300);
      // 4th call should throw
      await expect(svc.store('+919876543210', '444444', 300))
        .rejects.toThrow(BusinessException);
    });
  });

  describe('verify()', () => {
    it('should return true for correct OTP + clear storage', async () => {
      await svc.store('+919876543210', '123456', 300);
      const ok = await svc.verify('+919876543210', '123456');
      expect(ok).toBe(true);
      expect(client.del).toHaveBeenCalledWith('otp:+919876543210');
      expect(client.del).toHaveBeenCalledWith('otp_attempts:+919876543210');
    });

    it('should return false for incorrect OTP', async () => {
      await svc.store('+919876543210', '123456', 300);
      const ok = await svc.verify('+919876543210', '999999');
      expect(ok).toBe(false);
    });

    it('should throw BusinessException after max attempts exceeded', async () => {
      await svc.store('+919876543210', '123456', 300);
      await svc.verify('+919876543210', 'wrong1'); // attempt 1
      await svc.verify('+919876543210', 'wrong2'); // attempt 2
      await svc.verify('+919876543210', 'wrong3'); // attempt 3 — max reached
      await expect(svc.verify('+919876543210', 'wrong4'))
        .rejects.toThrow(BusinessException);
    });
  });
});
