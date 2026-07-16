/**
 * SupportTicketAggregate — tenant support ticket.
 *
 * Lifecycle:
 *   OPEN → IN_PROGRESS → {WAITING_ON_USER | RESOLVED | CLOSED}
 *       ↘ REOPENED → IN_PROGRESS
 *   RESOLVED → CLOSED (terminal) | REOPENED
 *
 * Invariants:
 *   - ticketNumber unique per school
 *   - satisfactionRating must be 1-5 if provided
 *   - Resolved ticket requires resolvedAt
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  SupportTicketAssignedEvent, SupportTicketStatusChangedEvent,
} from '../events/platform-events';

export type SupportTicketStatus =
  | 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_USER'
  | 'RESOLVED' | 'CLOSED' | 'REOPENED';

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SupportTicketCategory =
  | 'BILLING' | 'TECHNICAL' | 'ONBOARDING' | 'FEATURE_REQUEST'
  | 'BUG' | 'DATA_MIGRATION' | 'OTHER';

const TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_USER', 'RESOLVED', 'CLOSED'],
  WAITING_ON_USER: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'CLOSED'],
};

export interface SupportTicketProps {
  tenantId: string;
  raisedById: string;
  assignedToId?: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  tags: string[];
  attachments?: any;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
  createdAt: string;
  updatedAt: string;
}

export class SupportTicketAggregate extends AggregateRoot<SupportTicketProps> {
  get tenantId(): string { return this._props.tenantId; }
  get ticketNumber(): string { return this._props.ticketNumber; }
  get subject(): string { return this._props.subject; }
  get status(): SupportTicketStatus { return this._props.status; }
  get priority(): SupportTicketPriority { return this._props.priority; }
  get assignedToId(): string | undefined { return this._props.assignedToId; }
  get raisedById(): string { return this._props.raisedById; }
  get satisfactionRating(): number | undefined { return this._props.satisfactionRating; }
  get tags(): readonly string[] { return Object.freeze([...this._props.tags]); }

  static create(props: Omit<
    SupportTicketProps,
    'status' | 'tags' | 'createdAt' | 'updatedAt'
  > & { tags?: string[] }): SupportTicketAggregate {
    const now = new Date().toISOString();
    const agg = new SupportTicketAggregate({
      tenantId: props.tenantId,
      raisedById: props.raisedById,
      assignedToId: props.assignedToId,
      ticketNumber: props.ticketNumber,
      subject: props.subject,
      description: props.description,
      category: props.category,
      priority: props.priority,
      attachments: props.attachments,
      tags: props.tags ?? [],
      status: 'OPEN',
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  setStatus(newStatus: SupportTicketStatus, at: string): void {
    this._requireTransition(newStatus);
    const oldStatus = this._props.status;
    this._props.status = newStatus;
    if (newStatus === 'IN_PROGRESS' && !this._props.firstResponseAt) {
      this._props.firstResponseAt = at;
    }
    if (newStatus === 'RESOLVED') {
      this._props.resolvedAt = at;
    }
    if (newStatus === 'CLOSED') {
      this._props.closedAt = at;
    }
    if (newStatus === 'REOPENED') {
      this._props.resolvedAt = undefined;
      this._props.closedAt = undefined;
    }
    this._touch();
    this._addDomainEvent(new SupportTicketStatusChangedEvent({
      ticketId: this.id,
      tenantId: this._props.tenantId,
      oldStatus,
      newStatus,
    }));
  }

  assignTo(assignedToId: string): void {
    this._props.assignedToId = assignedToId;
    this._touch();
    this._addDomainEvent(new SupportTicketAssignedEvent({
      ticketId: this.id,
      tenantId: this._props.tenantId,
      assignedToId,
    }));
  }

  setPriority(priority: SupportTicketPriority): void {
    this._props.priority = priority;
    this._touch();
  }

  setSatisfaction(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Satisfaction rating must be 1-5');
    }
    if (this._props.status !== 'RESOLVED' && this._props.status !== 'CLOSED') {
      throw new Error(`Cannot set satisfaction on ${this._props.status} ticket`);
    }
    this._props.satisfactionRating = rating;
    this._touch();
  }

  addTag(tag: string): void {
    if (!this._props.tags.includes(tag)) {
      this._props.tags.push(tag);
      this._touch();
    }
  }

  removeTag(tag: string): void {
    this._props.tags = this._props.tags.filter(t => t !== tag);
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: SupportTicketStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid ticket transition: ${this._props.status} → ${target}`);
    }
  }
}
