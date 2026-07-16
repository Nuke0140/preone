/**
 * NotificationAggregate — single notification instance destined for 1+ recipients.
 *
 * Per BTD §4.3 #7: Notifications across SMS/Email/Push/WhatsApp/In-App channels.
 *
 * Lifecycle: QUEUED → SENDING → SENT → DELIVERED → READ
 *                 ↘ FAILED (terminal, retried up to maxRetries)
 *                 ↘ CANCELLED (terminal)
 *
 * Invariants:
 *   - status transitions only forward (no backwards except retry on FAILED)
 *   - failed recipients tracked individually via NotificationRecipient
 *   - priority URGENT/CRITICAL bypasses the daily-quota check
 *   - triggerEvent is set when notification originates from an integration event
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  NotificationCreatedEvent, NotificationDeliveredEvent, NotificationFailedEvent,
  NotificationReadEvent, NotificationSentEvent,
} from '../../domain/events/communication-events';

export type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP' | 'IN_APP';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';
export type NotificationStatus =
  | 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'CANCELLED';

export interface NotificationProps {
  tenantId: string;
  branchId?: string;
  templateId?: string;
  triggerEvent?: string;
  sourceAggregateType?: string;
  sourceAggregateId?: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subject?: string;
  body: string;
  variables: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  status: NotificationStatus;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  recipientIds: string[];
  deliveredRecipientIds: string[];
  failedRecipientIds: string[];
  readRecipientIds: string[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  QUEUED: ['SENDING', 'CANCELLED'],
  SENDING: ['SENT', 'FAILED', 'CANCELLED'],
  SENT: ['DELIVERED', 'FAILED'],
  DELIVERED: ['READ'],
  READ: [],
  FAILED: ['QUEUED'], // retry allowed
  CANCELLED: [],
};

export class NotificationAggregate extends AggregateRoot<NotificationProps> {
  get tenantId(): string { return this._props.tenantId; }
  get channel(): NotificationChannel { return this._props.channel; }
  get priority(): NotificationPriority { return this._props.priority; }
  get status(): NotificationStatus { return this._props.status; }
  get triggerEvent(): string | undefined { return this._props.triggerEvent; }
  get isUrgent(): boolean {
    return this._props.priority === 'URGENT' || this._props.priority === 'CRITICAL';
  }

  static create(props: Omit<
    NotificationProps,
    'status' | 'retryCount' | 'maxRetries' | 'recipientIds' |
    'deliveredRecipientIds' | 'failedRecipientIds' | 'readRecipientIds' |
    'createdAt' | 'updatedAt'
  > & { recipientIds: string[]; maxRetries?: number }): NotificationAggregate {
    const now = new Date().toISOString();
    const agg = new NotificationAggregate({
      ...props,
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: props.maxRetries ?? 3,
      recipientIds: [...props.recipientIds],
      deliveredRecipientIds: [],
      failedRecipientIds: [],
      readRecipientIds: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new NotificationCreatedEvent({
      notificationId: agg.id,
      tenantId: agg._props.tenantId,
      channel: agg._props.channel,
      priority: agg._props.priority,
      triggerEvent: agg._props.triggerEvent,
    }));
    return agg;
  }

  startSending(): void {
    this._requireTransition('SENDING');
    this._props.status = 'SENDING';
    this._touch();
  }

  markSent(sentAt: string): void {
    this._requireTransition('SENT');
    this._props.status = 'SENT';
    this._props.sentAt = sentAt;
    this._touch();
    this._addDomainEvent(new NotificationSentEvent({
      notificationId: this.id,
      tenantId: this._props.tenantId,
      channel: this._props.channel,
      recipientCount: this._props.recipientIds.length,
      sentAt,
    }));
  }

  markDelivered(recipientId: string, deliveredAt: string): void {
    if (!this._props.recipientIds.includes(recipientId)) {
      throw new Error(`Recipient ${recipientId} not on this notification`);
    }
    if (this._props.deliveredRecipientIds.includes(recipientId)) return; // idempotent
    this._props.deliveredRecipientIds.push(recipientId);
    this._touch();
    this._addDomainEvent(new NotificationDeliveredEvent({
      notificationId: this.id,
      tenantId: this._props.tenantId,
      recipientId,
      channel: this._props.channel,
      deliveredAt,
    }));
  }

  markFailed(recipientId: string, reason: string, failedAt: string): void {
    if (!this._props.recipientIds.includes(recipientId)) {
      throw new Error(`Recipient ${recipientId} not on this notification`);
    }
    if (this._props.failedRecipientIds.includes(recipientId)) return;
    this._props.failedRecipientIds.push(recipientId);
    this._props.failureReason = reason;
    // If aggregate is in SENDING state, transition to FAILED (provider rejected)
    // SENT-state failures (delivery failures) don't change aggregate status —
    // they're tracked on NotificationRecipient entities only.
    if (this._props.status === 'SENDING') {
      this._props.status = 'FAILED';
    }
    this._touch();
    this._addDomainEvent(new NotificationFailedEvent({
      notificationId: this.id,
      tenantId: this._props.tenantId,
      recipientId,
      channel: this._props.channel,
      failureReason: reason,
      failedAt,
    }));
  }

  markRead(recipientId: string, readAt: string): void {
    if (!this._props.recipientIds.includes(recipientId)) {
      throw new Error(`Recipient ${recipientId} not on this notification`);
    }
    if (this._props.readRecipientIds.includes(recipientId)) return;
    this._props.readRecipientIds.push(recipientId);
    if (this._props.status === 'DELIVERED' || this._props.status === 'SENT') {
      this._props.status = 'READ';
    }
    this._touch();
    this._addDomainEvent(new NotificationReadEvent({
      notificationId: this.id,
      tenantId: this._props.tenantId,
      recipientId,
      readAt,
    }));
  }

  retry(): void {
    if (this._props.retryCount >= this._props.maxRetries) {
      throw new Error(`Max retries (${this._props.maxRetries}) exceeded`);
    }
    this._requireTransition('QUEUED');
    this._props.status = 'QUEUED';
    this._props.retryCount += 1;
    this._props.failureReason = undefined;
    // Clear per-recipient failure tracking so re-attempts can re-fail
    this._props.failedRecipientIds = [];
    this._touch();
  }

  cancel(): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: NotificationStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(
        `Invalid notification transition: ${this._props.status} → ${target}`,
      );
    }
  }
}
