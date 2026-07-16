/**
 * Wave 13 — FeatureFlagAggregate unit tests.
 */
import { describe, it, expect } from 'vitest';

import { FeatureFlagAggregate } from '../domain/aggregates/feature-flag.aggregate';

describe('FeatureFlagAggregate', () => {
  describe('create — PLATFORM scope', () => {
    it('should create a PLATFORM-scope flag', () => {
      const f = FeatureFlagAggregate.create({
        key: 'NEW_BILLING_UI',
        scope: 'PLATFORM',
        enabled: false,
        rolloutPercentage: 0,
      });
      expect(f.status).toBe('ACTIVE');
      expect(f.enabled).toBe(false);
      expect(f.domainEvents.some(e => e.eventType === 'FeatureFlagCreatedEvent')).toBe(true);
    });

    it('should reject PLATFORM scope with tenantId', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'NEW_BILLING_UI',
        scope: 'PLATFORM',
        enabled: false,
        rolloutPercentage: 0,
        tenantId: 't1',
      })).toThrow('PLATFORM scope must not have tenantId');
    });
  });

  describe('create — TENANT scope', () => {
    it('should create a TENANT-scope flag with tenantId', () => {
      const f = FeatureFlagAggregate.create({
        key: 'BULK_ATTENDANCE',
        scope: 'TENANT',
        tenantId: 't1',
        enabled: true,
        rolloutPercentage: 50,
      });
      expect(f.scope).toBe('TENANT');
      expect(f.tenantId).toBe('t1');
    });

    it('should reject TENANT scope without tenantId', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'BULK_ATTENDANCE',
        scope: 'TENANT',
        enabled: true,
        rolloutPercentage: 50,
      })).toThrow('TENANT scope requires tenantId');
    });
  });

  describe('create — USER scope', () => {
    it('should create a USER-scope flag with userId + tenantId', () => {
      const f = FeatureFlagAggregate.create({
        key: 'EXPERIMENTAL_DASHBOARD',
        scope: 'USER',
        tenantId: 't1',
        userId: 'u1',
        enabled: true,
        rolloutPercentage: 100,
      });
      expect(f.scope).toBe('USER');
      expect(f.userId).toBe('u1');
    });

    it('should reject USER scope without userId', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'EXPERIMENTAL_DASHBOARD',
        scope: 'USER',
        tenantId: 't1',
        enabled: true,
        rolloutPercentage: 100,
      })).toThrow('USER scope requires userId');
    });
  });

  describe('key validation', () => {
    it('should accept UPPER_SNAKE_CASE keys', () => {
      const cases = ['NEW_FLAG', 'A', 'A_B_C', 'FLAG_1', 'X_2_Y'];
      for (const key of cases) {
        const f = FeatureFlagAggregate.create({
          key, scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 0,
        });
        expect(f.key).toBe(key);
      }
    });

    it('should reject lowercase keys', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'lowercase_key', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 0,
      })).toThrow('Invalid flag key');
    });

    it('should reject keys with spaces', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'HAS SPACE', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 0,
      })).toThrow('Invalid flag key');
    });
  });

  describe('rollout validation', () => {
    it('should reject negative rollout', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: -1,
      })).toThrow('0..100');
    });

    it('should reject rollout > 100', () => {
      expect(() => FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 101,
      })).toThrow('0..100');
    });
  });

  describe('setValue', () => {
    it('should flip enabled and emit FeatureFlagValueChangedEvent', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 100,
      });
      f.setValue(true, 'u-admin');
      expect(f.enabled).toBe(true);
      expect(f.domainEvents.some(e => e.eventType === 'FeatureFlagValueChangedEvent')).toBe(true);
    });

    it('should be idempotent (no event when value unchanged)', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 100,
      });
      const eventsBefore = f.domainEvents.length;
      f.setValue(false, 'u-admin');
      expect(f.domainEvents.length).toBe(eventsBefore);
    });

    it('should not modify ARCHIVED flag', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 100,
      });
      f.archive('u-admin', '2026-01-01T00:00:00Z');
      expect(() => f.setValue(true, 'u-admin')).toThrow('ARCHIVED');
    });
  });

  describe('setRollout', () => {
    it('should update rollout percentage', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 0,
      });
      f.setRollout(50);
      expect(f.rolloutPercentage).toBe(50);
      expect(f.domainEvents.some(e => e.eventType === 'FeatureFlagRolloutChangedEvent')).toBe(true);
    });

    it('should reject rollout > 100 on update', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 0,
      });
      expect(() => f.setRollout(150)).toThrow('0..100');
    });
  });

  describe('evaluate', () => {
    it('should return false when disabled', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: false, rolloutPercentage: 100,
      });
      expect(f.evaluate(99)).toBe(false);
    });

    it('should return true when enabled + 100% rollout', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 100,
      });
      expect(f.evaluate(0)).toBe(true);
      expect(f.evaluate(99)).toBe(true);
    });

    it('should return false when enabled + 0% rollout', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 0,
      });
      expect(f.evaluate(50)).toBe(false);
    });

    it('should bucket correctly for 25% rollout', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 25,
      });
      expect(f.evaluate(0)).toBe(true);
      expect(f.evaluate(24)).toBe(true);
      expect(f.evaluate(25)).toBe(false);
      expect(f.evaluate(99)).toBe(false);
    });
  });

  describe('archive', () => {
    it('should archive an ACTIVE flag', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 100,
      });
      f.archive('u-admin', '2026-01-01T00:00:00Z');
      expect(f.status).toBe('ARCHIVED');
      expect(f.isTerminal).toBe(true);
      expect(f.domainEvents.some(e => e.eventType === 'FeatureFlagArchivedEvent')).toBe(true);
    });

    it('should not archive twice', () => {
      const f = FeatureFlagAggregate.create({
        key: 'X', scope: 'PLATFORM' as const, enabled: true, rolloutPercentage: 100,
      });
      f.archive('u-admin', '2026-01-01T00:00:00Z');
      expect(() => f.archive('u-admin', '2026-01-02T00:00:00Z')).toThrow('already ARCHIVED');
    });
  });
});
