/**
 * Identity Query Handlers — CQRS read side (BTD §12.3).
 *
 * Per BTD §12.3:
 *   - Queries bypass aggregates — use read-optimized Prisma models
 *   - Queries NEVER mutate state
 *   - Queries can hit read replicas for fan-out reads
 *
 * For Wave 2.1: we use the repository's read methods (which return
 * aggregates). For v1.1+ we should add a dedicated read-model store
 * (denormalized views) for high-traffic endpoints like ListUsers.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';

import {
  GetSchoolQuery, GetUserQuery, ListUsersQuery,
  type GetUserPayload, type ListUsersPayload, type GetSchoolPayload,
  type SchoolReadModel, type UserReadModel, type ListUsersResult,
} from '../../application/queries/identity.queries';
import {
  SCHOOL_REPOSITORY, USER_REPOSITORY,
} from '../../domain/repositories/tokens';
import type { SchoolRepository } from '../../domain/repositories/school.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';

function toUserReadModel(u: import('../../domain/aggregates/user.aggregate').UserAggregate): UserReadModel {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: u.displayName,
    status: u.status,
    roles: u.roles,
    branchId: u.branchId,
    tenantId: u.tenantId,
    permissionsVersion: u.permissionsVersion,
    lastLoginAt: u.lastLoginAt,
    createdAt: new Date().toISOString(), // TODO: add createdAt to UserAggregate
    updatedAt: new Date().toISOString(),
  };
}

@Injectable()
export class GetUserQueryHandler implements QueryHandler<GetUserQuery> {
  private readonly logger = new Logger(GetUserQueryHandler.name);
  private static readonly TYPE = 'Identity.GetUser';

  constructor(
    private readonly bus: QueryBus,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    bus.register(GetUserQueryHandler.TYPE, this);
  }

  async handle(query: GetUserQuery): Promise<UserReadModel | null> {
    const user = await this.users.findById(query.payload.userId);
    return user ? toUserReadModel(user) : null;
  }
}

@Injectable()
export class ListUsersQueryHandler implements QueryHandler<ListUsersQuery> {
  private readonly logger = new Logger(ListUsersQueryHandler.name);
  private static readonly TYPE = 'Identity.ListUsers';

  constructor(
    private readonly bus: QueryBus,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {
    bus.register(ListUsersQueryHandler.TYPE, this);
  }

  async handle(query: ListUsersQuery): Promise<ListUsersResult> {
    const { page, pageSize, status, role, search } = query.payload;
    const result = await this.users.list({
      tenantId: query.metadata.tenantId,
      status,
      role,
      search,
    }, page, pageSize);

    return {
      items: result.items.map(toUserReadModel),
      total: result.total,
      page,
      pageSize,
      hasNext: page * pageSize < result.total,
    };
  }
}

@Injectable()
export class GetSchoolQueryHandler implements QueryHandler<GetSchoolQuery> {
  private readonly logger = new Logger(GetSchoolQueryHandler.name);
  private static readonly TYPE = 'Identity.GetSchool';

  constructor(
    private readonly bus: QueryBus,
    @Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository,
  ) {
    bus.register(GetSchoolQueryHandler.TYPE, this);
  }

  async handle(query: GetSchoolQuery): Promise<SchoolReadModel | null> {
    const school = await this.schools.findById(query.payload.schoolId);
    if (!school) return null;
    return {
      id: school.id,
      name: school.name,
      email: school.email,
      phone: school.phone,
      status: school.status,
      tier: school.tier,
      branchCount: school.branchCount,
      maxBranches: school.maxBranches,
      studentSeats: school.studentSeats,
      usedSeats: school.usedSeats,
      activatedAt: school.activatedAt,
      trialEndsAt: school.trialEndsAt,
      createdAt: new Date().toISOString(),
    };
  }
}
