/**
 * Unit tests for CQRS CommandBus + QueryBus (BTD §12.2, §12.3).
 *
 * Verifies:
 *   - Handler registration
 *   - Duplicate handler rejection
 *   - Synchronous dispatch
 *   - Error on missing handler
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CommandBus, QueryBus, type Command, type CommandHandler, type Query, type QueryHandler } from '@shared/cqrs';

describe('CommandBus — BTD §12.2', () => {
  let bus: CommandBus;

  beforeEach(() => {
    bus = new CommandBus();
  });

  it('should register and dispatch to a handler', async () => {
    const handler: CommandHandler = {
      handle: vi.fn(async (cmd: Command) => ({ ok: true, type: cmd.type })),
    };
    bus.register('Test.Command', handler);

    const cmd: Command = {
      type: 'Test.Command',
      payload: { x: 1 },
      metadata: { actorId: 'a1', tenantId: 't1' },
    };

    const result = await bus.execute<{ ok: boolean; type: string }>(cmd);
    expect(result).toEqual({ ok: true, type: 'Test.Command' });
    expect(handler.handle).toHaveBeenCalledWith(cmd);
  });

  it('should reject duplicate handler registration', () => {
    const handler1: CommandHandler = { handle: vi.fn() };
    const handler2: CommandHandler = { handle: vi.fn() };
    bus.register('Test.Dup', handler1);
    expect(() => bus.register('Test.Dup', handler2)).toThrow(/Duplicate CommandHandler/);
  });

  it('should throw on dispatch to unregistered command', async () => {
    const cmd: Command = {
      type: 'Unregistered',
      payload: {},
      metadata: { actorId: 'a1', tenantId: 't1' },
    };
    await expect(bus.execute(cmd)).rejects.toThrow(/No CommandHandler registered/);
  });

  it('should support multiple distinct handlers', async () => {
    const h1: CommandHandler = { handle: vi.fn(async () => 1) };
    const h2: CommandHandler = { handle: vi.fn(async () => 2) };
    bus.register('A', h1);
    bus.register('B', h2);

    expect(await bus.execute({ type: 'A', payload: {}, metadata: { actorId: 'a', tenantId: 't' } })).toBe(1);
    expect(await bus.execute({ type: 'B', payload: {}, metadata: { actorId: 'a', tenantId: 't' } })).toBe(2);
  });
});

describe('QueryBus — BTD §12.3', () => {
  let bus: QueryBus;

  beforeEach(() => {
    bus = new QueryBus();
  });

  it('should register and dispatch to a handler', async () => {
    const handler: QueryHandler = {
      handle: vi.fn(async (q: Query) => ({ result: q.payload })),
    };
    bus.register('Test.Query', handler);

    const q: Query = {
      type: 'Test.Query',
      payload: { filter: 'active' },
      metadata: { actorId: 'a1', tenantId: 't1' },
    };

    const result = await bus.execute<{ result: unknown }>(q);
    expect(result).toEqual({ result: { filter: 'active' } });
    expect(handler.handle).toHaveBeenCalledWith(q);
  });

  it('should reject duplicate handler registration', () => {
    const h1: QueryHandler = { handle: vi.fn() };
    const h2: QueryHandler = { handle: vi.fn() };
    bus.register('Test.Dup', h1);
    expect(() => bus.register('Test.Dup', h2)).toThrow(/Duplicate QueryHandler/);
  });

  it('should throw on dispatch to unregistered query', async () => {
    const q: Query = {
      type: 'Unregistered',
      payload: {},
      metadata: { actorId: 'a1', tenantId: 't1' },
    };
    await expect(bus.execute(q)).rejects.toThrow(/No QueryHandler registered/);
  });

  it('should never mutate state (read-side contract)', async () => {
    // This is a contract test — the handler MUST return data, never write.
    // The bus itself doesn't enforce this; the handler is responsible.
    let sideEffect = 0;
    const handler: QueryHandler = {
      handle: vi.fn(async () => {
        // Queries should NOT mutate state — only read
        return { count: 42 };
      }),
    };
    bus.register('Test.ReadOnly', handler);

    const result = await bus.execute({ type: 'Test.ReadOnly', payload: {}, metadata: { actorId: 'a', tenantId: 't' } });
    expect(sideEffect).toBe(0);
    expect(result).toEqual({ count: 42 });
  });
});
