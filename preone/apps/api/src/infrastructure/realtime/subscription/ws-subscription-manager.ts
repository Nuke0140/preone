/**
 * WsSubscriptionManager — adds/removes channel subscriptions on a socket.
 *
 * Wraps Socket.IO's native `socket.join(channel)` / `socket.leave(channel)`
 * with our scope-check layer (WsScopeResolver) and updates the per-connection
 * subscription set in WsConnectionContext.
 *
 * Why we keep our own Set<channel> alongside Socket.IO's rooms:
 *   - Socket.IO does not expose "list rooms this socket is in" reliably
 *     across all versions.
 *   - We need a fast in-memory lookup for the Redis bridge to fan out
 *     messages to matching local sockets.
 *   - The subscription set is the source of truth for "what channels does
 *     this connection currently care about".
 *
 * Concurrency: socket.emit / socket.join are async but we treat them as
 * fire-and-forget here. If a join fails, the connection's subscription set
 * is NOT updated — so a subsequent broadcast will not emit to this socket,
 * which is the safe direction (over-denial rather than over-granting).
 */
import { Injectable, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsScopeResolver, type ScopeResolution } from './ws-scope-resolver';
import type {
  WsSubscribeAck,
  WsUnsubscribeAck,
  WsErrorEnvelope,
} from '../ws-message-envelope';
import type { WsNamespace } from '../ws-connection-context';

@Injectable()
export class WsSubscriptionManager {
  private readonly logger = new Logger(WsSubscriptionManager.name);
  private io!: Server;

  constructor(
    private readonly connectionManager: WsConnectionManager,
    private readonly scopeResolver: WsScopeResolver,
  ) {}

  /** Bind the Socket.IO server — called once from RealtimeModule.onModuleInit. */
  setServer(io: Server): void {
    this.io = io;
  }

  /**
   * Subscribe a socket to a channel after scope check.
   * Emits the appropriate ack or error back to the client.
   */
  async subscribe(socket: Socket, channel: string, namespace: WsNamespace): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) {
      this.logger.warn(`subscribe() called for unknown socket ${socket.id}`);
      this.emitError(socket, {
        event: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Connection context not found.',
        originalEvent: 'subscribe',
      });
      return;
    }

    const resolution = this.scopeResolver.resolve(ctx.user, channel);
    if (!resolution.ok) {
      this.emitError(socket, {
        event: 'error',
        code: resolution.code,
        message: resolution.reason,
        originalEvent: 'subscribe',
      });
      return;
    }

    // Socket.IO room join — this is what enables `io.to(channel).emit(...)`.
    await socket.join(channel);
    ctx.subscriptions.add(channel);

    const ack: WsSubscribeAck = {
      event: 'subscribed',
      channel,
      at: new Date().toISOString(),
    };
    socket.emit(namespace, ack);
    this.logger.debug(`Socket ${socket.id} subscribed to ${channel} (ns=${namespace}).`);
  }

  /** Unsubscribe a socket from a channel. */
  async unsubscribe(socket: Socket, channel: string, namespace: WsNamespace): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) {
      this.logger.warn(`unsubscribe() called for unknown socket ${socket.id}`);
      return;
    }

    await socket.leave(channel);
    ctx.subscriptions.delete(channel);

    const ack: WsUnsubscribeAck = {
      event: 'unsubscribed',
      channel,
      at: new Date().toISOString(),
    };
    socket.emit(namespace, ack);
    this.logger.debug(`Socket ${socket.id} unsubscribed from ${channel} (ns=${namespace}).`);
  }

  /** Remove all subscriptions for a socket — called on disconnect. */
  async clearAll(socketId: string): Promise<void> {
    const ctx = this.connectionManager.get(socketId);
    if (!ctx) return;
    ctx.subscriptions.clear();
    // Socket.IO automatically removes the socket from all rooms on disconnect,
    // so we do not need to call socket.leave() per channel here.
  }

  private emitError(socket: Socket, err: WsErrorEnvelope): void {
    socket.emit('error', err);
  }

  /** Convenience for tests — exposes the scope resolver's decision. */
  explainScope(user: Parameters<WsScopeResolver['resolve']>[0], channel: string): ScopeResolution {
    return this.scopeResolver.resolve(user, channel);
  }
}
