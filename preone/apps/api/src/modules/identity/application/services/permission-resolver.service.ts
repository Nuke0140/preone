/**
 * PermissionResolver — Redis-cached permission lookup (BTD §16.4).
 *
 * Per BTD §16.4 Permission Cache Deep-Dive:
 *   - Cache key: user_perms:{userId}:v{perms_version}
 *   - TTL: 300s (5 minutes)
 *   - On MISS: load from DB (role_permission JOIN user_role)
 *   - Invalidation: bump user.perms_version → old key expires naturally
 *   - Cache hit ratio target ≥ 90% (every request checks perms)
 *
 * Per BTD §11.1 — Repository interface contract: loadPermissionCodes
 * returns role-permission UNION across all the user's roles.
 *
 * Per ADR-011 — Permission UNION (never promote): a user's effective
 * permissions are the UNION of permissions from ALL their roles. Roles
 * never grant negatives (denials). SUPER_ADMIN bypass is enforced in the
 * PermissionsGuard, not here.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import { CacheService } from '@infra/cache/cache.service';

import { USER_REPOSITORY } from '../../domain/repositories/tokens';
import type { UserRepository } from '../../domain/repositories/user.repository';

const PERM_TTL_SECONDS = 300; // 5 min per BTD §16.4

export interface ResolvedUser {
  id: string;
  tenantId: string;
  permissionsVersion: number;
  roles: string[];
}

@Injectable()
export class PermissionResolver {
  private readonly logger = new Logger(PermissionResolver.name);

  constructor(
    private readonly cache: CacheService,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  /**
   * Get effective permission codes for a user.
   *
   * Flow per BTD §16.4:
   *   1. Build cache key user_perms:{userId}:v{perms_version}
   *   2. Redis GET — return on HIT
   *   3. On MISS: load from DB via UserRepository.loadPermissionCodes
   *   4. Redis SETEX with 300s TTL
   *   5. Return as Set for O(1) lookup
   */
  async getPermissions(user: ResolvedUser): Promise<Set<string>> {
    // SUPER_ADMIN bypass — no DB lookup, no cache write
    if (user.roles.includes('SUPER_ADMIN')) {
      return new Set(['*']); // wildcard — PermissionsGuard checks this
    }

    const key = CacheService.KEYS.USER_PERMS(user.id, user.permissionsVersion);

    // Step 1: check cache
    const cached = await this.cache.get<string[]>(key);
    if (cached) {
      this.logger.debug(`Permission cache HIT: ${key} (${cached.length} perms)`);
      return new Set(cached);
    }

    // Step 2: load from DB
    this.logger.debug(`Permission cache MISS: ${key} — loading from DB`);
    const codes = await this.users.loadPermissionCodes(user.id, user.tenantId);

    // Step 3: write to cache (best-effort — if Redis is down, fall through)
    try {
      await this.cache.set(key, codes, PERM_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(
        `Permission cache write failed (continuing without cache): ${(err as Error).message}`,
      );
    }

    return new Set(codes);
  }

  /**
   * Check if user has a single permission code.
   * Convenience wrapper around getPermissions.
   */
  async hasPermission(user: ResolvedUser, code: string): Promise<boolean> {
    const perms = await this.getPermissions(user);
    return perms.has('*') || perms.has(code);
  }

  /**
   * Check if user has ALL of the required permission codes (AND semantics).
   * Per BTD §3.3: "Check ALL required permissions are present (AND semantics)"
   */
  async hasAllPermissions(user: ResolvedUser, codes: readonly string[]): Promise<boolean> {
    if (codes.length === 0) return true;
    const perms = await this.getPermissions(user);
    if (perms.has('*')) return true; // SUPER_ADMIN
    return codes.every((c) => perms.has(c));
  }

  /**
   * Check if user has ANY of the required permission codes (OR semantics).
   * Useful for routes that accept multiple roles (e.g., PRINCIPAL or
   * COORDINATOR can both approve leave).
   */
  async hasAnyPermission(user: ResolvedUser, codes: readonly string[]): Promise<boolean> {
    if (codes.length === 0) return true;
    const perms = await this.getPermissions(user);
    if (perms.has('*')) return true; // SUPER_ADMIN
    return codes.some((c) => perms.has(c));
  }
}
