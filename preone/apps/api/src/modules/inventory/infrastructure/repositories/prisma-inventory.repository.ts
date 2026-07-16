/**
 * PrismaInventoryRepository — concrete impl of Inventory repos.
 */
import { Injectable } from '@nestjs/common';

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

// ─── Inventory Item Repository ────────────────────────────────

@Injectable()
export class PrismaInventoryItemRepository implements InventoryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: InventoryItemAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.inventoryItem.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        itemCode: p.itemCode,
        name: p.name,
        description: p.description,
        category: p.category as any,
        unit: p.unit as any,
        hsnCode: p.hsnCode,
        reorderLevel: p.reorderLevel,
        reorderQty: p.reorderQty,
        maxLevel: p.maxLevel,
        currentStock: p.currentStock,
        reservedStock: p.reservedStock,
        unitCostCents: p.unitCostCents,
        valuationCents: p.valuationCents,
        isPerishable: p.isPerishable,
        shelfLifeDays: p.shelfLifeDays,
        isAssetTracked: p.isAssetTracked,
        assetPrefix: p.assetPrefix,
        isActive: p.isActive,
      },
      update: {
        name: p.name,
        description: p.description,
        reorderLevel: p.reorderLevel,
        reorderQty: p.reorderQty,
        maxLevel: p.maxLevel,
        currentStock: p.currentStock,
        reservedStock: p.reservedStock,
        unitCostCents: p.unitCostCents,
        valuationCents: p.valuationCents,
        isPerishable: p.isPerishable,
        shelfLifeDays: p.shelfLifeDays,
        isActive: p.isActive,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<InventoryItemAggregate | null> {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCode(tenantId: string, itemCode: string): Promise<InventoryItemAggregate | null> {
    const row = await this.prisma.inventoryItem.findFirst({
      where: { schoolId: tenantId, itemCode },
    });
    return row ? this._hydrate(row) : null;
  }

  async findLowStock(tenantId: string, limit = 100): Promise<InventoryItemAggregate[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { schoolId: tenantId, isActive: true, currentStock: { lte: 0 } },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  async findActive(tenantId: string, limit = 100): Promise<InventoryItemAggregate[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { schoolId: tenantId, isActive: true },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): InventoryItemAggregate {
    const agg = Object.create(InventoryItemAggregate.prototype) as InventoryItemAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      itemCode: row.itemCode,
      name: row.name,
      description: row.description,
      category: row.category,
      unit: row.unit,
      hsnCode: row.hsnCode,
      reorderLevel: row.reorderLevel,
      reorderQty: row.reorderQty,
      maxLevel: row.maxLevel,
      currentStock: row.currentStock,
      reservedStock: row.reservedStock,
      unitCostCents: row.unitCostCents,
      valuationCents: row.valuationCents,
      isPerishable: row.isPerishable,
      shelfLifeDays: row.shelfLifeDays,
      isAssetTracked: row.isAssetTracked,
      assetPrefix: row.assetPrefix,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    return agg;
  }
}

// ─── Supplier Repository ──────────────────────────────────────

@Injectable()
export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: SupplierAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.supplier.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        supplierCode: p.supplierCode,
        name: p.name,
        legalName: p.legalName,
        gstNumber: p.gstNumber,
        panNumber: p.panNumber,
        contactPerson: p.contactPerson,
        email: p.email,
        phone: p.phone,
        addressLine1: p.addressLine1,
        addressLine2: p.addressLine2,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        paymentTerms: p.paymentTerms,
        status: p.status as any,
      },
      update: {
        name: p.name,
        legalName: p.legalName,
        gstNumber: p.gstNumber,
        panNumber: p.panNumber,
        contactPerson: p.contactPerson,
        email: p.email,
        phone: p.phone,
        addressLine1: p.addressLine1,
        addressLine2: p.addressLine2,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        paymentTerms: p.paymentTerms,
        status: p.status as any,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<SupplierAggregate | null> {
    const row = await this.prisma.supplier.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCode(tenantId: string, supplierCode: string): Promise<SupplierAggregate | null> {
    const row = await this.prisma.supplier.findFirst({
      where: { schoolId: tenantId, supplierCode },
    });
    return row ? this._hydrate(row) : null;
  }

  async findActive(tenantId: string, limit = 100): Promise<SupplierAggregate[]> {
    const rows = await this.prisma.supplier.findMany({
      where: { schoolId: tenantId, status: 'ACTIVE' },
      take: limit,
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): SupplierAggregate {
    const agg = Object.create(SupplierAggregate.prototype) as SupplierAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      supplierCode: row.supplierCode,
      name: row.name,
      legalName: row.legalName,
      gstNumber: row.gstNumber,
      panNumber: row.panNumber,
      contactPerson: row.contactPerson,
      email: row.email,
      phone: row.phone,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      paymentTerms: row.paymentTerms,
      status: row.status,
      blacklistReason: undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── Purchase Order Repository ────────────────────────────────

@Injectable()
export class PrismaPurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: PurchaseOrderAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.upsert({
        where: { id: agg.id },
        create: {
          id: agg.id,
          schoolId: p.tenantId,
          branchId: p.branchId,
          poNumber: p.poNumber,
          supplierId: p.supplierId,
          issuedById: p.issuedById,
          status: p.status as any,
          sourcePrId: p.sourcePrId,
          subtotalCents: p.subtotalCents,
          taxCents: p.taxCents,
          shippingCents: p.shippingCents,
          totalCents: p.totalCents,
          expectedDate: p.expectedDate ? new Date(p.expectedDate) : null,
          issuedAt: p.issuedAt ? new Date(p.issuedAt) : null,
          closedAt: p.closedAt ? new Date(p.closedAt) : null,
          notes: p.notes,
        },
        update: {
          status: p.status as any,
          subtotalCents: p.subtotalCents,
          taxCents: p.taxCents,
          totalCents: p.totalCents,
          issuedAt: p.issuedAt ? new Date(p.issuedAt) : null,
          closedAt: p.closedAt ? new Date(p.closedAt) : null,
        },
      });
      // Upsert lines
      for (const line of p.lines) {
        await tx.purchaseOrderLine.upsert({
          where: { id: line.id },
          create: {
            id: line.id,
            schoolId: p.tenantId,
            poId: agg.id,
            itemId: line.itemId,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            taxRatePercent: line.taxRatePercent,
            lineTotalCents: line.lineTotalCents,
            receivedQty: line.receivedQty,
          },
          update: {
            receivedQty: line.receivedQty,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            lineTotalCents: line.lineTotalCents,
          },
        });
      }
    });
  }

  async findById(id: string, tenantId: string): Promise<PurchaseOrderAggregate | null> {
    const row = await this.prisma.purchaseOrder.findFirst({
      where: { id, schoolId: tenantId },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByPoNumber(tenantId: string, poNumber: string): Promise<PurchaseOrderAggregate | null> {
    const row = await this.prisma.purchaseOrder.findFirst({
      where: { schoolId: tenantId, poNumber },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findOpenBySupplier(supplierId: string, tenantId: string): Promise<PurchaseOrderAggregate[]> {
    const rows = await this.prisma.purchaseOrder.findMany({
      where: { schoolId: tenantId, supplierId, status: { in: ['ISSUED', 'PARTIALLY_RECEIVED'] } },
      include: { lines: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): PurchaseOrderAggregate {
    const agg = Object.create(PurchaseOrderAggregate.prototype) as PurchaseOrderAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      poNumber: row.poNumber,
      supplierId: row.supplierId,
      issuedById: row.issuedById,
      status: row.status,
      sourcePrId: row.sourcePrId,
      lines: row.lines.map((l: any) => ({
        id: l.id,
        itemId: l.itemId,
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        taxRatePercent: Number(l.taxRatePercent),
        lineTotalCents: l.lineTotalCents,
        receivedQty: l.receivedQty,
      })),
      subtotalCents: row.subtotalCents,
      taxCents: row.taxCents,
      shippingCents: row.shippingCents,
      totalCents: row.totalCents,
      expectedDate: row.expectedDate?.toISOString(),
      issuedAt: row.issuedAt?.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── GRN Repository ───────────────────────────────────────────

@Injectable()
export class PrismaGoodsReceiptNoteRepository implements GoodsReceiptNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: GoodsReceiptNoteAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.$transaction(async (tx) => {
      await tx.goodsReceiptNote.upsert({
        where: { id: agg.id },
        create: {
          id: agg.id,
          schoolId: p.tenantId,
          branchId: p.branchId,
          grnNumber: p.grnNumber,
          poId: p.poId,
          supplierId: p.supplierId,
          receivedById: p.receivedById,
          status: p.status as any,
          invoiceNumber: p.invoiceNumber,
          invoiceDate: p.invoiceDate ? new Date(p.invoiceDate) : null,
          challanNumber: p.challanNumber,
          receivedAt: new Date(p.receivedAt),
          notes: p.notes,
        },
        update: { status: p.status as any },
      });
      for (const line of p.lines) {
        await tx.grnLine.upsert({
          where: { id: line.id },
          create: {
            id: line.id,
            schoolId: p.tenantId,
            grnId: agg.id,
            poLineId: line.poLineId,
            itemId: line.itemId,
            orderedQty: line.orderedQty,
            receivedQty: line.receivedQty,
            acceptedQty: line.acceptedQty,
            rejectedQty: line.rejectedQty,
            rejectionReason: line.rejectionReason,
            unitCostCents: line.unitCostCents,
            lotNumber: line.lotNumber,
            expiresAt: line.expiresAt ? new Date(line.expiresAt) : null,
          },
          update: {
            acceptedQty: line.acceptedQty,
            rejectedQty: line.rejectedQty,
          },
        });
      }
    });
  }

  async findById(id: string, tenantId: string): Promise<GoodsReceiptNoteAggregate | null> {
    const row = await this.prisma.goodsReceiptNote.findFirst({
      where: { id, schoolId: tenantId },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByGrnNumber(tenantId: string, grnNumber: string): Promise<GoodsReceiptNoteAggregate | null> {
    const row = await this.prisma.goodsReceiptNote.findFirst({
      where: { schoolId: tenantId, grnNumber },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  private _hydrate(row: any): GoodsReceiptNoteAggregate {
    const agg = Object.create(GoodsReceiptNoteAggregate.prototype) as GoodsReceiptNoteAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      grnNumber: row.grnNumber,
      poId: row.poId,
      supplierId: row.supplierId,
      receivedById: row.receivedById,
      status: row.status,
      invoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate?.toISOString(),
      challanNumber: row.challanNumber,
      receivedAt: row.receivedAt.toISOString(),
      notes: row.notes,
      lines: row.lines.map((l: any) => ({
        id: l.id,
        poLineId: l.poLineId,
        itemId: l.itemId,
        orderedQty: l.orderedQty,
        receivedQty: l.receivedQty,
        acceptedQty: l.acceptedQty,
        rejectedQty: l.rejectedQty,
        rejectionReason: l.rejectionReason,
        unitCostCents: l.unitCostCents,
        lotNumber: l.lotNumber,
        expiresAt: l.expiresAt?.toISOString(),
      })),
      totalAcceptedCents: row.lines.reduce(
        (s: number, l: any) => s + l.acceptedQty * l.unitCostCents, 0,
      ),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── Goods Issue Repository ───────────────────────────────────

@Injectable()
export class PrismaGoodsIssueRepository implements GoodsIssueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: GoodsIssueAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.$transaction(async (tx) => {
      await tx.goodsIssue.upsert({
        where: { id: agg.id },
        create: {
          id: agg.id,
          schoolId: p.tenantId,
          branchId: p.branchId,
          issueNumber: p.issueNumber,
          issuedToId: p.issuedToId,
          issuedById: p.issuedById,
          status: p.status as any,
          issueDate: new Date(p.issueDate),
          department: p.department,
          purpose: p.purpose,
        },
        update: { status: p.status as any },
      });
      for (const line of p.lines) {
        await tx.goodsIssueLine.upsert({
          where: { id: line.id },
          create: {
            id: line.id,
            schoolId: p.tenantId,
            issueId: agg.id,
            itemId: line.itemId,
            lotId: line.lotId,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            lineTotalCents: line.lineTotalCents,
          },
          update: {},
        });
      }
    });
  }

  async findById(id: string, tenantId: string): Promise<GoodsIssueAggregate | null> {
    const row = await this.prisma.goodsIssue.findFirst({
      where: { id, schoolId: tenantId },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByIssueNumber(tenantId: string, issueNumber: string): Promise<GoodsIssueAggregate | null> {
    const row = await this.prisma.goodsIssue.findFirst({
      where: { schoolId: tenantId, issueNumber },
      include: { lines: true },
    });
    return row ? this._hydrate(row) : null;
  }

  private _hydrate(row: any): GoodsIssueAggregate {
    const agg = Object.create(GoodsIssueAggregate.prototype) as GoodsIssueAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      issueNumber: row.issueNumber,
      issuedToId: row.issuedToId,
      issuedById: row.issuedById,
      status: row.status,
      issueDate: row.issueDate.toISOString(),
      department: row.department,
      purpose: row.purpose,
      lines: row.lines.map((l: any) => ({
        id: l.id,
        itemId: l.itemId,
        lotId: l.lotId,
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        lineTotalCents: l.lineTotalCents,
      })),
      totalCents: row.lines.reduce((s: number, l: any) => s + l.lineTotalCents, 0),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
