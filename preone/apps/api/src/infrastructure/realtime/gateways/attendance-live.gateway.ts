/**
 * AttendanceLiveGateway — `/ws/attendance` namespace.
 *
 * Per API §17.1: live attendance updates per class/section. Per BTD §4.3 #6:
 * attendance is marked by teachers in real-time; this gateway pushes updates
 * to anyone watching the class (center head, parent of absent child).
 *
 * Channel scoping (per WsScopeResolver):
 *   class:<classId>      — all section events for this class
 *   room:<roomId>        — narrower: a single section
 *
 * Client → Server events:
 *   attendance.mark      { classId, studentId, status, markedAt }
 *   attendance.undo      { classId, studentId }
 *   attendance.note      { classId, studentId, note }
 *
 * Server → Client events (broadcast by AttendanceService via WsPubSubBridge):
 *   attendance.marked    { classId, studentId, status, markedAt, markedBy }
 *   attendance.undone    { classId, studentId, undoneBy }
 *   attendance.summary   { classId, present, absent, late, total }
 *
 * Persistence: same as chat — the gateway validates the envelope and publishes
 * to the bridge. The AttendanceService listens on the bridge (or on the in-process
 * EventBus) and persists via the AttendanceAggregate. This keeps the gateway
 * non-transactional and lets the service own DB writes.
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
  namespace: WsNamespace.ATTENDANCE,
  path: '/ws/attendance',
  cors: { origin: true, credentials: true },
})
export class AttendanceLiveGateway
  extends WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly namespace = WsNamespace.ATTENDANCE;
  protected readonly logger = new Logger(AttendanceLiveGateway.name);

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
      case 'attendance.mark':
        await this.handleMark(socket, envelope);
        break;
      case 'attendance.undo':
        await this.handleUndo(socket, envelope);
        break;
      case 'attendance.note':
        await this.handleNote(socket, envelope);
        break;
      default:
        this.emitError(socket, 'EVENT_INVALID', `Unknown attendance event: ${envelope.event}`, envelope.event);
    }
  }

  private async handleMark(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { classId?: string; studentId?: string; status?: string; markedAt?: string };
    if (!payload.classId || !payload.studentId || !payload.status) {
      this.emitError(socket, 'PAYLOAD_INVALID', 'attendance.mark requires { classId, studentId, status }', envelope.event);
      return;
    }
    const channel = `class:${payload.classId}`;
    if (!ctx.subscriptions.has(channel)) {
      this.emitError(socket, 'SCOPE_DENIED', `Not subscribed to ${channel}`, envelope.event);
      return;
    }

    const outMsg: WsMessageEnvelope = {
      event: 'attendance.marked',
      payload: {
        classId: payload.classId,
        studentId: payload.studentId,
        status: payload.status,
        markedAt: payload.markedAt ?? new Date().toISOString(),
        markedBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.ATTENDANCE, ctx.user.tenantId, channel, outMsg);
  }

  private async handleUndo(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { classId?: string; studentId?: string };
    if (!payload.classId || !payload.studentId) return;
    const channel = `class:${payload.classId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'attendance.undone',
      payload: { classId: payload.classId, studentId: payload.studentId, undoneBy: ctx.user.id },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.ATTENDANCE, ctx.user.tenantId, channel, outMsg);
  }

  private async handleNote(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { classId?: string; studentId?: string; note?: string };
    if (!payload.classId || !payload.studentId || !payload.note) return;
    const channel = `class:${payload.classId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'attendance.note.added',
      payload: {
        classId: payload.classId,
        studentId: payload.studentId,
        note: payload.note,
        noteBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.ATTENDANCE, ctx.user.tenantId, channel, outMsg);
  }
}
