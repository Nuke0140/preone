/**
 * Unit tests for SchoolService — orchestrates school lifecycle.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchoolService } from '@modules/identity/application/services/school.service';
import { SchoolAggregate, type SchoolProps } from '@modules/identity/domain/aggregates/school.aggregate';
import { ConflictException, NotFoundException, BusinessException } from '@common/errors/exceptions';

function makeSchool(overrides: Partial<SchoolProps> = {}): SchoolAggregate {
  // Use direct construction to allow branchCount/usedSeats overrides
  // (the factory always resets them to 0)
  const props: SchoolProps = {
    name: 'Little Stars',
    email: 'owner@littlestars.in',
    phone: '+919876543210',
    tier: 'STARTER',
    status: 'PROSPECT',
    branchCount: 0,
    maxBranches: 1,
    studentSeats: 100,
    usedSeats: 0,
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    ...overrides,
  };
  return new SchoolAggregate(props, undefined, 1);
}

function buildService(schools?: SchoolAggregate[]) {
  const map = new Map<string, SchoolAggregate>();
  if (schools) for (const s of schools) map.set(s.id, s);

  const repo = {
    findById: vi.fn(async (id: string) => map.get(id)),
    findByIds: vi.fn(async (ids: readonly string[]) => ids.map((id) => map.get(id)).filter(Boolean)),
    findByEmail: vi.fn(async (email: string) => {
      for (const s of map.values()) {
        if (s.email.toLowerCase() === email.toLowerCase()) return s;
      }
      return undefined;
    }),
    findByGstNumber: vi.fn(async (gst: string) => {
      for (const s of map.values()) if (s.gstNumber === gst) return s;
      return undefined;
    }),
    findByPhone: vi.fn(async (phone: string) => {
      for (const s of map.values()) if (s.phone === phone) return s;
      return undefined;
    }),
    list: vi.fn(async (_filter: any, page: number, pageSize: number) => ({
      items: Array.from(map.values()).slice((page - 1) * pageSize, page * pageSize),
      total: map.size,
    })),
    listByStatus: vi.fn(async () => ({ items: [], total: 0 })),
    exists: vi.fn(async (id: string) => map.has(id)),
    save: vi.fn(async (s: SchoolAggregate) => { map.set(s.id, s); }),
    delete: vi.fn(async (s: SchoolAggregate) => { s['_props'].deletedAt = new Date().toISOString(); map.set(s.id, s); }),
  };
  return { service: new SchoolService(repo as any), repo, map };
}

describe('SchoolService', () => {
  let svc: SchoolService;
  let repo: any;

  beforeEach(() => {
    const r = buildService();
    svc = r.service;
    repo = r.repo;
  });

  describe('createSchool()', () => {
    it('should create + start trial + persist', async () => {
      const result = await svc.createSchool({
        name: 'New School',
        email: 'new@school.in',
        phone: '+919999999999',
        tier: 'STARTER',
      }, 'admin-001');

      expect(result.name).toBe('New School');
      expect(result.status).toBe('TRIAL');
      expect(result.trialEndsAt).toBeDefined();
      expect(repo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email', async () => {
      const existing = makeSchool();
      repo.findByEmail.mockResolvedValueOnce(existing);
      await expect(svc.createSchool({
        name: 'New School',
        email: 'owner@littlestars.in',
        phone: '+919999999999',
        tier: 'STARTER',
      }, 'admin-001')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on duplicate GST', async () => {
      const existing = makeSchool({ gstNumber: '27ABCDE1234F1Z5' });
      repo.findByGstNumber.mockResolvedValueOnce(existing);
      await expect(svc.createSchool({
        name: 'New',
        email: 'new@school.in',
        phone: '+919999999999',
        tier: 'STARTER',
        gstNumber: '27ABCDE1234F1Z5',
      }, 'admin-001')).rejects.toThrow(ConflictException);
    });

    it('should apply tier limits for GROWTH plan', async () => {
      const result = await svc.createSchool({
        name: 'Growth School',
        email: 'growth@school.in',
        phone: '+919999999999',
        tier: 'GROWTH',
      }, 'admin-001');
      expect(result.maxBranches).toBe(3);
      expect(result.studentSeats).toBe(500);
    });
  });

  describe('getSchool()', () => {
    it('should return school by ID', async () => {
      const school = makeSchool();
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.getSchool(school.id);
      expect(result.id).toBe(school.id);
    });

    it('should throw NotFoundException for unknown ID', async () => {
      await expect(svc.getSchool('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted school', async () => {
      const deleted = makeSchool();
      deleted['_props'].deletedAt = new Date().toISOString();
      repo.findById.mockResolvedValueOnce(deleted);
      await expect(svc.getSchool(deleted.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateSchool()', () => {
    it('should transition TRIAL → ACTIVE', async () => {
      const school = makeSchool({ status: 'TRIAL' });
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.activateSchool(school.id);
      expect(result.status).toBe('ACTIVE');
      expect(result.activatedAt).toBeDefined();
    });
  });

  describe('suspendSchool()', () => {
    it('should transition ACTIVE → SUSPENDED with reason', async () => {
      const school = makeSchool({ status: 'ACTIVE' });
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.suspendSchool(school.id, { reason: 'Payment overdue' });
      expect(result.status).toBe('SUSPENDED');
      expect(result.suspendedAt).toBeDefined();
    });
  });

  describe('reactivateSchool()', () => {
    it('should transition SUSPENDED → ACTIVE', async () => {
      const school = makeSchool({ status: 'SUSPENDED' });
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.reactivateSchool(school.id);
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('cancelSchool()', () => {
    it('should transition to CANCELLED', async () => {
      const school = makeSchool({ status: 'ACTIVE' });
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.cancelSchool(school.id);
      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBeDefined();
    });
  });

  describe('upgradeTier()', () => {
    it('should upgrade STARTER → SCALE', async () => {
      const school = makeSchool({ tier: 'STARTER' });
      repo.findById.mockResolvedValueOnce(school);
      const result = await svc.upgradeTier(school.id, 'SCALE');
      expect(result.tier).toBe('SCALE');
      expect(result.maxBranches).toBe(10);
      expect(result.studentSeats).toBe(2500);
    });
  });

  describe('listSchools()', () => {
    it('should return paginated list', async () => {
      const schools = [makeSchool(), makeSchool({ email: 'b@x.in' }), makeSchool({ email: 'c@x.in' })];
      const r2 = buildService(schools);
      const result = await r2.service.listSchools({ page: 1, pageSize: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasNext).toBe(true);
    });
  });

  describe('incrementBranchCount()', () => {
    it('should bump school.branchCount', async () => {
      const school = makeSchool();
      repo.findById.mockResolvedValueOnce(school);
      await svc.incrementBranchCount(school.id);
      expect(school.branchCount).toBe(1);
    });

    it('should throw when max branches reached', async () => {
      const school = makeSchool({ branchCount: 1, maxBranches: 1 });
      repo.findById.mockResolvedValueOnce(school);
      await expect(svc.incrementBranchCount(school.id)).rejects.toThrow();
    });
  });
});
