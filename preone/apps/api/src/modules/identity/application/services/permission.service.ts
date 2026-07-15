/**
 * PermissionService — read-only catalog lookup + seeding.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { NotFoundException } from '@common/errors/exceptions';

import { PermissionEntity } from '../../domain/aggregates/permission.entity';
import { ALL_PERMISSIONS, DEFAULT_ROLES } from '../../domain/permission-catalog';
import { PERMISSION_REPOSITORY } from '../../domain/repositories/tokens';

import type { PermissionRepository } from '../../domain/repositories/permission.repository';
import type { PermissionResponseDto, PermissionGroupDto } from '../dto/permission.dto';

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(@Inject(PERMISSION_REPOSITORY) private readonly permissions: PermissionRepository) {}

  async listAll(): Promise<PermissionResponseDto[]> {
    const perms = await this.permissions.listAll();
    return perms.map((p) => this.toResponse(p));
  }

  async listGrouped(): Promise<PermissionGroupDto[]> {
    const perms = await this.permissions.listAll();
    const grouped = new Map<string, PermissionResponseDto[]>();
    for (const p of perms) {
      const list = grouped.get(p.module) ?? [];
      list.push(this.toResponse(p));
      grouped.set(p.module, list);
    }
    return Array.from(grouped.entries()).map(([module, permissions]) => ({ module, permissions }));
  }

  async listByModule(moduleName: string): Promise<PermissionResponseDto[]> {
    const perms = await this.permissions.listByModule(moduleName);
    return perms.map((p) => this.toResponse(p));
  }

  async getByCode(code: string): Promise<PermissionResponseDto> {
    const p = await this.permissions.findByCode(code);
    if (!p) throw new NotFoundException('Permission', code);
    return this.toResponse(p);
  }

  /**
   * Seed all default permissions from catalog (idempotent via upsert).
   */
  async seedDefaults(): Promise<{ permissions: number; roles: number }> {
    // Seed permissions
    const permissionEntities = ALL_PERMISSIONS.map((seed) =>
      PermissionEntity.create({
        code: seed.code,
        name: seed.name,
        description: seed.description,
        module: seed.module,
        action: seed.action as any,
        resource: seed.resource,
        scopeType: seed.scopeType as any,
        isDangerous: seed.isDangerous,
      }),
    );
    await this.permissions.bulkCreate(permissionEntities);
    this.logger.log(`Seeded ${permissionEntities.length} permissions`);
    return { permissions: permissionEntities.length, roles: DEFAULT_ROLES.length };
  }

  private toResponse(p: PermissionEntity): PermissionResponseDto {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      module: p.module,
      action: p.action,
      resource: p.resource,
      scopeType: p.scopeType,
      isDangerous: p.isDangerous,
    };
  }
}
