/**
 * EventBusService — in-process event bus (sync) with outbox persistence.
 *
 * Per BTD §13.1 Event Flow:
 *   Aggregate (state change)
 *     ↓ aggregate.raiseEvent(new StudentCreated(...))
 *   Application Service (within transaction)
 *     ↓
 *   Outbox Table (same DB transaction)
 *     ↓
 *   Publisher Worker (polls outbox)
 *     ↓
 *   Event Bus (Redis Stream)
 *     ↓
 *   Subscribers
 *
 * For v1.0: subscribers are in-process handlers (sync dispatch).
 * For v1.1+: publisher worker drains outbox → Redis Stream → consumers.
 */
import { Injectable, Logger } from '@nestjs/common';

import type { DomainEvent } from '@shared/kernel/domain-event';

type EventHandler<E extends DomainEvent = DomainEvent> = (event: E) => Promise<void> | void;

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly handlers = new Map<string, EventHandler[]>();

  /**
   * Subscribe to an event type (by class name).
   */
  subscribe<E extends DomainEvent>(eventType: string, handler: EventHandler<E>): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as EventHandler);
    this.handlers.set(eventType, list);
    this.logger.debug(`Subscribed handler to ${eventType}`);
  }

  /**
   * Publish a list of events. Called by the application service after
   * the repository has successfully persisted the aggregate.
   *
   * NOTE: For v1.0, dispatch is in-process (sync). For v1.1+, this method
   * will write to the outbox table within the same DB transaction as the
   * aggregate save, and a background worker will drain the outbox to Redis.
   */
  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Publish a single event to all in-process subscribers.
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    if (handlers.length === 0) {
      this.logger.debug(`No subscribers for ${event.eventType}`);
      return;
    }

    // Dispatch in parallel — handlers must be idempotent
    await Promise.allSettled(
      handlers.map(async (h) => {
        try {
          await h(event);
        } catch (err) {
          // Don't fail the whole dispatch — log + continue
          this.logger.error(
            `Handler for ${event.eventType} failed: ${(err as Error).message}`,
            (err as Error).stack,
          );
        }
      }),
    );
  }
}
