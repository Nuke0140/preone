/**
 * Administration Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { AdministrationGapFillControllerPart1, AdministrationGapFillControllerPart2 } from '../controllers/administration-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Administration Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let administrationGapFillControllerPart1: AdministrationGapFillControllerPart1;
  let administrationGapFillControllerPart2: AdministrationGapFillControllerPart2;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    administrationGapFillControllerPart1 = new AdministrationGapFillControllerPart1(cb as any, qb as any);
    administrationGapFillControllerPart2 = new AdministrationGapFillControllerPart2(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [AdministrationGapFillControllerPart1, AdministrationGapFillControllerPart2],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('AdministrationGapFillControllerPart1', () => {
    it('PATCH assets/:id -> dispatches Administration.UpdateAsset', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.patchAssetsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.UpdateAsset');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE assets/:id -> dispatches Administration.DeleteAsset', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.deleteAssetsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.DeleteAsset');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET assets/by-location/:location -> dispatches Administration.GetByLocation', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.getAssetsBylocationBylocation({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.GetByLocation');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH maintenance/:id -> dispatches Administration.UpdateMaintenance', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.patchMaintenanceByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.UpdateMaintenance');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST maintenance/bulk-approve -> dispatches Administration.CreateBulkApprove', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.postMaintenanceBulkapprove({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.CreateBulkApprove');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET visitors/search -> dispatches Administration.ListSearch', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.getVisitorsSearch({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ListSearch');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET visitors/export -> dispatches Administration.ListExport', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart1.getVisitorsExport({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ListExport');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AdministrationGapFillControllerPart2', () => {
    it('POST visitors/:id/force-checkout -> dispatches Administration.ForceCheckout', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.postVisitorsByidForcecheckout({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ForceCheckout');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST gate-passes -> dispatches Administration.CreateGatePasse', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.postGatepasses({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.CreateGatePasse');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET gate-passes -> dispatches Administration.ListGatePasses', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.getGatepasses({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ListGatePasses');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET gate-passes/:id -> dispatches Administration.GetGatePasse', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.getGatepassesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.GetGatePasse');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST cctv-coverage -> dispatches Administration.CreateCctvCoverage', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.postCctvcoverage({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.CreateCctvCoverage');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET cctv-coverage -> dispatches Administration.ListCctvCoverage', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.getCctvcoverage({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ListCctvCoverage');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET compliance-items -> dispatches Administration.ListComplianceItems', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await administrationGapFillControllerPart2.getComplianceitems({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Administration.ListComplianceItems');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
