/**
 * PrismaUserRepository — concrete implementation backed by Prisma.
 *
 * Per ERD v3.0 §5.2: All tenant-scoped queries MUST run within
 *   `prisma.withTenant({ tenantId, userId }, ...)` so RLS policies filter rows.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import type { User as PrismaUser } from '@prisma/client';
import { UserAggregate, type UserProps, type UserStatus } from '../../domain/aggregates/user.aggregate';
import type { UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<UserAggregate[]> {
    const rows = await this.prisma.user.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByEmail(email: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByPhone(phone: string): Promise<UserAggregate | undefined> {
    const row = await this.prisma.user.findFirst({ where: { phone } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByTenant(tenantId: string, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }> {
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { schoolId: tenantId, deletedAt: null },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { schoolId: tenantId, deletedAt: null } }),
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
      data: { deletedAt: new Date() },
    });
  }

  private toDomain(row: PrismaUser): UserAggregate {
    const props: UserProps = {
      tenantId: row.schoolId,
      email: row.email,
      phone: row.phone ?? undefined,
      passwordHash: row.passwordHash ?? undefined,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName ?? undefined,
      avatarUrl: row.avatarUrl ?? undefined,
      status: row.status as UserStatus,
      roles: [], // loaded separately via user_role
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
    };
    return new UserAggregate(props, row.id, row.version);
  }

  private toPersistence(a: UserAggregate): any {
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
