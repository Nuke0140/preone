/**
 * AiTokenBudgetService — per-tenant daily token budget enforcement
 * (Wave 18.1).
 *
 * Per the Wave 18.1 spec: "per-tenant token budget".
 *
 * Why: AI calls cost money. A single rogue user (or a misconfigured
 * batch job) could blow through the tenant's monthly LLM budget in
 * hours. This service enforces a per-tenant DAILY limit:
 *
 *   - Each tenant gets a daily token quota (configurable via env or
 *     tenant DB override).
 *   - Each LLM call checks + increments the daily counter in Redis.
 *   - When the daily quota is exceeded, the call fails fast with a
 *     clear error (the AiService falls back to the deterministic
 *     stub response).
 *   - The counter resets at UTC midnight (key includes the date).
 *
 * Default quotas (env-overridable):
 *   - Free tier:      50_000 tokens/day
 *   - Standard tier: 500_000 tokens/day
 *   - Pro tier:     2_000_000 tokens/day
 *   - Enterprise:  10_000_000 tokens/day
 *
 * Tenants can override their quota via the integration_provider_settings
 * table (metadata.dailyTokenBudget field). This is read on first call
 * of the day and cached for 24h.
 *
 * Note: this is a SOFT limit — actual provider charges are not
 * enforced here. The budget is for early-warning + protection, not
 * billing. Billing is handled by the platform module's subscription
 * + usage tracking.
 */
import { Injectable, Logger } from '@nestjs/common';

import { RedisService } from '@infra/redis/redis.service';

export interface BudgetCheckResult {
  allowed: boolean;
  /** Tokens used so far today (UTC). */
  usedToday: number;
  /** Daily token quota for this tenant. */
  quota: number;
  /** Tokens remaining in today's quota. */
  remaining: number;
  /** Reason for denial if allowed=false. */
  reason?: string;
}

export interface BudgetRecordResult {
  recorded: boolean;
  usedToday: number;
  quota: number;
  /** True if this record pushed the tenant over quota. */
  exceededAfterRecord: boolean;
}

@Injectable()
export class AiTokenBudgetService {
  private readonly logger = new Logger(AiTokenBudgetService.name);
  private static readonly KEY_PREFIX = 'ai:budget:';
  private static readonly DEFAULT_QUOTA = 500_000; // Standard tier default
  private static readonly DAILY_TTL_SECONDS = 36 * 60 * 60; // 36h (overlap to be safe)

  constructor(private readonly redis: RedisService) {}

  /**
   * Check whether the tenant can make a call costing `tokens` tokens.
   * Does NOT record the usage — call recordUsage() after the LLM
   * responds with actual token counts.
   */
  async checkBudget(
    tenantId: string,
    estimatedTokens: number,
    quotaOverride?: number,
  ): Promise<BudgetCheckResult> {
    const key = this.buildKey(tenantId);
    const quota = quotaOverride ?? this.getDefaultQuota(tenantId);

    try {
      const usedStr = await this.redis.get(key);
      const usedToday = usedStr ? parseInt(usedStr, 10) : 0;
      const remaining = Math.max(0, quota - usedToday);

      if (usedToday + estimatedTokens > quota) {
        return {
          allowed: false,
          usedToday,
          quota,
          remaining,
          reason: `Daily token budget exceeded (used=${usedToday}, quota=${quota}, requested=${estimatedTokens})`,
        };
      }
      return {
        allowed: true,
        usedToday,
        quota,
        remaining,
      };
    } catch (err) {
      this.logger.warn(
        `Budget check failed for tenant ${tenantId}: ${(err as Error).message} — fail-open`,
      );
      // Fail-open: if Redis is down, allow the call (the cost of a
      // few extra LLM calls is less than blocking all AI features).
      return {
        allowed: true,
        usedToday: 0,
        quota,
        remaining: quota,
      };
    }
  }

  /**
   * Record actual token usage after the LLM responds. Uses Redis INCR
   * for atomic increment.
   *
   * Per the OpenAI / Anthropic convention, `totalTokens` includes
   * both prompt + completion tokens.
   */
  async recordUsage(
    tenantId: string,
    totalTokens: number,
    quotaOverride?: number,
  ): Promise<BudgetRecordResult> {
    if (totalTokens <= 0) {
      return {
        recorded: false,
        usedToday: 0,
        quota: quotaOverride ?? this.getDefaultQuota(tenantId),
        exceededAfterRecord: false,
      };
    }
    const key = this.buildKey(tenantId);
    const quota = quotaOverride ?? this.getDefaultQuota(tenantId);

    try {
      // Atomic increment + TTL refresh.
      const newCount = await this.redis.incrby(key, totalTokens);
      // Set TTL on first write of the day (count == totalTokens).
      if (newCount === totalTokens) {
        await this.redis.expire(key, AiTokenBudgetService.DAILY_TTL_SECONDS);
      }
      return {
        recorded: true,
        usedToday: newCount,
        quota,
        exceededAfterRecord: newCount > quota,
      };
    } catch (err) {
      this.logger.warn(
        `Budget record failed for tenant ${tenantId}: ${(err as Error).message} — usage not recorded`,
      );
      return {
        recorded: false,
        usedToday: 0,
        quota,
        exceededAfterRecord: false,
      };
    }
  }

  /** Get current usage for a tenant (for dashboards + admin endpoints). */
  async getUsage(tenantId: string, quotaOverride?: number): Promise<BudgetCheckResult> {
    const key = this.buildKey(tenantId);
    const quota = quotaOverride ?? this.getDefaultQuota(tenantId);
    try {
      const usedStr = await this.redis.get(key);
      const usedToday = usedStr ? parseInt(usedStr, 10) : 0;
      return {
        allowed: usedToday < quota,
        usedToday,
        quota,
        remaining: Math.max(0, quota - usedToday),
      };
    } catch (err) {
      this.logger.warn(
        `Get usage failed for tenant ${tenantId}: ${(err as Error).message}`,
      );
      return { allowed: true, usedToday: 0, quota, remaining: quota };
    }
  }

  /** Reset a tenant's daily budget (admin override). */
  async reset(tenantId: string): Promise<void> {
    const key = this.buildKey(tenantId);
    try {
      await this.redis.del(key);
      this.logger.log(`Reset AI token budget for tenant ${tenantId}`);
    } catch (err) {
      this.logger.warn(
        `Budget reset failed for tenant ${tenantId}: ${(err as Error).message}`,
      );
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────

  /**
   * Build the Redis key for a tenant's daily budget.
   * Key shape: ai:budget:<tenantId>:<YYYY-MM-DD>
   *
   * The date is UTC so the reset happens at UTC midnight regardless
   * of the server's timezone.
   */
  private buildKey(tenantId: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return `${AiTokenBudgetService.KEY_PREFIX}${tenantId}:${today}`;
  }

  /**
   * Get the default daily token quota for a tenant.
   *
   * This is a SIMPLE env-driven default — per-tenant overrides should
   * come from the tenant DB (read by the caller and passed as
   * quotaOverride). The actual tenant DB lookup is intentionally NOT
   * done here to keep this service focused on Redis operations.
   *
   * Tier mapping (env-driven):
   *   AI_TOKEN_BUDGET_FREE=50000
   *   AI_TOKEN_BUDGET_STANDARD=500000  (default)
   *   AI_TOKEN_BUDGET_PRO=2000000
   *   AI_TOKEN_BUDGET_ENTERPRISE=10000000
   *
   * The caller passes the resolved quota as quotaOverride.
   */
  private getDefaultQuota(tenantId: string): number {
    // For now, just return the global default. The AiService will
    // resolve the tenant-specific quota from the tenant's subscription
    // tier and pass it as quotaOverride.
    void tenantId; // suppress unused warning
    const env = process.env.AI_TOKEN_BUDGET_STANDARD;
    if (env && /^\d+$/.test(env)) {
      return parseInt(env, 10);
    }
    return AiTokenBudgetService.DEFAULT_QUOTA;
  }
}
