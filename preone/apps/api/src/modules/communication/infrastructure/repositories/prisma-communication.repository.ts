/**
 * PrismaCommunicationRepository — concrete impl of Communication repos.
 *
 * Each repo persists the full aggregate including child entities (recipients,
 * participants) via Prisma nested writes.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { AnnouncementAggregate } from '../../domain/aggregates/announcement.aggregate';
import { ConversationAggregate } from '../../domain/aggregates/conversation.aggregate';
import { NotificationAggregate } from '../../domain/aggregates/notification.aggregate';
import type {
  AnnouncementRepository, ConversationRepository, MessageRepository,
  NotificationRepository,
} from '../../domain/repositories/communication.repository';

// ─── Notification Repository ─────────────────────────────────

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: NotificationAggregate): Promise<void> {
    const p = (agg as any)._props as NotificationAggregate extends { readonly tenantId: string } ? any : any;
    await this.prisma.notification.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        templateId: p.templateId,
        triggerEvent: p.triggerEvent,
        sourceAggregateType: p.sourceAggregateType,
        sourceAggregateId: p.sourceAggregateId,
        channel: p.channel,
        priority: p.priority,
        subject: p.subject,
        body: p.body,
        variables: p.variables ?? {},
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        sentAt: p.sentAt ? new Date(p.sentAt) : null,
        status: p.status,
        failureReason: p.failureReason,
        retryCount: p.retryCount,
        maxRetries: p.maxRetries,
        recipients: {
          create: p.recipientIds.map((rid: string) => ({
            id: crypto.randomUUID(),
            schoolId: p.tenantId,
            notificationId: agg.id,
            userId: rid,
            status: 'QUEUED',
          })),
        },
      },
      update: {
        status: p.status,
        sentAt: p.sentAt ? new Date(p.sentAt) : null,
        failureReason: p.failureReason,
        retryCount: p.retryCount,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
      },
    });
    // Persist recipient status updates
    for (const rid of p.deliveredRecipientIds as string[]) {
      await this.prisma.notificationRecipient.updateMany({
        where: { notificationId: agg.id, userId: rid },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });
    }
    for (const rid of p.failedRecipientIds as string[]) {
      await this.prisma.notificationRecipient.updateMany({
        where: { notificationId: agg.id, userId: rid },
        data: { status: 'FAILED', failureReason: p.failureReason },
      });
    }
    for (const rid of p.readRecipientIds as string[]) {
      await this.prisma.notificationRecipient.updateMany({
        where: { notificationId: agg.id, userId: rid },
        data: { status: 'READ', readAt: new Date() },
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<NotificationAggregate | null> {
    const row = await this.prisma.notification.findFirst({
      where: { id, schoolId: tenantId },
      include: { recipients: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findPendingByTenant(tenantId: string, limit = 100): Promise<NotificationAggregate[]> {
    const rows = await this.prisma.notification.findMany({
      where: { schoolId: tenantId, status: 'QUEUED' },
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: { recipients: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByTriggerEvent(tenantId: string, triggerEvent: string, sourceAggregateId?: string): Promise<NotificationAggregate[]> {
    const rows = await this.prisma.notification.findMany({
      where: {
        schoolId: tenantId,
        triggerEvent: triggerEvent as any,
        ...(sourceAggregateId && { sourceAggregateId }),
      },
      include: { recipients: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): NotificationAggregate {
    const p = (NotificationAggregate as any);
    // Use reconstitution — bypass create() to avoid re-emitting events
    const agg = Object.create(p.prototype) as NotificationAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      templateId: row.templateId,
      triggerEvent: row.triggerEvent,
      sourceAggregateType: row.sourceAggregateType,
      sourceAggregateId: row.sourceAggregateId,
      channel: row.channel,
      priority: row.priority,
      subject: row.subject,
      body: row.body,
      variables: row.variables ?? {},
      scheduledAt: row.scheduledAt?.toISOString(),
      sentAt: row.sentAt?.toISOString(),
      status: row.status,
      failureReason: row.failureReason,
      retryCount: row.retryCount,
      maxRetries: row.maxRetries,
      recipientIds: (row.recipients ?? []).map((r: any) => r.userId),
      deliveredRecipientIds: (row.recipients ?? []).filter((r: any) => r.status === 'DELIVERED').map((r: any) => r.userId),
      failedRecipientIds: (row.recipients ?? []).filter((r: any) => r.status === 'FAILED').map((r: any) => r.userId),
      readRecipientIds: (row.recipients ?? []).filter((r: any) => r.status === 'READ').map((r: any) => r.userId),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = row.version ?? 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Announcement Repository ─────────────────────────────────

@Injectable()
export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: AnnouncementAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.announcement.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        classroomId: p.classroomId,
        title: p.title,
        body: p.body,
        audience: p.audience,
        status: p.status,
        priority: p.priority,
        attachments: p.attachments ?? [],
        authorId: p.authorId,
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
        expiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
        acknowledgementRequired: p.acknowledgementRequired,
      },
      update: {
        status: p.status,
        publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
        scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
      },
    });
    // Sync recipients (only on publish)
    if (p.status === 'PUBLISHED' && p.recipientIds.length > 0) {
      await this.prisma.announcementRecipient.createMany({
        data: p.recipientIds.map((rid: string) => ({
          id: crypto.randomUUID(),
          schoolId: p.tenantId,
          announcementId: agg.id,
          userId: rid,
        })),
        skipDuplicates: true,
      });
    }
    // Mark acknowledged
    for (const rid of p.acknowledgedRecipientIds as string[]) {
      await this.prisma.announcementRecipient.updateMany({
        where: { announcementId: agg.id, userId: rid },
        data: { acknowledgedAt: new Date() },
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<AnnouncementAggregate | null> {
    const row = await this.prisma.announcement.findFirst({
      where: { id, schoolId: tenantId },
      include: { recipients: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findPublishedByTenant(tenantId: string, limit = 50): Promise<AnnouncementAggregate[]> {
    const rows = await this.prisma.announcement.findMany({
      where: { schoolId: tenantId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { recipients: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByAudience(tenantId: string, audience: string, limit = 50): Promise<AnnouncementAggregate[]> {
    const rows = await this.prisma.announcement.findMany({
      where: { schoolId: tenantId, audience: audience as any, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      include: { recipients: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): AnnouncementAggregate {
    const agg = Object.create(AnnouncementAggregate.prototype) as AnnouncementAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      classroomId: row.classroomId,
      title: row.title,
      body: row.body,
      audience: row.audience,
      status: row.status,
      priority: row.priority,
      attachments: row.attachments ?? [],
      authorId: row.authorId,
      publishedAt: row.publishedAt?.toISOString(),
      scheduledAt: row.scheduledAt?.toISOString(),
      expiresAt: row.expiresAt?.toISOString(),
      acknowledgementRequired: row.acknowledgementRequired,
      recipientIds: (row.recipients ?? []).map((r: any) => r.userId),
      acknowledgedRecipientIds: (row.recipients ?? []).filter((r: any) => r.acknowledgedAt).map((r: any) => r.userId),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Conversation Repository ─────────────────────────────────

@Injectable()
export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: ConversationAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.conversation.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        classroomId: p.classroomId,
        type: p.type,
        title: p.title,
        avatarUrl: p.avatarUrl,
        lastMessageAt: new Date(p.lastMessageAt),
        lastMessagePreview: p.lastMessagePreview,
        isActive: p.isActive,
        createdBy: p.createdBy,
        metadata: p.metadata ?? {},
        participants: {
          create: p.participants.map((pt: any) => ({
            id: crypto.randomUUID(),
            schoolId: p.tenantId,
            conversationId: agg.id,
            userId: pt.userId,
            role: pt.role,
            joinedAt: new Date(pt.joinedAt),
            isActive: pt.isActive,
            lastReadAt: pt.lastReadAt ? new Date(pt.lastReadAt) : null,
          })),
        },
      },
      update: {
        lastMessageAt: new Date(p.lastMessageAt),
        lastMessagePreview: p.lastMessagePreview,
        isActive: p.isActive,
      },
    });
    // Sync participant isActive + lastReadAt changes
    for (const pt of p.participants as any[]) {
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: agg.id, userId: pt.userId },
        data: {
          isActive: pt.isActive,
          role: pt.role,
          ...(pt.lastReadAt && { lastReadAt: new Date(pt.lastReadAt) }),
        },
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<ConversationAggregate | null> {
    const row = await this.prisma.conversation.findFirst({
      where: { id, schoolId: tenantId },
      include: { participants: true },
    });
    if (!row) return null;
    return this._hydrate(row);
  }

  async findByParticipant(userId: string, tenantId: string): Promise<ConversationAggregate[]> {
    const rows = await this.prisma.conversation.findMany({
      where: { schoolId: tenantId, participants: { some: { userId, isActive: true } }, isActive: true },
      orderBy: { lastMessageAt: 'desc' },
      include: { participants: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findDirectConversation(tenantId: string, userIdA: string, userIdB: string): Promise<ConversationAggregate | null> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        schoolId: tenantId,
        type: 'DIRECT',
        isActive: true,
        participants: { some: { userId: userIdA, isActive: true } },
      },
      include: { participants: true },
    });
    const match = rows.find(r => r.participants.some(p => p.userId === userIdB && p.isActive));
    return match ? this._hydrate(match) : null;
  }

  private _hydrate(row: any): ConversationAggregate {
    const agg = Object.create(ConversationAggregate.prototype) as ConversationAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      classroomId: row.classroomId,
      type: row.type,
      title: row.title,
      avatarUrl: row.avatarUrl,
      lastMessageAt: row.lastMessageAt.toISOString(),
      lastMessagePreview: row.lastMessagePreview ?? undefined,
      isActive: row.isActive,
      createdBy: row.createdBy,
      participants: (row.participants ?? []).map((p: any) => ({
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt.toISOString(),
        isActive: p.isActive,
        lastReadAt: p.lastReadAt?.toISOString(),
      })),
      metadata: row.metadata ?? {},
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    (agg as any)._version = 1;
    (agg as any)._domainEvents = [];
    return agg;
  }
}

// ─── Message Repository ──────────────────────────────────────

@Injectable()
export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(msg: {
    id: string;
    tenantId: string;
    conversationId: string;
    senderId: string;
    body: string;
    attachments: unknown[];
    replyToId?: string;
    status: string;
    createdAt: string;
  }): Promise<void> {
    await this.prisma.message.create({
      data: {
        id: msg.id,
        schoolId: msg.tenantId,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        body: msg.body,
        attachments: msg.attachments as any[],
        replyToId: msg.replyToId ?? null,
        status: msg.status as any,
      },
    });
  }

  async findByConversation(conversationId: string, tenantId: string, limit = 100, before?: string): Promise<unknown[]> {
    return this.prisma.message.findMany({
      where: {
        conversationId,
        schoolId: tenantId,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
