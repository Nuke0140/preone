/**
 * Wave 12 — HR Compliance Aggregate unit tests.
 *
 * Per BTD §24 — Testing Strategy:
 *   - Pure domain tests, no IO, no NestJS, no DB
 *   - Mocked repositories
 *   - State transitions, invariants, events
 *
 * Coverage:
 *   - SubstituteAssignmentAggregate (R-HR-005)
 *   - IccCommitteeAggregate (R-HR-009)
 *   - TrainingRecordAggregate (R-HR-010 + R-HR-011)
 *   - PositionOpeningAggregate (R-APR-010)
 *   - SalaryRevisionAggregate (R-APR-011)
 */
import { describe, it, expect } from 'vitest';

import { SubstituteAssignmentAggregate } from '../domain/aggregates/substitute-assignment.aggregate';
import { IccCommitteeAggregate } from '../domain/aggregates/icc-committee.aggregate';
import { TrainingRecordAggregate } from '../domain/aggregates/training-record.aggregate';
import { PositionOpeningAggregate, DEFAULT_BOARD_APPROVAL_THRESHOLD } from '../domain/aggregates/position-opening.aggregate';
import { SalaryRevisionAggregate, DEFAULT_BOARD_APPROVAL_DELTA_THRESHOLD } from '../domain/aggregates/salary-revision.aggregate';

const NOW = '2026-07-16T10:00:00.000Z';
const TODAY = '2026-07-16';

// =============================================================================
// SubstituteAssignmentAggregate (R-HR-005)
// =============================================================================
describe('SubstituteAssignmentAggregate (R-HR-005)', () => {
  it('should create an assignment with substitute teacher', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1',
      branchId: 'branch-1',
      absentEmployeeId: 'emp-1',
      substituteEmployeeId: 'emp-2',
      sectionId: 'sec-1',
      date: TODAY,
      startTime: NOW,
      assignmentReason: 'APPROVED_LEAVE',
    });
    expect(agg.status).toBe('ASSIGNED');
    expect(agg.substituteEmployeeId).toBe('emp-2');
    expect(agg.fallbackStrategy).toBeUndefined();
    expect(agg.domainEvents).toHaveLength(1);
    expect(agg.domainEvents[0].eventType).toBe('SubstituteAssignedEvent');
  });

  it('should create with fallback strategy when no substitute available', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', sectionId: 'sec-1',
      date: TODAY, startTime: NOW,
      assignmentReason: 'UNPLANNED_ABSENCE',
      fallbackStrategy: 'COORDINATOR_COVERS',
    });
    expect(agg.substituteEmployeeId).toBeUndefined();
    expect(agg.fallbackStrategy).toBe('COORDINATOR_COVERS');
  });

  it('should throw if neither substitute nor fallback provided', () => {
    expect(() => SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'EMERGENCY',
    })).toThrow(/substituteEmployeeId or fallbackStrategy/);
  });

  it('should throw if date is too far in past', () => {
    expect(() => SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: '2020-01-01', startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    })).toThrow(/too far in the past/);
  });

  it('should complete assignment with endTime after startTime', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    });
    agg.complete('2026-07-16T12:00:00.000Z');
    expect(agg.status).toBe('COMPLETED');
  });

  it('should throw when completing with endTime before startTime', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    });
    expect(() => agg.complete('2026-07-16T08:00:00.000Z')).toThrow(/endTime must be after startTime/);
  });

  it('should notify parent and track delay minutes', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: '2026-07-16T10:00:00.000Z', assignmentReason: 'APPROVED_LEAVE',
    });
    // Notify 45 minutes after start
    agg.notifyParent('2026-07-16T10:45:00.000Z');
    expect(agg.parentNotificationDelayMinutes).toBe(45);
    expect(agg.isNotificationSlaBreached).toBe(true); // > 30 min SLA
  });

  it('should flag SLA breach when delay > 30 minutes', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: '2026-07-16T10:00:00.000Z', assignmentReason: 'APPROVED_LEAVE',
    });
    agg.notifyParent('2026-07-16T10:20:00.000Z'); // 20 min delay
    expect(agg.isNotificationSlaBreached).toBe(false);
  });

  it('should decline assignment with reason', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    });
    agg.decline('Substitute called in sick');
    expect(agg.status).toBe('DECLINED');
  });

  it('should cancel assignment', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    });
    agg.cancel('Teacher returned');
    expect(agg.status).toBe('CANCELLED');
  });

  it('should reject transition from terminal state', () => {
    const agg = SubstituteAssignmentAggregate.create({
      tenantId: 'school-1', branchId: 'branch-1',
      absentEmployeeId: 'emp-1', substituteEmployeeId: 'emp-2', sectionId: 'sec-1',
      date: TODAY, startTime: NOW, assignmentReason: 'APPROVED_LEAVE',
    });
    agg.cancel('Test');
    expect(() => agg.complete('2026-07-16T12:00:00.000Z')).toThrow(/invalid transition/);
  });
});

// =============================================================================
// IccCommitteeAggregate (R-HR-009)
// =============================================================================
describe('IccCommitteeAggregate (R-HR-009)', () => {
  it('should create empty committee with ACTIVE status', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1',
      constitutionDate: '2026-04-01',
      fiscalYear: '2026-2027',
    });
    expect(agg.status).toBe('ACTIVE');
    expect(agg.members).toHaveLength(0);
    expect(agg.fiscalYear).toBe('2026-2027');
    expect(agg.domainEvents[0].eventType).toBe('IccCommitteeConstitutedEvent');
  });

  it('should add members with various roles', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-chair', 'CHAIRPERSON');
    agg.addMember('emp-mem-1', 'MEMBER');
    agg.addMember('emp-mem-2', 'MEMBER');
    agg.addMember('emp-ext', 'EXTERNAL_MEMBER', 'Women\'s Rights NGO');
    expect(agg.activeMembers).toHaveLength(4);
    expect(agg.isCompositionValid).toBe(true);
  });

  it('should reject duplicate member', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-1', 'MEMBER');
    expect(() => agg.addMember('emp-1', 'MEMBER')).toThrow(/already an active member/);
  });

  it('should reject second chairperson', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-1', 'CHAIRPERSON');
    expect(() => agg.addMember('emp-2', 'CHAIRPERSON')).toThrow(/already has an active chairperson/);
  });

  it('should reject external member without org name', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    expect(() => agg.addMember('emp-1', 'EXTERNAL_MEMBER')).toThrow(/externalOrgName/);
  });

  it('should reject publish without valid composition', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-1', 'MEMBER'); // only 1 member — too few
    expect(() => agg.publish(NOW)).toThrow(/POSH Act violation/);
  });

  it('should publish after valid composition', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-chair', 'CHAIRPERSON');
    agg.addMember('emp-mem-1', 'MEMBER');
    agg.addMember('emp-mem-2', 'MEMBER');
    agg.addMember('emp-ext', 'EXTERNAL_MEMBER', 'NGO');
    agg.publish(NOW);
    expect(agg.publishedAt).toBe(NOW);
  });

  it('should dissolve committee', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.dissolve(NOW);
    expect(agg.status).toBe('DISSOLVED');
    expect(agg.dissolvedAt).toBe(NOW);
  });

  it('should remove member (mark inactive)', () => {
    const agg = IccCommitteeAggregate.create({
      tenantId: 'school-1', constitutionDate: '2026-04-01', fiscalYear: '2026-2027',
    });
    agg.addMember('emp-1', 'MEMBER');
    expect(agg.activeMembers).toHaveLength(1);
    agg.removeMember('emp-1');
    expect(agg.activeMembers).toHaveLength(0);
  });
});

// =============================================================================
// TrainingRecordAggregate (R-HR-010 + R-HR-011)
// =============================================================================
describe('TrainingRecordAggregate (R-HR-010 POSH + R-HR-011 Food Handler)', () => {
  it('should create assigned POSH training with 80% pass mark', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    expect(agg.trainingType).toBe('POSH');
    expect(agg.passMark).toBe(80); // POSH default
    expect(agg.status).toBe('ASSIGNED');
  });

  it('should use default 70% pass mark for non-POSH training', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'FIRE_SAFETY', NOW);
    expect(agg.passMark).toBe(70);
  });

  it('should start training', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    expect(agg.status).toBe('IN_PROGRESS');
  });

  it('should complete training with score >= passMark', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    agg.complete(NOW, 85, 'CERT-001');
    expect(agg.status).toBe('COMPLETED');
    expect(agg.quizScore).toBe(85);
    expect(agg.certificateValidUntil).toBeDefined();
    // POSH validity = 365 days
    const validUntil = new Date(agg.certificateValidUntil!);
    const expected = new Date(NOW); expected.setDate(expected.getDate() + 365);
    expect(validUntil.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));
  });

  it('should reject completion with score < passMark', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    expect(() => agg.complete(NOW, 75, 'CERT-001')).toThrow(/below passMark/);
  });

  it('should fail training when score < passMark', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    agg.fail(60);
    expect(agg.status).toBe('FAILED');
    expect(agg.quizScore).toBe(60);
  });

  it('should reject fail when score >= passMark', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    expect(() => agg.fail(85)).toThrow(/>= passMark/);
  });

  it('should expire completed training', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    agg.complete(NOW, 85, 'CERT-001');
    agg.expire(NOW);
    expect(agg.status).toBe('EXPIRED');
  });

  it('should block payroll for non-completion', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    agg.blockPayroll(NOW);
    expect(agg.status).toBe('BLOCKED');
    expect(agg.payrollBlockedAt).toBe(NOW);
  });

  it('should validate certificate validity', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    agg.complete(NOW, 85, 'CERT-001');
    // Just completed — should be valid today
    expect(agg.isCertificateValid(TODAY)).toBe(true);
    // 400 days later — should be invalid
    expect(agg.isCertificateValid('2027-08-20')).toBe(false);
  });

  it('should detect upcoming expiry within 30 days', () => {
    const agg = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', NOW);
    agg.start(NOW);
    // Set completion 340 days ago — certificate expires in 25 days (within 30)
    const oldCompletion = '2025-08-10T10:00:00.000Z';
    // Re-create with old completion date
    const agg2 = TrainingRecordAggregate.create('school-1', 'emp-1', 'POSH', oldCompletion);
    agg2.start(oldCompletion);
    agg2.complete(oldCompletion, 85, 'CERT-001');
    expect(agg2.expiresWithin(30, new Date('2026-07-16'))).toBe(true);
  });
});

// =============================================================================
// PositionOpeningAggregate (R-APR-010)
// =============================================================================
describe('PositionOpeningAggregate (R-APR-010)', () => {
  it('should create position with board approval required above threshold', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-001', 'CLASS_TEACHER',
      'Senior Class Teacher', 'FULL_TIME',
      DEFAULT_BOARD_APPROVAL_THRESHOLD + 1n, // above threshold
      'Need additional teacher for new section',
    );
    expect(agg.status).toBe('OPEN');
    expect(agg.boardApprovalRequired).toBe(true);
  });

  it('should not require board approval below threshold', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-002', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME',
      DEFAULT_BOARD_APPROVAL_THRESHOLD - 1n,
      'Replace resigned teacher',
    );
    expect(agg.boardApprovalRequired).toBe(false);
  });

  it('should require director approval before fill', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-003', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n, // ₹5L — below threshold
      'Hiring',
    );
    expect(() => agg.fill('emp-1', NOW)).toThrow(/Director approval/);
  });

  it('should require board approval before fill when applicable', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-004', 'PRINCIPAL',
      'School Principal', 'FULL_TIME',
      DEFAULT_BOARD_APPROVAL_THRESHOLD + 1n,
      'New principal',
    );
    agg.approveByDirector('director-1', NOW);
    expect(() => agg.fill('emp-1', NOW)).toThrow(/board approval required/);
  });

  it('should fill position after all approvals', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-005', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n,
      'Hiring',
    );
    agg.approveByDirector('director-1', NOW);
    agg.fill('emp-1', NOW);
    expect(agg.status).toBe('FILLED');
    expect(agg.filledByEmployeeId).toBe('emp-1');
  });

  it('should reject double fill', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-006', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n,
      'Hiring',
    );
    agg.approveByDirector('director-1', NOW);
    agg.fill('emp-1', NOW);
    expect(() => agg.fill('emp-2', NOW)).toThrow(/invalid transition/);
  });

  it('should hold and resume position', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-007', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n,
      'Hiring',
    );
    agg.hold('Budget freeze');
    expect(agg.status).toBe('ON_HOLD');
    agg.resume();
    expect(agg.status).toBe('OPEN');
  });

  it('should cancel position', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-008', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n,
      'Hiring',
    );
    agg.cancel('Position withdrawn');
    expect(agg.status).toBe('CANCELLED');
  });

  it('should reject board approval when not required', () => {
    const agg = PositionOpeningAggregate.create(
      'school-1', 'branch-1', 'POS-009', 'CLASS_TEACHER',
      'Class Teacher', 'FULL_TIME', 50_00_00_00n,
      'Hiring',
    );
    agg.approveByDirector('director-1', NOW);
    expect(() => agg.approveByBoard(NOW)).toThrow(/Board approval not required/);
  });
});

// =============================================================================
// SalaryRevisionAggregate (R-APR-011)
// =============================================================================
describe('SalaryRevisionAggregate (R-APR-011)', () => {
  it('should create revision and compute deltaPercent', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n,    // ₹5L current
      55_00_00_00n,    // ₹5.5L proposed — 10% raise
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    expect(agg.deltaPercent).toBe(10);
    expect(agg.boardApprovalRequired).toBe(false); // 10% < 25% threshold
    expect(agg.isRaise).toBe(true);
  });

  it('should require board approval for >25% delta', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n,    // ₹5L
      70_00_00_00n,    // ₹7L — 40% raise
      '2026-08-01', 'PROMOTION', 'manager-1',
    );
    expect(agg.deltaPercent).toBe(40);
    expect(agg.boardApprovalRequired).toBe(true);
  });

  it('should reject same salary', () => {
    expect(() => SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 50_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    )).toThrow(/must differ/);
  });

  it('should reject >90% cut without OTHER reason', () => {
    expect(() => SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      1_00_00_00_000n, // ₹10L
      50_00_00_00n,    // ₹50K — 95% cut
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    )).toThrow(/suspicious/);
  });

  it('should approve via manager → director → board (high delta)', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 70_00_00_00n, // 40% raise — board approval required
      '2026-08-01', 'PROMOTION', 'manager-1',
    );
    agg.approveByManager('mgr-2', NOW);
    agg.approveByDirector('director-1', NOW);
    // Still PENDING — needs board approval
    expect(agg.status).toBe('PENDING');
    agg.approveByBoard(NOW);
    expect(agg.status).toBe('APPROVED');
    expect(agg.isFullyApproved).toBe(true);
  });

  it('should auto-approve to APPROVED after director (low delta)', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n, // 10% raise — no board approval
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    agg.approveByManager('mgr-2', NOW);
    agg.approveByDirector('director-1', NOW);
    expect(agg.status).toBe('APPROVED'); // auto-transitioned
  });

  it('should reject self-approval (requester == approver)', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    expect(() => agg.approveByManager('manager-1', NOW)).toThrow(/requester cannot be the same/);
  });

  it('should require manager approval before director', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    expect(() => agg.approveByDirector('director-1', NOW)).toThrow(/manager approval/);
  });

  it('should reject revision with reason', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    agg.reject('Budget constraints');
    expect(agg.status).toBe('REJECTED');
  });

  it('should apply approved revision on/after effective date', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    agg.approveByManager('mgr-2', NOW);
    agg.approveByDirector('director-1', NOW); // auto-approves (low delta)
    agg.apply('2026-08-01T10:00:00.000Z');
    expect(agg.status).toBe('EFFECTIVE');
  });

  it('should reject apply before effective date', () => {
    const agg = SalaryRevisionAggregate.create(
      'school-1', 'emp-1',
      50_00_00_00n, 55_00_00_00n,
      '2026-08-01', 'ANNUAL_REVIEW', 'manager-1',
    );
    agg.approveByManager('mgr-2', NOW);
    agg.approveByDirector('director-1', NOW);
    expect(() => agg.apply('2026-07-15T10:00:00.000Z')).toThrow(/before effective date/);
  });
});
