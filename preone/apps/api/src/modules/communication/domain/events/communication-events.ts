/**
 * Communication Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Notification, Announcement, Conversation, Message aggregates.
 *
 * Integration events (BTD §14) — published to Redis Stream after outbox drain:
 *   - NotificationSent.v1       → Audit (delivery log)
 *   - NotificationFailed.v1     → Audit (escalation if URGENT)
 *   - AnnouncementPublished.v1  → Communication (deliver to recipients)
 *   - MessageSent.v1            → Communication (push to conversation participants)
 *   - MessageRead.v1            → Communication (clear unread badge)
 *   - ConversationCreated.v1    → Communication (notify participants)
 *
 * Subscribers (this module is itself a SUBSCRIBER to integration events
 * from Admissions + Attendance):
 *   - ApplicationSubmitted.v1  → send confirmation SMS to parent
 *   - AdmissionApproved.v1     → send welcome email to parent
 *   - ApplicationRejected.v1   → send rejection email
 *   - SeatOffered.v1           → send offer letter email + SMS
 *   - AdmissionCancelled.v1    → notify parent of cancellation
 *   - AttendanceMarked.v1      → parent SMS if status ∈ {ABSENT, LATE}
 *   - IncidentReported.v1      → parent notification within 1h SLA
 *   - DailyReportSent.v1       → parent ack tracker
 *   - LatePickupRecorded.v1    → parent alert + Finance (late fee invoice)
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Notification lifecycle
// ─────────────────────────────────────────────

export class NotificationCreatedEvent extends DomainEvent<{
  notificationId: string;
  tenantId: string;
  channel: string;
  priority: string;
  triggerEvent?: string;
}> {}

export class NotificationSentEvent extends DomainEvent<{
  notificationId: string;
  tenantId: string;
  channel: string;
  recipientCount: number;
  sentAt: string;
}> {}

export class NotificationDeliveredEvent extends DomainEvent<{
  notificationId: string;
  tenantId: string;
  recipientId: string;
  channel: string;
  deliveredAt: string;
}> {}

export class NotificationFailedEvent extends DomainEvent<{
  notificationId: string;
  tenantId: string;
  recipientId: string;
  channel: string;
  failureReason: string;
  failedAt: string;
}> {}

export class NotificationReadEvent extends DomainEvent<{
  notificationId: string;
  tenantId: string;
  recipientId: string;
  readAt: string;
}> {}

// ─────────────────────────────────────────────
// Announcement
// ─────────────────────────────────────────────

export class AnnouncementCreatedEvent extends DomainEvent<{
  announcementId: string;
  tenantId: string;
  branchId?: string;
  classroomId?: string;
  audience: string;
  title: string;
  authorId: string;
}> {}

export class AnnouncementPublishedEvent extends DomainEvent<{
  announcementId: string;
  tenantId: string;
  audience: string;
  recipientCount: number;
  publishedAt: string;
}> {}

export class AnnouncementArchivedEvent extends DomainEvent<{
  announcementId: string;
  tenantId: string;
  archivedAt: string;
}> {}

export class AnnouncementAcknowledgedEvent extends DomainEvent<{
  announcementId: string;
  tenantId: string;
  recipientId: string;
  acknowledgedAt: string;
}> {}

// ─────────────────────────────────────────────
// Conversation + Message
// ─────────────────────────────────────────────

export class ConversationCreatedEvent extends DomainEvent<{
  conversationId: string;
  tenantId: string;
  conversationType: string;
  participantCount: number;
  createdBy: string;
}> {}

export class ParticipantAddedEvent extends DomainEvent<{
  conversationId: string;
  tenantId: string;
  userId: string;
  role: string;
  addedAt: string;
}> {}

export class ParticipantRemovedEvent extends DomainEvent<{
  conversationId: string;
  tenantId: string;
  userId: string;
  removedAt: string;
}> {}

export class MessageSentEvent extends DomainEvent<{
  messageId: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  bodyPreview: string; // first 200 chars
  sentAt: string;
}> {}

export class MessageReadEvent extends DomainEvent<{
  messageId: string;
  tenantId: string;
  conversationId: string;
  userId: string;
  readAt: string;
}> {}

export class MessageRecalledEvent extends DomainEvent<{
  messageId: string;
  tenantId: string;
  conversationId: string;
  recalledBy: string;
  recalledAt: string;
}> {}
