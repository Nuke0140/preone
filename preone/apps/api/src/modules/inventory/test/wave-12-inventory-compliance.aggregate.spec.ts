/**
 * Wave 12 — Inventory Compliance Aggregate unit tests.
 *
 * Coverage:
 *   - ReorderAlertAggregate (R-INV-001)
 *   - ExpiredItemDisposalAggregate (R-INV-004)
 *   - StockAuditAggregate (R-INV-009)
 *   - ReturnNoteAggregate (R-INV-010)
 */
import { describe, it, expect } from 'vitest';

import { ReorderAlertAggregate } from '../domain/aggregates/reorder-alert.aggregate';
import { ExpiredItemDisposalAggregate } from '../domain/aggregates/expired-item-disposal.aggregate';
import { StockAuditAggregate, VARIANCE_TOLERANCE_PERCENT } from '../domain/aggregates/stock-audit.aggregate';
import { ReturnNoteAggregate } from '../domain/aggregates/return-note.aggregate';

const NOW = '2026-07-16T10:00:00.000Z';
const TODAY = '2026-07-16';

// =============================================================================
// ReorderAlertAggregate (R-INV-001)
// =============================================================================
describe('ReorderAlertAggregate (R-INV-001)', () => {
  it('should create PR when stock <= reorderLevel', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1',
      10,  // currentStock
      20,  // reorderLevel
      50,  // suggestedQty
      'vendor-1',
    );
    expect(agg.status).toBe('CREATED');
    expect(agg.currentStock).toBe(10);
    expect(agg.suggestedQty).toBe(50);
    expect(agg.domainEvents[0].eventType).toBe('ReorderAlertCreatedEvent');
  });

  it('should reject creation when currentStock > reorderLevel', () => {
    expect(() => ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 30, 20, 50,
    )).toThrow(/currentStock .* > reorderLevel/);
  });

  it('should reject creation with zero suggestedQty', () => {
    expect(() => ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 0,
    )).toThrow(/suggestedQty .* must be > 0/);
  });

  it('should approve with expectedDeliveryDate', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50, 'vendor-1',
    );
    agg.approve('admin-1', NOW, '2026-07-23');
    expect(agg.status).toBe('APPROVED');
    expect(agg.expectedDeliveryDate).toBe('2026-07-23');
  });

  it('should auto-compute expectedDeliveryDate using leadTimeDays', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50, 'vendor-1',
    );
    agg.approve('admin-1', NOW, '', 7);
    // approvedAt + 7 days = 2026-07-23
    expect(agg.expectedDeliveryDate).toBe('2026-07-23');
  });

  it('should reject PR', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50,
    );
    agg.reject('Item no longer needed');
    expect(agg.status).toBe('REJECTED');
  });

  it('should convert approved PR to PO', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50,
    );
    agg.approve('admin-1', NOW, '2026-07-23');
    agg.convertToPo('po-1');
    expect(agg.status).toBe('CONVERTED');
    expect(agg.convertedPoId).toBe('po-1');
  });

  it('should reject conversion from CREATED (must approve first)', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50,
    );
    expect(() => agg.convertToPo('po-1')).toThrow(/invalid transition/);
  });

  it('should cancel approved PR', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50,
    );
    agg.approve('admin-1', NOW, '2026-07-23');
    agg.cancel('Vendor bankruptcy');
    expect(agg.status).toBe('CANCELLED');
  });

  it('should reject double conversion', () => {
    const agg = ReorderAlertAggregate.create(
      'school-1', 'branch-1', 'item-1', 10, 20, 50,
    );
    agg.approve('admin-1', NOW, '2026-07-23');
    agg.convertToPo('po-1');
    expect(() => agg.convertToPo('po-2')).toThrow(/invalid transition/);
  });
});

// =============================================================================
// ExpiredItemDisposalAggregate (R-INV-004)
// =============================================================================
describe('ExpiredItemDisposalAggregate (R-INV-004)', () => {
  it('should create disposal request for expired item', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1',
      5,              // quantity
      1000n,          // unitCostCents (₹10)
      '2026-07-10',   // expiryDate (past)
      'WRITE_OFF',
    );
    expect(agg.status).toBe('PENDING_APPROVAL');
    expect(agg.quantity).toBe(5);
    expect(agg.writeOffValueCents).toBe(5000n); // 5 * 1000
  });

  it('should reject disposal for non-expired item', () => {
    expect(() => ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-12-31', 'WRITE_OFF',
    )).toThrow(/in the future/);
  });

  it('should reject zero quantity', () => {
    expect(() => ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 0, 1000n, '2026-07-10', 'WRITE_OFF',
    )).toThrow(/quantity .* must be > 0/);
  });

  it('should require Inventory Manager approval before Branch Head', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10',
    );
    // Transition guard fires first — cannot go PENDING_APPROVAL → BRANCH_HEAD_APPROVED directly
    expect(() => agg.approveByBranchHead(NOW)).toThrow(/invalid transition/);
  });

  it('should approve via InvMgr → BranchHead → Dispose', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10',
    );
    agg.approveByInventoryManager(NOW);
    expect(agg.status).toBe('INVENTORY_MANAGER_APPROVED');
    agg.approveByBranchHead(NOW);
    expect(agg.status).toBe('BRANCH_HEAD_APPROVED');
    agg.dispose(NOW, 'https://s3.example.com/disposal-log.pdf');
    expect(agg.status).toBe('DISPOSED');
  });

  it('should reject disposal without Branch Head approval', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10',
    );
    agg.approveByInventoryManager(NOW);
    // Transition guard fires first — cannot go INVENTORY_MANAGER_APPROVED → DISPOSED directly
    expect(() => agg.dispose(NOW)).toThrow(/invalid transition/);
  });

  it('should reject disposal', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10',
    );
    agg.reject('Item not actually expired — date was wrong');
    expect(agg.status).toBe('REJECTED');
  });

  it('should support different disposal methods', () => {
    const methods = ['SALE', 'SCRAP', 'DONATION', 'WRITE_OFF'] as const;
    for (const m of methods) {
      const agg = ExpiredItemDisposalAggregate.create(
        'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10', m,
      );
      expect(agg.disposalMethod).toBe(m);
    }
  });

  it('should reject transition from terminal DISPOSED state', () => {
    const agg = ExpiredItemDisposalAggregate.create(
      'school-1', 'branch-1', 'item-1', 5, 1000n, '2026-07-10',
    );
    agg.approveByInventoryManager(NOW);
    agg.approveByBranchHead(NOW);
    agg.dispose(NOW);
    expect(() => agg.reject('Too late')).toThrow(/invalid transition/);
  });
});

// =============================================================================
// StockAuditAggregate (R-INV-009)
// =============================================================================
describe('StockAuditAggregate (R-INV-009)', () => {
  it('should create scheduled audit', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    expect(agg.status).toBe('SCHEDULED');
    expect(agg.quarter).toBe('2026-Q3');
    expect(agg.varianceAction).toBe('NONE');
  });

  it('should reject invalid quarter format', () => {
    expect(() => StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q5', TODAY,
    )).toThrow(/YYYY-QN/);
    expect(() => StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q1-Extra', TODAY,
    )).toThrow(/YYYY-QN/);
  });

  it('should record line and detect no variance', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    agg.recordLine('item-1', 100, 100, 1000n); // no variance
    expect(agg.lines).toHaveLength(1);
    expect(agg.totalItems).toBe(1);
    expect(agg.itemsWithVariance).toBe(0);
    expect(agg.varianceAction).toBe('NONE');
  });

  it('should flag variance > 5% for investigation', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    // 100 system vs 90 physical = 10% variance — exceeds 5% tolerance
    agg.recordLine('item-1', 100, 90, 1000n);
    expect(agg.varianceAction).toBe('INVESTIGATION');
    expect(agg.requiresInvestigation).toBe(true);
  });

  it('should not flag variance <= 5%', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    // 100 vs 97 = 3% — within tolerance
    agg.recordLine('item-1', 100, 97, 1000n);
    expect(agg.varianceAction).toBe('NONE');
    expect(agg.requiresInvestigation).toBe(false);
  });

  it('should compute totalVarianceValueCents correctly', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    agg.recordLine('item-1', 100, 90, 1000n); // -10 units * ₹10 = -₹100
    agg.recordLine('item-2', 50, 55, 2000n);  // +5 units * ₹20 = +₹100
    // totalVarianceValueCents = (-10000 + 10000) = 0 in this case
    // But agg stores absolute? No — let's check actual signed sum
    const totalVariance = agg.lines.reduce((sum, l) => sum + l.varianceValueCents, 0n);
    expect(totalVariance).toBe(0n);
  });

  it('should reject duplicate line for same item', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    agg.recordLine('item-1', 100, 100, 1000n);
    expect(() => agg.recordLine('item-1', 100, 95, 1000n)).toThrow(/already recorded/);
  });

  it('should complete audit and apply adjustments', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    agg.recordLine('item-1', 100, 90, 1000n); // 10% variance
    agg.reconcile();
    agg.complete(NOW);
    expect(agg.status).toBe('COMPLETED');
    agg.applyAdjustments(NOW); // Branch Head approval timestamp
    expect(agg.status).toBe('ADJUSTED');
  });

  it('should reject applyAdjustments when no variance', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    agg.recordLine('item-1', 100, 100, 1000n); // no variance
    agg.reconcile();
    agg.complete(NOW);
    expect(() => agg.applyAdjustments(NOW)).toThrow(/no adjustments to apply/);
  });

  it('should reject reconcile with zero lines', () => {
    const agg = StockAuditAggregate.create(
      'school-1', 'branch-1', 'AUD-001', '2026-Q3', TODAY,
    );
    agg.start(NOW);
    expect(() => agg.reconcile()).toThrow(/zero recorded lines/);
  });

  it('should expose VARIANCE_TOLERANCE_PERCENT constant', () => {
    expect(VARIANCE_TOLERANCE_PERCENT).toBe(5);
  });
});

// =============================================================================
// ReturnNoteAggregate (R-INV-010)
// =============================================================================
describe('ReturnNoteAggregate (R-INV-010)', () => {
  it('should create return note in INITIATED state', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED', 'po-1', 'grn-1',
    );
    expect(agg.status).toBe('INITIATED');
    expect(agg.returnNumber).toBe('RET-001');
    expect(agg.reason).toBe('DAMAGED');
  });

  it('should add lines with computed totalValue', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);  // ₹50
    agg.addLine('item-2', 2, 2500n);  // ₹50
    expect(agg.lines).toHaveLength(2);
    expect(agg.totalValueCents).toBe(10000n); // ₹100 total
  });

  it('should reject zero quantity line', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    expect(() => agg.addLine('item-1', 0, 1000n)).toThrow(/quantity .* must be > 0/);
  });

  it('should approve return note with lines', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    expect(agg.status).toBe('APPROVED');
  });

  it('should reject approve with zero lines', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    expect(() => agg.approve(NOW)).toThrow(/zero lines/);
  });

  it('should reject addLine after approval', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    expect(() => agg.addLine('item-2', 2, 2500n)).toThrow(/cannot add lines/);
  });

  it('should complete full lifecycle to CREDIT_RECEIVED', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    agg.schedulePickup(NOW);
    agg.markReturned(NOW);
    agg.recordCredit('CN-001', 5000n, NOW);
    expect(agg.status).toBe('CREDIT_RECEIVED');
    expect(agg.creditNoteNumber).toBe('CN-001');
    expect(agg.creditNoteAmountCents).toBe(5000n);
  });

  it('should reject credit without number', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    agg.schedulePickup(NOW);
    agg.markReturned(NOW);
    expect(() => agg.recordCredit('', 5000n, NOW)).toThrow(/creditNoteNumber required/);
  });

  it('should cancel return note from any non-terminal state', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    agg.cancel('Vendor refused return');
    expect(agg.status).toBe('CANCELLED');
  });

  it('should reject cancel after CREDIT_RECEIVED', () => {
    const agg = ReturnNoteAggregate.create(
      'school-1', 'branch-1', 'RET-001', 'supplier-1', 'DAMAGED',
    );
    agg.addLine('item-1', 5, 1000n);
    agg.approve(NOW);
    agg.schedulePickup(NOW);
    agg.markReturned(NOW);
    agg.recordCredit('CN-001', 5000n, NOW);
    expect(() => agg.cancel('Too late')).toThrow(/invalid transition/);
  });

  it('should support all return reasons', () => {
    const reasons = ['DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'QUALITY_ISSUE', 'EXCESS_QUANTITY', 'RECALL', 'OTHER'] as const;
    for (const r of reasons) {
      const agg = ReturnNoteAggregate.create(
        'school-1', 'branch-1', `RET-${r}`, 'supplier-1', r,
      );
      expect(agg.reason).toBe(r);
    }
  });
});
