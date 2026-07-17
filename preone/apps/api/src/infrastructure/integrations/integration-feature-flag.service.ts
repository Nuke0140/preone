/**
 * IntegrationFeatureFlagService — runtime feature-flag checks for the
 * 8 external integrations (Wave 17.1).
 *
 * Per the Wave 17.1 spec, every integration can be toggled on/off at
 * three resolution levels (mirroring BRC §8.2 — Feature flag management):
 *
 *   1. PLATFORM  — global default, read from env var (e.g.
 *                  INTEGRATIONS_SMS_LIVE=auto|enabled|disabled).
 *                  'auto' = honour tenant-level config (default).
 *   2. TENANT    — per-tenant override, stored in the
 *                  system_feature_flags table (key like
 *                  'INTEGRATIONS_SMS_LIVE', scope=TENANT).
 *   3. USER      — per-user override (rarely used for integrations;
 *                  included for completeness).
 *
 * Resolution order: USER → TENANT → PLATFORM. First hit wins. If no
 * override exists at any level, the integration is considered ENABLED
 * (fail-open for stubs in dev, fail-open for live in prod — the per-
 * tenant config + provider credential check is the real gate).
 *
 * Why fail-open: the existing Wave 17 adapters already default to stub
 * providers when no real credentials are configured. So the absence of
 * a feature flag should NOT break dev/test, and prod tenants will
 * always have an explicit TENANT-level flag set before going live.
 *
 * The service is intentionally simple — it does NOT cache (the
 * underlying CacheService already wraps SystemFeatureFlag reads with
 * a 300s TTL per BTD §16.4).
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

/**
 * The 8 integration keys. Each maps to a feature flag of the form
 * `INTEGRATIONS_<KEY>_LIVE`. The flag value is one of:
 *   - 'enabled'  — real provider must be used (fail-closed if no creds)
 *   - 'disabled' — stub provider must be used (dev/test mode)
 *   - 'auto'     — let per-tenant config decide (default)
 */
export type IntegrationKey =
  | 'sms'
  | 'whatsapp'
  | 'email'
  | 'payment'
  | 'biometric'
  | 'ai_llm'
  | 'cloud_storage'
  | 'kyc';

const INTEGRATION_KEYS: readonly IntegrationKey[] = [
  'sms', 'whatsapp', 'email', 'payment',
  'biometric', 'ai_llm', 'cloud_storage', 'kyc',
];

export type FlagResolution = 'enabled' | 'disabled' | 'auto';

export interface ResolvedFlag {
  integration: IntegrationKey;
  resolution: FlagResolution;
  /** Where the resolution came from — for audit + debugging. */
  source: 'USER' | 'TENANT' | 'PLATFORM' | 'DEFAULT';
}

@Injectable()
export class IntegrationFeatureFlagService {
  private readonly logger = new Logger(IntegrationFeatureFlagService.name);

  /** Per-tenant in-process cache (5s TTL) — reduces DB hits on hot paths. */
  private readonly cache = new Map<string, { value: ResolvedFlag; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 5_000;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Resolve the feature flag for a given tenant + integration.
   *
   * Order: USER override → TENANT override → PLATFORM env default.
   * If nothing is set, returns `{ resolution: 'auto', source: 'DEFAULT' }`.
   */
  async resolve(
    integration: IntegrationKey,
    tenantId: string,
    userId?: string,
  ): Promise<ResolvedFlag> {
    const cacheKey = `${integration}:${tenantId}:${userId ?? '-'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const flagKey = this.flagKey(integration);

    // 1. USER override (rare for integrations).
    if (userId) {
      const userFlag = await this.fetchFlag(flagKey, tenantId, undefined, userId);
      if (userFlag) {
        return this.record(cacheKey, {
          integration,
          resolution: userFlag,
          source: 'USER',
        });
      }
    }

    // 2. TENANT override.
    const tenantFlag = await this.fetchFlag(flagKey, tenantId, undefined, undefined);
    if (tenantFlag) {
      return this.record(cacheKey, {
        integration,
        resolution: tenantFlag,
        source: 'TENANT',
      });
    }

    // 3. PLATFORM env default.
    const envFlag = this.readEnvDefault(integration);
    if (envFlag) {
      return this.record(cacheKey, {
        integration,
        resolution: envFlag,
        source: 'PLATFORM',
      });
    }

    // 4. Fail-open.
    return this.record(cacheKey, {
      integration,
      resolution: 'auto',
      source: 'DEFAULT',
    });
  }

  /** Convenience: is this integration enabled (or auto) for the tenant? */
  async isEnabled(integration: IntegrationKey, tenantId: string, userId?: string): Promise<boolean> {
    const flag = await this.resolve(integration, tenantId, userId);
    return flag.resolution !== 'disabled';
  }

  /** Invalidate the in-process cache — call after flag updates. */
  invalidate(integration: IntegrationKey, tenantId: string, userId?: string): void {
    const cacheKey = `${integration}:${tenantId}:${userId ?? '-'}`;
    this.cache.delete(cacheKey);
  }

  /** List all 8 integration keys — for the health dashboard. */
  static listIntegrationKeys(): readonly IntegrationKey[] {
    return INTEGRATION_KEYS;
  }

  // ─── Internal helpers ──────────────────────────────────────────

  private flagKey(integration: IntegrationKey): string {
    return `INTEGRATIONS_${integration.toUpperCase()}_LIVE`;
  }

  private readEnvDefault(integration: IntegrationKey): FlagResolution | undefined {
    const envVar = `INTEGRATIONS_${integration.toUpperCase()}_LIVE`;
    const v = process.env[envVar];
    if (v === 'enabled' || v === 'disabled' || v === 'auto') return v;
    return undefined;
  }

  /**
   * Fetch a flag from the SystemFeatureFlag table.
   * Returns the resolved value, or undefined if no matching row.
   *
   * NOTE: the table stores `isEnabled: boolean`, not the tri-state we
   * need. We map:
   *   - isEnabled=true  → 'enabled'
   *   - isEnabled=false → 'disabled'
   *   - overrideReason starts with 'auto:' → 'auto'
   * This keeps the existing schema compatible.
   */
  private async fetchFlag(
    flagKey: string,
    tenantId: string,
    branchId: string | undefined,
    userId: string | undefined,
  ): Promise<FlagResolution | undefined> {
    try {
      const row = await this.prisma.systemFeatureFlag.findFirst({
        where: {
          schoolId: tenantId,
          flagKey,
          branchId: branchId ?? null,
          deletedAt: null,
          // USER-level: store userId in createdBy (no dedicated column).
          // This is a soft convention — the v1 schema doesn't have a
          // userId column on system_feature_flags. We treat all rows
          // as TENANT-scoped for now.
          ...(userId ? { createdBy: userId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (!row) return undefined;
      if (row.overrideReason?.startsWith('auto:')) return 'auto';
      return row.isEnabled ? 'enabled' : 'disabled';
    } catch (err) {
      this.logger.warn(
        `Failed to fetch feature flag ${flagKey} for tenant ${tenantId}: ${(err as Error).message}`,
      );
      return undefined;
    }
  }

  private record(cacheKey: string, value: ResolvedFlag): ResolvedFlag {
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + IntegrationFeatureFlagService.CACHE_TTL_MS,
    });
    return value;
  }
}
