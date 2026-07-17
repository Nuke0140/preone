/**
 * CommunicationService — application-layer orchestrator for the
 * Communication bounded context (BTD §4.3 #7).
 *
 * Responsibilities:
 *   - Create + dispatch notifications (multi-channel: SMS/Email/Push/WhatsApp/In-App)
 *   - Manage announcements (broadcast to scoped audiences)
 *   - Manage chat conversations + messages
 *   - Subscribe to integration events from Admissions + Attendance
 *
 * Per BTD §10 — application services are the transaction boundary; each
 * public method runs inside a UnitOfWork (Wave 5 simplification: direct
 * repository.save() — UnitOfWork integration deferred to Wave 6).
 */
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';
import { RealtimeEventPublisher } from '@infra/realtime/bridge/realtime-event-publisher';

import { AnnouncementAggregate } from '../../domain/aggregates/announcement.aggregate';
import { ConversationAggregate } from '../../domain/aggregates/conversation.aggregate';
import { NotificationAggregate } from '../../domain/aggregates/notification.aggregate';
import type {
  AnnouncementRepository, ConversationRepository, MessageRepository,
  NotificationRepository,
} from '../../domain/repositories/communication.repository';
import {
  ANNOUNCEMENT_REPOSITORY, CONVERSATION_REPOSITORY, MESSAGE_REPOSITORY,
  NOTIFICATION_REPOSITORY,
} from '../../domain/repositories/tokens';
import { Inject } from '@nestjs/common';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY) private readonly notifications: NotificationRepository,
    @Inject(ANNOUNCEMENT_REPOSITORY) private readonly announcements: AnnouncementRepository,
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepository,
    @Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeEventPublisher,
  ) {}

  // ─── Notifications ────────────────────────────────────────────

  async createNotification(props: {
    tenantId: string;
    branchId?: string;
    channel: 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP' | 'IN_APP';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
    templateId?: string;
    triggerEvent?: string;
    sourceAggregateType?: string;
    sourceAggregateId?: string;
    subject?: string;
    body: string;
    variables?: Record<string, unknown>;
    scheduledAt?: string;
    recipientIds: string[];
    maxRetries?: number;
  }): Promise<NotificationAggregate> {
    const n = NotificationAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      channel: props.channel,
      priority: props.priority ?? 'NORMAL',
      templateId: props.templateId,
      triggerEvent: props.triggerEvent,
      sourceAggregateType: props.sourceAggregateType,
      sourceAggregateId: props.sourceAggregateId,
      subject: props.subject,
      body: props.body,
      variables: props.variables ?? {},
      scheduledAt: props.scheduledAt,
      recipientIds: props.recipientIds,
      maxRetries: props.maxRetries,
    });
    await this.notifications.save(n);
    await this.eventBus.publishAll(n.commit());
    this.logger.log(`Created notification ${n.id} for ${props.recipientIds.length} recipient(s) on ${props.channel}`);
    return n;
  }

  async sendNotification(notificationId: string, tenantId: string): Promise<void> {
    const n = await this.notifications.findById(notificationId, tenantId);
    if (!n) throw new Error(`Notification ${notificationId} not found`);
    n.startSending();
    await this.notifications.save(n);
    await this.eventBus.publishAll(n.commit());

    // In v1 we mark sent immediately (provider dispatch is async via BullMQ
    // in production). The provider delivery webhook will then mark DELIVERED.
    const sentAt = new Date().toISOString();
    n.markSent(sentAt);
    await this.notifications.save(n);
    await this.eventBus.publishAll(n.commit());

    // Wave 16.1 — push to the notifications WS namespace so the recipient's
    // open browser tab receives the new notification immediately.
    // Access private props via the established `(n as any)._props` pattern
    // (same as resolveAudienceRecipients below) — avoids widening the public
    // aggregate API just for the realtime push.
    const nProps = (n as any)._props as {
      recipientIds: string[]; subject?: string; body: string;
    };
    for (const recipientId of nProps.recipientIds) {
      await this.realtime.publishToUser(
        'notifications',
        tenantId,
        recipientId,
        'notification.created',
        {
          notificationId: n.id,
          channel: n.channel,
          priority: n.priority,
          subject: nProps.subject,
          body: nProps.body,
          sentAt,
        },
      );
    }
  }

  async markNotificationRead(notificationId: string, recipientId: string, tenantId: string): Promise<void> {
    const n = await this.notifications.findById(notificationId, tenantId);
    if (!n) throw new Error(`Notification ${notificationId} not found`);
    n.markRead(recipientId, new Date().toISOString());
    await this.notifications.save(n);
    await this.eventBus.publishAll(n.commit());
  }

  // ─── Announcements ────────────────────────────────────────────

  async createAnnouncement(props: {
    tenantId: string;
    branchId?: string;
    classroomId?: string;
    title: string;
    body: string;
    audience: 'ALL_SCHOOL' | 'BRANCH' | 'CLASSROOM' | 'GRADE_LEVEL' | 'STAFF_ONLY' | 'PARENTS_ONLY' | 'SPECIFIC_USERS';
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
    attachments?: unknown[];
    authorId: string;
    acknowledgementRequired?: boolean;
    scheduledAt?: string;
  }): Promise<AnnouncementAggregate> {
    const a = AnnouncementAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      classroomId: props.classroomId,
      title: props.title,
      body: props.body,
      audience: props.audience,
      priority: props.priority ?? 'NORMAL',
      attachments: props.attachments ?? [],
      authorId: props.authorId,
      acknowledgementRequired: props.acknowledgementRequired ?? false,
    });
    if (props.scheduledAt) a.schedule(props.scheduledAt);
    await this.announcements.save(a);
    await this.eventBus.publishAll(a.commit());
    this.logger.log(`Created announcement "${props.title}" (${a.id}) for audience ${props.audience}`);
    return a;
  }

  async publishAnnouncement(announcementId: string, tenantId: string): Promise<void> {
    const a = await this.announcements.findById(announcementId, tenantId);
    if (!a) throw new Error(`Announcement ${announcementId} not found`);
    // Resolve recipients based on audience
    const recipientIds = await this.resolveAudienceRecipients(a, tenantId);
    a.publish(recipientIds, new Date().toISOString());
    await this.announcements.save(a);
    await this.eventBus.publishAll(a.commit());
    this.logger.log(`Published announcement ${a.id} to ${recipientIds.length} recipient(s)`);

    // Wave 16.1 — push the announcement to each recipient's private
    // notifications channel so open tabs render the new announcement
    // without polling. We use the notifications namespace (not chat)
    // because announcements are one-to-many broadcast, not conversational.
    for (const recipientId of recipientIds) {
      await this.realtime.publishToUser(
        'notifications',
        tenantId,
        recipientId,
        'announcement.published',
        {
          announcementId: a.id,
          title: a.title,
          audience: a.audience,
          publishedAt: new Date().toISOString(),
        },
      );
    }
  }

  async acknowledgeAnnouncement(announcementId: string, recipientId: string, tenantId: string, _note?: string): Promise<void> {
    const a = await this.announcements.findById(announcementId, tenantId);
    if (!a) throw new Error(`Announcement ${announcementId} not found`);
    a.acknowledge(recipientId, new Date().toISOString());
    await this.announcements.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  async archiveAnnouncement(announcementId: string, tenantId: string): Promise<void> {
    const a = await this.announcements.findById(announcementId, tenantId);
    if (!a) throw new Error(`Announcement ${announcementId} not found`);
    a.archive(new Date().toISOString());
    await this.announcements.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  // ─── Conversations + Messages ────────────────────────────────

  async createConversation(props: {
    tenantId: string;
    branchId?: string;
    classroomId?: string;
    type: 'DIRECT' | 'GROUP' | 'CLASSROOM' | 'BROADCAST';
    title?: string;
    createdBy: string;
    participantIds: string[];
  }): Promise<ConversationAggregate> {
    if (props.type === 'DIRECT' && props.participantIds.length !== 2) {
      throw new Error('DIRECT conversations require exactly 2 participants');
    }
    // For DIRECT conversations, check if one already exists between these two users
    if (props.type === 'DIRECT' && props.participantIds.length === 2) {
      const [a, b] = props.participantIds;
      if (a && b) {
        const existing = await this.conversations.findDirectConversation(props.tenantId, a, b);
        if (existing) return existing;
      }
    }
    const c = ConversationAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      classroomId: props.classroomId,
      type: props.type,
      title: props.title,
      createdBy: props.createdBy,
      participants: props.participantIds.map((userId, idx) => ({
        userId,
        role: idx === 0 ? 'OWNER' as const : 'MEMBER' as const,
        joinedAt: new Date().toISOString(),
        isActive: true,
      })),
      metadata: {},
    });
    await this.conversations.save(c);
    await this.eventBus.publishAll(c.commit());
    this.logger.log(`Created ${props.type} conversation ${c.id} with ${props.participantIds.length} participant(s)`);
    return c;
  }

  async sendMessage(props: {
    tenantId: string;
    conversationId: string;
    senderId: string;
    body: string;
    attachments?: unknown[];
    replyToId?: string;
  }): Promise<{ messageId: string }> {
    const c = await this.conversations.findById(props.conversationId, props.tenantId);
    if (!c) throw new Error(`Conversation ${props.conversationId} not found`);
    if (!c.isActiveParticipant(props.senderId)) {
      throw new Error(`Sender ${props.senderId} is not an active participant`);
    }
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.messages.save({
      id: messageId,
      tenantId: props.tenantId,
      conversationId: props.conversationId,
      senderId: props.senderId,
      body: props.body,
      attachments: props.attachments ?? [],
      replyToId: props.replyToId,
      status: 'SENT',
      createdAt: now,
    });
    c.touchLastMessage(props.body, now);
    await this.conversations.save(c);
    await this.eventBus.publishAll(c.commit());
    this.logger.debug(`Message ${messageId} sent in conversation ${props.conversationId}`);

    // Wave 16.1 — broadcast the new message to all subscribers of the
    // conversation's chat room. The room channel is `room:<conversationId>`
    // (per WS channel taxonomy). The scope resolver permits subscription
    // only to participants (for DIRECT/GROUP) or to teachers/parents of
    // the linked classroom (for CLASSROOM conversations).
    await this.realtime.publish(
      'chat',
      props.tenantId,
      `room:${props.conversationId}`,
      'chat.message.sent',
      {
        messageId,
        conversationId: props.conversationId,
        senderId: props.senderId,
        body: props.body,
        attachments: props.attachments ?? [],
        replyToId: props.replyToId,
        sentAt: now,
      },
    );

    return { messageId };
  }

  async markMessageRead(messageId: string, userId: string, tenantId: string): Promise<void> {
    // For v1 we just persist the read receipt via prisma directly
    await this.prisma.messageReadReceipt.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, schoolId: tenantId, readAt: new Date() },
      update: { readAt: new Date() },
    });
  }

  async addParticipant(props: {
    tenantId: string;
    conversationId: string;
    userId: string;
    role?: 'MEMBER' | 'ADMIN' | 'OWNER';
  }): Promise<void> {
    const c = await this.conversations.findById(props.conversationId, props.tenantId);
    if (!c) throw new Error(`Conversation ${props.conversationId} not found`);
    c.addParticipant(props.userId, props.role ?? 'MEMBER', new Date().toISOString());
    await this.conversations.save(c);
    await this.eventBus.publishAll(c.commit());
  }

  async removeParticipant(props: {
    tenantId: string;
    conversationId: string;
    userId: string;
  }): Promise<void> {
    const c = await this.conversations.findById(props.conversationId, props.tenantId);
    if (!c) throw new Error(`Conversation ${props.conversationId} not found`);
    c.removeParticipant(props.userId, new Date().toISOString());
    await this.conversations.save(c);
    await this.eventBus.publishAll(c.commit());
  }

  // ─── Helpers ────────────────────────────────────────────────

  /**
   * Resolve recipient user IDs based on announcement audience.
   * For SPECIFIC_USERS, the caller must pre-set recipients — not implemented here.
   */
  private async resolveAudienceRecipients(
    a: AnnouncementAggregate,
    tenantId: string,
  ): Promise<string[]> {
    if (a.audience === 'ALL_SCHOOL') {
      const users = await this.prisma.user.findMany({
        where: { schoolId: tenantId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      });
      return users.map(u => u.id);
    }
    if (a.audience === 'BRANCH') {
      const p = (a as any)._props;
      const users = await this.prisma.user.findMany({
        where: { schoolId: tenantId, branchId: p.branchId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true },
      });
      return users.map(u => u.id);
    }
    if (a.audience === 'CLASSROOM') {
      // Parents of students enrolled in classroom + classroom teachers
      const p = (a as any)._props;
      const enrollments = await this.prisma.enrollment.findMany({
        where: { section: { classroomId: p.classroomId }, status: 'ENROLLED' },
        include: { student: { include: { guardianLinks: { include: { guardian: { select: { userId: true } } } } } } },
      });
      const ids = new Set<string>();
      for (const e of enrollments) {
        for (const gl of e.student.guardianLinks) {
          if (gl.guardian.userId) ids.add(gl.guardian.userId);
        }
      }
      return Array.from(ids);
    }
    if (a.audience === 'STAFF_ONLY') {
      const users = await this.prisma.user.findMany({
        where: { schoolId: tenantId, deletedAt: null, status: 'ACTIVE', guardian: null },
        select: { id: true },
      });
      return users.map(u => u.id);
    }
    if (a.audience === 'PARENTS_ONLY') {
      const guardians = await this.prisma.guardian.findMany({
        where: { schoolId: tenantId, userId: { not: null } },
        select: { userId: true },
      });
      return guardians.map(g => g.userId).filter((x): x is string => x !== null);
    }
    return [];
  }
}
