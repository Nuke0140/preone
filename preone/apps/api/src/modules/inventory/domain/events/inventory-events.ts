/**
 * Inventory Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by InventoryItem, Supplier, PurchaseOrder, GoodsIssue aggregates.
 *
 * Integration events (BTD §14) — published to Redis Stream after outbox drain:
 *   - PurchaseOrderIssued.v1   → Communication (notify supplier)
 *   - GoodsReceived.v1         → Finance (record GRN for AP)
 *   - StockLow.v1              → Communication (alert procurement officer)
 *   - GoodsIssued.v1           → Finance (consumption cost centre)
 *
 * Subscribers (this module is itself a SUBSCRIBER):
 *   - none for v1
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Inventory Item
// ─────────────────────────────────────────────

export class ItemCreatedEvent extends DomainEvent<{
  itemId: string;
  tenantId: string;
  branchId?: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
}> {}

export class ItemUpdatedEvent extends DomainEvent<{
  itemId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}> {}

export class ItemDeactivatedEvent extends DomainEvent<{
  itemId: string;
  tenantId: string;
}> {}

export class StockAdjustedEvent extends DomainEvent<{
  itemId: string;
  tenantId: string;
  delta: number;
  newBalance: number;
  reason: string;
}> {}

export class StockLowEvent extends DomainEvent<{
  itemId: string;
  tenantId: string;
  currentStock: number;
  reorderLevel: number;
}> {}

// ─────────────────────────────────────────────
// Supplier
// ─────────────────────────────────────────────

export class SupplierCreatedEvent extends DomainEvent<{
  supplierId: string;
  tenantId: string;
  supplierCode: string;
  name: string;
}> {}

export class SupplierUpdatedEvent extends DomainEvent<{
  supplierId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}> {}

export class SupplierBlacklistedEvent extends DomainEvent<{
  supplierId: string;
  tenantId: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Purchase Order
// ─────────────────────────────────────────────

export class PurchaseOrderCreatedEvent extends DomainEvent<{
  poId: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  totalCents: number;
}> {}

export class PurchaseOrderIssuedEvent extends DomainEvent<{
  poId: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  issuedAt: string;
}> {}

export class PurchaseOrderPartiallyReceivedEvent extends DomainEvent<{
  poId: string;
  tenantId: string;
}> {}

export class PurchaseOrderReceivedEvent extends DomainEvent<{
  poId: string;
  tenantId: string;
  receivedAt: string;
}> {}

export class PurchaseOrderCancelledEvent extends DomainEvent<{
  poId: string;
  tenantId: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Goods Receipt Note (GRN)
// ─────────────────────────────────────────────

export class GrnPostedEvent extends DomainEvent<{
  grnId: string;
  tenantId: string;
  grnNumber: string;
  poId?: string;
  supplierId: string;
  totalAcceptedCents: number;
}> {}

// ─────────────────────────────────────────────
// Goods Issue
// ─────────────────────────────────────────────

export class GoodsIssuePostedEvent extends DomainEvent<{
  issueId: string;
  tenantId: string;
  issueNumber: string;
  issuedToId: string;
  totalCents: number;
}> {}
