/**
 * InventoryItemAggregate — master record for a stock-keeping unit.
 *
 * Per BRC §11 (Inventory Rules):
 *   - R-INV-001: Minimum stock threshold per item
 *   - R-INV-002: Auto reorder when stock < reorderLevel
 *   - R-INV-003: Perishable expiry tracking
 *   - R-INV-005: Asset depreciation
 *   - R-INV-011: Consumption tracking
 *
 * Invariants:
 *   - itemCode is unique per school
 *   - currentStock = sum of stock_lots.quantity_on_hand (eventually consistent)
 *   - reservedStock ≤ currentStock
 *   - available = currentStock - reservedStock
 *   - Cannot deactivate item with non-zero stock
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { EnforcesRule } from '@common/brc/brc-trace.decorator';

import {
  ItemCreatedEvent, ItemUpdatedEvent, ItemDeactivatedEvent,
  StockAdjustedEvent, StockLowEvent,
} from '../events/inventory-events';

export type InventoryItemType =
  | 'CONSUMABLE' | 'ASSET' | 'EQUIPMENT' | 'PERISHABLE'
  | 'STATIONERY' | 'CLEANING' | 'MEDICAL';

export type InventoryUnit =
  | 'PIECE' | 'KG' | 'LITER' | 'METER' | 'BOX' | 'PACK' | 'BOTTLE' | 'ROLL' | 'SET';

export interface InventoryItemProps {
  tenantId: string;
  branchId?: string;
  itemCode: string;
  name: string;
  description?: string;
  category: InventoryItemType;
  unit: InventoryUnit;
  hsnCode?: string;
  reorderLevel: number;
  reorderQty: number;
  maxLevel?: number;
  currentStock: number;
  reservedStock: number;
  unitCostCents: number;
  valuationCents: number;
  isPerishable: boolean;
  shelfLifeDays?: number;
  isAssetTracked: boolean;
  assetPrefix?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@EnforcesRule('R-INV-001', { kind: 'aggregate' })
@EnforcesRule('R-INV-002', { kind: 'aggregate' })
@EnforcesRule('R-INV-003', { kind: 'aggregate' })
@EnforcesRule('R-INV-005', { kind: 'aggregate' })
@EnforcesRule('R-INV-011', { kind: 'aggregate' })
export class InventoryItemAggregate extends AggregateRoot<InventoryItemProps> {
  get tenantId(): string { return this._props.tenantId; }
  get itemCode(): string { return this._props.itemCode; }
  get name(): string { return this._props.name; }
  get category(): InventoryItemType { return this._props.category; }
  get currentStock(): number { return this._props.currentStock; }
  get reservedStock(): number { return this._props.reservedStock; }
  get availableStock(): number { return this._props.currentStock - this._props.reservedStock; }
  get reorderLevel(): number { return this._props.reorderLevel; }
  get isActive(): boolean { return this._props.isActive; }
  get isPerishable(): boolean { return this._props.isPerishable; }
  get isLowStock(): boolean { return this._props.currentStock <= this._props.reorderLevel; }

  static create(props: Omit<
    InventoryItemProps,
    'currentStock' | 'reservedStock' | 'valuationCents' |
    'isActive' | 'createdAt' | 'updatedAt'
  >): InventoryItemAggregate {
    const now = new Date().toISOString();
    const agg = new InventoryItemAggregate({
      ...props,
      currentStock: 0,
      reservedStock: 0,
      valuationCents: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new ItemCreatedEvent({
      itemId: agg.id,
      tenantId: agg._props.tenantId,
      branchId: agg._props.branchId,
      itemCode: agg._props.itemCode,
      name: agg._props.name,
      category: agg._props.category,
      unit: agg._props.unit,
    }));
    return agg;
  }

  update(changes: Partial<Omit<InventoryItemProps, 'tenantId' | 'itemCode' | 'currentStock' | 'reservedStock' | 'createdAt'>>): void {
    Object.assign(this._props, changes);
    this._touch();
    this._addDomainEvent(new ItemUpdatedEvent({
      itemId: this.id,
      tenantId: this._props.tenantId,
      changes,
    }));
  }

  adjustStock(delta: number, reason: string): void {
    if (!this._props.isActive) {
      throw new Error('Cannot adjust stock on inactive item');
    }
    const newBalance = this._props.currentStock + delta;
    if (newBalance < 0) {
      throw new Error(`Insufficient stock: current=${this._props.currentStock}, delta=${delta}`);
    }
    this._props.currentStock = newBalance;
    this._props.valuationCents = newBalance * this._props.unitCostCents;
    this._touch();
    this._addDomainEvent(new StockAdjustedEvent({
      itemId: this.id,
      tenantId: this._props.tenantId,
      delta,
      newBalance,
      reason,
    }));
    if (this.isLowStock) {
      this._addDomainEvent(new StockLowEvent({
        itemId: this.id,
        tenantId: this._props.tenantId,
        currentStock: this._props.currentStock,
        reorderLevel: this._props.reorderLevel,
      }));
    }
  }

  reserve(qty: number): void {
    if (qty <= 0) throw new Error('Reserve qty must be positive');
    if (this.availableStock < qty) {
      throw new Error(`Cannot reserve ${qty}: available=${this.availableStock}`);
    }
    this._props.reservedStock += qty;
    this._touch();
  }

  releaseReservation(qty: number): void {
    if (qty <= 0) throw new Error('Release qty must be positive');
    if (this._props.reservedStock < qty) {
      throw new Error(`Cannot release ${qty}: reserved=${this._props.reservedStock}`);
    }
    this._props.reservedStock -= qty;
    this._touch();
  }

  deactivate(): void {
    if (this._props.currentStock > 0) {
      throw new Error(`Cannot deactivate item with non-zero stock (${this._props.currentStock})`);
    }
    this._props.isActive = false;
    this._touch();
    this._addDomainEvent(new ItemDeactivatedEvent({
      itemId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
