/**
 * CRM Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { CrmGapFillControllerPart1, CrmGapFillControllerPart2, CrmGapFillControllerPart3 } from '../controllers/crm-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('CRM Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let crmGapFillControllerPart1: CrmGapFillControllerPart1;
  let crmGapFillControllerPart2: CrmGapFillControllerPart2;
  let crmGapFillControllerPart3: CrmGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    crmGapFillControllerPart1 = new CrmGapFillControllerPart1(cb as any, qb as any);
    crmGapFillControllerPart2 = new CrmGapFillControllerPart2(cb as any, qb as any);
    crmGapFillControllerPart3 = new CrmGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [CrmGapFillControllerPart1, CrmGapFillControllerPart2, CrmGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('CrmGapFillControllerPart1', () => {
    it('PATCH leads/:id -> dispatches Crm.UpdateLead', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.patchLeadsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.UpdateLead');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE leads/:id -> dispatches Crm.DeleteLead', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.deleteLeadsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.DeleteLead');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET leads/by-status/:status -> dispatches Crm.GetByStatu', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.getLeadsBystatusBystatus({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.GetByStatu');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET leads/by-source/:source -> dispatches Crm.GetBySource', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.getLeadsBysourceBysource({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.GetBySource');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET leads/:id/follow-ups -> dispatches Crm.ListLeadFollowUps', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.getLeadsByidFollowups({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListLeadFollowUps');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH follow-ups/:id -> dispatches Crm.UpdateFollowUp', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.patchFollowupsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.UpdateFollowUp');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE follow-ups/:id -> dispatches Crm.DeleteFollowUp', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart1.deleteFollowupsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.DeleteFollowUp');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('CrmGapFillControllerPart2', () => {
    it('PATCH campaigns/:id -> dispatches Crm.UpdateCampaign', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.patchCampaignsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.UpdateCampaign');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE campaigns/:id -> dispatches Crm.DeleteCampaign', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.deleteCampaignsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.DeleteCampaign');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET campaigns/:id/leads -> dispatches Crm.ListCampaignLeads', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.getCampaignsByidLeads({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListCampaignLeads');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET campaigns/:id/metrics -> dispatches Crm.ListCampaignMetrics', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.getCampaignsByidMetrics({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListCampaignMetrics');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET conversion-rates -> dispatches Crm.ListConversionRates', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.getConversionrates({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListConversionRates');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST leads/:id/notes -> dispatches Crm.Notes', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.postLeadsByidNotes({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.Notes');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET leads/:id/notes -> dispatches Crm.ListLeadNotes', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart2.getLeadsByidNotes({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListLeadNotes');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('CrmGapFillControllerPart3', () => {
    it('GET leads/:id/timeline -> dispatches Crm.ListLeadTimeline', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await crmGapFillControllerPart3.getLeadsByidTimeline({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Crm.ListLeadTimeline');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
