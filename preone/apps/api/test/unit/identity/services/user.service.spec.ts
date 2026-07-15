/**
 * Unit tests for UserService — user CRUD + role assignment.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '@modules/identity/application/services/user.service';
import { UserAggregate, type UserProps } from '@modules/identity/domain/aggregates/user.aggregate';
import { RoleAggregate } from '@modules/identity/domain/aggregates/role.aggregate';
import { BranchAggregate } from '@modules/identity/domain/aggregates/branch.aggregate';
import { ConflictException, NotFoundException, ValidationException } from '@common/errors/exceptions';

function makeUser(overrides: Partial<UserProps> = {}): UserAggregate {
  return UserAggregate.create({
    tenantId: 'sch-001',
    email: 'priya@school.com',
    phone: '+919876543210',
    passwordHash: '$argon2id$v=19$m=...',
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

function makeRole(code: string): RoleAggregate {
  return RoleAggregate.create({
    tenantId: 'sch-001',
    code,
    name: code,
    scope: 'TENANT',
    isSystem: true,
  }, 'admin-001');
}

function makeBranch(): BranchAggregate {
  return BranchAggregate.create({
    schoolId: 'sch-001',
    code: 'BR-001',
    name: 'Main',
    addressLine1: '5th Cross',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    phone: '+919876543210',
  }, 'admin-001');
}

function buildService() {
  const userMap = new Map<string, UserAggregate>();
  const roleList = [makeRole('SCHOOL_ADMIN'), makeRole('PRINCIPAL'), makeRole('ACCOUNTS')];

  const users = {
    findById: vi.fn(async (id: string) => userMap.get(id)),
    findByEmail: vi.fn(async (email: string) => {
      for (const u of userMap.values()) if (u.email.toLowerCase() === email.toLowerCase()) return u;
      return undefined;
    }),
    findByPhone: vi.fn(async () => undefined),
    findByTenant: vi.fn(async () => ({ items: [], total: 0 })),
    list: vi.fn(async (_filter: any, page: number, pageSize: number) => ({
      items: Array.from(userMap.values()).slice((page - 1) * pageSize, page * pageSize),
      total: userMap.size,
    })),
    exists: vi.fn(async (id: string) => userMap.has(id)),
    save: vi.fn(async (u: UserAggregate) => { userMap.set(u.id, u); }),
    delete: vi.fn(async (u: UserAggregate) => { u['_props'].deletedAt = new Date().toISOString(); userMap.set(u.id, u); }),
    loadRoleCodes: vi.fn(async () => []),
    saveRoles: vi.fn(async () => {}),
    loadPermissionCodes: vi.fn(async () => []),
  };

  const roles = {
    listAvailableForTenant: vi.fn(async () => roleList),
    listSystemRoles: vi.fn(async () => roleList),
  };

  const branch = makeBranch();
  const branches = {
    findByCode: vi.fn(async (_schoolId: string, _code: string) => branch),
  };

  return {
    service: new UserService(users as any, roles as any, branches as any),
    users, roles, branches, userMap, roleList,
  };
}

describe('UserService', () => {
  let svc: UserService;
  let users: any;
  let userMap: Map<string, UserAggregate>;

  beforeEach(() => {
    const r = buildService();
    svc = r.service;
    users = r.users;
    userMap = r.userMap;
  });

  describe('createUser()', () => {
    it('should hash password + persist + assign roles', async () => {
      const result = await svc.createUser({
        email: 'new@school.com',
        password: 'Password@123',
        firstName: 'New',
        lastName: 'User',
        roles: ['SCHOOL_ADMIN'],
      }, 'sch-001', 'admin-001');

      expect(result.email).toBe('new@school.com');
      expect(result.roles).toEqual(['SCHOOL_ADMIN']);
      expect(users.save).toHaveBeenCalled();
      expect(users.saveRoles).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email', async () => {
      const existing = makeUser();
      userMap.set(existing.id, existing);
      await expect(svc.createUser({
        email: 'priya@school.com',
        password: 'Password@123',
        firstName: 'X',
        lastName: 'Y',
        roles: ['SCHOOL_ADMIN'],
      }, 'sch-001', 'admin-001')).rejects.toThrow(ConflictException);
    });

    it('should throw ValidationException for invalid role codes', async () => {
      await expect(svc.createUser({
        email: 'new@school.com',
        password: 'Password@123',
        firstName: 'X',
        lastName: 'Y',
        roles: ['INVALID_ROLE'],
      }, 'sch-001', 'admin-001')).rejects.toThrow(ValidationException);
    });

    it('should resolve branchCode → branchId', async () => {
      const result = await svc.createUser({
        email: 'new@school.com',
        password: 'Password@123',
        firstName: 'X',
        lastName: 'Y',
        roles: ['SCHOOL_ADMIN'],
        branchCode: 'BR-001',
      }, 'sch-001', 'admin-001');
      expect(result.branchId).toBeDefined();
    });
  });

  describe('getUser()', () => {
    it('should return user by ID within tenant', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      const result = await svc.getUser(u.id, 'sch-001');
      expect(result.id).toBe(u.id);
    });

    it('should throw NotFoundException for cross-tenant access', async () => {
      const u = makeUser({ tenantId: 'sch-002' });
      userMap.set(u.id, u);
      await expect(svc.getUser(u.id, 'sch-001')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listUsers()', () => {
    it('should return paginated list', async () => {
      const u1 = makeUser(); userMap.set(u1.id, u1);
      const u2 = makeUser({ email: 'b@x.in' }); userMap.set(u2.id, u2);
      const result = await svc.listUsers({ page: 1, pageSize: 1 }, 'sch-001');
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('updateUser()', () => {
    it('should update profile fields', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      const result = await svc.updateUser(u.id, {
        firstName: 'Priyanka',
        lastName: 'Sharma-Patel',
      }, 'sch-001');
      expect(result.firstName).toBe('Priyanka');
      expect(result.lastName).toBe('Sharma-Patel');
    });

    it('should transition status when changed', async () => {
      const u = makeUser({ status: 'ACTIVE' });
      userMap.set(u.id, u);
      const result = await svc.updateUser(u.id, { status: 'SUSPENDED' }, 'sch-001');
      expect(result.status).toBe('SUSPENDED');
    });
  });

  describe('deleteUser()', () => {
    it('should soft-delete user', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      const result = await svc.deleteUser(u.id, 'sch-001');
      expect(result.deleted).toBe(true);
      expect(users.saveRoles).toHaveBeenCalledWith(u.id, [], u.id, 'sch-001');
    });
  });

  describe('changeUserRoles()', () => {
    it('should replace roles + bump permissionsVersion', async () => {
      const u = makeUser({ roles: ['SCHOOL_ADMIN'] });
      // Force permissionsVersion to 5 (factory always resets to 1)
      u['_props'].permissionsVersion = 5;
      userMap.set(u.id, u);
      const result = await svc.changeUserRoles(u.id, {
        roleCodes: ['SCHOOL_ADMIN', 'PRINCIPAL'],
      }, 'sch-001', 'admin-002');
      expect(result.roles).toEqual(['SCHOOL_ADMIN', 'PRINCIPAL']);
      expect(result.permissionsVersion).toBe(6); // bumped from 5 → 6
      expect(users.saveRoles).toHaveBeenCalled();
    });

    it('should throw ValidationException for invalid role', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      await expect(svc.changeUserRoles(u.id, {
        roleCodes: ['INVALID'],
      }, 'sch-001', 'admin-002')).rejects.toThrow(ValidationException);
    });
  });

  describe('getMyProfile() / updateMyProfile()', () => {
    it('should return current user profile', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      const result = await svc.getMyProfile(u.id);
      expect(result.id).toBe(u.id);
    });

    it('should update only provided profile fields', async () => {
      const u = makeUser();
      userMap.set(u.id, u);
      const result = await svc.updateMyProfile(u.id, { displayName: 'Priya S.' });
      expect(result.displayName).toBe('Priya S.');
      expect(result.firstName).toBe('Priya'); // unchanged
    });
  });
});
