/**
 * CalendarEventAggregate — school / branch calendar event.
 *
 * Lifecycle: ACTIVE → CANCELLED (terminal)
 *
 * Invariants:
 *   - endDate ≥ startDate
 *   - If isFullDay, time portion ignored
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  CalendarEventCancelledEvent, CalendarEventCreatedEvent, CalendarEventUpdatedEvent,
} from '../events/settings-events';

export type CalendarEventType =
  | 'HOLIDAY' | 'EVENT' | 'EXAM' | 'PTM' | 'SPORTS_DAY'
  | 'CULTURAL_DAY' | 'FIELD_TRIP' | 'STAFF_MEETING'
  | 'GOVERNMENT_HOLIDAY' | 'OTHER';

export type CalendarEventVisibility =
  | 'PUBLIC' | 'STAFF_ONLY' | 'ADMIN_ONLY' | 'PARENTS_ONLY';

export interface CalendarEventProps {
  tenantId: string;
  branchId?: string;
  academicSessionId?: string;
  title: string;
  description?: string;
  type: CalendarEventType;
  visibility: CalendarEventVisibility;
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  location?: string;
  organizerId?: string;
  isCancelled: boolean;
  isRecurring: boolean;
  recurrenceRule?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export class CalendarEventAggregate extends AggregateRoot<CalendarEventProps> {
  get tenantId(): string { return this._props.tenantId; }
  get title(): string { return this._props.title; }
  get type(): CalendarEventType { return this._props.type; }
  get startDate(): string { return this._props.startDate; }
  get endDate(): string { return this._props.endDate; }
  get isCancelled(): boolean { return this._props.isCancelled; }
  get visibility(): CalendarEventVisibility { return this._props.visibility; }

  static create(props: Omit<
    CalendarEventProps,
    'isCancelled' | 'createdAt' | 'updatedAt'
  >): CalendarEventAggregate {
    if (new Date(props.endDate) < new Date(props.startDate)) {
      throw new Error('endDate cannot be before startDate');
    }
    const now = new Date().toISOString();
    const agg = new CalendarEventAggregate({
      ...props,
      isCancelled: false,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new CalendarEventCreatedEvent({
      eventId: agg.id,
      tenantId: agg._props.tenantId,
      title: agg._props.title,
      type: agg._props.type,
      startDate: agg._props.startDate,
    }));
    return agg;
  }

  update(changes: Partial<Omit<CalendarEventProps, 'tenantId' | 'createdAt' | 'isCancelled'>>): void {
    if (changes.endDate && changes.startDate && new Date(changes.endDate) < new Date(changes.startDate)) {
      throw new Error('endDate cannot be before startDate');
    }
    if (changes.endDate && !changes.startDate && new Date(changes.endDate) < new Date(this._props.startDate)) {
      throw new Error('endDate cannot be before startDate');
    }
    Object.assign(this._props, changes);
    this._touch();
    this._addDomainEvent(new CalendarEventUpdatedEvent({
      eventId: this.id,
      tenantId: this._props.tenantId,
      changes,
    }));
  }

  cancel(): void {
    if (this._props.isCancelled) return;
    this._props.isCancelled = true;
    this._touch();
    this._addDomainEvent(new CalendarEventCancelledEvent({
      eventId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
