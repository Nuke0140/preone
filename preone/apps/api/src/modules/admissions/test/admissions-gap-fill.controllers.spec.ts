/**
 * Admissions Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { AdmissionsGapFillControllerPart1, AdmissionsGapFillControllerPart2, AdmissionsGapFillControllerPart3 } from '../controllers/admissions-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Admissions Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let admissionsGapFillControllerPart1: AdmissionsGapFillControllerPart1;
  let admissionsGapFillControllerPart2: AdmissionsGapFillControllerPart2;
  let admissionsGapFillControllerPart3: AdmissionsGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    admissionsGapFillControllerPart1 = new AdmissionsGapFillControllerPart1(cb as any, qb as any);
    admissionsGapFillControllerPart2 = new AdmissionsGapFillControllerPart2(cb as any, qb as any);
    admissionsGapFillControllerPart3 = new AdmissionsGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [AdmissionsGapFillControllerPart1, AdmissionsGapFillControllerPart2, AdmissionsGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('AdmissionsGapFillControllerPart1', () => {
    it('PATCH applications/:id -> dispatches Admissions.UpdateApplication', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.patchApplicationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.UpdateApplication');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE applications/:id -> dispatches Admissions.DeleteApplication', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.deleteApplicationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.DeleteApplication');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET applications/:id/documents -> dispatches Admissions.ListApplicationDocuments', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.getApplicationsByidDocuments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.ListApplicationDocuments');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE applications/:id/documents/:docId -> dispatches Admissions.DeleteApplication', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.deleteApplicationsByidDocumentsBydocid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.DeleteApplication');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH applications/:id/counselling -> dispatches Admissions.UpdateApplicationCounselling', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.patchApplicationsByidCounselling({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.UpdateApplicationCounselling');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET applications/:id/offers -> dispatches Admissions.ListApplicationOffers', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.getApplicationsByidOffers({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.ListApplicationOffers');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST applications/:id/notes -> dispatches Admissions.Notes', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart1.postApplicationsByidNotes({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.Notes');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AdmissionsGapFillControllerPart2', () => {
    it('GET applications/:id/notes -> dispatches Admissions.ListApplicationNotes', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.getApplicationsByidNotes({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.ListApplicationNotes');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET applications/:id/timeline -> dispatches Admissions.ListApplicationTimeline', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.getApplicationsByidTimeline({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.ListApplicationTimeline');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET waiting-list/:id -> dispatches Admissions.GetWaitingList', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.getWaitinglistByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.GetWaitingList');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH waiting-list/:id -> dispatches Admissions.UpdateWaitingList', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.patchWaitinglistByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.UpdateWaitingList');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST applications/:id/sibling-verification -> dispatches Admissions.SiblingVerification', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.postApplicationsByidSiblingverification({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.SiblingVerification');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET applications/by-status/:status -> dispatches Admissions.GetByStatu', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.getApplicationsBystatusBystatus({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.GetByStatu');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET applications/by-counsellor/:counsellorId -> dispatches Admissions.GetByCounsellor', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart2.getApplicationsBycounsellorBycounsellorid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.GetByCounsellor');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AdmissionsGapFillControllerPart3', () => {
    it('GET stats -> dispatches Admissions.ListStats', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await admissionsGapFillControllerPart3.getStats({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Admissions.ListStats');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
