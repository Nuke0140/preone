/**
 * PositionOpeningAggregate — new position approval lifecycle.
 *
 * Per BRC R-APR-010 — New Position Approval:
 *   Trigger: Department head identifies need for a new role
 *   Action: Multi-level approval: Director → Board (if budgetedSalary > threshold)
 *   Owners: HR + Director + Board
 *
 * Lifecycle:
 *   OPEN → {ON_HOLD | FILLED | CANCELLED}
 *   ON_HOLD → {OPEN | CANCELLED}
 *
 * Invariants:
 *   - positionCode unique per school
 *   - Cannot fill without Director approval
 *   - Board approval required if budgetedSalaryCents > school's board approval threshold
 *     (default: 1,500,000 (₹1.5L/month = ₹18L/year) — configurable per school)
 *   - filledByEmployeeId can only be set once (idempotent fill)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type PositionStatus = 'OPEN' | 'ON_HOLD' | 'FILLED' | 'CANCELLED';

export interface PositionOpeningProps {
  tenantId: string;
  branchId: string;
  positionCode: string;
  role: string;
  designation: string;
  employmentType: string;
  budgetedSalaryCents: bigint;
  justification: string;
  status: PositionStatus;
  approvedByDirectorId?: string;
  approvedByDirectorAt?: string;
  boardApprovalRequired: boolean;
  boardApprovedAt?: string;
  filledAt?: string;
  filledByEmployeeId?: string;
  createdAt: string;
  updatedAt: string;
}

// Default threshold: ₹18,00,000/year (₹1.5L/month) — board approval required above this
export const DEFAULT_BOARD_APPROVAL_THRESHOLD = BigInt(18_00_00_000);

const TRANSITIONS: Record<PositionStatus, PositionStatus[]> = {
  OPEN:     ['ON_HOLD', 'FILLED', 'CANCELLED'],
  ON_HOLD:  ['OPEN', 'CANCELLED'],
  FILLED:   [],
  CANCELLED: [],
};

// ===== Domain Events =====

export class PositionCreatedEvent extends DomainEvent<{
  tenantId: string; positionId: string; positionCode: string;
  role: string; budgetedSalaryCents: string; boardApprovalRequired: boolean;
}> {}

export class PositionApprovedByDirectorEvent extends DomainEvent<{
  tenantId: string; positionId: string; directorId: string; approvedAt: string;
}> {}

export class PositionBoardApprovedEvent extends DomainEvent<{
  tenantId: string; positionId: string; approvedAt: string;
}> {}

export class PositionOnHoldEvent extends DomainEvent<{
  tenantId: string; positionId: string; reason?: string;
}> {}

export class PositionResumedEvent extends DomainEvent<{
  tenantId: string; positionId: string;
}> {}

export class PositionFilledEvent extends DomainEvent<{
  tenantId: string; positionId: string; employeeId: string; filledAt: string;
}> {}

export class PositionCancelledEvent extends DomainEvent<{
  tenantId: string; positionId: string; reason: string;
}> {}

// ===== Aggregate =====

export class PositionOpeningAggregate extends AggregateRoot<PositionOpeningProps> {
  get tenantId(): string { return this._props.tenantId; }
  get positionCode(): string { return this._props.positionCode; }
  get role(): string { return this._props.role; }
  get budgetedSalaryCents(): bigint { return this._props.budgetedSalaryCents; }
  get status(): PositionStatus { return this._props.status; }
  get approvedByDirectorId(): string | undefined { return this._props.approvedByDirectorId; }
  get boardApprovalRequired(): boolean { return this._props.boardApprovalRequired; }
  get boardApprovedAt(): string | undefined { return this._props.boardApprovedAt; }
  get filledByEmployeeId(): string | undefined { return this._props.filledByEmployeeId; }

  static create(
    tenantId: string,
    branchId: string,
    positionCode: string,
    role: string,
    designation: string,
    employmentType: string,
    budgetedSalaryCents: bigint,
    justification: string,
    boardApprovalThreshold: bigint = DEFAULT_BOARD_APPROVAL_THRESHOLD,
  ): PositionOpeningAggregate {
    const now = new Date().toISOString();
    const boardApprovalRequired = budgetedSalaryCents > boardApprovalThreshold;

    const agg = new PositionOpeningAggregate({
      tenantId, branchId, positionCode, role, designation, employmentType,
      budgetedSalaryCents, justification,
      status: 'OPEN',
      boardApprovalRequired,
      createdAt: now, updatedAt: now,
    });

    agg._addDomainEvent(new PositionCreatedEvent({
      tenantId, positionId: agg.id, positionCode,
      role, budgetedSalaryCents: budgetedSalaryCents.toString(),
      boardApprovalRequired,
    }));
    return agg;
  }

  /** Director approval — required before position can be filled. */
  approveByDirector(directorId: string, approvedAt: string): void {
    if (this._props.approvedByDirectorId) {
      throw new Error(`Position already approved by director ${this._props.approvedByDirectorId}`);
    }
    if (this._props.status !== 'OPEN' && this._props.status !== 'ON_HOLD') {
      throw new Error(`Cannot approve position in status ${this._props.status}`);
    }
    this._props.approvedByDirectorId = directorId;
    this._props.approvedByDirectorAt = approvedAt;
    this._touch();
    this._addDomainEvent(new PositionApprovedByDirectorEvent({
      tenantId: this._props.tenantId, positionId: this.id,
      directorId, approvedAt,
    }));
  }

  /** Board approval (only required if boardApprovalRequired=true). */
  approveByBoard(approvedAt: string): void {
    if (!this._props.boardApprovalRequired) {
      throw new Error('Board approval not required for this position');
    }
    if (this._props.boardApprovedAt) {
      throw new Error('Position already approved by board');
    }
    if (!this._props.approvedByDirectorId) {
      throw new Error('Cannot approve by board before director approval');
    }
    this._props.boardApprovedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new PositionBoardApprovedEvent({
      tenantId: this._props.tenantId, positionId: this.id, approvedAt,
    }));
  }

  /** Put position on hold (pause hiring). */
  hold(reason?: string): void {
    this._requireTransition('ON_HOLD');
    this._props.status = 'ON_HOLD';
    this._touch();
    this._addDomainEvent(new PositionOnHoldEvent({
      tenantId: this._props.tenantId, positionId: this.id, reason,
    }));
  }

  /** Resume from ON_HOLD. */
  resume(): void {
    this._requireTransition('OPEN');
    this._props.status = 'OPEN';
    this._touch();
    this._addDomainEvent(new PositionResumedEvent({
      tenantId: this._props.tenantId, positionId: this.id,
    }));
  }

  /** Fill position with hired employee. */
  fill(employeeId: string, filledAt: string): void {
    this._requireTransition('FILLED');

    if (!this._props.approvedByDirectorId) {
      throw new Error('Cannot fill position without Director approval');
    }
    if (this._props.boardApprovalRequired && !this._props.boardApprovedAt) {
      throw new Error('Cannot fill position — board approval required but not obtained');
    }
    if (this._props.filledByEmployeeId) {
      throw new Error(`Position already filled by employee ${this._props.filledByEmployeeId}`);
    }

    this._props.status = 'FILLED';
    this._props.filledAt = filledAt;
    this._props.filledByEmployeeId = employeeId;
    this._touch();
    this._addDomainEvent(new PositionFilledEvent({
      tenantId: this._props.tenantId, positionId: this.id,
      employeeId, filledAt,
    }));
  }

  /** Cancel position (withdrawn). */
  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    if (this._props.filledByEmployeeId) {
      throw new Error('Cannot cancel a filled position');
    }
    this._props.status = 'CANCELLED';
    this._touch();
    this._addDomainEvent(new PositionCancelledEvent({
      tenantId: this._props.tenantId, positionId: this.id, reason,
    }));
  }

  /** Returns true if position has all approvals needed to fill. */
  get isApproved(): boolean {
    if (!this._props.approvedByDirectorId) return false;
    if (this._props.boardApprovalRequired && !this._props.boardApprovedAt) return false;
    return true;
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: PositionStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `PositionOpening invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
