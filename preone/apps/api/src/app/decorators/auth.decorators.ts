/**
 * AuthenticatedUser — shape populated on request.user by JwtAuthGuard.
 *
 * Per BTD §20.2 Authentication Flow:
 *   - Access token 15 min, RS256 signed
 *   - Refresh token 30d, rotated, HttpOnly cookie
 *   - On every request: JwtAuthGuard verifies token, populates req.user
 */
export interface AuthenticatedUser {
  id: string;            // user.id (UUID v7)
  tenantId: string;      // school.id (multi-tenant discriminator)
  branchId?: string;     // optional branch scope (for multi-branch schools)
  academicYearId?: string; // optional academic year scope
  email: string;
  phone?: string;
  roles: string[];       // role codes: ['CENTER_HEAD', 'TEACHER']
  permissionsVersion: number; // bumped on role change → invalidates permission cache
  sessionId: string;     // session.id for force-logout
  iat: number;           // token issued-at
  exp: number;           // token expiry
}

/**
 * Public endpoint decorator — opts out of JWT auth.
 * Usage: @Public() on login, register, health endpoints.
 */
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Permissions decorator — required permission codes (Casbin-style).
 * Usage: @Permissions('students:create', 'students:read')
 *
 * PermissionsGuard checks that the authenticated user has ALL listed
 * permissions (AND semantics). For OR semantics, use multiple decorators
 * on separate route handlers.
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * ReqUser decorator — extracts AuthenticatedUser from request.
 * Usage: @ReqUser() user: AuthenticatedUser
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const ReqUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | unknown => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
  },
);
