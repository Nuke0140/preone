/**
 * Platform Query Handlers.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import { PlatformService } from '../services/platform.service';
import type {
  GetFeatureFlagQuery, GetPlatformMetricsQuery, GetSupportTicketQuery,
  GetTenantProvisioningBySchoolQuery, GetTenantProvisioningQuery,
  ListFeatureFlagsQuery, ListProvisioningsQuery, ListSupportTicketCommentsQuery,
  ListSupportTicketsQuery,
} from '../queries/platform.queries';

@Injectable()
export class GetTenantProvisioningQueryHandler implements QueryHandler<GetTenantProvisioningQuery> {
  private static readonly TYPE = 'Platform.GetProvisioning';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetTenantProvisioningQueryHandler.TYPE, this);
  }
  async handle(q: GetTenantProvisioningQuery) {
    return this.prisma.tenantProvisioning.findUnique({ where: { id: q.payload.provisioningId } });
  }
}

@Injectable()
export class GetTenantProvisioningBySchoolQueryHandler implements QueryHandler<GetTenantProvisioningBySchoolQuery> {
  private static readonly TYPE = 'Platform.GetProvisioningBySchool';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetTenantProvisioningBySchoolQueryHandler.TYPE, this);
  }
  async handle(q: GetTenantProvisioningBySchoolQuery) {
    return this.prisma.tenantProvisioning.findUnique({ where: { schoolId: q.payload.schoolId } });
  }
}

@Injectable()
export class ListProvisioningsQueryHandler implements QueryHandler<ListProvisioningsQuery> {
  private static readonly TYPE = 'Platform.ListProvisionings';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListProvisioningsQueryHandler.TYPE, this);
  }
  async handle(q: ListProvisioningsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 500);
    const where: any = {};
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.tenantProvisioning.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit,
      include: { school: true, initiatedBy: true },
    });
  }
}

@Injectable()
export class GetFeatureFlagQueryHandler implements QueryHandler<GetFeatureFlagQuery> {
  private static readonly TYPE = 'Platform.GetFeatureFlag';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetFeatureFlagQueryHandler.TYPE, this);
  }
  async handle(q: GetFeatureFlagQuery) {
    const where: any = { key: q.payload.key, scope: q.payload.scope as any };
    if (q.payload.schoolId) where.schoolId = q.payload.schoolId;
    if (q.payload.plan) where.plan = q.payload.plan;
    return this.prisma.featureFlag.findFirst({ where });
  }
}

@Injectable()
export class ListFeatureFlagsQueryHandler implements QueryHandler<ListFeatureFlagsQuery> {
  private static readonly TYPE = 'Platform.ListFeatureFlags';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListFeatureFlagsQueryHandler.TYPE, this);
  }
  async handle(q: ListFeatureFlagsQuery) {
    const where: any = {};
    if (q.payload.schoolId) where.schoolId = q.payload.schoolId;
    return this.prisma.featureFlag.findMany({
      where, orderBy: { key: 'asc' },
    });
  }
}

@Injectable()
export class GetSupportTicketQueryHandler implements QueryHandler<GetSupportTicketQuery> {
  private static readonly TYPE = 'Platform.GetSupportTicket';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetSupportTicketQueryHandler.TYPE, this);
  }
  async handle(q: GetSupportTicketQuery) {
    return this.prisma.supportTicket.findFirst({
      where: { id: q.payload.ticketId, schoolId: q.payload.tenantId },
      include: { raisedBy: true, assignedTo: true, comments: { orderBy: { createdAt: 'asc' } } },
    });
  }
}

@Injectable()
export class ListSupportTicketsQueryHandler implements QueryHandler<ListSupportTicketsQuery> {
  private static readonly TYPE = 'Platform.ListSupportTickets';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListSupportTicketsQueryHandler.TYPE, this);
  }
  async handle(q: ListSupportTicketsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    if (q.payload.priority) where.priority = q.payload.priority as any;
    if (q.payload.assignedToId) where.assignedToId = q.payload.assignedToId;
    if (q.payload.raisedById) where.raisedById = q.payload.raisedById;
    return this.prisma.supportTicket.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { raisedBy: true, assignedTo: true, _count: { select: { comments: true } } },
    });
  }
}

@Injectable()
export class ListSupportTicketCommentsQueryHandler implements QueryHandler<ListSupportTicketCommentsQuery> {
  private static readonly TYPE = 'Platform.ListTicketComments';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListSupportTicketCommentsQueryHandler.TYPE, this);
  }
  async handle(q: ListSupportTicketCommentsQuery) {
    return this.prisma.supportTicketComment.findMany({
      where: { ticketId: q.payload.ticketId, ticket: { schoolId: q.payload.tenantId } },
      orderBy: { createdAt: 'asc' },
      include: { author: true },
    });
  }
}

@Injectable()
export class GetPlatformMetricsQueryHandler implements QueryHandler<GetPlatformMetricsQuery> {
  private static readonly TYPE = 'Platform.GetMetrics';
  constructor(private readonly bus: QueryBus, private readonly svc: PlatformService) {
    bus.register(GetPlatformMetricsQueryHandler.TYPE, this);
  }
  async handle(q: GetPlatformMetricsQuery) {
    return this.svc.getPlatformMetrics(q.payload.dateFrom, q.payload.dateTo);
  }
}
