/**
 * Inventory Controllers — REST API surface (BTD §7).
 *
 * Routes (all under /v1/inventory):
 *   POST   /items                  — create item
 *   PATCH  /items/:id              — update item
 *   POST   /items/:id/adjust       — adjust stock (+/-)
 *   POST   /items/:id/deactivate   — deactivate
 *   GET    /items                  — list (filter by category, lowStockOnly)
 *   GET    /items/:id              — get single
 *
 *   POST   /suppliers              — create supplier
 *   PATCH  /suppliers/:id          — update supplier
 *   POST   /suppliers/:id/blacklist — blacklist supplier
 *   GET    /suppliers              — list
 *   GET    /suppliers/:id          — get single
 *
 *   POST   /purchase-orders        — create PO
 *   POST   /purchase-orders/:id/issue  — issue PO to supplier
 *   POST   /purchase-orders/:id/cancel — cancel PO
 *   GET    /purchase-orders        — list
 *   GET    /purchase-orders/:id    — get single
 *
 *   POST   /grns                   — create GRN
 *   POST   /grns/:id/post          — post GRN (commits stock)
 *   GET    /grns                   — list
 *   GET    /grns/:id               — get single
 *
 *   POST   /goods-issues           — create goods issue
 *   POST   /goods-issues/:id/post  — post (commits stock)
 *   GET    /goods-issues           — list
 *   GET    /goods-issues/:id       — get single
 *
 *   GET    /stock-movements        — list stock movement history
 */
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

// ─── Items ────────────────────────────────────────────────────

@Controller('v1/inventory/items')
export class InventoryItemsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreateItem',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateItem',
      payload: { itemId: id, tenantId: body.tenantId, changes: body.changes ?? {} },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/adjust')
  async adjust(@Param('id') id: string, @Body() body: { delta: number; reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.AdjustStock',
      payload: { itemId: id, delta: body.delta, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.DeactivateItem',
      payload: { itemId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListItems',
      payload: {
        tenantId: q.tenantId,
        category: q.category,
        activeOnly: q.activeOnly === 'true',
        lowStockOnly: q.lowStockOnly === 'true',
        limit: q.limit ? Number(q.limit) : undefined,
        offset: q.offset ? Number(q.offset) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Inventory.GetItem',
      payload: { itemId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Suppliers ────────────────────────────────────────────────

@Controller('v1/inventory/suppliers')
export class InventorySuppliersController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreateSupplier',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateSupplier',
      payload: { supplierId: id, tenantId: body.tenantId, changes: body.changes ?? {} },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/blacklist')
  async blacklist(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.BlacklistSupplier',
      payload: { supplierId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListSuppliers',
      payload: {
        tenantId: q.tenantId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Inventory.GetSupplier',
      payload: { supplierId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Purchase Orders ──────────────────────────────────────────

@Controller('v1/inventory/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreatePurchaseOrder',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/issue')
  async issue(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.IssuePurchaseOrder',
      payload: { poId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: { reason: string; tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.CancelPurchaseOrder',
      payload: { poId: id, reason: body.reason, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListPurchaseOrders',
      payload: {
        tenantId: q.tenantId,
        supplierId: q.supplierId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Inventory.GetPurchaseOrder',
      payload: { poId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── GRN ──────────────────────────────────────────────────────

@Controller('v1/inventory/grns')
export class GrnsController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreateGrn',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/post')
  async post(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.PostGrn',
      payload: { grnId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListGrns',
      payload: {
        tenantId: q.tenantId,
        poId: q.poId,
        supplierId: q.supplierId,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Inventory.GetGrn',
      payload: { grnId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Goods Issues ─────────────────────────────────────────────

@Controller('v1/inventory/goods-issues')
export class GoodsIssuesController {
  constructor(private readonly bus: CommandBus, private readonly qbus: QueryBus) {}

  @Post()
  async create(@Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreateGoodsIssue',
      payload: body,
      metadata: { actorId: body.actorId ?? 'system', tenantId: body.tenantId },
    });
  }

  @Post(':id/post')
  async post(@Param('id') id: string, @Body() body: { tenantId: string }) {
    return this.bus.execute({
      type: 'Inventory.PostGoodsIssue',
      payload: { issueId: id, tenantId: body.tenantId },
      metadata: { actorId: 'system', tenantId: body.tenantId },
    });
  }

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListGoodsIssues',
      payload: {
        tenantId: q.tenantId,
        issuedToId: q.issuedToId,
        status: q.status,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.qbus.execute({
      type: 'Inventory.GetGoodsIssue',
      payload: { issueId: id, tenantId },
      metadata: { actorId: 'system', tenantId },
    });
  }
}

// ─── Stock Movements ──────────────────────────────────────────

@Controller('v1/inventory/stock-movements')
export class StockMovementsController {
  constructor(private readonly qbus: QueryBus) {}

  @Get()
  async list(@Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.GetStockMovementHistory',
      payload: {
        tenantId: q.tenantId,
        itemId: q.itemId,
        limit: q.limit ? Number(q.limit) : undefined,
      },
      metadata: { actorId: 'system', tenantId: q.tenantId },
    });
  }
}
