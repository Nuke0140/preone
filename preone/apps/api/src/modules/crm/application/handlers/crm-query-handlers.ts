/**
 * CRM Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import {
  GetCampaignQuery, GetCounsellorDashboardQuery, GetLeadQuery,
  ListCampaignsQuery, ListFollowUpsQuery, ListLeadsQuery,
} from '../queries/crm.queries';

@Injectable()
export class GetLeadQueryHandler implements QueryHandler<GetLeadQuery> {
  private static readonly TYPE = 'Crm.GetLead';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetLeadQueryHandler.TYPE, this);
  }
  async handle(q: GetLeadQuery) {
    return this.prisma.lead.findFirst({
      where: { id: q.payload.leadId, schoolId: q.payload.tenantId },
      include: {
        followUps: { orderBy: { scheduledAt: 'desc' }, take: 10 },
        campaign: true,
        assignedCounsellor: true,
      },
    });
  }
}

@Injectable()
export class ListLeadsQueryHandler implements QueryHandler<ListLeadsQuery> {
  private static readonly TYPE = 'Crm.ListLeads';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListLeadsQueryHandler.TYPE, this);
  }
  async handle(q: ListLeadsQuery) {
    return this.prisma.lead.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.branchId ? { branchId: q.payload.branchId } : {}),
        ...(q.payload.status ? { status: q.payload.status } : {}),
        ...(q.payload.source ? { source: q.payload.source } : {}),
        ...(q.payload.counsellorId ? { assignedCounsellorId: q.payload.counsellorId } : {}),
        ...(q.payload.campaignId ? { campaignId: q.payload.campaignId } : {}),
      },
      take: q.payload.limit ?? 50,
      skip: q.payload.offset ?? 0,
      orderBy: { createdAt: 'desc' },
      include: { assignedCounsellor: true, campaign: true },
    });
  }
}

@Injectable()
export class GetCampaignQueryHandler implements QueryHandler<GetCampaignQuery> {
  private static readonly TYPE = 'Crm.GetCampaign';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetCampaignQueryHandler.TYPE, this);
  }
  async handle(q: GetCampaignQuery) {
    return this.prisma.campaign.findFirst({
      where: { id: q.payload.campaignId, schoolId: q.payload.tenantId },
      include: { leads: { take: 50, orderBy: { createdAt: 'desc' } } },
    });
  }
}

@Injectable()
export class ListCampaignsQueryHandler implements QueryHandler<ListCampaignsQuery> {
  private static readonly TYPE = 'Crm.ListCampaigns';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListCampaignsQueryHandler.TYPE, this);
  }
  async handle(q: ListCampaignsQuery) {
    return this.prisma.campaign.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.branchId ? { branchId: q.payload.branchId } : {}),
        ...(q.payload.status ? { status: q.payload.status } : {}),
        ...(q.payload.channel ? { channel: q.payload.channel } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Injectable()
export class ListFollowUpsQueryHandler implements QueryHandler<ListFollowUpsQuery> {
  private static readonly TYPE = 'Crm.ListFollowUps';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListFollowUpsQueryHandler.TYPE, this);
  }
  async handle(q: ListFollowUpsQuery) {
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.leadId) where.leadId = q.payload.leadId;
    if (q.payload.counsellorId) where.counsellorId = q.payload.counsellorId;
    if (q.payload.status) where.status = q.payload.status;
    if (q.payload.beforeDate) {
      where.scheduledAt = { lt: new Date(q.payload.beforeDate) };
    }
    return this.prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { lead: true },
    });
  }
}

@Injectable()
export class GetCounsellorDashboardQueryHandler
implements QueryHandler<GetCounsellorDashboardQuery> {
  private static readonly TYPE = 'Crm.GetCounsellorDashboard';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetCounsellorDashboardQueryHandler.TYPE, this);
  }
  async handle(q: GetCounsellorDashboardQuery) {
    const periodStart = q.payload.periodStart ? new Date(q.payload.periodStart) : new Date(0);
    const periodEnd = q.payload.periodEnd ? new Date(q.payload.periodEnd) : new Date();
    const [assigned, converted, lost, followUpsToday] = await Promise.all([
      this.prisma.lead.count({
        where: {
          schoolId: q.payload.tenantId,
          assignedCounsellorId: q.payload.counsellorId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.lead.count({
        where: {
          schoolId: q.payload.tenantId,
          assignedCounsellorId: q.payload.counsellorId,
          status: 'CONVERTED',
          convertedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.lead.count({
        where: {
          schoolId: q.payload.tenantId,
          assignedCounsellorId: q.payload.counsellorId,
          status: 'LOST',
          lostAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      this.prisma.followUp.count({
        where: {
          schoolId: q.payload.tenantId,
          counsellorId: q.payload.counsellorId,
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);
    return {
      assigned, converted, lost,
      conversionRate: assigned > 0 ? (converted / assigned) * 100 : 0,
      followUpsToday,
    };
  }
}
