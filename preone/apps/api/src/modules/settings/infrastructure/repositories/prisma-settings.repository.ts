/**
 * PrismaSettingsRepository.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { CalendarEventAggregate } from '../../domain/aggregates/calendar-event.aggregate';
import { SystemConfigAggregate } from '../../domain/aggregates/system-config.aggregate';
import { UserPreferenceAggregate } from '../../domain/aggregates/user-preference.aggregate';
import type {
  CalendarEventRepository, SystemConfigRepository, UserPreferenceRepository,
} from '../../domain/repositories/settings.repository';

@Injectable()
export class PrismaSystemConfigRepository implements SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: SystemConfigAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.systemConfig.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        scope: p.scope as any,
        key: p.key,
        value: p.value as any,
        description: p.description,
        isEncrypted: p.isEncrypted,
        changedBy: p.changedBy,
        changedAt: new Date(p.changedAt),
      },
      update: {
        value: p.value as any,
        description: p.description,
        isEncrypted: p.isEncrypted,
        changedBy: p.changedBy,
        changedAt: new Date(p.changedAt),
      },
    });
  }

  async findById(id: string, _tenantId?: string): Promise<SystemConfigAggregate | null> {
    const row = await this.prisma.systemConfig.findUnique({ where: { id } });
    return row ? this._hydrate(row) : null;
  }

  async findByKey(scope: string, key: string, tenantId?: string, branchId?: string): Promise<SystemConfigAggregate | null> {
    const where: any = { scope: scope as any, key };
    if (tenantId) where.schoolId = tenantId;
    if (branchId) where.branchId = branchId;
    if (!tenantId) where.schoolId = null;
    if (!branchId) where.branchId = null;
    const row = await this.prisma.systemConfig.findFirst({ where });
    return row ? this._hydrate(row) : null;
  }

  async findAll(tenantId?: string, scope?: string): Promise<SystemConfigAggregate[]> {
    const where: any = {};
    if (tenantId) where.schoolId = tenantId;
    if (scope) where.scope = scope as any;
    const rows = await this.prisma.systemConfig.findMany({ where });
    return rows.map(r => this._hydrate(r));
  }

  async delete(id: string, _tenantId?: string): Promise<void> {
    await this.prisma.systemConfig.delete({ where: { id } });
  }

  private _hydrate(row: any): SystemConfigAggregate {
    const agg = Object.create(SystemConfigAggregate.prototype) as SystemConfigAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId ?? undefined,
      branchId: row.branchId ?? undefined,
      scope: row.scope,
      key: row.key,
      value: row.value,
      description: row.description,
      isEncrypted: row.isEncrypted,
      changedBy: row.changedBy ?? undefined,
      changedAt: row.changedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaUserPreferenceRepository implements UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: UserPreferenceAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.userPreference.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        userId: p.userId,
        category: p.category,
        key: p.key,
        value: p.value as any,
      },
      update: {
        value: p.value as any,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<UserPreferenceAggregate | null> {
    const row = await this.prisma.userPreference.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByUser(userId: string, tenantId: string, category?: string): Promise<UserPreferenceAggregate[]> {
    const where: any = { schoolId: tenantId, userId };
    if (category) where.category = category;
    const rows = await this.prisma.userPreference.findMany({ where });
    return rows.map(r => this._hydrate(r));
  }

  async findByUserAndKey(userId: string, tenantId: string, category: string, key: string): Promise<UserPreferenceAggregate | null> {
    const row = await this.prisma.userPreference.findFirst({
      where: { schoolId: tenantId, userId, category, key },
    });
    return row ? this._hydrate(row) : null;
  }

  private _hydrate(row: any): UserPreferenceAggregate {
    const agg = Object.create(UserPreferenceAggregate.prototype) as UserPreferenceAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      userId: row.userId,
      category: row.category,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaCalendarEventRepository implements CalendarEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: CalendarEventAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.calendarEvent.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        academicSessionId: p.academicSessionId,
        title: p.title,
        description: p.description,
        type: p.type as any,
        visibility: p.visibility as any,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        isFullDay: p.isFullDay,
        location: p.location,
        organizerId: p.organizerId,
        isCancelled: p.isCancelled,
        isRecurring: p.isRecurring,
        recurrenceRule: p.recurrenceRule,
        metadata: p.metadata as any,
      },
      update: {
        title: p.title,
        description: p.description,
        type: p.type as any,
        visibility: p.visibility as any,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
        isFullDay: p.isFullDay,
        location: p.location,
        organizerId: p.organizerId,
        isCancelled: p.isCancelled,
        isRecurring: p.isRecurring,
        recurrenceRule: p.recurrenceRule,
        metadata: p.metadata as any,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<CalendarEventAggregate | null> {
    const row = await this.prisma.calendarEvent.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByDateRange(tenantId: string, startDate: string, endDate: string, branchId?: string): Promise<CalendarEventAggregate[]> {
    const where: any = {
      schoolId: tenantId,
      startDate: { gte: new Date(startDate) },
      endDate: { lte: new Date(endDate) },
      isCancelled: false,
    };
    if (branchId) where.branchId = branchId;
    const rows = await this.prisma.calendarEvent.findMany({
      where, orderBy: { startDate: 'asc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): CalendarEventAggregate {
    const agg = Object.create(CalendarEventAggregate.prototype) as CalendarEventAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      academicSessionId: row.academicSessionId,
      title: row.title,
      description: row.description,
      type: row.type,
      visibility: row.visibility,
      startDate: row.startDate.toISOString(),
      endDate: row.endDate.toISOString(),
      isFullDay: row.isFullDay,
      location: row.location,
      organizerId: row.organizerId,
      isCancelled: row.isCancelled,
      isRecurring: row.isRecurring,
      recurrenceRule: row.recurrenceRule,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
