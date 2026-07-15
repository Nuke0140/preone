/**
 * Identity Command Handlers — CQRS write side (BTD §12.2).
 *
 * Each handler:
 *   1. Loads aggregate(s) via repository
 *   2. Mutates aggregate (pure business logic in the aggregate)
 *   3. Saves aggregate via repository
 *   4. Returns minimal result (ID only — never read models)
 *   5. Domain events are dispatched after commit (by EventBusService)
 *
 * Per BTD §17.2 — Transaction Rules:
 *   - Aggregate = Transaction Boundary
 *   - Never call external services within transaction
 *   - Rollback on any exception
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  AuthenticationException, ConflictException, ValidationException,
} from '@common/errors/exceptions';
import {
  CommandBus, CommandHandler, type Command, type CommandMetadata,
} from '@shared/cqrs';

import {
  ChangeUserRolesCommand, CreateSchoolCommand, CreateUserCommand,
  type ChangeUserRolesPayload, type CreateSchoolPayload, type CreateUserPayload,
  type LoginPayload, type LoginResult,
} from '../../application/commands/identity.commands';
import { LoginCommand } from '../../application/commands/identity.commands';
import { UnitOfWork } from '../../application/unit-of-work';
import { EventBusService } from '@infra/event-bus/event-bus.service';

import { UserAggregate } from '../../domain/aggregates/user.aggregate';
import { SchoolAggregate } from '../../domain/aggregates/school.aggregate';
import {
  BRANCH_REPOSITORY, ROLE_REPOSITORY, SCHOOL_REPOSITORY, USER_REPOSITORY,
} from '../../domain/repositories/tokens';
import type { BranchRepository } from '../../domain/repositories/branch.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { SchoolRepository } from '../../domain/repositories/school.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';

import { AuthService } from '../services/auth.service';

// ─────────────────────────────────────────────
// LoginCommandHandler
// ─────────────────────────────────────────────

@Injectable()
export class LoginCommandHandler implements CommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginCommandHandler.name);
  private static readonly TYPE = 'Identity.Login';

  constructor(
    private readonly auth: AuthService,
    private readonly bus: CommandBus,
  ) {
    bus.register(LoginCommandHandler.TYPE, this);
  }

  async handle(command: LoginCommand): Promise<LoginResult> {
    this.logger.log(`LoginCommand for ${command.payload.email}`);
    return this.auth.loginWithPassword(command.payload, command.payload.ip);
  }
}

// ─────────────────────────────────────────────
// CreateUserCommandHandler
// ─────────────────────────────────────────────

@Injectable()
export class CreateUserCommandHandler implements CommandHandler<CreateUserCommand> {
  private readonly logger = new Logger(CreateUserCommandHandler.name);
  private static readonly TYPE = 'Identity.CreateUser';

  constructor(
    private readonly bus: CommandBus,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(BRANCH_REPOSITORY) private readonly branches: BranchRepository,
    private readonly uow: UnitOfWork,
    private readonly eventBus: EventBusService,
  ) {
    bus.register(CreateUserCommandHandler.TYPE, this);
  }

  async handle(command: CreateUserCommand): Promise<{ id: string }> {
    const { payload, metadata } = command;
    const tenantId = metadata.tenantId;

    // Pre-checks (outside UoW — they're reads)
    const existing = await this.users.findByEmail(payload.email);
    if (existing && existing.tenantId === tenantId) {
      throw new ConflictException(
        'USER_EMAIL_TAKEN',
        `User with email ${payload.email} already exists in this tenant.`,
      );
    }

    const tenantRoles = await this.roles.listAvailableForTenant(tenantId);
    const roleCodesAvailable = new Set(tenantRoles.map((r) => r.code));
    const invalid = payload.roles.filter((r) => !roleCodesAvailable.has(r));
    if (invalid.length > 0) {
      throw new ValidationException(`Invalid role codes: ${invalid.join(', ')}`, [
        { field: 'roles', code: 'INVALID_ROLE', message: `Unknown roles: ${invalid.join(', ')}` },
      ]);
    }

    let branchId: string | undefined;
    if (payload.branchCode) {
      const branch = await this.branches.findByCode(tenantId, payload.branchCode);
      if (!branch) {
        throw new ValidationException(`Invalid branch code: ${payload.branchCode}`, [
          { field: 'branchCode', code: 'INVALID_BRANCH', message: `Branch ${payload.branchCode} not found` },
        ]);
      }
      branchId = branch.id;
    }

    // Hash password (outside UoW — CPU-bound)
    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash(payload.password, { type: argon2.argon2id });

    // Create aggregate (pure domain logic)
    const aggregate = UserAggregate.create({
      tenantId,
      email: payload.email,
      phone: payload.phone,
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: payload.displayName,
      roles: payload.roles,
      branchId,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
    }, metadata.actorId);

    // Persist within UoW (transaction + outbox atomic)
    await this.uow.run(
      async ({ tx }) => {
        // Save aggregate — repo accepts optional tx for in-transaction saves
        await this.users.save(aggregate);
      },
      { tenant: { tenantId, userId: metadata.actorId } },
    );

    // After commit: dispatch domain events to in-process subscribers
    await this.eventBus.publishAll(aggregate.clearDomainEvents());

    this.logger.log(`CreateUserCommand → ${aggregate.id}`);
    return { id: aggregate.id };
  }
}

// ─────────────────────────────────────────────
// ChangeUserRolesCommandHandler
// ─────────────────────────────────────────────

@Injectable()
export class ChangeUserRolesCommandHandler implements CommandHandler<ChangeUserRolesCommand> {
  private readonly logger = new Logger(ChangeUserRolesCommandHandler.name);
  private static readonly TYPE = 'Identity.ChangeUserRoles';

  constructor(
    private readonly bus: CommandBus,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly uow: UnitOfWork,
    private readonly eventBus: EventBusService,
  ) {
    bus.register(ChangeUserRolesCommandHandler.TYPE, this);
  }

  async handle(command: ChangeUserRolesCommand): Promise<{ id: string; newPermissionsVersion: number }> {
    const { payload, metadata } = command;

    const user = await this.users.findById(payload.userId);
    if (!user) {
      throw new ConflictException('USER_NOT_FOUND', `User ${payload.userId} not found`);
    }

    user.changeRoles(payload.roles);

    await this.uow.run(
      async () => {
        await this.users.save(user);
      },
      { tenant: { tenantId: metadata.tenantId, userId: metadata.actorId } },
    );

    await this.eventBus.publishAll(user.clearDomainEvents());

    return { id: user.id, newPermissionsVersion: user.permissionsVersion };
  }
}

// ─────────────────────────────────────────────
// CreateSchoolCommandHandler
// ─────────────────────────────────────────────

@Injectable()
export class CreateSchoolCommandHandler implements CommandHandler<CreateSchoolCommand> {
  private readonly logger = new Logger(CreateSchoolCommandHandler.name);
  private static readonly TYPE = 'Identity.CreateSchool';

  constructor(
    private readonly bus: CommandBus,
    @Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository,
    private readonly uow: UnitOfWork,
    private readonly eventBus: EventBusService,
  ) {
    bus.register(CreateSchoolCommandHandler.TYPE, this);
  }

  async handle(command: CreateSchoolCommand): Promise<{ id: string }> {
    const { payload, metadata } = command;

    // Build aggregate (enforces tier → maxBranches + studentSeats invariants)
    const tierLimits: Record<typeof payload.tier, { maxBranches: number; studentSeats: number }> = {
      STARTER: { maxBranches: 1, studentSeats: 200 },
      GROWTH: { maxBranches: 3, studentSeats: 800 },
      SCALE: { maxBranches: 10, studentSeats: 3000 },
      ENTERPRISE: { maxBranches: 50, studentSeats: 15000 },
    };
    const limits = tierLimits[payload.tier];
    const school = SchoolAggregate.create({
      name: payload.name,
      legalName: payload.legalName,
      email: payload.email,
      phone: payload.phone,
      website: payload.website,
      tier: payload.tier,
      maxBranches: limits.maxBranches,
      studentSeats: limits.studentSeats,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
    }, metadata.actorId);

    await this.uow.run(
      async () => {
        await this.schools.save(school);
      },
      // Platform-level command — no tenant context
      {},
    );

    await this.eventBus.publishAll(school.clearDomainEvents());

    this.logger.log(`CreateSchoolCommand → ${school.id} (${payload.tier})`);
    return { id: school.id };
  }
}
