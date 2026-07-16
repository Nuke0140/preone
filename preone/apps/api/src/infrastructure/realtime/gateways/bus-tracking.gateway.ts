/**
 * BusTrackingGateway — `/ws/bus` namespace.
 *
 * Per API §17.1: live bus tracking. The bus (driver app) emits GPS pings;
 * parents and center heads subscribe to a trip channel and receive updates
 * in real time.
 *
 * Channel scoping (per WsScopeResolver):
 *   trip:<tripId>          — single trip's GPS trail + status updates
 *   branch:<branchId>      — all trips for a branch (admin)
 *
 * Client → Server events:
 *   bus.location.update    { tripId, lat, lng, heading, speed, at }
 *   bus.delay.report       { tripId, delayMinutes, reason }
 *   bus.skip.stop          { tripId, stopId, reason }
 *   bus.cancel             { tripId, reason }
 *
 * Server → Client events (broadcast by TransportService via WsPubSubBridge):
 *   bus.location.updated   { tripId, lat, lng, heading, speed, at }
 *   bus.delay.reported     { tripId, delayMinutes, reason, reportedBy }
 *   bus.stop.skipped       { tripId, stopId, reason, skippedBy }
 *   bus.cancelled          { tripId, reason, cancelledBy }
 *
 * Persistence: same pattern as other gateways — bridge publishes;
 * TransportService consumes and persists via TripAggregate.
 *
 * NOTE on rate limiting: bus.location.update is high-frequency (1 msg/sec
 * per bus). The gateway does not rate-limit at the connection level —
 * TransportService handles de-duplication + throttling. Future improvement
 * (Wave 16.1): enforce per-socket rate limit on this event.
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
  namespace: WsNamespace.BUS,
  path: '/ws/bus',
  cors: { origin: true, credentials: true },
})
export class BusTrackingGateway
  extends WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly namespace = WsNamespace.BUS;
  protected readonly logger = new Logger(BusTrackingGateway.name);

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
      case 'bus.location.update':
        await this.handleLocationUpdate(socket, envelope);
        break;
      case 'bus.delay.report':
        await this.handleDelayReport(socket, envelope);
        break;
      case 'bus.skip.stop':
        await this.handleSkipStop(socket, envelope);
        break;
      case 'bus.cancel':
        await this.handleCancel(socket, envelope);
        break;
      default:
        this.emitError(socket, 'EVENT_INVALID', `Unknown bus event: ${envelope.event}`, envelope.event);
    }
  }

  private async handleLocationUpdate(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as {
      tripId?: string;
      lat?: number;
      lng?: number;
      heading?: number;
      speed?: number;
      at?: string;
    };
    if (!payload.tripId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
      this.emitError(socket, 'PAYLOAD_INVALID', 'bus.location.update requires { tripId, lat, lng }', envelope.event);
      return;
    }
    const channel = `trip:${payload.tripId}`;
    if (!ctx.subscriptions.has(channel)) {
      this.emitError(socket, 'SCOPE_DENIED', `Not subscribed to ${channel}`, envelope.event);
      return;
    }
    const outMsg: WsMessageEnvelope = {
      event: 'bus.location.updated',
      payload: {
        tripId: payload.tripId,
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading,
        speed: payload.speed,
        at: payload.at ?? new Date().toISOString(),
        reportedBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.BUS, ctx.user.tenantId, channel, outMsg);
  }

  private async handleDelayReport(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { tripId?: string; delayMinutes?: number; reason?: string };
    if (!payload.tripId || typeof payload.delayMinutes !== 'number') return;
    const channel = `trip:${payload.tripId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'bus.delay.reported',
      payload: {
        tripId: payload.tripId,
        delayMinutes: payload.delayMinutes,
        reason: payload.reason ?? 'UNKNOWN',
        reportedBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.BUS, ctx.user.tenantId, channel, outMsg);
  }

  private async handleSkipStop(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { tripId?: string; stopId?: string; reason?: string };
    if (!payload.tripId || !payload.stopId) return;
    const channel = `trip:${payload.tripId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'bus.stop.skipped',
      payload: {
        tripId: payload.tripId,
        stopId: payload.stopId,
        reason: payload.reason ?? 'UNKNOWN',
        skippedBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.BUS, ctx.user.tenantId, channel, outMsg);
  }

  private async handleCancel(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    const payload = envelope.payload as { tripId?: string; reason?: string };
    if (!payload.tripId) return;
    const channel = `trip:${payload.tripId}`;
    if (!ctx.subscriptions.has(channel)) return;

    const outMsg: WsMessageEnvelope = {
      event: 'bus.cancelled',
      payload: {
        tripId: payload.tripId,
        reason: payload.reason ?? 'UNKNOWN',
        cancelledBy: ctx.user.id,
      },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.BUS, ctx.user.tenantId, channel, outMsg);
  }
}
