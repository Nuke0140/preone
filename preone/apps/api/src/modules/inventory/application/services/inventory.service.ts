/**
 * InventoryService — application-layer orchestrator for the Inventory bounded
 * context (BTD §4.3 #9).
 *
 * Responsibilities:
 *   - Manage item master (create, update, deactivate)
 *   - Manage supplier master (create, update, blacklist)
 *   - Purchase order lifecycle (create → issue → receive via GRN → close/cancel)
 *   - GRN lifecycle (create → post — posts stock movements + lots)
 *   - Goods issue lifecycle (create → post — reduces stock)
 *   - Stock adjustments (manual + via GRN/GoodsIssue)
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { GoodsIssueAggregate } from '../../domain/aggregates/goods-issue.aggregate';
import { GoodsReceiptNoteAggregate } from '../../domain/aggregates/goods-receipt-note.aggregate';
import { InventoryItemAggregate } from '../../domain/aggregates/inventory-item.aggregate';
import { PurchaseOrderAggregate } from '../../domain/aggregates/purchase-order.aggregate';
import { SupplierAggregate } from '../../domain/aggregates/supplier.aggregate';
import type {
  GoodsIssueRepository, GoodsReceiptNoteRepository, InventoryItemRepository,
  PurchaseOrderRepository, SupplierRepository,
} from '../../domain/repositories/inventory.repository';
import {
  GOODS_ISSUE_REPOSITORY, GOODS_RECEIPT_NOTE_REPOSITORY,
  INVENTORY_ITEM_REPOSITORY, PURCHASE_ORDER_REPOSITORY, SUPPLIER_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @Inject(INVENTORY_ITEM_REPOSITORY) private readonly items: InventoryItemRepository,
    @Inject(SUPPLIER_REPOSITORY) private readonly suppliers: SupplierRepository,
    @Inject(PURCHASE_ORDER_REPOSITORY) private readonly pos: PurchaseOrderRepository,
    @Inject(GOODS_RECEIPT_NOTE_REPOSITORY) private readonly grns: GoodsReceiptNoteRepository,
    @Inject(GOODS_ISSUE_REPOSITORY) private readonly issues: GoodsIssueRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Items ──────────────────────────────────────────────────

  async createItem(props: {
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
  }): Promise<InventoryItemAggregate> {
    const existing = await this.items.findByCode(props.tenantId, props.itemCode);
    if (existing) throw new Error(`Item code ${props.itemCode} already exists`);
    const item = InventoryItemAggregate.create(props);
    await this.items.save(item);
    await this.eventBus.publishAll(item.commit());
    this.logger.log(`Created item ${item.itemCode} (${item.id})`);
    return item;
  }

  async updateItem(itemId: string, tenantId: string, changes: Record<string, unknown>): Promise<void> {
    const item = await this._loadItem(itemId, tenantId);
    item.update(changes);
    await this.items.save(item);
    await this.eventBus.publishAll(item.commit());
  }

  async adjustStock(itemId: string, tenantId: string, delta: number, reason: string): Promise<number> {
    const item = await this._loadItem(itemId, tenantId);
    item.adjustStock(delta, reason);
    await this.items.save(item);
    await this.eventBus.publishAll(item.commit());
    return item.currentStock;
  }

  async deactivateItem(itemId: string, tenantId: string): Promise<void> {
    const item = await this._loadItem(itemId, tenantId);
    item.deactivate();
    await this.items.save(item);
    await this.eventBus.publishAll(item.commit());
  }

  // ─── Suppliers ──────────────────────────────────────────────

  async createSupplier(props: {
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
  }): Promise<SupplierAggregate> {
    const existing = await this.suppliers.findByCode(props.tenantId, props.supplierCode);
    if (existing) throw new Error(`Supplier code ${props.supplierCode} already exists`);
    const s = SupplierAggregate.create(props);
    await this.suppliers.save(s);
    await this.eventBus.publishAll(s.commit());
    this.logger.log(`Created supplier ${s.supplierCode} (${s.id})`);
    return s;
  }

  async updateSupplier(supplierId: string, tenantId: string, changes: Record<string, unknown>): Promise<void> {
    const s = await this._loadSupplier(supplierId, tenantId);
    s.update(changes);
    await this.suppliers.save(s);
    await this.eventBus.publishAll(s.commit());
  }

  async blacklistSupplier(supplierId: string, tenantId: string, reason: string): Promise<void> {
    const s = await this._loadSupplier(supplierId, tenantId);
    s.blacklist(reason);
    await this.suppliers.save(s);
    await this.eventBus.publishAll(s.commit());
  }

  // ─── Purchase Orders ────────────────────────────────────────

  async createPurchaseOrder(props: {
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
  }): Promise<PurchaseOrderAggregate> {
    const existing = await this.pos.findByPoNumber(props.tenantId, props.poNumber);
    if (existing) throw new Error(`PO number ${props.poNumber} already exists`);
    const supplier = await this.suppliers.findById(props.supplierId, props.tenantId);
    if (!supplier) throw new Error(`Supplier ${props.supplierId} not found`);
    if (supplier.status !== 'ACTIVE') throw new Error(`Supplier is ${supplier.status}, cannot create PO`);
    const po = PurchaseOrderAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      poNumber: props.poNumber,
      supplierId: props.supplierId,
      issuedById: props.issuedById,
      sourcePrId: props.sourcePrId,
      shippingCents: props.shippingCents ?? 0,
      expectedDate: props.expectedDate,
      notes: props.notes,
      lines: props.lines,
    });
    await this.pos.save(po);
    await this.eventBus.publishAll(po.commit());
    this.logger.log(`Created PO ${po.poNumber} (${po.id})`);
    return po;
  }

  async issuePurchaseOrder(poId: string, tenantId: string): Promise<void> {
    const po = await this._loadPo(poId, tenantId);
    po.issue(new Date().toISOString());
    await this.pos.save(po);
    await this.eventBus.publishAll(po.commit());
  }

  async cancelPurchaseOrder(poId: string, tenantId: string, reason: string): Promise<void> {
    const po = await this._loadPo(poId, tenantId);
    po.cancel(reason);
    await this.pos.save(po);
    await this.eventBus.publishAll(po.commit());
  }

  // ─── GRN ────────────────────────────────────────────────────

  async createGrn(props: {
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
  }): Promise<GoodsReceiptNoteAggregate> {
    const existing = await this.grns.findByGrnNumber(props.tenantId, props.grnNumber);
    if (existing) throw new Error(`GRN number ${props.grnNumber} already exists`);
    const grn = GoodsReceiptNoteAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      grnNumber: props.grnNumber,
      poId: props.poId,
      supplierId: props.supplierId,
      receivedById: props.receivedById,
      invoiceNumber: props.invoiceNumber,
      invoiceDate: props.invoiceDate,
      challanNumber: props.challanNumber,
      receivedAt: new Date().toISOString(),
      notes: props.notes,
      lines: props.lines,
    });
    await this.grns.save(grn);
    this.logger.log(`Created GRN ${grn.grnNumber} (${grn.id})`);
    return grn;
  }

  async postGrn(grnId: string, tenantId: string): Promise<void> {
    const grn = await this._loadGrn(grnId, tenantId);
    grn.post();
    // Increase stock for each line
    for (const line of grn.lines) {
      const item = await this.items.findById(line.itemId, tenantId);
      if (!item) throw new Error(`Item ${line.itemId} not found for GRN line`);
      item.adjustStock(line.acceptedQty, `GRN ${grn.grnNumber}`);
      await this.items.save(item);
      await this.eventBus.publishAll(item.commit());
    }
    // If linked to PO, update received quantities
    if (grn.poId) {
      const po = await this.pos.findById(grn.poId, tenantId);
      if (po) {
        for (const line of grn.lines) {
          if (line.poLineId) {
            po.recordReceipt(line.poLineId, line.acceptedQty);
          }
        }
        await this.pos.save(po);
        await this.eventBus.publishAll(po.commit());
      }
    }
    await this.grns.save(grn);
    await this.eventBus.publishAll(grn.commit());
  }

  // ─── Goods Issue ────────────────────────────────────────────

  async createGoodsIssue(props: {
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
  }): Promise<GoodsIssueAggregate> {
    const existing = await this.issues.findByIssueNumber(props.tenantId, props.issueNumber);
    if (existing) throw new Error(`Issue number ${props.issueNumber} already exists`);
    // Validate stock availability
    for (const line of props.lines) {
      const item = await this.items.findById(line.itemId, props.tenantId);
      if (!item) throw new Error(`Item ${line.itemId} not found`);
      if (item.availableStock < line.quantity) {
        throw new Error(`Insufficient stock for item ${item.itemCode}: available=${item.availableStock}, requested=${line.quantity}`);
      }
    }
    const issue = GoodsIssueAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      issueNumber: props.issueNumber,
      issuedToId: props.issuedToId,
      issuedById: props.issuedById,
      issueDate: new Date().toISOString(),
      department: props.department,
      purpose: props.purpose,
      lines: props.lines,
    });
    await this.issues.save(issue);
    this.logger.log(`Created goods issue ${issue.issueNumber} (${issue.id})`);
    return issue;
  }

  async postGoodsIssue(issueId: string, tenantId: string): Promise<void> {
    const issue = await this._loadIssue(issueId, tenantId);
    issue.post();
    // Reduce stock for each line
    for (const line of issue.lines) {
      const item = await this.items.findById(line.itemId, tenantId);
      if (!item) throw new Error(`Item ${line.itemId} not found`);
      item.adjustStock(-line.quantity, `Goods issue ${issue.issueNumber}`);
      await this.items.save(item);
      await this.eventBus.publishAll(item.commit());
    }
    await this.issues.save(issue);
    await this.eventBus.publishAll(issue.commit());
  }

  // ─── Helpers ────────────────────────────────────────────────

  private async _loadItem(id: string, tenantId: string): Promise<InventoryItemAggregate> {
    const item = await this.items.findById(id, tenantId);
    if (!item) throw new Error(`Item ${id} not found`);
    return item;
  }

  private async _loadSupplier(id: string, tenantId: string): Promise<SupplierAggregate> {
    const s = await this.suppliers.findById(id, tenantId);
    if (!s) throw new Error(`Supplier ${id} not found`);
    return s;
  }

  private async _loadPo(id: string, tenantId: string): Promise<PurchaseOrderAggregate> {
    const po = await this.pos.findById(id, tenantId);
    if (!po) throw new Error(`Purchase order ${id} not found`);
    return po;
  }

  private async _loadGrn(id: string, tenantId: string): Promise<GoodsReceiptNoteAggregate> {
    const g = await this.grns.findById(id, tenantId);
    if (!g) throw new Error(`GRN ${id} not found`);
    return g;
  }

  private async _loadIssue(id: string, tenantId: string): Promise<GoodsIssueAggregate> {
    const i = await this.issues.findById(id, tenantId);
    if (!i) throw new Error(`Goods issue ${id} not found`);
    return i;
  }
}
