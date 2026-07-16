/**
 * Wave 13 — ScheduledReportAggregate unit tests.
 */
import { describe, it, expect } from 'vitest';

import { ScheduledReportAggregate } from '../domain/aggregates/scheduled-report.aggregate';

describe('ScheduledReportAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    branchId: 'b1',
    definitionId: 'rd1',
    ownerId: 'u1',
    cronExpression: '0 9 * * 1', // every Monday 09:00
    format: 'PDF' as const,
    parameters: { academicSessionId: 'as1' },
    recipientUserIds: ['u1', 'u2'],
    nextRunAt: '2026-01-06T09:00:00Z',
  };

  describe('create', () => {
    it('should create in ACTIVE status with ScheduledReportCreatedEvent', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      expect(s.status).toBe('ACTIVE');
      expect(s.runCount).toBe(0);
      expect(s.failureCount).toBe(0);
      expect(s.domainEvents.some(e => e.eventType === 'ScheduledReportCreatedEvent')).toBe(true);
    });

    it('should reject invalid cron expression', () => {
      expect(() => ScheduledReportAggregate.create({ ...baseProps, cronExpression: 'not a cron' }))
        .toThrow('Invalid cronExpression');
    });

    it('should reject empty recipientUserIds', () => {
      expect(() => ScheduledReportAggregate.create({ ...baseProps, recipientUserIds: [] }))
        .toThrow('recipientUserId');
    });

    it('should accept 5-field POSIX cron', () => {
      const cases = ['0 9 * * 1', '*/5 * * * *', '0 0 1 * *', '30 8 1 1 *', '0 18 * * 5'];
      for (const c of cases) {
        const s = ScheduledReportAggregate.create({ ...baseProps, cronExpression: c });
        expect(s.cronExpression).toBe(c);
      }
    });

    it('should reject 6-field cron (with seconds)', () => {
      expect(() => ScheduledReportAggregate.create({ ...baseProps, cronExpression: '0 0 9 * * 1' }))
        .toThrow('Invalid cronExpression');
    });
  });

  describe('pause / resume', () => {
    it('should pause an ACTIVE schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.pause('u1');
      expect(s.status).toBe('PAUSED');
      expect(s.domainEvents.some(e => e.eventType === 'ScheduledReportPausedEvent')).toBe(true);
    });

    it('should not pause a PAUSED schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.pause('u1');
      expect(() => s.pause('u1')).toThrow('Cannot pause PAUSED');
    });

    it('should resume a PAUSED schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.pause('u1');
      s.resume('u1', '2026-01-08T09:00:00Z');
      expect(s.status).toBe('ACTIVE');
      expect(s.nextRunAt).toBe('2026-01-08T09:00:00Z');
      expect(s.domainEvents.some(e => e.eventType === 'ScheduledReportResumedEvent')).toBe(true);
    });

    it('should not resume an ACTIVE schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      expect(() => s.resume('u1', '2026-01-08T09:00:00Z')).toThrow('Cannot resume ACTIVE');
    });
  });

  describe('trigger', () => {
    it('should increment runCount and update lastRunAt', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.trigger('exec-1', '2026-01-06T09:00:00Z', true, '2026-01-13T09:00:00Z');
      expect(s.runCount).toBe(1);
      expect(s.failureCount).toBe(0);
      expect(s.nextRunAt).toBe('2026-01-13T09:00:00Z');
      expect(s.domainEvents.some(e => e.eventType === 'ScheduledReportTriggeredEvent')).toBe(true);
    });

    it('should increment failureCount on failure', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.trigger('exec-1', '2026-01-06T09:00:00Z', false, '2026-01-13T09:00:00Z');
      expect(s.runCount).toBe(1);
      expect(s.failureCount).toBe(1);
    });

    it('should not trigger a PAUSED schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.pause('u1');
      expect(() => s.trigger('exec-1', '2026-01-06T09:00:00Z', true, '2026-01-13T09:00:00Z'))
        .toThrow('Cannot trigger PAUSED');
    });

    it('should reject nextRunAt <= triggeredAt', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      expect(() => s.trigger('exec-1', '2026-01-06T09:00:00Z', true, '2026-01-06T08:00:00Z'))
        .toThrow('nextRunAt must be after triggeredAt');
    });
  });

  describe('cancel', () => {
    it('should cancel an ACTIVE schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.cancel('u1', '2026-01-02T10:00:00Z');
      expect(s.status).toBe('CANCELLED');
      expect(s.isTerminal).toBe(true);
      expect(s.domainEvents.some(e => e.eventType === 'ScheduledReportCancelledEvent')).toBe(true);
    });

    it('should cancel a PAUSED schedule', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.pause('u1');
      s.cancel('u1', '2026-01-02T10:00:00Z');
      expect(s.status).toBe('CANCELLED');
    });

    it('should not cancel twice', () => {
      const s = ScheduledReportAggregate.create(baseProps);
      s.cancel('u1', '2026-01-02T10:00:00Z');
      expect(() => s.cancel('u1', '2026-01-03T10:00:00Z')).toThrow('already CANCELLED');
    });
  });
});
