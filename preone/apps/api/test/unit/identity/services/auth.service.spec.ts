/**
 * Unit tests for AuthService — login / OTP / refresh / logout flow.
 *
 * Mocks UserRepository, OtpService, JwtService, ConfigService.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@modules/identity/application/services/auth.service';
import { OtpService } from '@modules/identity/application/services/otp.service';
import { JwtService } from '@modules/identity/application/services/jwt.service';
import { UserAggregate } from '@modules/identity/domain/aggregates/user.aggregate';
import { AuthenticationException } from '@common/errors/exceptions';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

// Test fixtures
const PASSWORD = 'Password@123';
const PASSWORD_HASH = await argon2.hash(PASSWORD, { type: argon2.argon2id });

function makeUser(overrides: Partial<Parameters<typeof UserAggregate.create>[0]> = {}) {
  return UserAggregate.create({
    tenantId: 'sch-001',
    email: 'priya@school.com',
    phone: '+919876543210',
    passwordHash: PASSWORD_HASH,
    firstName: 'Priya',
    lastName: 'Sharma',
    status: 'ACTIVE',
    roles: ['SCHOOL_ADMIN'],
    mfaEnabled: false,
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    ...overrides,
  }, 'admin-001');
}

function buildService() {
  const userMap = new Map<string, UserAggregate>();

  const users = {
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

  const otp = {
    store: vi.fn(async () => undefined),
    verify: vi.fn(async () => true),
  };

  const jwt = {
    signAccess: vi.fn(async () => 'access-token-mock'),
    signRefresh: vi.fn(async () => 'refresh-token-mock'),
    verifyRefresh: vi.fn(async (token: string) => {
      if (token === 'invalid') throw new Error('Invalid token');
      return { sub: 'usr-001', exp: Math.floor(Date.now() / 1000) + 3600 };
    }),
    revokeRefresh: vi.fn(async () => undefined),
  };

  const config = {
    get: vi.fn((key: string) => {
      if (key === 'otp.ttlSeconds') return 300;
      return undefined;
    }),
  } as unknown as ConfigService;

  const svc = new AuthService(users as any, otp as any, jwt as any, config);
  return { svc, users, otp, jwt, userMap };
}

describe('AuthService', () => {
  let svc: AuthService;
  let users: any;
  let otp: any;
  let jwt: any;
  let userMap: Map<string, UserAggregate>;

  beforeEach(() => {
    const r = buildService();
    svc = r.svc;
    users = r.users;
    otp = r.otp;
    jwt = r.jwt;
    userMap = r.userMap;
  });

  describe('loginWithPassword()', () => {
    it('should return tokens for valid credentials + ACTIVE user', async () => {
      const user = makeUser();
      userMap.set(user.id, user);

      const result = await svc.loginWithPassword({ email: 'priya@school.com', password: PASSWORD });

      expect(result.accessToken).toBe('access-token-mock');
      expect(result.refreshToken).toBe('refresh-token-mock');
      expect(result.expiresIn).toBe(900);
      expect(result.user.email).toBe('priya@school.com');
      expect(result.user.roles).toEqual(['SCHOOL_ADMIN']);
    });

    it('should throw INVALID_CREDENTIALS for unknown email', async () => {
      await expect(svc.loginWithPassword({ email: 'unknown@x.com', password: PASSWORD }))
        .rejects.toThrow(AuthenticationException);
    });

    it('should throw INVALID_CREDENTIALS for wrong password', async () => {
      const user = makeUser();
      userMap.set(user.id, user);
      await expect(svc.loginWithPassword({ email: 'priya@school.com', password: 'wrong-pass' }))
        .rejects.toThrow(AuthenticationException);
    });

    it('should throw ACCOUNT_DISABLED for non-ACTIVE user', async () => {
      const user = makeUser({ status: 'SUSPENDED' });
      userMap.set(user.id, user);
      await expect(svc.loginWithPassword({ email: 'priya@school.com', password: PASSWORD }))
        .rejects.toThrow(AuthenticationException);
    });

    it('should record login IP + sessionId on success', async () => {
      const user = makeUser();
      userMap.set(user.id, user);
      await svc.loginWithPassword({ email: 'priya@school.com', password: PASSWORD }, '203.0.113.1');
      expect(users.save).toHaveBeenCalled();
      expect(user.lastLoginIp).toBe('203.0.113.1');
      expect(user.sessionId).toBeDefined();
    });
  });

  describe('sendOtp()', () => {
    it('should call otp.store with 6-digit code + return TTL', async () => {
      const result = await svc.sendOtp({ phone: '+919876543210' });
      expect(result.sent).toBe(true);
      expect(result.expiresInSeconds).toBe(300);
      expect(otp.store).toHaveBeenCalledWith('+919876543210', expect.any(String), 300);
      const code = otp.store.mock.calls[0][1];
      expect(code).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp()', () => {
    it('should issue tokens for valid OTP + existing user', async () => {
      const user = makeUser();
      userMap.set(user.id, user);

      const result = await svc.verifyOtp({ phone: '+919876543210', code: '123456' });
      expect(result.accessToken).toBe('access-token-mock');
      expect(result.user.id).toBe(user.id);
    });

    it('should throw OTP_INVALID when verify returns false', async () => {
      otp.verify.mockResolvedValueOnce(false);
      await expect(svc.verifyOtp({ phone: '+919876543210', code: '000000' }))
        .rejects.toThrow(AuthenticationException);
    });

    it('should throw USER_NOT_FOUND when no user has the phone', async () => {
      await expect(svc.verifyOtp({ phone: '+919999999999', code: '123456' }))
        .rejects.toThrow();
    });
  });

  describe('refresh()', () => {
    it('should issue new tokens + revoke old refresh token', async () => {
      const user = makeUser();
      userMap.set(user.id, user);
      // Mock refresh token to return this user's id
      jwt.verifyRefresh.mockResolvedValueOnce({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 });

      const result = await svc.refresh({ refreshToken: 'valid-refresh' });
      expect(result.accessToken).toBe('access-token-mock');
      expect(jwt.revokeRefresh).toHaveBeenCalledWith('valid-refresh', expect.any(Number));
    });

    it('should throw REFRESH_TOKEN_INVALID for bad token', async () => {
      await expect(svc.refresh({ refreshToken: 'invalid' }))
        .rejects.toThrow(AuthenticationException);
    });

    it('should throw USER_NOT_FOUND when user no longer exists', async () => {
      jwt.verifyRefresh.mockResolvedValueOnce({ sub: 'nonexistent', exp: 9999999999 });
      await expect(svc.refresh({ refreshToken: 'valid-but-orphan' }))
        .rejects.toThrow(AuthenticationException);
    });
  });

  describe('logout()', () => {
    it('should revoke the refresh token', async () => {
      await svc.logout({ refreshToken: 'refresh-token' });
      expect(jwt.revokeRefresh).toHaveBeenCalled();
    });
  });
});
