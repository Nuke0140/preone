/**
 * Wave 13 — SubscriptionAggregate unit tests.
 *
 * Covers R-PLT-002 (7-day grace), R-PLT-005 (seat allocation),
 * R-PLT-010 (30-day retention).
 */
import { describe, it, expect } from 'vitest';

import { SubscriptionAggregate } from '../domain/aggregates/subscription.aggregate';

describe('SubscriptionAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    plan: 'GROWTH' as const,
    trialStartsAt: '2026-01-01T00:00:00Z',
    trialEndsAt: '2026-01-15T00:00:00Z',
  };

  describe('create', () => {
    it('should create in TRIAL status with SubscriptionCreatedEvent', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(s.status).toBe('TRIAL');
      expect(s.plan).toBe('GROWTH');
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionCreatedEvent')).toBe(true);
    });

    it('should apply plan default seat caps', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(s.studentCap).toBe(800); // GROWTH default
      expect(s.staffCap).toBe(50);
    });

    it('should reject missing trialEndsAt', () => {
      expect(() => SubscriptionAggregate.create({
        tenantId: 't1', plan: 'GROWTH' as const, trialStartsAt: '2026-01-01T00:00:00Z',
      } as any)).toThrow('trialEndsAt is required');
    });

    it('should reject trialEndsAt <= trialStartsAt', () => {
      expect(() => SubscriptionAggregate.create({
        ...baseProps, trialEndsAt: '2025-12-31T00:00:00Z',
      })).toThrow('trialEndsAt must be after trialStartsAt');
    });

    it('should accept STARTER plan with 200 student cap', () => {
      const s = SubscriptionAggregate.create({ ...baseProps, plan: 'STARTER' });
      expect(s.studentCap).toBe(200);
      expect(s.staffCap).toBe(15);
    });

    it('should accept ENTERPRISE plan with 10000 student cap', () => {
      const s = SubscriptionAggregate.create({ ...baseProps, plan: 'ENTERPRISE' });
      expect(s.studentCap).toBe(10000);
      expect(s.staffCap).toBe(500);
    });
  });

  describe('activate', () => {
    it('should activate from TRIAL', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      expect(s.status).toBe('ACTIVE');
      expect(s.currentPeriodEndsAt).toBe('2026-02-10T00:00:00Z');
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionActivatedEvent')).toBe(true);
    });

    it('should reject activation with end <= start', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(() => s.activate('2026-01-10T00:00:00Z', '2026-01-09T00:00:00Z'))
        .toThrow('currentPeriodEndsAt must be after');
    });

    it('should not activate an already-ACTIVE subscription', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      expect(() => s.activate('2026-02-10T00:00:00Z', '2026-03-10T00:00:00Z'))
        .toThrow('Cannot activate ACTIVE');
    });
  });

  describe('grace period (R-PLT-002)', () => {
    it('should enter GRACE period from ACTIVE', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.enterGracePeriod('2026-02-10T00:00:00Z');
      expect(s.status).toBe('GRACE');
      // gracePeriodEndsAt = enteredAt + 7 days
      expect(s.gracePeriodEndsAt).toBe('2026-02-17T00:00:00.000Z');
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionGracePeriodEnteredEvent')).toBe(true);
    });

    it('should not enter grace from TRIAL', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(() => s.enterGracePeriod('2026-01-16T00:00:00Z')).toThrow('Cannot enter grace from TRIAL');
    });
  });

  describe('suspend', () => {
    it('should suspend from GRACE', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.enterGracePeriod('2026-02-10T00:00:00Z');
      s.suspend('Unpaid invoice', '2026-02-18T00:00:00Z');
      expect(s.status).toBe('SUSPENDED');
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionSuspendedEvent')).toBe(true);
    });

    it('should suspend from ACTIVE directly', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.suspend('Policy violation', '2026-01-20T00:00:00Z');
      expect(s.status).toBe('SUSPENDED');
    });

    it('should require a reason', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      expect(() => s.suspend('   ', '2026-01-20T00:00:00Z')).toThrow('reason is required');
    });

    it('should not suspend TRIAL', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(() => s.suspend('x', '2026-01-20T00:00:00Z')).toThrow('Cannot suspend TRIAL');
    });
  });

  describe('reactivate', () => {
    it('should reactivate a SUSPENDED subscription', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.suspend('Unpaid', '2026-02-18T00:00:00Z');
      s.reactivate('2026-02-20T00:00:00Z', '2026-03-20T00:00:00Z');
      expect(s.status).toBe('ACTIVE');
      expect(s.currentPeriodEndsAt).toBe('2026-03-20T00:00:00Z');
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionReactivatedEvent')).toBe(true);
    });

    it('should not reactivate ACTIVE', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      expect(() => s.reactivate('2026-02-20T00:00:00Z', '2026-03-20T00:00:00Z'))
        .toThrow('Cannot reactivate ACTIVE');
    });
  });

  describe('cancel (R-PLT-010 — 30-day retention)', () => {
    it('should cancel ACTIVE and set 30-day retention', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.cancel('Customer request', '2026-01-20T00:00:00Z');
      expect(s.status).toBe('CANCELLED');
      expect(s.isTerminal).toBe(true);
      expect(s.retentionEndsAt).toBe('2026-02-19T00:00:00.000Z'); // +30 days
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionCancelledEvent')).toBe(true);
    });

    it('should cancel TRIAL without retention', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.cancel('Trial abandoned', '2026-01-20T00:00:00Z');
      expect(s.retentionEndsAt).toBeUndefined();
    });

    it('should not cancel twice', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.cancel('x', '2026-01-20T00:00:00Z');
      expect(() => s.cancel('x', '2026-01-21T00:00:00Z')).toThrow('already CANCELLED');
    });
  });

  describe('isWithinRetention', () => {
    it('should return true within retention window', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      s.cancel('x', '2026-01-20T00:00:00Z');
      expect(s.isWithinRetention('2026-02-01T00:00:00Z')).toBe(true);
      expect(s.isWithinRetention('2026-03-01T00:00:00Z')).toBe(false);
    });
  });

  describe('isTrialExpired', () => {
    it('should return true after trialEndsAt for TRIAL subscription', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(s.isTrialExpired('2026-01-16T00:00:00Z')).toBe(true);
      expect(s.isTrialExpired('2026-01-10T00:00:00Z')).toBe(false);
    });

    it('should return false for non-TRIAL subscription', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.activate('2026-01-10T00:00:00Z', '2026-02-10T00:00:00Z');
      expect(s.isTrialExpired('2026-06-01T00:00:00Z')).toBe(false);
    });
  });

  describe('changeSeatAllocation (R-PLT-005)', () => {
    it('should change student + staff caps', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.changeSeatAllocation(1500, 80, 'u-admin');
      expect(s.studentCap).toBe(1500);
      expect(s.staffCap).toBe(80);
      expect(s.domainEvents.some(e => e.eventType === 'SubscriptionSeatAllocationChangedEvent')).toBe(true);
    });

    it('should reject zero caps', () => {
      const s = SubscriptionAggregate.create(baseProps);
      expect(() => s.changeSeatAllocation(0, 80, 'u-admin')).toThrow('must be > 0');
      expect(() => s.changeSeatAllocation(100, 0, 'u-admin')).toThrow('must be > 0');
    });

    it('should be idempotent (no event when unchanged)', () => {
      const s = SubscriptionAggregate.create(baseProps);
      const before = s.domainEvents.length;
      s.changeSeatAllocation(800, 50, 'u-admin'); // GROWTH defaults
      expect(s.domainEvents.length).toBe(before);
    });

    it('should not change caps on CANCELLED subscription', () => {
      const s = SubscriptionAggregate.create(baseProps);
      s.cancel('x', '2026-01-20T00:00:00Z');
      expect(() => s.changeSeatAllocation(1500, 80, 'u-admin')).toThrow('CANCELLED');
    });
  });
});
