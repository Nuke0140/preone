/**
 * StudentAggregate unit tests — pure domain logic (no IO, no NestJS).
 *
 * Per BTD §24 — Testing Strategy:
 *   - Unit tests for aggregates: state transitions, invariants, events
 *   - Mock repositories in service tests
 *   - Integration tests with Testcontainers in e2e
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { StudentAggregate } from '../domain/aggregates/student.aggregate';

describe('StudentAggregate', () => {
  const baseProps = {
    tenantId: 'school-1',
    branchId: 'branch-1',
    admissionNumber: 'STU-2025-0001',
    legalFirstName: 'Aarav',
    legalLastName: 'Sharma',
    dateOfBirth: '2021-04-15',
    gender: 'MALE' as const,
    bloodGroup: 'O_POSITIVE' as const,
    nationality: 'Indian',
    admittedAt: '2025-04-01T00:00:00.000Z',
  };

  describe('create', () => {
    it('should create a PROSPECT student with a StudentCreatedEvent', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      expect(student.id).toBeDefined();
      expect(student.status).toBe('PROSPECT');
      expect(student.legalFirstName).toBe('Aarav');
      expect(student.displayName).toBe('Aarav Sharma');
      expect(student.ageMonths).toBeGreaterThan(0);
      expect(student.domainEvents.length).toBe(1);
      expect(student.domainEvents[0].eventType).toBe('StudentCreatedEvent');
    });

    it('should recompute ageMonths from dateOfBirth', () => {
      const student = StudentAggregate.create(
        { ...baseProps, dateOfBirth: '2020-01-01' },
        'user-1',
      );
      // Age as of ~2026 → 72+ months
      expect(student.ageMonths).toBeGreaterThanOrEqual(60);
    });

    it('should respect preferredName in displayName', () => {
      const student = StudentAggregate.create(
        { ...baseProps, preferredName: 'Aaru' },
        'user-1',
      );
      expect(student.displayName).toBe('Aaru');
    });
  });

  describe('enroll', () => {
    it('should transition PROSPECT → ACTIVE and emit StudentEnrolledEvent', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.clearDomainEvents();
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      expect(student.status).toBe('ACTIVE');
      expect(student.currentSectionId).toBe('section-1');
      expect(student.currentGradeLevel).toBe('NURSERY');
      expect(student.enrolledAt).toBe('2025-04-15T00:00:00.000Z');
      expect(student.domainEvents.length).toBe(1);
      expect(student.domainEvents[0].eventType).toBe('StudentEnrolledEvent');
    });

    it('should reject enrol of an already-ACTIVE student', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      expect(() => student.enroll('section-2', 'LKG', '2025-04-16T00:00:00.000Z'))
        .toThrow(/Cannot enrol student in status ACTIVE/);
    });
  });

  describe('promote', () => {
    it('should change section + grade and emit StudentPromotedEvent', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      student.clearDomainEvents();
      student.promote('section-2', 'LKG', '2026-04-15T00:00:00.000Z');
      expect(student.currentSectionId).toBe('section-2');
      expect(student.currentGradeLevel).toBe('LKG');
      expect(student.domainEvents[0].eventType).toBe('StudentPromotedEvent');
    });

    it('should reject promote of a non-ACTIVE student', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      expect(() => student.promote('section-2', 'LKG', '2026-04-15T00:00:00.000Z'))
        .toThrow(/Cannot promote student in status PROSPECT/);
    });
  });

  describe('withdraw + reactivate', () => {
    it('should transition ACTIVE → WITHDRAWN', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      student.clearDomainEvents();
      student.withdraw('Family moving', '2025-09-01T00:00:00.000Z');
      expect(student.status).toBe('WITHDRAWN');
      expect(student.exitReason).toBe('Family moving');
      expect(student.exitedAt).toBe('2025-09-01T00:00:00.000Z');
    });

    it('should allow WITHDRAWN → ACTIVE via reactivate', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      student.withdraw('Family moving', '2025-09-01T00:00:00.000Z');
      student.clearDomainEvents();
      student.reactivate('2025-10-01T00:00:00.000Z');
      expect(student.status).toBe('ACTIVE');
      expect(student.exitedAt).toBeUndefined();
      expect(student.exitReason).toBeUndefined();
    });
  });

  describe('graduate + transfer (terminal states)', () => {
    it('should transition ACTIVE → GRADUATED (terminal)', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'UKG', '2025-04-15T00:00:00.000Z');
      student.graduate('2026-04-15T00:00:00.000Z');
      expect(student.status).toBe('GRADUATED');
      expect(student.hasExited).toBe(true);
    });

    it('should transition ACTIVE → TRANSFERRED (terminal)', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'NURSERY', '2025-04-15T00:00:00.000Z');
      student.transfer('branch-2', 'Family relocated', '2025-09-01T00:00:00.000Z');
      expect(student.status).toBe('TRANSFERRED');
    });

    it('should reject transitions out of GRADUATED', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.enroll('section-1', 'UKG', '2025-04-15T00:00:00.000Z');
      student.graduate('2026-04-15T00:00:00.000Z');
      expect(() => student.withdraw('test', '2026-05-01T00:00:00.000Z'))
        .toThrow(/Invalid status transition: GRADUATED → WITHDRAWN/);
    });
  });

  describe('guardian management', () => {
    it('should add a guardian and emit GuardianAddedEvent', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.clearDomainEvents();
      student.addGuardian({
        guardianId: 'g-1',
        relation: 'FATHER',
        isPrimary: true,
        isPickupAuthorized: true,
        isEmergencyContact: true,
        custodyHolder: true,
      }, 'user-1');
      expect(student.guardianLinks.length).toBe(1);
      expect(student.primaryGuardian?.guardianId).toBe('g-1');
      expect(student.domainEvents[0].eventType).toBe('GuardianAddedEvent');
    });

    it('should enforce only one primary guardian', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.addGuardian({
        guardianId: 'g-1', relation: 'FATHER', isPrimary: true,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: true,
      }, 'user-1');
      student.addGuardian({
        guardianId: 'g-2', relation: 'MOTHER', isPrimary: true,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: true,
      }, 'user-1');
      expect(student.guardianLinks.filter((g) => g.isPrimary).length).toBe(1);
      expect(student.primaryGuardian?.guardianId).toBe('g-2');
    });

    it('should reject duplicate guardian links', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.addGuardian({
        guardianId: 'g-1', relation: 'FATHER', isPrimary: true,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: true,
      }, 'user-1');
      expect(() => student.addGuardian({
        guardianId: 'g-1', relation: 'FATHER', isPrimary: false,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: false,
      }, 'user-1')).toThrow(/already linked/);
    });

    it('should not allow removing the primary guardian when alternatives exist', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.addGuardian({
        guardianId: 'g-1', relation: 'FATHER', isPrimary: true,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: true,
      }, 'user-1');
      student.addGuardian({
        guardianId: 'g-2', relation: 'MOTHER', isPrimary: false,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: false,
      }, 'user-1');
      expect(() => student.removeGuardian('g-1', 'user-1'))
        .toThrow(/Cannot remove primary guardian/);
    });

    it('should change primary via setPrimaryGuardian', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.addGuardian({
        guardianId: 'g-1', relation: 'FATHER', isPrimary: true,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: true,
      }, 'user-1');
      student.addGuardian({
        guardianId: 'g-2', relation: 'MOTHER', isPrimary: false,
        isPickupAuthorized: true, isEmergencyContact: true, custodyHolder: false,
      }, 'user-1');
      student.clearDomainEvents();
      student.setPrimaryGuardian('g-2');
      expect(student.primaryGuardian?.guardianId).toBe('g-2');
      expect(student.domainEvents[0].eventType).toBe('PrimaryGuardianChangedEvent');
    });
  });

  describe('updateProfile', () => {
    it('should update fields and emit StudentProfileUpdatedEvent with field names', () => {
      const student = StudentAggregate.create(baseProps, 'user-1');
      student.clearDomainEvents();
      student.updateProfile({ preferredName: 'Aaru', religion: 'Hindu' });
      expect(student.preferredName).toBe('Aaru');
      expect(student.religion).toBe('Hindu');
      expect(student.domainEvents[0].eventType).toBe('StudentProfileUpdatedEvent');
      expect((student.domainEvents[0].payload as any).updatedFields)
        .toEqual(expect.arrayContaining(['preferredName', 'religion']));
    });
  });
});
