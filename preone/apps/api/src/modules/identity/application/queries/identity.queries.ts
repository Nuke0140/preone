/**
 * Identity Queries — read-side operations (BTD §12.3).
 *
 * Per BTD §12.3 — Query Side:
 *   - Queries bypass aggregates — use read-optimized Prisma models
 *   - Queries NEVER mutate state
 *   - Queries can hit read replicas for fan-out reads
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

// ─────────────────────────────────────────────
// User Queries
// ─────────────────────────────────────────────

export interface GetUserPayload {
  userId: string;
}

export interface UserReadModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  roles: string[];
  branchId?: string;
  tenantId: string;
  permissionsVersion: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class GetUserQuery implements Query<GetUserPayload, UserReadModel | null> {
  readonly type = 'Identity.GetUser';
  constructor(
    readonly payload: GetUserPayload,
    readonly metadata: QueryMetadata,
  ) {}
}

export interface ListUsersPayload {
  page: number;
  pageSize: number;
  status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  role?: string;
  search?: string;
}

export interface ListUsersResult {
  items: UserReadModel[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export class ListUsersQuery implements Query<ListUsersPayload, ListUsersResult> {
  readonly type = 'Identity.ListUsers';
  constructor(
    readonly payload: ListUsersPayload,
    readonly metadata: QueryMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// School Queries
// ─────────────────────────────────────────────

export interface GetSchoolPayload {
  schoolId: string;
}

export interface SchoolReadModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'PROSPECT' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  tier: 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';
  branchCount: number;
  maxBranches: number;
  studentSeats: number;
  usedSeats: number;
  activatedAt?: string;
  trialEndsAt?: string;
  createdAt: string;
}

export class GetSchoolQuery implements Query<GetSchoolPayload, SchoolReadModel | null> {
  readonly type = 'Identity.GetSchool';
  constructor(
    readonly payload: GetSchoolPayload,
    readonly metadata: QueryMetadata,
  ) {}
}
