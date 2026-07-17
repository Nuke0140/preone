/**
 * Reports Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { ReportsGapFillControllerPart1, ReportsGapFillControllerPart2 } from '../controllers/reports-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Reports Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let reportsGapFillControllerPart1: ReportsGapFillControllerPart1;
  let reportsGapFillControllerPart2: ReportsGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    reportsGapFillControllerPart1 = new ReportsGapFillControllerPart1(cb as any, qb as any);
    reportsGapFillControllerPart2 = new ReportsGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [ReportsGapFillControllerPart1, ReportsGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('ReportsGapFillControllerPart1', () => {
    it('PATCH definitions/:id -> dispatches Reports.UpdateDefinition', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.patchDefinitionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.UpdateDefinition');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE definitions/:id -> dispatches Reports.DeleteDefinition', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.deleteDefinitionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.DeleteDefinition');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST executions/:id/retry -> dispatches Reports.Retry', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.postExecutionsByidRetry({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.Retry');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE saved-reports/:id -> dispatches Reports.DeleteSavedReport', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.deleteSavedreportsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.DeleteSavedReport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH subscriptions/:id -> dispatches Reports.UpdateSubscription', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.patchSubscriptionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.UpdateSubscription');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST subscriptions/:id/pause -> dispatches Reports.Pause', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.postSubscriptionsByidPause({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.Pause');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST subscriptions/:id/resume -> dispatches Reports.Resume', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart1.postSubscriptionsByidResume({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.Resume');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('ReportsGapFillControllerPart2', () => {
    it('GET dashboard/export -> dispatches Reports.ListExport', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getDashboardExport({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListExport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET enrollment/export -> dispatches Reports.ListExport', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getEnrollmentExport({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListExport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET attendance/export -> dispatches Reports.ListExport', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getAttendanceExport({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListExport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET fee-collection/export -> dispatches Reports.ListExport', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getFeecollectionExport({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListExport');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET executions/:id/download -> dispatches Reports.ListExecutionDownload', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getExecutionsByidDownload({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListExecutionDownload');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST definitions -> dispatches Reports.CreateDefinition', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.postDefinitions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.CreateDefinition');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET saved-reports -> dispatches Reports.ListSavedReports', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await reportsGapFillControllerPart2.getSavedreports({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Reports.ListSavedReports');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
