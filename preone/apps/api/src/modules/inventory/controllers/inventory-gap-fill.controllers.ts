/**
 * Inventory Gap-Fill Controllers — Wave 21.
 *
 * Adds 15 missing REST endpoints across the Inventory bounded
 * context to complete the API surface catalogued in the API Contract v1.0.
 *
 * Routes (all under /v1/inventory):
 *   PATCH  /v1/inventory/items/:id                                — Update item details
 *   DELETE /v1/inventory/items/:id                                — Deactivate item
 *   GET    /v1/inventory/items/low-stock                          — List items below reorder level
 *   GET    /v1/inventory/items/by-category/:category              — List items by category
 *   PATCH  /v1/inventory/suppliers/:id                            — Update supplier details
 *   DELETE /v1/inventory/suppliers/:id                            — Deactivate supplier
 *   PATCH  /v1/inventory/purchase-orders/:id                      — Update PO notes
 *   POST   /v1/inventory/purchase-orders/:id/receive              — Partially receive a PO
 *   GET    /v1/inventory/purchase-orders/:id/grns                 — List GRNs against a PO
 *   PATCH  /v1/inventory/grns/:id                                 — Update GRN notes
 *   DELETE /v1/inventory/grns/:id                                 — Cancel GRN
 *   PATCH  /v1/inventory/goods-issues/:id                         — Update goods issue notes
 *   DELETE /v1/inventory/goods-issues/:id                         — Cancel goods issue
 *   GET    /v1/inventory/stock-movements                          — Stock movement history
 *   POST   /v1/inventory/stock-audits                             — Create a stock audit
 *
 * Wave 21 strategy:
 *   - PATCH endpoints update mutable fields (route to existing service methods
 *     where available, otherwise return a structured stub for handler wiring).
 *   - DELETE endpoints perform soft-delete (set deletedAt) or hard-delete with
 *     admin override — handlers enforce tenant scoping + audit logging.
 *   - GET sub-resource listings return shape { success: true, data: [...] }
 *     consistent with API Contract §3 (Response Envelope).
 *   - Export endpoints return 501 GAP_FILL_PENDING until csv-writer is wired.
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';

@Controller('v1/inventory')
export class InventoryGapFillControllerPart1 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Patch('items/:id')
  async patchItemsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateItem',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('items/:id')
  async deleteItemsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Inventory.DeleteItem',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('items/low-stock')
  async getItemsLowstock(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListLowStock',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Get('items/by-category/:category')
  async getItemsBycategoryBycategory(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.GetByCategory',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('suppliers/:id')
  async patchSuppliersByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateSupplier',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('suppliers/:id')
  async deleteSuppliersByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Inventory.DeleteSupplier',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('purchase-orders/:id')
  async patchPurchaseordersByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdatePurchaseOrder',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/inventory')
export class InventoryGapFillControllerPart2 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Post('purchase-orders/:id/receive')
  async postPurchaseordersByidReceive(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.Receive',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('purchase-orders/:id/grns')
  async getPurchaseordersByidGrns(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListPurchaseOrderGrns',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
  @Patch('grns/:id')
  async patchGrnsByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateGrn',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('grns/:id')
  async deleteGrnsByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Inventory.DeleteGrn',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Patch('goods-issues/:id')
  async patchGoodsissuesByid(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.UpdateGoodsIssue',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Delete('goods-issues/:id')
  async deleteGoodsissuesByid(@Param() params: any, @Body() body: any = {}) {
    return this.bus.execute({
      type: 'Inventory.DeleteGoodsIssue',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
  @Get('stock-movements')
  async getStockmovements(@Param() params: any, @Query() q: any) {
    return this.qbus.execute({
      type: 'Inventory.ListStockMovements',
      payload: { ...params, ...q },
      metadata: { actorId: 'system', tenantId: (q?.tenantId ?? params?.tenantId ?? 'system') },
    });
  }
}

@Controller('v1/inventory')
export class InventoryGapFillControllerPart3 {
  constructor(
    private readonly bus: CommandBus,
    private readonly qbus: QueryBus,
  ) {}

  @Post('stock-audits')
  async postStockaudits(@Param() params: any, @Body() body: any) {
    return this.bus.execute({
      type: 'Inventory.CreateStockAudit',
      payload: { ...params, ...body },
      metadata: { actorId: (body?.actorId ?? 'system'), tenantId: (body?.tenantId ?? 'system') },
    });
  }
}


