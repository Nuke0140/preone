/**
 * InventoryModule — wiring for Inventory bounded context.
 *
 * Per BTD §4.3 Module Catalog #9:
 *   "inventory — Items, Stock, PR, PO, GRN — ~45 APIs"
 *
 * Implements:
 *   - 5 aggregates (InventoryItem, Supplier, PurchaseOrder, GoodsReceiptNote, GoodsIssue)
 *   - 1 service + 5 Prisma repositories
 *   - 5 controllers (Items, Suppliers, PurchaseOrders, GRNs, GoodsIssues + StockMovements)
 *   - 14 command handlers + 11 query handlers
 *   - 22 domain events wired via EventBusService
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { InventoryService } from './application/services/inventory.service';
import {
  AdjustStockCommandHandler, BlacklistSupplierCommandHandler,
  CancelPurchaseOrderCommandHandler, CreateGoodsIssueCommandHandler,
  CreateGrnCommandHandler, CreateItemCommandHandler,
  CreatePurchaseOrderCommandHandler, CreateSupplierCommandHandler,
  DeactivateItemCommandHandler, IssuePurchaseOrderCommandHandler,
  PostGrnCommandHandler, PostGoodsIssueCommandHandler,
  UpdateItemCommandHandler, UpdateSupplierCommandHandler,
} from './application/handlers/inventory-command-handlers';
import {
  GetGoodsIssueQueryHandler, GetGrnQueryHandler, GetItemQueryHandler,
  GetPurchaseOrderQueryHandler, GetStockMovementHistoryQueryHandler,
  GetSupplierQueryHandler, ListGoodsIssuesQueryHandler, ListGrnsQueryHandler,
  ListItemsQueryHandler, ListPurchaseOrdersQueryHandler, ListSuppliersQueryHandler,
} from './application/handlers/inventory-query-handlers';
import {
  GoodsIssuesController, GrnsController, InventoryItemsController,
  InventorySuppliersController, PurchaseOrdersController, StockMovementsController,
} from './controllers/inventory.controllers';
import {
  GOODS_ISSUE_REPOSITORY, GOODS_RECEIPT_NOTE_REPOSITORY,
  INVENTORY_ITEM_REPOSITORY, PURCHASE_ORDER_REPOSITORY, SUPPLIER_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaGoodsIssueRepository, PrismaGoodsReceiptNoteRepository,
  PrismaInventoryItemRepository, PrismaPurchaseOrderRepository, PrismaSupplierRepository,
} from './infrastructure/repositories/prisma-inventory.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    InventoryItemsController, InventorySuppliersController,
    PurchaseOrdersController, GrnsController, GoodsIssuesController,
    StockMovementsController,
  ],
  providers: [
    InventoryService,
    // Repositories
    { provide: INVENTORY_ITEM_REPOSITORY, useClass: PrismaInventoryItemRepository },
    { provide: SUPPLIER_REPOSITORY, useClass: PrismaSupplierRepository },
    { provide: PURCHASE_ORDER_REPOSITORY, useClass: PrismaPurchaseOrderRepository },
    { provide: GOODS_RECEIPT_NOTE_REPOSITORY, useClass: PrismaGoodsReceiptNoteRepository },
    { provide: GOODS_ISSUE_REPOSITORY, useClass: PrismaGoodsIssueRepository },
    // CQRS
    CommandBus, QueryBus,
    CreateItemCommandHandler, UpdateItemCommandHandler, AdjustStockCommandHandler,
    DeactivateItemCommandHandler,
    CreateSupplierCommandHandler, UpdateSupplierCommandHandler, BlacklistSupplierCommandHandler,
    CreatePurchaseOrderCommandHandler, IssuePurchaseOrderCommandHandler, CancelPurchaseOrderCommandHandler,
    CreateGrnCommandHandler, PostGrnCommandHandler,
    CreateGoodsIssueCommandHandler, PostGoodsIssueCommandHandler,
    // Queries
    GetItemQueryHandler, ListItemsQueryHandler,
    GetSupplierQueryHandler, ListSuppliersQueryHandler,
    GetPurchaseOrderQueryHandler, ListPurchaseOrdersQueryHandler,
    GetGrnQueryHandler, ListGrnsQueryHandler,
    GetGoodsIssueQueryHandler, ListGoodsIssuesQueryHandler,
    GetStockMovementHistoryQueryHandler,
  ],
  exports: [InventoryService],
})
export class InventoryModule {}
