/**
 * PrismaCrmRepository — concrete impl of CRM repos.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { LeadAggregate } from '../../domain/aggregates/lead.aggregate';
import type {
  LeadSource, LeadPriority, LeadStatus, ProgramInterest,
} from '../../domain/aggregates/lead.aggregate';
import { CampaignAggregate } from '../../domain/aggregates/campaign.aggregate';
import type {
  CampaignAudience, CampaignChannel, CampaignStatus,
} from '../../domain/aggregates/campaign.aggregate';
import { FollowUpAggregate } from '../../domain/aggregates/follow-up.aggregate';
import type {
  FollowUpOutcome, FollowUpStatus, FollowUpType,
} from '../../domain/aggregates/follow-up.aggregate';
import type {
  CampaignRepository, FollowUpRepository, LeadRepository,
} from '../../domain/repositories/crm.repository';

// ─── Lead Repository ──────────────────────────────────────────

@Injectable()
export class PrismaLeadRepository implements LeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: LeadAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.lead.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        leadCode: p.leadCode,
        parentFirstName: p.parentFirstName,
        parentLastName: p.parentLastName,
        email: p.email,
        phone: p.phone,
        alternatePhone: p.alternatePhone,
        childName: p.childName,
        childDateOfBirth: p.childDateOfBirth ? new Date(p.childDateOfBirth) : null,
        programInterest: p.programInterest,
        preferredStartDate: p.preferredStartDate ? new Date(p.preferredStartDate) : null,
        source: p.source,
        sourceDetails: p.sourceDetails,
        campaignId: p.campaignId,
        status: p.status,
        priority: p.priority,
        assignedCounsellorId: p.assignedCounsellorId,
        previousCounsellorId: p.previousCounsellorId,
        assignedAt: p.assignedAt ? new Date(p.assignedAt) : null,
        firstContactedAt: p.firstContactedAt ? new Date(p.firstContactedAt) : null,
        lastContactedAt: p.lastContactedAt ? new Date(p.lastContactedAt) : null,
        contactCount: p.contactCount,
        qualificationScore: p.qualificationScore,
        qualificationNotes: p.qualificationNotes,
        convertedAt: p.convertedAt ? new Date(p.convertedAt) : null,
        convertedApplicationId: p.convertedApplicationId,
        convertedStudentId: p.convertedStudentId,
        lostReason: p.lostReason,
        lostAt: p.lostAt ? new Date(p.lostAt) : null,
        budgetCents: p.budgetCents,
        location: p.location,
        notes: p.notes,
        tags: p.tags,
        followUpCount: p.followUpCount,
      },
      update: {
        status: p.status,
        priority: p.priority,
        assignedCounsellorId: p.assignedCounsellorId,
        previousCounsellorId: p.previousCounsellorId,
        assignedAt: p.assignedAt ? new Date(p.assignedAt) : null,
        firstContactedAt: p.firstContactedAt ? new Date(p.firstContactedAt) : null,
        lastContactedAt: p.lastContactedAt ? new Date(p.lastContactedAt) : null,
        contactCount: p.contactCount,
        qualificationScore: p.qualificationScore,
        qualificationNotes: p.qualificationNotes,
        convertedAt: p.convertedAt ? new Date(p.convertedAt) : null,
        convertedApplicationId: p.convertedApplicationId,
        convertedStudentId: p.convertedStudentId,
        lostReason: p.lostReason,
        lostAt: p.lostAt ? new Date(p.lostAt) : null,
        notes: p.notes,
        tags: p.tags,
        followUpCount: p.followUpCount,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<LeadAggregate | null> {
    const row = await this.prisma.lead.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCode(tenantId: string, leadCode: string): Promise<LeadAggregate | null> {
    const row = await this.prisma.lead.findFirst({
      where: { schoolId: tenantId, leadCode },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByPhone(tenantId: string, phone: string): Promise<LeadAggregate | null> {
    const row = await this.prisma.lead.findFirst({
      where: { schoolId: tenantId, phone },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByEmail(tenantId: string, email: string): Promise<LeadAggregate | null> {
    const row = await this.prisma.lead.findFirst({
      where: { schoolId: tenantId, email },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCounsellor(counsellorId: string, tenantId: string, status?: string): Promise<LeadAggregate[]> {
    const rows = await this.prisma.lead.findMany({
      where: {
        schoolId: tenantId, assignedCounsellorId: counsellorId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByCampaign(campaignId: string, tenantId: string): Promise<LeadAggregate[]> {
    const rows = await this.prisma.lead.findMany({
      where: { schoolId: tenantId, campaignId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByStatus(tenantId: string, status: string, limit = 100): Promise<LeadAggregate[]> {
    const rows = await this.prisma.lead.findMany({
      where: { schoolId: tenantId, status },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): LeadAggregate {
    const agg = Object.create(LeadAggregate.prototype) as LeadAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      leadCode: row.leadCode,
      parentFirstName: row.parentFirstName,
      parentLastName: row.parentLastName,
      email: row.email ?? undefined,
      phone: row.phone,
      alternatePhone: row.alternatePhone ?? undefined,
      childName: row.childName ?? undefined,
      childDateOfBirth: row.childDateOfBirth?.toISOString(),
      programInterest: row.programInterest as ProgramInterest,
      preferredStartDate: row.preferredStartDate?.toISOString(),
      source: row.source as LeadSource,
      sourceDetails: row.sourceDetails ?? undefined,
      campaignId: row.campaignId ?? undefined,
      status: row.status as LeadStatus,
      priority: row.priority as LeadPriority,
      assignedCounsellorId: row.assignedCounsellorId ?? undefined,
      previousCounsellorId: row.previousCounsellorId ?? undefined,
      assignedAt: row.assignedAt?.toISOString(),
      firstContactedAt: row.firstContactedAt?.toISOString(),
      lastContactedAt: row.lastContactedAt?.toISOString(),
      contactCount: row.contactCount,
      qualificationScore: row.qualificationScore ?? undefined,
      qualificationNotes: row.qualificationNotes ?? undefined,
      convertedAt: row.convertedAt?.toISOString(),
      convertedApplicationId: row.convertedApplicationId ?? undefined,
      convertedStudentId: row.convertedStudentId ?? undefined,
      lostReason: row.lostReason ?? undefined,
      lostAt: row.lostAt?.toISOString(),
      budgetCents: row.budgetCents ?? undefined,
      location: row.location ?? undefined,
      notes: row.notes ?? undefined,
      tags: row.tags ?? [],
      followUpCount: row.followUpCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── Campaign Repository ──────────────────────────────────────

@Injectable()
export class PrismaCampaignRepository implements CampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: CampaignAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.campaign.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        campaignCode: p.campaignCode,
        name: p.name,
        description: p.description,
        channel: p.channel,
        audience: p.audience,
        customSegmentQuery: p.customSegmentQuery,
        status: p.status,
        budgetCents: p.budgetCents,
        spentCents: p.spentCents,
        audienceSize: p.audienceSize,
        sentCount: p.sentCount,
        deliveredCount: p.deliveredCount,
        openedCount: p.openedCount,
        clickedCount: p.clickedCount,
        convertedCount: p.convertedCount,
        templateId: p.templateId,
        messageContent: p.messageContent,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        launchedAt: p.launchedAt ? new Date(p.launchedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        attributedRevenueCents: p.attributedRevenueCents,
      },
      update: {
        status: p.status,
        spentCents: p.spentCents,
        audienceSize: p.audienceSize,
        sentCount: p.sentCount,
        deliveredCount: p.deliveredCount,
        openedCount: p.openedCount,
        clickedCount: p.clickedCount,
        convertedCount: p.convertedCount,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        launchedAt: p.launchedAt ? new Date(p.launchedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        attributedRevenueCents: p.attributedRevenueCents,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<CampaignAggregate | null> {
    const row = await this.prisma.campaign.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCode(tenantId: string, code: string): Promise<CampaignAggregate | null> {
    const row = await this.prisma.campaign.findFirst({
      where: { schoolId: tenantId, campaignCode: code },
    });
    return row ? this._hydrate(row) : null;
  }

  async findActive(tenantId: string): Promise<CampaignAggregate[]> {
    const rows = await this.prisma.campaign.findMany({
      where: { schoolId: tenantId, status: { in: ['SCHEDULED', 'RUNNING', 'PAUSED'] } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByStatus(tenantId: string, status: string): Promise<CampaignAggregate[]> {
    const rows = await this.prisma.campaign.findMany({
      where: { schoolId: tenantId, status },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): CampaignAggregate {
    const agg = Object.create(CampaignAggregate.prototype) as CampaignAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      campaignCode: row.campaignCode,
      name: row.name,
      description: row.description ?? undefined,
      channel: row.channel as CampaignChannel,
      audience: row.audience as CampaignAudience,
      customSegmentQuery: row.customSegmentQuery ?? undefined,
      status: row.status as CampaignStatus,
      budgetCents: row.budgetCents,
      spentCents: row.spentCents,
      audienceSize: row.audienceSize,
      sentCount: row.sentCount,
      deliveredCount: row.deliveredCount,
      openedCount: row.openedCount,
      clickedCount: row.clickedCount,
      convertedCount: row.convertedCount,
      templateId: row.templateId ?? undefined,
      messageContent: row.messageContent ?? undefined,
      scheduledAt: row.scheduledAt?.toISOString(),
      launchedAt: row.launchedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      cancellationReason: row.cancellationReason ?? undefined,
      attributedRevenueCents: row.attributedRevenueCents,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── FollowUp Repository ──────────────────────────────────────

@Injectable()
export class PrismaFollowUpRepository implements FollowUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: FollowUpAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.followUp.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        leadId: p.leadId,
        campaignId: p.campaignId,
        counsellorId: p.counsellorId,
        type: p.type,
        status: p.status,
        scheduledAt: new Date(p.scheduledAt),
        durationMinutes: p.durationMinutes,
        outcome: p.outcome,
        outcomeNotes: p.outcomeNotes,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        missedAt: p.missedAt ? new Date(p.missedAt) : null,
        rescheduledTo: p.rescheduledTo ? new Date(p.rescheduledTo) : null,
        rescheduledFollowUpId: p.rescheduledFollowUpId,
        reminderSentCount: p.reminderSentCount,
        lastReminderSentAt: p.lastReminderSentAt ? new Date(p.lastReminderSentAt) : null,
      },
      update: {
        status: p.status,
        durationMinutes: p.durationMinutes,
        outcome: p.outcome,
        outcomeNotes: p.outcomeNotes,
        startedAt: p.startedAt ? new Date(p.startedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        missedAt: p.missedAt ? new Date(p.missedAt) : null,
        rescheduledTo: p.rescheduledTo ? new Date(p.rescheduledTo) : null,
        rescheduledFollowUpId: p.rescheduledFollowUpId,
        reminderSentCount: p.reminderSentCount,
        lastReminderSentAt: p.lastReminderSentAt ? new Date(p.lastReminderSentAt) : null,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<FollowUpAggregate | null> {
    const row = await this.prisma.followUp.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByLead(leadId: string, tenantId: string): Promise<FollowUpAggregate[]> {
    const rows = await this.prisma.followUp.findMany({
      where: { schoolId: tenantId, leadId },
      orderBy: { scheduledAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByCounsellor(counsellorId: string, tenantId: string, status?: string): Promise<FollowUpAggregate[]> {
    const rows = await this.prisma.followUp.findMany({
      where: {
        schoolId: tenantId, counsellorId,
        ...(status ? { status } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findPending(tenantId: string, beforeDate: string): Promise<FollowUpAggregate[]> {
    const rows = await this.prisma.followUp.findMany({
      where: {
        schoolId: tenantId,
        status: 'SCHEDULED',
        scheduledAt: { lt: new Date(beforeDate) },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): FollowUpAggregate {
    const agg = Object.create(FollowUpAggregate.prototype) as FollowUpAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      leadId: row.leadId,
      campaignId: row.campaignId ?? undefined,
      counsellorId: row.counsellorId,
      type: row.type as FollowUpType,
      status: row.status as FollowUpStatus,
      scheduledAt: row.scheduledAt.toISOString(),
      durationMinutes: row.durationMinutes ?? undefined,
      outcome: row.outcome as FollowUpOutcome | undefined,
      outcomeNotes: row.outcomeNotes ?? undefined,
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      cancellationReason: row.cancellationReason ?? undefined,
      missedAt: row.missedAt?.toISOString(),
      rescheduledTo: row.rescheduledTo?.toISOString(),
      rescheduledFollowUpId: row.rescheduledFollowUpId ?? undefined,
      reminderSentCount: row.reminderSentCount,
      lastReminderSentAt: row.lastReminderSentAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
