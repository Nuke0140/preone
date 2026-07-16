/**
 * Unit tests for WsScopeResolver — verifies per-channel authorization rules.
 *
 * Per API §17.5 "Subscription Scoping":
 *   - Clients subscribe to specific channels.
 *   - Server MUST validate scope (teacher only own classroom, etc.).
 *   - Subscription scope MUST be consistent with JWT scope.
 */
import { describe, it, expect } from 'vitest';

import { WsScopeResolver } from '../subscription/ws-scope-resolver';
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

describe('WsScopeResolver', () => {
  const resolver = new WsScopeResolver();

  describe('channel validation', () => {
    it('should reject unknown channel format', () => {
      const r = resolver.resolve(makeUser(), 'unknown:01HX');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('CHANNEL_INVALID');
    });

    it('should reject empty channel', () => {
      const r = resolver.resolve(makeUser(), '');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('CHANNEL_INVALID');
    });
  });

  describe('user: channel (self only)', () => {
    it('should allow self subscription', () => {
      const r = resolver.resolve(makeUser({ id: '01HALICE' }), 'user:01HALICE');
      expect(r.ok).toBe(true);
    });

    it('should deny subscribing to another user channel', () => {
      const r = resolver.resolve(makeUser({ id: '01HALICE' }), 'user:01HBOB');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('branch: channel', () => {
    it('should allow ADMIN to subscribe to any branch in tenant', () => {
      const r = resolver.resolve(makeUser({ roles: ['ADMIN'] }), 'branch:01HBR2');
      expect(r.ok).toBe(true);
    });

    it('should allow user to subscribe to their own branch', () => {
      const r = resolver.resolve(makeUser({ branchId: '01HBR' }), 'branch:01HBR');
      expect(r.ok).toBe(true);
    });

    it('should deny TEACHER subscribing to another branch', () => {
      const r = resolver.resolve(makeUser({ branchId: '01HBR' }), 'branch:01HBR2');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny user without branchId subscribing to a branch', () => {
      const r = resolver.resolve(makeUser({ branchId: undefined }), 'branch:01HBR');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('school: channel (admin only)', () => {
    it('should allow ADMIN to subscribe to own tenant', () => {
      const r = resolver.resolve(
        makeUser({ roles: ['ADMIN'], tenantId: '01HSCH' }),
        'school:01HSCH',
      );
      expect(r.ok).toBe(true);
    });

    it('should deny ADMIN subscribing to another tenant', () => {
      const r = resolver.resolve(
        makeUser({ roles: ['ADMIN'], tenantId: '01HSCH' }),
        'school:01HSCH2',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });

    it('should deny non-admin subscribing to school channel', () => {
      const r = resolver.resolve(
        makeUser({ roles: ['TEACHER'], tenantId: '01HSCH' }),
        'school:01HSCH',
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('SCOPE_DENIED');
    });
  });

  describe('room: / class: / trip: channels (v1 tenant-wide allow)', () => {
    it('should allow ADMIN to subscribe to room', () => {
      const r = resolver.resolve(makeUser({ roles: ['ADMIN'] }), 'room:01HROOM');
      expect(r.ok).toBe(true);
    });

    it('should allow CENTER_HEAD to subscribe to class', () => {
      const r = resolver.resolve(makeUser({ roles: ['CENTER_HEAD'] }), 'class:01HCL');
      expect(r.ok).toBe(true);
    });

    it('should allow TEACHER to subscribe to trip (v1 placeholder)', () => {
      const r = resolver.resolve(makeUser({ roles: ['TEACHER'] }), 'trip:01HTRP');
      expect(r.ok).toBe(true);
    });
  });
});
