/**
 * Inventory Repository Ports — interfaces implemented by Prisma repos.
 */
import type { InventoryItemAggregate } from '../aggregates/inventory-item.aggregate';
import type { SupplierAggregate } from '../aggregates/supplier.aggregate';
import type { PurchaseOrderAggregate } from '../aggregates/purchase-order.aggregate';
import type { GoodsReceiptNoteAggregate } from '../aggregates/goods-receipt-note.aggregate';
import type { GoodsIssueAggregate } from '../aggregates/goods-issue.aggregate';

export interface InventoryItemRepository {
  save(agg: InventoryItemAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<InventoryItemAggregate | null>;
  findByCode(tenantId: string, itemCode: string): Promise<InventoryItemAggregate | null>;
  findLowStock(tenantId: string, limit?: number): Promise<InventoryItemAggregate[]>;
  findActive(tenantId: string, limit?: number): Promise<InventoryItemAggregate[]>;
}

export interface SupplierRepository {
  save(agg: SupplierAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<SupplierAggregate | null>;
  findByCode(tenantId: string, supplierCode: string): Promise<SupplierAggregate | null>;
  findActive(tenantId: string, limit?: number): Promise<SupplierAggregate[]>;
}

export interface PurchaseOrderRepository {
  save(agg: PurchaseOrderAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<PurchaseOrderAggregate | null>;
  findByPoNumber(tenantId: string, poNumber: string): Promise<PurchaseOrderAggregate | null>;
  findOpenBySupplier(supplierId: string, tenantId: string): Promise<PurchaseOrderAggregate[]>;
}

export interface GoodsReceiptNoteRepository {
  save(agg: GoodsReceiptNoteAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<GoodsReceiptNoteAggregate | null>;
  findByGrnNumber(tenantId: string, grnNumber: string): Promise<GoodsReceiptNoteAggregate | null>;
}

export interface GoodsIssueRepository {
  save(agg: GoodsIssueAggregate): Promise<void>;
  findById(id: string, tenantId: string): Promise<GoodsIssueAggregate | null>;
  findByIssueNumber(tenantId: string, issueNumber: string): Promise<GoodsIssueAggregate | null>;
}
