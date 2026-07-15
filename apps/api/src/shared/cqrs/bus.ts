/**
 * CommandBus + QueryBus — in-process dispatch (BTD §12.2, §12.3).
 *
 * Per BTD §12.2 — Command Side: handlers are looked up by command type name.
 * Per BTD §12.3 — Query Side: handlers are looked up by query type name.
 *
 * For v1 (Wave 2.1): in-process synchronous dispatch. For v1.1+ this can
 * be extended to support pipeline behaviors (logging, validation, retries)
 * similar to MediatR in .NET.
 *
 * Handlers are registered via the @CommandHandler decorator metadata —
 * the module wiring scans the providers list and registers each handler
 * under its supported command type.
 */
import { Injectable, Logger } from '@nestjs/common';

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
    return (await handler.handle(command)) as T;
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
    return (await handler.handle(query)) as T;
  }
}
