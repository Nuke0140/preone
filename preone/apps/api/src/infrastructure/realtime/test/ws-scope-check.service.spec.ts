/**
 * Unit tests for WsScopeCheckService (Wave 16.1).
 *
 * Verifies the three DB-backed scope checks (teacher/section, parent/section,
 * parent/trip) and the cache + fail-closed behaviour. Prisma + Cache are
 * mocked — these tests do NOT touch a real database or Redis.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { WsScopeCheckService } from '../subscription/ws-scope-check.service';

/** Minimal Prisma mock — only the methods the service uses. */
function makePrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    sectionTeacher: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    guardian: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    studentGuardian: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    enrollment: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    transportAttendance: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    ...overrides,
  } as any;
}

/** Minimal Cache mock — get/set/invalidateMany. */
function makeCacheMock(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    invalidateMany: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('WsScopeCheckService', () => {
  let svc: WsScopeCheckService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let cache: ReturnType<typeof makeCacheMock>;

  beforeEach(() => {
    prisma = makePrismaMock();
    cache = makeCacheMock();
    svc = new WsScopeCheckService(prisma, cache);
  });

  describe('canTeacherAccessSection', () => {
    it('should return true when SectionTeacher row exists', async () => {
      prisma.sectionTeacher.findFirst.mockResolvedValueOnce({ id: '01HST' });
      const ok = await svc.canTeacherAccessSection('01HTEACH', '01HSEC');
      expect(ok).toBe(true);
      expect(prisma.sectionTeacher.findFirst).toHaveBeenCalledWith({
        where: { teacherId: '01HTEACH', sectionId: '01HSEC', removedAt: null },
        select: { id: true },
      });
    });

    it('should return false when no SectionTeacher row exists', async () => {
      prisma.sectionTeacher.findFirst.mockResolvedValueOnce(null);
      const ok = await svc.canTeacherAccessSection('01HTEACH', '01HSEC');
      expect(ok).toBe(false);
    });

    it('should return cached value on second call (no second DB hit)', async () => {
      // First call: cache miss → DB hit → cache set.
      prisma.sectionTeacher.findFirst.mockResolvedValueOnce({ id: '01HST' });
      // On the second call, the cache mock should return the cached value.
      cache.get.mockResolvedValueOnce(undefined); // first call: miss
      cache.get.mockResolvedValueOnce(true);      // second call: hit
      await svc.canTeacherAccessSection('01HTEACH', '01HSEC');
      await svc.canTeacherAccessSection('01HTEACH', '01HSEC');
      expect(prisma.sectionTeacher.findFirst).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalledWith(
        'ws:scope:section:01HTEACH:01HSEC',
        true,
        60,
      );
    });

    it('should fail-closed (return false) on DB error', async () => {
      prisma.sectionTeacher.findFirst.mockRejectedValueOnce(new Error('DB down'));
      const ok = await svc.canTeacherAccessSection('01HTEACH', '01HSEC');
      expect(ok).toBe(false);
    });
  });

  describe('canParentAccessSection', () => {
    it('should return false when user has no Guardian record', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce(null);
      const ok = await svc.canParentAccessSection('01HPAR', '01HSEC');
      expect(ok).toBe(false);
    });

    it('should return false when Guardian has no ward links', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce({ id: '01HGRD' });
      prisma.studentGuardian.findMany.mockResolvedValueOnce([]);
      const ok = await svc.canParentAccessSection('01HPAR', '01HSEC');
      expect(ok).toBe(false);
    });

    it('should return true when a ward is ENROLLED in the section', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce({ id: '01HGRD' });
      prisma.studentGuardian.findMany.mockResolvedValueOnce([
        { studentId: '01HSTU1' },
      ]);
      prisma.enrollment.findFirst.mockResolvedValueOnce({ id: '01HENR' });
      const ok = await svc.canParentAccessSection('01HPAR', '01HSEC');
      expect(ok).toBe(true);
      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
        where: {
          studentId: { in: ['01HSTU1'] },
          sectionId: '01HSEC',
          status: 'ENROLLED',
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should return false when no ward is enrolled in the section', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce({ id: '01HGRD' });
      prisma.studentGuardian.findMany.mockResolvedValueOnce([
        { studentId: '01HSTU1' },
      ]);
      prisma.enrollment.findFirst.mockResolvedValueOnce(null);
      const ok = await svc.canParentAccessSection('01HPAR', '01HSEC');
      expect(ok).toBe(false);
    });

    it('should fail-closed on DB error', async () => {
      prisma.guardian.findFirst.mockRejectedValueOnce(new Error('DB down'));
      const ok = await svc.canParentAccessSection('01HPAR', '01HSEC');
      expect(ok).toBe(false);
    });
  });

  describe('canParentAccessTrip', () => {
    it('should return true when a ward has a TransportAttendance row for the trip', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce({ id: '01HGRD' });
      prisma.studentGuardian.findMany.mockResolvedValueOnce([
        { studentId: '01HSTU1' },
      ]);
      prisma.transportAttendance.findFirst.mockResolvedValueOnce({ id: '01HTA' });
      const ok = await svc.canParentAccessTrip('01HPAR', '01HTRP');
      expect(ok).toBe(true);
      expect(prisma.transportAttendance.findFirst).toHaveBeenCalledWith({
        where: {
          studentId: { in: ['01HSTU1'] },
          tripId: '01HTRP',
        },
        select: { id: true },
      });
    });

    it('should return false when no TransportAttendance row exists', async () => {
      prisma.guardian.findFirst.mockResolvedValueOnce({ id: '01HGRD' });
      prisma.studentGuardian.findMany.mockResolvedValueOnce([
        { studentId: '01HSTU1' },
      ]);
      prisma.transportAttendance.findFirst.mockResolvedValueOnce(null);
      const ok = await svc.canParentAccessTrip('01HPAR', '01HTRP');
      expect(ok).toBe(false);
    });

    it('should fail-closed on DB error', async () => {
      prisma.guardian.findFirst.mockRejectedValueOnce(new Error('DB down'));
      const ok = await svc.canParentAccessTrip('01HPAR', '01HTRP');
      expect(ok).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should call cache.invalidateMany with the derived keys', async () => {
      await svc.invalidate([
        { check: 'section', userId: '01HTEACH', resourceId: '01HSEC' },
        { check: 'trip-parent', userId: '01HPAR', resourceId: '01HTRP' },
      ]);
      expect(cache.invalidateMany).toHaveBeenCalledWith([
        'ws:scope:section:01HTEACH:01HSEC',
        'ws:scope:trip-parent:01HPAR:01HTRP',
      ]);
    });

    it('should be a no-op when given an empty list', async () => {
      await svc.invalidate([]);
      expect(cache.invalidateMany).not.toHaveBeenCalled();
    });
  });
});
