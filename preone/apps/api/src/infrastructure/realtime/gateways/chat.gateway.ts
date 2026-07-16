/**
 * ChatGateway — `/ws/chat` namespace.
 *
 * Per API §17.1: real-time chat between parents and teachers (1:1 + group
 * rooms). Per BTD §4.3 #7: chat messages are persisted by the Communication
 * module's ConversationAggregate; this gateway is only the transport.
 *
 * Channel scoping (per WsScopeResolver):
 *   room:<roomId>   — 1:1 or group conversation room
 *
 * Client → Server events:
 *   chat.message.send      { roomId, text, clientId }
 *   chat.typing.start      { roomId }
 *   chat.typing.stop       { roomId }
 *   chat.message.read      { roomId, messageId }
 *
 * Server → Client events (broadcast by ChatService via WsPubSubBridge):
 *   chat.message.sent      { roomId, messageId, senderId, text, at }
 *   chat.message.delivered { roomId, messageId, deliveredTo[] }
 *   chat.message.read      { roomId, messageId, readBy[] }
 *   chat.typing            { roomId, userId, isTyping }
 *
 * Persistence: ChatGateway does NOT write to the database. It validates the
 * envelope, emits it to the ConversationService via EventBus, which writes
 * to the DB and then publishes back to the bridge for fan-out. This keeps
 * the gateway thin and the persistence transactional.
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
  namespace: WsNamespace.CHAT,
  path: '/ws/chat',
  cors: { origin: true, credentials: true },
})
export class ChatGateway
  extends WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly namespace = WsNamespace.CHAT;
  protected readonly logger = new Logger(ChatGateway.name);

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
      case 'chat.message.send':
        await this.handleMessageSend(socket, envelope);
        break;
      case 'chat.typing.start':
      case 'chat.typing.stop':
        await this.handleTyping(socket, envelope);
        break;
      case 'chat.message.read':
        await this.handleMessageRead(socket, envelope);
        break;
      default:
        this.emitError(socket, 'EVENT_INVALID', `Unknown chat event: ${envelope.event}`, envelope.event);
    }
  }

  private async handleMessageSend(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { roomId?: string; text?: string; clientId?: string };
    if (!payload.roomId || !payload.text) {
      this.emitError(socket, 'PAYLOAD_INVALID', 'chat.message.send requires { roomId, text }', envelope.event);
      return;
    }
    // Scope check: socket must be subscribed to room:<roomId> before sending.
    const channel = `room:${payload.roomId}`;
    if (!ctx.subscriptions.has(channel)) {
      this.emitError(socket, 'SCOPE_DENIED', `Not subscribed to ${channel}`, envelope.event);
      return;
    }
    // For v1, echo back to the room directly via the bridge. The
    // ConversationService integration is a Wave 16.1 follow-up that
    // persists the message to the DB and re-emits via the bridge.
    const outMsg: WsMessageEnvelope = {
      event: 'chat.message.sent',
      payload: {
        roomId: payload.roomId,
        messageId: envelope.eventId, // for v1; ConversationService will mint its own in 16.1
        senderId: ctx.user.id,
        text: payload.text,
        at: new Date().toISOString(),
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.CHAT, ctx.user.tenantId, channel, outMsg);
  }

  private async handleTyping(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { roomId?: string };
    if (!payload.roomId) return;
    const channel = `room:${payload.roomId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const isTyping = envelope.event === 'chat.typing.start';
    const outMsg: WsMessageEnvelope = {
      event: 'chat.typing',
      payload: { roomId: payload.roomId, userId: ctx.user.id, isTyping },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.CHAT, ctx.user.tenantId, channel, outMsg);
  }

  private async handleMessageRead(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { roomId?: string; messageId?: string };
    if (!payload.roomId || !payload.messageId) return;
    const channel = `room:${payload.roomId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'chat.message.read',
      payload: { roomId: payload.roomId, messageId: payload.messageId, readBy: ctx.user.id },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.CHAT, ctx.user.tenantId, channel, outMsg);
  }
}
