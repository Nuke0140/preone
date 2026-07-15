/**
 * Unit tests for Identity Integration Events (BTD §14).
 *
 * Verifies:
 *   - Translation functions produce correct envelopes
 *   - All envelopes include required fields per BTD §13.3
 *   - Schema version is "v1"
 *   - Event names follow .v1 suffix convention
 */
import { describe, it, expect } from 'vitest';

import {
  toUserOnboardedV1, toSchoolActivatedV1, toUserRolesChangedV1, toUserSuspendedV1,
  INTEGRATION_EVENT_STREAM,
  type IntegrationEventEnvelope,
} from '@modules/identity/domain/events/identity-events';
import { UserCreatedEvent, UserRolesChangedEvent, UserSuspendedEvent } from '@modules/identity/domain/aggregates/user.aggregate';
import { SchoolActivatedEvent } from '@modules/identity/domain/aggregates/school.aggregate';

describe('Identity Integration Events — BTD §14', () => {
  describe('Constants', () => {
    it('should define a Redis Stream name', () => {
      expect(INTEGRATION_EVENT_STREAM).toBe('preone:integration-events');
    });
  });

  describe('toUserOnboardedV1()', () => {
    it('should produce a correctly-shaped envelope', () => {
      const evt = new UserCreatedEvent({
        userId: 'user-001',
        tenantId: 'sch-001',
        email: 'priya@school.com',
        roles: ['SCHOOL_ADMIN'],
        createdBy: 'admin-001',
      });

      const env = toUserOnboardedV1(evt);

      expect(env.eventType).toBe('UserOnboarded.v1');
      expect(env.schemaVersion).toBe('v1');
      expect(env.aggregateId).toBe('user-001');
      expect(env.aggregateType).toBe('User');
      expect(env.tenantId).toBe('sch-001');
      expect(env.userId).toBe('admin-001');
      expect(env.payload).toEqual({
        userId: 'user-001',
        email: 'priya@school.com',
        roles: ['SCHOOL_ADMIN'],
        createdBy: 'admin-001',
      });
    });

    it('should preserve eventId + occurredAt from domain event', () => {
      const evt = new UserCreatedEvent({
        userId: 'u1', tenantId: 't1', email: 'a@b.com', roles: [], createdBy: 'c1',
      });
      const env = toUserOnboardedV1(evt);
      expect(env.eventId).toBe(evt.eventId);
      expect(env.occurredAt).toBe(evt.occurredAt);
    });
  });

  describe('toSchoolActivatedV1()', () => {
    it('should produce a correctly-shaped envelope', () => {
      const evt = new SchoolActivatedEvent({
        schoolId: 'sch-001', activatedAt: '2026-07-15T00:00:00.000Z',
      });
      const env = toSchoolActivatedV1(evt, 'sch-001', 'platform-admin-001');

      expect(env.eventType).toBe('SchoolActivated.v1');
      expect(env.schemaVersion).toBe('v1');
      expect(env.aggregateType).toBe('School');
      expect(env.aggregateId).toBe('sch-001');
      expect(env.tenantId).toBe('sch-001');
      expect(env.userId).toBe('platform-admin-001');
      expect(env.payload).toEqual({
        schoolId: 'sch-001',
        activatedAt: '2026-07-15T00:00:00.000Z',
      });
    });
  });

  describe('toUserRolesChangedV1()', () => {
    it('should produce a correctly-shaped envelope with role diff', () => {
      const evt = new UserRolesChangedEvent({
        userId: 'u1', oldRoles: ['SCHOOL_ADMIN'], newRoles: ['PRINCIPAL'], newPermissionsVersion: 2,
      });
      const env = toUserRolesChangedV1(evt, 'sch-001', 'admin-001');

      expect(env.eventType).toBe('UserRolesChanged.v1');
      expect(env.payload).toEqual({
        userId: 'u1',
        oldRoles: ['SCHOOL_ADMIN'],
        newRoles: ['PRINCIPAL'],
        newPermissionsVersion: 2,
      });
    });
  });

  describe('toUserSuspendedV1()', () => {
    it('should produce a correctly-shaped envelope with reason', () => {
      const evt = new UserSuspendedEvent({
        userId: 'u1', reason: 'Policy violation', suspendedAt: '2026-07-15T00:00:00.000Z',
      });
      const env = toUserSuspendedV1(evt, 'sch-001', 'admin-001');

      expect(env.eventType).toBe('UserSuspended.v1');
      expect(env.payload).toEqual({
        userId: 'u1',
        reason: 'Policy violation',
        suspendedAt: '2026-07-15T00:00:00.000Z',
      });
    });
  });

  describe('BTD §13.3 schema rules', () => {
    it('all envelopes should include required fields', () => {
      const evt = new UserCreatedEvent({
        userId: 'u1', tenantId: 't1', email: 'a@b.com', roles: [], createdBy: 'c1',
      });
      const env: IntegrationEventEnvelope = toUserOnboardedV1(evt);

      // Per BTD §13.3: eventId, occurredAt, tenantId, userId, aggregateId, version
      expect(env.eventId).toBeTruthy();
      expect(env.occurredAt).toBeTruthy();
      expect(env.schemaVersion).toBeTruthy();
      expect(env.eventType).toBeTruthy();
      expect(env.aggregateId).toBeTruthy();
      expect(env.aggregateType).toBeTruthy();
    });

    it('all event types should follow past-tense + .v1 suffix convention', () => {
      const cases = [
        { evt: new UserCreatedEvent({ userId: 'u1', tenantId: 't1', email: 'a@b.com', roles: [], createdBy: 'c1' }), translator: toUserOnboardedV1, expected: 'UserOnboarded.v1' },
        { evt: new UserSuspendedEvent({ userId: 'u1', reason: 'x', suspendedAt: '2026-07-15T00:00:00.000Z' }), translator: (e: any) => toUserSuspendedV1(e, 't1', 'a1'), expected: 'UserSuspended.v1' },
      ];
      for (const c of cases) {
        const env = c.translator(c.evt as any);
        expect(env.eventType).toBe(c.expected);
        expect(env.eventType.endsWith('.v1')).toBe(true);
      }
    });
  });
});
