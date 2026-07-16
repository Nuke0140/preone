/**
 * Unit tests for WsPubSubBridge — publish + receive fan-out.
 *
 * Mocks the RedisService with an in-memory pub/sub so we can verify the
 * full round-trip: publish() → Redis → handleIncoming() → local socket emit.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server, Socket } from 'socket.io';

import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import { WsConnectionManager } from '../gateway/ws-connection-manager';
import {
  WsNamespace,
  type WsAuthenticatedUser,
  type WsConnectionContext,
} from '../ws-connection-context';
import type { WsMessageEnvelope } from '../ws-message-envelope';

/** In-memory Redis mock — supports subscribe/unsubscribe/publish/on('message'). */
class FakeRedis {
  /** Per-channel set of message callbacks (registered via on('message')). */
  private messageCallbacks: Set<(channel: string, msg: string) => void> = new Set();
  /** Subscribed channels. */
  private channels: Set<string> = new Set();

  async subscribe(channel: string): Promise<void> {
    this.channels.add(channel);
  }

  async unsubscribe(channel: string): Promise<void> {
    this.channels.delete(channel);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.channels.has(channel)) return;
    // Every registered 'message' listener receives every published message
    // (ioredis delivers to ALL subscribers — same as our fan-out here).
    for (const cb of this.messageCallbacks) {
      cb(channel, message);
    }
  }

  on(event: string, cb: (channel: string, msg: string) => void): void {
    if (event !== 'message') return;
    this.messageCallbacks.add(cb);
  }

  // Unused but required by IORedis interface.
  ping(): Promise<string> {
    return Promise.resolve('PONG');
  }
  quit(): Promise<void> {
    return Promise.resolve();
  }
}

function makeUser(overrides: Partial<WsAuthenticatedUser> = {}): WsAuthenticatedUser {
  return {
    id: '01HALICE',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'alice@preone.in',
    roles: ['TEACHER'],
    permissionsVersion: 1,
    sessionId: '01HSESS',
    ...overrides,
  };
}

function makeCtx(
  socketId: string,
  user: WsAuthenticatedUser,
  channel: string,
  ns: WsNamespace = WsNamespace.CHAT,
): WsConnectionContext {
  const ctx: WsConnectionContext = {
    socketId,
    user,
    namespace: ns,
    subscriptions: new Set<string>(),
    connectedAt: '2026-07-17T10:00:00.000Z',
    lastPongAt: '2026-07-17T10:00:00.000Z',
  };
  ctx.subscriptions.add(channel);
  return ctx;
}

function makeSocket(id: string): Socket & { _emitted: unknown[] } {
  const emitted: unknown[] = [];
  const sock = {
    id,
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
  } as unknown as Socket & { _emitted: unknown[] };
  sock._emitted = emitted;
  return sock;
}

describe('WsPubSubBridge', () => {
  let fakeRedis: FakeRedis;
  let connMgr: WsConnectionManager;
  let bridge: WsPubSubBridge;
  let io: Server;

  beforeEach(async () => {
    fakeRedis = new FakeRedis();
    connMgr = new WsConnectionManager();

    // Cast FakeRedis to satisfy the RedisService shape used by the bridge.
    // We only need forDb(); it returns the same FakeRedis instance for any db.
    const fakeRedisService = {
      forDb: () => fakeRedis,
    } as unknown as Parameters<typeof WsPubSubBridge['prototype']['onModuleInit']> extends never
      ? never
      : ConstructorParameters<typeof WsPubSubBridge>[0];

    bridge = new WsPubSubBridge(fakeRedisService, connMgr);

    // Mock Socket.IO server — io.of('/<ns>') returns an object whose
    // .sockets is a Map of socketId → socket.
    const namespaces = new Map<string, { sockets: Map<string, Socket> }>();
    io = {
      of: (path: string) => {
        if (!namespaces.has(path)) namespaces.set(path, { sockets: new Map() });
        return namespaces.get(path)!;
      },
    } as unknown as Server;
    bridge.setServer(io);

    await bridge.onModuleInit();
  });

  it('should publish an envelope and deliver to local subscribed sockets in the same tenant', async () => {
    const user = makeUser({ tenantId: '01HSCH' });
    const sock = makeSocket('sock-1');
    const ctx = makeCtx('sock-1', user, 'room:01HROOM');

    // Inject socket into the mocked io.of('/chat').sockets map.
    const chatNs = (io as unknown as { of: (p: string) => { sockets: Map<string, Socket> } }).of('/chat');
    chatNs.sockets.set('sock-1', sock);

    connMgr.register(ctx);

    const env: WsMessageEnvelope = {
      event: 'chat.message.sent',
      payload: { text: 'hello' },
      eventId: '01J0TEST',
      timestamp: '2026-07-17T10:00:00.000Z',
    };

    await bridge.publish(WsNamespace.CHAT, '01HSCH', 'room:01HROOM', env);

    // Allow microtask queue to flush (publish → on('message') is sync in our mock).
    await new Promise((r) => setTimeout(r, 0));

    expect(sock._emitted).toHaveLength(1);
    expect(sock._emitted[0]).toMatchObject({
      event: 'chat',
      payload: { event: 'chat.message.sent', eventId: '01J0TEST' },
    });
  });

  it('should NOT deliver to sockets in a different tenant', async () => {
    const userA = makeUser({ id: '01HALICE', tenantId: '01HSCH' });
    const userB = makeUser({ id: '01HBOB', tenantId: '01HSCH2' });

    const sockA = makeSocket('sock-A');
    const sockB = makeSocket('sock-B');

    const ctxA = makeCtx('sock-A', userA, 'room:01HROOM');
    const ctxB = makeCtx('sock-B', userB, 'room:01HROOM');

    const chatNs = (io as unknown as { of: (p: string) => { sockets: Map<string, Socket> } }).of('/chat');
    chatNs.sockets.set('sock-A', sockA);
    chatNs.sockets.set('sock-B', sockB);

    connMgr.register(ctxA);
    connMgr.register(ctxB);

    const env: WsMessageEnvelope = {
      event: 'chat.message.sent',
      payload: { text: 'hello' },
      eventId: '01J0TEST',
      timestamp: '2026-07-17T10:00:00.000Z',
    };

    // Published to tenant 01HSCH — should reach sock-A only.
    await bridge.publish(WsNamespace.CHAT, '01HSCH', 'room:01HROOM', env);
    await new Promise((r) => setTimeout(r, 0));

    expect(sockA._emitted).toHaveLength(1);
    expect(sockB._emitted).toHaveLength(0);
  });

  it('should NOT deliver to sockets not subscribed to the target channel', async () => {
    const user = makeUser();
    const sock = makeSocket('sock-1');
    // Socket subscribed to a DIFFERENT room
    const ctx = makeCtx('sock-1', user, 'room:01HOTHER');

    const chatNs = (io as unknown as { of: (p: string) => { sockets: Map<string, Socket> } }).of('/chat');
    chatNs.sockets.set('sock-1', sock);
    connMgr.register(ctx);

    const env: WsMessageEnvelope = {
      event: 'chat.message.sent',
      payload: {},
      eventId: '01J0TEST2',
      timestamp: '2026-07-17T10:00:00.000Z',
    };

    await bridge.publish(WsNamespace.CHAT, '01HSCH', 'room:01HROOM', env);
    await new Promise((r) => setTimeout(r, 0));

    expect(sock._emitted).toHaveLength(0);
  });

  it('should silently drop messages with no matching local subscribers', async () => {
    // No sockets registered at all.
    const env: WsMessageEnvelope = {
      event: 'chat.message.sent',
      payload: {},
      eventId: '01J0TEST3',
      timestamp: '2026-07-17T10:00:00.000Z',
    };

    await expect(
      bridge.publish(WsNamespace.CHAT, '01HSCH', 'room:01HROOM', env),
    ).resolves.toBeUndefined();
  });
});
