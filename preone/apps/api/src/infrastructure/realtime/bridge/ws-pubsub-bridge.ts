/**
 * WsPubSubBridge — cross-instance message fan-out via Redis pub/sub.
 *
 * Problem: in production, PreOne API runs as multiple replicas behind a
 * load balancer. A WebSocket connection lands on ONE replica. If a domain
 * event happens on replica A but the relevant subscriber is on replica B,
 * the message must traverse Redis to reach B.
 *
 * Solution (API §17 + BTD §13.1):
 *   1. Domain service publishes a WsMessageEnvelope to WsPubSubBridge.
 *   2. Bridge publishes the envelope to Redis channel `preone:ws:<namespace>`.
 *   3. Every API instance subscribes to that channel.
 *   4. On receipt, each instance looks up local sockets whose subscriptions
 *      match the envelope's target channel AND whose user.tenantId matches
 *      the envelope's tenantId, and emits the envelope to those sockets.
 *
 * The same bridge is used for all 5 namespaces — we use one Redis channel
 * per namespace to keep namespace traffic isolated (so a high-volume
 * `attendance.marked` storm does not wake up the `dashboard` listener).
 *
 * Lifecycle:
 *   - onModuleInit: subscribe to all 5 namespace channels.
 *   - publish(): encode + PUBLISH.
 *   - on message: decode → look up local sockets → emit.
 *   - onModuleDestroy: UNSUBSCRIBE.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';

import { RedisService } from '../../redis/redis.service';
import {
  ALL_WS_NAMESPACES,
  nsPubSubChannel,
  type WsNamespace,
} from '../ws-connection-context';
import type { WsMessageEnvelope } from '../ws-message-envelope';
import { WsConnectionManager } from '../gateway/ws-connection-manager';

/**
 * Bridge message — the envelope wrapped with routing metadata.
 * `tenantId` is the tenant scope (so receiving instances can skip sockets
 * belonging to other tenants without parsing the payload). `channel` is the
 * Socket.IO room name (e.g., "room:01HROOM") — receiving instances look up
 * local sockets subscribed to this room.
 */
export interface WsBridgeMessage<T = unknown> {
  ns: WsNamespace;
  tenantId: string;
  /** Target channel — corresponds to a Socket.IO room name. */
  channel: string;
  envelope: WsMessageEnvelope<T>;
}

@Injectable()
export class WsPubSubBridge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WsPubSubBridge.name);
  private io!: Server;
  /** Dedicated pub/sub connection (must be separate from the command client). */
  private subscriber?: ReturnType<RedisService['forDb']>;
  private publisher?: ReturnType<RedisService['forDb']>;

  constructor(
    private readonly redis: RedisService,
    private readonly connectionManager: WsConnectionManager,
  ) {}

  setServer(io: Server): void {
    this.io = io;
  }

  async onModuleInit(): Promise<void> {
    this.subscriber = this.redis.forDb(6 /* RedisDb.PUBSUB */);
    this.publisher = this.redis.forDb(6 /* RedisDb.PUBSUB */);

    for (const ns of ALL_WS_NAMESPACES) {
      const channel = nsPubSubChannel(ns);
      await this.subscriber.subscribe(channel);
      this.logger.log(`Subscribed to Redis pub/sub channel: ${channel}`);
    }

    this.subscriber.on('message', (channel, raw) => {
      this.handleIncoming(channel, raw).catch((err) => {
        this.logger.error(
          `Failed to handle incoming WS bridge message on ${channel}: ${(err as Error).message}`,
        );
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const ns of ALL_WS_NAMESPACES) {
      try {
        await this.subscriber?.unsubscribe(nsPubSubChannel(ns));
      } catch {
        // ignore — shutting down
      }
    }
  }

  /**
   * Publish a message to all instances (including this one).
   *
   * This is what application code calls — e.g.,
   *   bridge.publish('attendance', tenantId, 'class:01HCL', envelope)
   */
  async publish<T>(
    ns: WsNamespace,
    tenantId: string,
    channel: string,
    envelope: WsMessageEnvelope<T>,
  ): Promise<void> {
    if (!this.publisher) {
      this.logger.warn(`publish() called before onModuleInit; dropping message.`);
      return;
    }
    const bridgeMsg: WsBridgeMessage<T> = { ns, tenantId, channel, envelope };
    const payload = JSON.stringify(bridgeMsg);
    await this.publisher.publish(nsPubSubChannel(ns), payload);
  }

  /**
   * Handle a message received from another instance (or this one).
   *
   * 1. Parse the bridge message.
   * 2. Find local sockets subscribed to `channel` in `tenantId`.
   * 3. Emit the envelope to each matching socket via its namespace.
   */
  private async handleIncoming(redisChannel: string, raw: string): Promise<void> {
    if (!this.io) {
      this.logger.warn(`Received WS bridge msg but Socket.IO server not bound yet.`);
      return;
    }

    let msg: WsBridgeMessage;
    try {
      msg = JSON.parse(raw) as WsBridgeMessage;
    } catch (err) {
      this.logger.warn(`Could not parse WS bridge message on ${redisChannel}: ${(err as Error).message}`);
      return;
    }

    const socketIds = this.connectionManager.socketsForChannelInTenant(msg.channel, msg.tenantId);
    if (socketIds.length === 0) return; // nobody local cares

    const ns = this.io.of(`/${msg.ns}`);
    for (const socketId of socketIds) {
      const socket = ns.sockets.get(socketId) as Socket | undefined;
      if (!socket) continue;
      socket.emit(msg.ns, msg.envelope);
    }
  }
}
