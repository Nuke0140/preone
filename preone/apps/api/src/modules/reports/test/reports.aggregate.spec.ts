/**
 * Reports Aggregate Unit Tests.
 */
import { describe, it, expect } from 'vitest';

import { ReportExecutionAggregate } from '../domain/aggregates/report-execution.aggregate';

describe('ReportExecutionAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    reportDefId: 'rd1',
    requestedById: 'u1',
    format: 'PDF' as const,
    parameters: { academicSessionId: 'as1' },
  };

  it('should create in QUEUED status with ReportExecutionQueuedEvent', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    expect(e.status).toBe('QUEUED');
    expect(e.domainEvents.some(e => e.eventType === 'ReportExecutionQueuedEvent')).toBe(true);
  });

  it('should start a QUEUED execution', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.start('2025-01-01T10:00:00Z');
    expect(e.status).toBe('RUNNING');
    expect(e.domainEvents.some(ev => ev.eventType === 'ReportExecutionStartedEvent')).toBe(true);
  });

  it('should complete with resultUrl + duration', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.start('2025-01-01T10:00:00Z');
    e.complete('2025-01-01T10:00:30Z', 'https://s3/report.pdf', 500, 102400);
    expect(e.status).toBe('COMPLETED');
    expect(e.resultUrl).toBe('https://s3/report.pdf');
    expect(e.durationMs).toBe(30000);
    expect(e.rowCount).toBe(500);
    expect(e.domainEvents.some(ev => ev.eventType === 'ReportExecutionCompletedEvent')).toBe(true);
  });

  it('should fail with error message', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.start('2025-01-01T10:00:00Z');
    e.fail('DB timeout', '2025-01-01T10:00:10Z');
    expect(e.status).toBe('FAILED');
    expect(e.domainEvents.some(ev => ev.eventType === 'ReportExecutionFailedEvent')).toBe(true);
  });

  it('should reject failure without error message', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.start('2025-01-01T10:00:00Z');
    expect(() => e.fail('', '2025-01-01T10:00:10Z')).toThrow('errorMessage');
  });

  it('should cancel a QUEUED execution', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.cancel();
    expect(e.status).toBe('CANCELLED');
    expect(e.domainEvents.some(ev => ev.eventType === 'ReportExecutionCancelledEvent')).toBe(true);
  });

  it('should not cancel a terminal execution', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.cancel();
    expect(() => e.cancel()).toThrow('Cannot cancel CANCELLED');
  });

  it('should not start a non-QUEUED execution', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    e.start('2025-01-01T10:00:00Z');
    expect(() => e.start('2025-01-01T10:01:00Z')).toThrow('Cannot start RUNNING');
  });

  it('should not complete a non-RUNNING execution', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    expect(() => e.complete('2025-01-01T10:00:00Z', 'url')).toThrow('Cannot complete QUEUED');
  });

  it('isTerminal should return true for terminal statuses', () => {
    const e = ReportExecutionAggregate.create(baseProps);
    expect(e.isTerminal).toBe(false);
    e.cancel();
    expect(e.isTerminal).toBe(true);
  });
});
