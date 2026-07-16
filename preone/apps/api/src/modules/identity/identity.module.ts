/**
 * IdentityModule — Users, Roles, Permissions, Tenants, Branches
 *
 * Per BTD §4.3 Module Catalog:
 *   "1. identity — Users, Roles, Permissions, Tenants, Branches — ~70 APIs"
 *
 * Per ADR v1.0:
 *   - 11 staff roles + Parent
 *   - Hybrid Assignment Model: master `assignment` + 6 scope-specific child tables
 *   - Complex RBAC: scope-per-role-per-module, permission UNION (never promote)
 *   - Multi-tenancy: shared schema with school_id discriminator + RLS
 *
 * Wave 2.1 additions:
 *   - CQRS: CommandBus + QueryBus + 4 command handlers + 3 query handlers
 *   - Domain Events: wired EventBus + IdentityEventTranslator
 *   - Integration Events: outbox table + PrismaOutboxRepository + OutboxPublisher
 *   - Unit of Work: transaction boundary + outbox atomicity
 *   - Permission Cache: PermissionResolver (Redis-backed, BTD §16.4)
 *
 * This module owns:
 *   - School (tenant) CRUD + lifecycle (PROSPECT → TRIAL → ACTIVE → SUSPENDED → CANCELLED)
 *   - Branch CRUD (within a school)
 *   - User CRUD (staff + parent)
 *   - Role / Permission management + RBAC matrix
 *   - User-role assignments (scoped)
 *   - Authentication (login, OTP, refresh)
 *   - Session management
 */
import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';
import { CommandBus, QueryBus } from '@shared/cqrs';

import {
  ChangeUserRolesCommandHandler, CreateSchoolCommandHandler,
  CreateUserCommandHandler, LoginCommandHandler,
} from './application/handlers/identity-command-handlers';
import {
  GetSchoolQueryHandler, GetUserQueryHandler, ListUsersQueryHandler,
} from './application/handlers/identity-query-handlers';
import { AuthService } from './application/services/auth.service';
import { BranchService } from './application/services/branch.service';
import {
  IdentityEventTranslator,
} from './application/services/event-translator.service';
import { JwtService } from './application/services/jwt.service';
import { OtpService } from './application/services/otp.service';
import {
  PermissionResolver,
} from './application/services/permission-resolver.service';
import { PermissionService } from './application/services/permission.service';
import { RoleService } from './application/services/role.service';
import { SchoolService } from './application/services/school.service';
import { UserService } from './application/services/user.service';
import { UnitOfWork } from './application/unit-of-work';
import { AuthController } from './controllers/auth.controller';
import { BranchesController } from './controllers/branches.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { SchoolsController } from './controllers/schools.controller';
import { UsersController } from './controllers/users.controller';
import {
  SCHOOL_REPOSITORY, BRANCH_REPOSITORY, USER_REPOSITORY, ROLE_REPOSITORY,
  PERMISSION_REPOSITORY,
} from './domain/repositories/tokens';
import {
  OutboxPublisher,
} from './infrastructure/jobs/outbox-publisher';
import {
  PrismaBranchRepository,
} from './infrastructure/repositories/prisma-branch.repository';
import {
  PrismaOutboxRepository,
} from './infrastructure/repositories/prisma-outbox.repository';
import {
  PrismaPermissionRepository,
} from './infrastructure/repositories/prisma-permission.repository';
import {
  PrismaRoleRepository,
} from './infrastructure/repositories/prisma-role.repository';
import {
  PrismaSchoolRepository,
} from './infrastructure/repositories/prisma-school.repository';
import {
  PrismaUserRepository,
} from './infrastructure/repositories/prisma-user.repository';

@Module({
  controllers: [
    AuthController,
    SchoolsController,
    UsersController,
    RolesController,
    PermissionsController,
    BranchesController,
  ],
  providers: [
    // ─── CQRS buses ───
    CommandBus,
    QueryBus,

    // ─── Application services ───
    AuthService,
    SchoolService,
    UserService,
    RoleService,
    BranchService,
    PermissionService,
    JwtService,
    OtpService,
    PermissionResolver,
    IdentityEventTranslator,
    UnitOfWork,

    // ─── CQRS handlers ───
    LoginCommandHandler,
    CreateUserCommandHandler,
    ChangeUserRolesCommandHandler,
    CreateSchoolCommandHandler,
    GetUserQueryHandler,
    ListUsersQueryHandler,
    GetSchoolQueryHandler,

    // ─── Infrastructure ───
    OutboxPublisher,
    { provide: PrismaOutboxRepository, useFactory: (prisma: PrismaService) => new PrismaOutboxRepository(prisma), inject: [PrismaService] },

    // ─── Repository ports → concrete implementations ───
    { provide: SCHOOL_REPOSITORY, useClass: PrismaSchoolRepository },
    { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
  ],
  exports: [
    AuthService, JwtService, SchoolService, UserService, RoleService,
    BranchService, PermissionService, OtpService,
    PermissionResolver, UnitOfWork,
    CommandBus, QueryBus,
    SCHOOL_REPOSITORY, USER_REPOSITORY, ROLE_REPOSITORY,
    BRANCH_REPOSITORY, PERMISSION_REPOSITORY,
  ],
})
export class IdentityModule implements OnModuleInit {
  constructor(
    private readonly translator: IdentityEventTranslator,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    // Register domain-event → integration-event translations.
    // Actor/tenant are not known at module init — the translator uses a
    // sentinel context that subscribers can override via headers at runtime.
    // For Wave 2.1 the translator captures the event payload itself which
    // already includes tenantId + createdBy — the ctx is only the fallback.
    this.translator.register({
      actorId: 'system',
      tenantId: 'platform',
    });
  }
}
