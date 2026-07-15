/**
 * Academics Commands — intent-bearing operations on Academics aggregates (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─────────────────────────────────────────────
// AcademicSession
// ─────────────────────────────────────────────

export interface CreateAcademicSessionPayload {
  name: string;
  code: string;
  startDate: string;
  endDate: string;
}

export class CreateAcademicSessionCommand implements Command<CreateAcademicSessionPayload, { id: string }> {
  readonly type = 'Academics.CreateAcademicSession';
  constructor(readonly payload: CreateAcademicSessionPayload, readonly metadata: CommandMetadata) {}
}

export class ActivateAcademicSessionCommand implements Command<{ sessionId: string }, { id: string }> {
  readonly type = 'Academics.ActivateAcademicSession';
  constructor(readonly payload: { sessionId: string }, readonly metadata: CommandMetadata) {}
}

export class CompleteAcademicSessionCommand implements Command<{ sessionId: string }, { id: string }> {
  readonly type = 'Academics.CompleteAcademicSession';
  constructor(readonly payload: { sessionId: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────

export interface CreateCurriculumPayload {
  sessionId: string;
  branchId: string;
  classroomId: string;
  name: string;
  description?: string;
  gradeLevel: string;
}

export class CreateCurriculumCommand implements Command<CreateCurriculumPayload, { id: string }> {
  readonly type = 'Academics.CreateCurriculum';
  constructor(readonly payload: CreateCurriculumPayload, readonly metadata: CommandMetadata) {}
}

export class PublishCurriculumCommand implements Command<{ curriculumId: string }, { id: string }> {
  readonly type = 'Academics.PublishCurriculum';
  constructor(readonly payload: { curriculumId: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────

export interface CreateSectionPayload {
  branchId: string;
  sessionId: string;
  classroomId: string;
  curriculumId?: string;
  name: string;
  code: string;
  gradeLevel: string;
  capacity?: number;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  roomNumber?: string;
}

export class CreateSectionCommand implements Command<CreateSectionPayload, { id: string }> {
  readonly type = 'Academics.CreateSection';
  constructor(readonly payload: CreateSectionPayload, readonly metadata: CommandMetadata) {}
}

export class ActivateSectionCommand implements Command<{ sectionId: string }, { id: string }> {
  readonly type = 'Academics.ActivateSection';
  constructor(readonly payload: { sectionId: string }, readonly metadata: CommandMetadata) {}
}

export class CloseSectionCommand implements Command<{ sectionId: string }, { id: string }> {
  readonly type = 'Academics.CloseSection';
  constructor(readonly payload: { sectionId: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Enrollment
// ─────────────────────────────────────────────

export interface CreateEnrollmentPayload {
  studentId: string;
  sessionId: string;
  sectionId: string;
  type: 'NEW' | 'CONTINUING' | 'TRANSFER_IN' | 'REPEAT';
  startDate: string;
}

export class CreateEnrollmentCommand implements Command<CreateEnrollmentPayload, { id: string }> {
  readonly type = 'Academics.CreateEnrollment';
  constructor(readonly payload: CreateEnrollmentPayload, readonly metadata: CommandMetadata) {}
}

export class PromoteEnrollmentCommand implements Command<{ enrollmentId: string; toSectionId: string }, { id: string }> {
  readonly type = 'Academics.PromoteEnrollment';
  constructor(readonly payload: { enrollmentId: string; toSectionId: string }, readonly metadata: CommandMetadata) {}
}

export class WithdrawEnrollmentCommand implements Command<{ enrollmentId: string; reason: string }, { id: string }> {
  readonly type = 'Academics.WithdrawEnrollment';
  constructor(readonly payload: { enrollmentId: string; reason: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Observation
// ─────────────────────────────────────────────

export interface CreateObservationPayload {
  enrollmentId: string;
  sectionId: string;
  category: string;
  title?: string;
  description: string;
  rating?: number;
  isPrivate?: boolean;
  observedAt?: string;
}

export class CreateObservationCommand implements Command<CreateObservationPayload, { id: string }> {
  readonly type = 'Academics.CreateObservation';
  constructor(readonly payload: CreateObservationPayload, readonly metadata: CommandMetadata) {}
}

export class ShareObservationWithParentCommand implements Command<{ observationId: string }, { id: string }> {
  readonly type = 'Academics.ShareObservation';
  constructor(readonly payload: { observationId: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────

export interface CreateAssessmentPayload {
  sectionId: string;
  termId?: string;
  name: string;
  type: string;
  description?: string;
  totalMarks?: number;
  passingMarks?: number;
  weightPercent?: number;
  scheduledAt?: string;
}

export class CreateAssessmentCommand implements Command<CreateAssessmentPayload, { id: string }> {
  readonly type = 'Academics.CreateAssessment';
  constructor(readonly payload: CreateAssessmentPayload, readonly metadata: CommandMetadata) {}
}

export class StartAssessmentCommand implements Command<{ assessmentId: string }, { id: string }> {
  readonly type = 'Academics.StartAssessment';
  constructor(readonly payload: { assessmentId: string }, readonly metadata: CommandMetadata) {}
}

export class CompleteAssessmentCommand implements Command<{ assessmentId: string }, { id: string }> {
  readonly type = 'Academics.CompleteAssessment';
  constructor(readonly payload: { assessmentId: string }, readonly metadata: CommandMetadata) {}
}

export interface RecordScorePayload {
  assessmentId: string;
  itemId: string;
  enrollmentId: string;
  marks?: number;
  isAbsent?: boolean;
  isExcused?: boolean;
  remarks?: string;
}

export class RecordScoreCommand implements Command<RecordScorePayload, { id: string }> {
  readonly type = 'Academics.RecordScore';
  constructor(readonly payload: RecordScorePayload, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// ReportCard
// ─────────────────────────────────────────────

export interface CreateReportCardPayload {
  enrollmentId: string;
  sectionId: string;
  termId: string;
  templateId: string;
}

export class CreateReportCardCommand implements Command<CreateReportCardPayload, { id: string }> {
  readonly type = 'Academics.CreateReportCard';
  constructor(readonly payload: CreateReportCardPayload, readonly metadata: CommandMetadata) {}
}

export class GenerateReportCardCommand implements Command<{ reportCardId: string }, { id: string }> {
  readonly type = 'Academics.GenerateReportCard';
  constructor(readonly payload: { reportCardId: string }, readonly metadata: CommandMetadata) {}
}

export class PublishReportCardCommand implements Command<{ reportCardId: string }, { id: string }> {
  readonly type = 'Academics.PublishReportCard';
  constructor(readonly payload: { reportCardId: string }, readonly metadata: CommandMetadata) {}
}

export class ShareReportCardCommand implements Command<{ reportCardId: string }, { id: string }> {
  readonly type = 'Academics.ShareReportCard';
  constructor(readonly payload: { reportCardId: string }, readonly metadata: CommandMetadata) {}
}

// ─────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────

export interface CreatePortfolioItemPayload {
  enrollmentId: string;
  type: string;
  title: string;
  description?: string;
  s3ObjectKey?: string;
  thumbnailUrl?: string;
  capturedAt?: string;
  tags?: string[];
  milestoneIds?: string[];
  isHighlight?: boolean;
}

export class CreatePortfolioItemCommand implements Command<CreatePortfolioItemPayload, { id: string; itemId: string }> {
  readonly type = 'Academics.CreatePortfolioItem';
  constructor(readonly payload: CreatePortfolioItemPayload, readonly metadata: CommandMetadata) {}
}

export class HighlightPortfolioItemCommand implements Command<{ portfolioId: string; itemId: string }, { id: string }> {
  readonly type = 'Academics.HighlightPortfolioItem';
  constructor(readonly payload: { portfolioId: string; itemId: string }, readonly metadata: CommandMetadata) {}
}
