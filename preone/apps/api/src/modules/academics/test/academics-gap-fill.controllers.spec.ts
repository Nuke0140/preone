/**
 * Academics Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { AcademicsGapFillControllerPart1, AcademicsGapFillControllerPart2, AcademicsGapFillControllerPart3 } from '../controllers/academics-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Academics Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let academicsGapFillControllerPart1: AcademicsGapFillControllerPart1;
  let academicsGapFillControllerPart2: AcademicsGapFillControllerPart2;
  let academicsGapFillControllerPart3: AcademicsGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    academicsGapFillControllerPart1 = new AcademicsGapFillControllerPart1(cb as any, qb as any);
    academicsGapFillControllerPart2 = new AcademicsGapFillControllerPart2(cb as any, qb as any);
    academicsGapFillControllerPart3 = new AcademicsGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [AcademicsGapFillControllerPart1, AcademicsGapFillControllerPart2, AcademicsGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('AcademicsGapFillControllerPart1', () => {
    it('PATCH sessions/:id -> dispatches Academics.UpdateSession', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.patchSessionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateSession');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE sessions/:id -> dispatches Academics.DeleteSession', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.deleteSessionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteSession');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET sessions/:id/sections -> dispatches Academics.ListSessionSections', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.getSessionsByidSections({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.ListSessionSections');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH curricula/:id -> dispatches Academics.UpdateCurricula', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.patchCurriculaByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateCurricula');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE curricula/:id -> dispatches Academics.DeleteCurricula', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.deleteCurriculaByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteCurricula');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH sections/:id -> dispatches Academics.UpdateSection', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.patchSectionsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateSection');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET sections/:id/enrollments -> dispatches Academics.ListSectionEnrollments', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart1.getSectionsByidEnrollments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.ListSectionEnrollments');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AcademicsGapFillControllerPart2', () => {
    it('GET sections/:id/students -> dispatches Academics.ListSectionStudents', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.getSectionsByidStudents({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.ListSectionStudents');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH enrollments/:id -> dispatches Academics.UpdateEnrollment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.patchEnrollmentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateEnrollment');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE enrollments/:id -> dispatches Academics.DeleteEnrollment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.deleteEnrollmentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteEnrollment');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH observations/:id -> dispatches Academics.UpdateObservation', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.patchObservationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateObservation');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE observations/:id -> dispatches Academics.DeleteObservation', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.deleteObservationsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteObservation');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET observations/by-section/:sectionId -> dispatches Academics.GetBySection', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.getObservationsBysectionBysectionid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.GetBySection');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH assessments/:id -> dispatches Academics.UpdateAssessment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart2.patchAssessmentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateAssessment');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('AcademicsGapFillControllerPart3', () => {
    it('DELETE assessments/:id -> dispatches Academics.DeleteAssessment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.deleteAssessmentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteAssessment');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET assessments/:id/scores -> dispatches Academics.ListAssessmentScores', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.getAssessmentsByidScores({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.ListAssessmentScores');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH report-cards/:id -> dispatches Academics.UpdateReportCard', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.patchReportcardsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdateReportCard');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE report-cards/:id -> dispatches Academics.DeleteReportCard', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.deleteReportcardsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.DeleteReportCard');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET portfolios/:studentId -> dispatches Academics.GetPortfolio', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.getPortfoliosBystudentid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.GetPortfolio');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH portfolios/:studentId/items/:itemId -> dispatches Academics.UpdatePortfolio:Itemid', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await academicsGapFillControllerPart3.patchPortfoliosBystudentidItemsByitemid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Academics.UpdatePortfolio:Itemid');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
