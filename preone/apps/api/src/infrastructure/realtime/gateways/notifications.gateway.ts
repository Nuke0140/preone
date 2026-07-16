/**
 * NotificationsGateway — `/ws/notifications` namespace.
 *
 * Per API §17.1: user-scoped notifications (in-app). Each user has a private
 * `user:<userId>` channel — only they can subscribe, and the NotificationsService
 * pushes to it via the bridge.
 *
 * Channel scoping (per WsScopeResolver):
 *   user:<userId>         — private user channel (self only)
 *   branch:<branchId>     — branch-wide announcements (admin pushes)
 *
 * Client → Server events:
 *   notification.ack      { notificationId }
 *   notification.dismiss  { notificationId }
 *
 * Server → Client events:
 *   notification.received { notificationId, type, title, body, severity, at }
 *   notification.updated  { notificationId, readAt? }
 *   notification.cleared  { notificationId }
 *
 * Per API §22 Notification Channels — this gateway handles ONLY the in-app
 * channel. SMS / WhatsApp / Email / Push are out-of-band (handled by the
 * NotificationsService via integration adapters).
 *
 * Priority routing (API §22.2): the gateway does not filter by priority —
 * it delivers whatever the NotificationsService publishes. Quiet-hours
 * enforcement happens in the NotificationsService before publish.
 */
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { WsBaseGateway } from '../gateway/ws-base-gateway';
import { WsJwtVerifier } from '../auth/ws-jwt-verifier';
import { WsConnectionManager } from '../gateway/ws-connection-manager';
import { WsSubscriptionManager } from '../subscription/ws-subscription-manager';
import { WsPubSubBridge } from '../bridge/ws-pubsub-bridge';
import { WsNamespace } from '../ws-connection-context';
import type { WsMessageEnvelope } from '../ws-message-envelope';

@WebSocketGateway({
  namespace: WsNamespace.NOTIFICATIONS,
  path: '/ws/notifications',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  extends WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly namespace = WsNamespace.NOTIFICATIONS;
  protected readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    jwtVerifier: WsJwtVerifier,
    connectionManager: WsConnectionManager,
    subscriptionManager: WsSubscriptionManager,
    bridge: WsPubSubBridge,
  ) {
    super(jwtVerifier, connectionManager, subscriptionManager, bridge);
  }

  protected async onDomainMessage(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;

    switch (envelope.event) {
      case 'notification.ack':
        await this.handleAck(socket, envelope);
        break;
      case 'notification.dismiss':
        await this.handleDismiss(socket, envelope);
        break;
      default:
        this.emitError(socket, 'EVENT_INVALID', `Unknown notification event: ${envelope.event}`, envelope.event);
    }
  }

  private async handleAck(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { notificationId?: string };
    if (!payload.notificationId) return;
    // The NotificationsService will update the DB and emit 'notification.updated'.
    // For v1 we just bounce the ack back to the user.
    const outMsg: WsMessageEnvelope = {
      event: 'notification.updated',
      payload: { notificationId: payload.notificationId, readAt: new Date().toISOString() },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.NOTIFICATIONS, ctx.user.tenantId, `user:${ctx.user.id}`, outMsg);
  }

  private async handleDismiss(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { notificationId?: string };
    if (!payload.notificationId) return;
    const outMsg: WsMessageEnvelope = {
      event: 'notification.cleared',
      payload: { notificationId: payload.notificationId },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.NOTIFICATIONS, ctx.user.tenantId, `user:${ctx.user.id}`, outMsg);
  }
}
