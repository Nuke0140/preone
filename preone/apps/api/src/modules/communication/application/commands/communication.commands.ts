/**
 * Communication Commands — CQRS write side (BTD §12.2).
 *
 * Per BTD §12.2 — Commands are intent-bearing; handlers load aggregate →
 * mutate → save → return ID. Commands never return read models.
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Notifications ─────────────────────────────────────────────

export class CreateNotificationCommand implements Command<{
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
}, { id: string }> {
  readonly type = 'Communication.CreateNotification';
  constructor(
    readonly payload: {
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
    },
    readonly metadata: CommandMetadata,
  ) {}
}

export class SendNotificationCommand implements Command<{ notificationId: string; tenantId: string }, { id: string }> {
  readonly type = 'Communication.SendNotification';
  constructor(
    readonly payload: { notificationId: string; tenantId: string },
    readonly metadata: CommandMetadata,
  ) {}
}

export class MarkNotificationReadCommand implements Command<{ notificationId: string; recipientId: string; tenantId: string }, { id: string }> {
  readonly type = 'Communication.MarkNotificationRead';
  constructor(
    readonly payload: { notificationId: string; recipientId: string; tenantId: string },
    readonly metadata: CommandMetadata,
  ) {}
}

// ─── Announcements ────────────────────────────────────────────

export class CreateAnnouncementCommand implements Command<{
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
}, { id: string }> {
  readonly type = 'Communication.CreateAnnouncement';
  constructor(
    readonly payload: {
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
    },
    readonly metadata: CommandMetadata,
  ) {}
}

export class PublishAnnouncementCommand implements Command<{ announcementId: string; tenantId: string }, { id: string }> {
  readonly type = 'Communication.PublishAnnouncement';
  constructor(
    readonly payload: { announcementId: string; tenantId: string },
    readonly metadata: CommandMetadata,
  ) {}
}

export class AcknowledgeAnnouncementCommand implements Command<{
  announcementId: string;
  recipientId: string;
  tenantId: string;
  note?: string;
}, { id: string }> {
  readonly type = 'Communication.AcknowledgeAnnouncement';
  constructor(
    readonly payload: { announcementId: string; recipientId: string; tenantId: string; note?: string },
    readonly metadata: CommandMetadata,
  ) {}
}

export class ArchiveAnnouncementCommand implements Command<{ announcementId: string; tenantId: string }, { id: string }> {
  readonly type = 'Communication.ArchiveAnnouncement';
  constructor(
    readonly payload: { announcementId: string; tenantId: string },
    readonly metadata: CommandMetadata,
  ) {}
}

// ─── Conversations + Messages ────────────────────────────────

export class CreateConversationCommand implements Command<{
  tenantId: string;
  branchId?: string;
  classroomId?: string;
  type: 'DIRECT' | 'GROUP' | 'CLASSROOM' | 'BROADCAST';
  title?: string;
  createdBy: string;
  participantIds: string[];
}, { id: string }> {
  readonly type = 'Communication.CreateConversation';
  constructor(
    readonly payload: {
      tenantId: string;
      branchId?: string;
      classroomId?: string;
      type: 'DIRECT' | 'GROUP' | 'CLASSROOM' | 'BROADCAST';
      title?: string;
      createdBy: string;
      participantIds: string[];
    },
    readonly metadata: CommandMetadata,
  ) {}
}

export class SendMessageCommand implements Command<{
  tenantId: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachments?: unknown[];
  replyToId?: string;
}, { messageId: string }> {
  readonly type = 'Communication.SendMessage';
  constructor(
    readonly payload: {
      tenantId: string;
      conversationId: string;
      senderId: string;
      body: string;
      attachments?: unknown[];
      replyToId?: string;
    },
    readonly metadata: CommandMetadata,
  ) {}
}

export class MarkMessageReadCommand implements Command<{ tenantId: string; messageId: string; userId: string }, { id: string }> {
  readonly type = 'Communication.MarkMessageRead';
  constructor(
    readonly payload: { tenantId: string; messageId: string; userId: string },
    readonly metadata: CommandMetadata,
  ) {}
}

export class AddParticipantCommand implements Command<{
  tenantId: string;
  conversationId: string;
  userId: string;
  role?: 'MEMBER' | 'ADMIN' | 'OWNER';
}, { id: string }> {
  readonly type = 'Communication.AddParticipant';
  constructor(
    readonly payload: {
      tenantId: string;
      conversationId: string;
      userId: string;
      role?: 'MEMBER' | 'ADMIN' | 'OWNER';
    },
    readonly metadata: CommandMetadata,
  ) {}
}

export class RemoveParticipantCommand implements Command<{ tenantId: string; conversationId: string; userId: string }, { id: string }> {
  readonly type = 'Communication.RemoveParticipant';
  constructor(
    readonly payload: { tenantId: string; conversationId: string; userId: string },
    readonly metadata: CommandMetadata,
  ) {}
}
