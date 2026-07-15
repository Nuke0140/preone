/**
 * PrismaSchoolRepository — concrete implementation backed by Prisma.
 *
 * Per BTD §6.1: "Infrastructure → Domain: Allowed (implements interfaces)"
 * Per BTD §11.3: Repository pattern with Prisma.
 * Per ERD v3.0 §5.2: All queries run within tenant context (SET app.school_id).
 *
 * NOTE: School is the tenant anchor — it is NOT tenant-scoped (no school_id
 * on schools table). Platform admin role required to access.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/prisma/prisma.service';
import type { School as PrismaSchool } from '@prisma/client';
import { SchoolAggregate, type SchoolProps, type SchoolStatus, type SchoolTier } from '../../domain/aggregates/school.aggregate';
import type { SchoolRepository } from '../../domain/repositories/school.repository';

@Injectable()
export class PrismaSchoolRepository implements SchoolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<SchoolAggregate | undefined> {
    const row = await this.prisma.school.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByIds(ids: readonly string[]): Promise<SchoolAggregate[]> {
    const rows = await this.prisma.school.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByEmail(email: string): Promise<SchoolAggregate | undefined> {
    const row = await this.prisma.school.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByGstNumber(gstNumber: string): Promise<SchoolAggregate | undefined> {
    const row = await this.prisma.school.findUnique({ where: { gstNumber } });
    return row ? this.toDomain(row) : undefined;
  }

  async listByStatus(status: string, page: number, pageSize: number): Promise<{
    items: SchoolAggregate[];
    total: number;
  }> {
    const [rows, total] = await Promise.all([
      this.prisma.school.findMany({
        where: { status: status as any },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where: { status: status as any } }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.school.count({ where: { id } });
    return c > 0;
  }

  async save(aggregate: SchoolAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.school.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });
  }

  async delete(aggregate: SchoolAggregate): Promise<void> {
    await this.prisma.school.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date() },
    });
  }

  // ─────── Mappers ───────

  private toDomain(row: PrismaSchool): SchoolAggregate {
    const props: SchoolProps = {
      name: row.name,
      legalName: row.legalName ?? undefined,
      email: row.email,
      phone: row.phone,
      website: row.website ?? undefined,
      gstNumber: row.gstNumber ?? undefined,
      panNumber: row.panNumber ?? undefined,
      status: row.status as SchoolStatus,
      tier: row.tier as SchoolTier,
      branchCount: row.branchCount,
      maxBranches: row.maxBranches,
      studentSeats: row.studentSeats,
      usedSeats: row.usedSeats,
      logoUrl: row.logoUrl ?? undefined,
      timezone: row.timezone,
      locale: row.locale,
      trialEndsAt: row.trialEndsAt?.toISOString(),
      activatedAt: row.activatedAt?.toISOString(),
      suspendedAt: row.suspendedAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      deletedAt: row.deletedAt?.toISOString(),
    };
    // Reconstitute aggregate without re-raising events
    return new SchoolAggregate(props, row.id, row.version);
  }

  private toPersistence(a: SchoolAggregate): any {
    return {
      id: a.id,
      name: a.name,
      legalName: a.legalName ?? null,
      email: a.email,
      phone: a.phone,
      website: a.website ?? null,
      gstNumber: a.gstNumber ?? null,
      panNumber: a.panNumber ?? null,
      status: a.status,
      tier: a.tier,
      branchCount: a.branchCount,
      maxBranches: a.maxBranches,
      studentSeats: a.studentSeats,
      usedSeats: a.usedSeats,
      logoUrl: a.logoUrl ?? null,
      timezone: a.timezone,
      locale: a.locale,
      trialEndsAt: a.trialEndsAt ? new Date(a.trialEndsAt) : null,
      activatedAt: a.activatedAt ? new Date(a.activatedAt) : null,
      suspendedAt: a.suspendedAt ? new Date(a.suspendedAt) : null,
      cancelledAt: a.cancelledAt ? new Date(a.cancelledAt) : null,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
      version: a.version,
      updatedAt: new Date(),
    };
  }
}
