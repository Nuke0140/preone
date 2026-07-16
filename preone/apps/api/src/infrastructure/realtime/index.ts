/**
 * Barrel exports for the realtime infrastructure module.
 */
export { RealtimeModule } from './realtime.module';
export { WsJwtVerifier } from './auth/ws-jwt-verifier';
export { WsPubSubBridge, type WsBridgeMessage } from './bridge/ws-pubsub-bridge';
export { WsConnectionManager } from './gateway/ws-connection-manager';
export { WsBaseGateway, HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS } from './gateway/ws-base-gateway';
export { WsScopeResolver, type ScopeResolution } from './subscription/ws-scope-resolver';
export { WsSubscriptionManager } from './subscription/ws-subscription-manager';

export { ChatGateway } from './gateways/chat.gateway';
export { AttendanceLiveGateway } from './gateways/attendance-live.gateway';
export { NotificationsGateway } from './gateways/notifications.gateway';
export { DashboardKpiGateway } from './gateways/dashboard-kpi.gateway';
export { BusTrackingGateway } from './gateways/bus-tracking.gateway';

export {
  WsNamespace,
  ALL_WS_NAMESPACES,
  nsPubSubChannel,
  type WsConnectionContext,
  type WsAuthenticatedUser,
} from './ws-connection-context';

export {
  CHANNEL_PREFIX,
  parseChannel,
  type WsMessageEnvelope,
  type WsSubscribeRequest,
  type WsUnsubscribeRequest,
  type WsSubscribeAck,
  type WsUnsubscribeAck,
  type WsErrorEnvelope,
  type WsErrorCode,
  type WsConnectedEvent,
  type WsPingMessage,
  type WsPongMessage,
  type WsServerControlEvent,
  type WsClientControlEvent,
  type ChannelPrefix,
} from './ws-message-envelope';
