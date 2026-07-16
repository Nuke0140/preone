/**
 * AnnouncementAggregate — broadcast message to a scoped audience.
 *
 * Lifecycle: DRAFT → SCHEDULED → PUBLISHED → ARCHIVED
 *
 * Audience scopes (per ERD §17):
 *   ALL_SCHOOL / BRANCH / CLASSROOM / GRADE_LEVEL / STAFF_ONLY /
 *   PARENTS_ONLY / SPECIFIC_USERS
 *
 * Invariants:
 *   - PUBLISHED requires authorId + publishedAt
 *   - Acknowledgement is per-recipient (AnnouncementRecipient entity)
 *   - Acknowledgement required flag forces recipient action
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  AnnouncementAcknowledgedEvent, AnnouncementArchivedEvent,
  AnnouncementCreatedEvent, AnnouncementPublishedEvent,
} from '../../domain/events/communication-events';

export type AnnouncementAudience =
  | 'ALL_SCHOOL' | 'BRANCH' | 'CLASSROOM' | 'GRADE_LEVEL'
  | 'STAFF_ONLY' | 'PARENTS_ONLY' | 'SPECIFIC_USERS';

export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export interface AnnouncementProps {
  tenantId: string;
  branchId?: string;
  classroomId?: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  status: AnnouncementStatus;
  priority: NotificationPriority;
  attachments: unknown[];
  authorId: string;
  publishedAt?: string;
  scheduledAt?: string;
  expiresAt?: string;
  acknowledgementRequired: boolean;
  recipientIds: string[];
  acknowledgedRecipientIds: string[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<AnnouncementStatus, AnnouncementStatus[]> = {
  DRAFT: ['SCHEDULED', 'PUBLISHED'],
  SCHEDULED: ['PUBLISHED', 'DRAFT'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

export class AnnouncementAggregate extends AggregateRoot<AnnouncementProps> {
  get tenantId(): string { return this._props.tenantId; }
  get audience(): AnnouncementAudience { return this._props.audience; }
  get status(): AnnouncementStatus { return this._props.status; }
  get title(): string { return this._props.title; }
  get isPublished(): boolean { return this._props.status === 'PUBLISHED'; }

  static create(props: Omit<
    AnnouncementProps,
    'status' | 'recipientIds' | 'acknowledgedRecipientIds' |
    'createdAt' | 'updatedAt'
  >): AnnouncementAggregate {
    const now = new Date().toISOString();
    const agg = new AnnouncementAggregate({
      ...props,
      status: 'DRAFT',
      recipientIds: [],
      acknowledgedRecipientIds: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new AnnouncementCreatedEvent({
      announcementId: agg.id,
      tenantId: agg._props.tenantId,
      branchId: agg._props.branchId,
      classroomId: agg._props.classroomId,
      audience: agg._props.audience,
      title: agg._props.title,
      authorId: agg._props.authorId,
    }));
    return agg;
  }

  schedule(scheduledAt: string): void {
    this._requireTransition('SCHEDULED');
    this._props.scheduledAt = scheduledAt;
    this._props.status = 'SCHEDULED';
    this._touch();
  }

  publish(recipientIds: string[], publishedAt: string): void {
    this._requireTransition('PUBLISHED');
    this._props.status = 'PUBLISHED';
    this._props.publishedAt = publishedAt;
    this._props.recipientIds = [...recipientIds];
    this._touch();
    this._addDomainEvent(new AnnouncementPublishedEvent({
      announcementId: this.id,
      tenantId: this._props.tenantId,
      audience: this._props.audience,
      recipientCount: recipientIds.length,
      publishedAt,
    }));
  }

  archive(archivedAt: string): void {
    this._requireTransition('ARCHIVED');
    this._props.status = 'ARCHIVED';
    this._touch();
    this._addDomainEvent(new AnnouncementArchivedEvent({
      announcementId: this.id,
      tenantId: this._props.tenantId,
      archivedAt,
    }));
  }

  acknowledge(recipientId: string, acknowledgedAt: string): void {
    if (!this._props.recipientIds.includes(recipientId)) {
      throw new Error(`Recipient ${recipientId} not on this announcement`);
    }
    if (this._props.acknowledgedRecipientIds.includes(recipientId)) return;
    this._props.acknowledgedRecipientIds.push(recipientId);
    this._touch();
    this._addDomainEvent(new AnnouncementAcknowledgedEvent({
      announcementId: this.id,
      tenantId: this._props.tenantId,
      recipientId,
      acknowledgedAt,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: AnnouncementStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(
        `Invalid announcement transition: ${this._props.status} → ${target}`,
      );
    }
  }
}
