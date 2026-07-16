/**
 * WsScopeResolver — enforces subscription scoping (API §17.5).
 *
 * Per the spec:
 *   "Clients subscribe to specific channels (room:01HROOM, class:01HCL,
 *    branch:01HBR). Server MUST validate scope — teacher can only subscribe
 *    to their own classroom's room, not all branches. Subscription scope
 *    MUST be consistent with JWT scope."
 *
 * Wave 16.1 (this version) adds DB-backed scope checks:
 *   - Teachers: SectionTeacher lookup (may subscribe to room:/class: for
 *     sections they teach).
 *   - Parents: Enrollment lookup (may subscribe to room:/class: for
 *     sections their wards are enrolled in).
 *   - Parents: TransportAttendance lookup (may subscribe to trip: for
 *     trips their wards are assigned to).
 *
 * The previous Wave 16.0 v1 was synchronous + JWT-claim-only; this v1.1
 * is async + DB-backed. All callers (WsSubscriptionManager) have been
 * updated to await the resolver.
 *
 * Authorization matrix (per-channel):
 *
 * 1. room:<roomId> / class:<classId>
 *    - ADMIN / PLATFORM_ADMIN / CENTER_HEAD: any room/class in their tenant.
 *    - TEACHER: only sections they teach (SectionTeacher lookup).
 *    - PARENT: only sections their wards are enrolled in (Enrollment lookup).
 *    - Otherwise: denied.
 *
 * 2. branch:<branchId>
 *    - ADMIN / PLATFORM_ADMIN: any branch in their tenant.
 *    - CENTER_HEAD / TEACHER / PARENT: their own branch (from JWT.branchId).
 *
 * 3. user:<userId>
 *    - Self only. Always allowed if user.id === userId.
 *
 * 4. trip:<tripId>
 *    - ADMIN / PLATFORM_ADMIN / CENTER_HEAD / TRANSPORT_STAFF: any trip in tenant.
 *    - PARENT: only trips their wards are assigned to (TransportAttendance lookup).
 *    - TEACHER: denied (teachers do not need bus tracking).
 *
 * 5. school:<schoolId>
 *    - ADMIN / PLATFORM_ADMIN only (school-wide broadcasts).
 *    - schoolId MUST match user.tenantId.
 *
 * Caching: the DB-backed checks are cached for 60s in Redis by
 * WsScopeCheckService. Stale results over-grant briefly but never
 * under-grant — safe direction.
 */
import { Injectable, Logger } from '@nestjs/common';

import { parseChannel, CHANNEL_PREFIX } from '../ws-message-envelope';
import type { WsAuthenticatedUser } from '../ws-connection-context';
import { WsScopeCheckService } from './ws-scope-check.service';

export type ScopeResolution =
  | { ok: true }
  | { ok: false; code: 'CHANNEL_INVALID' | 'SCOPE_DENIED'; reason: string };

@Injectable()
export class WsScopeResolver {
  private readonly logger = new Logger(WsScopeResolver.name);

  constructor(private readonly scopeCheck: WsScopeCheckService) {}

  /**
   * Resolve whether the given user may subscribe to the given channel.
   *
   * Async in Wave 16.1 — DB-backed checks for teachers, parents, and
   * trip subscribers. Admins/center-heads remain pure-JWT (no DB hit).
   */
  async resolve(user: WsAuthenticatedUser, channel: string): Promise<ScopeResolution> {
    const parsed = parseChannel(channel);
    if (!parsed) {
      return { ok: false, code: 'CHANNEL_INVALID', reason: `Unknown channel format: ${channel}` };
    }

    switch (parsed.prefix) {
      case CHANNEL_PREFIX.ROOM:
      case CHANNEL_PREFIX.CLASS: {
        // Admin / center-head — JWT-only check, no DB hit.
        if (this.isAdmin(user) || this.isCenterHead(user)) {
          return { ok: true };
        }
        // Teachers — SectionTeacher lookup.
        if (this.isTeacher(user)) {
          const ok = await this.scopeCheck.canTeacherAccessSection(user.id, parsed.id);
          if (ok) return { ok: true };
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Teacher ${user.id} is not assigned to section ${parsed.id}`,
          };
        }
        // Parents — Enrollment lookup (any ward enrolled in this section).
        if (this.isParent(user)) {
          const ok = await this.scopeCheck.canParentAccessSection(user.id, parsed.id);
          if (ok) return { ok: true };
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Parent ${user.id} has no ward enrolled in section ${parsed.id}`,
          };
        }
        return {
          ok: false,
          code: 'SCOPE_DENIED',
          reason: `User ${user.id} has no role granting access to ${channel}`,
        };
      }

      case CHANNEL_PREFIX.BRANCH:
        // ADMIN can subscribe to any branch in their tenant.
        if (this.isAdmin(user)) return { ok: true };
        // CENTER_HEAD / TEACHER / PARENT: only their own branch.
        if (user.branchId && parsed.id === user.branchId) return { ok: true };
        return {
          ok: false,
          code: 'SCOPE_DENIED',
          reason: `User ${user.id} cannot subscribe to branch ${parsed.id}`,
        };

      case CHANNEL_PREFIX.USER:
        // Self only.
        if (parsed.id === user.id) return { ok: true };
        return {
          ok: false,
          code: 'SCOPE_DENIED',
          reason: `User ${user.id} cannot subscribe to user:${parsed.id}`,
        };

      case CHANNEL_PREFIX.TRIP: {
        // Admin / center-head / transport staff — JWT-only.
        if (
          this.isAdmin(user) ||
          this.isCenterHead(user) ||
          this.isTransportStaff(user)
        ) {
          return { ok: true };
        }
        // Parents — TransportAttendance lookup.
        if (this.isParent(user)) {
          const ok = await this.scopeCheck.canParentAccessTrip(user.id, parsed.id);
          if (ok) return { ok: true };
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Parent ${user.id} has no ward assigned to trip ${parsed.id}`,
          };
        }
        // Teachers — denied (teachers do not need bus tracking).
        if (this.isTeacher(user)) {
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Teachers cannot subscribe to trip channels`,
          };
        }
        return {
          ok: false,
          code: 'SCOPE_DENIED',
          reason: `User ${user.id} has no role granting access to trip ${parsed.id}`,
        };
      }

      case CHANNEL_PREFIX.SCHOOL:
        // ADMIN only, and schoolId must match tenantId.
        if (!this.isAdmin(user)) {
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Only ADMIN can subscribe to school:* channels`,
          };
        }
        if (parsed.id !== user.tenantId) {
          return {
            ok: false,
            code: 'SCOPE_DENIED',
            reason: `Admin ${user.id} cannot subscribe to school ${parsed.id} (different tenant)`,
          };
        }
        return { ok: true };

      default:
        return { ok: false, code: 'CHANNEL_INVALID', reason: `Unrecognized prefix` };
    }
  }

  // ─── Role helpers ────────────────────────────────────────────────

  private isAdmin(user: WsAuthenticatedUser): boolean {
    return user.roles.includes('ADMIN') || user.roles.includes('PLATFORM_ADMIN');
  }

  private isCenterHead(user: WsAuthenticatedUser): boolean {
    return user.roles.includes('CENTER_HEAD');
  }

  private isTeacher(user: WsAuthenticatedUser): boolean {
    return user.roles.includes('TEACHER') || user.roles.includes('CLASS_TEACHER');
  }

  private isParent(user: WsAuthenticatedUser): boolean {
    return user.roles.includes('PARENT') || user.roles.includes('GUARDIAN');
  }

  private isTransportStaff(user: WsAuthenticatedUser): boolean {
    return user.roles.includes('TRANSPORT_STAFF') || user.roles.includes('DRIVER');
  }
}
