/**
 * Communication Repository Ports — interfaces implemented by Prisma repos.
 *
 * Per BTD §11.1 — Repository Interface Contract:
 *   - save(aggregate): persists full aggregate + child entities (Unit of Work)
 *   - findById(id, tenantId): loads single aggregate or null
 *   - findByIds(ids, tenantId): bulk load
 *   - remove(id, tenantId): soft delete
 */
import type { NotificationAggregate } from '../aggregates/notification.aggregate';
import type { AnnouncementAggregate } from '../aggregates/announcement.aggregate';
import type { ConversationAggregate } from '../aggregates/conversation.aggregate';

export interface NotificationRepository {
  save(agg: NotificationAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<NotificationAggregate | null>;
  findPendingByTenant(tenantId: string, limit?: number): Promise<NotificationAggregate[]>;
  findByTriggerEvent(tenantId: string, triggerEvent: string, sourceAggregateId?: string): Promise<NotificationAggregate[]>;
}

export interface AnnouncementRepository {
  save(agg: AnnouncementAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<AnnouncementAggregate | null>;
  findPublishedByTenant(tenantId: string, limit?: number): Promise<AnnouncementAggregate[]>;
  findByAudience(tenantId: string, audience: string, limit?: number): Promise<AnnouncementAggregate[]>;
}

export interface ConversationRepository {
  save(agg: ConversationAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<ConversationAggregate | null>;
  findByParticipant(userId: string, tenantId: string): Promise<ConversationAggregate[]>;
  findDirectConversation(tenantId: string, userIdA: string, userIdB: string): Promise<ConversationAggregate | null>;
}

export interface MessageRepository {
  save(msg: {
    id: string;
    tenantId: string;
    conversationId: string;
    senderId: string;
    body: string;
    attachments: unknown[];
    replyToId?: string;
    status: string;
    createdAt: string;
  }): Promise<void>;
  findByConversation(conversationId: string, tenantId: string, limit?: number, before?: string): Promise<unknown[]>;
}

export interface CommunicationTemplateRepository {
  findByTriggerEvent(tenantId: string, triggerEvent: string, channel: string, locale?: string): Promise<unknown | null>;
  findByCode(tenantId: string, code: string, channel: string, locale?: string): Promise<unknown | null>;
}
