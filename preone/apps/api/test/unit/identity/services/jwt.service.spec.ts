/**
 * Unit tests for JwtService security hardening.
 *
 * Verifies the fail-fast behavior added in the Senior Security Architect
 * review (2026-07-17):
 *   - onModuleInit throws FATAL error if JWT_ACCESS_PRIVATE_KEY missing
 *   - onModuleInit throws FATAL error if JWT_ACCESS_PUBLIC_KEY missing
 *   - onModuleInit throws FATAL error if JWT_REFRESH_SECRET missing
 *   - onModuleInit throws FATAL error if JWT_REFRESH_SECRET < 32 chars
 *   - onModuleInit throws FATAL error if JWT_REFRESH_SECRET is a known weak placeholder
 *   - onModuleInit accepts valid configuration and caches keys
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@modules/identity/application/services/jwt.service';
import { RedisService } from '@infra/redis/redis.service';
import { generateKeyPairSync } from 'node:crypto';

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const defaults = {
    'app.jwtIssuer': 'preone.api',
    'app.jwtAudience': 'preone.app',
    'app.jwtAccessTokenTtl': '15m',
    'app.jwtRefreshTokenTtl': '30d',
    'app.env': 'development',
  };
  return {
    get: vi.fn((key: string) => (key in overrides ? overrides[key] : defaults[key])),
  } as unknown as ConfigService;
}

function makeRedis(): RedisService {
  const fake = {
    forDb: vi.fn(() => ({
      get: vi.fn(async () => null),
      setex: vi.fn(async () => 'OK'),
    })),
  };
  return fake as unknown as RedisService;
}

function generateRsaKeyPairPems() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

describe('JwtService — security hardening (fail-fast on missing/weak secrets)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Clean slate
    delete process.env.JWT_ACCESS_PRIVATE_KEY;
    delete process.env.JWT_ACCESS_PUBLIC_KEY;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.PII_ENCRYPTION_KEY;
  });

  afterEach(() => {
    // Restore
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIGINAL_ENV)) delete process.env[k];
    }
    Object.assign(process.env, ORIGINAL_ENV);
  });

  describe('onModuleInit — fail-fast on missing secrets', () => {
    it('should throw FATAL if JWT_ACCESS_PRIVATE_KEY is missing', async () => {
      const { publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a'.repeat(64);
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /JWT_ACCESS_PRIVATE_KEY is not set/,
      );
    });

    it('should throw FATAL if JWT_ACCESS_PUBLIC_KEY is missing', async () => {
      const { privateKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a'.repeat(64);
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /JWT_ACCESS_PUBLIC_KEY is not set/,
      );
    });

    it('should throw FATAL if JWT_REFRESH_SECRET is missing', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /JWT_REFRESH_SECRET is not set/,
      );
    });

    it('should throw FATAL if JWT_REFRESH_SECRET is shorter than 32 chars', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'short-secret-25-chars!!!'; // 25 chars
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /JWT_REFRESH_SECRET is too short/,
      );
    });

    it('should throw FATAL if JWT_REFRESH_SECRET is a known weak placeholder', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'preone-dev-refresh-secret-change-me';
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /known weak placeholder/,
      );
    });

    it('should throw FATAL if JWT_ACCESS_PRIVATE_KEY is not valid PKCS#8 PEM', async () => {
      const { publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = 'not-a-valid-pem';
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a'.repeat(64);
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).rejects.toThrow(
        /JWT_ACCESS_PRIVATE_KEY is not a valid PKCS#8 PEM/,
      );
    });

    it('should succeed with valid keys + strong refresh secret', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a-very-strong-random-secret-that-is-64-chars-long-aaaa-bbbb';
      const svc = new JwtService(makeConfig(), makeRedis());

      await expect(svc.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('signAccess / verifyAccess — after successful onModuleInit', () => {
    it('should sign and verify an access token round-trip', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a-very-strong-random-secret-that-is-64-chars-long-aaaa-bbbb';
      const svc = new JwtService(makeConfig(), makeRedis());
      await svc.onModuleInit();

      const claims = {
        sub: 'usr-001',
        tenant_id: 'sch-001',
        email: 'priya@school.com',
        roles: ['SCHOOL_ADMIN'],
        perms_version: 1,
        session_id: 'sess-001',
      };
      const token = await svc.signAccess(claims);
      expect(token).toMatch(/^eyJ/);

      const verified = await svc.verifyAccess(token);
      expect(verified.sub).toBe('usr-001');
      expect(verified.tenant_id).toBe('sch-001');
      expect(verified.email).toBe('priya@school.com');
    });
  });

  describe('signRefresh / verifyRefresh — after successful onModuleInit', () => {
    it('should sign and verify a refresh token round-trip', async () => {
      const { privateKeyPem, publicKeyPem } = generateRsaKeyPairPems();
      process.env.JWT_ACCESS_PRIVATE_KEY = privateKeyPem;
      process.env.JWT_ACCESS_PUBLIC_KEY = publicKeyPem;
      process.env.JWT_REFRESH_SECRET = 'a-very-strong-random-secret-that-is-64-chars-long-aaaa-bbbb';
      const svc = new JwtService(makeConfig(), makeRedis());
      await svc.onModuleInit();

      const token = await svc.signRefresh({ sub: 'usr-001' });
      expect(token).toMatch(/^eyJ/);

      const payload = await svc.verifyRefresh(token);
      expect(payload.sub).toBe('usr-001');
      expect(payload.jti).toBeDefined();
    });
  });
});
