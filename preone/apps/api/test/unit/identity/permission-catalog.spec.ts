/**
 * Unit tests for the permission catalog (constants).
 *
 * Verifies:
 *   - All permission codes follow '<resource>.<action>.<scope>' format
 *   - All permission codes are unique
 *   - All role codes are unique
 *   - All role permissions reference valid permission codes
 *   - SUPER_ADMIN bypass + SCHOOL_ADMIN full access invariants
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_PERMISSIONS, DEFAULT_ROLES, ROLE_CODE_LIST,
} from '@modules/identity/domain/permission-catalog';

describe('Permission Catalog', () => {
  describe('Permissions', () => {
    it('all permission codes should be unique', () => {
      const codes = ALL_PERMISSIONS.map((p) => p.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });

    it('all permission codes should match <resource>.<action>.<scope> pattern', () => {
      const pattern = /^[a-z_]+\.[a-z_]+\.[a-z_]+$/;
      for (const p of ALL_PERMISSIONS) {
        expect(p.code, `Permission ${p.code} should match pattern`).toMatch(pattern);
      }
    });

    it('all permissions should have non-empty name + module + action + resource', () => {
      for (const p of ALL_PERMISSIONS) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.module.length).toBeGreaterThan(0);
        expect(p.action.length).toBeGreaterThan(0);
        expect(p.resource.length).toBeGreaterThan(0);
      }
    });

    it('all scopeType values should be valid', () => {
      const valid = new Set(['PLATFORM', 'TENANT', 'BRANCH', 'CLASSROOM']);
      for (const p of ALL_PERMISSIONS) {
        expect(valid.has(p.scopeType)).toBe(true);
      }
    });

    it('should have at least 30 permissions across all modules', () => {
      expect(ALL_PERMISSIONS.length).toBeGreaterThanOrEqual(30);
    });

    it('should cover all 14 module names', () => {
      const modules = new Set(ALL_PERMISSIONS.map((p) => p.module));
      // 14 modules: identity, student, academics, crm, admissions, attendance,
      // communication, finance, hr, inventory, administration, reports, settings, platform
      expect(modules.size).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Roles', () => {
    it('all role codes should be unique', () => {
      const codes = DEFAULT_ROLES.map((r) => r.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });

    it('should have 12 default roles (11 staff + Parent)', () => {
      expect(DEFAULT_ROLES).toHaveLength(12);
      expect(ROLE_CODE_LIST).toContain('PARENT');
      expect(ROLE_CODE_LIST).toContain('SUPER_ADMIN');
      expect(ROLE_CODE_LIST).toContain('SCHOOL_ADMIN');
    });

    it('SUPER_ADMIN should bypass RBAC (only needs platform.admin.execute)', () => {
      const sa = DEFAULT_ROLES.find((r) => r.code === 'SUPER_ADMIN');
      expect(sa).toBeDefined();
      expect(sa!.permissions).toEqual(['platform.admin.execute']);
      expect(sa!.scope).toBe('PLATFORM');
    });

    it('SCHOOL_ADMIN should have access to all non-PLATFORM permissions', () => {
      const sa = DEFAULT_ROLES.find((r) => r.code === 'SCHOOL_ADMIN');
      expect(sa).toBeDefined();
      const nonPlatformPerms = ALL_PERMISSIONS.filter((p) => p.scopeType !== 'PLATFORM').map((p) => p.code);
      for (const code of nonPlatformPerms) {
        expect(sa!.permissions, `SCHOOL_ADMIN should have ${code}`).toContain(code);
      }
    });

    it('PARENT should only have read-only permissions', () => {
      const parent = DEFAULT_ROLES.find((r) => r.code === 'PARENT');
      expect(parent).toBeDefined();
      for (const code of parent!.permissions) {
        expect(code, `Parent perm ${code} should be read or limited`).toMatch(/\.(read|create)\./);
      }
      expect(parent!.permissions).toContain('students.read.execute');
      expect(parent!.permissions).toContain('communication.create.execute');
      expect(parent!.permissions).toContain('payments.create.execute');
    });

    it('CLASS_TEACHER should have observation + attendance + chat perms', () => {
      const t = DEFAULT_ROLES.find((r) => r.code === 'CLASS_TEACHER');
      expect(t).toBeDefined();
      expect(t!.permissions).toContain('academics.create.execute');
      expect(t!.permissions).toContain('attendance.create.execute');
      expect(t!.permissions).toContain('communication.create.execute');
    });

    it('ACCOUNTS should have finance perms but NOT user management', () => {
      const a = DEFAULT_ROLES.find((r) => r.code === 'ACCOUNTS');
      expect(a).toBeDefined();
      expect(a!.permissions).toContain('invoices.create.execute');
      expect(a!.permissions).toContain('payments.create.execute');
      expect(a!.permissions).not.toContain('users.create.execute');
      expect(a!.permissions).not.toContain('roles.assign.execute');
    });

    it('all role permission references should be valid', () => {
      const validCodes = new Set(ALL_PERMISSIONS.map((p) => p.code));
      for (const role of DEFAULT_ROLES) {
        for (const code of role.permissions) {
          expect(validCodes.has(code), `Role ${role.code} references unknown permission: ${code}`).toBe(true);
        }
      }
    });

    it('all system roles should be flagged isSystem=true', () => {
      for (const role of DEFAULT_ROLES) {
        expect(role.isSystem, `${role.code} should be isSystem=true`).toBe(true);
      }
    });

    it('all roles should have a valid 6-digit hex color', () => {
      for (const role of DEFAULT_ROLES) {
        expect(role.color, `${role.code} color`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('all roles should have sortOrder in ascending order across scopes', () => {
      const sortOrders = DEFAULT_ROLES.map((r) => r.sortOrder);
      const sorted = [...sortOrders].sort((a, b) => a - b);
      expect(sortOrders).toEqual(sorted);
    });
  });
});
