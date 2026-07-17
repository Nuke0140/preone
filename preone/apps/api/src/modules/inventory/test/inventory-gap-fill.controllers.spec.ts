/**
 * Inventory Gap-Fill Controller Specs — Wave 21.
 *
 * Verifies route shape + envelope contract for each new endpoint. Uses an
 * in-memory CommandBus/QueryBus stub that records dispatched messages so the
 * test can assert the controller routes to the correct CQRS type.
 */
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { InventoryGapFillControllerPart1, InventoryGapFillControllerPart2, InventoryGapFillControllerPart3 } from '../controllers/inventory-gap-fill.controllers';

class RecordingCommandBus {
  calls: any[] = [];
  async execute(cmd: any) { this.calls.push(cmd); return { id: 'stub-id' }; }
}
class RecordingQueryBus {
  calls: any[] = [];
  async execute(q: any) { this.calls.push(q); return { items: [], total: 0 }; }
}

describe('Inventory Gap-Fill Controllers (Wave 21)', () => {
  let cb: RecordingCommandBus;
  let qb: RecordingQueryBus;
  let inventoryGapFillControllerPart1: InventoryGapFillControllerPart1;
  let inventoryGapFillControllerPart2: InventoryGapFillControllerPart2;
  let inventoryGapFillControllerPart3: InventoryGapFillControllerPart3;

  beforeEach(async () => {
    cb = new RecordingCommandBus();
    qb = new RecordingQueryBus();
    inventoryGapFillControllerPart1 = new InventoryGapFillControllerPart1(cb as any, qb as any);
    inventoryGapFillControllerPart2 = new InventoryGapFillControllerPart2(cb as any, qb as any);
    inventoryGapFillControllerPart3 = new InventoryGapFillControllerPart3(cb as any, qb as any);

    await Test.createTestingModule({
      controllers: [InventoryGapFillControllerPart1, InventoryGapFillControllerPart2, InventoryGapFillControllerPart3],
      providers: [
        { provide: CommandBus, useValue: cb },
        { provide: QueryBus, useValue: qb },
      ],
    }).compile();
  });

  describe('InventoryGapFillControllerPart1', () => {
    it('PATCH items/:id -> dispatches Inventory.UpdateItem', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.patchItemsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.UpdateItem');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE items/:id -> dispatches Inventory.DeleteItem', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.deleteItemsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.DeleteItem');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET items/low-stock -> dispatches Inventory.ListLowStock', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.getItemsLowstock({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.ListLowStock');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET items/by-category/:category -> dispatches Inventory.GetByCategory', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.getItemsBycategoryBycategory({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.GetByCategory');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH suppliers/:id -> dispatches Inventory.UpdateSupplier', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.patchSuppliersByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.UpdateSupplier');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE suppliers/:id -> dispatches Inventory.DeleteSupplier', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.deleteSuppliersByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.DeleteSupplier');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH purchase-orders/:id -> dispatches Inventory.UpdatePurchaseOrder', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart1.patchPurchaseordersByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.UpdatePurchaseOrder');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('InventoryGapFillControllerPart2', () => {
    it('POST purchase-orders/:id/receive -> dispatches Inventory.Receive', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.postPurchaseordersByidReceive({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.Receive');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET purchase-orders/:id/grns -> dispatches Inventory.ListPurchaseOrderGrns', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.getPurchaseordersByidGrns({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.ListPurchaseOrderGrns');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH grns/:id -> dispatches Inventory.UpdateGrn', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.patchGrnsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.UpdateGrn');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE grns/:id -> dispatches Inventory.DeleteGrn', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.deleteGrnsByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.DeleteGrn');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('PATCH goods-issues/:id -> dispatches Inventory.UpdateGoodsIssue', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.patchGoodsissuesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.UpdateGoodsIssue');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('DELETE goods-issues/:id -> dispatches Inventory.DeleteGoodsIssue', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.deleteGoodsissuesByid({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.DeleteGoodsIssue');
      expect(bus.calls.length).toBe(before + 1);
    });
    it('GET stock-movements -> dispatches Inventory.ListStockMovements', async () => {
      const bus = true ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart2.getStockmovements({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.ListStockMovements');
      expect(bus.calls.length).toBe(before + 1);
    });
  });

  describe('InventoryGapFillControllerPart3', () => {
    it('POST stock-audits -> dispatches Inventory.CreateStockAudit', async () => {
      const bus = false ? qb : cb;
      const before = bus.calls.length;
      await inventoryGapFillControllerPart3.postStockaudits({ id: 'r1' }, { tenantId: "t1" });
      const last = bus.calls[bus.calls.length - 1];
      expect(last.type).toBe('Inventory.CreateStockAudit');
      expect(bus.calls.length).toBe(before + 1);
    });
  });
});
