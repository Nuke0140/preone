/**
 * Unit tests for WsScopeResolver (Wave 16.1 — DB-backed scope checks).
 *
 * Per API §17.5 "Subscription Scoping":
 *   - Clients subscribe to specific channels.
 *   - Server MUST validate scope (teacher only own classroom, etc.).
 *   - Subscription scope MUST be consistent with JWT scope.
 *
 * Wave 16.0 tests covered the JWT-only synchronous resolver. Wave 16.1
 * rewrites the resolver to be async + DB-backed — these tests mock the
 * WsScopeCheckService to verify the resolver's branching logic.
 */
import { describe, it, expect, vi } from 'vitest';

import { WsScopeResolver } from '../subscription/ws-scope-resolver';
import { WsScopeCheckService } from '../subscription/ws-scope-check.service';
import type { WsAuthenticatedUser } from '../ws-connection-context';

function makeUser(overrides: Partial<WsAuthenticatedUser> = {}): WsAuthenticatedUser {
  return {
    id: '01HUSER',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'test@preone.in',
    roles: ['TEACHER'],
    permissionsVersion: 1,
    sessionId: '01HSESS',
    ...overrides,
  };
}

/** Build a resolver with a mocked WsScopeCheckService. */
function makeResolver(
  scopeCheckOverrides: Partial<WsScopeCheckService> = {},
): { resolver: WsScopeResolver; scopeCheck: vi.Mocked<WsScopeCheckService> } {
  const scopeCheck = {
    canTeacherAccessSection: vi.fn<(userId: string, sectionId: string) => Promise<boolean>>()
      .mockResolvedValue(true),
    canParentAccessSection: vi.fn<(userId: string, sectionId: string) => Promise<boolean>>()
      .mockResolvedValue(true),
    canParentAccessTrip: vi.fn<(userId: string, tripId: string) => Promise<boolean>>()
      .mockResolvedValue(true),
    invalidate: vi.fn().mockResolvedValue(undefined),
    ...scopeCheckOverrides,
  } as unknown as vi.Mocked<WsScopeCheckService>;
  return { resolver: new WsScopeResolver(scopeCheck), scopeCheck };
}

describe('WsScopeResolver (Wave 16.1 — DB-backed)', () => {
  describe('channel validation', () => {
    it('should reject unknown channel format', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser(), 'unknown:01HX');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('CHANNEL_INVALID');
    });

    it('should reject empty channel', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser(), '');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('CHANNEL_INVALID');
    });
  });

  describe('user: channel (self only)', () => {
    it('should allow self subscription', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ id: '01HALICE' }), 'user:01HALICE');
      expect(r.ok).toBe(true);
    });

    it('should deny subscribing to another user channel', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ id: '01HALICE' }), 'user:01HBOB');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('branch: channel', () => {
    it('should allow ADMIN to subscribe to any branch in tenant', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ roles: ['ADMIN'] }), 'branch:01HBR2');
      expect(r.ok).toBe(true);
    });

    it('should allow user to subscribe to their own branch', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ branchId: '01HBR' }), 'branch:01HBR');
      expect(r.ok).toBe(true);
    });

    it('should deny TEACHER subscribing to another branch', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ branchId: '01HBR' }), 'branch:01HBR2');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny user without branchId subscribing to a branch', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(makeUser({ branchId: undefined }), 'branch:01HBR');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('school: channel (admin only)', () => {
    it('should allow ADMIN to subscribe to own tenant', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ roles: ['ADMIN'], tenantId: '01HSCH' }),
        'school:01HSCH',
      );
      expect(r.ok).toBe(true);
    });

    it('should deny ADMIN subscribing to another tenant', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ roles: ['ADMIN'], tenantId: '01HSCH' }),
        'school:01HSCH2',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny non-admin subscribing to school channel', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ roles: ['TEACHER'], tenantId: '01HSCH' }),
        'school:01HSCH',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('room: / class: channels (DB-backed teacher + parent checks)', () => {
    it('should allow ADMIN without DB lookup', async () => {
      const { resolver, scopeCheck } = makeResolver();
      const r = await resolver.resolve(makeUser({ roles: ['ADMIN'] }), 'room:01HROOM');
      expect(r.ok).toBe(true);
      expect(scopeCheck.canTeacherAccessSection).not.toHaveBeenCalled();
      expect(scopeCheck.canParentAccessSection).not.toHaveBeenCalled();
    });

    it('should allow CENTER_HEAD without DB lookup', async () => {
      const { resolver, scopeCheck } = makeResolver();
      const r = await resolver.resolve(makeUser({ roles: ['CENTER_HEAD'] }), 'class:01HCL');
      expect(r.ok).toBe(true);
      expect(scopeCheck.canTeacherAccessSection).not.toHaveBeenCalled();
    });

    it('should allow TEACHER when SectionTeacher row exists', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canTeacherAccessSection: vi.fn().mockResolvedValue(true),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HTEACH', roles: ['TEACHER'] }),
        'class:01HCL',
      );
      expect(r.ok).toBe(true);
      expect(scopeCheck.canTeacherAccessSection).toHaveBeenCalledWith('01HTEACH', '01HCL');
    });

    it('should deny TEACHER when no SectionTeacher row exists', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canTeacherAccessSection: vi.fn().mockResolvedValue(false),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HTEACH', roles: ['TEACHER'] }),
        'class:01HCL',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
      expect(scopeCheck.canTeacherAccessSection).toHaveBeenCalledWith('01HTEACH', '01HCL');
    });

    it('should allow PARENT when ward enrolled in section', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canParentAccessSection: vi.fn().mockResolvedValue(true),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HPAR', roles: ['PARENT'] }),
        'room:01HROOM',
      );
      expect(r.ok).toBe(true);
      expect(scopeCheck.canParentAccessSection).toHaveBeenCalledWith('01HPAR', '01HROOM');
    });

    it('should deny PARENT when no ward enrolled in section', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canParentAccessSection: vi.fn().mockResolvedValue(false),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HPAR', roles: ['PARENT'] }),
        'room:01HROOM',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny user with no recognized role', async () => {
      const { resolver } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ id: '01HUSR', roles: ['SOME_OTHER_ROLE'] }),
        'room:01HROOM',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('trip: channel (DB-backed parent check, teacher denied)', () => {
    it('should allow ADMIN without DB lookup', async () => {
      const { resolver, scopeCheck } = makeResolver();
      const r = await resolver.resolve(makeUser({ roles: ['ADMIN'] }), 'trip:01HTRP');
      expect(r.ok).toBe(true);
      expect(scopeCheck.canParentAccessTrip).not.toHaveBeenCalled();
    });

    it('should allow TRANSPORT_STAFF without DB lookup', async () => {
      const { resolver, scopeCheck } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ roles: ['TRANSPORT_STAFF'] }),
        'trip:01HTRP',
      );
      expect(r.ok).toBe(true);
      expect(scopeCheck.canParentAccessTrip).not.toHaveBeenCalled();
    });

    it('should allow PARENT when ward assigned to trip', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canParentAccessTrip: vi.fn().mockResolvedValue(true),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HPAR', roles: ['PARENT'] }),
        'trip:01HTRP',
      );
      expect(r.ok).toBe(true);
      expect(scopeCheck.canParentAccessTrip).toHaveBeenCalledWith('01HPAR', '01HTRP');
    });

    it('should deny PARENT when no ward assigned to trip', async () => {
      const { resolver, scopeCheck } = makeResolver({
        canParentAccessTrip: vi.fn().mockResolvedValue(false),
      });
      const r = await resolver.resolve(
        makeUser({ id: '01HPAR', roles: ['PARENT'] }),
        'trip:01HTRP',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny TEACHER from subscribing to trip channels', async () => {
      const { resolver, scopeCheck } = makeResolver();
      const r = await resolver.resolve(
        makeUser({ id: '01HTEACH', roles: ['TEACHER'] }),
        'trip:01HTRP',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
      expect(scopeCheck.canParentAccessTrip).not.toHaveBeenCalled();
    });
  });
});
