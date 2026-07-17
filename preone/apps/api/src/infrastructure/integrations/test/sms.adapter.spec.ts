/**
 * Unit tests for SmsAdapter (Wave 17 + Wave 17.1).
 *
 * Wave 17:
 *   - Circuit-breaker wrapping
 *   - Pluggable provider injection
 *   - Health check
 *
 * Wave 17.1 (additional tests at the bottom):
 *   - Tenant-aware provider resolution
 *   - Feature-flag disabled → fall back to stub
 *   - Tenant DB config override → use tenant's preferred provider
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CircuitBreakerService } from '../circuit-breaker.service';
import { SmsAdapter, StubSmsProvider, type SmsProviderPort, type SmsConfig } from '../sms.adapter';
import type { DeliveryResult } from '../integrations.types';
import { IntegrationFeatureFlagService } from '../integration-feature-flag.service';
import { TenantIntegrationConfigService } from '../tenant-integration-config.service';

/** Build a SmsAdapter with all 5 constructor args (Wave 17.1 shape). */
function buildAdapter(
  circuit: CircuitBreakerService,
  provider: SmsProviderPort,
  config: SmsConfig,
  registry: Map<string, SmsProviderPort> = new Map([['stub', provider]]),
  flagService?: IntegrationFeatureFlagService,
  tenantConfig?: TenantIntegrationConfigService,
): SmsAdapter {
  const fs = flagService ?? {
    resolve: vi.fn().mockResolvedValue({ integration: 'sms', resolution: 'auto', source: 'DEFAULT' }),
    isEnabled: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn(),
  } as unknown as IntegrationFeatureFlagService;
  const tc = tenantConfig ?? {
    resolve: vi.fn().mockResolvedValue({
      tenantId: 't1', integration: 'sms',
      providerName: 'stub', source: 'ENV_DEFAULT',
    }),
    invalidate: vi.fn(),
  } as unknown as TenantIntegrationConfigService;
  return new SmsAdapter(circuit, fs, tc, provider, config, registry);
}

describe('SmsAdapter', () => {
  let circuit: CircuitBreakerService;
  let provider: SmsProviderPort;
  let config: SmsConfig;
  let adapter: SmsAdapter;

  beforeEach(() => {
    circuit = new CircuitBreakerService();
    provider = new StubSmsProvider();
    config = { from: '+910000000000', apiKey: 'k', apiSecret: 's', senderId: 'PREONE' };
    adapter = buildAdapter(circuit, provider, config);
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
    const failingAdapter = buildAdapter(circuit, failingProvider, config);
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
    const failingAdapter = buildAdapter(circuit, failingProvider, config);
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
    const goodAdapter = buildAdapter(circuit, goodProvider, config);
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
      const failingAdapter = buildAdapter(circuit, failingProvider, config);
      const result = await failingAdapter.checkHealth();
      expect(result.healthy).toBe(false);
      expect(result.lastError).toContain('health check failed');
    });
  });

  // ─── Wave 17.1 — tenant-aware provider resolution ─────────────

  describe('Wave 17.1 — tenant-aware provider resolution', () => {
    it('should use the global default provider when no tenantCtx is provided', async () => {
      const stubProvider = new StubSmsProvider();
      const sendSpy = vi.spyOn(stubProvider, 'send');
      const adapter = buildAdapter(circuit, stubProvider, config);
      await adapter.send({ to: '+919876543210', body: 'hi' });
      expect(sendSpy).toHaveBeenCalledTimes(1);
    });

    it('should fall back to stub when feature flag is disabled for tenant', async () => {
      const stubProvider = new StubSmsProvider();
      const stubSpy = vi.spyOn(stubProvider, 'send');
      const twilioProvider: SmsProviderPort = {
        name: 'twilio',
        send: vi.fn(async () => ({ ok: true, providerMessageId: 'tw-1' })),
        checkHealth: vi.fn(async () => true),
      };
      const registry = new Map<string, SmsProviderPort>([
        ['stub', stubProvider],
        ['twilio', twilioProvider],
      ]);
      const flagService = {
        resolve: vi.fn().mockResolvedValue({ integration: 'sms', resolution: 'disabled', source: 'TENANT' }),
        isEnabled: vi.fn().mockResolvedValue(false),
        invalidate: vi.fn(),
      } as unknown as IntegrationFeatureFlagService;
      const tenantConfig = {
        resolve: vi.fn().mockResolvedValue({
          tenantId: 't1', integration: 'sms',
          providerName: 'twilio', source: 'TENANT_DB',
          apiKey: 'tw-key', apiSecret: 'tw-secret',
        }),
        invalidate: vi.fn(),
      } as unknown as TenantIntegrationConfigService;

      const adapter = buildAdapter(circuit, stubProvider, config, registry, flagService, tenantConfig);
      const result = await adapter.send(
        { to: '+919876543210', body: 'hi' },
        { tenantId: 't1' },
      );

      expect(flagService.resolve).toHaveBeenCalledWith('sms', 't1', undefined);
      // Stub must be called (not twilio) because flag=disabled.
      expect(stubSpy).toHaveBeenCalledTimes(1);
      expect(twilioProvider.send).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
    });

    it('should use the tenant-configured real provider when flag is enabled', async () => {
      const stubProvider = new StubSmsProvider();
      const twilioProvider: SmsProviderPort = {
        name: 'twilio',
        send: vi.fn(async () => ({ ok: true, providerMessageId: 'tw-1' })),
        checkHealth: vi.fn(async () => true),
      };
      const registry = new Map<string, SmsProviderPort>([
        ['stub', stubProvider],
        ['twilio', twilioProvider],
      ]);
      const flagService = {
        resolve: vi.fn().mockResolvedValue({ integration: 'sms', resolution: 'enabled', source: 'TENANT' }),
        isEnabled: vi.fn().mockResolvedValue(true),
        invalidate: vi.fn(),
      } as unknown as IntegrationFeatureFlagService;
      const tenantConfig = {
        resolve: vi.fn().mockResolvedValue({
          tenantId: 't1', integration: 'sms',
          providerName: 'twilio', source: 'TENANT_DB',
          apiKey: 'tw-key', apiSecret: 'tw-secret',
          metadata: { from: '+911111111111' },
        }),
        invalidate: vi.fn(),
      } as unknown as TenantIntegrationConfigService;

      const adapter = buildAdapter(circuit, stubProvider, config, registry, flagService, tenantConfig);
      const result = await adapter.send(
        { to: '+919876543210', body: 'hi' },
        { tenantId: 't1' },
      );

      // Twilio must be called (not stub) because flag=enabled + tenantCfg=twilio.
      expect(twilioProvider.send).toHaveBeenCalledTimes(1);
      // Verify the per-call config was constructed from tenant override.
      const callArgs = (twilioProvider.send as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        apiKey: 'tw-key',
        apiSecret: 'tw-secret',
        from: '+911111111111',
      });
      expect(result.ok).toBe(true);
      expect(result.providerMessageId).toBe('tw-1');
    });

    it('should fall back to stub when tenant-configured provider is not registered', async () => {
      const stubProvider = new StubSmsProvider();
      const stubSpy = vi.spyOn(stubProvider, 'send');
      const registry = new Map<string, SmsProviderPort>([
        ['stub', stubProvider],
        // 'msg91' is NOT registered — fall back to stub.
      ]);
      const flagService = {
        resolve: vi.fn().mockResolvedValue({ integration: 'sms', resolution: 'enabled', source: 'TENANT' }),
        isEnabled: vi.fn().mockResolvedValue(true),
        invalidate: vi.fn(),
      } as unknown as IntegrationFeatureFlagService;
      const tenantConfig = {
        resolve: vi.fn().mockResolvedValue({
          tenantId: 't1', integration: 'sms',
          providerName: 'msg91', source: 'TENANT_DB',
        }),
        invalidate: vi.fn(),
      } as unknown as TenantIntegrationConfigService;

      const adapter = buildAdapter(circuit, stubProvider, config, registry, flagService, tenantConfig);
      const result = await adapter.send(
        { to: '+919876543210', body: 'hi' },
        { tenantId: 't1' },
      );

      // Stub must be called because msg91 is not registered.
      expect(stubSpy).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
    });
  });
});
