/**
 * PrismaRoleRepository — concrete implementation.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import { RoleAggregate, type RoleProps, type RoleScope } from '../../domain/aggregates/role.aggregate';

import type { RoleRepository } from '../../domain/repositories/role.repository';

type PrismaRoleWithPerms = Prisma.RoleGetPayload<{
  include: { permissions: true };
}>;

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RoleAggregate | undefined> {
    const row = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<RoleAggregate[]> {
    const rows = await this.prisma.role.findMany({
      where: { id: { in: [...ids] } },
      include: { permissions: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByCode(tenantId: string | undefined, code: string): Promise<RoleAggregate | undefined> {
    const row = await this.prisma.role.findFirst({
      where: {
        code,
        ...(tenantId ? { schoolId: tenantId } : { schoolId: null }),
      },
      include: { permissions: true },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async listByTenant(tenantId: string): Promise<RoleAggregate[]> {
    const rows = await this.prisma.role.findMany({
      where: { schoolId: tenantId, deletedAt: null, isActive: true },
      include: { permissions: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listSystemRoles(): Promise<RoleAggregate[]> {
    const rows = await this.prisma.role.findMany({
      where: { isSystem: true, deletedAt: null, schoolId: null },
      include: { permissions: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listAvailableForTenant(tenantId: string): Promise<RoleAggregate[]> {
    // Tenant gets: its own custom roles + system roles (schoolId IS NULL)
    const rows = await this.prisma.role.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ schoolId: tenantId }, { schoolId: null }],
      },
      include: { permissions: true },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.role.count({ where: { id } });
    return c > 0;
  }

  async save(aggregate: RoleAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.role.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });
  }

  async delete(aggregate: RoleAggregate): Promise<void> {
    await this.prisma.role.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async savePermissions(roleId: string, permissionIds: string[], grantedBy: string): Promise<void> {
    // Replace strategy: delete existing grants, insert new ones
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (permissionIds.length === 0) return;
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
        grantedBy,
      })),
    });
  }

  // ─────── Mappers ───────

  private toDomain(row: PrismaRoleWithPerms): RoleAggregate {
    const props: RoleProps = {
      tenantId: row.schoolId ?? undefined,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      scope: row.scope,
      isSystem: row.isSystem,
      color: row.color ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      permissionIds: row.permissions.map((p) => p.permissionId),
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new RoleAggregate(props, row.id, row.version);
  }

  private toPersistence(a: RoleAggregate): Prisma.RoleUncheckedCreateInput {
    return {
      id: a.id,
      schoolId: a.tenantId ?? null,
      code: a.code,
      name: a.name,
      description: a.description ?? null,
      scope: a.scope,
      isSystem: a.isSystem,
      color: a.color ?? null,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
      version: a.version,
      updatedAt: new Date(),
    };
  }
}
