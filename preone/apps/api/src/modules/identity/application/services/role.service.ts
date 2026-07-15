/**
 * RoleService — orchestrates role lifecycle + permission grants.
 *
 * Per BRC v1.0:
 *   - R-APR-001: Approval matrix role — system roles immutable
 *   - R-HR-012: System roles cannot be deleted
 * Per BTD §16.4: Grant/revoke bumps permissionsVersion of all assigned users.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  NotFoundException, ConflictException, ValidationException, BusinessException,
} from '@common/errors/exceptions';

import { RoleAggregate, type RoleScope } from '../../domain/aggregates/role.aggregate';
import { ROLE_REPOSITORY, PERMISSION_REPOSITORY, USER_REPOSITORY } from '../../domain/repositories/tokens';

import type { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { RoleRepository } from '../../domain/repositories/role.repository';
import type { UserRepository } from '../../domain/repositories/user.repository';
import type {
  CreateRoleDto, UpdateRoleDto, GrantPermissionsDto, RoleResponseDto,
} from '../dto/role.dto';
import type { RoleScopeDto } from '../dto/role.dto';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async createRole(dto: CreateRoleDto, tenantId: string, createdBy: string): Promise<RoleResponseDto> {
    // Pre-check: unique code within tenant
    const existing = await this.roles.findByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictException('ROLE_CODE_TAKEN', `Role with code ${dto.code} already exists in this tenant.`);
    }

    // Validate permission codes exist
    const invalidPerms: string[] = [];
    for (const code of dto.permissions) {
      const p = await this.permissions.findByCode(code);
      if (!p) invalidPerms.push(code);
    }
    if (invalidPerms.length > 0) {
      throw new ValidationException(`Invalid permission codes: ${invalidPerms.join(', ')}`, [
        { field: 'permissions', code: 'INVALID_PERMISSION', message: `Unknown permission codes: ${invalidPerms.join(', ')}` },
      ]);
    }

    const aggregate = RoleAggregate.create({
      tenantId,
      code: dto.code,
      name: dto.name,
      description: dto.description,
      scope: dto.scope,
      isSystem: false,
      color: dto.color,
      sortOrder: dto.sortOrder ?? 100,
    }, createdBy);

    await this.roles.save(aggregate);

    // Grant permissions
    if (dto.permissions.length > 0) {
      const permIds: string[] = [];
      for (const code of dto.permissions) {
        const p = await this.permissions.findByCode(code);
        if (p) permIds.push(p.id);
      }
      await this.roles.savePermissions(aggregate.id, permIds, createdBy);
      // Mutate aggregate so events are raised (saved again)
      for (const pid of permIds) aggregate.grantPermission(pid, createdBy);
      aggregate.permissionIds; // touch
      await this.roles.save(aggregate);
    }

    this.logger.log(`Role created: ${aggregate.id} (${aggregate.code}) by ${createdBy}`);
    return this.toResponse(aggregate);
  }

  async getRole(id: string): Promise<RoleResponseDto> {
    const role = await this.roles.findById(id);
    if (!role || role.deletedAt) {
      throw new NotFoundException('Role', id);
    }
    return this.toResponse(role);
  }

  async listRoles(tenantId: string): Promise<RoleResponseDto[]> {
    const roles = await this.roles.listAvailableForTenant(tenantId);
    return Promise.all(roles.map((r) => this.toResponse(r)));
  }

  async listSystemRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.roles.listSystemRoles();
    return Promise.all(roles.map((r) => this.toResponse(r)));
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roles.findById(id);
    if (!role || role.deletedAt) {
      throw new NotFoundException('Role', id);
    }
    if (role.isSystem) {
      throw new BusinessException('ROLE_SYSTEM_IMMUTABLE', 'System roles cannot be modified.');
    }
    role.updateProfile({
      name: dto.name,
      description: dto.description,
      color: dto.color,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
    await this.roles.save(role);
    return this.toResponse(role);
  }

  async deleteRole(id: string): Promise<{ deleted: true }> {
    const role = await this.roles.findById(id);
    if (!role || role.deletedAt) {
      throw new NotFoundException('Role', id);
    }
    role.delete(new Date().toISOString()); // throws if isSystem
    await this.roles.save(role);
    this.logger.log(`Role deleted: ${id}`);
    return { deleted: true };
  }

  async grantPermissions(id: string, dto: GrantPermissionsDto, grantedBy: string): Promise<RoleResponseDto> {
    const role = await this.roles.findById(id);
    if (!role || role.deletedAt) {
      throw new NotFoundException('Role', id);
    }

    // Validate permission codes
    const permIds: string[] = [];
    const invalidPerms: string[] = [];
    for (const code of dto.permissionCodes) {
      const p = await this.permissions.findByCode(code);
      if (p) permIds.push(p.id);
      else invalidPerms.push(code);
    }
    if (invalidPerms.length > 0) {
      throw new ValidationException(`Invalid permission codes: ${invalidPerms.join(', ')}`, [
        { field: 'permissionCodes', code: 'INVALID_PERMISSION', message: `Unknown: ${invalidPerms.join(', ')}` },
      ]);
    }

    // Mutate aggregate
    for (const pid of permIds) role.grantPermission(pid, grantedBy);
    await this.roles.save(role);

    // Persist via replace strategy
    const allIds = role.permissionIds;
    await this.roles.savePermissions(role.id, allIds, grantedBy);

    this.logger.log(`Permissions granted to role ${role.id}: [${dto.permissionCodes.join(', ')}] by ${grantedBy}`);
    return this.toResponse(role);
  }

  // ─────── Mapper ───────
  async toResponse(a: RoleAggregate): Promise<RoleResponseDto> {
    // Resolve permission ids → codes (lazy)
    const perms = a.permissionIds.length > 0
      ? await this.permissions.findByIds(a.permissionIds)
      : [];
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      scope: a.scope as RoleScopeDto,
      isSystem: a.isSystem,
      permissions: perms.map((p) => p.code),
      color: a.color,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
