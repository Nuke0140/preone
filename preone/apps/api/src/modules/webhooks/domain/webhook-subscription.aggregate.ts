/**
 * WebhookSubscriptionAggregate — Wave 20 DDD aggregate.
 *
 * State:
 *   - isActive flag + consecutiveFailures counter
 *   - Auto-disable when failures exceed WEBHOOK_AUTO_DISABLE_THRESHOLD
 *
 * Invariants:
 *   - URL must be HTTPS in production
 *   - secret is write-only (never exposed via API after creation)
 *   - eventTypes must be a non-empty array (or ['*'])
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  WebhookAutoDisabledEvent,
  WebhookCreatedEvent,
  WebhookDisabledEvent,
  WebhookRotatedSecretEvent,
} from '../domain/events/webhooks-events';
import type { WebhookSubscription } from '../webhooks.types';
import { WEBHOOK_AUTO_DISABLE_THRESHOLD } from '../webhooks.types';

/**
 * Props for the aggregate. Note: `id` lives on the Entity base class
 * (not in props), so we Omit it from the WebhookSubscription interface.
 */
export type WebhookSubscriptionProps = Omit<WebhookSubscription, 'id'>;

export class WebhookSubscriptionAggregate extends AggregateRoot<WebhookSubscriptionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get url(): string { return this._props.url; }
  get isActive(): boolean { return this._props.isActive; }
  get eventTypes(): string[] { return this._props.eventTypes; }
  get consecutiveFailures(): number { return this._props.consecutiveFailures; }

  static create(props: Omit<WebhookSubscriptionProps, 'consecutiveFailures' | 'createdAt' | 'updatedAt'>): WebhookSubscriptionAggregate {
    if (!props.url.startsWith('https://') && process.env['NODE_ENV'] === 'production') {
      throw new Error('Webhook URL must use HTTPS in production');
    }
    if (props.eventTypes.length === 0) {
      throw new Error('eventTypes must be a non-empty array');
    }
    const now = new Date().toISOString();
    const agg = new WebhookSubscriptionAggregate({
      ...props,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new WebhookCreatedEvent({
      subscriptionId: agg.id,
      tenantId: agg._props.tenantId,
      url: agg._props.url,
      eventTypes: agg._props.eventTypes,
    }));
    return agg;
  }

  matches(eventType: string): boolean {
    if (!this._props.isActive) return false;
    if (this._props.eventTypes.includes('*')) return true;
    return this._props.eventTypes.includes(eventType);
  }

  rotateSecret(newSecret: string): void {
    if (newSecret.length < 16) {
      throw new Error('Webhook secret must be at least 16 characters');
    }
    this._props.secret = newSecret;
    this._props.updatedAt = new Date().toISOString();
    this._addDomainEvent(new WebhookRotatedSecretEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  recordSuccess(): void {
    this._props.consecutiveFailures = 0;
    this._props.updatedAt = new Date().toISOString();
  }

  recordFailure(): void {
    this._props.consecutiveFailures += 1;
    this._props.updatedAt = new Date().toISOString();
    if (this._props.consecutiveFailures >= WEBHOOK_AUTO_DISABLE_THRESHOLD && this._props.isActive) {
      this._props.isActive = false;
      this._addDomainEvent(new WebhookAutoDisabledEvent({
        subscriptionId: this.id,
        tenantId: this._props.tenantId,
        consecutiveFailures: this._props.consecutiveFailures,
      }));
    }
  }

  disable(): void {
    this._props.isActive = false;
    this._props.updatedAt = new Date().toISOString();
    this._addDomainEvent(new WebhookDisabledEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  enable(): void {
    this._props.isActive = true;
    this._props.consecutiveFailures = 0;
    this._props.updatedAt = new Date().toISOString();
  }

  updateEventTypes(eventTypes: string[]): void {
    if (eventTypes.length === 0) throw new Error('eventTypes must be non-empty');
    this._props.eventTypes = eventTypes;
    this._props.updatedAt = new Date().toISOString();
  }
}
