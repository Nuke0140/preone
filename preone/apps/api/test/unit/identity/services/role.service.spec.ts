/**
 * Unit tests for RoleService — role CRUD + permission grants.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleService } from '@modules/identity/application/services/role.service';
import { RoleAggregate, type RoleProps } from '@modules/identity/domain/aggregates/role.aggregate';
import { PermissionEntity } from '@modules/identity/domain/aggregates/permission.entity';
import { ConflictException, NotFoundException, BusinessException, ValidationException } from '@common/errors/exceptions';

function makeRole(overrides: Partial<RoleProps> = {}): RoleAggregate {
  return RoleAggregate.create({
    tenantId: 'sch-001',
    code: 'CUSTOM_ROLE',
    name: 'Custom Role',
    scope: 'TENANT',
    isSystem: false,
    ...overrides,
  }, 'admin-001');
}

function makePermission(code: string): PermissionEntity {
  return PermissionEntity.create({
    code,
    name: code,
    module: 'identity',
    action: 'read',
    resource: 'user',
    scopeType: 'TENANT',
    isDangerous: false,
  });
}

function buildService() {
  const roleMap = new Map<string, RoleAggregate>();
  const permMap = new Map<string, PermissionEntity>([
    ['users.read.execute', makePermission('users.read.execute')],
    ['users.create.execute', makePermission('users.create.execute')],
    ['roles.read.execute', makePermission('roles.read.execute')],
  ]);

  const roles = {
    findById: vi.fn(async (id: string) => roleMap.get(id)),
    findByIds: vi.fn(async () => []),
    findByCode: vi.fn(async (_tenantId: string, code: string) => {
      for (const r of roleMap.values()) if (r.code === code) return r;
      return undefined;
    }),
    listByTenant: vi.fn(async () => Array.from(roleMap.values())),
    listSystemRoles: vi.fn(async () => Array.from(roleMap.values()).filter((r) => r.isSystem)),
    listAvailableForTenant: vi.fn(async () => Array.from(roleMap.values())),
    exists: vi.fn(async (id: string) => roleMap.has(id)),
    save: vi.fn(async (r: RoleAggregate) => { roleMap.set(r.id, r); }),
    delete: vi.fn(async (r: RoleAggregate) => { r['_props'].deletedAt = new Date().toISOString(); roleMap.set(r.id, r); }),
    savePermissions: vi.fn(async () => {}),
  };

  const permissions = {
    findByCode: vi.fn(async (code: string) => permMap.get(code)),
    findById: vi.fn(async (id: string) => {
      for (const p of permMap.values()) if (p.id === id) return p;
      return undefined;
    }),
    findByIds: vi.fn(async (ids: readonly string[]) => {
      const result: PermissionEntity[] = [];
      for (const id of ids) for (const p of permMap.values()) if (p.id === id) result.push(p);
      return result;
    }),
    listByModule: vi.fn(async () => Array.from(permMap.values())),
    listAll: vi.fn(async () => Array.from(permMap.values())),
    bulkCreate: vi.fn(async () => {}),
  };

  const users = {
    loadRoleCodes: vi.fn(async () => []),
    saveRoles: vi.fn(async () => {}),
  };

  return {
    service: new RoleService(roles as any, permissions as any, users as any),
    roles, permissions, roleMap, permMap,
  };
}

describe('RoleService', () => {
  let svc: RoleService;
  let roles: any;
  let roleMap: Map<string, RoleAggregate>;

  beforeEach(() => {
    const r = buildService();
    svc = r.service;
    roles = r.roles;
    roleMap = r.roleMap;
  });

  describe('createRole()', () => {
    it('should create role + persist permissions', async () => {
      const result = await svc.createRole({
        code: 'CURRICULUM_LEAD',
        name: 'Curriculum Lead',
        scope: 'TENANT',
        permissions: ['users.read.execute', 'roles.read.execute'],
      }, 'sch-001', 'admin-001');

      expect(result.code).toBe('CURRICULUM_LEAD');
      expect(result.name).toBe('Curriculum Lead');
      expect(roles.save).toHaveBeenCalled();
      expect(roles.savePermissions).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate code', async () => {
      const existing = makeRole({ code: 'EXISTING' });
      roleMap.set(existing.id, existing);
      roles.findByCode.mockResolvedValueOnce(existing);

      await expect(svc.createRole({
        code: 'EXISTING',
        name: 'X',
        scope: 'TENANT',
        permissions: [],
      }, 'sch-001', 'admin-001')).rejects.toThrow(ConflictException);
    });

    it('should throw ValidationException for invalid permission code', async () => {
      await expect(svc.createRole({
        code: 'NEW_ROLE',
        name: 'X',
        scope: 'TENANT',
        permissions: ['nonexistent.permission'],
      }, 'sch-001', 'admin-001')).rejects.toThrow(ValidationException);
    });
  });

  describe('getRole()', () => {
    it('should return role by ID', async () => {
      const r = makeRole();
      roleMap.set(r.id, r);
      const result = await svc.getRole(r.id);
      expect(result.id).toBe(r.id);
    });

    it('should throw NotFoundException for unknown ID', async () => {
      await expect(svc.getRole('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRole()', () => {
    it('should update profile', async () => {
      const r = makeRole();
      roleMap.set(r.id, r);
      const result = await svc.updateRole(r.id, { name: 'Updated Role', color: '#FF0000' });
      expect(result.name).toBe('Updated Role');
      expect(result.color).toBe('#FF0000');
    });

    it('should throw BusinessException when updating system role', async () => {
      const r = makeRole({ isSystem: true });
      roleMap.set(r.id, r);
      await expect(svc.updateRole(r.id, { name: 'X' })).rejects.toThrow(BusinessException);
    });
  });

  describe('deleteRole()', () => {
    it('should soft-delete custom role', async () => {
      const r = makeRole();
      roleMap.set(r.id, r);
      const result = await svc.deleteRole(r.id);
      expect(result.deleted).toBe(true);
    });

    it('should throw when deleting system role', async () => {
      const r = makeRole({ isSystem: true });
      roleMap.set(r.id, r);
      await expect(svc.deleteRole(r.id)).rejects.toThrow();
    });
  });

  describe('grantPermissions()', () => {
    it('should grant valid permissions to role', async () => {
      const r = makeRole();
      roleMap.set(r.id, r);
      const result = await svc.grantPermissions(r.id, {
        permissionCodes: ['users.read.execute', 'users.create.execute'],
      }, 'admin-001');
      expect(result.permissions).toContain('users.read.execute');
      expect(result.permissions).toContain('users.create.execute');
      expect(roles.savePermissions).toHaveBeenCalled();
    });

    it('should throw ValidationException for invalid permission', async () => {
      const r = makeRole();
      roleMap.set(r.id, r);
      await expect(svc.grantPermissions(r.id, {
        permissionCodes: ['invalid.permission'],
      }, 'admin-001')).rejects.toThrow(ValidationException);
    });

    it('should be idempotent — re-granting existing permission is no-op', async () => {
      const perm = makePermission('users.read.execute');
      const r = makeRole({ permissionIds: [perm.id] });
      roleMap.set(r.id, r);
      const result = await svc.grantPermissions(r.id, {
        permissionCodes: ['users.read.execute'],
      }, 'admin-001');
      expect(result.permissions).toEqual(['users.read.execute']);
    });
  });

  describe('listRoles()', () => {
    it('should return list of roles with permissions resolved', async () => {
      const r = makeRole({ permissionIds: [] });
      roleMap.set(r.id, r);
      const result = await svc.listRoles('sch-001');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(r.id);
    });
  });
});
