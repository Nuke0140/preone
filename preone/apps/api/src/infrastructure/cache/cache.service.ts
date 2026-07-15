/**
 * CacheService — versioned cache helpers.
 *
 * Key conventions (per BTD §16.4):
 *   user_perms:{userId}:v{version}    — permission cache (300s TTL)
 *   menu:{roleId}:v{version}           — menu cache (1h TTL)
 *   settings:{tenantId}:{branchId}:v   — settings (1h TTL)
 *   feature_flags:{tenantId}           — feature flag cache (300s TTL)
 *   dashboard_kpi:{tenantId}:{branchId}:{role} — KPI bundle (60s TTL)
 */
import { Injectable, Logger } from '@nestjs/common';

import { RedisService, RedisDb } from '@infra/redis/redis.service';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // Cache key prefixes (per BTD §16.4)
  static readonly KEYS = {
    USER_PERMS: (userId: string, version: number) => `user_perms:${userId}:v${version}`,
    MENU: (roleId: string, version: number) => `menu:${roleId}:v${version}`,
    SETTINGS: (tenantId: string, branchId: string, version: number) =>
      `settings:${tenantId}:${branchId}:v${version}`,
    FEATURE_FLAGS: (tenantId: string) => `feature_flags:${tenantId}`,
    DASHBOARD_KPI: (tenantId: string, branchId: string, role: string) =>
      `dashboard_kpi:${tenantId}:${branchId}:${role}`,
  } as const;

  constructor(private readonly redis: RedisService) {}

  /**
   * Read-through cache — fetches from DB on miss via loader callback.
   * Per BTD §16.3: "Cache stampede protection via single-flight pattern"
   * (TODO: implement single-flight in v1.1)
   */
  async getOrLoad<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Corrupted cache entry — delete + reload
        await this.redis.del(key);
      }
    }
    const fresh = await loader();
    await this.redis.setex(key, ttlSeconds, JSON.stringify(fresh));
    return fresh;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const v = await this.redis.get(key);
    return v ? (JSON.parse(v) as T) : undefined;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async invalidate(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Cache invalidated: ${key}`);
  }

  async invalidateMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redis.del(keys);
  }

  /**
   * Pub/Sub broadcast for multi-instance invalidation.
   * All API pods subscribe to `cache:invalidate` channel.
   */
  async broadcastInvalidation(key: string): Promise<void> {
    const pub = this.redis.forDb(RedisDb.PUBSUB);
    await pub.publish('cache:invalidate', key);
  }
}
