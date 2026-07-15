/**
 * E2E test for AuthService end-to-end — wires up real services with mocked repos.
 *
 * Tests the full login → refresh → logout cycle as a single flow.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { AuthService } from '@modules/identity/application/services/auth.service';
import { OtpService } from '@modules/identity/application/services/otp.service';
import { JwtService } from '@modules/identity/application/services/jwt.service';
import { UserAggregate } from '@modules/identity/domain/aggregates/user.aggregate';
import { RedisService } from '@infra/redis/redis.service';

const PASSWORD = 'E2EPassword@123';
const EMAIL = 'e2e@school.com';
const PHONE = '+919876543210';

describe('Auth E2E — login → refresh → logout flow', () => {
  let auth: AuthService;
  let jwt: JwtService;
  let userMap: Map<string, UserAggregate>;
  let users: any;
  let otpStore: Map<string, string>;
  let otpMockClient: any;

  beforeAll(async () => {
    const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });
    const user = UserAggregate.create({
      tenantId: 'sch-001',
      email: EMAIL,
      phone: PHONE,
      passwordHash,
      firstName: 'E2E',
      lastName: 'User',
      status: 'ACTIVE',
      roles: ['SCHOOL_ADMIN'],
      mfaEnabled: false,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
    }, 'system');
    user.activate(new Date().toISOString());
    userMap = new Map([[user.id, user]]);

    users = {
      findById: vi.fn(async (id: string) => userMap.get(id)),
      findByEmail: vi.fn(async (email: string) => {
        for (const u of userMap.values()) {
          if (u.email.toLowerCase() === email.toLowerCase()) return u;
        }
        return undefined;
      }),
      findByPhone: vi.fn(async (phone: string) => {
        for (const u of userMap.values()) {
          if (u.phone === phone) return u;
        }
        return undefined;
      }),
      save: vi.fn(async (u: UserAggregate) => { userMap.set(u.id, u); }),
      loadRoleCodes: vi.fn(async () => ['SCHOOL_ADMIN']),
      saveRoles: vi.fn(async () => {}),
      loadPermissionCodes: vi.fn(async () => []),
    };

    otpStore = new Map();
    otpMockClient = {
      incr: vi.fn(async (key: string) => {
        const v = Number(otpStore.get(key) ?? '0') + 1;
        otpStore.set(key, String(v));
        return v;
      }),
      expire: vi.fn(async (key: string, ttl: number) => {
        // simulate TTL by storing expiry — for tests we don't actually expire
        otpStore.set(`${key}__ttl`, String(ttl));
        return true;
      }),
      setex: vi.fn(async (key: string, _ttl: number, value: string) => {
        otpStore.set(key, value);
        return 'OK';
      }),
      get: vi.fn(async (key: string) => otpStore.get(key) ?? null),
      del: vi.fn(async (...keys: string[]) => {
        let n = 0;
        for (const k of keys) { if (otpStore.delete(k)) n++; }
        return n;
      }),
    };
    const redis = {
      forDb: vi.fn(() => otpMockClient),
    } as unknown as RedisService;

    const config = {
      get: vi.fn((key: string) => {
        if (key === 'otp.ttlSeconds') return 300;
        if (key === 'otp.maxAttempts') return 3;
        if (key === 'app.jwtIssuer') return 'preone.api';
        if (key === 'app.jwtAudience') return 'preone.app';
        if (key === 'app.jwtAccessTokenTtl') return '15m';
        if (key === 'app.jwtRefreshTokenTtl') return '30d';
        return undefined;
      }),
    } as unknown as ConfigService;

    // Generate test RSA keys for JwtService
    const { generateKeyPairSync } = await import('node:crypto');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    process.env.JWT_ACCESS_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    process.env.JWT_ACCESS_PUBLIC_KEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-min-32-chars!!!';

    jwt = new JwtService(config, redis);
    const otp = new OtpService(redis, config);
    auth = new AuthService(users as any, otp, jwt, config);
  });

  afterAll(() => {
    delete process.env.JWT_ACCESS_PRIVATE_KEY;
    delete process.env.JWT_ACCESS_PUBLIC_KEY;
    delete process.env.JWT_REFRESH_SECRET;
  });

  it('1. login with email + password → returns access + refresh tokens', async () => {
    const result = await auth.loginWithPassword({ email: EMAIL, password: PASSWORD }, '127.0.0.1');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(900);
    expect(result.user.email).toBe(EMAIL);
    expect(result.user.roles).toEqual(['SCHOOL_ADMIN']);
  });

  it('2. login should fail with wrong password', async () => {
    await expect(auth.loginWithPassword({ email: EMAIL, password: 'wrong' }))
      .rejects.toThrow();
  });

  it('3. send OTP + verify → returns new tokens', async () => {
    const sent = await auth.sendOtp({ phone: PHONE });
    expect(sent.sent).toBe(true);
    // OTP code is stored in mock Redis
    const code = otpStore.get(`otp:${PHONE}`);
    expect(code).toBeDefined();
    expect(code).toMatch(/^\d{6}$/);

    const result = await auth.verifyOtp({ phone: PHONE, code: code! });
    expect(result.accessToken).toBeDefined();
    expect(result.user.email).toBe(EMAIL);
  });

  it('4. refresh token rotation → new tokens + old revoked', async () => {
    const loginResult = await auth.loginWithPassword({ email: EMAIL, password: PASSWORD });
    const refreshResult = await auth.refresh({ refreshToken: loginResult.refreshToken });
    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    // Old refresh token should now be revoked — re-using should fail
    await expect(auth.refresh({ refreshToken: loginResult.refreshToken }))
      .rejects.toThrow();
  });

  it('5. logout → revokes refresh token', async () => {
    const loginResult = await auth.loginWithPassword({ email: EMAIL, password: PASSWORD });
    await auth.logout({ refreshToken: loginResult.refreshToken });
    // Refresh should now fail
    await expect(auth.refresh({ refreshToken: loginResult.refreshToken }))
      .rejects.toThrow();
  });

  it('6. full lifecycle: login → refresh → logout → reuse-old-token-fails', async () => {
    // 1. Login
    const loginResult = await auth.loginWithPassword({ email: EMAIL, password: PASSWORD });
    expect(loginResult.accessToken).toBeDefined();

    // 2. Refresh
    const refreshResult = await auth.refresh({ refreshToken: loginResult.refreshToken });
    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);

    // 3. Logout (revoke the new refresh token)
    await auth.logout({ refreshToken: refreshResult.refreshToken });

    // 4. Reusing the new refresh token should fail
    await expect(auth.refresh({ refreshToken: refreshResult.refreshToken }))
      .rejects.toThrow();
  });
});
