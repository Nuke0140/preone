/**
 * PrismaGuardianRepository — concrete implementation backed by Prisma.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import {
  GuardianAggregate, type GuardianProps, type GuardianStatus,
} from '../../domain/aggregates/guardian.aggregate';

import type {
  GuardianListFilter, GuardianRepository,
} from '../../domain/repositories/guardian.repository';

@Injectable()
export class PrismaGuardianRepository implements GuardianRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GuardianAggregate | undefined> {
    const row = await this.prisma.guardian.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByPhone(tenantId: string, phone: string): Promise<GuardianAggregate | undefined> {
    const row = await this.prisma.guardian.findFirst({
      where: { schoolId: tenantId, phone, deletedAt: null },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByEmail(tenantId: string, email: string): Promise<GuardianAggregate | undefined> {
    const row = await this.prisma.guardian.findFirst({
      where: { schoolId: tenantId, email, deletedAt: null },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByUserId(userId: string): Promise<GuardianAggregate | undefined> {
    const row = await this.prisma.guardian.findUnique({ where: { userId } });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: GuardianListFilter, page: number, pageSize: number): Promise<{
    items: GuardianAggregate[];
    total: number;
  }> {
    const where: Prisma.GuardianWhereInput = {
      schoolId: filter.tenantId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search } },
              { email: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.guardian.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guardian.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<GuardianAggregate[]> {
    const rows = await this.prisma.guardian.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.guardian.count({ where: { id } });
    return c > 0;
  }

  async save(aggregate: GuardianAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.guardian.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });
  }

  async delete(aggregate: GuardianAggregate): Promise<void> {
    await this.prisma.guardian.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
  }

  // ─────── Mappers ───────

  private toDomain(row: Prisma.GuardianGetPayload<{}>): GuardianAggregate {
    const props: GuardianProps = {
      tenantId: row.schoolId,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email ?? undefined,
      phone: row.phone,
      altPhone: row.altPhone ?? undefined,
      occupation: row.occupation ?? undefined,
      employer: row.employer ?? undefined,
      annualIncomeCents: row.annualIncomeCents ?? undefined,
      education: row.education ?? undefined,
      governmentId: row.governmentId ?? undefined,
      addressLine1: row.addressLine1 ?? undefined,
      addressLine2: row.addressLine2 ?? undefined,
      city: row.city ?? undefined,
      state: row.state ?? undefined,
      postalCode: row.postalCode ?? undefined,
      status: row.status,
      userId: row.userId ?? undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new GuardianAggregate(props, row.id, row.version);
  }

  private toPersistence(a: GuardianAggregate): Prisma.GuardianUncheckedCreateInput {
    return {
      id: a.id,
      schoolId: a.tenantId,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email ?? null,
      phone: a.phone,
      altPhone: a.altPhone ?? null,
      occupation: a.occupation ?? null,
      employer: a.employer ?? null,
      annualIncomeCents: a.annualIncomeCents ?? null,
      education: a.education ?? null,
      governmentId: a.governmentId ?? null,
      addressLine1: a.addressLine1 ?? null,
      addressLine2: a.addressLine2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      postalCode: a.postalCode ?? null,
      status: a.status,
      userId: a.userId ?? null,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
  }
}
