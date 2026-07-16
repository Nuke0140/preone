/**
 * DashboardKpiGateway — `/ws/dashboard` namespace.
 *
 * Per API §17.1: branch-level KPI push. Center heads keep a dashboard open
 * all day; this gateway pushes live KPI updates (attendance %, fee collection
 * today, new admissions, etc.) every 5 minutes + on-demand when a domain
 * event happens.
 *
 * Channel scoping (per WsScopeResolver):
 *   branch:<branchId>     — branch KPIs (center head of branch)
 *   school:<schoolId>     — school-wide KPIs (admin only)
 *
 * Client → Server events:
 *   dashboard.subscribe.kpi  { kpi: 'attendance' | 'fees' | 'admissions' | 'all' }
 *   dashboard.refresh        { }
 *
 * Server → Client events:
 *   dashboard.kpi            { kpi, value, delta, asOf }
 *   dashboard.snapshot       { branchId, kpis: {...}, generatedAt }
 *
 * The gateway does NOT compute KPIs — it only relays client requests. KPI
 * computation happens in ReportsService (cross-domain aggregates) and is
 * pushed via the bridge.
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
  namespace: WsNamespace.DASHBOARD,
  path: '/ws/dashboard',
  cors: { origin: true, credentials: true },
})
export class DashboardKpiGateway
  extends WsBaseGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected readonly namespace = WsNamespace.DASHBOARD;
  protected readonly logger = new Logger(DashboardKpiGateway.name);

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
      case 'dashboard.refresh':
        await this.handleRefresh(socket, envelope);
        break;
      default:
        this.emitError(socket, 'EVENT_INVALID', `Unknown dashboard event: ${envelope.event}`, envelope.event);
    }
  }

  /**
   * Client requests a refresh — we echo a refresh request back through the
   * bridge so the ReportsService can pick it up and publish a snapshot.
   *
   * For v1 we just acknowledge; the ReportsService push is a Wave 16.1 follow-up.
   */
  private async handleRefresh(socket: Socket, envelope: WsMessageEnvelope): Promise<void> {
    const ctx = this.connectionManager.get(socket.id);
    if (!ctx) return;
    // Determine target channel — branch if user has one, else school.
    const targetChannel = ctx.user.branchId
      ? `branch:${ctx.user.branchId}`
      : `school:${ctx.user.tenantId}`;
    if (!ctx.subscriptions.has(targetChannel)) {
      this.emitError(socket, 'SCOPE_DENIED', `Not subscribed to ${targetChannel}`, envelope.event);
      return;
    }
    // For v1, we just echo back — ReportsService integration is a 16.1 task.
    const outMsg: WsMessageEnvelope = {
      event: 'dashboard.refresh.requested',
      payload: { requestedBy: ctx.user.id, channel: targetChannel },
      eventId: envelope.eventId,
      timestamp: new Date().toISOString(),
    };
    await this.bridge.publish(WsNamespace.DASHBOARD, ctx.user.tenantId, targetChannel, outMsg);
  }
}
