/**
 * WebhookDispatcher — Wave 20 outbound webhook delivery.
 *
 * Lifecycle:
 *   1. Domain event fires on EventBus (any module).
 *   2. Dispatcher queries active subscriptions matching the event type.
 *   3. For each match:
 *      a. Compute HMAC-SHA256 signature of the JSON payload
 *      b. POST to subscription.url with X-Webhook-Signature header
 *      c. On 2xx → mark DELIVERED, reset consecutiveFailures
 *      d. On 5xx/network → schedule retry with exponential backoff
 *      e. After WEBHOOK_MAX_ATTEMPTS → mark FAILED, increment failures
 *
 * Retry policy:
 *   - Backoff: 30s, 1m, 5m, 15m, 1h, 6h, 12h, 24h (+ 0-10% jitter)
 *   - After 10 consecutive failures → auto-disable subscription
 *
 * Idempotency:
 *   - Subscribers verify X-Webhook-Signature to ensure authenticity
 *   - X-Webhook-Event-Id allows subscribers to dedupe (we retry on
 *     timeout but the same eventId is sent)
 *
 * Persistence:
 *   - WebhookDelivery rows persist every attempt for audit + retry
 *   - v1: in-process Map. Production: Prisma + BullMQ delayed jobs.
 */
import { createHmac, randomUUID } from 'node:crypto';
import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';

import { EventBusService } from '../../../../infrastructure/event-bus/event-bus.service';
import type { DomainEvent } from '../../../../shared/kernel/domain-event';
import { WebhookSubscriptionAggregate } from '../../domain/webhook-subscription.aggregate';
import {
  WebhookDeliveryFailedEvent,
  WebhookDeliveryRetryScheduledEvent,
  WebhookDeliverySucceededEvent,
} from '../../domain/events/webhooks-events';
import type { WebhookDelivery, WebhookStatus } from '../../webhooks.types';
import {
  WEBHOOK_BACKOFF_SECONDS,
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_TIMEOUT_MS,
} from '../../webhooks.types';

@Injectable()
export class WebhookDispatcher {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private readonly http: AxiosInstance = axios.create({ timeout: WEBHOOK_TIMEOUT_MS });
  /**
   * v1 in-process stores — swap for Prisma + BullMQ in production.
   */
  private readonly subscriptions = new Map<string, WebhookSubscriptionAggregate>();
  private readonly deliveries = new Map<string, WebhookDelivery>();
  private readonly retryTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly eventBus: EventBusService) {}

  /**
   * Register a subscription. The dispatcher will deliver matching events
   * to subscription.url until subscription.isActive becomes false.
   */
  registerSubscription(sub: WebhookSubscriptionAggregate): void {
    this.subscriptions.set(sub.id, sub);
    this.logger.log(`Registered webhook subscription ${sub.id} → ${sub.url}`);
  }

  /**
   * Dispatch a domain event to all matching subscriptions.
   * Called by EventBusService.subscribe() (wired in WebhooksModule.onModuleInit).
   */
  async dispatch(event: DomainEvent): Promise<void> {
    const matching = this.findMatchingSubscriptions(event);
    if (matching.length === 0) return;

    const payload = event.toJSON();
    const body = JSON.stringify(payload);

    for (const sub of matching) {
      const signature = this.sign(body, sub._props.secret);
      const delivery: WebhookDelivery = {
        id: randomUUID(),
        subscriptionId: sub.id,
        eventId: event.eventId,
        eventType: event.eventType,
        payload,
        signature,
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.deliveries.set(delivery.id, delivery);
      await this.attemptDelivery(delivery, sub);
    }
  }

  /**
   * Single delivery attempt. Schedules retry on failure.
   */
  private async attemptDelivery(delivery: WebhookDelivery, sub: WebhookSubscriptionAggregate): Promise<void> {
    delivery.attempts += 1;
    delivery.lastAttemptAt = new Date().toISOString();
    delivery.status = 'RETRYING';

    try {
      const res = await this.http.post(
        sub.url,
        delivery.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${delivery.signature}`,
            'X-Webhook-Event-Id': delivery.eventId,
            'X-Webhook-Event-Type': delivery.eventType,
            'X-Webhook-Timestamp': delivery.lastAttemptAt,
          },
          // Validate response is 2xx; non-2xx triggers retry
          validateStatus: (s) => s >= 200 && s < 300,
        },
      );
      delivery.status = 'DELIVERED';
      delivery.lastResponseCode = res.status;
      delivery.updatedAt = new Date().toISOString();
      sub.recordSuccess();
      this.eventBus.publish(new WebhookDeliverySucceededEvent({
        deliveryId: delivery.id,
        subscriptionId: sub.id,
        responseCode: res.status,
        attempts: delivery.attempts,
      }));
      this.logger.debug(`Webhook delivered: sub=${sub.id} event=${delivery.eventType} code=${res.status}`);
    } catch (err) {
      const e = err as { response?: { status?: number }; message: string };
      delivery.lastError = e.message;
      delivery.lastResponseCode = e.response?.status;
      delivery.updatedAt = new Date().toISOString();

      if (delivery.attempts >= WEBHOOK_MAX_ATTEMPTS) {
        delivery.status = 'FAILED';
        sub.recordFailure();
        this.eventBus.publish(new WebhookDeliveryFailedEvent({
          deliveryId: delivery.id,
          subscriptionId: sub.id,
          lastError: e.message,
          attempts: delivery.attempts,
          finalFailure: true,
        }));
        this.logger.warn(`Webhook FAILED permanently: sub=${sub.id} event=${delivery.eventType} attempts=${delivery.attempts}`);
      } else {
        const backoffSeconds = WEBHOOK_BACKOFF_SECONDS[delivery.attempts - 1] ?? 86400;
        const jitter = Math.floor(backoffSeconds * 0.1 * Math.random());
        const delayMs = (backoffSeconds + jitter) * 1000;
        delivery.nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
        this.eventBus.publish(new WebhookDeliveryRetryScheduledEvent({
          deliveryId: delivery.id,
          subscriptionId: sub.id,
          nextAttemptAt: delivery.nextAttemptAt,
          attemptNumber: delivery.attempts + 1,
        }));
        // Schedule retry — v1 uses setTimeout. Production: BullMQ delayed job.
        const timer = setTimeout(() => {
          void this.attemptDelivery(delivery, sub);
        }, delayMs);
        this.retryTimers.set(delivery.id, timer);
        this.logger.debug(`Webhook retry scheduled: sub=${sub.id} attempt=${delivery.attempts + 1} in ${backoffSeconds}s`);
      }
    }
  }

  /**
   * Compute HMAC-SHA256 signature of the JSON body using the subscription secret.
   */
  sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  /**
   * Verify an inbound signature — exposed so subscribers can validate.
   */
  verify(body: string, signature: string, secret: string): boolean {
    const expected = this.sign(body, secret);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }

  private findMatchingSubscriptions(event: DomainEvent): WebhookSubscriptionAggregate[] {
    return [...this.subscriptions.values()].filter((sub) => sub.matches(event.eventType));
  }

  /** Test/admin — list all deliveries for a subscription. */
  listDeliveries(subscriptionId: string): WebhookDelivery[] {
    return [...this.deliveries.values()].filter((d) => d.subscriptionId === subscriptionId);
  }

  /** Test/admin — current status of a delivery. */
  getDelivery(deliveryId: string): WebhookDelivery | undefined {
    return this.deliveries.get(deliveryId);
  }

  /** Shutdown — cancel all pending retries. */
  dispose(): void {
    for (const timer of this.retryTimers.values()) clearTimeout(timer);
    this.retryTimers.clear();
  }
}
