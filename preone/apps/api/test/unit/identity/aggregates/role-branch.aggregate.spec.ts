/**
 * Unit tests for RoleAggregate + BranchAggregate — pure domain logic.
 */
import { describe, it, expect } from 'vitest';
import { RoleAggregate, type RoleProps } from '@modules/identity/domain/aggregates/role.aggregate';
import { BranchAggregate, type BranchProps } from '@modules/identity/domain/aggregates/branch.aggregate';

function baseRoleProps(overrides: Partial<RoleProps> = {}): RoleProps {
  return {
    tenantId: 'sch-001',
    code: 'CUSTOM_ROLE',
    name: 'Custom Role',
    description: 'A custom role',
    scope: 'TENANT',
    isSystem: false,
    permissionIds: [],
    color: '#7C3AED',
    sortOrder: 100,
    isActive: true,
    ...overrides,
  };
}

function baseBranchProps(overrides: Partial<BranchProps> = {}): BranchProps {
  return {
    schoolId: 'sch-001',
    code: 'BR-001',
    name: 'Main Branch',
    addressLine1: '5th Cross',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    country: 'India',
    phone: '+919876543210',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    isActive: true,
    ...overrides,
  };
}

describe('RoleAggregate', () => {
  describe('create()', () => {
    it('should create role with default permissionIds/isActive/sortOrder', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      expect(role.id).toBeDefined();
      expect(role.permissionIds).toEqual([]);
      expect(role.isActive).toBe(true);
      expect(role.sortOrder).toBe(100);
    });

    it('should raise RoleCreatedEvent', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      expect(role.domainEvents).toHaveLength(1);
      expect(role.domainEvents[0].eventType).toBe('RoleCreatedEvent');
      expect((role.domainEvents[0].payload as any).createdBy).toBe('admin-001');
    });
  });

  describe('grantPermission() / revokePermission()', () => {
    it('should add permission + raise event', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      role.clearDomainEvents();
      role.grantPermission('perm-001', 'admin-001');
      expect(role.permissionIds).toContain('perm-001');
      expect(role.domainEvents[0].eventType).toBe('RolePermissionGrantedEvent');
    });

    it('should be idempotent — no event when already granted', () => {
      const role = RoleAggregate.create(baseRoleProps({ permissionIds: ['perm-001'] }), 'admin-001');
      role.clearDomainEvents();
      role.grantPermission('perm-001', 'admin-001');
      expect(role.domainEvents).toHaveLength(0);
    });

    it('should remove permission + raise event', () => {
      const role = RoleAggregate.create(baseRoleProps({ permissionIds: ['perm-001', 'perm-002'] }), 'admin-001');
      role.clearDomainEvents();
      role.revokePermission('perm-001', 'admin-001');
      expect(role.permissionIds).toEqual(['perm-002']);
      expect(role.domainEvents[0].eventType).toBe('RolePermissionRevokedEvent');
    });

    it('should be a no-op when revoking non-existent permission', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      role.clearDomainEvents();
      role.revokePermission('perm-X', 'admin-001');
      expect(role.domainEvents).toHaveLength(0);
    });
  });

  describe('delete()', () => {
    it('should soft-delete custom role + raise event', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      role.clearDomainEvents();
      const now = new Date().toISOString();
      role.delete(now);
      expect(role.deletedAt).toBe(now);
      expect(role.isActive).toBe(false);
      expect(role.domainEvents[0].eventType).toBe('RoleDeletedEvent');
    });

    it('should throw when deleting system role', () => {
      const role = RoleAggregate.create(baseRoleProps({ isSystem: true }), 'admin-001');
      expect(() => role.delete(new Date().toISOString())).toThrow(/System roles cannot be deleted/);
    });
  });

  describe('updateProfile()', () => {
    it('should update only provided fields', () => {
      const role = RoleAggregate.create(baseRoleProps(), 'admin-001');
      role.updateProfile({ name: 'New Name', color: '#FF0000', isActive: false });
      expect(role.name).toBe('New Name');
      expect(role.color).toBe('#FF0000');
      expect(role.isActive).toBe(false);
      expect(role.description).toBe('A custom role'); // unchanged
    });
  });
});

describe('BranchAggregate', () => {
  describe('create()', () => {
    it('should create branch with defaults for country/timezone/locale', () => {
      const branch = BranchAggregate.create({
        schoolId: 'sch-001',
        code: 'BR-001',
        name: 'Main Branch',
        addressLine1: '5th Cross',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560095',
        phone: '+919876543210',
      }, 'admin-001');

      expect(branch.country).toBe('India');
      expect(branch.timezone).toBe('Asia/Kolkata');
      expect(branch.locale).toBe('en-IN');
      expect(branch.isActive).toBe(true);
    });

    it('should raise BranchCreatedEvent', () => {
      const branch = BranchAggregate.create({
        schoolId: 'sch-001',
        code: 'BR-001',
        name: 'Main',
        addressLine1: '5th Cross',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560095',
        phone: '+919876543210',
      }, 'admin-001');
      expect(branch.domainEvents).toHaveLength(1);
      expect(branch.domainEvents[0].eventType).toBe('BranchCreatedEvent');
    });
  });

  describe('activate() / deactivate()', () => {
    it('should deactivate branch + raise event', () => {
      const branch = BranchAggregate.create(baseBranchProps(), 'admin-001');
      branch.clearDomainEvents();
      const now = new Date().toISOString();
      branch.deactivate(now);
      expect(branch.isActive).toBe(false);
      expect(branch.closedAt).toBe(now);
      expect(branch.domainEvents[0].eventType).toBe('BranchDeactivatedEvent');
    });

    it('should reactivate branch', () => {
      const branch = BranchAggregate.create({
        ...baseBranchProps(),
        isActive: false,
        closedAt: '2026-01-01T00:00:00.000Z',
      }, 'admin-001');
      branch.activate();
      expect(branch.isActive).toBe(true);
      expect(branch.closedAt).toBeUndefined();
    });
  });

  describe('updateProfile()', () => {
    it('should update only provided fields', () => {
      const branch = BranchAggregate.create(baseBranchProps(), 'admin-001');
      branch.updateProfile({ name: 'New Branch Name', phone: '+919999999999' });
      expect(branch.name).toBe('New Branch Name');
      expect(branch.phone).toBe('+919999999999');
      expect(branch.city).toBe('Bengaluru'); // unchanged
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt + isActive=false', () => {
      const branch = BranchAggregate.create(baseBranchProps(), 'admin-001');
      const now = new Date().toISOString();
      branch.softDelete(now);
      expect(branch.deletedAt).toBe(now);
      expect(branch.isActive).toBe(false);
    });
  });
});
