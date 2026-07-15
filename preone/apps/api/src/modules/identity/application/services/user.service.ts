/**
 * UserService — orchestrates user lifecycle.
 *
 * Per BTD §9: Application service coordinates aggregate state + publishes events.
 * Per BRC v1.0:
 *   - R-HR-001: Unique email per tenant
 *   - R-OPS-014: Audit log on every user status change
 *   - R-APR-006: Multi-level approval matrix for sensitive operations
 *
 * Per BTD §16.4: Permissions cache invalidated via permissionsVersion bump.
 */
import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

import {
  BusinessException, NotFoundException, ConflictException, ValidationException,
} from '@common/errors/exceptions';

import { UserAggregate, type UserStatus } from '../../domain/aggregates/user.aggregate';
import { USER_REPOSITORY, ROLE_REPOSITORY, BRANCH_REPOSITORY } from '../../domain/repositories/tokens';
import { UserStatusDto } from '../dto/user.dto';

import type { BranchRepository } from '../../domain/repositories/branch.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type {
  CreateUserDto, UpdateUserDto, UpdateMyProfileDto,
  ChangeUserRolesDto, ListUsersQueryDto, UserResponseDto, PaginatedUsersDto,
} from '../dto/user.dto';


const argon2Hash = async (password: string): Promise<string> => {
  return argon2.hash(password, { type: argon2.argon2id });
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(BRANCH_REPOSITORY) private readonly branches: BranchRepository,
  ) {}

  async createUser(dto: CreateUserDto, tenantId: string, createdBy: string): Promise<UserResponseDto> {
    // Pre-check: unique email within tenant
    const existing = await this.users.findByEmail(dto.email);
    if (existing && existing.tenantId === tenantId) {
      throw new ConflictException('USER_EMAIL_TAKEN', `User with email ${dto.email} already exists in this tenant.`);
    }

    // Validate role codes exist for this tenant
    const tenantRoles = await this.roles.listAvailableForTenant(tenantId);
    const roleCodesAvailable = new Set(tenantRoles.map((r) => r.code));
    const invalidRoles = dto.roles.filter((r) => !roleCodesAvailable.has(r));
    if (invalidRoles.length > 0) {
      throw new ValidationException(`Invalid role codes: ${invalidRoles.join(', ')}`, [
        { field: 'roles', code: 'INVALID_ROLE', message: `Unknown role codes: ${invalidRoles.join(', ')}` },
      ]);
    }

    // Resolve branchCode → branchId if provided
    let branchId: string | undefined;
    if (dto.branchCode) {
      const branch = await this.branches.findByCode(tenantId, dto.branchCode);
      if (!branch) {
        throw new ValidationException(`Invalid branch code: ${dto.branchCode}`, [
          { field: 'branchCode', code: 'INVALID_BRANCH', message: `Branch ${dto.branchCode} not found` },
        ]);
      }
      branchId = branch.id;
    }

    // Hash password
    const passwordHash = await argon2Hash(dto.password);

    const aggregate = UserAggregate.create({
      tenantId,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      branchId,
      roles: dto.roles,
      status: dto.status ?? UserStatusDto.PENDING,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      mfaEnabled: false,
    }, createdBy);

    await this.users.save(aggregate);

    // Persist role assignments
    const roleIds = tenantRoles
      .filter((r) => dto.roles.includes(r.code))
      .map((r) => r.id);
    await this.users.saveRoles(aggregate.id, roleIds, createdBy, tenantId, branchId);

    this.logger.log(`User created: ${aggregate.id} (${aggregate.email}) by ${createdBy}`);
    return this.toResponse(aggregate);
  }

  async getUser(id: string, tenantId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt || user.tenantId !== tenantId) {
      throw new NotFoundException('User', id);
    }
    return this.toResponse(user);
  }

  async listUsers(query: ListUsersQueryDto, tenantId: string): Promise<PaginatedUsersDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const result = await this.users.list({
      tenantId,
      branchId: query.branchId,
      status: query.status,
      role: query.role,
      search: query.search,
    }, page, pageSize);
    return {
      items: result.items.map((u) => this.toResponse(u)),
      total: result.total,
      page,
      pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  async updateUser(id: string, dto: UpdateUserDto, tenantId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt || user.tenantId !== tenantId) {
      throw new NotFoundException('User', id);
    }

    if (dto.branchCode !== undefined) {
      if (dto.branchCode === '') {
        user.setBranch(undefined);
      } else {
        const branch = await this.branches.findByCode(tenantId, dto.branchCode);
        if (!branch) {
          throw new ValidationException(`Invalid branch code: ${dto.branchCode}`, [
            { field: 'branchCode', code: 'INVALID_BRANCH', message: `Branch ${dto.branchCode} not found` },
          ]);
        }
        user.setBranch(branch.id);
      }
    }

    user.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      phone: dto.phone,
    });

    if (dto.status && dto.status !== user.status) {
      const now = new Date().toISOString();
      switch (dto.status) {
        case UserStatusDto.ACTIVE: user.activate(now); break;
        case UserStatusDto.SUSPENDED: user.suspend('Manual suspension', now); break;
        case UserStatusDto.DEACTIVATED: user.deactivate(now); break;
      }
    }

    await this.users.save(user);
    return this.toResponse(user);
  }

  async deleteUser(id: string, tenantId: string): Promise<{ deleted: true }> {
    const user = await this.users.findById(id);
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User', id);
    }
    user.softDelete(new Date().toISOString());
    await this.users.save(user);
    // Also clear role assignments
    await this.users.saveRoles(id, [], id, tenantId);
    this.logger.log(`User soft-deleted: ${id}`);
    return { deleted: true };
  }

  async changeUserRoles(id: string, dto: ChangeUserRolesDto, tenantId: string, assignedBy: string): Promise<UserResponseDto> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt || user.tenantId !== tenantId) {
      throw new NotFoundException('User', id);
    }

    // Validate role codes
    const tenantRoles = await this.roles.listAvailableForTenant(tenantId);
    const roleCodesAvailable = new Set(tenantRoles.map((r) => r.code));
    const invalidRoles = dto.roleCodes.filter((r) => !roleCodesAvailable.has(r));
    if (invalidRoles.length > 0) {
      throw new ValidationException(`Invalid role codes: ${invalidRoles.join(', ')}`, [
        { field: 'roleCodes', code: 'INVALID_ROLE', message: `Unknown role codes: ${invalidRoles.join(', ')}` },
      ]);
    }

    // Mutate aggregate (bumps permissionsVersion)
    user.changeRoles(dto.roleCodes);

    await this.users.save(user);

    // Persist role assignments (replace strategy)
    const roleIds = tenantRoles
      .filter((r) => dto.roleCodes.includes(r.code))
      .map((r) => r.id);
    await this.users.saveRoles(user.id, roleIds, assignedBy, tenantId, user.branchId);

    this.logger.log(`User roles changed: ${user.id} → [${dto.roleCodes.join(', ')}] by ${assignedBy}`);
    return this.toResponse(user);
  }

  async getMyProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('User', userId);
    }
    return this.toResponse(user);
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('User', userId);
    }
    user.updateProfile({
      firstName: dto.firstName,
      lastName: dto.lastName,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      locale: dto.locale,
      timezone: dto.timezone,
    });
    await this.users.save(user);
    return this.toResponse(user);
  }

  async recordLogin(userId: string, ip: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;
    const sessionId = randomUUID();
    user.recordLogin(ip, sessionId, new Date().toISOString());
    await this.users.save(user);
  }

  // ─────── Mapper ───────
  private toResponse(a: UserAggregate): UserResponseDto {
    return {
      id: a.id,
      email: a.email,
      phone: a.phone,
      firstName: a.firstName,
      lastName: a.lastName,
      displayName: a.displayName,
      avatarUrl: a.avatarUrl,
      status: a.status as UserStatusDto,
      roles: a.roles,
      permissionsVersion: a.permissionsVersion,
      branchId: a.branchId,
      lastLoginAt: a.lastLoginAt,
      emailVerifiedAt: a.emailVerifiedAt,
      phoneVerifiedAt: a.phoneVerifiedAt,
      mfaEnabled: a.mfaEnabled,
      locale: a.locale,
      timezone: a.timezone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
