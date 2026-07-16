/**
 * PrismaPlatformRepository.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { SupportTicketAggregate } from '../../domain/aggregates/support-ticket.aggregate';
import { TenantProvisioningAggregate } from '../../domain/aggregates/tenant-provisioning.aggregate';
import type {
  FeatureFlagRepository, SupportTicketRepository, TenantProvisioningRepository,
} from '../../domain/repositories/platform.repository';

@Injectable()
export class PrismaTenantProvisioningRepository implements TenantProvisioningRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: TenantProvisioningAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.tenantProvisioning.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.schoolId,
        status: p.status as any,
        plan: p.plan,
        steps: p.steps as any,
        currentStep: p.currentStep,
        initiatedById: p.initiatedById,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        failureReason: p.failureReason,
        metadata: p.metadata as any,
      },
      update: {
        status: p.status as any,
        steps: p.steps as any,
        currentStep: p.currentStep,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        failureReason: p.failureReason,
        metadata: p.metadata as any,
      },
    });
  }

  async findById(id: string): Promise<TenantProvisioningAggregate | null> {
    const row = await this.prisma.tenantProvisioning.findUnique({ where: { id } });
    return row ? this._hydrate(row) : null;
  }

  async findBySchool(schoolId: string): Promise<TenantProvisioningAggregate | null> {
    const row = await this.prisma.tenantProvisioning.findUnique({ where: { schoolId } });
    return row ? this._hydrate(row) : null;
  }

  async findByStatus(status: string, limit = 50): Promise<TenantProvisioningAggregate[]> {
    const rows = await this.prisma.tenantProvisioning.findMany({
      where: { status: status as any },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): TenantProvisioningAggregate {
    const agg = Object.create(TenantProvisioningAggregate.prototype) as TenantProvisioningAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      schoolId: row.schoolId,
      status: row.status,
      plan: row.plan,
      steps: row.steps,
      currentStep: row.currentStep ?? undefined,
      initiatedById: row.initiatedById,
      completedAt: row.completedAt?.toISOString(),
      failureReason: row.failureReason ?? undefined,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

@Injectable()
export class PrismaFeatureFlagRepository implements FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: any): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { id: agg.id },
      create: agg, update: agg,
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.featureFlag.findUnique({ where: { id } });
  }

  async findByKeyAndScope(key: string, scope: string, schoolId?: string, plan?: string): Promise<any | null> {
    const where: any = { key, scope: scope as any };
    if (schoolId) where.schoolId = schoolId;
    if (plan) where.plan = plan;
    return this.prisma.featureFlag.findFirst({ where });
  }

  async findAll(schoolId?: string): Promise<any[]> {
    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    return this.prisma.featureFlag.findMany({ where, orderBy: { key: 'asc' } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.featureFlag.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaSupportTicketRepository implements SupportTicketRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: SupportTicketAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.supportTicket.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        raisedById: p.raisedById,
        assignedToId: p.assignedToId,
        ticketNumber: p.ticketNumber,
        subject: p.subject,
        description: p.description,
        category: p.category as any,
        status: p.status as any,
        priority: p.priority as any,
        tags: p.tags,
        attachments: p.attachments as any,
        firstResponseAt: p.firstResponseAt ? new Date(p.firstResponseAt) : null,
        resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
        closedAt: p.closedAt ? new Date(p.closedAt) : null,
        satisfactionRating: p.satisfactionRating,
      },
      update: {
        assignedToId: p.assignedToId,
        status: p.status as any,
        priority: p.priority as any,
        tags: p.tags,
        attachments: p.attachments as any,
        firstResponseAt: p.firstResponseAt ? new Date(p.firstResponseAt) : null,
        resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
        closedAt: p.closedAt ? new Date(p.closedAt) : null,
        satisfactionRating: p.satisfactionRating,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<SupportTicketAggregate | null> {
    const row = await this.prisma.supportTicket.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByTicketNumber(tenantId: string, ticketNumber: string): Promise<SupportTicketAggregate | null> {
    const row = await this.prisma.supportTicket.findFirst({
      where: { schoolId: tenantId, ticketNumber },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByStatus(tenantId: string, status: string, limit = 50): Promise<SupportTicketAggregate[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { schoolId: tenantId, status: status as any },
      take: limit, orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): SupportTicketAggregate {
    const agg = Object.create(SupportTicketAggregate.prototype) as SupportTicketAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      raisedById: row.raisedById,
      assignedToId: row.assignedToId ?? undefined,
      ticketNumber: row.ticketNumber,
      subject: row.subject,
      description: row.description,
      category: row.category,
      status: row.status,
      priority: row.priority,
      tags: row.tags,
      attachments: row.attachments,
      firstResponseAt: row.firstResponseAt?.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      satisfactionRating: row.satisfactionRating ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
