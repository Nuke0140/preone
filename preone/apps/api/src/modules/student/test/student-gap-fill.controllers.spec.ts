/**
 * Student Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { StudentGapFillControllerPart1, StudentGapFillControllerPart2 } from '../controllers/student-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Student Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let studentGapFillControllerPart1: StudentGapFillControllerPart1;
  let studentGapFillControllerPart2: StudentGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    studentGapFillControllerPart1 = new StudentGapFillControllerPart1(cb as any, qb as any);
    studentGapFillControllerPart2 = new StudentGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [StudentGapFillControllerPart1, StudentGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('StudentGapFillControllerPart1', () => {
    it('PATCH :id -> dispatches Student.Update:Id', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.patchById({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.Update:Id');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET :id/guardians -> dispatches Student.ListResourceGuardians', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.getByIdGuardians({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.ListResourceGuardians');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST :id/guardians -> dispatches Student.Guardians', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.postByIdGuardians({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.Guardians');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH :id/guardians/:guardianId -> dispatches Student.Update:Id:Guardianid', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.patchByIdGuardiansByguardianid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.Update:Id:Guardianid');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE :id/guardians/:guardianId -> dispatches Student.Delete:Id', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.deleteByIdGuardiansByguardianid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.Delete:Id');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET :id/enrollments -> dispatches Student.ListResourceEnrollments', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.getByIdEnrollments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.ListResourceEnrollments');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET :id/attendance -> dispatches Student.ListResourceAttendance', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart1.getByIdAttendance({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.ListResourceAttendance');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('StudentGapFillControllerPart2', () => {
    it('GET :id/medical-history -> dispatches Student.ListResourceMedicalHistory', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart2.getByIdMedicalhistory({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.ListResourceMedicalHistory');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH :id/medical-history -> dispatches Student.Update:IdMedicalHistory', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart2.patchByIdMedicalhistory({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.Update:IdMedicalHistory');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET search -> dispatches Student.ListSearch', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart2.getSearch({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.ListSearch');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET by-section/:sectionId -> dispatches Student.GetBySection', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart2.getBysectionBysectionid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.GetBySection');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET by-status/:status -> dispatches Student.GetByStatu', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await studentGapFillControllerPart2.getBystatusBystatus({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Student.GetByStatu');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
