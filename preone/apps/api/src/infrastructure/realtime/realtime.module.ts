/**
 * RealtimeModule — wires WebSocket infrastructure (gateways + auth +
 * connection manager + subscription manager + Redis pub/sub bridge).
 *
 * Per API Contract Catalog §17 — 5 WebSocket channels:
 *   /ws/chat            — 1:1 + group chat
 *   /ws/attendance      — live class attendance updates
 *   /ws/notifications   — user-scoped notifications
 *   /ws/dashboard       — branch KPI push
 *   /ws/bus             — bus trip GPS tracking
 *
 * Each gateway is a thin subclass of WsBaseGateway. They are registered
 * here so they all share the same ConnectionManager, SubscriptionManager,
 * ScopeResolver, and PubSubBridge singletons.
 *
 * The Socket.IO server itself is created by @nestjs/platform-socket.io's
 * WebSocketGateway adapter (auto-injected by NestJS). The first gateway to
 * initialize creates the server; subsequent gateways attach as namespaces.
 *
 * Multi-instance scaling: WsPubSubBridge subscribes to Redis pub/sub on
 * init so messages from other API replicas are delivered to local sockets.
 */
import { Global, Module, OnModuleInit, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

import { RedisModule } from '../redis/redis.module';

import { WsJwtVerifier } from './auth/ws-jwt-verifier';
import { WsPubSubBridge } from './bridge/ws-pubsub-bridge';
import { WsConnectionManager } from './gateway/ws-connection-manager';
import { WsBaseGateway } from './gateway/ws-base-gateway';
import { WsScopeResolver } from './subscription/ws-scope-resolver';
import { WsSubscriptionManager } from './subscription/ws-subscription-manager';

import { ChatGateway } from './gateways/chat.gateway';
import { AttendanceLiveGateway } from './gateways/attendance-live.gateway';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { DashboardKpiGateway } from './gateways/dashboard-kpi.gateway';
import { BusTrackingGateway } from './gateways/bus-tracking.gateway';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    WsJwtVerifier,
    WsConnectionManager,
    WsScopeResolver,
    WsSubscriptionManager,
    WsPubSubBridge,
    // 5 gateways — NestJS instantiates them and attaches to the Socket.IO server.
    ChatGateway,
    AttendanceLiveGateway,
    NotificationsGateway,
    DashboardKpiGateway,
    BusTrackingGateway,
  ],
  exports: [
    WsJwtVerifier,
    WsConnectionManager,
    WsScopeResolver,
    WsSubscriptionManager,
    WsPubSubBridge,
  ],
})
export class RealtimeModule implements OnModuleInit {
  private readonly logger = new Logger(RealtimeModule.name);

  constructor(
    private readonly subscriptionManager: WsSubscriptionManager,
    private readonly bridge: WsPubSubBridge,
    // Gateways are injected so NestJS instantiates them eagerly.
    private readonly _chat: ChatGateway,
    private readonly _attendance: AttendanceLiveGateway,
    private readonly _notifications: NotificationsGateway,
    private readonly _dashboard: DashboardKpiGateway,
    private readonly _bus: BusTrackingGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    // The first gateway's onGatewayInit() runs during bootstrap; we cannot
    // reliably call setServer() from here without a server handle. Instead,
    // each gateway's onGatewayInit() calls subscriptionManager.setServer()
    // and bridge.setServer(). To avoid race conditions, we also expose a
    // public setter the gateways can use. See ws-base-gateway.ts.
    this.logger.log('RealtimeModule initialized — 5 WS gateways registered.');
  }
}
