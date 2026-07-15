/**
 * Academics Queries — read-side operations (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class ListAcademicSessionsQuery implements Query<{ status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListAcademicSessions';
  constructor(readonly payload: { status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class GetAcademicSessionQuery implements Query<{ sessionId: string }, unknown> {
  readonly type = 'Academics.GetAcademicSession';
  constructor(readonly payload: { sessionId: string }, readonly metadata: QueryMetadata) {}
}

export class ListSectionsQuery implements Query<{ branchId?: string; sessionId?: string; gradeLevel?: string; status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListSections';
  constructor(readonly payload: { branchId?: string; sessionId?: string; gradeLevel?: string; status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class GetSectionQuery implements Query<{ sectionId: string }, unknown> {
  readonly type = 'Academics.GetSection';
  constructor(readonly payload: { sectionId: string }, readonly metadata: QueryMetadata) {}
}

export class ListEnrollmentsQuery implements Query<{ sectionId?: string; sessionId?: string; studentId?: string; status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListEnrollments';
  constructor(readonly payload: { sectionId?: string; sessionId?: string; studentId?: string; status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class GetEnrollmentQuery implements Query<{ enrollmentId: string }, unknown> {
  readonly type = 'Academics.GetEnrollment';
  constructor(readonly payload: { enrollmentId: string }, readonly metadata: QueryMetadata) {}
}

export class ListCurriculaQuery implements Query<{ branchId?: string; sessionId?: string; gradeLevel?: string; status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListCurricula';
  constructor(readonly payload: { branchId?: string; sessionId?: string; gradeLevel?: string; status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class ListObservationsQuery implements Query<{ enrollmentId?: string; sectionId?: string; category?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListObservations';
  constructor(readonly payload: { enrollmentId?: string; sectionId?: string; category?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class ListAssessmentsQuery implements Query<{ sectionId?: string; termId?: string; status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListAssessments';
  constructor(readonly payload: { sectionId?: string; termId?: string; status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class GetAssessmentQuery implements Query<{ assessmentId: string }, unknown> {
  readonly type = 'Academics.GetAssessment';
  constructor(readonly payload: { assessmentId: string }, readonly metadata: QueryMetadata) {}
}

export class GetReportCardQuery implements Query<{ reportCardId: string }, unknown> {
  readonly type = 'Academics.GetReportCard';
  constructor(readonly payload: { reportCardId: string }, readonly metadata: QueryMetadata) {}
}

export class ListReportCardsQuery implements Query<{ sectionId?: string; termId?: string; enrollmentId?: string; status?: string; page: number; pageSize: number }, unknown> {
  readonly type = 'Academics.ListReportCards';
  constructor(readonly payload: { sectionId?: string; termId?: string; enrollmentId?: string; status?: string; page: number; pageSize: number }, readonly metadata: QueryMetadata) {}
}

export class GetPortfolioQuery implements Query<{ enrollmentId: string }, unknown> {
  readonly type = 'Academics.GetPortfolio';
  constructor(readonly payload: { enrollmentId: string }, readonly metadata: QueryMetadata) {}
}
