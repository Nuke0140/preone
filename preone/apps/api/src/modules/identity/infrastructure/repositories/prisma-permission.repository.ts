/**
 * PrismaPermissionRepository — read-only port for permission catalog.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import { PermissionEntity, type PermissionAction, type PermissionProps, type PermissionScope } from '../../domain/aggregates/permission.entity';

import type { PermissionRepository } from '../../domain/repositories/permission.repository';

@Injectable()
export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCode(code: string): Promise<PermissionEntity | undefined> {
    const row = await this.prisma.permission.findUnique({ where: { code } });
    return row ? this.toDomain(row) : undefined;
  }

  async findById(id: string): Promise<PermissionEntity | undefined> {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r));
  }

  async listByModule(moduleName: string): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany({
      where: { module: moduleName },
      orderBy: { code: 'asc' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async listAll(): Promise<PermissionEntity[]> {
    const rows = await this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }

  async bulkCreate(permissions: PermissionEntity[]): Promise<void> {
    if (permissions.length === 0) return;
    const data: Prisma.PermissionUncheckedCreateInput[] = permissions.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? null,
      module: p.module,
      action: p.action,
      resource: p.resource,
      scopeType: p.scopeType,
      isDangerous: p.isDangerous,
    }));
    // Upsert to be idempotent on re-runs
    await Promise.all(
      data.map((d) =>
        this.prisma.permission.upsert({
          where: { code: d.code },
          create: d,
          update: d,
        }),
      ),
    );
  }

  private toDomain(row: Prisma.PermissionGetPayload<{}>): PermissionEntity {
    const props: PermissionProps = {
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      module: row.module,
      action: row.action as PermissionAction,
      resource: row.resource,
      scopeType: row.scopeType as PermissionScope,
      isDangerous: row.isDangerous,
    };
    return PermissionEntity.create(props, row.id);
  }
}
