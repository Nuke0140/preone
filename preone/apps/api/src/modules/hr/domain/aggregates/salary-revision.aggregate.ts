/**
 * SalaryRevisionAggregate — salary change approval lifecycle.
 *
 * Per BRC R-APR-011 — Salary Revision Approval:
 *   Trigger: Annual review / promotion / market correction / retention
 *   Action: Multi-level approval: Reporting Manager → Director → Board
 *           (Board approval required if delta > 25%)
 *   Owners: HR + Reporting Manager + Director + Board
 *
 * Lifecycle:
 *   PENDING → {APPROVED | REJECTED}
 *   APPROVED → EFFECTIVE (when applied to employee)
 *
 * Invariants:
 *   - deltaPercent calculated as ((proposed - current) / current) * 100
 *   - Cannot approve without manager approval first
 *   - Board approval required if deltaPercent > 25
 *   - effectiveDate must be >= approvedAt date
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type SalaryRevisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EFFECTIVE';
export type SalaryRevisionReason =
  | 'ANNUAL_REVIEW' | 'PROMOTION' | 'MARKET_CORRECTION' | 'RETENTION' | 'OTHER';

export interface SalaryRevisionProps {
  tenantId: string;
  employeeId: string;
  currentSalaryCents: bigint;
  proposedSalaryCents: bigint;
  deltaPercent: number;            // computed, stored for filtering
  effectiveDate: string;            // YYYY-MM-DD
  reason: SalaryRevisionReason;
  status: SalaryRevisionStatus;
  requestedById: string;
  approvedByManagerId?: string;
  approvedByManagerAt?: string;
  approvedByDirectorId?: string;
  approvedByDirectorAt?: string;
  boardApprovalRequired: boolean;
  boardApprovedAt?: string;
  rejectionReason?: string;
  appliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Default threshold: 25% delta — board approval required above this
export const DEFAULT_BOARD_APPROVAL_DELTA_THRESHOLD = 25;

const TRANSITIONS: Record<SalaryRevisionStatus, SalaryRevisionStatus[]> = {
  PENDING:   ['APPROVED', 'REJECTED'],
  APPROVED:  ['EFFECTIVE'],
  REJECTED:  [],
  EFFECTIVE: [],
};

// ===== Domain Events =====

export class SalaryRevisionRequestedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; employeeId: string;
  currentSalaryCents: string; proposedSalaryCents: string;
  deltaPercent: number; reason: SalaryRevisionReason;
}> {}

export class SalaryRevisionManagerApprovedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; managerId: string; approvedAt: string;
}> {}

export class SalaryRevisionDirectorApprovedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; directorId: string; approvedAt: string;
}> {}

export class SalaryRevisionBoardApprovedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; approvedAt: string;
}> {}

export class SalaryRevisionRejectedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; rejectedAt: string; reason: string;
}> {}

export class SalaryRevisionAppliedEvent extends DomainEvent<{
  tenantId: string; revisionId: string; employeeId: string;
  appliedAt: string; newSalaryCents: string;
}> {}

// ===== Aggregate =====

export class SalaryRevisionAggregate extends AggregateRoot<SalaryRevisionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get employeeId(): string { return this._props.employeeId; }
  get currentSalaryCents(): bigint { return this._props.currentSalaryCents; }
  get proposedSalaryCents(): bigint { return this._props.proposedSalaryCents; }
  get deltaPercent(): number { return this._props.deltaPercent; }
  get effectiveDate(): string { return this._props.effectiveDate; }
  get reason(): SalaryRevisionReason { return this._props.reason; }
  get status(): SalaryRevisionStatus { return this._props.status; }
  get approvedByManagerId(): string | undefined { return this._props.approvedByManagerId; }
  get approvedByDirectorId(): string | undefined { return this._props.approvedByDirectorId; }
  get boardApprovalRequired(): boolean { return this._props.boardApprovalRequired; }
  get boardApprovedAt(): string | undefined { return this._props.boardApprovedAt; }

  static create(
    tenantId: string,
    employeeId: string,
    currentSalaryCents: bigint,
    proposedSalaryCents: bigint,
    effectiveDate: string,
    reason: SalaryRevisionReason,
    requestedById: string,
    boardApprovalDeltaThreshold: number = DEFAULT_BOARD_APPROVAL_DELTA_THRESHOLD,
  ): SalaryRevisionAggregate {
    const now = new Date().toISOString();

    // Invariant: proposed must differ from current
    if (proposedSalaryCents === currentSalaryCents) {
      throw new Error('SalaryRevision invariant: proposedSalaryCents must differ from currentSalaryCents');
    }
    // Invariant: salaries are non-negative
    if (currentSalaryCents < 0n || proposedSalaryCents < 0n) {
      throw new Error('SalaryRevision invariant: salaries must be non-negative');
    }
    // Invariant: cut > 90% is suspicious — block by default (use OTHER reason for exceptional cases)
    if (currentSalaryCents > 0n) {
      const cutPercent = ((currentSalaryCents - proposedSalaryCents) * 100n) / currentSalaryCents;
      if (cutPercent > 90n && reason !== 'OTHER') {
        throw new Error(
          `SalaryRevision invariant: salary cut of ${cutPercent}% suspicious — use reason='OTHER' with documentation`
        );
      }
    }

    const deltaPercent = currentSalaryCents === 0n
      ? 100 // new role, treat as 100% raise
      : Number(((proposedSalaryCents - currentSalaryCents) * 10000n) / currentSalaryCents) / 100;

    const boardApprovalRequired = Math.abs(deltaPercent) > boardApprovalDeltaThreshold;

    const agg = new SalaryRevisionAggregate({
      tenantId, employeeId,
      currentSalaryCents, proposedSalaryCents,
      deltaPercent,
      effectiveDate, reason,
      status: 'PENDING',
      requestedById,
      boardApprovalRequired,
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new SalaryRevisionRequestedEvent({
      tenantId, revisionId: agg.id, employeeId,
      currentSalaryCents: currentSalaryCents.toString(),
      proposedSalaryCents: proposedSalaryCents.toString(),
      deltaPercent, reason,
    }));
    return agg;
  }

  /** Reporting Manager approval — first approval level. */
  approveByManager(managerId: string, approvedAt: string): void {
    if (this._props.status !== 'PENDING') {
      throw new Error(`Cannot approve revision in status ${this._props.status}`);
    }
    if (this._props.approvedByManagerId) {
      throw new Error(`Revision already approved by manager ${this._props.approvedByManagerId}`);
    }
    if (managerId === this._props.requestedById) {
      throw new Error('Invariant: requester cannot be the same as approver');
    }
    this._props.approvedByManagerId = managerId;
    this._props.approvedByManagerAt = approvedAt;
    this._touch();
    this._addDomainEvent(new SalaryRevisionManagerApprovedEvent({
      tenantId: this._props.tenantId, revisionId: this.id, managerId, approvedAt,
    }));
  }

  /** Director approval — second approval level. */
  approveByDirector(directorId: string, approvedAt: string): void {
    if (this._props.status !== 'PENDING') {
      throw new Error(`Cannot approve revision in status ${this._props.status}`);
    }
    if (!this._props.approvedByManagerId) {
      throw new Error('Cannot approve by director before manager approval');
    }
    if (this._props.approvedByDirectorId) {
      throw new Error(`Revision already approved by director ${this._props.approvedByDirectorId}`);
    }
    this._props.approvedByDirectorId = directorId;
    this._props.approvedByDirectorAt = approvedAt;
    this._touch();
    this._addDomainEvent(new SalaryRevisionDirectorApprovedEvent({
      tenantId: this._props.tenantId, revisionId: this.id, directorId, approvedAt,
    }));

    // If no board approval required, transition to APPROVED
    if (!this._props.boardApprovalRequired) {
      this._props.status = 'APPROVED';
      this._addDomainEvent(new SalaryRevisionBoardApprovedEvent({
        tenantId: this._props.tenantId, revisionId: this.id, approvedAt,
      }));
    }
  }

  /** Board approval — required for delta > 25%. */
  approveByBoard(approvedAt: string): void {
    if (this._props.status !== 'PENDING') {
      throw new Error(`Cannot approve revision in status ${this._props.status}`);
    }
    if (!this._props.boardApprovalRequired) {
      throw new Error('Board approval not required for this revision');
    }
    if (!this._props.approvedByDirectorId) {
      throw new Error('Cannot approve by board before director approval');
    }
    if (this._props.boardApprovedAt) {
      throw new Error('Revision already approved by board');
    }
    this._props.boardApprovedAt = approvedAt;
    this._props.status = 'APPROVED';
    this._touch();
    this._addDomainEvent(new SalaryRevisionBoardApprovedEvent({
      tenantId: this._props.tenantId, revisionId: this.id, approvedAt,
    }));
  }

  /** Reject the revision. */
  reject(rejectionReason: string, rejectedAt = new Date().toISOString()): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.rejectionReason = rejectionReason;
    this._touch();
    this._addDomainEvent(new SalaryRevisionRejectedEvent({
      tenantId: this._props.tenantId, revisionId: this.id, rejectedAt, reason: rejectionReason,
    }));
  }

  /** Mark revision as applied to employee payroll. */
  apply(appliedAt: string): void {
    this._requireTransition('EFFECTIVE');
    if (new Date(appliedAt) < new Date(this._props.effectiveDate)) {
      throw new Error(`Cannot apply revision before effective date ${this._props.effectiveDate}`);
    }
    this._props.status = 'EFFECTIVE';
    this._props.appliedAt = appliedAt;
    this._touch();
    this._addDomainEvent(new SalaryRevisionAppliedEvent({
      tenantId: this._props.tenantId, revisionId: this.id, employeeId: this._props.employeeId,
      appliedAt, newSalaryCents: this._props.proposedSalaryCents.toString(),
    }));
  }

  /** True if revision has all approvals needed to apply. */
  get isFullyApproved(): boolean {
    if (!this._props.approvedByManagerId) return false;
    if (!this._props.approvedByDirectorId) return false;
    if (this._props.boardApprovalRequired && !this._props.boardApprovedAt) return false;
    return true;
  }

  /** True if revision is a raise (proposed > current). */
  get isRaise(): boolean { return this._props.proposedSalaryCents > this._props.currentSalaryCents; }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: SalaryRevisionStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `SalaryRevision invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
