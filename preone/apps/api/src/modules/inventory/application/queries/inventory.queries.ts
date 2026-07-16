/**
 * Inventory Queries — CQRS read side (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

export class GetItemQuery implements Query<{ itemId: string; tenantId: string }, unknown> {
  readonly type = 'Inventory.GetItem';
  constructor(readonly payload: { itemId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListItemsQuery implements Query<{
  tenantId: string;
  category?: string;
  activeOnly?: boolean;
  lowStockOnly?: boolean;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.ListItems';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetSupplierQuery implements Query<{ supplierId: string; tenantId: string }, unknown> {
  readonly type = 'Inventory.GetSupplier';
  constructor(readonly payload: { supplierId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListSuppliersQuery implements Query<{
  tenantId: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.ListSuppliers';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetPurchaseOrderQuery implements Query<{ poId: string; tenantId: string }, unknown> {
  readonly type = 'Inventory.GetPurchaseOrder';
  constructor(readonly payload: { poId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListPurchaseOrdersQuery implements Query<{
  tenantId: string;
  supplierId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.ListPurchaseOrders';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetGrnQuery implements Query<{ grnId: string; tenantId: string }, unknown> {
  readonly type = 'Inventory.GetGrn';
  constructor(readonly payload: { grnId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListGrnsQuery implements Query<{
  tenantId: string;
  poId?: string;
  supplierId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.ListGrns';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetGoodsIssueQuery implements Query<{ issueId: string; tenantId: string }, unknown> {
  readonly type = 'Inventory.GetGoodsIssue';
  constructor(readonly payload: { issueId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListGoodsIssuesQuery implements Query<{
  tenantId: string;
  issuedToId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.ListGoodsIssues';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}

export class GetStockMovementHistoryQuery implements Query<{
  tenantId: string;
  itemId?: string;
  limit?: number;
  offset?: number;
}, unknown> {
  readonly type = 'Inventory.GetStockMovementHistory';
  constructor(readonly payload: any, readonly metadata: QueryMetadata) {}
}
