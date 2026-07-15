/**
 * PermissionsGuard — RBAC check via Casbin policies (cached in Redis).
 *
 * Per BTD §20.1: "RBAC — Casbin policies; role → permissions matrix"
 * Per BTD §3.3: "Global PermissionsGuard backed by Casbin enforcer (cached in Redis)"
 * Per BTD §16.4 Permission Cache Deep-Dive:
 *   - Cache key: user_perms:{userId}:v{perms_version}
 *   - TTL: 300s
 *   - Invalidation: bump perms_version on role change
 */
import { CanActivate, ExecutionContext, Inject, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '@app/decorators/auth.decorators';
import type { AuthenticatedUser } from '@app/decorators/auth.decorators';
import { RedisService } from '@infra/redis/redis.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // No @Permissions() decorator = no RBAC check needed (route is public
    // via @Public() OR only requires authentication, not authorization).
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authenticated user context is missing.');
    }

    // Super admin bypass
    if (user.roles?.includes('SUPER_ADMIN')) return true;

    // Fetch user permissions from cache (or DB on miss)
    const permissions = await this.getUserPermissions(user);

    // Check ALL required permissions are present (AND semantics)
    const hasAll = required.every((p) => permissions.has(p));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permissions: ${required.filter((p) => !permissions.has(p)).join(', ')}`,
      );
    }
    return true;
  }

  /**
   * Permission cache lookup — versioned key per BTD §16.4.
   *
   * Key: preone:user_perms:{userId}:v{perms_version}
   * On MISS: load from DB (role_permission JOIN user_role) → cache with 300s TTL.
   * On role change: bump user.perms_version → old key expires naturally.
   */
  private async getUserPermissions(user: AuthenticatedUser): Promise<Set<string>> {
    const key = `user_perms:${user.id}:v${user.permissionsVersion}`;
    const cached = await this.redis.get(key);
    if (cached) {
      return new Set(JSON.parse(cached) as string[]);
    }

    // TODO: Load from DB via Prisma once identity module is wired.
    // For now, return empty set so unauthorized is thrown (fail-closed).
    // Real implementation:
    //   const perms = await this.prisma.$queryRaw`
    //     SELECT DISTINCT p.code FROM permissions p
    //     JOIN role_permission rp ON rp.permission_id = p.id
    //     JOIN user_role ur ON ur.role_id = rp.role_id
    //     WHERE ur.user_id = ${user.id}
    //       AND ur.school_id = ${user.tenantId}::uuid
    //       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    //   `;
    //   const codes = perms.map((p) => p.code);
    //   await this.redis.setex(key, 300, JSON.stringify(codes));
    //   return new Set(codes);
    const empty = new Set<string>();
    return empty;
  }
}
