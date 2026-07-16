/**
 * Wave 13 — BreachNotificationAggregate unit tests.
 *
 * Covers R-DAT-010 / R-CMP-008 — 72-hour MeitY notification.
 */
import { describe, it, expect } from 'vitest';

import { BreachNotificationAggregate } from '../domain/aggregates/breach-notification.aggregate';

describe('BreachNotificationAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    severity: 'HIGH' as const,
    detectedAt: '2026-01-01T00:00:00Z',
    detectedBy: 'soc-bot',
    description: 'Unauthorized DB access from anomalous IP',
    affectedRecordsEstimate: 1500,
  };

  describe('create', () => {
    it('should create in DETECTED status with BreachDetectedEvent', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      expect(b.status).toBe('DETECTED');
      expect(b.severity).toBe('HIGH');
      expect(b.domainEvents.some(e => e.eventType === 'BreachDetectedEvent')).toBe(true);
    });

    it('should reject empty description', () => {
      expect(() => BreachNotificationAggregate.create({ ...baseProps, description: '  ' }))
        .toThrow('description is required');
    });

    it('should reject zero affectedRecordsEstimate', () => {
      expect(() => BreachNotificationAggregate.create({ ...baseProps, affectedRecordsEstimate: 0 }))
        .toThrow('affectedRecordsEstimate must be > 0');
    });

    it('should accept all severity levels', () => {
      const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
      for (const s of levels) {
        const b = BreachNotificationAggregate.create({ ...baseProps, severity: s });
        expect(b.severity).toBe(s);
      }
    });
  });

  describe('assess', () => {
    it('should assess as reportable and move to ASSESSED', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      expect(b.status).toBe('ASSESSED');
      expect(b.isReportable).toBe(true);
      expect(b.domainEvents.some(e => e.eventType === 'BreachAssessedEvent')).toBe(true);
    });

    it('should assess as non-reportable and go directly to NOT_REPORTABLE_CLOSED', () => {
      const b = BreachNotificationAggregate.create({
        ...baseProps, severity: 'LOW', affectedRecordsEstimate: 10,
      });
      b.assess('u-dpo', '2026-01-01T02:00:00Z', false, 8);
      expect(b.status).toBe('NOT_REPORTABLE_CLOSED');
      expect(b.isTerminal).toBe(true);
    });

    it('should not assess an ASSESSED breach', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      expect(() => b.assess('u-dpo', '2026-01-01T03:00:00Z', true, 1450))
        .toThrow('Cannot assess ASSESSED');
    });
  });

  describe('notify (72h rule)', () => {
    it('should notify MeitY within 72h', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      // detectedAt = 2026-01-01T00:00:00Z, sentAt = +50h
      b.notify('MEITY', '2026-01-03T02:00:00Z');
      expect(b.status).toBe('NOTIFIED');
      expect(b.within72h).toBe(true);
      expect(b.domainEvents.some(e => e.eventType === 'BreachNotificationSentEvent')).toBe(true);
    });

    it('should flag within72h=false when notification > 72h after detection', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      // detectedAt = 2026-01-01T00:00:00Z, sentAt = +80h → 2026-01-04T08:00:00Z
      b.notify('MEITY', '2026-01-04T08:00:00Z');
      expect(b.within72h).toBe(false);
    });

    it('should notify BOTH MeitY + affected users', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('BOTH', '2026-01-02T00:00:00Z');
      expect(b.status).toBe('NOTIFIED');
    });

    it('should not notify without assessment', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      expect(() => b.notify('MEITY', '2026-01-02T00:00:00Z'))
        .toThrow('Cannot notify from DETECTED');
    });

    it('should not notify a non-reportable breach', () => {
      const b = BreachNotificationAggregate.create({
        ...baseProps, affectedRecordsEstimate: 5,
      });
      b.assess('u-dpo', '2026-01-01T02:00:00Z', false, 5);
      // status is now NOT_REPORTABLE_CLOSED — notify should be impossible
      expect(() => b.notify('MEITY', '2026-01-02T00:00:00Z'))
        .toThrow('Cannot notify from NOT_REPORTABLE_CLOSED');
    });
  });

  describe('close', () => {
    it('should close a NOTIFIED breach with rootCause + remediation', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('BOTH', '2026-01-02T00:00:00Z');
      b.close('u-dpo', '2026-01-15T00:00:00Z', 'Stolen credentials', 'MFA enforcement + password reset');
      expect(b.status).toBe('CLOSED');
      expect(b.isTerminal).toBe(true);
      expect(b.domainEvents.some(e => e.eventType === 'BreachClosedEvent')).toBe(true);
    });

    it('should not close an ASSESSED (reportable) breach without notification', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      expect(() => b.close('u-dpo', '2026-01-15T00:00:00Z', 'x', 'y'))
        .toThrow('must be NOTIFIED before closing');
    });

    it('should require rootCause', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('MEITY', '2026-01-02T00:00:00Z');
      expect(() => b.close('u-dpo', '2026-01-15T00:00:00Z', '', 'y'))
        .toThrow('rootCause is required');
    });

    it('should require remediation', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('MEITY', '2026-01-02T00:00:00Z');
      expect(() => b.close('u-dpo', '2026-01-15T00:00:00Z', 'x', ''))
        .toThrow('remediation is required');
    });

    it('should not close twice', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('MEITY', '2026-01-02T00:00:00Z');
      b.close('u-dpo', '2026-01-15T00:00:00Z', 'x', 'y');
      expect(() => b.close('u-dpo', '2026-01-16T00:00:00Z', 'x', 'y'))
        .toThrow('Cannot close CLOSED');
    });
  });

  describe('isOverdueForNotification', () => {
    it('should return true 73h after detection (still in ASSESSED)', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      // detectedAt + 73h = 2026-01-04T01:00:00Z
      expect(b.isOverdueForNotification('2026-01-04T01:00:00Z')).toBe(true);
    });

    it('should return false within 72h', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      expect(b.isOverdueForNotification('2026-01-02T00:00:00Z')).toBe(false);
    });

    it('should return false after notification sent', () => {
      const b = BreachNotificationAggregate.create(baseProps);
      b.assess('u-dpo', '2026-01-01T02:00:00Z', true, 1450);
      b.notify('MEITY', '2026-01-02T00:00:00Z');
      expect(b.isOverdueForNotification('2026-01-10T00:00:00Z')).toBe(false);
    });
  });
});
