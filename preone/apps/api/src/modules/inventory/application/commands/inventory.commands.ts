/**
 * Inventory Commands — CQRS write side (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Items ────────────────────────────────────────────────────

export class CreateItemCommand implements Command<{
  tenantId: string;
  branchId?: string;
  itemCode: string;
  name: string;
  description?: string;
  category: any;
  unit: any;
  hsnCode?: string;
  reorderLevel: number;
  reorderQty: number;
  maxLevel?: number;
  unitCostCents: number;
  isPerishable: boolean;
  shelfLifeDays?: number;
  isAssetTracked: boolean;
  assetPrefix?: string;
}, { id: string }> {
  readonly type = 'Inventory.CreateItem';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UpdateItemCommand implements Command<{
  itemId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}, { id: string }> {
  readonly type = 'Inventory.UpdateItem';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AdjustStockCommand implements Command<{
  itemId: string;
  tenantId: string;
  delta: number;
  reason: string;
}, { id: string; newBalance: number }> {
  readonly type = 'Inventory.AdjustStock';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DeactivateItemCommand implements Command<{ itemId: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.DeactivateItem';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Suppliers ────────────────────────────────────────────────

export class CreateSupplierCommand implements Command<{
  tenantId: string;
  supplierCode: string;
  name: string;
  legalName?: string;
  gstNumber?: string;
  panNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  paymentTerms: number;
}, { id: string }> {
  readonly type = 'Inventory.CreateSupplier';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UpdateSupplierCommand implements Command<{
  supplierId: string;
  tenantId: string;
  changes: Record<string, unknown>;
}, { id: string }> {
  readonly type = 'Inventory.UpdateSupplier';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class BlacklistSupplierCommand implements Command<{ supplierId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.BlacklistSupplier';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Purchase Orders ──────────────────────────────────────────

export class CreatePurchaseOrderCommand implements Command<{
  tenantId: string;
  branchId?: string;
  poNumber: string;
  supplierId: string;
  issuedById: string;
  sourcePrId?: string;
  shippingCents?: number;
  expectedDate?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    quantity: number;
    unitCostCents: number;
    taxRatePercent: number;
  }>;
}, { id: string; poNumber: string }> {
  readonly type = 'Inventory.CreatePurchaseOrder';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class IssuePurchaseOrderCommand implements Command<{ poId: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.IssuePurchaseOrder';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelPurchaseOrderCommand implements Command<{ poId: string; reason: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.CancelPurchaseOrder';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── GRN ──────────────────────────────────────────────────────

export class CreateGrnCommand implements Command<{
  tenantId: string;
  branchId?: string;
  grnNumber: string;
  poId?: string;
  supplierId: string;
  receivedById: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  challanNumber?: string;
  notes?: string;
  lines: Array<{
    poLineId?: string;
    itemId: string;
    orderedQty: number;
    receivedQty: number;
    rejectedQty?: number;
    rejectionReason?: string;
    unitCostCents: number;
    lotNumber?: string;
    expiresAt?: string;
  }>;
}, { id: string; grnNumber: string }> {
  readonly type = 'Inventory.CreateGrn';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class PostGrnCommand implements Command<{ grnId: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.PostGrn';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Goods Issue ──────────────────────────────────────────────

export class CreateGoodsIssueCommand implements Command<{
  tenantId: string;
  branchId?: string;
  issueNumber: string;
  issuedToId: string;
  issuedById: string;
  department?: string;
  purpose?: string;
  lines: Array<{
    itemId: string;
    lotId?: string;
    quantity: number;
    unitCostCents: number;
  }>;
}, { id: string; issueNumber: string }> {
  readonly type = 'Inventory.CreateGoodsIssue';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class PostGoodsIssueCommand implements Command<{ issueId: string; tenantId: string }, { id: string }> {
  readonly type = 'Inventory.PostGoodsIssue';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
