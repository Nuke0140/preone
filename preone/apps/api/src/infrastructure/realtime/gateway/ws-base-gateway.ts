/**
 * WsBaseGateway — shared lifecycle + auth + heartbeat + subscription routing
 * for all 5 PreOne WebSocket gateways.
 *
 * Per API §17.2 "Connection Lifecycle":
 *   1. Client opens: wss://api.preone.in/ws/<ns>?token=eyJ...
 *   2. Server validates JWT → sends 'connected' event with sessionId.
 *   3. Client subscribes: { event: 'subscribe', channel: 'room:01HROOM' }
 *   4. Server confirms: { event: 'subscribed', channel: '...' }
 *   5. Client sends messages, receives messages in real-time.
 *   6. Heartbeat: client ping every 30s, server pong (timeout 60s = disconnect).
 *   7. Disconnect: client 'close' or TCP drop → server cleans up subscriptions.
 *   8. Reconnect: client exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s) with jitter.
 *
 * Subclasses (one per namespace) just need to:
 *   - Provide the namespace path via @WebSocketGateway({ namespace: '<ns>', path: '/ws/<ns>' }).
 *   - Override `onDomainMessage()` to handle namespace-specific client→server
 *     messages (e.g., a chat gateway handles 'chat.message.send' here).
 *
 * All control events (subscribe / unsubscribe / ping / disconnect) are handled
 * here so subclasses do not repeat themselves.
 */
import { Logger } from '@nestjs/common';
import type { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';

import { WsJwtVerifier } from '../auth/ws-jwt-verifier';
import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import { WsConnectionManager } from './ws-connection-manager';
import { WsSubscriptionManager } from '../subscription/ws-subscription-manager';
import {
  type WsNamespace,
  type WsConnectionContext,
  type WsAuthenticatedUser,
} from '../ws-connection-context';
import type {
  WsClientControlEvent,
  WsConnectedEvent,
  WsErrorEnvelope,
  WsPongMessage,
  WsMessageEnvelope,
} from '../ws-message-envelope';

/** Heartbeat config (API §17.6). */
export const HEARTBEAT_INTERVAL_MS = 30_000;
export const HEARTBEAT_TIMEOUT_MS = 60_000;

export abstract class WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected abstract readonly namespace: WsNamespace;
  protected abstract readonly logger: Logger;
  protected io!: Server;

  constructor(
    protected readonly jwtVerifier: WsJwtVerifier,
    protected readonly connectionManager: WsConnectionManager,
    protected readonly subscriptionManager: WsSubscriptionManager,
    protected readonly bridge: WsPubSubBridge,
  ) {}

  /** Subclasses override to handle namespace-specific client→server messages. */
  protected async onDomainMessage(_socket: Socket, _envelope: WsMessageEnvelope): Promise<void> {
    // default: no-op. Subclasses override.
  }

  // ----- Lifecycle hooks -----

  afterInit(server: Server): void {
    this.io = server;
    // Bind server to the subscription manager + bridge so they can fan out
    // messages to local sockets. The first gateway to init wins; subsequent
    // gateways just rebind the same reference (idempotent).
    this.subscriptionManager.setServer(server);
    this.bridge.setServer(server);
    this.logger.log(`WebSocket gateway initialized: /${this.namespace}`);
  }

  async handleConnection(socket: Socket): Promise<void> {
    // 1. JWT auth — token from query param (API §17.4).
    const token = (socket.handshake.query['token'] as string | undefined) ?? undefined;
    const user = await this.jwtVerifier.verify(token);
    if (!user) {
      const err: WsErrorEnvelope = {
        event: 'error',
        code: 'AUTH_REQUIRED',
        message: 'Missing or invalid token. Connect with ?token=<jwt>.',
      };
      socket.emit('error', err);
      socket.disconnect(true);
      return;
    }

    // 2. Register connection.
    const now = new Date().toISOString();
    const sessionId = randomUUID();
    const ctx: WsConnectionContext = {
      socketId: socket.id,
      user,
      namespace: this.namespace,
      subscriptions: new Set<string>(),
      connectedAt: now,
      lastPongAt: now,
    };
    this.connectionManager.register(ctx);

    // 3. Send 'connected' event back to client.
    const connected: WsConnectedEvent = {
      event: 'connected',
      sessionId,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        roles: user.roles,
      },
      at: now,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
    };
    socket.emit(this.namespace, connected);

    // 4. Start heartbeat watcher.
    this.scheduleHeartbeat(socket, user);

    // 5. Wire up control event handlers.
    // The handler returns the async promise so unit tests can `await` it.
    // Socket.IO itself does NOT await handlers in production — fire-and-
    // forget semantics are preserved — but returning the promise makes
    // the handler's behaviour observable in tests, which is necessary
    // because the Wave 16.1 WsScopeResolver is now async (DB-backed).
    socket.on(this.namespace, (msg: unknown) => {
      return this.onSocketEvent(socket, msg).catch((err) => {
        this.logger.error(
          `Error handling event on /${this.namespace} for ${socket.id}: ${(err as Error).message}`,
        );
      });
    });

    this.logger.log(`WS /${this.namespace} connected: user=${user.id} socket=${socket.id}`);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    await this.subscriptionManager.clearAll(socket.id);
    const ctx = this.connectionManager.unregister(socket.id);
    if (ctx) {
      this.logger.log(
        `WS /${this.namespace} disconnected: user=${ctx.user.id} socket=${socket.id}`,
      );
    }
  }

  // ----- Control event routing -----

  private async onSocketEvent(socket: Socket, msg: unknown): Promise<void> {
    if (typeof msg !== 'object' || msg === null || !('event' in msg)) {
      this.emitError(socket, 'PAYLOAD_INVALID', 'Message must include an `event` field.');
      return;
    }

    const envelope = msg as { event: string } & Record<string, unknown>;

    // 1. Control events (subscribe / unsubscribe / ping).
    if (envelope.event === 'subscribe' || envelope.event === 'unsubscribe') {
      await this.handleControlEvent(socket, envelope as unknown as WsClientControlEvent);
      return;
    }

    if (envelope.event === 'ping') {
      this.handlePing(socket);
      return;
    }

    // 2. Domain events — delegate to subclass.
    if (this.isEnvelope(envelope)) {
      await this.onDomainMessage(socket, envelope);
      return;
    }

    this.emitError(socket, 'EVENT_INVALID', `Unknown event: ${envelope.event}`);
  }

  private async handleControlEvent(socket: Socket, msg: WsClientControlEvent): Promise<void> {
    switch (msg.event) {
      case 'subscribe':
        await this.subscriptionManager.subscribe(socket, msg.channel, this.namespace);
        break;
      case 'unsubscribe':
        await this.subscriptionManager.unsubscribe(socket, msg.channel, this.namespace);
        break;
      case 'ping':
        this.handlePing(socket);
        break;
    }
  }

  private handlePing(socket: Socket): void {
    const ctx = this.connectionManager.get(socket.id);
    if (ctx) ctx.lastPongAt = new Date().toISOString();
    const pong: WsPongMessage = {
      event: 'pong',
      at: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    };
    socket.emit(this.namespace, pong);
  }

  // ----- Heartbeat -----

  private scheduleHeartbeat(socket: Socket, user: WsAuthenticatedUser): void {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;

    // We do not proactively send pings — the spec says the CLIENT sends pings.
    // We just watch for lastPongAt to advance; if it does not within 60s, we
    // force-disconnect. (Heartbeat interval is the client's responsibility.)
    ctx.heartbeatTimeoutTimer = setInterval(() => {
      const ctxNow = this.connectionManager.get(socket.id);
      if (!ctxNow) return;
      const lastPong = Date.parse(ctxNow.lastPongAt);
      const ageMs = Date.now() - lastPong;
      if (ageMs > HEARTBEAT_TIMEOUT_MS) {
        this.logger.warn(
          `WS /${this.namespace} heartbeat timeout (age=${ageMs}ms) — disconnecting ${socket.id}`,
        );
        socket.disconnect(true);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // ----- helpers -----

  private isEnvelope(msg: unknown): msg is WsMessageEnvelope {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as Record<string, unknown>;
    return (
      typeof m['event'] === 'string' &&
      typeof m['eventId'] === 'string' &&
      typeof m['timestamp'] === 'string' &&
      'payload' in m
    );
  }

  protected emitError(
    socket: Socket,
    code: WsErrorEnvelope['code'],
    message: string,
    originalEvent?: string,
  ): void {
    const err: WsErrorEnvelope = { event: 'error', code, message, originalEvent };
    socket.emit('error', err);
  }
}
