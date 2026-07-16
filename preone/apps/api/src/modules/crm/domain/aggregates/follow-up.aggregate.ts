/**
 * FollowUpAggregate — scheduled follow-up activity on a lead.
 *
 * Lifecycle:
 *   SCHEDULED → IN_PROGRESS → {COMPLETED | CANCELLED | MISSED}
 *
 * Invariants:
 *   - Cannot complete without outcome notes
 *   - Missed follow-ups require reschedule
 *   - Follow-up type drives cadence (auto-reminders)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  FollowUpScheduledEvent, FollowUpStartedEvent, FollowUpCompletedEvent,
  FollowUpCancelledEvent, FollowUpMissedEvent, FollowUpRescheduledEvent,
} from '../events/crm-events';

export type FollowUpType =
  | 'CALL' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'CAMPUS_VISIT'
  | 'DEMO_CLASS' | 'PARENT_MEETING' | 'DOCUMENT_COLLECTION' | 'OTHER';

export type FollowUpStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';

export type FollowUpOutcome =
  | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'CONVERTED' | 'NO_RESPONSE' | 'RESCHEDULED';

export interface FollowUpProps {
  tenantId: string;
  branchId?: string;
  leadId: string;
  campaignId?: string;
  counsellorId: string;
  type: FollowUpType;
  status: FollowUpStatus;
  scheduledAt: string;
  durationMinutes?: number;
  outcome?: FollowUpOutcome;
  outcomeNotes?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  missedAt?: string;
  rescheduledTo?: string;
  rescheduledFollowUpId?: string;
  reminderSentCount: number;
  lastReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<FollowUpStatus, FollowUpStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'MISSED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED', 'MISSED'],
  COMPLETED: [],
  CANCELLED: [],
  MISSED: [],
};

export class FollowUpAggregate extends AggregateRoot<FollowUpProps> {
  get tenantId(): string { return this._props.tenantId; }
  get leadId(): string { return this._props.leadId; }
  get status(): FollowUpStatus { return this._props.status; }
  get type(): FollowUpType { return this._props.type; }
  get scheduledAt(): string { return this._props.scheduledAt; }
  get outcome(): FollowUpOutcome | undefined { return this._props.outcome; }

  static create(props: Omit<
    FollowUpProps,
    'status' | 'reminderSentCount' | 'createdAt' | 'updatedAt'
  >): FollowUpAggregate {
    const now = new Date().toISOString();
    const agg = new FollowUpAggregate({
      ...props,
      status: 'SCHEDULED',
      reminderSentCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new FollowUpScheduledEvent({
      followUpId: agg.id,
      tenantId: agg._props.tenantId,
      leadId: agg._props.leadId,
      counsellorId: agg._props.counsellorId,
      type: agg._props.type,
      scheduledAt: agg._props.scheduledAt,
    }));
    return agg;
  }

  start(): void {
    this._requireTransition('IN_PROGRESS');
    this._props.status = 'IN_PROGRESS';
    this._props.startedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new FollowUpStartedEvent({
      followUpId: this.id,
      tenantId: this._props.tenantId,
      leadId: this._props.leadId,
    }));
  }

  complete(outcome: FollowUpOutcome, notes: string, durationMinutes?: number): void {
    this._requireTransition('COMPLETED');
    if (!notes || notes.trim().length === 0) {
      throw new Error('Cannot complete follow-up without outcome notes');
    }
    this._props.status = 'COMPLETED';
    this._props.outcome = outcome;
    this._props.outcomeNotes = notes;
    this._props.durationMinutes = durationMinutes;
    this._props.completedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new FollowUpCompletedEvent({
      followUpId: this.id,
      tenantId: this._props.tenantId,
      leadId: this._props.leadId,
      outcome,
    }));
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = new Date().toISOString();
    this._props.cancellationReason = reason;
    this._touch();
    this._addDomainEvent(new FollowUpCancelledEvent({
      followUpId: this.id,
      tenantId: this._props.tenantId,
      leadId: this._props.leadId,
      reason,
    }));
  }

  miss(): void {
    this._requireTransition('MISSED');
    this._props.status = 'MISSED';
    this._props.missedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new FollowUpMissedEvent({
      followUpId: this.id,
      tenantId: this._props.tenantId,
      leadId: this._props.leadId,
      originalScheduledAt: this._props.scheduledAt,
    }));
  }

  /**
   * Reschedule a missed follow-up — creates a new scheduled follow-up ID ref.
   */
  reschedule(newScheduledAt: string, newFollowUpId: string): void {
    if (this._props.status !== 'MISSED' && this._props.status !== 'CANCELLED') {
      throw new Error('Can only reschedule MISSED or CANCELLED follow-ups');
    }
    this._props.rescheduledTo = newScheduledAt;
    this._props.rescheduledFollowUpId = newFollowUpId;
    this._touch();
    this._addDomainEvent(new FollowUpRescheduledEvent({
      followUpId: this.id,
      tenantId: this._props.tenantId,
      leadId: this._props.leadId,
      originalScheduledAt: this._props.scheduledAt,
      newScheduledAt,
      newFollowUpId,
    }));
  }

  recordReminderSent(): void {
    this._props.reminderSentCount += 1;
    this._props.lastReminderSentAt = new Date().toISOString();
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: FollowUpStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid follow-up transition: ${this._props.status} → ${target}`);
    }
  }
}
