/**
 * Settings Query Handlers.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import type {
  GetCalendarEventQuery, GetSystemConfigQuery, GetUserPreferenceQuery,
  ListCalendarEventsQuery, ListSystemConfigsQuery, ListUserPreferencesQuery,
} from '../queries/settings.queries';

@Injectable()
export class GetSystemConfigQueryHandler implements QueryHandler<GetSystemConfigQuery> {
  private static readonly TYPE = 'Settings.GetSystemConfig';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetSystemConfigQueryHandler.TYPE, this);
  }
  async handle(q: GetSystemConfigQuery) {
    const where: any = {
      scope: q.payload.scope as any,
      key: q.payload.key,
    };
    if (q.payload.tenantId) where.schoolId = q.payload.tenantId;
    if (q.payload.branchId) where.branchId = q.payload.branchId;
    return this.prisma.systemConfig.findFirst({ where });
  }
}

@Injectable()
export class ListSystemConfigsQueryHandler implements QueryHandler<ListSystemConfigsQuery> {
  private static readonly TYPE = 'Settings.ListSystemConfigs';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListSystemConfigsQueryHandler.TYPE, this);
  }
  async handle(q: ListSystemConfigsQuery) {
    const where: any = {};
    if (q.payload.tenantId) where.schoolId = q.payload.tenantId;
    if (q.payload.scope) where.scope = q.payload.scope as any;
    return this.prisma.systemConfig.findMany({
      where, orderBy: { key: 'asc' },
    });
  }
}

@Injectable()
export class GetUserPreferenceQueryHandler implements QueryHandler<GetUserPreferenceQuery> {
  private static readonly TYPE = 'Settings.GetUserPreference';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetUserPreferenceQueryHandler.TYPE, this);
  }
  async handle(q: GetUserPreferenceQuery) {
    return this.prisma.userPreference.findFirst({
      where: { id: q.payload.preferenceId, schoolId: q.payload.tenantId },
    });
  }
}

@Injectable()
export class ListUserPreferencesQueryHandler implements QueryHandler<ListUserPreferencesQuery> {
  private static readonly TYPE = 'Settings.ListUserPreferences';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListUserPreferencesQueryHandler.TYPE, this);
  }
  async handle(q: ListUserPreferencesQuery) {
    const where: any = {
      schoolId: q.payload.tenantId,
      userId: q.payload.userId,
    };
    if (q.payload.category) where.category = q.payload.category;
    return this.prisma.userPreference.findMany({ where, orderBy: { category: 'asc' } });
  }
}

@Injectable()
export class GetCalendarEventQueryHandler implements QueryHandler<GetCalendarEventQuery> {
  private static readonly TYPE = 'Settings.GetCalendarEvent';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetCalendarEventQueryHandler.TYPE, this);
  }
  async handle(q: GetCalendarEventQuery) {
    return this.prisma.calendarEvent.findFirst({
      where: { id: q.payload.eventId, schoolId: q.payload.tenantId },
      include: { organizer: true, academicSession: true },
    });
  }
}

@Injectable()
export class ListCalendarEventsQueryHandler implements QueryHandler<ListCalendarEventsQuery> {
  private static readonly TYPE = 'Settings.ListCalendarEvents';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListCalendarEventsQueryHandler.TYPE, this);
  }
  async handle(q: ListCalendarEventsQuery) {
    const where: any = {
      schoolId: q.payload.tenantId,
      startDate: { gte: new Date(q.payload.dateFrom) },
      endDate: { lte: new Date(q.payload.dateTo) },
      isCancelled: false,
    };
    if (q.payload.branchId) where.branchId = q.payload.branchId;
    if (q.payload.type) where.type = q.payload.type as any;
    return this.prisma.calendarEvent.findMany({
      where, orderBy: { startDate: 'asc' },
    });
  }
}
