/**
 * Unit tests for WsSubscriptionManager — subscribe / unsubscribe flow
 * with mocked Socket.IO sockets and a real WsScopeResolver.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Socket } from 'socket.io';

import { WsSubscriptionManager } from '../subscription/ws-subscription-manager';
import { WsScopeResolver } from '../subscription/ws-scope-resolver';
import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsNamespace, type WsAuthenticatedUser, type WsConnectionContext } from '../ws-connection-context';

function makeUser(overrides: Partial<WsAuthenticatedUser> = {}): WsAuthenticatedUser {
  return {
    id: '01HALICE',
    tenantId: '01HSCH',
    branchId: '01HBR',
    email: 'alice@preone.in',
    roles: ['ADMIN'],
    permissionsVersion: 1,
    sessionId: '01HSESS',
    ...overrides,
  };
}

function makeSocket(id = 'sock-1'): Socket & { _emitted: unknown[]; _joined: string[]; _left: string[] } {
  const emitted: unknown[] = [];
  const joined: string[] = [];
  const left: string[] = [];
  const sock = {
    id,
    join: vi.fn(async (room: string) => {
      joined.push(room);
    }),
    leave: vi.fn(async (room: string) => {
      left.push(room);
    }),
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
    handshake: { query: {} },
  } as unknown as Socket & { _emitted: unknown[]; _joined: string[]; _left: string[] };
  sock._emitted = emitted;
  sock._joined = joined;
  sock._left = left;
  return sock;
}

function makeCtx(socketId: string, user: WsAuthenticatedUser, ns: WsNamespace): WsConnectionContext {
  return {
    socketId,
    user,
    namespace: ns,
    subscriptions: new Set(),
    connectedAt: '2026-07-17T10:00:00.000Z',
    lastPongAt: '2026-07-17T10:00:00.000Z',
  };
}

describe('WsSubscriptionManager', () => {
  let connMgr: WsConnectionManager;
  let scopeResolver: WsScopeResolver;
  let subMgr: WsSubscriptionManager;

  beforeEach(() => {
    connMgr = new WsConnectionManager();
    scopeResolver = new WsScopeResolver();
    subMgr = new WsSubscriptionManager(connMgr, scopeResolver);
  });

  it('should subscribe a socket to a permitted channel', async () => {
    const user = makeUser({ roles: ['ADMIN'] });
    const ctx = makeCtx('sock-1', user, WsNamespace.CHAT);
    connMgr.register(ctx);
    const sock = makeSocket('sock-1');

    await subMgr.subscribe(sock, 'room:01HROOM', WsNamespace.CHAT);

    expect(sock._joined).toEqual(['room:01HROOM']);
    expect(ctx.subscriptions.has('room:01HROOM')).toBe(true);
    expect(sock._emitted).toHaveLength(1);
    expect(sock._emitted[0]).toMatchObject({
      event: 'chat',
      payload: { event: 'subscribed', channel: 'room:01HROOM' },
    });
  });

  it('should emit an error when scope denies subscription', async () => {
    const user = makeUser({ id: '01HALICE', roles: ['TEACHER'] });
    const ctx = makeCtx('sock-1', user, WsNamespace.NOTIFICATIONS);
    connMgr.register(ctx);
    const sock = makeSocket('sock-1');

    // Alice (TEACHER) trying to subscribe to Bob's user channel.
    await subMgr.subscribe(sock, 'user:01HBOB', WsNamespace.NOTIFICATIONS);

    expect(sock._joined).toEqual([]);
    expect(ctx.subscriptions.has('user:01HBOB')).toBe(false);
    expect(sock._emitted).toHaveLength(1);
    expect(sock._emitted[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'SCOPE_DENIED' }),
    });
  });

  it('should emit an error for unknown channel format', async () => {
    const ctx = makeCtx('sock-1', makeUser(), WsNamespace.CHAT);
    connMgr.register(ctx);
    const sock = makeSocket('sock-1');

    await subMgr.subscribe(sock, 'bogus:01H', WsNamespace.CHAT);

    expect(sock._joined).toEqual([]);
    expect(sock._emitted[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'CHANNEL_INVALID' }),
    });
  });

  it('should unsubscribe a socket from a channel', async () => {
    const ctx = makeCtx('sock-1', makeUser(), WsNamespace.CHAT);
    ctx.subscriptions.add('room:01HROOM');
    connMgr.register(ctx);
    const sock = makeSocket('sock-1');

    await subMgr.unsubscribe(sock, 'room:01HROOM', WsNamespace.CHAT);

    expect(sock._left).toEqual(['room:01HROOM']);
    expect(ctx.subscriptions.has('room:01HROOM')).toBe(false);
    expect(sock._emitted[0]).toMatchObject({
      event: 'chat',
      payload: { event: 'unsubscribed', channel: 'room:01HROOM' },
    });
  });

  it('should do nothing when subscribe() is called for unknown socket', async () => {
    const sock = makeSocket('never-registered');
    await subMgr.subscribe(sock, 'room:01HROOM', WsNamespace.CHAT);
    expect(sock._emitted[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
    });
  });

  it('clearAll() should empty the subscription set', async () => {
    const ctx = makeCtx('sock-1', makeUser(), WsNamespace.CHAT);
    ctx.subscriptions.add('room:01HROOM');
    ctx.subscriptions.add('room:01HROOM2');
    connMgr.register(ctx);

    await subMgr.clearAll('sock-1');

    expect(ctx.subscriptions.size).toBe(0);
  });
});
