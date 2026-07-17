/**
 * RealtimeEventPublisher — service-layer façade over WsPubSubBridge.
 *
 * Wave 16.1 introduces this thin wrapper so domain services (Communication,
 * Attendance, Transport, Administration, Platform) do NOT depend directly
 * on the WS bridge — they depend on this small, well-typed interface.
 *
 * Benefits:
 *   1. Services don't import WsPubSubBridge (which would couple them to
 *      Socket.IO + Redis internals).
 *   2. The publisher generates the WsMessageEnvelope (eventId + timestamp)
 *      so services just pass the event name + payload.
 *   3. The publisher validates the channel format and silently drops
 *      invalid channels (defensive — a service bug should never crash
 *      the WS pipeline).
 *   4. The publisher is the natural place to add per-namespace rate
 *      limiting or payload-size caps in Wave 16.2.
 *
 * Usage from a service:
 *
 *   constructor(
 *     private readonly realtime: RealtimeEventPublisher,
 *   ) {}
 *
 *   async sendMessage(...) {
 *     ...
 *     await this.realtime.publish(
 *       'chat',                                  // namespace
 *       tenantId,
 *       `room:${conversationId}`,                // channel
 *       'chat.message.sent',                     // event name
 *       { messageId, conversationId, body, senderId },
 *     );
 *   }
 *
 * The envelope (eventId, timestamp) is generated here — services do not
 * need to know about the wire format.
 */
import { Injectable, Logger } from '@nestjs/common';

import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import { parseChannel } from '../ws-message-envelope';
import type { WsNamespace } from '../ws-connection-context';

import { randomUUID } from 'node:crypto';

@Injectable()
export class RealtimeEventPublisher {
  private readonly logger = new Logger(RealtimeEventPublisher.name);

  constructor(private readonly bridge: WsPubSubBridge) {}

  /**
   * Publish a real-time event to all subscribers of `channel` in `tenantId`.
   *
   * @param ns        WS namespace ('chat' | 'attendance' | 'notifications' | 'dashboard' | 'bus')
   * @param tenantId  Tenant scope — receiving instances skip sockets in other tenants.
   * @param channel   Socket.IO room name (e.g., "room:01HROOM", "class:01HCL", "user:01HUSER").
   * @param eventName Dotted lowercase event name (e.g., "chat.message.sent", "attendance.marked").
   * @param payload   Event-specific JSON-serializable payload.
   */
  async publish<T>(
    ns: WsNamespace,
    tenantId: string,
    channel: string,
    eventName: string,
    payload: T,
  ): Promise<void> {
    // Defensive: validate channel format. A malformed channel would still
    // be JSON-serialized and published, but no socket would be subscribed
    // to it — so we'd waste a Redis round-trip. Drop it early instead.
    const parsed = parseChannel(channel);
    if (!parsed) {
      this.logger.warn(
        `Dropping realtime event "${eventName}" — invalid channel "${channel}"`,
      );
      return;
    }

    // Defensive: payload must be JSON-serializable. If not, log + drop.
    let serialized: string;
    try {
      serialized = JSON.stringify(payload);
    } catch (err) {
      this.logger.error(
        `Dropping realtime event "${eventName}" — payload not JSON-serializable: ${(err as Error).message}`,
      );
      return;
    }

    await this.bridge.publish(ns, tenantId, channel, {
      event: eventName,
      payload: JSON.parse(serialized) as T,
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Publish to a user's private channel — sugar over publish() with
   * channel = `user:<userId>`. Used for notifications + dashboard pushes
   * that target a single user.
   */
  async publishToUser<T>(
    ns: WsNamespace,
    tenantId: string,
    userId: string,
    eventName: string,
    payload: T,
  ): Promise<void> {
    await this.publish(ns, tenantId, `user:${userId}`, eventName, payload);
  }

  /**
   * Publish to a branch-wide channel — sugar over publish() with
   * channel = `branch:<branchId>`. Used for dashboard KPI pushes.
   */
  async publishToBranch<T>(
    ns: WsNamespace,
    tenantId: string,
    branchId: string,
    eventName: string,
    payload: T,
  ): Promise<void> {
    await this.publish(ns, tenantId, `branch:${branchId}`, eventName, payload);
  }
}
