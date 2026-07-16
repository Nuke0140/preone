/**
 * WsConnectionManager — tracks all active WS connections on this instance.
 *
 * Responsibilities:
 *   1. Register / unregister connections keyed by socketId.
 *   2. Look up the WsConnectionContext for a given socketId (used by gateways
 *      and the Redis bridge).
 *   3. Maintain a secondary index by user → Set<socketId> so we can fan out
 *      a notification to all of a user's open tabs / devices.
 *   4. Maintain a tertiary index by tenantId → Set<socketId> for admin-level
 *      school-wide broadcasts.
 *
 * This registry is IN-PROCESS only. Cross-instance fan-out goes through the
 * Redis pub/sub bridge (WsPubSubBridge). The bridge receives a message from
 * instance A, publishes to Redis; every instance (including A) subscribes,
 * looks up local sockets whose subscriptions match the channel, and emits.
 *
 * Lifecycle: every gateway calls register() on connection and unregister()
 * on disconnect. We do not own the socket itself — Socket.IO does.
 */
import { Injectable, Logger } from '@nestjs/common';

import type { WsConnectionContext, WsAuthenticatedUser, WsNamespace } from '../ws-connection-context';

@Injectable()
export class WsConnectionManager {
  private readonly logger = new Logger(WsConnectionManager.name);

  /** socketId → context. */
  private readonly bySocket = new Map<string, WsConnectionContext>();
  /** userId → Set<socketId>. */
  private readonly byUser = new Map<string, Set<string>>();
  /** tenantId → Set<socketId>. */
  private readonly byTenant = new Map<string, Set<string>>();
  /** namespace → Set<socketId>. */
  private readonly byNamespace = new Map<WsNamespace, Set<string>>();

  /**
   * Register a new connection. Idempotent if the socketId is already registered
   * (re-registration overwrites — useful for re-auth flows).
   */
  register(ctx: WsConnectionContext): void {
    this.bySocket.set(ctx.socketId, ctx);
    this.addToIndex(this.byUser, ctx.user.id, ctx.socketId);
    this.addToIndex(this.byTenant, ctx.user.tenantId, ctx.socketId);
    this.addToIndex(this.byNamespace, ctx.namespace, ctx.socketId);
    this.logger.debug(
      `Registered socket ${ctx.socketId} (user=${ctx.user.id}, ns=${ctx.namespace}). ` +
        `Total on instance: ${this.bySocket.size}`,
    );
  }

  /** Unregister a connection and clean up all indexes. */
  unregister(socketId: string): WsConnectionContext | undefined {
    const ctx = this.bySocket.get(socketId);
    if (!ctx) return undefined;

    this.bySocket.delete(socketId);
    this.removeFromIndex(this.byUser, ctx.user.id, socketId);
    this.removeFromIndex(this.byTenant, ctx.user.tenantId, socketId);
    this.removeFromIndex(this.byNamespace, ctx.namespace, socketId);

    // Clear any lingering heartbeat timers
    if (ctx.heartbeatTimer) clearTimeout(ctx.heartbeatTimer);
    if (ctx.heartbeatTimeoutTimer) clearTimeout(ctx.heartbeatTimeoutTimer);

    this.logger.debug(
      `Unregistered socket ${socketId} (user=${ctx.user.id}, ns=${ctx.namespace}). ` +
        `Total on instance: ${this.bySocket.size}`,
    );
    return ctx;
  }

  get(socketId: string): WsConnectionContext | undefined {
    return this.bySocket.get(socketId);
  }

  /** All sockets belonging to a user (across all namespaces). */
  socketsForUser(userId: string): readonly string[] {
    return Array.from(this.byUser.get(userId) ?? []);
  }

  /** All sockets in a tenant (across all namespaces). */
  socketsForTenant(tenantId: string): readonly string[] {
    return Array.from(this.byTenant.get(tenantId) ?? []);
  }

  /** All sockets currently subscribed to a given channel on this instance. */
  socketsForChannel(channel: string): readonly string[] {
    const out: string[] = [];
    for (const ctx of this.bySocket.values()) {
      if (ctx.subscriptions.has(channel)) out.push(ctx.socketId);
    }
    return out;
  }

  /**
   * All sockets currently subscribed to a channel AND belonging to tenantId.
   *
   * Used by the Redis bridge to ensure tenant isolation — even if a buggy
   * client manages to subscribe to another tenant's channel name, the bridge
   * will skip the emit because the socket's user.tenantId does not match
   * the message's tenantId.
   */
  socketsForChannelInTenant(channel: string, tenantId: string): readonly string[] {
    const out: string[] = [];
    for (const ctx of this.bySocket.values()) {
      if (ctx.user.tenantId !== tenantId) continue;
      if (ctx.subscriptions.has(channel)) out.push(ctx.socketId);
    }
    return out;
  }

  /** Total connections on this instance (all namespaces). */
  size(): number {
    return this.bySocket.size;
  }

  /** Total connections for a specific namespace on this instance. */
  sizeForNamespace(ns: WsNamespace): number {
    return this.byNamespace.get(ns)?.size ?? 0;
  }

  // ----- internals -----

  private addToIndex<K>(idx: Map<K, Set<string>>, key: K, socketId: string): void {
    let set = idx.get(key);
    if (!set) {
      set = new Set();
      idx.set(key, set);
    }
    set.add(socketId);
  }

  private removeFromIndex<K>(idx: Map<K, Set<string>>, key: K, socketId: string): void {
    const set = idx.get(key);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) idx.delete(key);
  }
}
