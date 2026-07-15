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
 *   - School (tenant) CRUD
 *   - Branch CRUD
 *   - User CRUD (staff + parent)
 *   - Role / Permission management
 *   - User-role assignments (scoped)
 *   - Authentication (login, OTP, refresh)
 *   - Session management
 */
import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { SchoolsController } from './controllers/schools.controller';
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';

import { AuthService } from './application/services/auth.service';
import { SchoolService } from './application/services/school.service';
import { UserService } from './application/services/user.service';
import { RoleService } from './application/services/role.service';

import { PrismaSchoolRepository } from './infrastructure/repositories/prisma-school.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaRoleRepository } from './infrastructure/repositories/prisma-role.repository';
import { SCHOOL_REPOSITORY, USER_REPOSITORY, ROLE_REPOSITORY } from './domain/repositories/tokens';

import { JwtService } from './application/services/jwt.service';
import { OtpService } from './application/services/otp.service';

@Module({
  controllers: [AuthController, SchoolsController, UsersController, RolesController, PermissionsController],
  providers: [
    // Application services
    AuthService,
    SchoolService,
    UserService,
    RoleService,
    JwtService,
    OtpService,

    // Repository ports → concrete implementations
    { provide: SCHOOL_REPOSITORY, useClass: PrismaSchoolRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
  ],
  exports: [AuthService, JwtService, SCHOOL_REPOSITORY, USER_REPOSITORY],
})
export class IdentityModule {}
