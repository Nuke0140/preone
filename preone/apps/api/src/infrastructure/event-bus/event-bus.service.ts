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
 *
 * Wave 9 enhancement: every publish() is wrapped in an OTel span, and each
 * subscriber dispatch is wrapped in a child span (BTD §22.2). When the OTel
 * SDK is not started, the tracer is a NoopTracer → zero overhead.
 */
import { Injectable, Logger } from '@nestjs/common';
import { SpanStatusCode } from '@opentelemetry/api';

import { getCqrsTracer, CqrsSpanAttributes, setActorAttributes } from '@shared/cqrs/otel-tracing';
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
   *
   * Wraps the dispatch in an OTel parent span ("event:<eventType>") and each
   * subscriber invocation in a child span ("event:<eventType>:<handlerIdx>").
   */
  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    if (handlers.length === 0) {
      this.logger.debug(`No subscribers for ${event.eventType}`);
      return;
    }

    const tracer = getCqrsTracer();
    const parentSpanName = `event:${event.eventType}`;

    return tracer.startActiveSpan(parentSpanName, async (parentSpan) => {
      parentSpan.setAttribute(CqrsSpanAttributes.CQRS_KIND, 'event');
      parentSpan.setAttribute(CqrsSpanAttributes.CQRS_TYPE, event.eventType);
      parentSpan.setAttribute(CqrsSpanAttributes.CQRS_SUBSCRIBERS, handlers.length);

      // Pull tenantId/actorId from event payload if present
      const payload = event.payload as Record<string, unknown>;
      setActorAttributes(parentSpan, {
        tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
        actorId: typeof payload.approvedBy === 'string'
          ? payload.approvedBy
          : typeof payload.createdBy === 'string'
            ? payload.createdBy
            : typeof payload.userId === 'string' ? payload.userId : undefined,
      });

      // Dispatch in parallel — handlers must be idempotent
      const results = await Promise.allSettled(
        handlers.map(async (h, idx) => {
          const handlerName = (h as { constructor?: { name?: string } }).constructor?.name ?? `handler#${idx}`;
          return tracer.startActiveSpan(`event:${event.eventType}:${handlerName}`, async (childSpan) => {
            childSpan.setAttribute(CqrsSpanAttributes.CQRS_KIND, 'event.subscriber');
            childSpan.setAttribute(CqrsSpanAttributes.CQRS_TYPE, event.eventType);
            childSpan.setAttribute(CqrsSpanAttributes.CQRS_HANDLER, handlerName);
            try {
              await h(event);
              childSpan.setStatus({ code: SpanStatusCode.OK });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              childSpan.setAttribute(CqrsSpanAttributes.CQRS_ERROR, message);
              childSpan.recordException(err as Error);
              childSpan.setStatus({ code: SpanStatusCode.ERROR, message });
              // Don't fail the whole dispatch — log + continue
              this.logger.error(
                `Handler ${handlerName} for ${event.eventType} failed: ${message}`,
                err instanceof Error ? err.stack : undefined,
              );
              throw err;
            } finally {
              childSpan.end();
            }
          });
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        parentSpan.setAttribute('preone.cqrs.subscribers_failed', failed);
      }
      parentSpan.setStatus({ code: SpanStatusCode.OK });
      parentSpan.end();
    });
  }
}
