/**
 * PurchaseOrderAggregate — issued to supplier after PR approval.
 *
 * Lifecycle:
 *   DRAFT → ISSUED → PARTIALLY_RECEIVED → RECEIVED → CLOSED
 *                ↘ CANCELLED (terminal)
 *
 * Per BRC §11:
 *   - R-INV-007: PO approval threshold (R-APR-004)
 *   - PR → PO → GRN → Stock → Issue flow
 *
 * Invariants:
 *   - poNumber is unique per school
 *   - totalCents = subtotalCents + taxCents + shippingCents
 *   - receivedQty ≤ quantity on every line
 *   - Cannot cancel a RECEIVED PO
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  PurchaseOrderCreatedEvent, PurchaseOrderIssuedEvent,
  PurchaseOrderPartiallyReceivedEvent, PurchaseOrderReceivedEvent,
  PurchaseOrderCancelledEvent,
} from '../events/inventory-events';

export type PurchaseOrderStatus =
  | 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  quantity: number;
  unitCostCents: number;
  taxRatePercent: number;
  lineTotalCents: number;
  receivedQty: number;
}

export interface PurchaseOrderProps {
  tenantId: string;
  branchId?: string;
  poNumber: string;
  supplierId: string;
  issuedById: string;
  status: PurchaseOrderStatus;
  sourcePrId?: string;
  lines: PurchaseOrderLine[];
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  expectedDate?: string;
  issuedAt?: string;
  closedAt?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

export class PurchaseOrderAggregate extends AggregateRoot<PurchaseOrderProps> {
  get tenantId(): string { return this._props.tenantId; }
  get poNumber(): string { return this._props.poNumber; }
  get supplierId(): string { return this._props.supplierId; }
  get status(): PurchaseOrderStatus { return this._props.status; }
  get totalCents(): number { return this._props.totalCents; }
  get lines(): readonly PurchaseOrderLine[] {
    return Object.freeze([...this._props.lines]);
  }

  static create(props: Omit<
    PurchaseOrderProps,
    'status' | 'lines' | 'subtotalCents' | 'taxCents' | 'totalCents' |
    'createdAt' | 'updatedAt'
  > & { lines: Array<Omit<PurchaseOrderLine, 'id' | 'receivedQty' | 'lineTotalCents'>> }): PurchaseOrderAggregate {
    const now = new Date().toISOString();
    const lines: PurchaseOrderLine[] = props.lines.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      receivedQty: 0,
      lineTotalCents: l.quantity * l.unitCostCents,
    }));
    const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0);
    const tax = lines.reduce((s, l) => s + Math.round(l.lineTotalCents * l.taxRatePercent / 100), 0);
    const total = subtotal + tax + props.shippingCents;
    const agg = new PurchaseOrderAggregate({
      tenantId: props.tenantId,
      branchId: props.branchId,
      poNumber: props.poNumber,
      supplierId: props.supplierId,
      issuedById: props.issuedById,
      sourcePrId: props.sourcePrId,
      expectedDate: props.expectedDate,
      notes: props.notes,
      lines,
      subtotalCents: subtotal,
      taxCents: tax,
      shippingCents: props.shippingCents,
      totalCents: total,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new PurchaseOrderCreatedEvent({
      poId: agg.id,
      tenantId: agg._props.tenantId,
      poNumber: agg._props.poNumber,
      supplierId: agg._props.supplierId,
      totalCents: agg._props.totalCents,
    }));
    return agg;
  }

  issue(issuedAt: string): void {
    this._requireTransition('ISSUED');
    if (this._props.lines.length === 0) {
      throw new Error('Cannot issue PO without lines');
    }
    this._props.status = 'ISSUED';
    this._props.issuedAt = issuedAt;
    this._touch();
    this._addDomainEvent(new PurchaseOrderIssuedEvent({
      poId: this.id,
      tenantId: this._props.tenantId,
      poNumber: this._props.poNumber,
      supplierId: this._props.supplierId,
      issuedAt,
    }));
  }

  recordReceipt(lineId: string, receivedQty: number): void {
    if (this._props.status !== 'ISSUED' && this._props.status !== 'PARTIALLY_RECEIVED') {
      throw new Error(`Cannot receive against ${this._props.status} PO`);
    }
    const line = this._props.lines.find(l => l.id === lineId);
    if (!line) throw new Error(`Line ${lineId} not found`);
    if (line.receivedQty + receivedQty > line.quantity) {
      throw new Error(`Received qty exceeds ordered: ordered=${line.quantity}, already received=${line.receivedQty}, new=${receivedQty}`);
    }
    line.receivedQty += receivedQty;
    this._touch();
    const allReceived = this._props.lines.every(l => l.receivedQty >= l.quantity);
    const anyReceived = this._props.lines.some(l => l.receivedQty > 0);
    if (allReceived) {
      this._props.status = 'RECEIVED';
      this._addDomainEvent(new PurchaseOrderReceivedEvent({
        poId: this.id,
        tenantId: this._props.tenantId,
        receivedAt: new Date().toISOString(),
      }));
    } else if (anyReceived) {
      this._props.status = 'PARTIALLY_RECEIVED';
      this._addDomainEvent(new PurchaseOrderPartiallyReceivedEvent({
        poId: this.id,
        tenantId: this._props.tenantId,
      }));
    }
  }

  close(closedAt: string): void {
    this._requireTransition('CLOSED');
    this._props.status = 'CLOSED';
    this._props.closedAt = closedAt;
    this._touch();
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelReason = reason;
    this._touch();
    this._addDomainEvent(new PurchaseOrderCancelledEvent({
      poId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: PurchaseOrderStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid PO transition: ${this._props.status} → ${target}`);
    }
  }
}
