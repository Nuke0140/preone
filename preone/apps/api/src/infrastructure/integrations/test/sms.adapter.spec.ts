/**
 * Unit tests for SmsAdapter (Wave 17).
 *
 * Representative test for the 8 integration adapters — they all share
 * the same shape (circuit-breaker wrapping + provider injection + health
 * check), so this test covers the SmsAdapter as a proxy. The other 7
 * adapters are exercised in their respective bounded-context tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CircuitBreakerService } from '../circuit-breaker.service';
import { SmsAdapter, StubSmsProvider, type SmsProviderPort, type SmsConfig } from '../sms.adapter';
import type { DeliveryResult } from '../integrations.types';

describe('SmsAdapter', () => {
  let circuit: CircuitBreakerService;
  let provider: SmsProviderPort;
  let config: SmsConfig;
  let adapter: SmsAdapter;

  beforeEach(() => {
    circuit = new CircuitBreakerService();
    provider = new StubSmsProvider();
    config = { from: '+910000000000', apiKey: 'k', apiSecret: 's', senderId: 'PREONE' };
    adapter = new SmsAdapter(circuit, provider, config);
  });

  it('should register its circuit on construction', () => {
    // State is CLOSED initially (registered). An unregistered circuit
    // would return undefined.
    expect(circuit.getState('sms')).toBe('CLOSED');
  });

  it('should send an SMS via the stub provider and return a providerMessageId', async () => {
    const result = await adapter.send({
      to: '+919876543210',
      body: 'Your OTP is 123456',
      templateId: 'DLT-TPL-001',
    });
    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toMatch(/^stub-sms-\d+-/);
  });

  it('should return ok=false (not throw) when the provider throws', async () => {
    const failingProvider: SmsProviderPort = {
      name: 'failing',
      send: vi.fn(async () => { throw new Error('provider down'); }),
      checkHealth: vi.fn(async () => true),
    };
    const failingAdapter = new SmsAdapter(circuit, failingProvider, config);
    const result = await failingAdapter.send({
      to: '+919876543210',
      body: 'hi',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('provider down');
  });

  it('should fail fast (ok=false) when the circuit is OPEN', async () => {
    // Trip the circuit by exceeding the failure threshold.
    const failingProvider: SmsProviderPort = {
      name: 'failing',
      send: vi.fn(async () => { throw new Error('boom'); }),
      checkHealth: vi.fn(async () => true),
    };
    // Replace the adapter with one using the failing provider.
    const failingAdapter = new SmsAdapter(
      circuit,
      failingProvider,
      config,
    );
    // The adapter's circuit config is failureThreshold=5, so we need 5
    // failures to trip it. The adapter swallows the error and returns
    // ok=false, but the circuit still records the failure.
    for (let i = 0; i < 5; i++) {
      await failingAdapter.send({ to: '+919876543210', body: 'hi' });
    }
    expect(circuit.getState('sms')).toBe('OPEN');

    // Now even a successful provider would fail fast.
    const goodProvider: SmsProviderPort = {
      name: 'good',
      send: vi.fn(async () => ({ ok: true, providerMessageId: 'msg-1' })),
      checkHealth: vi.fn(async () => true),
    };
    const goodAdapter = new SmsAdapter(circuit, goodProvider, config);
    const result = await goodAdapter.send({ to: '+919876543210', body: 'hi' });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/OPEN|Circuit/);
    expect(goodProvider.send).not.toHaveBeenCalled();
  });

  describe('checkHealth', () => {
    it('should return a healthy result when the provider reports healthy', async () => {
      const result = await adapter.checkHealth();
      expect(result.name).toBe('sms');
      expect(result.healthy).toBe(true);
      expect(result.circuitState).toBe('CLOSED');
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should return healthy=false when the provider throws', async () => {
      const failingProvider: SmsProviderPort = {
        name: 'failing',
        send: vi.fn(async () => ({ ok: true } as DeliveryResult)),
        checkHealth: vi.fn(async () => { throw new Error('health check failed'); }),
      };
      const failingAdapter = new SmsAdapter(circuit, failingProvider, config);
      const result = await failingAdapter.checkHealth();
      expect(result.healthy).toBe(false);
      expect(result.lastError).toContain('health check failed');
    });
  });
});
