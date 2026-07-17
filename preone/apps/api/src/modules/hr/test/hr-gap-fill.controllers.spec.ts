/**
 * HR Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { HrGapFillControllerPart1, HrGapFillControllerPart2, HrGapFillControllerPart3 } from '../controllers/hr-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('HR Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let hrGapFillControllerPart1: HrGapFillControllerPart1;
  let hrGapFillControllerPart2: HrGapFillControllerPart2;
  let hrGapFillControllerPart3: HrGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    hrGapFillControllerPart1 = new HrGapFillControllerPart1(cb as any, qb as any);
    hrGapFillControllerPart2 = new HrGapFillControllerPart2(cb as any, qb as any);
    hrGapFillControllerPart3 = new HrGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [HrGapFillControllerPart1, HrGapFillControllerPart2, HrGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('HrGapFillControllerPart1', () => {
    it('PATCH employees/:id -> dispatches Hr.UpdateEmployee', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.patchEmployeesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.UpdateEmployee');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE employees/:id -> dispatches Hr.DeleteEmployee', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.deleteEmployeesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.DeleteEmployee');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST employees/:id/link-user -> dispatches Hr.LinkUser', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.postEmployeesByidLinkuser({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.LinkUser');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET employees/:id/payrolls -> dispatches Hr.ListEmployeePayrolls', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.getEmployeesByidPayrolls({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.ListEmployeePayrolls');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET employees/:id/reviews -> dispatches Hr.ListEmployeeReviews', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.getEmployeesByidReviews({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.ListEmployeeReviews');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH leaves/:id -> dispatches Hr.UpdateLeave', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.patchLeavesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.UpdateLeave');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE leaves/:id -> dispatches Hr.DeleteLeave', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart1.deleteLeavesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.DeleteLeave');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('HrGapFillControllerPart2', () => {
    it('GET leaves/by-status/:status -> dispatches Hr.GetByStatu', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.getLeavesBystatusBystatus({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.GetByStatu');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH payrolls/:id -> dispatches Hr.UpdatePayroll', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.patchPayrollsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.UpdatePayroll');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST payrolls/:id/cancel -> dispatches Hr.Cancel', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.postPayrollsByidCancel({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.Cancel');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET payrolls/:id/payslips -> dispatches Hr.ListPayrollPayslips', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.getPayrollsByidPayslips({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.ListPayrollPayslips');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH reviews/:id -> dispatches Hr.UpdateReview', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.patchReviewsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.UpdateReview');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('POST reviews/:id/cancel -> dispatches Hr.Cancel', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.postReviewsByidCancel({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.Cancel');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET positions -> dispatches Hr.ListPositions', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart2.getPositions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.ListPositions');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('HrGapFillControllerPart3', () => {
    it('POST positions -> dispatches Hr.CreatePosition', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await hrGapFillControllerPart3.postPositions({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Hr.CreatePosition');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
