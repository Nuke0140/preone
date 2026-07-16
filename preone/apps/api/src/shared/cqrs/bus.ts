/**
 * CommandBus + QueryBus — in-process dispatch (BTD §12.2, §12.3).
 *
 * Per BTD §12.2 — Command Side: handlers are looked up by command type name.
 * Per BTD §12.3 — Query Side: handlers are looked up by query type name.
 *
 * Wave 9 enhancement: every execute() call is wrapped in an OTel span
 * (BTD §22.2). When the OTel SDK is not started, the tracer is a NoopTracer
 * and the overhead is a single closure allocation.
 *
 * Handlers are registered via the @CommandHandler decorator metadata —
 * the module wiring scans the providers list and registers each handler
 * under its supported command type.
 */
import { Injectable, Logger } from '@nestjs/common';

import { runCqrsSpan, setActorAttributes } from './otel-tracing';

import type {
  Command, CommandHandler, Query, QueryHandler,
} from './cqrs.types';

@Injectable()
export class CommandBus {
  private readonly logger = new Logger(CommandBus.name);
  private readonly handlers = new Map<string, CommandHandler>();

  register(type: string, handler: CommandHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Duplicate CommandHandler for "${type}"`);
    }
    this.handlers.set(type, handler);
    this.logger.log(`Registered CommandHandler for ${type}`);
  }

  async execute<T>(command: Command): Promise<T> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No CommandHandler registered for "${command.type}"`);
    }
    return runCqrsSpan<T>('command', command.type, (span) => {
      setActorAttributes(span, command.metadata);
      span.setAttribute('preone.cqrs.handler', handler.constructor.name);
      return handler.handle(command) as Promise<T>;
    }, { handlerName: handler.constructor.name });
  }
}

@Injectable()
export class QueryBus {
  private readonly logger = new Logger(QueryBus.name);
  private readonly handlers = new Map<string, QueryHandler>();

  register(type: string, handler: QueryHandler): void {
    if (this.handlers.has(type)) {
      throw new Error(`Duplicate QueryHandler for "${type}"`);
    }
    this.handlers.set(type, handler);
    this.logger.log(`Registered QueryHandler for ${type}`);
  }

  async execute<T>(query: Query): Promise<T> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No QueryHandler registered for "${query.type}"`);
    }
    return runCqrsSpan<T>('query', query.type, (span) => {
      setActorAttributes(span, query.metadata);
      span.setAttribute('preone.cqrs.handler', handler.constructor.name);
      return handler.handle(query) as Promise<T>;
    }, { handlerName: handler.constructor.name });
  }
}
