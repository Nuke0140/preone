/**
 * WsAuthenticatedUser — minimal user context attached to every WS connection
 * after JWT validation. Subset of the HTTP `AuthenticatedUser` shape — we
 * intentionally drop iat/exp because WS connections have their own lifecycle
 * (heartbeat timeout), and drop sessionId because WS sessions are tracked
 * separately by the ConnectionManager.
 */
export interface WsAuthenticatedUser {
  id: string;
  tenantId: string;
  branchId?: string;
  academicYearId?: string;
  email: string;
  phone?: string;
  roles: string[];
  permissionsVersion: number;
  sessionId: string;
}

/**
 * WsConnectionContext — full context for a single WS connection.
 *
 * Stored in the ConnectionManager keyed by socket.id. Used by:
 *   - SubscriptionManager to look up user when validating channel scopes
 *   - Redis bridge to fan out messages to the right sockets
 *   - Heartbeat watcher to detect dead connections
 */
export interface WsConnectionContext {
  /** Socket.io socket id — unique per connection. */
  socketId: string;
  /** Authenticated user attached after JWT verification. */
  user: WsAuthenticatedUser;
  /** Which gateway namespace this connection belongs to. */
  namespace: WsNamespace;
  /** Channels this socket is currently subscribed to. */
  subscriptions: Set<string>;
  /** Connection timestamp (ISO 8601 UTC). */
  connectedAt: string;
  /** Last pong received from client (ISO 8601 UTC). */
  lastPongAt: string;
  /** Heartbeat interval handle (so we can clear it on disconnect). */
  heartbeatTimer?: NodeJS.Timeout;
  /** Heartbeat timeout handle — if pong does not arrive, force disconnect. */
  heartbeatTimeoutTimer?: NodeJS.Timeout;
}

/**
 * WsNamespace — the 5 WebSocket channels declared in API §17.1.
 * Each namespace is served by a dedicated Gateway and uses a dedicated
 * Redis pub/sub channel so messages do not leak across namespaces.
 */
export const WsNamespace = {
  CHAT: 'chat',
  ATTENDANCE: 'attendance',
  NOTIFICATIONS: 'notifications',
  DASHBOARD: 'dashboard',
  BUS: 'bus',
} as const;

export type WsNamespace = (typeof WsNamespace)[keyof typeof WsNamespace];

export const ALL_WS_NAMESPACES: readonly WsNamespace[] = Object.values(WsNamespace);

/** Per-namespace Redis pub/sub channel name. */
export function nsPubSubChannel(ns: WsNamespace): string {
  return `preone:ws:${ns}`;
}
