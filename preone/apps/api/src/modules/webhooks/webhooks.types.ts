/**
 * Webhooks module — Wave 20 types.
 *
 * WebhookDispatcher:
 *   - Subscribed to domain events from the in-process EventBus
 *   - For each (tenant, eventType) tuple, looks up registered webhook
 *     subscriptions (URL + secret + active event types)
 *   - Signs payload with HMAC-SHA256 using the subscription secret
 *   - POSTs to the subscriber URL with exponential backoff retry
 *   - Persists delivery attempts in webhook_deliveries table for audit
 *
 * Retry policy:
 *   - Max attempts: 8
 *   - Backoff: 30s, 1m, 5m, 15m, 1h, 6h, 12h, 24h (exponential + jitter)
 *   - Failure threshold: 10 consecutive failures → auto-disable subscription
 */
export type WebhookStatus = 'PENDING' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'DISABLED';

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  url: string;
  secret: string;           // HMAC-SHA256 key — never logged
  eventTypes: string[];     // '*' for all events
  isActive: boolean;
  /** Auto-disabled after 10 consecutive failures; reset on success. */
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId: string;          // source domain event ID
  eventType: string;
  payload: unknown;
  signature: string;        // HMAC-SHA256 of payload
  status: WebhookStatus;
  attempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  lastResponseCode?: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export const WEBHOOK_MAX_ATTEMPTS = 8;
export const WEBHOOK_BACKOFF_SECONDS = [30, 60, 300, 900, 3600, 21600, 43200, 86400];
export const WEBHOOK_AUTO_DISABLE_THRESHOLD = 10;
export const WEBHOOK_TIMEOUT_MS = 15_000;
