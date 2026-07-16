/**
 * Inventory Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';
import { PrismaService } from '@infra/prisma/prisma.service';

import type {
  GetGoodsIssueQuery, GetGrnQuery, GetItemQuery, GetPurchaseOrderQuery,
  GetStockMovementHistoryQuery, GetSupplierQuery, ListGoodsIssuesQuery,
  ListGrnsQuery, ListItemsQuery, ListPurchaseOrdersQuery, ListSuppliersQuery,
} from '../queries/inventory.queries';

@Injectable()
export class GetItemQueryHandler implements QueryHandler<GetItemQuery> {
  private static readonly TYPE = 'Inventory.GetItem';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetItemQueryHandler.TYPE, this);
  }
  async handle(q: GetItemQuery) {
    return this.prisma.inventoryItem.findFirst({
      where: { id: q.payload.itemId, schoolId: q.payload.tenantId },
      include: { stockLots: { where: { quantityOnHand: { gt: 0 } }, orderBy: { expiresAt: 'asc' } } },
    });
  }
}

@Injectable()
export class ListItemsQueryHandler implements QueryHandler<ListItemsQuery> {
  private static readonly TYPE = 'Inventory.ListItems';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListItemsQueryHandler.TYPE, this);
  }
  async handle(q: ListItemsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.category) where.category = q.payload.category as any;
    if (q.payload.activeOnly) where.isActive = true;
    if (q.payload.lowStockOnly) {
      where.currentStock = { lte: 0 };
      // proper low-stock filter requires raw SQL; using currentStock=0 as approximation
    }
    return this.prisma.inventoryItem.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
    });
  }
}

@Injectable()
export class GetSupplierQueryHandler implements QueryHandler<GetSupplierQuery> {
  private static readonly TYPE = 'Inventory.GetSupplier';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetSupplierQueryHandler.TYPE, this);
  }
  async handle(q: GetSupplierQuery) {
    return this.prisma.supplier.findFirst({
      where: { id: q.payload.supplierId, schoolId: q.payload.tenantId },
      include: { purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }
}

@Injectable()
export class ListSuppliersQueryHandler implements QueryHandler<ListSuppliersQuery> {
  private static readonly TYPE = 'Inventory.ListSuppliers';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListSuppliersQueryHandler.TYPE, this);
  }
  async handle(q: ListSuppliersQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.supplier.findMany({
      where, orderBy: { name: 'asc' }, take: limit, skip: offset,
    });
  }
}

@Injectable()
export class GetPurchaseOrderQueryHandler implements QueryHandler<GetPurchaseOrderQuery> {
  private static readonly TYPE = 'Inventory.GetPurchaseOrder';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetPurchaseOrderQueryHandler.TYPE, this);
  }
  async handle(q: GetPurchaseOrderQuery) {
    return this.prisma.purchaseOrder.findFirst({
      where: { id: q.payload.poId, schoolId: q.payload.tenantId },
      include: {
        lines: { include: { item: true } },
        supplier: true, grns: true, issuedBy: true,
      },
    });
  }
}

@Injectable()
export class ListPurchaseOrdersQueryHandler implements QueryHandler<ListPurchaseOrdersQuery> {
  private static readonly TYPE = 'Inventory.ListPurchaseOrders';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListPurchaseOrdersQueryHandler.TYPE, this);
  }
  async handle(q: ListPurchaseOrdersQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.supplierId) where.supplierId = q.payload.supplierId;
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.purchaseOrder.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { supplier: true, _count: { select: { lines: true } } },
    });
  }
}

@Injectable()
export class GetGrnQueryHandler implements QueryHandler<GetGrnQuery> {
  private static readonly TYPE = 'Inventory.GetGrn';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetGrnQueryHandler.TYPE, this);
  }
  async handle(q: GetGrnQuery) {
    return this.prisma.goodsReceiptNote.findFirst({
      where: { id: q.payload.grnId, schoolId: q.payload.tenantId },
      include: { lines: { include: { item: true } }, supplier: true, po: true, receivedBy: true },
    });
  }
}

@Injectable()
export class ListGrnsQueryHandler implements QueryHandler<ListGrnsQuery> {
  private static readonly TYPE = 'Inventory.ListGrns';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListGrnsQueryHandler.TYPE, this);
  }
  async handle(q: ListGrnsQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.poId) where.poId = q.payload.poId;
    if (q.payload.supplierId) where.supplierId = q.payload.supplierId;
    return this.prisma.goodsReceiptNote.findMany({
      where, orderBy: { receivedAt: 'desc' }, take: limit, skip: offset,
      include: { supplier: true, _count: { select: { lines: true } } },
    });
  }
}

@Injectable()
export class GetGoodsIssueQueryHandler implements QueryHandler<GetGoodsIssueQuery> {
  private static readonly TYPE = 'Inventory.GetGoodsIssue';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetGoodsIssueQueryHandler.TYPE, this);
  }
  async handle(q: GetGoodsIssueQuery) {
    return this.prisma.goodsIssue.findFirst({
      where: { id: q.payload.issueId, schoolId: q.payload.tenantId },
      include: { lines: { include: { item: true } }, issuedTo: true, issuedBy: true },
    });
  }
}

@Injectable()
export class ListGoodsIssuesQueryHandler implements QueryHandler<ListGoodsIssuesQuery> {
  private static readonly TYPE = 'Inventory.ListGoodsIssues';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(ListGoodsIssuesQueryHandler.TYPE, this);
  }
  async handle(q: ListGoodsIssuesQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.issuedToId) where.issuedToId = q.payload.issuedToId;
    if (q.payload.status) where.status = q.payload.status as any;
    return this.prisma.goodsIssue.findMany({
      where, orderBy: { issueDate: 'desc' }, take: limit, skip: offset,
      include: { issuedTo: true, _count: { select: { lines: true } } },
    });
  }
}

@Injectable()
export class GetStockMovementHistoryQueryHandler implements QueryHandler<GetStockMovementHistoryQuery> {
  private static readonly TYPE = 'Inventory.GetStockMovementHistory';
  constructor(private readonly bus: QueryBus, private readonly prisma: PrismaService) {
    bus.register(GetStockMovementHistoryQueryHandler.TYPE, this);
  }
  async handle(q: GetStockMovementHistoryQuery) {
    const limit = Math.min(q.payload.limit ?? 100, 500);
    const offset = q.payload.offset ?? 0;
    const where: any = { schoolId: q.payload.tenantId };
    if (q.payload.itemId) where.itemId = q.payload.itemId;
    return this.prisma.stockMovement.findMany({
      where, orderBy: { occurredAt: 'desc' }, take: limit, skip: offset,
      include: { item: true, performedBy: true },
    });
  }
}
