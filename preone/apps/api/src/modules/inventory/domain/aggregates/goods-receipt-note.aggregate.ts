/**
 * GoodsReceiptNoteAggregate — receipt of goods against a PO (or direct).
 *
 * Lifecycle: DRAFT → POSTED (terminal) / CANCELLED (terminal)
 *
 * Per BRC §11 (R-INV-008): GRN triggers stock movement + supplier invoice entry.
 *
 * Invariants:
 *   - grnNumber is unique per school
 *   - acceptedQty = receivedQty - rejectedQty on every line
 *   - Cannot modify a POSTED GRN
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { GrnPostedEvent } from '../events/inventory-events';

export type GrnStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface GrnLine {
  id: string;
  poLineId?: string;
  itemId: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
  unitCostCents: number;
  lotNumber?: string;
  expiresAt?: string;
}

export interface GoodsReceiptNoteProps {
  tenantId: string;
  branchId?: string;
  grnNumber: string;
  poId?: string;
  supplierId: string;
  receivedById: string;
  status: GrnStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  challanNumber?: string;
  receivedAt: string;
  notes?: string;
  lines: GrnLine[];
  totalAcceptedCents: number;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<GrnStatus, GrnStatus[]> = {
  DRAFT: ['POSTED', 'CANCELLED'],
  POSTED: [],
  CANCELLED: [],
};

export class GoodsReceiptNoteAggregate extends AggregateRoot<GoodsReceiptNoteProps> {
  get tenantId(): string { return this._props.tenantId; }
  get grnNumber(): string { return this._props.grnNumber; }
  get supplierId(): string { return this._props.supplierId; }
  get poId(): string | undefined { return this._props.poId; }
  get status(): GrnStatus { return this._props.status; }
  get lines(): readonly GrnLine[] {
    return Object.freeze([...this._props.lines]);
  }
  get totalAcceptedCents(): number { return this._props.totalAcceptedCents; }

  static create(props: Omit<
    GoodsReceiptNoteProps,
    'status' | 'lines' | 'totalAcceptedCents' | 'createdAt' | 'updatedAt'
  > & { lines: Array<Omit<GrnLine, 'id' | 'acceptedQty' | 'rejectedQty'> & { acceptedQty?: number; rejectedQty?: number }> }): GoodsReceiptNoteAggregate {
    const now = new Date().toISOString();
    const lines: GrnLine[] = props.lines.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      acceptedQty: l.acceptedQty ?? (l.receivedQty - (l.rejectedQty ?? 0)),
      rejectedQty: l.rejectedQty ?? 0,
    }));
    const totalAccepted = lines.reduce(
      (s, l) => s + l.acceptedQty * l.unitCostCents, 0,
    );
    const agg = new GoodsReceiptNoteAggregate({
      tenantId: props.tenantId,
      branchId: props.branchId,
      grnNumber: props.grnNumber,
      poId: props.poId,
      supplierId: props.supplierId,
      receivedById: props.receivedById,
      invoiceNumber: props.invoiceNumber,
      invoiceDate: props.invoiceDate,
      challanNumber: props.challanNumber,
      receivedAt: props.receivedAt,
      notes: props.notes,
      lines,
      totalAcceptedCents: totalAccepted,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  post(): void {
    this._requireTransition('POSTED');
    if (this._props.lines.length === 0) {
      throw new Error('Cannot post GRN without lines');
    }
    this._props.status = 'POSTED';
    this._touch();
    this._addDomainEvent(new GrnPostedEvent({
      grnId: this.id,
      tenantId: this._props.tenantId,
      grnNumber: this._props.grnNumber,
      poId: this._props.poId,
      supplierId: this._props.supplierId,
      totalAcceptedCents: this._props.totalAcceptedCents,
    }));
  }

  cancel(): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: GrnStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid GRN transition: ${this._props.status} → ${target}`);
    }
  }
}
