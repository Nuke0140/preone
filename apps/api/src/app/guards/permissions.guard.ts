/**
 * PermissionsGuard — RBAC check via cached permission resolver (BTD §16.4).
 *
 * Per BTD §20.1: "RBAC — Casbin policies; role → permissions matrix"
 * Per BTD §3.3: "Global PermissionsGuard backed by Casbin enforcer (cached in Redis)"
 * Per BTD §16.4 Permission Cache Deep-Dive:
 *   - Cache key: user_perms:{userId}:v{perms_version}
 *   - TTL: 300s
 *   - Invalidation: bump perms_version on role change
 *
 * This guard delegates to PermissionResolver for the cache + DB lookup.
 * The resolver is in the Identity module and uses UserRepository.
 */
import {
  CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '@app/decorators/auth.decorators';
import type { AuthenticatedUser } from '@app/decorators/auth.decorators';
import { PermissionResolver } from '@modules/identity/application/services/permission-resolver.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PermissionResolver) private readonly resolver: PermissionResolver,
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

    // Build ResolvedUser — guard only knows what JWT carries
    const resolved = {
      id: user.id,
      tenantId: user.tenantId,
      permissionsVersion: user.permissionsVersion,
      roles: user.roles ?? [],
    };

    // Super admin bypass
    if (resolved.roles.includes('SUPER_ADMIN')) return true;

    // Check ALL required permissions are present (AND semantics, BTD §3.3)
    const hasAll = await this.resolver.hasAllPermissions(resolved, required);
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permissions: ${required.join(', ')}`,
      );
    }
    return true;
  }
}
