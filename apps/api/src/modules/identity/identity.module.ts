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
 * This module owns:
 *   - School (tenant) CRUD + lifecycle (PROSPECT → TRIAL → ACTIVE → SUSPENDED → CANCELLED)
 *   - Branch CRUD (within a school)
 *   - User CRUD (staff + parent)
 *   - Role / Permission management + RBAC matrix
 *   - User-role assignments (scoped)
 *   - Authentication (login, OTP, refresh)
 *   - Session management
 */
import { Module } from '@nestjs/common';

import { AuthService } from './application/services/auth.service';
import { BranchService } from './application/services/branch.service';
import { JwtService } from './application/services/jwt.service';
import { OtpService } from './application/services/otp.service';
import { PermissionService } from './application/services/permission.service';
import { RoleService } from './application/services/role.service';
import { SchoolService } from './application/services/school.service';
import { UserService } from './application/services/user.service';
import { AuthController } from './controllers/auth.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { SchoolsController } from './controllers/schools.controller';
import { UsersController } from './controllers/users.controller';
import { BranchesController } from './controllers/branches.controller';
import {
  SCHOOL_REPOSITORY, BRANCH_REPOSITORY, USER_REPOSITORY, ROLE_REPOSITORY,
  PERMISSION_REPOSITORY,
} from './domain/repositories/tokens';
import { PrismaBranchRepository } from './infrastructure/repositories/prisma-branch.repository';
import { PrismaPermissionRepository } from './infrastructure/repositories/prisma-permission.repository';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { PrismaSchoolRepository } from './infrastructure/repositories/prisma-school.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

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
    // Application services
    AuthService,
    SchoolService,
    UserService,
    RoleService,
    BranchService,
    PermissionService,
    JwtService,
    OtpService,

    // Repository ports → concrete implementations
    { provide: SCHOOL_REPOSITORY, useClass: PrismaSchoolRepository },
    { provide: BRANCH_REPOSITORY, useClass: PrismaBranchRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: PERMISSION_REPOSITORY, useClass: PrismaPermissionRepository },
  ],
  exports: [
    AuthService, JwtService, SchoolService, UserService, RoleService,
    BranchService, PermissionService, OtpService,
    SCHOOL_REPOSITORY, USER_REPOSITORY, ROLE_REPOSITORY,
    BRANCH_REPOSITORY, PERMISSION_REPOSITORY,
  ],
})
export class IdentityModule {}
