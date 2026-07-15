/**
 * Unit tests for PermissionResolver — Redis cache + DB fallback (BTD §16.4).
 *
 * Verifies:
 *   - Cache HIT path (no DB call)
 *   - Cache MISS path (DB call + cache write)
 *   - SUPER_ADMIN bypass (wildcard "*")
 *   - Cache write failure (best-effort fallback)
 *   - AND / OR semantics
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { PermissionResolver, type ResolvedUser } from '@modules/identity/application/services/permission-resolver.service';
import { CacheService } from '@infra/cache/cache.service';
import type { UserRepository } from '@modules/identity/domain/repositories/user.repository';

function makeUser(overrides: Partial<ResolvedUser> = {}): ResolvedUser {
  return {
    id: 'user-001',
    tenantId: 'sch-001',
    permissionsVersion: 1,
    roles: ['SCHOOL_ADMIN'],
    ...overrides,
  };
}

function buildResolver(opts: {
  cacheGet?: (key: string) => Promise<string[] | undefined>;
  cacheSet?: (key: string, value: string[], ttl: number) => Promise<void>;
  loadPerms?: (userId: string, tenantId: string) => Promise<string[]>;
} = {}) {
  const cache = {
    // Real CacheService.get<T>() returns parsed T (or undefined)
    get: vi.fn(async (key: string) => opts.cacheGet ? await opts.cacheGet(key) : undefined),
    // Real CacheService.set<T>() takes raw T (stringifies internally)
    set: vi.fn(async (key: string, value: string[], ttl: number) => {
      if (opts.cacheSet) await opts.cacheSet(key, value, ttl);
    }),
    getOrLoad: vi.fn(),
    invalidate: vi.fn(),
    invalidateMany: vi.fn(),
    broadcastInvalidation: vi.fn(),
  } as unknown as CacheService;

  const users = {
    loadPermissionCodes: vi.fn(opts.loadPerms ?? (async () => ['users.read', 'users.write'])),
  } as unknown as UserRepository;

  const resolver = new PermissionResolver(cache, users);
  return { resolver, cache, users };
}

describe('PermissionResolver — BTD §16.4', () => {
  describe('getPermissions()', () => {
    it('should return cached permissions on HIT (no DB call)', async () => {
      const cached = ['users.read', 'users.write', 'reports.read'];
      const { resolver, cache, users } = buildResolver({
        cacheGet: async () => cached,
      });
      const user = makeUser();

      const result = await resolver.getPermissions(user);

      expect(result).toBeInstanceOf(Set);
      expect([...result]).toEqual(expect.arrayContaining(cached));
      expect(cache.get).toHaveBeenCalledWith(`user_perms:${user.id}:v1`);
      expect(users.loadPermissionCodes).not.toHaveBeenCalled();
    });

    it('should load from DB on MISS and cache the result with 300s TTL', async () => {
      const { resolver, cache, users } = buildResolver({
        cacheGet: async () => undefined,
        loadPerms: async () => ['students.read', 'attendance.mark'],
      });
      const user = makeUser();

      const result = await resolver.getPermissions(user);

      expect(result).toEqual(new Set(['students.read', 'attendance.mark']));
      expect(users.loadPermissionCodes).toHaveBeenCalledWith(user.id, user.tenantId);
      expect(cache.set).toHaveBeenCalledWith(
        `user_perms:${user.id}:v1`,
        ['students.read', 'attendance.mark'],
        300,
      );
    });

    it('should use version in cache key (BTD §16.4 invalidation)', async () => {
      const { resolver, cache } = buildResolver({ cacheGet: async () => undefined });
      const userV1 = makeUser({ permissionsVersion: 1 });
      const userV2 = makeUser({ permissionsVersion: 2 });

      await resolver.getPermissions(userV1);
      await resolver.getPermissions(userV2);

      expect(cache.get).toHaveBeenNthCalledWith(1, 'user_perms:user-001:v1');
      expect(cache.get).toHaveBeenNthCalledWith(2, 'user_perms:user-001:v2');
    });

    it('should NOT cache or hit DB for SUPER_ADMIN (wildcard bypass)', async () => {
      const { resolver, cache, users } = buildResolver();
      const superAdmin = makeUser({ roles: ['SUPER_ADMIN'] });

      const result = await resolver.getPermissions(superAdmin);

      expect(result).toEqual(new Set(['*']));
      expect(cache.get).not.toHaveBeenCalled();
      expect(users.loadPermissionCodes).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('should continue without cache on Redis write failure (best-effort)', async () => {
      const { resolver, cache } = buildResolver({
        cacheGet: async () => undefined,
        cacheSet: async () => { throw new Error('Redis connection lost'); },
      });

      // Should NOT throw — falls through gracefully
      const result = await resolver.getPermissions(makeUser());
      expect(result.size).toBeGreaterThan(0);
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return empty set when DB returns no permissions', async () => {
      const { resolver } = buildResolver({
        cacheGet: async () => undefined,
        loadPerms: async () => [],
      });

      const result = await resolver.getPermissions(makeUser({ roles: ['PARENT'] }));
      expect(result.size).toBe(0);
    });
  });

  describe('hasPermission()', () => {
    it('should return true when permission is in resolved set', async () => {
      const { resolver } = buildResolver({
        cacheGet: async () => ['students.read', 'students.write'],
      });

      expect(await resolver.hasPermission(makeUser(), 'students.read')).toBe(true);
      expect(await resolver.hasPermission(makeUser(), 'finance.refund')).toBe(false);
    });

    it('should return true for SUPER_ADMIN regardless of permission code', async () => {
      const { resolver } = buildResolver();
      const admin = makeUser({ roles: ['SUPER_ADMIN'] });
      expect(await resolver.hasPermission(admin, 'any.permission.code')).toBe(true);
    });
  });

  describe('hasAllPermissions() — AND semantics (BTD §3.3)', () => {
    it('should return true only when ALL required permissions are present', async () => {
      const { resolver } = buildResolver({
        cacheGet: async () => ['a.read', 'a.write', 'a.delete'],
      });
      const user = makeUser();

      expect(await resolver.hasAllPermissions(user, ['a.read', 'a.write'])).toBe(true);
      expect(await resolver.hasAllPermissions(user, ['a.read', 'b.read'])).toBe(false);
    });

    it('should return true for empty requirement list', async () => {
      const { resolver } = buildResolver();
      expect(await resolver.hasAllPermissions(makeUser(), [])).toBe(true);
    });

    it('should return true for SUPER_ADMIN', async () => {
      const { resolver } = buildResolver();
      const admin = makeUser({ roles: ['SUPER_ADMIN'] });
      expect(await resolver.hasAllPermissions(admin, ['x', 'y', 'z'])).toBe(true);
    });
  });

  describe('hasAnyPermission() — OR semantics', () => {
    it('should return true when ANY required permission is present', async () => {
      const { resolver } = buildResolver({
        cacheGet: async () => ['a.read'],
      });
      const user = makeUser();

      expect(await resolver.hasAnyPermission(user, ['a.read', 'b.read'])).toBe(true);
      expect(await resolver.hasAnyPermission(user, ['b.read', 'c.read'])).toBe(false);
    });

    it('should return true for empty requirement list', async () => {
      const { resolver } = buildResolver();
      expect(await resolver.hasAnyPermission(makeUser(), [])).toBe(true);
    });

    it('should return true for SUPER_ADMIN', async () => {
      const { resolver } = buildResolver();
      const admin = makeUser({ roles: ['SUPER_ADMIN'] });
      expect(await resolver.hasAnyPermission(admin, ['x', 'y'])).toBe(true);
    });
  });
});
