/**
 * Communication Query Handlers — CQRS read side (BTD §12.3).
 * Queries bypass aggregates — they hit Prisma read models directly.
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import {
  GetAnnouncementQuery, GetConversationQuery, GetNotificationQuery,
  ListAnnouncementsQuery, ListConversationsQuery, ListMessagesQuery,
  ListNotificationsQuery,
} from '../queries/communication.queries';

@Injectable()
export class GetNotificationQueryHandler implements QueryHandler<GetNotificationQuery> {
  private static readonly TYPE = 'Communication.GetNotification';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetNotificationQueryHandler.TYPE, this);
  }
  async handle(q: GetNotificationQuery) {
    return this.prisma.notification.findFirst({
      where: { id: q.payload.notificationId, schoolId: q.payload.tenantId },
      include: { recipients: true, template: true },
    });
  }
}

@Injectable()
export class ListNotificationsQueryHandler implements QueryHandler<ListNotificationsQuery> {
  private static readonly TYPE = 'Communication.ListNotifications';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListNotificationsQueryHandler.TYPE, this);
  }
  async handle(q: ListNotificationsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 200);
    const offset = q.payload.offset ?? 0;
    return this.prisma.notification.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.channel && { channel: q.payload.channel as any }),
        ...(q.payload.status && { status: q.payload.status as any }),
        ...(q.payload.triggerEvent && { triggerEvent: q.payload.triggerEvent as any }),
        ...(q.payload.userId && { recipients: { some: { userId: q.payload.userId } } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { recipients: true },
    });
  }
}

@Injectable()
export class GetAnnouncementQueryHandler implements QueryHandler<GetAnnouncementQuery> {
  private static readonly TYPE = 'Communication.GetAnnouncement';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetAnnouncementQueryHandler.TYPE, this);
  }
  async handle(q: GetAnnouncementQuery) {
    return this.prisma.announcement.findFirst({
      where: { id: q.payload.announcementId, schoolId: q.payload.tenantId },
      include: { recipients: true },
    });
  }
}

@Injectable()
export class ListAnnouncementsQueryHandler implements QueryHandler<ListAnnouncementsQuery> {
  private static readonly TYPE = 'Communication.ListAnnouncements';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListAnnouncementsQueryHandler.TYPE, this);
  }
  async handle(q: ListAnnouncementsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 200);
    const offset = q.payload.offset ?? 0;
    return this.prisma.announcement.findMany({
      where: {
        schoolId: q.payload.tenantId,
        ...(q.payload.audience && { audience: q.payload.audience as any }),
        ...(q.payload.status && { status: q.payload.status as any }),
        ...(q.payload.branchId && { branchId: q.payload.branchId }),
        ...(q.payload.classroomId && { classroomId: q.payload.classroomId }),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

@Injectable()
export class GetConversationQueryHandler implements QueryHandler<GetConversationQuery> {
  private static readonly TYPE = 'Communication.GetConversation';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetConversationQueryHandler.TYPE, this);
  }
  async handle(q: GetConversationQuery) {
    return this.prisma.conversation.findFirst({
      where: { id: q.payload.conversationId, schoolId: q.payload.tenantId },
      include: {
        participants: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
  }
}

@Injectable()
export class ListConversationsQueryHandler implements QueryHandler<ListConversationsQuery> {
  private static readonly TYPE = 'Communication.ListConversations';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListConversationsQueryHandler.TYPE, this);
  }
  async handle(q: ListConversationsQuery) {
    const limit = Math.min(q.payload.limit ?? 50, 200);
    return this.prisma.conversation.findMany({
      where: {
        schoolId: q.payload.tenantId,
        isActive: q.payload.isActive ?? true,
        participants: { some: { userId: q.payload.userId, isActive: true } },
        ...(q.payload.type && { type: q.payload.type as any }),
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: { participants: true },
    });
  }
}

@Injectable()
export class ListMessagesQueryHandler implements QueryHandler<ListMessagesQuery> {
  private static readonly TYPE = 'Communication.ListMessages';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListMessagesQueryHandler.TYPE, this);
  }
  async handle(q: ListMessagesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    return this.prisma.message.findMany({
      where: {
        conversationId: q.payload.conversationId,
        schoolId: q.payload.tenantId,
        ...(q.payload.before && { createdAt: { lt: new Date(q.payload.before) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { readReceipts: true },
    });
  }
}
