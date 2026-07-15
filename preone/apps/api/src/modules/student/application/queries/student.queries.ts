/**
 * Student Queries — read-side operations (BTD §12.3).
 *
 * Per BTD §12.3:
 *   - Queries bypass aggregates — use read-optimized Prisma models
 *   - Queries NEVER mutate state
 *   - Queries can hit read replicas for fan-out reads
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

// ─────────────────────────────────────────────
// GetStudentById
// ─────────────────────────────────────────────

export interface GetStudentByIdPayload {
  studentId: string;
  includeGuardians?: boolean;
  includeMedical?: boolean;
}

export class GetStudentByIdQuery implements Query<GetStudentByIdPayload, unknown> {
  readonly type = 'Student.GetStudentById';
  constructor(
    readonly payload: GetStudentByIdPayload,
    readonly metadata: QueryMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// ListStudents
// ─────────────────────────────────────────────

export interface ListStudentsPayload {
  branchId?: string;
  status?: string;
  gradeLevel?: string;
  sectionId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export class ListStudentsQuery implements Query<ListStudentsPayload, unknown> {
  readonly type = 'Student.ListStudents';
  constructor(
    readonly payload: ListStudentsPayload,
    readonly metadata: QueryMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// SearchStudents — full-text search
// ─────────────────────────────────────────────

export interface SearchStudentsPayload {
  query: string;
  branchId?: string;
  limit: number;
}

export class SearchStudentsQuery implements Query<SearchStudentsPayload, unknown> {
  readonly type = 'Student.SearchStudents';
  constructor(
    readonly payload: SearchStudentsPayload,
    readonly metadata: QueryMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// GetStudentsBySection
// ─────────────────────────────────────────────

export interface GetStudentsBySectionPayload {
  sectionId: string;
  status?: string;
}

export class GetStudentsBySectionQuery implements Query<GetStudentsBySectionPayload, unknown> {
  readonly type = 'Student.GetStudentsBySection';
  constructor(
    readonly payload: GetStudentsBySectionPayload,
    readonly metadata: QueryMetadata,
  ) {}
}
