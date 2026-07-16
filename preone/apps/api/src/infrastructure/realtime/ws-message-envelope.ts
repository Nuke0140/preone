/**
 * WS Message Envelope — standard structure for every WebSocket message
 * exchanged between server and client (per API Contract Catalog §17.3).
 *
 * Envelope:
 *   {
 *     "event":     "attendance.marked",        // dotted event name
 *     "payload":   { ...event-specific data }, // 任意 JSON
 *     "eventId":   "01J0...",                  // UUID v7 — for dedup
 *     "timestamp": "2026-07-17T12:34:56.789Z"  // ISO 8601 UTC
 *   }
 *
 * Rules (API §17.3):
 *   - Every event MUST carry an eventId. Consumers MUST dedupe by eventId.
 *   - At-least-once delivery; subscribers MUST be idempotent.
 *   - All timestamps are UTC ISO 8601 with milliseconds.
 *   - Event names use dotted lowercase (e.g., "chat.message", "attendance.marked").
 *
 * The envelope is what flows over the wire AND what flows through the Redis
 * pub/sub bridge — same shape end-to-end so a gateway does not need to know
 * whether a message originated locally or from another instance.
 */
export interface WsMessageEnvelope<T = unknown> {
  /** Dotted lowercase event name, e.g., "chat.message.sent". */
  event: string;
  /** Event-specific payload. */
  payload: T;
  /** UUID v7 for idempotent processing. */
  eventId: string;
  /** ISO 8601 UTC timestamp with milliseconds. */
  timestamp: string;
}

/**
 * Subscription request — sent by the client to subscribe to a channel.
 *
 * Pattern: { event: "subscribe", channel: "room:01HROOM" }
 *
 * Channel format (API §17.5):
 *   room:<roomId>      — chat room (1:1 or group)
 *   class:<classId>    — class-level attendance / live updates
 *   branch:<branchId>  — branch-level dashboard KPIs
 *   user:<userId>      — user-level notifications (private channel)
 *   trip:<tripId>      — bus trip GPS tracking
 *   school:<schoolId>  — school-wide broadcasts (admins only)
 */
export interface WsSubscribeRequest {
  event: 'subscribe';
  channel: string;
}

export interface WsUnsubscribeRequest {
  event: 'unsubscribe';
  channel: string;
}

/** Server → client ack after a successful subscription. */
export interface WsSubscribeAck {
  event: 'subscribed';
  channel: string;
  at: string;
}

export interface WsUnsubscribeAck {
  event: 'unsubscribed';
  channel: string;
  at: string;
}

/** Server → client error envelope for malformed / unauthorized requests. */
export interface WsErrorEnvelope {
  event: 'error';
  code: WsErrorCode;
  message: string;
  /** Original event name that triggered the error, if applicable. */
  originalEvent?: string;
}

export type WsErrorCode =
  | 'AUTH_REQUIRED'        // No / invalid token at connection time
  | 'AUTH_EXPIRED'         // Token expired
  | 'SCOPE_DENIED'         // User cannot subscribe to this channel
  | 'CHANNEL_INVALID'      // Channel name does not match any known pattern
  | 'EVENT_INVALID'        // Unknown event name
  | 'PAYLOAD_INVALID'      // Failed payload validation
  | 'RATE_LIMITED'         // Too many messages in window
  | 'INTERNAL_ERROR';      // Unexpected server error

/** Initial "connected" event sent right after JWT validation succeeds. */
export interface WsConnectedEvent {
  event: 'connected';
  sessionId: string;
  user: {
    id: string;
    tenantId: string;
    branchId?: string;
    roles: string[];
  };
  at: string;
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
}

/** Heartbeat messages — client ping, server pong. */
export interface WsPingMessage {
  event: 'ping';
  at: string;
}
export interface WsPongMessage {
  event: 'pong';
  at: string;
  serverTime: string;
}

/** Union of all server → client control events. */
export type WsServerControlEvent =
  | WsConnectedEvent
  | WsSubscribeAck
  | WsUnsubscribeAck
  | WsErrorEnvelope
  | WsPongMessage;

/** Union of all client → server control events. */
export type WsClientControlEvent =
  | WsSubscribeRequest
  | WsUnsubscribeRequest
  | WsPingMessage;

/** Channel-prefix taxonomy used by the scope resolver. */
export const CHANNEL_PREFIX = {
  ROOM: 'room:',
  CLASS: 'class:',
  BRANCH: 'branch:',
  USER: 'user:',
  TRIP: 'trip:',
  SCHOOL: 'school:',
} as const;

export type ChannelPrefix = (typeof CHANNEL_PREFIX)[keyof typeof CHANNEL_PREFIX];

/** Parse a channel string into { prefix, id } — returns undefined if malformed. */
export function parseChannel(channel: string): { prefix: ChannelPrefix; id: string } | undefined {
  for (const p of Object.values(CHANNEL_PREFIX)) {
    if (channel.startsWith(p)) {
      const id = channel.slice(p.length);
      if (id.length === 0) return undefined;
      return { prefix: p, id };
    }
  }
  return undefined;
}
