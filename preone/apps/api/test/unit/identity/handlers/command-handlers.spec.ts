/**
 * Unit tests for Identity Command Handlers — CQRS write side (BTD §12.2).
 *
 * Mocks: UserRepository, RoleRepository, BranchRepository, SchoolRepository,
 *        UnitOfWork, EventBusService, AuthService.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CommandBus } from '@shared/cqrs';
import { EventBusService } from '@infra/event-bus/event-bus.service';

import {
  CreateUserCommand, CreateSchoolCommand, ChangeUserRolesCommand,
  type CreateUserPayload, type CreateSchoolPayload,
} from '@modules/identity/application/commands/identity.commands';
import {
  CreateUserCommandHandler, CreateSchoolCommandHandler,
  ChangeUserRolesCommandHandler,
} from '@modules/identity/application/handlers/identity-command-handlers';
import { UnitOfWork } from '@modules/identity/application/unit-of-work';
import { UserAggregate } from '@modules/identity/domain/aggregates/user.aggregate';

import * as argon2 from 'argon2';

const PASSWORD_HASH = await argon2.hash('Password@123', { type: argon2.argon2id });

// ─────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────

function mockUoW() {
  return {
    run: vi.fn(async (work: (ctx: unknown) => Promise<unknown>) => work({ tx: {}, outbox: { enqueue: vi.fn() } })),
  } as unknown as UnitOfWork;
}

function mockEventBus() {
  return {
    publishAll: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
    subscribe: vi.fn(),
  } as unknown as EventBusService;
}

function mockUsers(userMap = new Map<string, UserAggregate>()) {
  return {
    findById: vi.fn(async (id: string) => userMap.get(id)),
    findByEmail: vi.fn(async () => undefined),
    findByPhone: vi.fn(async () => undefined),
    save: vi.fn(async (u: UserAggregate) => { userMap.set(u.id, u); }),
    delete: vi.fn(async () => undefined),
    exists: vi.fn(async () => false),
    findByIds: vi.fn(async () => []),
    loadRoleCodes: vi.fn(async () => []),
    saveRoles: vi.fn(async () => undefined),
    loadPermissionCodes: vi.fn(async () => []),
    findByTenant: vi.fn(async () => ({ items: [], total: 0 })),
    list: vi.fn(async () => ({ items: [], total: 0 })),
  };
}

function mockRoles() {
  return {
    listAvailableForTenant: vi.fn(async () => [
      { id: 'r1', code: 'SCHOOL_ADMIN' },
      { id: 'r2', code: 'PRINCIPAL' },
      { id: 'r3', code: 'CLASS_TEACHER' },
    ]),
    findById: vi.fn(async () => undefined),
    findByCode: vi.fn(async () => undefined),
    list: vi.fn(async () => ({ items: [], total: 0 })),
    save: vi.fn(async () => undefined),
    grantPermissions: vi.fn(async () => undefined),
  };
}

function mockBranches() {
  return {
    findByCode: vi.fn(async (_t: string, code: string) => ({
      id: 'branch-001', code, name: 'Main Branch',
    })),
    findById: vi.fn(async () => undefined),
    list: vi.fn(async () => ({ items: [], total: 0 })),
    save: vi.fn(async () => undefined),
  };
}

function mockSchools(schoolMap = new Map<string, any>()) {
  return {
    findById: vi.fn(async (id: string) => schoolMap.get(id)),
    save: vi.fn(async (s: any) => { schoolMap.set(s.id, s); }),
    list: vi.fn(async () => ({ items: [], total: 0 })),
    findByEmail: vi.fn(async () => undefined),
  };
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

describe('CreateUserCommandHandler — BTD §12.2', () => {
  let bus: CommandBus;
  let users: ReturnType<typeof mockUsers>;
  let roles: ReturnType<typeof mockRoles>;
  let branches: ReturnType<typeof mockBranches>;
  let uow: UnitOfWork;
  let eventBus: EventBusService;
  let handler: CreateUserCommandHandler;

  beforeEach(() => {
    bus = new CommandBus();
    users = mockUsers();
    roles = mockRoles();
    branches = mockBranches();
    uow = mockUoW();
    eventBus = mockEventBus();
    handler = new CreateUserCommandHandler(bus, users as any, roles as any, branches as any, uow, eventBus);
  });

  it('should be registered on the CommandBus', () => {
    // Handler registers itself in constructor with its TYPE string
    expect((bus as any).handlers.get('Identity.CreateUser')).toBe(handler);
  });

  it('should create a user and return its ID', async () => {
    const payload: CreateUserPayload = {
      email: 'new.user@school.com',
      password: 'Password@123',
      firstName: 'New',
      lastName: 'User',
      roles: ['SCHOOL_ADMIN'],
    };

    const result = await handler.handle(new CreateUserCommand(payload, {
      actorId: 'admin-001',
      tenantId: 'sch-001',
    }));

    expect(result).toHaveProperty('id');
    expect(users.save).toHaveBeenCalled();
  });

  it('should reject duplicate email within tenant', async () => {
    const existing = UserAggregate.create({
      tenantId: 'sch-001',
      email: 'dup@school.com',
      firstName: 'A', lastName: 'B',
      roles: ['SCHOOL_ADMIN'],
      passwordHash: PASSWORD_HASH,
      locale: 'en-IN', timezone: 'Asia/Kolkata',
    }, 'admin-001');
    users.findByEmail.mockResolvedValueOnce(existing);

    await expect(handler.handle(new CreateUserCommand({
      email: 'dup@school.com',
      password: 'Password@123',
      firstName: 'X', lastName: 'Y',
      roles: ['SCHOOL_ADMIN'],
    }, { actorId: 'admin-001', tenantId: 'sch-001' }))).rejects.toThrow();
  });

  it('should reject invalid role codes', async () => {
    await expect(handler.handle(new CreateUserCommand({
      email: 'x@school.com',
      password: 'Password@123',
      firstName: 'X', lastName: 'Y',
      roles: ['INVALID_ROLE'],
    }, { actorId: 'admin-001', tenantId: 'sch-001' }))).rejects.toThrow();
  });

  it('should reject invalid branch code', async () => {
    branches.findByCode.mockResolvedValueOnce(undefined);
    await expect(handler.handle(new CreateUserCommand({
      email: 'x@school.com',
      password: 'Password@123',
      firstName: 'X', lastName: 'Y',
      roles: ['SCHOOL_ADMIN'],
      branchCode: 'NOPE',
    }, { actorId: 'admin-001', tenantId: 'sch-001' }))).rejects.toThrow();
  });

  it('should dispatch domain events after commit', async () => {
    const payload: CreateUserPayload = {
      email: 'event.test@school.com',
      password: 'Password@123',
      firstName: 'Event', lastName: 'Test',
      roles: ['SCHOOL_ADMIN'],
    };

    await handler.handle(new CreateUserCommand(payload, {
      actorId: 'admin-001', tenantId: 'sch-001',
    }));

    expect(eventBus.publishAll).toHaveBeenCalled();
    const events = (eventBus.publishAll as any).mock.calls[0][0];
    expect(events.some((e: any) => e.eventType === 'UserCreatedEvent')).toBe(true);
  });
});

describe('ChangeUserRolesCommandHandler — BTD §12.2', () => {
  let bus: CommandBus;
  let users: ReturnType<typeof mockUsers>;
  let uow: UnitOfWork;
  let eventBus: EventBusService;
  let handler: ChangeUserRolesCommandHandler;

  beforeEach(() => {
    bus = new CommandBus();
    const userMap = new Map<string, UserAggregate>();
    users = mockUsers(userMap);
    uow = mockUoW();
    eventBus = mockEventBus();
    handler = new ChangeUserRolesCommandHandler(bus, users as any, uow, eventBus);
  });

  it('should bump permissionsVersion on role change', async () => {
    const user = UserAggregate.create({
      tenantId: 'sch-001',
      email: 'role.change@school.com',
      firstName: 'Role', lastName: 'Change',
      roles: ['SCHOOL_ADMIN'],
      passwordHash: PASSWORD_HASH,
      locale: 'en-IN', timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    }, 'admin-001');
    (users.findById as any).mockResolvedValueOnce(user);
    const initialVersion = user.permissionsVersion;

    const result = await handler.handle(new ChangeUserRolesCommand({
      userId: user.id,
      roles: ['SCHOOL_ADMIN', 'PRINCIPAL'],
    }, { actorId: 'admin-001', tenantId: 'sch-001' }));

    expect(result.newPermissionsVersion).toBe(initialVersion + 1);
    expect(user.roles).toEqual(['SCHOOL_ADMIN', 'PRINCIPAL']);
  });

  it('should not bump version if roles unchanged', async () => {
    const user = UserAggregate.create({
      tenantId: 'sch-001', email: 'x@y.com',
      firstName: 'A', lastName: 'B',
      roles: ['SCHOOL_ADMIN'],
      passwordHash: PASSWORD_HASH,
      locale: 'en-IN', timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
    }, 'admin-001');
    (users.findById as any).mockResolvedValueOnce(user);
    const before = user.permissionsVersion;

    await handler.handle(new ChangeUserRolesCommand({
      userId: user.id, roles: ['SCHOOL_ADMIN'],
    }, { actorId: 'admin-001', tenantId: 'sch-001' }));

    expect(user.permissionsVersion).toBe(before);
  });

  it('should throw if user not found', async () => {
    (users.findById as any).mockResolvedValueOnce(undefined);
    await expect(handler.handle(new ChangeUserRolesCommand({
      userId: 'nonexistent', roles: ['SCHOOL_ADMIN'],
    }, { actorId: 'admin-001', tenantId: 'sch-001' }))).rejects.toThrow();
  });
});

describe('CreateSchoolCommandHandler — BTD §12.2', () => {
  let bus: CommandBus;
  let schools: ReturnType<typeof mockSchools>;
  let uow: UnitOfWork;
  let eventBus: EventBusService;
  let handler: CreateSchoolCommandHandler;

  beforeEach(() => {
    bus = new CommandBus();
    schools = mockSchools();
    uow = mockUoW();
    eventBus = mockEventBus();
    handler = new CreateSchoolCommandHandler(bus, schools as any, uow, eventBus);
  });

  it('should create a school and return its ID', async () => {
    const payload: CreateSchoolPayload = {
      name: 'Sunrise Public School',
      email: 'admin@sunrise.edu.in',
      phone: '+919876543210',
      tier: 'STARTER',
    };

    const result = await handler.handle(new CreateSchoolCommand(payload, {
      actorId: 'platform-admin-001',
      tenantId: 'platform',
    }));

    expect(result).toHaveProperty('id');
    expect(schools.save).toHaveBeenCalled();
  });

  it('should dispatch SchoolCreatedEvent after commit', async () => {
    await handler.handle(new CreateSchoolCommand({
      name: 'Test School', email: 't@s.edu', phone: '+919999999999', tier: 'GROWTH',
    }, { actorId: 'platform-admin-001', tenantId: 'platform' }));

    expect(eventBus.publishAll).toHaveBeenCalled();
    const events = (eventBus.publishAll as any).mock.calls[0][0];
    expect(events.some((e: any) => e.eventType === 'SchoolCreatedEvent')).toBe(true);
  });
});
