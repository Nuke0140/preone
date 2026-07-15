/**
 * Academics Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by AcademicSession, Curriculum, Section, Enrollment, Observation,
 * Assessment, ReportCard, and Portfolio aggregates.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// AcademicSession
// ─────────────────────────────────────────────

export class AcademicSessionCreatedEvent extends DomainEvent<{
  sessionId: string;
  tenantId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}> {}

export class AcademicSessionActivatedEvent extends DomainEvent<{
  sessionId: string;
  tenantId: string;
  activatedAt: string;
}> {}

export class AcademicSessionCompletedEvent extends DomainEvent<{
  sessionId: string;
  tenantId: string;
  completedAt: string;
}> {}

// ─────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────

export class CurriculumCreatedEvent extends DomainEvent<{
  curriculumId: string;
  tenantId: string;
  branchId: string;
  name: string;
  gradeLevel: string;
}> {}

export class CurriculumPublishedEvent extends DomainEvent<{
  curriculumId: string;
  tenantId: string;
  publishedAt: string;
  publishedBy: string;
}> {}

// ─────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────

export class SectionCreatedEvent extends DomainEvent<{
  sectionId: string;
  tenantId: string;
  branchId: string;
  name: string;
  code: string;
  gradeLevel: string;
}> {}

export class SectionActivatedEvent extends DomainEvent<{
  sectionId: string;
  tenantId: string;
  activatedAt: string;
}> {}

export class SectionClosedEvent extends DomainEvent<{
  sectionId: string;
  tenantId: string;
  closedAt: string;
}> {}

// ─────────────────────────────────────────────
// Enrollment
// ─────────────────────────────────────────────

export class StudentEnrolledEvent extends DomainEvent<{
  enrollmentId: string;
  studentId: string;
  tenantId: string;
  sectionId: string;
  sessionId: string;
  enrollmentNumber: string;
  type: string;
}> {}

export class StudentPromotedEvent extends DomainEvent<{
  enrollmentId: string;
  studentId: string;
  tenantId: string;
  fromSectionId: string;
  toSectionId: string;
}> {}

export class StudentWithdrawnFromSectionEvent extends DomainEvent<{
  enrollmentId: string;
  studentId: string;
  tenantId: string;
  sectionId: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Observation
// ─────────────────────────────────────────────

export class ObservationRecordedEvent extends DomainEvent<{
  observationId: string;
  tenantId: string;
  enrollmentId: string;
  sectionId: string;
  category: string;
  observedBy: string;
}> {}

export class ObservationSharedWithParentEvent extends DomainEvent<{
  observationId: string;
  tenantId: string;
  sharedAt: string;
}> {}

// ─────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────

export class AssessmentCreatedEvent extends DomainEvent<{
  assessmentId: string;
  tenantId: string;
  sectionId: string;
  name: string;
  type: string;
}> {}

export class AssessmentCompletedEvent extends DomainEvent<{
  assessmentId: string;
  tenantId: string;
  completedAt: string;
}> {}

export class AssessmentScoredEvent extends DomainEvent<{
  assessmentId: string;
  enrollmentId: string;
  itemId: string;
  marks: number | null;
  scoredBy: string;
}> {}

// ─────────────────────────────────────────────
// ReportCard
// ─────────────────────────────────────────────

export class ReportCardGeneratedEvent extends DomainEvent<{
  reportCardId: string;
  tenantId: string;
  enrollmentId: string;
  termId: string;
  overallGrade?: string;
}> {}

export class ReportCardPublishedEvent extends DomainEvent<{
  reportCardId: string;
  tenantId: string;
  publishedAt: string;
}> {}

export class ReportCardSharedWithParentEvent extends DomainEvent<{
  reportCardId: string;
  tenantId: string;
  sharedAt: string;
}> {}

// ─────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────

export class PortfolioItemAddedEvent extends DomainEvent<{
  portfolioId: string;
  tenantId: string;
  enrollmentId: string;
  itemId: string;
  type: string;
  title: string;
}> {}

export class PortfolioItemHighlightedEvent extends DomainEvent<{
  portfolioId: string;
  itemId: string;
}> {}
