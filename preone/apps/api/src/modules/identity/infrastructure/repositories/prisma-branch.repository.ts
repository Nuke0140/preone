/**
 * PrismaBranchRepository — concrete implementation.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import { BranchAggregate, type BranchProps } from '../../domain/aggregates/branch.aggregate';

import type { BranchListFilter, BranchRepository } from '../../domain/repositories/branch.repository';

@Injectable()
export class PrismaBranchRepository implements BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BranchAggregate | undefined> {
    const row = await this.prisma.branch.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<BranchAggregate[]> {
    const rows = await this.prisma.branch.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByCode(schoolId: string, code: string): Promise<BranchAggregate | undefined> {
    const row = await this.prisma.branch.findFirst({
      where: { schoolId, code },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async listBySchool(schoolId: string, page: number, pageSize: number): Promise<{
    items: BranchAggregate[];
    total: number;
  }> {
    return this.list({ schoolId }, page, pageSize);
  }

  async list(filter: BranchListFilter, page: number, pageSize: number): Promise<{
    items: BranchAggregate[];
    total: number;
  }> {
    const where: Prisma.BranchWhereInput = {
      schoolId: filter.schoolId,
      deletedAt: null,
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { code: { contains: filter.search, mode: 'insensitive' } },
              { city: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async countBySchool(schoolId: string): Promise<number> {
    return this.prisma.branch.count({ where: { schoolId, deletedAt: null } });
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.branch.count({ where: { id } });
    return c > 0;
  }

  async save(aggregate: BranchAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.branch.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });
  }

  async delete(aggregate: BranchAggregate): Promise<void> {
    await this.prisma.branch.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ─────── Mappers ───────

  private toDomain(row: Prisma.BranchGetPayload<{}>): BranchAggregate {
    const props: BranchProps = {
      schoolId: row.schoolId,
      code: row.code,
      name: row.name,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2 ?? undefined,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      country: row.country,
      latitude: row.latitude ? Number(row.latitude) : undefined,
      longitude: row.longitude ? Number(row.longitude) : undefined,
      googlePlaceId: row.googlePlaceId ?? undefined,
      phone: row.phone,
      email: row.email ?? undefined,
      timezone: row.timezone,
      locale: row.locale,
      isActive: row.isActive,
      openedAt: row.openedAt?.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new BranchAggregate(props, row.id, row.version);
  }

  private toPersistence(a: BranchAggregate): Prisma.BranchUncheckedCreateInput {
    return {
      id: a.id,
      schoolId: a.schoolId,
      code: a.code,
      name: a.name,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? null,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country,
      latitude: a.latitude ?? null,
      longitude: a.longitude ?? null,
      googlePlaceId: a.googlePlaceId ?? null,
      phone: a.phone,
      email: a.email ?? null,
      timezone: a.timezone,
      locale: a.locale,
      isActive: a.isActive,
      openedAt: a.openedAt ? new Date(a.openedAt) : null,
      closedAt: a.closedAt ? new Date(a.closedAt) : null,
      version: a.version,
      updatedAt: new Date(),
    };
  }
}
