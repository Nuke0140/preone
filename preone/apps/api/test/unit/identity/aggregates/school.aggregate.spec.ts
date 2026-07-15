/**
 * Unit tests for SchoolAggregate — pure domain logic.
 */
import { describe, it, expect } from 'vitest';
import { SchoolAggregate, type SchoolProps } from '@modules/identity/domain/aggregates/school.aggregate';

function baseProps(overrides: Partial<SchoolProps> = {}): SchoolProps {
  return {
    name: 'Little Stars Preschool',
    email: 'owner@littlestars.in',
    phone: '+919876543210',
    tier: 'STARTER',
    status: 'PROSPECT',
    branchCount: 0,
    maxBranches: 1,
    studentSeats: 100,
    usedSeats: 0,
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    ...overrides,
  };
}

// Helper to construct a SchoolAggregate with explicit state (bypassing factory
// which always resets branchCount=0 + usedSeats=0)
function constructSchool(props: SchoolProps): SchoolAggregate {
  return new SchoolAggregate(props, undefined, 1);
}

describe('SchoolAggregate', () => {
  describe('create()', () => {
    it('should create school with PROSPECT status + 0 branches/seats', () => {
      const school = SchoolAggregate.create({
        name: 'Little Stars',
        email: 'owner@littlestars.in',
        phone: '+919876543210',
        tier: 'STARTER',
      }, 'admin-001');

      expect(school.id).toBeDefined();
      expect(school.status).toBe('PROSPECT');
      expect(school.branchCount).toBe(0);
      expect(school.usedSeats).toBe(0);
      expect(school.tier).toBe('STARTER');
    });

    it('should raise SchoolCreatedEvent', () => {
      const school = SchoolAggregate.create({
        name: 'Little Stars',
        email: 'owner@littlestars.in',
        phone: '+919876543210',
        tier: 'STARTER',
      }, 'admin-001');
      expect(school.domainEvents).toHaveLength(1);
      expect(school.domainEvents[0].eventType).toBe('SchoolCreatedEvent');
    });
  });

  describe('startTrial()', () => {
    it('should transition PROSPECT → TRIAL', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
      }, 'admin-001');
      const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString();
      school.startTrial(trialEnd);
      expect(school.status).toBe('TRIAL');
      expect(school.trialEndsAt).toBe(trialEnd);
      expect(school.isTrial).toBe(true);
    });

    it('should throw when starting trial from non-PROSPECT status', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'ACTIVE',
      }, 'admin-001');
      expect(() => school.startTrial(new Date().toISOString())).toThrow();
    });
  });

  describe('activate()', () => {
    it('should transition TRIAL → ACTIVE + raise event', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'TRIAL',
      }, 'admin-001');
      school.clearDomainEvents();
      const now = new Date().toISOString();
      school.activate(now);
      expect(school.status).toBe('ACTIVE');
      expect(school.activatedAt).toBe(now);
      expect(school.domainEvents[0].eventType).toBe('SchoolActivatedEvent');
    });

    it('should throw when activating from CANCELLED', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'CANCELLED',
      }, 'admin-001');
      expect(() => school.activate(new Date().toISOString())).toThrow();
    });
  });

  describe('suspend() / reactivate()', () => {
    it('should suspend ACTIVE school + raise event with reason', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'ACTIVE',
      }, 'admin-001');
      school.clearDomainEvents();
      school.suspend('Payment overdue', new Date().toISOString());
      expect(school.status).toBe('SUSPENDED');
      expect(school.suspendedAt).toBeDefined();
      const evt = school.domainEvents[0];
      expect(evt.eventType).toBe('SchoolSuspendedEvent');
      expect((evt.payload as any).reason).toBe('Payment overdue');
    });

    it('should reactivate SUSPENDED → ACTIVE', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'SUSPENDED',
      }, 'admin-001');
      school.reactivate(new Date().toISOString());
      expect(school.status).toBe('ACTIVE');
      expect(school.suspendedAt).toBeUndefined();
    });
  });

  describe('cancel()', () => {
    it('should transition to CANCELLED + raise event', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'ACTIVE',
      }, 'admin-001');
      school.clearDomainEvents();
      const now = new Date().toISOString();
      school.cancel(now);
      expect(school.status).toBe('CANCELLED');
      expect(school.cancelledAt).toBe(now);
      expect(school.domainEvents[0].eventType).toBe('SchoolCancelledEvent');
    });

    it('should be a no-op when already CANCELLED', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
        status: 'CANCELLED',
      }, 'admin-001');
      school.clearDomainEvents();
      school.cancel(new Date().toISOString());
      expect(school.domainEvents).toHaveLength(0);
    });
  });

  describe('branch + seat management', () => {
    it('canAddBranch() should respect maxBranches cap', () => {
      const school = constructSchool(baseProps({ branchCount: 0, maxBranches: 1 }));
      expect(school.canAddBranch()).toBe(true);
      school.incrementBranchCount();
      expect(school.canAddBranch()).toBe(false);
      expect(() => school.incrementBranchCount()).toThrow(/Max branches/);
    });

    it('canAddStudent() requires ACTIVE status + available seats', () => {
      const school = constructSchool(baseProps({ status: 'PROSPECT' }));
      expect(school.canAddStudent()).toBe(false); // PROSPECT
      school.startTrial(new Date().toISOString());
      expect(school.canAddStudent()).toBe(false); // TRIAL
      school.activate(new Date().toISOString());
      expect(school.canAddStudent()).toBe(true);
      school.incrementUsedSeats();
      school.decrementUsedSeats();
      expect(school.usedSeats).toBe(0);
    });

    it('should not decrement below 0', () => {
      const school = constructSchool(baseProps());
      school.decrementUsedSeats();
      expect(school.usedSeats).toBe(0);
    });
  });

  describe('upgradeTier()', () => {
    it('should update tier + limits', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
      }, 'admin-001');
      school.upgradeTier('GROWTH', 3, 500);
      expect(school.tier).toBe('GROWTH');
      expect(school.maxBranches).toBe(3);
      expect(school.studentSeats).toBe(500);
    });
  });

  describe('updateProfile()', () => {
    it('should update only provided fields + raise event', () => {
      const school = SchoolAggregate.create({
        name: 'Test', email: 'a@b.in', phone: '+919876543210', tier: 'STARTER',
      }, 'admin-001');
      school.clearDomainEvents();
      school.updateProfile({ name: 'New Name', website: 'https://new.in' });
      expect(school.name).toBe('New Name');
      expect(school.website).toBe('https://new.in');
      expect(school.domainEvents).toHaveLength(1);
      expect(school.domainEvents[0].eventType).toBe('SchoolUpdatedEvent');
      expect((school.domainEvents[0].payload as any).fields).toContain('name');
      expect((school.domainEvents[0].payload as any).fields).toContain('website');
    });
  });

  describe('seatsAvailable', () => {
    it('should return 0 when used >= seats', () => {
      const school = constructSchool(baseProps({ studentSeats: 5, usedSeats: 5 }));
      expect(school.seatsAvailable).toBe(0);
    });

    it('should never return negative', () => {
      const school = constructSchool(baseProps({ studentSeats: 5, usedSeats: 10 }));
      expect(school.seatsAvailable).toBe(0);
    });
  });
});
