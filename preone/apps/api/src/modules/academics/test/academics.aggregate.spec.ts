/**
 * Academics Aggregate unit tests — pure domain logic (no IO, no NestJS).
 */
import { describe, it, expect } from 'vitest';

import { AcademicSessionAggregate } from '../domain/aggregates/academic-session.aggregate';
import { AssessmentAggregate } from '../domain/aggregates/assessment.aggregate';
import { EnrollmentAggregate } from '../domain/aggregates/enrollment.aggregate';
import { ObservationAggregate } from '../domain/aggregates/observation.aggregate';
import { PortfolioAggregate } from '../domain/aggregates/portfolio.aggregate';
import { ReportCardAggregate } from '../domain/aggregates/report-card.aggregate';
import { SectionAggregate } from '../domain/aggregates/section.aggregate';

describe('AcademicSessionAggregate', () => {
  it('should create a PLANNED session with a StudentCreatedEvent', () => {
    const session = AcademicSessionAggregate.create({
      tenantId: 'school-1', name: '2025-26', code: 'AY2526',
      startDate: '2025-04-01', endDate: '2026-03-31',
    });
    expect(session.status).toBe('PLANNED');
    expect(session.isCurrent).toBe(false);
    expect(session.domainEvents[0].eventType).toBe('AcademicSessionCreatedEvent');
  });

  it('should activate a PLANNED session and emit ActivatedEvent', () => {
    const session = AcademicSessionAggregate.create({
      tenantId: 'school-1', name: '2025-26', code: 'AY2526',
      startDate: '2025-04-01', endDate: '2026-03-31',
    });
    session.clearDomainEvents();
    session.activate('2025-04-01T00:00:00Z');
    expect(session.status).toBe('ACTIVE');
    expect(session.isCurrent).toBe(true);
    expect(session.activatedAt).toBe('2025-04-01T00:00:00Z');
    expect(session.domainEvents[0].eventType).toBe('AcademicSessionActivatedEvent');
  });

  it('should complete an ACTIVE session', () => {
    const session = AcademicSessionAggregate.create({
      tenantId: 'school-1', name: '2025-26', code: 'AY2526',
      startDate: '2025-04-01', endDate: '2026-03-31',
    });
    session.activate('2025-04-01T00:00:00Z');
    session.clearDomainEvents();
    session.complete('2026-03-31T00:00:00Z');
    expect(session.status).toBe('COMPLETED');
    expect(session.isCurrent).toBe(false);
  });
});

describe('SectionAggregate', () => {
  const baseProps = {
    tenantId: 'school-1', branchId: 'branch-1', sessionId: 'session-1',
    classroomId: 'class-1', name: 'Nursery A', code: 'NSY-A',
    gradeLevel: 'NURSERY', capacity: 20, minAgeMonths: 36, maxAgeMonths: 48,
  };

  it('should create a PLANNED section', () => {
    const s = SectionAggregate.create(baseProps);
    expect(s.status).toBe('PLANNED');
    expect(s.enrolledCount).toBe(0);
    expect(s.seatsAvailable).toBe(20);
    expect(s.isFull).toBe(false);
    expect(s.domainEvents[0].eventType).toBe('SectionCreatedEvent');
  });

  it('should activate + close', () => {
    const s = SectionAggregate.create(baseProps);
    s.activate('2025-04-01T00:00:00Z');
    expect(s.status).toBe('ACTIVE');
    s.close('2026-03-31T00:00:00Z');
    expect(s.status).toBe('CLOSED');
  });

  it('should check age eligibility', () => {
    const s = SectionAggregate.create(baseProps);
    expect(s.isEligible(40)).toBe(true);
    expect(s.isEligible(30)).toBe(false);
    expect(s.isEligible(50)).toBe(false);
  });

  it('should track enrollment count + reject when full', () => {
    const s = SectionAggregate.create({ ...baseProps, capacity: 2 });
    s.incrementEnrollment();
    s.incrementEnrollment();
    expect(s.isFull).toBe(true);
    expect(() => s.incrementEnrollment()).toThrow(/at capacity/);
  });
});

describe('EnrollmentAggregate', () => {
  it('should create an ENROLLED enrollment with StudentEnrolledEvent', () => {
    const e = EnrollmentAggregate.create({
      tenantId: 'school-1', studentId: 'student-1',
      sessionId: 'session-1', sectionId: 'section-1',
      enrollmentNumber: 'ENR-001', type: 'NEW',
      startDate: '2025-04-01',
    });
    expect(e.status).toBe('ENROLLED');
    expect(e.isActive).toBe(true);
    expect(e.domainEvents[0].eventType).toBe('StudentEnrolledEvent');
  });

  it('should promote enrollment', () => {
    const e = EnrollmentAggregate.create({
      tenantId: 'school-1', studentId: 'student-1',
      sessionId: 'session-1', sectionId: 'section-1',
      enrollmentNumber: 'ENR-001', type: 'NEW', startDate: '2025-04-01',
    });
    e.clearDomainEvents();
    e.promote('section-2', '2026-04-01T00:00:00Z');
    expect(e.status).toBe('PROMOTED');
    expect(e.previousSectionId).toBe('section-1');
    expect(e.nextSectionId).toBe('section-2');
    expect(e.domainEvents[0].eventType).toBe('StudentPromotedEvent');
  });

  it('should withdraw enrollment', () => {
    const e = EnrollmentAggregate.create({
      tenantId: 'school-1', studentId: 'student-1',
      sessionId: 'session-1', sectionId: 'section-1',
      enrollmentNumber: 'ENR-001', type: 'NEW', startDate: '2025-04-01',
    });
    e.withdraw('Family moving', '2025-09-01T00:00:00Z');
    expect(e.status).toBe('WITHDRAWN');
    expect(e.exitReason).toBe('Family moving');
  });
});

describe('ObservationAggregate', () => {
  it('should create + share with parent (one-way)', () => {
    const o = ObservationAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      observedAt: '2025-04-15T00:00:00Z', category: 'ACADEMIC',
      description: 'Showed interest in numbers',
      isPrivate: true, observedBy: 'teacher-1',
    });
    expect(o.isPrivate).toBe(true);
    expect(o.isSharedWithParent).toBe(false);
    expect(o.domainEvents[0].eventType).toBe('ObservationRecordedEvent');

    o.clearDomainEvents();
    o.shareWithParent('2025-04-16T00:00:00Z');
    expect(o.isSharedWithParent).toBe(true);
    expect(o.isPrivate).toBe(false);
    expect(o.sharedAt).toBe('2025-04-16T00:00:00Z');
    expect(o.domainEvents[0].eventType).toBe('ObservationSharedWithParentEvent');
  });

  it('should reject edits after sharing', () => {
    const o = ObservationAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      observedAt: '2025-04-15T00:00:00Z', category: 'ACADEMIC',
      description: 'Showed interest in numbers',
      isPrivate: true, observedBy: 'teacher-1',
    });
    o.shareWithParent('2025-04-16T00:00:00Z');
    expect(() => o.updateDescription('new text')).toThrow(/Cannot edit observation after/);
  });
});

describe('AssessmentAggregate', () => {
  it('should create a SCHEDULED assessment', () => {
    const a = AssessmentAggregate.create({
      tenantId: 'school-1', sectionId: 'sec-1',
      name: 'Q1 Math', type: 'FORMATIVE', weightPercent: 20,
      createdBy: 'teacher-1',
    });
    expect(a.status).toBe('SCHEDULED');
    expect(a.domainEvents[0].eventType).toBe('AssessmentCreatedEvent');
  });

  it('should add items, start, record scores, complete', () => {
    const a = AssessmentAggregate.create({
      tenantId: 'school-1', sectionId: 'sec-1',
      name: 'Q1 Math', type: 'FORMATIVE', weightPercent: 20,
      createdBy: 'teacher-1',
    });
    const item1 = a.addItem({ description: 'Counting 1-10', maxMarks: 10, weightPercent: 50, sortOrder: 1 });
    const item2 = a.addItem({ description: 'Addition', maxMarks: 10, weightPercent: 50, sortOrder: 2 });
    expect(a.items.length).toBe(2);
    expect(a.totalMarks).toBe(20);

    a.start('2025-09-01T00:00:00Z');
    expect(a.status).toBe('IN_PROGRESS');

    a.recordScore({
      itemId: item1.id, enrollmentId: 'enr-1',
      marks: 8, isAbsent: false, isExcused: false,
      scoredBy: 'teacher-1', scoredAt: '2025-09-02T00:00:00Z',
    });

    expect(a.getScore(item1.id, 'enr-1')?.marks).toBe(8);
    expect(a.computeTotalScore('enr-1')).toBe(8);
    expect(a.domainEvents.some((e) => e.eventType === 'AssessmentScoredEvent')).toBe(true);

    a.complete('2025-09-03T00:00:00Z');
    expect(a.status).toBe('COMPLETED');
  });

  it('should reject scores exceeding max marks', () => {
    const a = AssessmentAggregate.create({
      tenantId: 'school-1', sectionId: 'sec-1',
      name: 'Q1 Math', type: 'FORMATIVE', weightPercent: 20,
      createdBy: 'teacher-1',
    });
    const item = a.addItem({ description: 'Test', maxMarks: 10, weightPercent: 100, sortOrder: 1 });
    a.start('2025-09-01T00:00:00Z');
    expect(() => a.recordScore({
      itemId: item.id, enrollmentId: 'enr-1',
      marks: 15, isAbsent: false, isExcused: false,
      scoredBy: 'teacher-1', scoredAt: '2025-09-02T00:00:00Z',
    })).toThrow(/exceed max/);
  });
});

describe('ReportCardAggregate', () => {
  it('should follow full lifecycle: DRAFT → IN_REVIEW → PUBLISHED → SHARED → ARCHIVED', () => {
    const rc = ReportCardAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      termId: 'term-1', templateId: 'tmpl-1', content: { sections: [] },
    });
    expect(rc.status).toBe('DRAFT');

    rc.generate('teacher-1', '2025-09-30T00:00:00Z');
    expect(rc.status).toBe('IN_REVIEW');
    expect(rc.generatedBy).toBe('teacher-1');

    rc.setTeacherComment('Good progress');
    rc.publish('principal-1', '2025-10-01T00:00:00Z');
    expect(rc.status).toBe('PUBLISHED');
    expect(rc.teacherComment).toBe('Good progress');

    rc.shareWithParents('2025-10-02T00:00:00Z');
    expect(rc.status).toBe('SHARED_WITH_PARENTS');

    rc.archive();
    expect(rc.status).toBe('ARCHIVED');
  });

  it('should reject edit of teacher comment after sharing', () => {
    const rc = ReportCardAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      termId: 'term-1', templateId: 'tmpl-1', content: { sections: [] },
    });
    rc.generate('teacher-1', '2025-09-30T00:00:00Z');
    rc.publish('principal-1', '2025-10-01T00:00:00Z');
    rc.shareWithParents('2025-10-02T00:00:00Z');
    expect(() => rc.setTeacherComment('edited')).toThrow(/Cannot edit teacher comment/);
  });
});

describe('PortfolioAggregate', () => {
  it('should add items + track count', () => {
    const p = PortfolioAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      title: 'My Portfolio', isSharedWithParent: true,
    });
    expect(p.itemCount).toBe(0);
    p.addItem({
      type: 'ARTWORK', title: 'Finger painting', capturedAt: '2025-04-15T00:00:00Z',
      capturedBy: 'teacher-1', tags: [], milestoneIds: [],
      isHighlight: false, isSharedWithParent: true, sortOrder: 0,
    });
    expect(p.itemCount).toBe(1);
    expect(p.domainEvents[0].eventType).toBe('PortfolioItemAddedEvent');
  });

  it('should highlight + unhighlight items', () => {
    const p = PortfolioAggregate.create({
      tenantId: 'school-1', enrollmentId: 'enr-1', sectionId: 'sec-1',
      title: 'My Portfolio', isSharedWithParent: true,
    });
    const item = p.addItem({
      type: 'PHOTO', title: 'First day', capturedAt: '2025-04-15T00:00:00Z',
      capturedBy: 'teacher-1', tags: [], milestoneIds: [],
      isHighlight: false, isSharedWithParent: true, sortOrder: 0,
    });
    p.highlightItem(item.id);
    expect(p.highlights.length).toBe(1);
    p.unhighlightItem(item.id);
    expect(p.highlights.length).toBe(0);
  });
});
