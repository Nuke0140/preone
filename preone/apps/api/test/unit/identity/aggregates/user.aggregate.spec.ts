/**
 * Unit tests for UserAggregate — pure domain logic, no DB.
 *
 * Per BTD §24: Pure domain tests should be fast (<10ms each), no I/O.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UserAggregate, type UserProps } from '@modules/identity/domain/aggregates/user.aggregate';

function baseProps(overrides: Partial<UserProps> = {}): UserProps {
  return {
    tenantId: 'sch-001',
    email: 'priya@school.com',
    phone: '+919876543210',
    passwordHash: '$argon2id$v=19$m=...',
    firstName: 'Priya',
    lastName: 'Sharma',
    status: 'PENDING',
    roles: ['SCHOOL_ADMIN'],
    permissionsVersion: 1,
    mfaEnabled: false,
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    ...overrides,
  };
}

describe('UserAggregate', () => {
  describe('create()', () => {
    it('should create a user with PENDING status + permissionsVersion=1', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      expect(user.id).toBeDefined();
      expect(user.status).toBe('PENDING');
      expect(user.permissionsVersion).toBe(1);
      expect(user.roles).toEqual(['SCHOOL_ADMIN']);
      expect(user.email).toBe('priya@school.com');
    });

    it('should raise UserCreatedEvent', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      const events = user.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserCreatedEvent');
      expect((events[0].payload as any).createdBy).toBe('admin-001');
      expect((events[0].payload as any).email).toBe('priya@school.com');
    });

    it('should allow overriding status + mfaEnabled', () => {
      const user = UserAggregate.create({
        ...baseProps(),
        status: 'ACTIVE',
        mfaEnabled: true,
      }, 'admin-001');
      expect(user.status).toBe('ACTIVE');
      expect(user.mfaEnabled).toBe(true);
    });

    it('should compute displayName fallback from firstName + lastName', () => {
      const user = UserAggregate.create(baseProps({ displayName: undefined }), 'admin-001');
      expect(user.displayName).toBe('Priya Sharma');
    });

    it('should preserve custom displayName when provided', () => {
      const user = UserAggregate.create(baseProps({ displayName: 'Priya S.' }), 'admin-001');
      expect(user.displayName).toBe('Priya S.');
    });
  });

  describe('changeRoles()', () => {
    it('should bump permissionsVersion on role change', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      const initialVersion = user.permissionsVersion;
      user.changeRoles(['SCHOOL_ADMIN', 'PRINCIPAL']);
      expect(user.permissionsVersion).toBe(initialVersion + 1);
      expect(user.roles).toEqual(['SCHOOL_ADMIN', 'PRINCIPAL']);
    });

    it('should raise UserRolesChangedEvent with old + new roles', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.clearDomainEvents();
      user.changeRoles(['SCHOOL_ADMIN', 'PRINCIPAL']);
      const events = user.domainEvents;
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('UserRolesChangedEvent');
      const payload = events[0].payload as any;
      expect(payload.oldRoles).toEqual(['SCHOOL_ADMIN']);
      expect(payload.newRoles).toEqual(['SCHOOL_ADMIN', 'PRINCIPAL']);
      expect(payload.newPermissionsVersion).toBe(2);
    });

    it('should deduplicate role codes', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.changeRoles(['SCHOOL_ADMIN', 'SCHOOL_ADMIN', 'PRINCIPAL']);
      expect(user.roles).toEqual(['SCHOOL_ADMIN', 'PRINCIPAL']);
    });

    it('should be a no-op when roles unchanged (no event, no version bump)', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.clearDomainEvents();
      user.changeRoles(['SCHOOL_ADMIN']);
      expect(user.permissionsVersion).toBe(1);
      expect(user.domainEvents).toHaveLength(0);
    });
  });

  describe('addRole() / removeRole()', () => {
    it('should add a new role', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.addRole('PRINCIPAL');
      expect(user.roles).toContain('PRINCIPAL');
      expect(user.permissionsVersion).toBe(2);
    });

    it('should be a no-op when adding an existing role', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.addRole('SCHOOL_ADMIN');
      expect(user.permissionsVersion).toBe(1);
    });

    it('should remove a role', () => {
      const user = UserAggregate.create(baseProps({ roles: ['SCHOOL_ADMIN', 'PRINCIPAL'] }), 'admin-001');
      user.removeRole('SCHOOL_ADMIN');
      expect(user.roles).toEqual(['PRINCIPAL']);
      expect(user.permissionsVersion).toBe(2);
    });

    it('should be a no-op when removing a non-existing role', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.removeRole('PRINCIPAL');
      expect(user.permissionsVersion).toBe(1);
    });
  });

  describe('status transitions', () => {
    it('activate() should set status to ACTIVE + raise event', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.clearDomainEvents();
      const now = new Date().toISOString();
      user.activate(now);
      expect(user.status).toBe('ACTIVE');
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0].eventType).toBe('UserActivatedEvent');
    });

    it('suspend() should set status to SUSPENDED + raise event with reason', () => {
      const user = UserAggregate.create(baseProps({ status: 'ACTIVE' }), 'admin-001');
      user.clearDomainEvents();
      user.suspend('Policy violation', new Date().toISOString());
      expect(user.status).toBe('SUSPENDED');
      const evt = user.domainEvents[0];
      expect(evt.eventType).toBe('UserSuspendedEvent');
      expect((evt.payload as any).reason).toBe('Policy violation');
    });

    it('deactivate() should set status to DEACTIVATED + raise event', () => {
      const user = UserAggregate.create(baseProps({ status: 'ACTIVE' }), 'admin-001');
      user.clearDomainEvents();
      user.deactivate(new Date().toISOString());
      expect(user.status).toBe('DEACTIVATED');
      expect(user.domainEvents[0].eventType).toBe('UserDeactivatedEvent');
    });
  });

  describe('invariants', () => {
    it('isActive / isPending / isDeactivated should reflect status', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      expect(user.isPending).toBe(true);
      expect(user.isActive).toBe(false);
      user.activate(new Date().toISOString());
      expect(user.isActive).toBe(true);
      user.deactivate(new Date().toISOString());
      expect(user.isDeactivated).toBe(true);
    });
  });

  describe('recordLogin()', () => {
    it('should update lastLoginAt + lastLoginIp + sessionId', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      const now = new Date().toISOString();
      user.recordLogin('192.168.1.1', 'sess-abc', now);
      expect(user.lastLoginAt).toBe(now);
      expect(user.lastLoginIp).toBe('192.168.1.1');
      expect(user.sessionId).toBe('sess-abc');
    });
  });

  describe('verifyEmail() / verifyPhone()', () => {
    it('should set emailVerifiedAt + phoneVerifiedAt timestamps', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      const now = new Date().toISOString();
      user.verifyEmail(now);
      user.verifyPhone(now);
      expect(user.emailVerifiedAt).toBe(now);
      expect(user.phoneVerifiedAt).toBe(now);
    });
  });

  describe('updateProfile()', () => {
    it('should update only provided fields', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.updateProfile({ firstName: 'Priyanka', avatarUrl: 'https://cdn/priya.png' });
      expect(user.firstName).toBe('Priyanka');
      expect(user.avatarUrl).toBe('https://cdn/priya.png');
      expect(user.lastName).toBe('Sharma'); // unchanged
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt + status to DEACTIVATED', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      const now = new Date().toISOString();
      user.softDelete(now);
      expect(user.deletedAt).toBe(now);
      expect(user.status).toBe('DEACTIVATED');
    });
  });

  describe('setPassword()', () => {
    it('should update passwordHash', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      user.setPassword('new-hash-value');
      expect(user.passwordHash).toBe('new-hash-value');
    });
  });

  describe('MFA', () => {
    it('enableMfa() / disableMfa() should toggle flag', () => {
      const user = UserAggregate.create(baseProps(), 'admin-001');
      expect(user.mfaEnabled).toBe(false);
      user.enableMfa();
      expect(user.mfaEnabled).toBe(true);
      user.disableMfa();
      expect(user.mfaEnabled).toBe(false);
    });
  });
});
