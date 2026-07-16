/**
 * WsScopeCheckService — DB-backed scope checks for WebSocket subscriptions
 * (Wave 16.1).
 *
 * Wave 16.0 shipped a v1 WsScopeResolver that did JWT-claim-based checks
 * only (admin / center-head / self / own-branch). Teachers and parents
 * were granted tenant-wide subscribe as a placeholder. Wave 16.1 closes
 * that gap by hitting the database for the four relational checks:
 *
 *   1. SectionTeacher  → may a teacher subscribe to room:/class:<id>?
 *   2. Enrollment      → may a parent subscribe to room:/class:<id>?
 *   3. TransportAttendance → may a parent subscribe to trip:<id>?
 *   4. Guardian        → resolve the parent's ward set (cached).
 *
 * The service is intentionally Prisma-direct — no repository abstraction
 * is warranted for read-only scope checks, and going through the CQRS
 * query bus would add latency to the WS subscribe hot path.
 *
 * Caching: every check result is cached in Redis for 60s under
 *   ws:scope:<check>:<userId>:<resourceId>
 * so a teacher subscribing to 6 sections in rapid succession costs 1
 * DB round-trip. Cache is invalidated lazily — stale results are safe
 * because they only over-grant briefly (60s) before the next subscribe
 * re-checks.
 *
 * All methods return true/false — never throw. A DB error is logged and
 * treated as "deny" (fail-closed) so a Postgres outage does not silently
 * turn the WS layer into an open pipe.
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';

const SCOPE_TTL_SECONDS = 60;

@Injectable()
export class WsScopeCheckService {
  private readonly logger = new Logger(WsScopeCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * May a teacher subscribe to a room/class channel identified by `sectionId`?
   *
   * True if there is a non-removed SectionTeacher row linking the user's id
   * to the section's id. The SectionTeacher.teacherId column links to
   * users.id (per schema comment in academics.prisma:1016).
   */
  async canTeacherAccessSection(userId: string, sectionId: string): Promise<boolean> {
    const cacheKey = `ws:scope:section:${userId}:${sectionId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const row = await this.prisma.sectionTeacher.findFirst({
        where: {
          teacherId: userId,
          sectionId,
          removedAt: null,
        },
        select: { id: true },
      });
      const ok = row !== null;
      await this.cache.set(cacheKey, ok, SCOPE_TTL_SECONDS);
      return ok;
    } catch (err) {
      this.logger.error(
        `canTeacherAccessSection DB error for user=${userId} section=${sectionId}: ${(err as Error).message}`,
      );
      return false; // fail-closed
    }
  }

  /**
   * May a parent subscribe to a room/class channel identified by `sectionId`?
   *
   * True if any of the parent's wards (via Guardian → StudentGuardian →
   * Student → Enrollment) is currently ENROLLED in that section.
   */
  async canParentAccessSection(userId: string, sectionId: string): Promise<boolean> {
    const cacheKey = `ws:scope:section-parent:${userId}:${sectionId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      // Resolve the guardian record for this user, then count active
      // enrollments in the section for any of their wards.
      const guardian = await this.prisma.guardian.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!guardian) {
        await this.cache.set(cacheKey, false, SCOPE_TTL_SECONDS);
        return false;
      }

      const wardLinks = await this.prisma.studentGuardian.findMany({
        where: { guardianId: guardian.id },
        select: { studentId: true },
      });
      if (wardLinks.length === 0) {
        await this.cache.set(cacheKey, false, SCOPE_TTL_SECONDS);
        return false;
      }

      const enrolled = await this.prisma.enrollment.findFirst({
        where: {
          studentId: { in: wardLinks.map((l) => l.studentId) },
          sectionId,
          status: 'ENROLLED',
          deletedAt: null,
        },
        select: { id: true },
      });
      const ok = enrolled !== null;
      await this.cache.set(cacheKey, ok, SCOPE_TTL_SECONDS);
      return ok;
    } catch (err) {
      this.logger.error(
        `canParentAccessSection DB error for user=${userId} section=${sectionId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * May a parent subscribe to a trip channel identified by `tripId`?
   *
   * True if any of the parent's wards has a TransportAttendance row for
   * the trip (the ward is expected to board/alight on that trip today).
   *
   * NOTE: TransportAttendance is per-trip-per-student-per-day; we do not
   * filter by date here because a parent subscribing to "trip:01HTRIP"
   * wants ongoing updates for that route's trips, not just today's. The
   * trip enrolls a ward if ANY TransportAttendance row links them.
   */
  async canParentAccessTrip(userId: string, tripId: string): Promise<boolean> {
    const cacheKey = `ws:scope:trip-parent:${userId}:${tripId}`;
    const cached = await this.cache.get<boolean>(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const guardian = await this.prisma.guardian.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!guardian) {
        await this.cache.set(cacheKey, false, SCOPE_TTL_SECONDS);
        return false;
      }

      const wardLinks = await this.prisma.studentGuardian.findMany({
        where: { guardianId: guardian.id },
        select: { studentId: true },
      });
      if (wardLinks.length === 0) {
        await this.cache.set(cacheKey, false, SCOPE_TTL_SECONDS);
        return false;
      }

      const ta = await this.prisma.transportAttendance.findFirst({
        where: {
          studentId: { in: wardLinks.map((l) => l.studentId) },
          tripId,
        },
        select: { id: true },
      });
      const ok = ta !== null;
      await this.cache.set(cacheKey, ok, SCOPE_TTL_SECONDS);
      return ok;
    } catch (err) {
      this.logger.error(
        `canParentAccessTrip DB error for user=${userId} trip=${tripId}: ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Invalidate specific cached scope entries for a user.
   *
   * Callers must pass the (userId, resourceId) pairs they know have
   * changed — e.g., when a teacher is removed from SectionTeacher for
   * section 01HSEC, the HR module calls:
   *
   *   invalidate([
   *     { check: 'section', userId, resourceId: '01HSEC' },
   *   ])
   *
   * A blanket "invalidate everything for this user" would require a
   * Redis SCAN, which we avoid on the hot path. Stale entries expire
   * naturally after SCOPE_TTL_SECONDS (60s) — acceptable per the
   * Wave 16.0 design doc.
   */
  async invalidate(
    entries: Array<{ check: 'section' | 'section-parent' | 'trip-parent'; userId: string; resourceId: string }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const keys = entries.map(
      (e) => `ws:scope:${e.check}:${e.userId}:${e.resourceId}`,
    );
    try {
      await this.cache.invalidateMany(keys);
    } catch (err) {
      this.logger.warn(
        `invalidate failed for ${keys.length} key(s): ${(err as Error).message}`,
      );
    }
  }
}
