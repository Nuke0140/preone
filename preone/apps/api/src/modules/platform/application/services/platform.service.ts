/**
 * PlatformService — orchestrates platform-level operations.
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { SupportTicketAggregate } from '../../domain/aggregates/support-ticket.aggregate';
import { TenantProvisioningAggregate } from '../../domain/aggregates/tenant-provisioning.aggregate';
import type {
  FeatureFlagRepository, SupportTicketCommentRepository, SupportTicketRepository,
  TenantProvisioningRepository,
} from '../../domain/repositories/platform.repository';
import {
  FEATURE_FLAG_REPOSITORY, SUPPORT_TICKET_COMMENT_REPOSITORY,
  SUPPORT_TICKET_REPOSITORY, TENANT_PROVISIONING_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    @Inject(TENANT_PROVISIONING_REPOSITORY) private readonly provisioning: TenantProvisioningRepository,
    @Inject(FEATURE_FLAG_REPOSITORY) private readonly flags: FeatureFlagRepository,
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: SupportTicketRepository,
    @Inject(SUPPORT_TICKET_COMMENT_REPOSITORY) private readonly comments: SupportTicketCommentRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Tenant Provisioning ────────────────────────────────────

  async startProvisioning(props: {
    schoolId: string;
    plan: string;
    initiatedById: string;
    steps?: string[];
    metadata?: any;
  }): Promise<TenantProvisioningAggregate> {
    const existing = await this.provisioning.findBySchool(props.schoolId);
    if (existing) {
      throw new Error(`Provisioning already exists for school ${props.schoolId} (status=${existing.status})`);
    }
    const p = TenantProvisioningAggregate.create(props);
    await this.provisioning.save(p);
    await this.eventBus.publishAll(p.commit());
    this.logger.log(`Started provisioning for school ${props.schoolId}`);
    return p;
  }

  async completeProvisioningStep(provisioningId: string, step: string, completedAt?: string): Promise<void> {
    const p = await this._loadProvisioning(provisioningId);
    p.completeStep(step, completedAt ?? new Date().toISOString());
    await this.provisioning.save(p);
    await this.eventBus.publishAll(p.commit());
  }

  async failProvisioning(provisioningId: string, reason: string): Promise<void> {
    const p = await this._loadProvisioning(provisioningId);
    p.fail(reason);
    await this.provisioning.save(p);
    await this.eventBus.publishAll(p.commit());
  }

  // ─── Feature Flags ──────────────────────────────────────────

  async setFeatureFlag(props: {
    schoolId?: string;
    key: string;
    value: any;
    scope: string;
    plan?: string;
    description?: string;
    changedBy: string;
  }): Promise<any> {
    const existing = await this.flags.findByKeyAndScope(
      props.key, props.scope, props.schoolId, props.plan,
    );
    if (existing) {
      return this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: {
          value: props.value as any,
          description: props.description,
          changedBy: props.changedBy,
          changedAt: new Date(),
        },
      });
    }
    return this.prisma.featureFlag.create({
      data: {
        schoolId: props.schoolId,
        key: props.key,
        value: props.value as any,
        scope: props.scope as any,
        plan: props.plan,
        description: props.description,
        changedBy: props.changedBy,
      },
    });
  }

  async deleteFeatureFlag(flagId: string): Promise<void> {
    await this.prisma.featureFlag.delete({ where: { id: flagId } });
  }

  async resolveFeatureFlag(key: string, schoolId?: string, plan?: string): Promise<any> {
    // SCHOOL scope > PLAN scope > PLATFORM scope
    if (schoolId) {
      const schoolFlag = await this.flags.findByKeyAndScope(key, 'SCHOOL', schoolId);
      if (schoolFlag) return schoolFlag.value;
    }
    if (plan) {
      const planFlag = await this.flags.findByKeyAndScope(key, 'PLAN', undefined, plan);
      if (planFlag) return planFlag.value;
    }
    const platformFlag = await this.flags.findByKeyAndScope(key, 'PLATFORM');
    return platformFlag?.value ?? null;
  }

  // ─── Support Tickets ────────────────────────────────────────

  async createSupportTicket(props: {
    tenantId: string;
    raisedById: string;
    subject: string;
    description: string;
    category?: any;
    priority?: any;
    tags?: string[];
    attachments?: any;
  }): Promise<SupportTicketAggregate> {
    const ticketNumber = await this._nextTicketNumber(props.tenantId);
    const t = SupportTicketAggregate.create({
      tenantId: props.tenantId,
      raisedById: props.raisedById,
      ticketNumber,
      subject: props.subject,
      description: props.description,
      category: props.category ?? 'OTHER',
      priority: props.priority ?? 'MEDIUM',
      attachments: props.attachments,
      tags: props.tags,
    });
    await this.tickets.save(t);
    await this.eventBus.publishAll(t.commit());
    this.logger.log(`Created support ticket ${t.ticketNumber} (${t.id})`);
    return t;
  }

  async updateTicketStatus(ticketId: string, tenantId: string, newStatus: any): Promise<void> {
    const t = await this._loadTicket(ticketId, tenantId);
    t.setStatus(newStatus, new Date().toISOString());
    await this.tickets.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async assignTicket(ticketId: string, tenantId: string, assignedToId: string): Promise<void> {
    const t = await this._loadTicket(ticketId, tenantId);
    t.assignTo(assignedToId);
    await this.tickets.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async setTicketSatisfaction(ticketId: string, tenantId: string, rating: number): Promise<void> {
    const t = await this._loadTicket(ticketId, tenantId);
    t.setSatisfaction(rating);
    await this.tickets.save(t);
    await this.eventBus.publishAll(t.commit());
  }

  async addTicketComment(props: {
    ticketId: string;
    tenantId: string;
    authorId: string;
    body: string;
    isInternal?: boolean;
    attachments?: any;
  }): Promise<any> {
    const t = await this._loadTicket(props.ticketId, props.tenantId);
    const comment = await this.prisma.supportTicketComment.create({
      data: {
        ticketId: props.ticketId,
        authorId: props.authorId,
        body: props.body,
        isInternal: props.isInternal ?? false,
        attachments: props.attachments as any,
      },
    });
    // If ticket was WAITING_ON_USER and comment is from user, move to IN_PROGRESS
    if (t.status === 'WAITING_ON_USER') {
      t.setStatus('IN_PROGRESS', new Date().toISOString());
      await this.tickets.save(t);
      await this.eventBus.publishAll(t.commit());
    }
    return comment;
  }

  // ─── Platform Metrics ───────────────────────────────────────

  async getPlatformMetrics(dateFrom?: string, dateTo?: string): Promise<unknown> {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    const [schoolCount, activeSubscriptions, ticketCount, provisioningCount] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.schoolSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.tenantProvisioning.count({ where: { status: 'IN_PROGRESS' } }),
    ]);
    return {
      schools: { total: schoolCount },
      subscriptions: { active: activeSubscriptions },
      supportTickets: { total: ticketCount },
      provisioning: { inProgress: provisioningCount },
    };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async _nextTicketNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.supportTicket.count({ where: { schoolId: tenantId } });
    const year = new Date().getFullYear();
    return `TKT-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async _loadProvisioning(id: string): Promise<TenantProvisioningAggregate> {
    const p = await this.provisioning.findById(id);
    if (!p) throw new Error(`Provisioning ${id} not found`);
    return p;
  }

  private async _loadTicket(id: string, tenantId: string): Promise<SupportTicketAggregate> {
    const t = await this.tickets.findById(id, tenantId);
    if (!t) throw new Error(`Support ticket ${id} not found`);
    return t;
  }
}
