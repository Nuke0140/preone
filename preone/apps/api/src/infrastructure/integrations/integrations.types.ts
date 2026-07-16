/**
 * Common types for external integration adapters (Wave 17).
 *
 * Every adapter (SMS, WhatsApp, Email, Payment, Biometric, AI/LLM, Cloud
 * Storage, KYC) implements the `ExternalProvider` interface so the
 * IntegrationsModule can wire them uniformly:
 *
 *   - Each provider declares a unique `name` (used as the circuit name).
 *   - Each provider is registered with the CircuitBreakerService.
 *   - Each provider exposes typed methods (sendSMS, sendEmail, etc.) that
 *     internally call `circuitBreaker.exec(name, () => ...)`.
 *
 * The `DeliveryResult` shape is shared across all async-delivery providers
 * (SMS, WhatsApp, Email, Push). Synchronous providers (Payment, Biometric,
 * AI/LLM, Cloud Storage, KYC) return their own typed results but the
 * `ProviderInvocationResult` base type captures the common
 * `providerName + ok + providerMessageId? + error?` fields.
 */

export interface ExternalProvider {
  /** Unique provider name — used as the circuit-breaker key. */
  readonly name: string;
}

/**
 * Result of a delivery-style call (SMS/WhatsApp/Email/Push).
 * `ok=true` means the provider accepted the request and returned a
 * message ID we can use to track delivery via webhook.
 */
export interface DeliveryResult {
  ok: boolean;
  /** Provider-returned message ID — used to match delivery webhooks. */
  providerMessageId?: string;
  /** Error message if !ok. */
  error?: string;
  /** Raw provider response (for debugging + audit). */
  raw?: unknown;
}

/**
 * Health-check result — every provider exposes a `checkHealth()` method
 * for use by the /health/integrations endpoint.
 */
export interface ProviderHealthResult {
  name: string;
  healthy: boolean;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | 'UNREGISTERED';
  latencyMs?: number;
  lastError?: string;
}
