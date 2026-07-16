/**
 * Communication Aggregate Unit Tests — covers Notification, Announcement,
 * Conversation aggregate invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { AnnouncementAggregate } from '../domain/aggregates/announcement.aggregate';
import { ConversationAggregate } from '../domain/aggregates/conversation.aggregate';
import { NotificationAggregate } from '../domain/aggregates/notification.aggregate';

describe('NotificationAggregate', () => {
  it('should create notification in QUEUED status with NotificationCreatedEvent', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1',
      channel: 'SMS',
      priority: 'NORMAL',
      body: 'Test message',
      variables: {},
      recipientIds: ['u1', 'u2'],
    });
    expect(n.status).toBe('QUEUED');
    expect(n.isUrgent).toBe(false);
    expect(n.domainEvents.length).toBe(1);
    expect(n.domainEvents[0].eventType).toBe('NotificationCreatedEvent');
  });

  it('should mark urgent when priority is CRITICAL', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'SMS', priority: 'CRITICAL',
      body: 'Alert', variables: {}, recipientIds: ['u1'],
    });
    expect(n.isUrgent).toBe(true);
  });

  it('should transition QUEUED → SENDING → SENT', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'EMAIL', priority: 'NORMAL',
      body: 'Hi', variables: {}, recipientIds: ['u1'],
    });
    n.startSending();
    expect(n.status).toBe('SENDING');
    n.markSent('2025-01-01T00:00:00Z');
    expect(n.status).toBe('SENT');
    expect(n.domainEvents.some(e => e.eventType === 'NotificationSentEvent')).toBe(true);
  });

  it('should mark delivered per-recipient', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'PUSH', priority: 'NORMAL',
      body: 'Push', variables: {}, recipientIds: ['u1', 'u2'],
    });
    n.startSending();
    n.markSent('2025-01-01T00:00:00Z');
    n.markDelivered('u1', '2025-01-01T00:00:01Z');
    expect(n.domainEvents.some(e => e.eventType === 'NotificationDeliveredEvent')).toBe(true);
    // Idempotent — second call should not double-fire event
    const beforeCount = n.domainEvents.length;
    n.markDelivered('u1', '2025-01-01T00:00:02Z');
    expect(n.domainEvents.length).toBe(beforeCount);
  });

  it('should mark failed per-recipient', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'SMS', priority: 'NORMAL',
      body: 'Hi', variables: {}, recipientIds: ['u1'],
    });
    n.startSending();
    n.markFailed('u1', 'Invalid number', '2025-01-01T00:00:00Z');
    expect(n.domainEvents.some(e => e.eventType === 'NotificationFailedEvent')).toBe(true);
  });

  it('should reject invalid transition (SENT → QUEUED)', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'SMS', priority: 'NORMAL',
      body: 'Hi', variables: {}, recipientIds: ['u1'],
    });
    n.startSending();
    n.markSent('2025-01-01T00:00:00Z');
    expect(() => n.startSending()).toThrow();
  });

  it('should retry after FAILED up to maxRetries', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'SMS', priority: 'NORMAL',
      body: 'Hi', variables: {}, recipientIds: ['u1'], maxRetries: 2,
    });
    n.startSending();
    n.markFailed('u1', 'Failed', '2025-01-01T00:00:00Z');
    const eventCountBeforeRetry = n.domainEvents.length;
    n.retry();
    expect(n.status).toBe('QUEUED');
    // retry() itself doesn't emit new events (only transitions state)
    expect(n.domainEvents.length).toBe(eventCountBeforeRetry);
    // Second retry should fail after maxRetries=2 reached on second failure cycle
    n.startSending();
    n.markFailed('u1', 'Failed again', '2025-01-01T00:00:01Z');
    n.retry(); // retry 2
    n.startSending();
    n.markFailed('u1', 'Failed 3rd time', '2025-01-01T00:00:02Z');
    expect(() => n.retry()).toThrow();
  });

  it('should reject recipient not on notification', () => {
    const n = NotificationAggregate.create({
      tenantId: 't1', channel: 'SMS', priority: 'NORMAL',
      body: 'Hi', variables: {}, recipientIds: ['u1'],
    });
    expect(() => n.markDelivered('u99', '2025-01-01T00:00:00Z')).toThrow();
  });
});

describe('AnnouncementAggregate', () => {
  it('should create in DRAFT status', () => {
    const a = AnnouncementAggregate.create({
      tenantId: 't1',
      title: 'School closed tomorrow',
      body: 'Due to weather...',
      audience: 'ALL_SCHOOL',
      priority: 'NORMAL',
      attachments: [],
      authorId: 'u1',
      acknowledgementRequired: false,
    });
    expect(a.status).toBe('DRAFT');
    expect(a.domainEvents.some(e => e.eventType === 'AnnouncementCreatedEvent')).toBe(true);
  });

  it('should publish to recipient list', () => {
    const a = AnnouncementAggregate.create({
      tenantId: 't1', title: 'T', body: 'B', audience: 'BRANCH',
      priority: 'NORMAL', attachments: [], authorId: 'u1',
      acknowledgementRequired: false,
    });
    a.publish(['u1', 'u2', 'u3'], '2025-01-01T00:00:00Z');
    expect(a.status).toBe('PUBLISHED');
    expect(a.isPublished).toBe(true);
    expect(a.domainEvents.some(e => e.eventType === 'AnnouncementPublishedEvent')).toBe(true);
  });

  it('should track acknowledgements per recipient', () => {
    const a = AnnouncementAggregate.create({
      tenantId: 't1', title: 'T', body: 'B', audience: 'CLASSROOM',
      priority: 'NORMAL', attachments: [], authorId: 'u1',
      acknowledgementRequired: true,
    });
    a.publish(['u1', 'u2'], '2025-01-01T00:00:00Z');
    a.acknowledge('u1', '2025-01-01T00:05:00Z');
    expect(a.domainEvents.some(e => e.eventType === 'AnnouncementAcknowledgedEvent')).toBe(true);
    // Idempotent
    const before = a.domainEvents.length;
    a.acknowledge('u1', '2025-01-01T00:06:00Z');
    expect(a.domainEvents.length).toBe(before);
  });

  it('should archive from PUBLISHED only', () => {
    const a = AnnouncementAggregate.create({
      tenantId: 't1', title: 'T', body: 'B', audience: 'ALL_SCHOOL',
      priority: 'NORMAL', attachments: [], authorId: 'u1',
      acknowledgementRequired: false,
    });
    expect(() => a.archive('2025-01-01T00:00:00Z')).toThrow();
    a.publish(['u1'], '2025-01-01T00:00:00Z');
    a.archive('2025-01-01T01:00:00Z');
    expect(a.status).toBe('ARCHIVED');
  });

  it('should reject acknowledge from non-recipient', () => {
    const a = AnnouncementAggregate.create({
      tenantId: 't1', title: 'T', body: 'B', audience: 'STAFF_ONLY',
      priority: 'NORMAL', attachments: [], authorId: 'u1',
      acknowledgementRequired: false,
    });
    a.publish(['u1'], '2025-01-01T00:00:00Z');
    expect(() => a.acknowledge('u99', '2025-01-01T00:05:00Z')).toThrow();
  });
});

describe('ConversationAggregate', () => {
  it('should create DIRECT conversation with exactly 2 participants', () => {
    const c = ConversationAggregate.create({
      tenantId: 't1', type: 'DIRECT', createdBy: 'u1',
      participants: [
        { userId: 'u1', role: 'OWNER', joinedAt: '', isActive: true },
        { userId: 'u2', role: 'MEMBER', joinedAt: '', isActive: true },
      ],
      metadata: {},
    });
    expect(c.participants.length).toBe(2);
    expect(c.domainEvents.some(e => e.eventType === 'ConversationCreatedEvent')).toBe(true);
  });

  it('should reject DIRECT with != 2 participants', () => {
    expect(() => ConversationAggregate.create({
      tenantId: 't1', type: 'DIRECT', createdBy: 'u1',
      participants: [
        { userId: 'u1', role: 'OWNER', joinedAt: '', isActive: true },
      ],
      metadata: {},
    })).toThrow();
  });

  it('should not allow adding participants to DIRECT', () => {
    const c = ConversationAggregate.create({
      tenantId: 't1', type: 'DIRECT', createdBy: 'u1',
      participants: [
        { userId: 'u1', role: 'OWNER', joinedAt: '', isActive: true },
        { userId: 'u2', role: 'MEMBER', joinedAt: '', isActive: true },
      ],
      metadata: {},
    });
    expect(() => c.addParticipant('u3', 'MEMBER', '2025-01-01T00:00:00Z')).toThrow();
  });

  it('should add + remove participants in GROUP conversation', () => {
    const c = ConversationAggregate.create({
      tenantId: 't1', type: 'GROUP', title: 'Class 1A Parents',
      createdBy: 'u1',
      participants: [
        { userId: 'u1', role: 'OWNER', joinedAt: '', isActive: true },
        { userId: 'u2', role: 'MEMBER', joinedAt: '', isActive: true },
      ],
      metadata: {},
    });
    c.addParticipant('u3', 'MEMBER', '2025-01-01T00:00:00Z');
    expect(c.participants.filter(p => p.isActive).length).toBe(3);
    expect(c.domainEvents.some(e => e.eventType === 'ParticipantAddedEvent')).toBe(true);
    c.removeParticipant('u3', '2025-01-01T01:00:00Z');
    expect(c.isActiveParticipant('u3')).toBe(false);
    expect(c.domainEvents.some(e => e.eventType === 'ParticipantRemovedEvent')).toBe(true);
  });

  it('should touch last message preview', () => {
    const c = ConversationAggregate.create({
      tenantId: 't1', type: 'DIRECT', createdBy: 'u1',
      participants: [
        { userId: 'u1', role: 'OWNER', joinedAt: '', isActive: true },
        { userId: 'u2', role: 'MEMBER', joinedAt: '', isActive: true },
      ],
      metadata: {},
    });
    expect(() => c.touchLastMessage('Hello there!', '2025-01-01T00:00:00Z')).not.toThrow();
  });
});
