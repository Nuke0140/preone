/**
 * Communication Queries — read-side projections (BTD §12.3).
 *
 * Per BTD §12.3: Queries bypass aggregates and hit Prisma read models
 * directly. They NEVER mutate state.
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetNotificationQuery implements Query<{ notificationId: string; tenantId: string }, unknown> {
  readonly type = 'Communication.GetNotification';
  constructor(readonly payload: { notificationId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListNotificationsQuery implements Query<{
  tenantId: string;
  userId?: string;
  channel?: string;
  status?: string;
  triggerEvent?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Communication.ListNotifications';
  constructor(
    readonly payload: {
      tenantId: string;
      userId?: string;
      channel?: string;
      status?: string;
      triggerEvent?: string;
      limit?: number;
      offset?: number;
    },
    readonly metadata: QueryMetadata,
  ) {}
}

export class GetAnnouncementQuery implements Query<{ announcementId: string; tenantId: string }, unknown> {
  readonly type = 'Communication.GetAnnouncement';
  constructor(readonly payload: { announcementId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListAnnouncementsQuery implements Query<{
  tenantId: string;
  audience?: string;
  status?: string;
  branchId?: string;
  classroomId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Communication.ListAnnouncements';
  constructor(
    readonly payload: {
      tenantId: string;
      audience?: string;
      status?: string;
      branchId?: string;
      classroomId?: string;
      limit?: number;
      offset?: number;
    },
    readonly metadata: QueryMetadata,
  ) {}
}

export class GetConversationQuery implements Query<{ conversationId: string; tenantId: string }, unknown> {
  readonly type = 'Communication.GetConversation';
  constructor(readonly payload: { conversationId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListConversationsQuery implements Query<{
  tenantId: string;
  userId: string;
  type?: string;
  isActive?: boolean;
  limit?: number;
}, unknown> {
  readonly type = 'Communication.ListConversations';
  constructor(
    readonly payload: {
      tenantId: string;
      userId: string;
      type?: string;
      isActive?: boolean;
      limit?: number;
    },
    readonly metadata: QueryMetadata,
  ) {}
}

export class ListMessagesQuery implements Query<{
  conversationId: string;
  tenantId: string;
  limit?: number;
  before?: string;
}, unknown> {
  readonly type = 'Communication.ListMessages';
  constructor(
    readonly payload: {
      conversationId: string;
      tenantId: string;
      limit?: number;
      before?: string;
    },
    readonly metadata: QueryMetadata,
  ) {}
}
