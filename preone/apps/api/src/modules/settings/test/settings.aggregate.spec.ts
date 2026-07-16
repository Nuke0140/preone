/**
 * Settings Aggregate Unit Tests.
 */
import { describe, it, expect } from 'vitest';

import { CalendarEventAggregate } from '../domain/aggregates/calendar-event.aggregate';
import { SystemConfigAggregate } from '../domain/aggregates/system-config.aggregate';
import { UserPreferenceAggregate } from '../domain/aggregates/user-preference.aggregate';

describe('SystemConfigAggregate', () => {
  it('should create with SystemConfigSetEvent', () => {
    const c = SystemConfigAggregate.create({
      scope: 'SCHOOL',
      tenantId: 't1',
      key: 'attendance.cutoffTime',
      value: '09:30',
      isEncrypted: false,
      changedBy: 'u1',
    });
    expect(c.scope).toBe('SCHOOL');
    expect(c.value).toBe('09:30');
    expect(c.domainEvents.some(e => e.eventType === 'SystemConfigSetEvent')).toBe(true);
  });

  it('should update value with audit trail', () => {
    const c = SystemConfigAggregate.create({
      scope: 'SCHOOL',
      tenantId: 't1',
      key: 'attendance.cutoffTime',
      value: '09:30',
      isEncrypted: false,
      changedBy: 'u1',
    });
    c.update('10:00', 'u2');
    expect(c.value).toBe('10:00');
    expect(c.domainEvents.filter(e => e.eventType === 'SystemConfigSetEvent').length).toBe(2);
  });

  it('should mark as encrypted', () => {
    const c = SystemConfigAggregate.create({
      scope: 'PLATFORM',
      key: 'sms.apiKey',
      value: 'encrypted-blob',
      isEncrypted: true,
      changedBy: 'system',
    });
    expect(c.isEncrypted).toBe(true);
  });

  it('should emit SystemConfigDeletedEvent on delete', () => {
    const c = SystemConfigAggregate.create({
      scope: 'SCHOOL',
      key: 'temp.key',
      value: 'x',
      isEncrypted: false,
      changedBy: 'u1',
    });
    c.delete();
    expect(c.domainEvents.some(e => e.eventType === 'SystemConfigDeletedEvent')).toBe(true);
  });
});

describe('UserPreferenceAggregate', () => {
  it('should create with UserPreferenceSetEvent', () => {
    const p = UserPreferenceAggregate.create({
      tenantId: 't1',
      userId: 'u1',
      category: 'NOTIFICATION',
      key: 'emailDigest',
      value: { frequency: 'DAILY', enabled: true },
    });
    expect(p.category).toBe('NOTIFICATION');
    expect(p.value.frequency).toBe('DAILY');
    expect(p.domainEvents.some(e => e.eventType === 'UserPreferenceSetEvent')).toBe(true);
  });

  it('should update value', () => {
    const p = UserPreferenceAggregate.create({
      tenantId: 't1', userId: 'u1', category: 'NOTIFICATION', key: 'emailDigest',
      value: { frequency: 'DAILY' },
    });
    p.update({ frequency: 'WEEKLY' });
    expect(p.value.frequency).toBe('WEEKLY');
  });
});

describe('CalendarEventAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    title: 'Annual Day',
    type: 'EVENT' as const,
    visibility: 'PUBLIC' as const,
    startDate: '2025-12-15T10:00:00Z',
    endDate: '2025-12-15T13:00:00Z',
    isFullDay: false,
    isRecurring: false,
  };

  it('should create with CalendarEventCreatedEvent', () => {
    const e = CalendarEventAggregate.create(baseProps);
    expect(e.title).toBe('Annual Day');
    expect(e.isCancelled).toBe(false);
    expect(e.domainEvents.some(e => e.eventType === 'CalendarEventCreatedEvent')).toBe(true);
  });

  it('should reject endDate before startDate', () => {
    expect(() => CalendarEventAggregate.create({
      ...baseProps,
      startDate: '2025-12-15T13:00:00Z',
      endDate: '2025-12-15T10:00:00Z',
    })).toThrow('endDate cannot be before startDate');
  });

  it('should update event fields', () => {
    const e = CalendarEventAggregate.create(baseProps);
    e.update({ title: 'Annual Day 2025', location: 'Auditorium' });
    expect(e.title).toBe('Annual Day 2025');
    expect(e.domainEvents.some(ev => ev.eventType === 'CalendarEventUpdatedEvent')).toBe(true);
  });

  it('should cancel event', () => {
    const e = CalendarEventAggregate.create(baseProps);
    e.cancel();
    expect(e.isCancelled).toBe(true);
    expect(e.domainEvents.some(ev => ev.eventType === 'CalendarEventCancelledEvent')).toBe(true);
  });

  it('should be idempotent on cancel', () => {
    const e = CalendarEventAggregate.create(baseProps);
    e.cancel();
    e.cancel();
    expect(e.domainEvents.filter(ev => ev.eventType === 'CalendarEventCancelledEvent').length).toBe(1);
  });
});
