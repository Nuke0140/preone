/**
 * TenantIntegrationConfigService — per-tenant provider config resolver
 * (Wave 17.1).
 *
 * The existing `CommunicationProviderConfig` table (Wave 5) stores
 * per-tenant credentials for SMS/Email/Push providers. Wave 17.1
 * extends the same pattern to all 8 integration categories by
 * introducing a new lightweight `IntegrationProviderSetting` table.
 *
 * Resolution order:
 *   1. Tenant-level DB config (IntegrationProviderSetting row) — wins.
 *   2. Global env config (e.g., SMS_API_KEY env var) — fallback.
 *
 * The service is fail-safe: if the DB lookup fails (e.g., Prisma
 * error, table missing), it falls back to env-only config so the
 * adapter still works.
 *
 * Why a separate table vs. reusing CommunicationProviderConfig:
 *   - CommProviderConfig is SMS/Email/Push-only (providerType enum
 *     SMS_GUPSHUP / EMAIL_SES / etc.).
 *   - We need per-tenant config for Payment/Biometric/AI/Storage/KYC
 *     too. Adding new enum values would force a Prisma migration on
 *     every new provider — too rigid. A separate key-value table is
 *     more flexible for the long tail of integration types.
 *
 * Schema sketch (added in Wave 17.1 migration):
 *   model IntegrationProviderSetting {
 *     id              String   @id @default(uuid())
 *     schoolId        String
 *     integrationKey  String   // 'sms' | 'email' | 'payment' | ...
 *     providerName    String   // 'twilio' | 'sendgrid' | 'razorpay' | ...
 *     apiKey          String   // PII-encrypted
 *     apiSecret       String?  // PII-encrypted
 *     apiBaseUrl      String?
 *     webhookSecret   String?
 *     metadata        Json?    // provider-specific extras
 *     isActive        Boolean  @default(true)
 *     createdAt       DateTime @default(now())
 *     updatedAt       DateTime @updatedAt
 *     @@unique([schoolId, integrationKey])
 *     @@map("integration_provider_settings")
 *   }
 *
 * Until the migration ships, this service falls back to env-only
 * config (the existing Wave 17 behaviour). This is by design — the
 * service is forward-compatible: once the table exists, per-tenant
 * overrides start working automatically.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import type { IntegrationKey } from './integration-feature-flag.service';

export interface TenantProviderConfig {
  tenantId: string;
  integration: IntegrationKey;
  /** Provider name — 'twilio' | 'sendgrid' | 'razorpay' | 'openai' | ... */
  providerName: string;
  apiKey?: string;
  apiSecret?: string;
  apiBaseUrl?: string;
  webhookSecret?: string;
  /** Provider-specific extras (e.g., Twilio phone number ID). */
  metadata?: Record<string, unknown>;
  /** Source of the config — for audit logs. */
  source: 'TENANT_DB' | 'ENV_DEFAULT';
}

@Injectable()
export class TenantIntegrationConfigService {
  private readonly logger = new Logger(TenantIntegrationConfigService.name);

  /** Per-tenant in-process cache (60s TTL). */
  private readonly cache = new Map<string, { value: TenantProviderConfig; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Resolve the provider config for a given tenant + integration.
   *
   * Order:
   *   1. Check the integration_provider_settings table for an active
   *      row matching (schoolId, integrationKey).
   *   2. If no row (or table missing), fall back to env defaults.
   *
   * NOTE: this method does NOT check feature flags — call
   * IntegrationFeatureFlagService first to decide whether to use the
   * real provider at all.
   */
  async resolve(
    integration: IntegrationKey,
    tenantId: string,
    envDefault: { providerName: string; apiKey?: string; apiSecret?: string; apiBaseUrl?: string; webhookSecret?: string },
  ): Promise<TenantProviderConfig> {
    const cacheKey = `${integration}:${tenantId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // 1. Tenant DB lookup.
    const tenantConfig = await this.fetchTenantConfig(integration, tenantId);
    if (tenantConfig) {
      const resolved: TenantProviderConfig = {
        tenantId,
        integration,
        providerName: tenantConfig.providerName,
        apiKey: tenantConfig.apiKey,
        apiSecret: tenantConfig.apiSecret ?? undefined,
        apiBaseUrl: tenantConfig.apiBaseUrl ?? undefined,
        webhookSecret: tenantConfig.webhookSecret ?? undefined,
        metadata: tenantConfig.metadata ?? undefined,
        source: 'TENANT_DB',
      };
      this.cache.set(cacheKey, { value: resolved, expiresAt: Date.now() + TenantIntegrationConfigService.CACHE_TTL_MS });
      return resolved;
    }

    // 2. Env fallback.
    const resolved: TenantProviderConfig = {
      tenantId,
      integration,
      providerName: envDefault.providerName,
      apiKey: envDefault.apiKey,
      apiSecret: envDefault.apiSecret,
      apiBaseUrl: envDefault.apiBaseUrl,
      webhookSecret: envDefault.webhookSecret,
      source: 'ENV_DEFAULT',
    };
    this.cache.set(cacheKey, { value: resolved, expiresAt: Date.now() + TenantIntegrationConfigService.CACHE_TTL_MS });
    return resolved;
  }

  /** Invalidate the in-process cache — call after config updates. */
  invalidate(integration: IntegrationKey, tenantId: string): void {
    const cacheKey = `${integration}:${tenantId}`;
    this.cache.delete(cacheKey);
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Fetch tenant config from the integration_provider_settings table.
   * Returns null if:
   *   - The table doesn't exist (Prisma throws P2021 — "no such table")
   *   - No matching row
   *   - Prisma is unavailable
   */
  private async fetchTenantConfig(
    integration: IntegrationKey,
    tenantId: string,
  ): Promise<Omit<TenantProviderConfig, 'tenantId' | 'integration' | 'source'> | null> {
    try {
      // The table may not exist yet (pre-migration). We cast through
      // any to avoid a TypeScript error — Prisma will throw at runtime
      // if the model is missing.
      const prismaAny = this.prisma as unknown as {
        integrationProviderSetting?: {
          findFirst: (args: unknown) => Promise<unknown>;
        };
      };
      if (!prismaAny.integrationProviderSetting) {
        return null;
      }
      const row = await prismaAny.integrationProviderSetting.findFirst({
        where: {
          schoolId: tenantId,
          integrationKey: integration,
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      }) as {
        providerName: string;
        apiKey: string;
        apiSecret: string | null;
        apiBaseUrl: string | null;
        webhookSecret: string | null;
        metadata: unknown;
      } | null;

      if (!row) return null;

      return {
        providerName: row.providerName,
        apiKey: row.apiKey,
        apiSecret: row.apiSecret ?? undefined,
        apiBaseUrl: row.apiBaseUrl ?? undefined,
        webhookSecret: row.webhookSecret ?? undefined,
        metadata: (row.metadata as Record<string, unknown> | null) ?? undefined,
      };
    } catch (err) {
      const msg = (err as Error).message ?? '';
      // Prisma P2021 = "An operation on a table doesn't satisfy the
      // table constraint" (i.e., table doesn't exist). Treat as
      // "no tenant config" — fall back to env.
      if (msg.includes('P2021') || msg.includes('does not exist')) {
        return null;
      }
      this.logger.warn(
        `Failed to fetch tenant config for ${integration}/${tenantId}: ${msg}`,
      );
      return null;
    }
  }
}
