/**
 * PrismaRoleRepository — concrete implementation.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import type { Role as PrismaRole } from '@prisma/client';
import { RoleAggregate, type RoleProps, type RoleScope } from '../../domain/aggregates/role.aggregate';
import type { RoleRepository } from '../../domain/repositories/role.repository';

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

  async findByCode(tenantId: string, code: string): Promise<RoleAggregate | undefined> {
    const row = await this.prisma.role.findFirst({
      where: { schoolId: tenantId, code },
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
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(row: PrismaRole & { permissions: { permissionId: string }[] }): RoleAggregate {
    const props: RoleProps = {
      tenantId: row.schoolId ?? undefined,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      scope: row.scope as RoleScope,
      isSystem: row.isSystem,
      color: row.color ?? undefined,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      permissionIds: row.permissions.map((p) => p.permissionId),
    };
    return new RoleAggregate(props, row.id, row.version);
  }

  private toPersistence(a: RoleAggregate): any {
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
