/**
 * Finance Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { FinanceGapFillControllerPart1, FinanceGapFillControllerPart2, FinanceGapFillControllerPart3 } from '../controllers/finance-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Finance Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let financeGapFillControllerPart1: FinanceGapFillControllerPart1;
  let financeGapFillControllerPart2: FinanceGapFillControllerPart2;
  let financeGapFillControllerPart3: FinanceGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    financeGapFillControllerPart1 = new FinanceGapFillControllerPart1(cb as any, qb as any);
    financeGapFillControllerPart2 = new FinanceGapFillControllerPart2(cb as any, qb as any);
    financeGapFillControllerPart3 = new FinanceGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [FinanceGapFillControllerPart1, FinanceGapFillControllerPart2, FinanceGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('FinanceGapFillControllerPart1', () => {
    it('PATCH fee-plans/:id -> dispatches Finance.UpdateFeePlan', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.patchFeeplansByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.UpdateFeePlan');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE fee-plans/:id -> dispatches Finance.DeleteFeePlan', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.deleteFeeplansByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.DeleteFeePlan');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET fee-plans/:id/students -> dispatches Finance.ListFeePlanStudents', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.getFeeplansByidStudents({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.ListFeePlanStudents');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH invoices/:id -> dispatches Finance.UpdateInvoice', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.patchInvoicesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.UpdateInvoice');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE invoices/:id -> dispatches Finance.DeleteInvoice', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.deleteInvoicesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.DeleteInvoice');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET invoices/overdue -> dispatches Finance.ListOverdue', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.getInvoicesOverdue({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.ListOverdue');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET invoices/by-student/:studentId -> dispatches Finance.GetByStudent', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart1.getInvoicesBystudentBystudentid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.GetByStudent');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('FinanceGapFillControllerPart2', () => {
    it('GET invoices/:id/payments -> dispatches Finance.ListInvoicePayments', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.getInvoicesByidPayments({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.ListInvoicePayments');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH payments/:id -> dispatches Finance.UpdatePayment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.patchPaymentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.UpdatePayment');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE payments/:id -> dispatches Finance.DeletePayment', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.deletePaymentsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.DeletePayment');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET payments/by-date/:date -> dispatches Finance.GetByDate', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.getPaymentsBydateBydate({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.GetByDate');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH refunds/:id -> dispatches Finance.UpdateRefund', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.patchRefundsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.UpdateRefund');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE refunds/:id -> dispatches Finance.DeleteRefund', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.deleteRefundsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.DeleteRefund');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET receipts -> dispatches Finance.ListReceipts', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart2.getReceipts({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.ListReceipts');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('FinanceGapFillControllerPart3', () => {
    it('GET receipts/:id -> dispatches Finance.GetReceipt', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await financeGapFillControllerPart3.getReceiptsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Finance.GetReceipt');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
