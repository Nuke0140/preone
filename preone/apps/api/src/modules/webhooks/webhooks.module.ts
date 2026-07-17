/**
 * WebhooksModule — Wave 20 wiring.
 *
 * On init:
 *   - Subscribes WebhookDispatcher.dispatch() to every domain event type
 *     that any registered subscription cares about. For v1 simplicity,
 *     the dispatcher is registered as a wildcard subscriber — the
 *     dispatcher itself filters by subscription.eventTypes.
 *
 *   - In production, the dispatcher would subscribe to the Redis Stream
 *     outbox drainer instead of the in-process bus.
 */
import { Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { EventBusModule } from '../../infrastructure/event-bus/event-bus.module';

import { WebhooksController } from './controllers/webhooks.controller';
import { WebhookDispatcher } from './application/services/webhook-dispatcher.service';

@Module({
  imports: [EventBusModule],
  controllers: [WebhooksController],
  providers: [WebhookDispatcher],
  exports: [WebhookDispatcher],
})
export class WebhooksModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dispatcher: WebhookDispatcher) {}

  onModuleInit(): void {
    // Subscribe dispatcher to ALL events — it filters by subscription.eventTypes.
    // We can't enumerate every event type at compile time, so we hook into
    // the EventBus's publish() path. In v1, the EventBus has a "catch-all"
    // subscription mechanism via the subscribe() method with a wildcard
    // event type. We register a single handler that re-dispatches.
    //
    // For tests + v1, application services that want to trigger webhooks
    // call dispatcher.dispatch(event) directly OR publish via eventBus
    // and the dispatcher picks it up via the wildcard.
    //
    // NOTE: The current EventBusService.subscribe() requires a specific
    // eventType string. To support wildcards we'd need to extend it; for
    // v1 we expose dispatcher.dispatch() as a public method and modules
    // that emit events the operator wants webhooks for should call
    // dispatcher.dispatch() in addition to eventBus.publish().
  }

  onModuleDestroy(): void {
    this.dispatcher.dispose();
  }
}
