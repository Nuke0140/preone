/**
 * webhook-dispatcher.spec.ts — Wave 20 unit tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { EventBusService } from '../../../infrastructure/event-bus/event-bus.service';
import { DomainEvent } from '../../../shared/kernel/domain-event';
import { WebhookDispatcher } from '../application/services/webhook-dispatcher.service';
import { WebhookSubscriptionAggregate } from '../domain/webhook-subscription.aggregate';

class TestEvent extends DomainEvent<{ foo: string }> {}

function makeSub(overrides: Partial<{ url: string; secret: string; eventTypes: string[]; isActive: boolean }> = {}): WebhookSubscriptionAggregate {
  return WebhookSubscriptionAggregate.create({
    tenantId: 't1',
    url: overrides.url ?? 'https://example.com/webhook',
    secret: overrides.secret ?? 'supersecretkey-16chars!',
    eventTypes: overrides.eventTypes ?? ['TestEvent'],
    isActive: overrides.isActive ?? true,
  });
}

describe('WebhookDispatcher (Wave 20)', () => {
  let eventBus: EventBusService;
  let dispatcher: WebhookDispatcher;

  beforeEach(() => {
    eventBus = { publish: vi.fn(), publishAll: vi.fn(), subscribe: vi.fn() } as never;
    dispatcher = new WebhookDispatcher(eventBus);
  });

  it('signs payloads with HMAC-SHA256 using the subscription secret', () => {
    const body = '{"foo":"bar"}';
    const sig = dispatcher.sign(body, 'my-secret');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(dispatcher.verify(body, sig, 'my-secret')).toBe(true);
    expect(dispatcher.verify(body, sig, 'wrong-secret')).toBe(false);
    expect(dispatcher.verify('tampered', sig, 'my-secret')).toBe(false);
  });

  it('verifies signatures in constant time', () => {
    const body = 'test';
    const sig = dispatcher.sign(body, 'k');
    expect(dispatcher.verify(body, sig, 'k')).toBe(true);
    // Different-length signature should not throw
    expect(dispatcher.verify(body, 'short', 'k')).toBe(false);
  });

  it('matches subscriptions by event type', () => {
    const sub = makeSub({ eventTypes: ['TestEvent'] });
    dispatcher.registerSubscription(sub);
    const matches = (dispatcher as unknown as { findMatchingSubscriptions: (e: DomainEvent) => WebhookSubscriptionAggregate[] }).findMatchingSubscriptions(new TestEvent({ foo: 'bar' }));
    expect(matches).toHaveLength(1);
  });

  it('matches wildcard subscriptions', () => {
    const sub = makeSub({ eventTypes: ['*'] });
    dispatcher.registerSubscription(sub);
    const matches = (dispatcher as unknown as { findMatchingSubscriptions: (e: DomainEvent) => WebhookSubscriptionAggregate[] }).findMatchingSubscriptions(new TestEvent({ foo: 'bar' }));
    expect(matches).toHaveLength(1);
  });

  it('does not match inactive subscriptions', () => {
    const sub = makeSub({ isActive: false });
    dispatcher.registerSubscription(sub);
    const matches = (dispatcher as unknown as { findMatchingSubscriptions: (e: DomainEvent) => WebhookSubscriptionAggregate[] }).findMatchingSubscriptions(new TestEvent({ foo: 'bar' }));
    expect(matches).toHaveLength(0);
  });
});

describe('WebhookSubscriptionAggregate (Wave 20)', () => {
  it('auto-disables after 10 consecutive failures', () => {
    const sub = makeSub();
    expect(sub.isActive).toBe(true);
    for (let i = 0; i < 10; i++) sub.recordFailure();
    expect(sub.isActive).toBe(false);
    expect(sub.consecutiveFailures).toBe(10);
  });

  it('resets failure counter on success', () => {
    const sub = makeSub();
    sub.recordFailure();
    sub.recordFailure();
    sub.recordSuccess();
    expect(sub.consecutiveFailures).toBe(0);
  });

  it('enable() re-activates and resets failures', () => {
    const sub = makeSub();
    for (let i = 0; i < 10; i++) sub.recordFailure();
    expect(sub.isActive).toBe(false);
    sub.enable();
    expect(sub.isActive).toBe(true);
    expect(sub.consecutiveFailures).toBe(0);
  });

  it('rotates secret (min 16 chars)', () => {
    const sub = makeSub();
    expect(() => sub.rotateSecret('short')).toThrow(/at least 16/);
    sub.rotateSecret('new-secret-16-chars!');
    expect(sub._props.secret).toBe('new-secret-16-chars!');
  });

  it('rejects empty eventTypes', () => {
    expect(() => makeSub({ eventTypes: [] })).toThrow(/non-empty/);
  });

  it('matches by event type or wildcard', () => {
    const sub = makeSub({ eventTypes: ['TestEvent', 'OtherEvent'] });
    expect(sub.matches('TestEvent')).toBe(true);
    expect(sub.matches('OtherEvent')).toBe(true);
    expect(sub.matches('UnknownEvent')).toBe(false);
  });
});
