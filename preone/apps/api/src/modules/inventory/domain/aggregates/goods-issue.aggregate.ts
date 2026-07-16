/**
 * GoodsIssueAggregate — issue stock to a department / employee.
 *
 * Per BRC §11 (R-INV-008): Issue slip mandatory.
 * Per BRC §11 (R-INV-010): Return window 7 days.
 *
 * Lifecycle: DRAFT → POSTED (terminal) / CANCELLED (terminal)
 *
 * Invariants:
 *   - issueNumber is unique per school
 *   - lineTotalCents = quantity * unitCostCents
 *   - Cannot issue more than available stock (checked by service)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { GoodsIssuePostedEvent } from '../events/inventory-events';

export type GoodsIssueStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface GoodsIssueLine {
  id: string;
  itemId: string;
  lotId?: string;
  quantity: number;
  unitCostCents: number;
  lineTotalCents: number;
}

export interface GoodsIssueProps {
  tenantId: string;
  branchId?: string;
  issueNumber: string;
  issuedToId: string;
  issuedById: string;
  status: GoodsIssueStatus;
  issueDate: string;
  department?: string;
  purpose?: string;
  lines: GoodsIssueLine[];
  totalCents: number;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<GoodsIssueStatus, GoodsIssueStatus[]> = {
  DRAFT: ['POSTED', 'CANCELLED'],
  POSTED: [],
  CANCELLED: [],
};

export class GoodsIssueAggregate extends AggregateRoot<GoodsIssueProps> {
  get tenantId(): string { return this._props.tenantId; }
  get issueNumber(): string { return this._props.issueNumber; }
  get issuedToId(): string { return this._props.issuedToId; }
  get status(): GoodsIssueStatus { return this._props.status; }
  get lines(): readonly GoodsIssueLine[] {
    return Object.freeze([...this._props.lines]);
  }
  get totalCents(): number { return this._props.totalCents; }

  static create(props: Omit<
    GoodsIssueProps,
    'status' | 'lines' | 'totalCents' | 'createdAt' | 'updatedAt'
  > & { lines: Array<Omit<GoodsIssueLine, 'id' | 'lineTotalCents'>> }): GoodsIssueAggregate {
    const now = new Date().toISOString();
    const lines: GoodsIssueLine[] = props.lines.map(l => ({
      ...l,
      id: crypto.randomUUID(),
      lineTotalCents: l.quantity * l.unitCostCents,
    }));
    const total = lines.reduce((s, l) => s + l.lineTotalCents, 0);
    const agg = new GoodsIssueAggregate({
      tenantId: props.tenantId,
      branchId: props.branchId,
      issueNumber: props.issueNumber,
      issuedToId: props.issuedToId,
      issuedById: props.issuedById,
      issueDate: props.issueDate,
      department: props.department,
      purpose: props.purpose,
      lines,
      totalCents: total,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  post(): void {
    this._requireTransition('POSTED');
    if (this._props.lines.length === 0) {
      throw new Error('Cannot post goods issue without lines');
    }
    this._props.status = 'POSTED';
    this._touch();
    this._addDomainEvent(new GoodsIssuePostedEvent({
      issueId: this.id,
      tenantId: this._props.tenantId,
      issueNumber: this._props.issueNumber,
      issuedToId: this._props.issuedToId,
      totalCents: this._props.totalCents,
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

  private _requireTransition(target: GoodsIssueStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid goods issue transition: ${this._props.status} → ${target}`);
    }
  }
}
