/**
 * Unit tests for ChatGateway — domain event handling (chat.message.send,
 * chat.typing.start, chat.message.read).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';

import { ChatGateway } from '../gateways/chat.gateway';
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

function makeEnvelope<T>(event: string, payload: T): WsMessageEnvelope<T> {
  return {
    event,
    payload,
    eventId: randomUUID(),
    timestamp: '2026-07-17T10:00:00.000Z',
  };
}

function makeSocket(): Socket & { _emitted: unknown[] } {
  const emitted: unknown[] = [];
  const sock: any = {
    id: randomUUID(),
    emit: vi.fn((event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
    handshake: { query: { token: 'valid-token' } },
    on: vi.fn(),
    join: vi.fn(async () => undefined),
    leave: vi.fn(async () => undefined),
    disconnect: vi.fn(),
  };
  sock._emitted = emitted;
  return sock as Socket & { _emitted: unknown[] };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let connMgr: WsConnectionManager;
  let bridge: { publish: ReturnType<typeof vi.fn> } & WsPubSubBridge;
  let sock: Socket & { _emitted: unknown[] };

  beforeEach(async () => {
    const jwtVerifier = {
      verify: vi.fn(async () => makeUser()),
    } as unknown as WsJwtVerifier;

    connMgr = new WsConnectionManager();
    const scopeResolver = new WsScopeResolver();
    const subMgr = new WsSubscriptionManager(connMgr, scopeResolver);
    bridge = {
      publish: vi.fn(async () => undefined),
      setServer: vi.fn(),
    } as unknown as typeof bridge;

    gateway = new ChatGateway(jwtVerifier, connMgr, subMgr, bridge);

    sock = makeSocket();
    // Pre-register the connection so handleConnection runs (we want
    // domain-message routing to work without going through full connection).
    await gateway.handleConnection(sock);
    // Subscribe to room:01HROOM manually for the message-send tests.
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )?.[1] as ((msg: unknown) => Promise<void>) | undefined;
    expect(subHandler).toBeDefined();
    await subHandler!({ event: 'subscribe', channel: 'room:01HROOM' });
  });

  it('should publish chat.message.sent when client sends chat.message.send to a subscribed room', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.message.send', { roomId: '01HROOM', text: 'hello' });
    await subHandler(env);

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [ns, tenantId, channel, outMsg] = bridge.publish.mock.calls[0];
    expect(ns).toBe(WsNamespace.CHAT);
    expect(tenantId).toBe('01HSCH');
    expect(channel).toBe('room:01HROOM');
    expect(outMsg.event).toBe('chat.message.sent');
    expect(outMsg.payload).toMatchObject({
      roomId: '01HROOM',
      text: 'hello',
      senderId: '01HALICE',
    });
  });

  it('should emit SCOPE_DENIED when sending to a non-subscribed room', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.message.send', { roomId: '01HOTHER', text: 'oops' });
    await subHandler(env);

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'SCOPE_DENIED' }),
    });
  });

  it('should emit PAYLOAD_INVALID when payload is missing required fields', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.message.send', {}); // missing roomId, text
    await subHandler(env);

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'PAYLOAD_INVALID' }),
    });
  });

  it('should publish chat.typing event for chat.typing.start', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.typing.start', { roomId: '01HROOM' });
    await subHandler(env);

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [_ns, _t, _c, outMsg] = bridge.publish.mock.calls[0];
    expect(outMsg.event).toBe('chat.typing');
    expect(outMsg.payload.isTyping).toBe(true);
  });

  it('should publish chat.message.read event for chat.message.read', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.message.read', { roomId: '01HROOM', messageId: '01HMSG' });
    await subHandler(env);

    expect(bridge.publish).toHaveBeenCalledTimes(1);
    const [_ns, _t, _c, outMsg] = bridge.publish.mock.calls[0];
    expect(outMsg.event).toBe('chat.message.read');
    expect(outMsg.payload.readBy).toBe('01HALICE');
  });

  it('should emit EVENT_INVALID for unknown chat events', async () => {
    const subHandler = (sock as any).on.mock.calls.find(
      (c: unknown[]) => c[0] === 'chat',
    )![1] as (msg: unknown) => Promise<void>;

    const env = makeEnvelope('chat.bogus.event', {});
    await subHandler(env);

    expect(bridge.publish).not.toHaveBeenCalled();
    const errs = sock._emitted.filter((e: any) => e.event === 'error');
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatchObject({
      event: 'error',
      payload: expect.objectContaining({ code: 'EVENT_INVALID' }),
    });
  });
});
