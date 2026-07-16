/**
 * ConversationAggregate — chat thread with 2+ participants.
 *
 * Lifecycle: CREATED → ACTIVE → ARCHIVED
 *
 * Types: DIRECT (1:1), GROUP, CLASSROOM, BROADCAST
 *
 * Invariants:
 *   - DIRECT conversations are exactly 2 participants
 *   - GROUP conversations have 1+ OWNER + 0+ ADMIN + 0+ MEMBER
 *   - Participants can be added/removed but never deleted (audit trail)
 *   - LastMessageAt updated on every MessageSent event subscription
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  ConversationCreatedEvent, ParticipantAddedEvent, ParticipantRemovedEvent,
} from '../events/communication-events';

export type ConversationType = 'DIRECT' | 'GROUP' | 'CLASSROOM' | 'BROADCAST';
export type ConversationParticipantRole = 'MEMBER' | 'ADMIN' | 'OWNER';

export interface ConversationParticipant {
  userId: string;
  role: ConversationParticipantRole;
  joinedAt: string;
  isActive: boolean;
  lastReadAt?: string;
}

export interface ConversationProps {
  tenantId: string;
  branchId?: string;
  classroomId?: string;
  type: ConversationType;
  title?: string;
  avatarUrl?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  isActive: boolean;
  createdBy: string;
  participants: ConversationParticipant[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export class ConversationAggregate extends AggregateRoot<ConversationProps> {
  get tenantId(): string { return this._props.tenantId; }
  get type(): ConversationType { return this._props.type; }
  get isActive(): boolean { return this._props.isActive; }
  get participants(): readonly ConversationParticipant[] {
    return Object.freeze([...this._props.participants]);
  }

  static create(props: Omit<
    ConversationProps,
    'lastMessageAt' | 'isActive' | 'participants' |
    'createdAt' | 'updatedAt'
  > & { participants: ConversationParticipant[] }): ConversationAggregate {
    const now = new Date().toISOString();
    if (props.type === 'DIRECT' && props.participants.length !== 2) {
      throw new Error('DIRECT conversations require exactly 2 participants');
    }
    const agg = new ConversationAggregate({
      ...props,
      lastMessageAt: now,
      isActive: true,
      participants: props.participants.map(p => ({ ...p, joinedAt: p.joinedAt ?? now, isActive: true })),
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new ConversationCreatedEvent({
      conversationId: agg.id,
      tenantId: agg._props.tenantId,
      conversationType: agg._props.type,
      participantCount: agg._props.participants.length,
      createdBy: agg._props.createdBy,
    }));
    return agg;
  }

  addParticipant(userId: string, role: ConversationParticipantRole, addedAt: string): void {
    if (!this._props.isActive) {
      throw new Error('Cannot add participant to inactive conversation');
    }
    if (this._props.type === 'DIRECT') {
      throw new Error('Cannot add participants to DIRECT conversation');
    }
    const existing = this._props.participants.find(p => p.userId === userId);
    if (existing) {
      if (existing.isActive) {
        throw new Error(`User ${userId} already active in conversation`);
      }
      existing.isActive = true;
      existing.role = role;
      existing.joinedAt = addedAt;
    } else {
      this._props.participants.push({ userId, role, joinedAt: addedAt, isActive: true });
    }
    this._touch();
    this._addDomainEvent(new ParticipantAddedEvent({
      conversationId: this.id,
      tenantId: this._props.tenantId,
      userId,
      role,
      addedAt,
    }));
  }

  removeParticipant(userId: string, removedAt: string): void {
    const p = this._props.participants.find(p => p.userId === userId);
    if (!p || !p.isActive) {
      throw new Error(`User ${userId} not active in conversation`);
    }
    p.isActive = false;
    this._touch();
    this._addDomainEvent(new ParticipantRemovedEvent({
      conversationId: this.id,
      tenantId: this._props.tenantId,
      userId,
      removedAt,
    }));
  }

  markRead(userId: string, readAt: string): void {
    const p = this._props.participants.find(p => p.userId === userId);
    if (!p || !p.isActive) {
      throw new Error(`User ${userId} not active in conversation`);
    }
    p.lastReadAt = readAt;
    this._touch();
  }

  touchLastMessage(preview: string, sentAt: string): void {
    this._props.lastMessageAt = sentAt;
    this._props.lastMessagePreview = preview.slice(0, 255);
    this._touch();
  }

  archive(): void {
    this._props.isActive = false;
    this._touch();
  }

  isActiveParticipant(userId: string): boolean {
    return this._props.participants.some(p => p.userId === userId && p.isActive);
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
