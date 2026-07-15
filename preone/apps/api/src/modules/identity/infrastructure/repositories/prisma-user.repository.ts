/**
 * PrismaUserRepository — concrete implementation backed by Prisma.
 *
 * Per ERD v3.0 §5.2: All tenant-scoped queries MUST run within
 *   `prisma.withTenant({ tenantId, userId }, ...)` so RLS policies filter rows.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import { UserAggregate, type UserProps, type UserStatus } from '../../domain/aggregates/user.aggregate';

import type { UserListFilter, UserRepository } from '../../domain/repositories/user.repository';

type PrismaUserWithRoles = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } };
}>;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<UserAggregate[]> {
    const rows = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      include: { roles: { include: { role: true } } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByEmail(email: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { roles: { include: { role: true } } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByPhone(phone: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findFirst({
      where: { phone },
      include: { roles: { include: { role: true } } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }> {
    return this.list({ tenantId }, page, pageSize);
  }

  async list(filter: UserListFilter, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }> {
    const where: Prisma.UserWhereInput = {
      schoolId: filter.tenantId,
      deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search } },
            ],
          }
        : {}),
    };
    if (filter.role) {
      where.roles = { some: { role: { code: filter.role } } };
    }

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.user.count({ where: { id } });
    return c > 0;
  }

  async save(aggregate: UserAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.user.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });
  }

  async delete(aggregate: UserAggregate): Promise<void> {
    await this.prisma.user.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date(), status: 'DEACTIVATED' },
    });
  }

  async loadRoleCodes(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((r) => r.role.code);
  }

  async saveRoles(userId: string, roleIds: string[], assignedBy: string, schoolId: string, branchId?: string): Promise<void> {
    // Replace strategy: delete existing assignments, insert new ones
    await this.prisma.userRole.deleteMany({ where: { userId } });
    if (roleIds.length === 0) return;
    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({
        userId,
        roleId,
        schoolId,
        branchId: branchId ?? null,
        assignedBy,
      })),
    });
  }

  async loadPermissionCodes(userId: string, tenantId: string): Promise<string[]> {
    const rows: { code: string }[] = await this.prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT p.code
      FROM permissions p
      JOIN role_permission rp ON rp.permission_id = p.id
      JOIN user_role ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = ${userId}::uuid
        AND ur.school_id = ${tenantId}::uuid
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `);
    return rows.map((r) => r.code);
  }

  // ─────────────────────────────────────────────
  // Mappers
  // ─────────────────────────────────────────────

  private toDomain(row: PrismaUserWithRoles): UserAggregate {
    const props: UserProps = {
      tenantId: row.schoolId,
      email: row.email,
      phone: row.phone ?? undefined,
      passwordHash: row.passwordHash ?? undefined,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName ?? undefined,
      avatarUrl: row.avatarUrl ?? undefined,
      status: row.status,
      roles: row.roles.map((ur) => ur.role.code),
      permissionsVersion: row.permissionsVersion,
      branchId: row.branchId ?? undefined,
      academicYearId: row.academicYearId ?? undefined,
      lastLoginAt: row.lastLoginAt?.toISOString(),
      lastLoginIp: row.lastLoginIp ?? undefined,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString(),
      phoneVerifiedAt: row.phoneVerifiedAt?.toISOString(),
      mfaEnabled: row.mfaEnabled,
      locale: row.locale,
      timezone: row.timezone,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new UserAggregate(props, row.id, row.version);
  }

  private toPersistence(a: UserAggregate): Prisma.UserUncheckedCreateInput {
    return {
      id: a.id,
      schoolId: a.tenantId,
      branchId: a.branchId ?? null,
      email: a.email,
      phone: a.phone ?? null,
      passwordHash: a.passwordHash ?? null,
      firstName: a.firstName,
      lastName: a.lastName,
      displayName: a.displayName ?? null,
      avatarUrl: a.avatarUrl ?? null,
      status: a.status,
      permissionsVersion: a.permissionsVersion,
      academicYearId: a.academicYearId ?? null,
      lastLoginAt: a.lastLoginAt ? new Date(a.lastLoginAt) : null,
      lastLoginIp: a.lastLoginIp ?? null,
      emailVerifiedAt: a.emailVerifiedAt ? new Date(a.emailVerifiedAt) : null,
      phoneVerifiedAt: a.phoneVerifiedAt ? new Date(a.phoneVerifiedAt) : null,
      mfaEnabled: a.mfaEnabled,
      locale: a.locale,
      timezone: a.timezone,
      version: a.version,
      updatedAt: new Date(),
    };
  }
}
