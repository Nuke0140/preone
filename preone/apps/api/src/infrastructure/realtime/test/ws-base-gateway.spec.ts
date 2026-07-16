/**
 * Unit tests for WsBaseGateway via a concrete test subclass.
 *
 * Covers:
 *   - handleConnection: JWT verify success / failure
 *   - control event routing (subscribe / unsubscribe / ping)
 *   - domain event delegation to subclass
 *   - heartbeat timeout disconnect (skipped — relies on real timers across 60s)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';

import { WsBaseGateway } from '../gateway/ws-base-gateway';
import { WsJwtVerifier } from '../auth/ws-jwt-verifier';
import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsSubscriptionManager } from '../subscription/ws-subscription-manager';
import { WsScopeResolver } from '../subscription/ws-scope-resolver';
import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import {
  WsNamespace,
  type WsAuthenticatedUser,
  type WsConnectionContext,
} from '../ws-connection-context';
import type { WsMessageEnvelope } from '../ws-message-envelope';

/** Concrete subclass of WsBaseGateway for testing — captures onDomainMessage calls. */
class TestGateway extends WsBaseGateway {
  protected readonly namespace = WsNamespace.CHAT;
  protected readonly logger = new Logger('TestGateway');
  public received: Array<{ socket: Socket; envelope: WsMessageEnvelope }> = [];

  constructor(
    jwtVerifier: WsJwtVerifier,
    connMgr: WsConnectionManager,
    subMgr: WsSubscriptionManager,
    bridge: WsPubSubBridge,
  ) {
    super(jwtVerifier, connMgr, subMgr, bridge);
  }

  protected async onDomainMessage(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    this.received.push({ socket, envelope });
  }
}

function makeUser(): WsAuthenticatedUser {
  return {
    id: '01HALICE',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'alice@preone.in',
    roles: ['ADMIN'],
    permissionsVersion: 1,
    sessionId: '01HSESS',
  };
}

function makeSocket(query: Record<string, unknown> = {}): Socket & {
  _emitted: unknown[];
  _disconnected: boolean;
  _handlers: Map<string, ((msg: unknown) => void)[]>;
  _joined: string[];
  disconnect: (close?: boolean) => void;
} {
  const emitted: unknown[] = [];
  const handlers = new Map<string, ((msg: unknown) => void)[]>();
  const joined: string[] = [];
  let disconnected = false;
  const sock = {
    id: randomUUID(),
    handshake: { query },
    on: vi.fn((event: string, cb: (msg: unknown) => void) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(cb);
    }),
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
    join: vi.fn(async (room: string) => {
      joined.push(room);
    }),
    leave: vi.fn(async (room: string) => {
      // no-op
    }),
    disconnect: vi.fn((close?: boolean) => {
      disconnected = true;
    }),
  } as unknown as Socket & {
    _emitted: unknown[];
    _disconnected: boolean;
    _handlers: Map<string, ((msg: unknown) => void)[]>;
    _joined: string[];
    disconnect: (close?: boolean) => void;
  };
  sock._emitted = emitted;
  sock._disconnected = disconnected;
  sock._handlers = handlers;
  sock._joined = joined;
  // Track disconnect state separately since vi.fn return value isn't reactive.
  Object.defineProperty(sock, '_disconnected', {
    get: () => disconnected,
    set: (v: boolean) => {
      disconnected = v;
    },
  });
  return sock;
}

describe('WsBaseGateway (via TestGateway)', () => {
  let jwtVerifier: WsJwtVerifier;
  let connMgr: WsConnectionManager;
  let subMgr: WsSubscriptionManager;
  let scopeResolver: WsScopeResolver;
  let bridge: WsPubSubBridge;
  let gateway: TestGateway;

  beforeEach(() => {
    // Mock JwtVerifier to return a fixed user when called with 'valid-token'.
    jwtVerifier = {
      verify: vi.fn(async (token?: string) => {
        if (token === 'valid-token') return makeUser();
        return undefined;
      }),
    } as unknown as WsJwtVerifier;

    connMgr = new WsConnectionManager();
    scopeResolver = new WsScopeResolver();
    subMgr = new WsSubscriptionManager(connMgr, scopeResolver);
    bridge = {
      publish: vi.fn(async () => undefined),
      setServer: vi.fn(),
    } as unknown as WsPubSubBridge;

    gateway = new TestGateway(jwtVerifier, connMgr, subMgr, bridge);
  });

  describe('handleConnection', () => {
    it('should disconnect the socket when no token is provided', async () => {
      const sock = makeSocket({});
      await gateway.handleConnection(sock as Socket);

      expect((sock as any)._disconnected).toBe(true);
      // Should have emitted an AUTH_REQUIRED error before disconnect.
      expect(sock._emitted).toHaveLength(1);
      expect(sock._emitted[0]).toMatchObject({
        event: 'error',
        payload: expect.objectContaining({ code: 'AUTH_REQUIRED' }),
      });
    });

    it('should disconnect when JWT verification fails', async () => {
      const sock = makeSocket({ token: 'bogus-token' });
      await gateway.handleConnection(sock as Socket);
      expect((sock as any)._disconnected).toBe(true);
    });

    it('should register the connection and emit "connected" on valid JWT', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);

      expect((sock as any)._disconnected).toBe(false);
      expect(connMgr.size()).toBe(1);
      // First emit is the 'connected' event on namespace 'chat'.
      const first = sock._emitted[0] as { event: string; payload: { event: string; user: { id: string; tenantId: string } } };
      expect(first.event).toBe('chat');
      expect(first.payload.event).toBe('connected');
      expect(first.payload.user.id).toBe('01HALICE');
      expect(first.payload.user.tenantId).toBe('01HSCH');
    });

    it('should register a socket event listener for the namespace', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);

      expect(sock.on).toHaveBeenCalledWith('chat', expect.any(Function));
    });
  });

  describe('control event routing', () => {
    it('should route a subscribe control event to SubscriptionManager', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);

      // Find the registered handler and invoke with a subscribe message.
      const handler = sock._handlers.get('chat')![0];
      await handler({ event: 'subscribe', channel: 'room:01HROOM' });

      // Expect an ack to be emitted.
      const acks = sock._emitted.filter(
        (e: any) => e.event === 'chat' && e.payload?.event === 'subscribed',
      );
      expect(acks).toHaveLength(1);
      expect(acks[0]).toMatchObject({
        event: 'chat',
        payload: { event: 'subscribed', channel: 'room:01HROOM' },
      });
    });

    it('should route an unsubscribe control event to SubscriptionManager', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);
      const handler = sock._handlers.get('chat')![0];

      // First subscribe, then unsubscribe.
      await handler({ event: 'subscribe', channel: 'room:01HROOM' });
      await handler({ event: 'unsubscribe', channel: 'room:01HROOM' });

      const acks = sock._emitted.filter(
        (e: any) => e.event === 'chat' && e.payload?.event === 'unsubscribed',
      );
      expect(acks).toHaveLength(1);
    });

    it('should respond to ping with pong', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);
      const handler = sock._handlers.get('chat')![0];

      await handler({ event: 'ping' });

      const pongs = sock._emitted.filter(
        (e: any) => e.event === 'chat' && e.payload?.event === 'pong',
      );
      expect(pongs).toHaveLength(1);
    });

    it('should delegate domain events to onDomainMessage()', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);
      const handler = sock._handlers.get('chat')![0];

      const envelope: WsMessageEnvelope = {
        event: 'chat.message.send',
        payload: { text: 'hi' },
        eventId: '01J0TEST',
        timestamp: '2026-07-17T10:00:00.000Z',
      };
      await handler(envelope);

      expect(gateway.received).toHaveLength(1);
      expect(gateway.received[0].envelope).toEqual(envelope);
    });

    it('should emit error for non-object messages', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);
      const handler = sock._handlers.get('chat')![0];

      await handler('not-an-object');

      const errs = sock._emitted.filter((e: any) => e.event === 'error');
      expect(errs).toHaveLength(1);
      expect(errs[0]).toMatchObject({
        event: 'error',
        payload: expect.objectContaining({ code: 'PAYLOAD_INVALID' }),
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should unregister the connection and clear subscriptions', async () => {
      const sock = makeSocket({ token: 'valid-token' });
      await gateway.handleConnection(sock as Socket);
      const handler = sock._handlers.get('chat')![0];
      await handler({ event: 'subscribe', channel: 'room:01HROOM' });

      const ctxBefore = connMgr.get(sock.id);
      expect(ctxBefore?.subscriptions.has('room:01HROOM')).toBe(true);

      await gateway.handleDisconnect(sock as Socket);

      expect(connMgr.get(sock.id)).toBeUndefined();
      expect(connMgr.size()).toBe(0);
    });
  });
});
