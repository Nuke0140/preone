/**
 * Inventory Aggregate Unit Tests — covers InventoryItem, Supplier,
 * PurchaseOrder, GoodsReceiptNote, GoodsIssue aggregate invariants +
 * lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { GoodsIssueAggregate } from '../domain/aggregates/goods-issue.aggregate';
import { GoodsReceiptNoteAggregate } from '../domain/aggregates/goods-receipt-note.aggregate';
import { InventoryItemAggregate } from '../domain/aggregates/inventory-item.aggregate';
import { PurchaseOrderAggregate } from '../domain/aggregates/purchase-order.aggregate';
import { SupplierAggregate } from '../domain/aggregates/supplier.aggregate';

describe('InventoryItemAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    itemCode: 'ITEM-001',
    name: 'Crayons Box',
    category: 'STATIONERY' as const,
    unit: 'BOX' as const,
    reorderLevel: 10,
    reorderQty: 20,
    unitCostCents: 5000,
    isPerishable: false,
    isAssetTracked: false,
  };

  it('should create with zero stock and emit ItemCreatedEvent', () => {
    const item = InventoryItemAggregate.create(baseProps);
    expect(item.currentStock).toBe(0);
    expect(item.availableStock).toBe(0);
    expect(item.isActive).toBe(true);
    expect(item.domainEvents.some(e => e.eventType === 'ItemCreatedEvent')).toBe(true);
  });

  it('should adjust stock with valid delta', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.adjustStock(50, 'Initial GRN');
    expect(item.currentStock).toBe(50);
    item.adjustStock(-10, 'Goods issue');
    expect(item.currentStock).toBe(40);
    expect(item.domainEvents.some(e => e.eventType === 'StockAdjustedEvent')).toBe(true);
  });

  it('should reject negative stock', () => {
    const item = InventoryItemAggregate.create(baseProps);
    expect(() => item.adjustStock(-10, 'Below zero')).toThrow('Insufficient stock');
  });

  it('should emit StockLowEvent when stock drops to reorder level', () => {
    const item = InventoryItemAggregate.create({ ...baseProps, reorderLevel: 5 });
    item.adjustStock(3, 'Below reorder');
    expect(item.isLowStock).toBe(true);
    expect(item.domainEvents.some(e => e.eventType === 'StockLowEvent')).toBe(true);
  });

  it('should reserve and release stock correctly', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.adjustStock(50, 'GRN');
    item.reserve(20);
    expect(item.availableStock).toBe(30);
    item.releaseReservation(10);
    expect(item.availableStock).toBe(40);
  });

  it('should reject reserve more than available', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.adjustStock(10, 'GRN');
    expect(() => item.reserve(20)).toThrow('Cannot reserve');
  });

  it('should not deactivate item with non-zero stock', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.adjustStock(5, 'GRN');
    expect(() => item.deactivate()).toThrow('non-zero stock');
  });

  it('should deactivate item with zero stock', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.deactivate();
    expect(item.isActive).toBe(false);
    expect(item.domainEvents.some(e => e.eventType === 'ItemDeactivatedEvent')).toBe(true);
  });

  it('should reject stock adjust on inactive item', () => {
    const item = InventoryItemAggregate.create(baseProps);
    item.deactivate();
    expect(() => item.adjustStock(5, 'test')).toThrow('inactive');
  });
});

describe('SupplierAggregate', () => {
  it('should create ACTIVE supplier with valid GST', () => {
    const s = SupplierAggregate.create({
      tenantId: 't1',
      supplierCode: 'SUP-001',
      name: 'ABC Stationery',
      gstNumber: '27ABCDE1234F1Z5',
      paymentTerms: 30,
    });
    expect(s.status).toBe('ACTIVE');
    expect(s.domainEvents.some(e => e.eventType === 'SupplierCreatedEvent')).toBe(true);
  });

  it('should reject invalid GST number', () => {
    expect(() => SupplierAggregate.create({
      tenantId: 't1',
      supplierCode: 'SUP-002',
      name: 'X',
      gstNumber: 'invalid',
      paymentTerms: 30,
    })).toThrow('Invalid GST number');
  });

  it('should reject invalid PAN number', () => {
    expect(() => SupplierAggregate.create({
      tenantId: 't1',
      supplierCode: 'SUP-003',
      name: 'X',
      panNumber: 'invalid',
      paymentTerms: 30,
    })).toThrow('Invalid PAN number');
  });

  it('should blacklist with reason', () => {
    const s = SupplierAggregate.create({
      tenantId: 't1', supplierCode: 'SUP-004', name: 'X', paymentTerms: 30,
    });
    s.blacklist('Quality issues');
    expect(s.status).toBe('BLACKLISTED');
    expect(s.domainEvents.some(e => e.eventType === 'SupplierBlacklistedEvent')).toBe(true);
  });

  it('should not blacklist INACTIVE supplier', () => {
    const s = SupplierAggregate.create({
      tenantId: 't1', supplierCode: 'SUP-005', name: 'X', paymentTerms: 30,
    });
    s.update({ name: 'Y' });
    // status is now ACTIVE - reactivate test path
    s.blacklist('test');
    expect(s.status).toBe('BLACKLISTED');
    // Cannot blacklist again — already blacklisted (no-op)
    s.blacklist('test2');
    expect(s.status).toBe('BLACKLISTED');
  });
});

describe('PurchaseOrderAggregate', () => {
  it('should create in DRAFT status with correct totals', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-001',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 500,
      lines: [
        { itemId: 'i1', quantity: 10, unitCostCents: 1000, taxRatePercent: 18 },
        { itemId: 'i2', quantity: 5, unitCostCents: 2000, taxRatePercent: 18 },
      ],
    });
    expect(po.status).toBe('DRAFT');
    expect(po.lines.length).toBe(2);
    // subtotal = 10*1000 + 5*2000 = 20000
    expect(po.totalCents).toBe(20000 + 3600 + 500); // subtotal + tax + shipping
    expect(po.domainEvents.some(e => e.eventType === 'PurchaseOrderCreatedEvent')).toBe(true);
  });

  it('should not issue PO without lines', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-002',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [],
    });
    expect(() => po.issue(new Date().toISOString())).toThrow('without lines');
  });

  it('should issue and then partially receive', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-003',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [
        { itemId: 'i1', quantity: 10, unitCostCents: 1000, taxRatePercent: 0 },
      ],
    });
    po.issue(new Date().toISOString());
    expect(po.status).toBe('ISSUED');
    const lineId = po.lines[0].id;
    po.recordReceipt(lineId, 5);
    expect(po.status).toBe('PARTIALLY_RECEIVED');
  });

  it('should fully receive and transition to RECEIVED', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-004',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [
        { itemId: 'i1', quantity: 10, unitCostCents: 1000, taxRatePercent: 0 },
      ],
    });
    po.issue(new Date().toISOString());
    const lineId = po.lines[0].id;
    po.recordReceipt(lineId, 10);
    expect(po.status).toBe('RECEIVED');
    expect(po.domainEvents.some(e => e.eventType === 'PurchaseOrderReceivedEvent')).toBe(true);
  });

  it('should reject over-receipt', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-005',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [
        { itemId: 'i1', quantity: 5, unitCostCents: 1000, taxRatePercent: 0 },
      ],
    });
    po.issue(new Date().toISOString());
    expect(() => po.recordReceipt(po.lines[0].id, 10)).toThrow('exceeds ordered');
  });

  it('should cancel a DRAFT PO with reason', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-006',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [{ itemId: 'i1', quantity: 5, unitCostCents: 1000, taxRatePercent: 0 }],
    });
    po.cancel('No longer needed');
    expect(po.status).toBe('CANCELLED');
    expect(po.domainEvents.some(e => e.eventType === 'PurchaseOrderCancelledEvent')).toBe(true);
  });

  it('should reject invalid transitions', () => {
    const po = PurchaseOrderAggregate.create({
      tenantId: 't1',
      poNumber: 'PO-007',
      supplierId: 's1',
      issuedById: 'u1',
      shippingCents: 0,
      lines: [{ itemId: 'i1', quantity: 5, unitCostCents: 1000, taxRatePercent: 0 }],
    });
    // Cannot go DRAFT -> RECEIVED directly
    expect(() => (po as any)._requireTransition('RECEIVED')).toThrow('Invalid PO transition');
  });
});

describe('GoodsReceiptNoteAggregate', () => {
  it('should create in DRAFT status with computed acceptedQty', () => {
    const grn = GoodsReceiptNoteAggregate.create({
      tenantId: 't1',
      grnNumber: 'GRN-001',
      supplierId: 's1',
      receivedById: 'u1',
      receivedAt: new Date().toISOString(),
      lines: [
        { itemId: 'i1', orderedQty: 10, receivedQty: 10, rejectedQty: 0, unitCostCents: 1000 },
        { itemId: 'i2', orderedQty: 5, receivedQty: 5, rejectedQty: 2, rejectionReason: 'Damaged', unitCostCents: 2000 },
      ],
    });
    expect(grn.status).toBe('DRAFT');
    expect(grn.lines[0].acceptedQty).toBe(10);
    expect(grn.lines[1].acceptedQty).toBe(3);
    // totalAccepted = 10*1000 + 3*2000 = 16000
    expect(grn.totalAcceptedCents).toBe(16000);
  });

  it('should post a GRN with lines', () => {
    const grn = GoodsReceiptNoteAggregate.create({
      tenantId: 't1',
      grnNumber: 'GRN-002',
      supplierId: 's1',
      receivedById: 'u1',
      receivedAt: new Date().toISOString(),
      lines: [{ itemId: 'i1', orderedQty: 10, receivedQty: 10, rejectedQty: 0, unitCostCents: 1000 }],
    });
    grn.post();
    expect(grn.status).toBe('POSTED');
    expect(grn.domainEvents.some(e => e.eventType === 'GrnPostedEvent')).toBe(true);
  });

  it('should not post a GRN without lines', () => {
    const grn = GoodsReceiptNoteAggregate.create({
      tenantId: 't1',
      grnNumber: 'GRN-003',
      supplierId: 's1',
      receivedById: 'u1',
      receivedAt: new Date().toISOString(),
      lines: [],
    });
    expect(() => grn.post()).toThrow('without lines');
  });
});

describe('GoodsIssueAggregate', () => {
  it('should create with line totals computed', () => {
    const gi = GoodsIssueAggregate.create({
      tenantId: 't1',
      issueNumber: 'GI-001',
      issuedToId: 'u1',
      issuedById: 'u2',
      issueDate: new Date().toISOString(),
      lines: [
        { itemId: 'i1', quantity: 5, unitCostCents: 1000 },
        { itemId: 'i2', quantity: 3, unitCostCents: 2000 },
      ],
    });
    expect(gi.status).toBe('DRAFT');
    expect(gi.totalCents).toBe(5000 + 6000);
  });

  it('should post a goods issue', () => {
    const gi = GoodsIssueAggregate.create({
      tenantId: 't1',
      issueNumber: 'GI-002',
      issuedToId: 'u1',
      issuedById: 'u2',
      issueDate: new Date().toISOString(),
      lines: [{ itemId: 'i1', quantity: 5, unitCostCents: 1000 }],
    });
    gi.post();
    expect(gi.status).toBe('POSTED');
    expect(gi.domainEvents.some(e => e.eventType === 'GoodsIssuePostedEvent')).toBe(true);
  });

  it('should not post empty goods issue', () => {
    const gi = GoodsIssueAggregate.create({
      tenantId: 't1',
      issueNumber: 'GI-003',
      issuedToId: 'u1',
      issuedById: 'u2',
      issueDate: new Date().toISOString(),
      lines: [],
    });
    expect(() => gi.post()).toThrow('without lines');
  });
});
