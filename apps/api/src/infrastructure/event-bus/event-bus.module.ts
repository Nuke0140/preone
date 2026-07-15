/**
 * EventBusModule — domain event bus + outbox pattern.
 *
 * Per BTD §13 Domain Events + §14 Integration Events:
 *   - In-process: aggregates raise events → application service publishes
 *   - Cross-process: outbox table → publisher worker → Redis Stream
 *
 * Initial implementation: in-memory event bus (sync).
 * v1.1: replace with Redis Stream for cross-instance reliability.
 */
import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
