/**
 * Inventory Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AdjustStockCommand, BlacklistSupplierCommand, CancelPurchaseOrderCommand,
  CreateGoodsIssueCommand, CreateGrnCommand, CreateItemCommand,
  CreatePurchaseOrderCommand, CreateSupplierCommand, DeactivateItemCommand,
  IssuePurchaseOrderCommand, PostGrnCommand, PostGoodsIssueCommand,
  UpdateItemCommand, UpdateSupplierCommand,
} from '../commands/inventory.commands';
import { InventoryService } from '../services/inventory.service';

@Injectable()
export class CreateItemCommandHandler implements CommandHandler<CreateItemCommand> {
  private static readonly TYPE = 'Inventory.CreateItem';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CreateItemCommandHandler.TYPE, this);
  }
  async handle(c: CreateItemCommand) {
    const item = await this.svc.createItem(c.payload);
    return { id: item.id };
  }
}

@Injectable()
export class UpdateItemCommandHandler implements CommandHandler<UpdateItemCommand> {
  private static readonly TYPE = 'Inventory.UpdateItem';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(UpdateItemCommandHandler.TYPE, this);
  }
  async handle(c: UpdateItemCommand) {
    await this.svc.updateItem(c.payload.itemId, c.payload.tenantId, c.payload.changes);
    return { id: c.payload.itemId };
  }
}

@Injectable()
export class AdjustStockCommandHandler implements CommandHandler<AdjustStockCommand> {
  private static readonly TYPE = 'Inventory.AdjustStock';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(AdjustStockCommandHandler.TYPE, this);
  }
  async handle(c: AdjustStockCommand) {
    const newBalance = await this.svc.adjustStock(c.payload.itemId, c.payload.tenantId, c.payload.delta, c.payload.reason);
    return { id: c.payload.itemId, newBalance };
  }
}

@Injectable()
export class DeactivateItemCommandHandler implements CommandHandler<DeactivateItemCommand> {
  private static readonly TYPE = 'Inventory.DeactivateItem';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(DeactivateItemCommandHandler.TYPE, this);
  }
  async handle(c: DeactivateItemCommand) {
    await this.svc.deactivateItem(c.payload.itemId, c.payload.tenantId);
    return { id: c.payload.itemId };
  }
}

@Injectable()
export class CreateSupplierCommandHandler implements CommandHandler<CreateSupplierCommand> {
  private static readonly TYPE = 'Inventory.CreateSupplier';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CreateSupplierCommandHandler.TYPE, this);
  }
  async handle(c: CreateSupplierCommand) {
    const s = await this.svc.createSupplier(c.payload);
    return { id: s.id };
  }
}

@Injectable()
export class UpdateSupplierCommandHandler implements CommandHandler<UpdateSupplierCommand> {
  private static readonly TYPE = 'Inventory.UpdateSupplier';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(UpdateSupplierCommandHandler.TYPE, this);
  }
  async handle(c: UpdateSupplierCommand) {
    await this.svc.updateSupplier(c.payload.supplierId, c.payload.tenantId, c.payload.changes);
    return { id: c.payload.supplierId };
  }
}

@Injectable()
export class BlacklistSupplierCommandHandler implements CommandHandler<BlacklistSupplierCommand> {
  private static readonly TYPE = 'Inventory.BlacklistSupplier';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(BlacklistSupplierCommandHandler.TYPE, this);
  }
  async handle(c: BlacklistSupplierCommand) {
    await this.svc.blacklistSupplier(c.payload.supplierId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.supplierId };
  }
}

@Injectable()
export class CreatePurchaseOrderCommandHandler implements CommandHandler<CreatePurchaseOrderCommand> {
  private static readonly TYPE = 'Inventory.CreatePurchaseOrder';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CreatePurchaseOrderCommandHandler.TYPE, this);
  }
  async handle(c: CreatePurchaseOrderCommand) {
    const po = await this.svc.createPurchaseOrder(c.payload);
    return { id: po.id, poNumber: po.poNumber };
  }
}

@Injectable()
export class IssuePurchaseOrderCommandHandler implements CommandHandler<IssuePurchaseOrderCommand> {
  private static readonly TYPE = 'Inventory.IssuePurchaseOrder';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(IssuePurchaseOrderCommandHandler.TYPE, this);
  }
  async handle(c: IssuePurchaseOrderCommand) {
    await this.svc.issuePurchaseOrder(c.payload.poId, c.payload.tenantId);
    return { id: c.payload.poId };
  }
}

@Injectable()
export class CancelPurchaseOrderCommandHandler implements CommandHandler<CancelPurchaseOrderCommand> {
  private static readonly TYPE = 'Inventory.CancelPurchaseOrder';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CancelPurchaseOrderCommandHandler.TYPE, this);
  }
  async handle(c: CancelPurchaseOrderCommand) {
    await this.svc.cancelPurchaseOrder(c.payload.poId, c.payload.tenantId, c.payload.reason);
    return { id: c.payload.poId };
  }
}

@Injectable()
export class CreateGrnCommandHandler implements CommandHandler<CreateGrnCommand> {
  private static readonly TYPE = 'Inventory.CreateGrn';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CreateGrnCommandHandler.TYPE, this);
  }
  async handle(c: CreateGrnCommand) {
    const g = await this.svc.createGrn(c.payload);
    return { id: g.id, grnNumber: g.grnNumber };
  }
}

@Injectable()
export class PostGrnCommandHandler implements CommandHandler<PostGrnCommand> {
  private static readonly TYPE = 'Inventory.PostGrn';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(PostGrnCommandHandler.TYPE, this);
  }
  async handle(c: PostGrnCommand) {
    await this.svc.postGrn(c.payload.grnId, c.payload.tenantId);
    return { id: c.payload.grnId };
  }
}

@Injectable()
export class CreateGoodsIssueCommandHandler implements CommandHandler<CreateGoodsIssueCommand> {
  private static readonly TYPE = 'Inventory.CreateGoodsIssue';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(CreateGoodsIssueCommandHandler.TYPE, this);
  }
  async handle(c: CreateGoodsIssueCommand) {
    const i = await this.svc.createGoodsIssue(c.payload);
    return { id: i.id, issueNumber: i.issueNumber };
  }
}

@Injectable()
export class PostGoodsIssueCommandHandler implements CommandHandler<PostGoodsIssueCommand> {
  private static readonly TYPE = 'Inventory.PostGoodsIssue';
  constructor(private readonly bus: CommandBus, private readonly svc: InventoryService) {
    bus.register(PostGoodsIssueCommandHandler.TYPE, this);
  }
  async handle(c: PostGoodsIssueCommand) {
    await this.svc.postGoodsIssue(c.payload.issueId, c.payload.tenantId);
    return { id: c.payload.issueId };
  }
}
