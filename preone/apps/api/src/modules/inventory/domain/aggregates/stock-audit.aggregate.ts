/**
 * StockAuditAggregate — quarterly stock audit lifecycle.
 *
 * Per BRC R-INV-009 — Stock Audit Frequency:
 *   Trigger: Quarterly audit cycle
 *   Action: Physical count; reconcile with system; variance >5% triggers
 *           investigation; Branch Head approval for adjustments
 *   Owners: Inventory Manager + Branch Head
 *
 * Lifecycle:
 *   SCHEDULED → IN_PROGRESS → RECONCILING → COMPLETED
 *   COMPLETED → ADJUSTED (if adjustments applied with Branch Head approval)
 *
 * Invariants:
 *   - quarter format: "YYYY-QN" (e.g. "2026-Q1")
 *   - One audit per (branch, quarter) — enforced by DB UNIQUE
 *   - varianceAction set to INVESTIGATION if any line has |variancePercent| > 5
 *   - Cannot complete without at least one line per item in scope
 *   - Adjustments require Branch Head approval
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type StockAuditStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'RECONCILING' | 'COMPLETED' | 'ADJUSTED';
export type StockAuditVarianceAction = 'NONE' | 'INVESTIGATION' | 'ADJUSTMENT_APPLIED';

export interface StockAuditLineProps {
  id: string;
  itemId: string;
  systemQty: number;
  physicalQty: number;
  varianceQty: number;       // physical - system
  variancePercent: number;   // (variance / system) * 100
  unitCostCents: bigint;
  varianceValueCents: bigint;
  notes?: string;
}

export interface StockAuditProps {
  tenantId: string;
  branchId: string;
  auditNumber: string;
  quarter: string;                // "2026-Q1"
  scheduledDate: string;           // YYYY-MM-DD
  startedAt?: string;
  completedAt?: string;
  status: StockAuditStatus;
  varianceAction: StockAuditVarianceAction;
  totalItems: number;
  itemsWithVariance: number;
  totalVarianceValueCents: bigint;
  branchHeadApprovedAt?: string;
  notes?: string;
  lines: StockAuditLineProps[];
  createdAt: string;
  updatedAt: string;
}

// Tolerance: 5% variance triggers investigation (R-INV-009)
export const VARIANCE_TOLERANCE_PERCENT = 5;

const TRANSITIONS: Record<StockAuditStatus, StockAuditStatus[]> = {
  SCHEDULED:   ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['RECONCILING'],
  RECONCILING: ['COMPLETED'],
  COMPLETED:   ['ADJUSTED'],
  ADJUSTED:    [],
};

// ===== Domain Events =====

export class StockAuditScheduledEvent extends DomainEvent<{
  tenantId: string; auditId: string; branchId: string; quarter: string; scheduledDate: string;
}> {}

export class StockAuditStartedEvent extends DomainEvent<{
  tenantId: string; auditId: string; startedAt: string;
}> {}

export class StockAuditLineRecordedEvent extends DomainEvent<{
  tenantId: string; auditId: string; itemId: string;
  systemQty: number; physicalQty: number; variancePercent: number;
}> {}

export class StockAuditCompletedEvent extends DomainEvent<{
  tenantId: string; auditId: string; completedAt: string;
  totalItems: number; itemsWithVariance: number;
  totalVarianceValueCents: string; varianceAction: StockAuditVarianceAction;
}> {}

export class StockAuditAdjustedEvent extends DomainEvent<{
  tenantId: string; auditId: string; adjustedAt: string; approvedAt: string;
}> {}

// ===== Aggregate =====

export class StockAuditAggregate extends AggregateRoot<StockAuditProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get auditNumber(): string { return this._props.auditNumber; }
  get quarter(): string { return this._props.quarter; }
  get status(): StockAuditStatus { return this._props.status; }
  get varianceAction(): StockAuditVarianceAction { return this._props.varianceAction; }
  get totalItems(): number { return this._props.totalItems; }
  get itemsWithVariance(): number { return this._props.itemsWithVariance; }
  get totalVarianceValueCents(): bigint { return this._props.totalVarianceValueCents; }
  get lines(): readonly StockAuditLineProps[] { return this._props.lines; }

  static create(
    tenantId: string,
    branchId: string,
    auditNumber: string,
    quarter: string,
    scheduledDate: string,
  ): StockAuditAggregate {
    const now = new Date().toISOString();

    // Invariant: quarter format YYYY-QN
    if (!/^\d{4}-Q[1-4]$/.test(quarter)) {
      throw new Error(`StockAudit invariant: quarter "${quarter}" must match YYYY-QN (e.g. 2026-Q1)`);
    }

    const agg = new StockAuditAggregate({
      tenantId, branchId, auditNumber, quarter, scheduledDate,
      status: 'SCHEDULED',
      varianceAction: 'NONE',
      totalItems: 0, itemsWithVariance: 0,
      totalVarianceValueCents: 0n,
      lines: [],
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new StockAuditScheduledEvent({
      tenantId, auditId: agg.id, branchId, quarter, scheduledDate,
    }));
    return agg;
  }

  /** Start physical count. */
  start(startedAt: string): void {
    this._requireTransition('IN_PROGRESS');
    this._props.status = 'IN_PROGRESS';
    this._props.startedAt = startedAt;
    this._touch();
    this._addDomainEvent(new StockAuditStartedEvent({
      tenantId: this._props.tenantId, auditId: this.id, startedAt,
    }));
  }

  /** Record physical count for an item. Can only be done during IN_PROGRESS. */
  recordLine(itemId: string, systemQty: number, physicalQty: number, unitCostCents: bigint, notes?: string): void {
    if (this._props.status !== 'IN_PROGRESS') {
      throw new Error(`StockAudit: cannot record lines in status ${this._props.status}`);
    }
    if (systemQty < 0 || physicalQty < 0) {
      throw new Error('StockAudit invariant: quantities must be >= 0');
    }
    if (unitCostCents < 0n) {
      throw new Error('StockAudit invariant: unitCostCents must be >= 0');
    }
    // No duplicate lines per item
    if (this._props.lines.some(l => l.itemId === itemId)) {
      throw new Error(`StockAudit: line for item ${itemId} already recorded`);
    }

    const varianceQty = physicalQty - systemQty;
    const variancePercent = systemQty === 0
      ? (physicalQty === 0 ? 0 : 100)
      : (varianceQty / systemQty) * 100;
    const varianceValueCents = BigInt(Math.round(varianceQty * Number(unitCostCents)));

    const line: StockAuditLineProps = {
      id: crypto.randomUUID(),
      itemId, systemQty, physicalQty,
      varianceQty, variancePercent, unitCostCents, varianceValueCents,
      notes,
    };
    this._props.lines.push(line);

    // Update aggregate stats
    this._props.totalItems = this._props.lines.length;
    const withVariance = this._props.lines.filter(l => Math.abs(l.variancePercent) > 0.01);
    this._props.itemsWithVariance = withVariance.length;
    this._props.totalVarianceValueCents = this._props.lines.reduce(
      (sum, l) => sum + l.varianceValueCents, 0n);

    // Determine variance action
    const hasInvestigationWorthy = this._props.lines.some(
      l => Math.abs(l.variancePercent) > VARIANCE_TOLERANCE_PERCENT);
    this._props.varianceAction = hasInvestigationWorthy ? 'INVESTIGATION' : 'NONE';

    this._touch();
    this._addDomainEvent(new StockAuditLineRecordedEvent({
      tenantId: this._props.tenantId, auditId: this.id, itemId,
      systemQty, physicalQty, variancePercent,
    }));
  }

  /** Move to reconciliation phase. */
  reconcile(): void {
    this._requireTransition('RECONCILING');
    if (this._props.lines.length === 0) {
      throw new Error('StockAudit: cannot reconcile with zero recorded lines');
    }
    this._props.status = 'RECONCILING';
    this._touch();
  }

  /** Complete the audit (finalize counts). */
  complete(completedAt: string): void {
    this._requireTransition('COMPLETED');
    if (this._props.status === 'IN_PROGRESS' && this._props.lines.length === 0) {
      throw new Error('StockAudit: cannot complete with zero recorded lines');
    }
    this._props.status = 'COMPLETED';
    this._props.completedAt = completedAt;
    this._touch();
    this._addDomainEvent(new StockAuditCompletedEvent({
      tenantId: this._props.tenantId, auditId: this.id, completedAt,
      totalItems: this._props.totalItems,
      itemsWithVariance: this._props.itemsWithVariance,
      totalVarianceValueCents: this._props.totalVarianceValueCents.toString(),
      varianceAction: this._props.varianceAction,
    }));
  }

  /** Apply adjustments after Branch Head approval. */
  applyAdjustments(branchHeadApprovedAt: string): void {
    this._requireTransition('ADJUSTED');
    if (this._props.varianceAction === 'NONE') {
      throw new Error('StockAudit: no adjustments to apply (varianceAction=NONE)');
    }
    this._props.status = 'ADJUSTED';
    this._props.branchHeadApprovedAt = branchHeadApprovedAt;
    this._props.varianceAction = 'ADJUSTMENT_APPLIED';
    this._touch();
    this._addDomainEvent(new StockAuditAdjustedEvent({
      tenantId: this._props.tenantId, auditId: this.id,
      adjustedAt: branchHeadApprovedAt, approvedAt: branchHeadApprovedAt,
    }));
  }

  /** True if audit has any line with variance > 5% (R-INV-009). */
  get requiresInvestigation(): boolean {
    return this._props.varianceAction === 'INVESTIGATION' ||
           this._props.lines.some(l => Math.abs(l.variancePercent) > VARIANCE_TOLERANCE_PERCENT);
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: StockAuditStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `StockAudit invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
