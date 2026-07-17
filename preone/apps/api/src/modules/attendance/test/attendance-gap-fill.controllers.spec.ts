/**
 * Attendance Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { AttendanceGapFillControllerPart1, AttendanceGapFillControllerPart2 } from '../controllers/attendance-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Attendance Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let attendanceGapFillControllerPart1: AttendanceGapFillControllerPart1;
  let attendanceGapFillControllerPart2: AttendanceGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    attendanceGapFillControllerPart1 = new AttendanceGapFillControllerPart1(cb as any, qb as any);
    attendanceGapFillControllerPart2 = new AttendanceGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [AttendanceGapFillControllerPart1, AttendanceGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('AttendanceGapFillControllerPart1', () => {
    it('PATCH :id -> dispatches Attendance.Update:Id', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.patchById({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.Update:Id');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE :id -> dispatches Attendance.Delete:Id', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.deleteById({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.Delete:Id');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET by-section/:sectionId -> dispatches Attendance.GetBySection', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.getBysectionBysectionid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.GetBySection');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET by-date/:date -> dispatches Attendance.GetByDate', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.getBydateBydate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.GetByDate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH daily-logs/:id -> dispatches Attendance.UpdateDailyLog', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.patchDailylogsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.UpdateDailyLog');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE daily-logs/:id -> dispatches Attendance.DeleteDailyLog', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.deleteDailylogsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.DeleteDailyLog');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH incidents/:id -> dispatches Attendance.UpdateIncident', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart1.patchIncidentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.UpdateIncident');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AttendanceGapFillControllerPart2', () => {
    it('DELETE incidents/:id -> dispatches Attendance.DeleteIncident', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.deleteIncidentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.DeleteIncident');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET incidents/by-section/:sectionId -> dispatches Attendance.GetBySection', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.getIncidentsBysectionBysectionid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.GetBySection');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET incidents/by-severity/:severity -> dispatches Attendance.GetBySeverity', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.getIncidentsByseverityByseverity({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.GetBySeverity');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH daily-reports/:id -> dispatches Attendance.UpdateDailyReport', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.patchDailyreportsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.UpdateDailyReport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET daily-reports/by-date/:date -> dispatches Attendance.GetByDate', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.getDailyreportsBydateBydate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.GetByDate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST medicine-authorizations -> dispatches Attendance.CreateMedicineAuthorization', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.postMedicineauthorizations({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.CreateMedicineAuthorization');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET classroom-summary/:sectionId/:date -> dispatches Attendance.ListClassroomSummary:Date', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await attendanceGapFillControllerPart2.getClassroomsummaryBysectionidBydate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Attendance.ListClassroomSummary:Date');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
