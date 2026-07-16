/**
 * TrainingRecordAggregate — staff training & certification lifecycle.
 *
 * Per BRC R-HR-010 — Annual POSH Training:
 *   Trigger: Annual training cycle (April-May)
 *   Action: Online POSH module; quiz with 80% pass mark; certificate valid 1 year;
 *           non-completion blocks payroll
 *   Owners: HR + Compliance Officer
 *
 * Per BRC R-HR-011 — Food Handler Medical Certificate:
 *   Trigger: Kitchen staff onboarding + annual renewal
 *   Action: Annual medical checkup; certificate on file; non-completion blocks kitchen duties
 *   Owners: HR + Kitchen In-charge
 *
 * Lifecycle:
 *   ASSIGNED → IN_PROGRESS → {COMPLETED | FAILED}
 *   COMPLETED → EXPIRED (when certificate_valid_until passes)
 *   COMPLETED → BLOCKED (when next cycle's payroll runs but cert not renewed)
 *
 * Invariants:
 *   - quizScore must be >= passMark (80 for POSH) to mark COMPLETED
 *   - certificateValidUntil must be set when COMPLETED
 *   - payrollBlockedAt cannot be set if status is COMPLETED
 *   - Cannot re-assign after COMPLETED (must create new record for next cycle)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type TrainingType =
  | 'POSH' | 'FOOD_HANDLER_MEDICAL' | 'FIRE_SAFETY' | 'FIRST_AID'
  | 'CHILD_SAFEGUARDING' | 'GENERAL_INDUCTION' | 'OTHER';

export type TrainingStatus =
  | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'BLOCKED';

export interface TrainingRecordProps {
  tenantId: string;
  employeeId: string;
  trainingType: TrainingType;
  status: TrainingStatus;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  certificateValidUntil?: string;  // YYYY-MM-DD
  quizScore?: number;              // 0-100
  passMark: number;                // default 80 (POSH standard)
  payrollBlockedAt?: string;       // R-HR-010 — when payroll was blocked
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const VALIDITY_BY_TYPE: Record<TrainingType, number> = {
  POSH: 365,                  // R-HR-010: 1 year
  FOOD_HANDLER_MEDICAL: 365,  // R-HR-011: 1 year
  FIRE_SAFETY: 365,
  FIRST_AID: 730,             // 2 years
  CHILD_SAFEGUARDING: 365,
  GENERAL_INDUCTION: 3650,    // 10 years (one-time, but tracked)
  OTHER: 365,
};

const TRANSITIONS: Record<TrainingStatus, TrainingStatus[]> = {
  ASSIGNED:    ['IN_PROGRESS', 'FAILED', 'BLOCKED'],
  IN_PROGRESS: ['COMPLETED', 'FAILED', 'BLOCKED'],
  COMPLETED:   ['EXPIRED', 'BLOCKED'],
  FAILED:      ['IN_PROGRESS', 'BLOCKED'],
  EXPIRED:     ['BLOCKED'],
  BLOCKED:     [],
};

// ===== Domain Events =====

export class TrainingAssignedEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
  trainingType: TrainingType; passMark: number;
}> {}

export class TrainingStartedEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
}> {}

export class TrainingCompletedEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
  trainingType: TrainingType; quizScore: number; validUntil: string;
}> {}

export class TrainingFailedEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
  quizScore: number; passMark: number;
}> {}

export class TrainingExpiredEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
  expiredAt: string;
}> {}

export class PayrollBlockedEvent extends DomainEvent<{
  tenantId: string; trainingId: string; employeeId: string;
  trainingType: TrainingType; blockedAt: string;
}> {}

// ===== Aggregate =====

export class TrainingRecordAggregate extends AggregateRoot<TrainingRecordProps> {
  get tenantId(): string { return this._props.tenantId; }
  get employeeId(): string { return this._props.employeeId; }
  get trainingType(): TrainingType { return this._props.trainingType; }
  get status(): TrainingStatus { return this._props.status; }
  get quizScore(): number | undefined { return this._props.quizScore; }
  get passMark(): number { return this._props.passMark; }
  get certificateValidUntil(): string | undefined { return this._props.certificateValidUntil; }
  get payrollBlockedAt(): string | undefined { return this._props.payrollBlockedAt; }

  static create(
    tenantId: string,
    employeeId: string,
    trainingType: TrainingType,
    assignedAt: string,
    passMark?: number,
  ): TrainingRecordAggregate {
    const now = new Date().toISOString();
    const pm = passMark ?? (trainingType === 'POSH' ? 80 : 70); // R-HR-010 POSH pass mark = 80

    const agg = new TrainingRecordAggregate({
      tenantId,
      employeeId,
      trainingType,
      status: 'ASSIGNED',
      assignedAt,
      passMark: pm,
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new TrainingAssignedEvent({
      tenantId, trainingId: agg.id, employeeId, trainingType, passMark: pm,
    }));
    return agg;
  }

  /** Mark training as started. */
  start(startedAt: string): void {
    this._requireTransition('IN_PROGRESS');
    this._props.status = 'IN_PROGRESS';
    this._props.startedAt = startedAt;
    this._touch();
    this._addDomainEvent(new TrainingStartedEvent({
      tenantId: this._props.tenantId, trainingId: this.id, employeeId: this._props.employeeId,
    }));
  }

  /** Mark training completed with quiz score. */
  complete(
    completedAt: string,
    quizScore: number,
    certificateNumber: string,
    certificateUrl?: string,
  ): void {
    this._requireTransition('COMPLETED');

    if (quizScore < 0 || quizScore > 100) {
      throw new Error(`TrainingRecord invariant: quizScore ${quizScore} out of range [0,100]`);
    }
    if (quizScore < this._props.passMark) {
      throw new Error(
        `TrainingRecord invariant: quizScore ${quizScore} below passMark ${this._props.passMark} — use fail() instead`
      );
    }

    const validityDays = VALIDITY_BY_TYPE[this._props.trainingType];
    const validUntil = new Date(completedAt);
    validUntil.setDate(validUntil.getDate() + validityDays);

    this._props.status = 'COMPLETED';
    this._props.completedAt = completedAt;
    this._props.quizScore = quizScore;
    this._props.certificateNumber = certificateNumber;
    this._props.certificateUrl = certificateUrl;
    this._props.certificateValidUntil = validUntil.toISOString().slice(0, 10);
    this._touch();

    this._addDomainEvent(new TrainingCompletedEvent({
      tenantId: this._props.tenantId,
      trainingId: this.id,
      employeeId: this._props.employeeId,
      trainingType: this._props.trainingType,
      quizScore,
      validUntil: this._props.certificateValidUntil,
    }));
  }

  /** Mark training as failed (quiz below pass mark). */
  fail(quizScore: number): void {
    this._requireTransition('FAILED');
    if (quizScore < 0 || quizScore > 100) {
      throw new Error(`TrainingRecord invariant: quizScore ${quizScore} out of range [0,100]`);
    }
    if (quizScore >= this._props.passMark) {
      throw new Error(
        `TrainingRecord invariant: quizScore ${quizScore} >= passMark ${this._props.passMark} — use complete() instead`
      );
    }
    this._props.status = 'FAILED';
    this._props.quizScore = quizScore;
    this._touch();
    this._addDomainEvent(new TrainingFailedEvent({
      tenantId: this._props.tenantId,
      trainingId: this.id,
      employeeId: this._props.employeeId,
      quizScore,
      passMark: this._props.passMark,
    }));
  }

  /** Mark certificate as expired (called by daily cron when validUntil < today). */
  expire(expiredAt: string): void {
    this._requireTransition('EXPIRED');
    if (!this._props.certificateValidUntil) {
      throw new Error('TrainingRecord invariant: cannot expire without certificateValidUntil');
    }
    this._props.status = 'EXPIRED';
    this._touch();
    this._addDomainEvent(new TrainingExpiredEvent({
      tenantId: this._props.tenantId,
      trainingId: this.id,
      employeeId: this._props.employeeId,
      expiredAt,
    }));
  }

  /**
   * Block payroll (R-HR-010).
   * Called by payroll service when employee is in {ASSIGNED, IN_PROGRESS, FAILED, EXPIRED}
   * status at payroll cutoff (25th EOM).
   */
  blockPayroll(blockedAt: string): void {
    this._requireTransition('BLOCKED');
    this._props.status = 'BLOCKED';
    this._props.payrollBlockedAt = blockedAt;
    this._touch();
    this._addDomainEvent(new PayrollBlockedEvent({
      tenantId: this._props.tenantId,
      trainingId: this.id,
      employeeId: this._props.employeeId,
      trainingType: this._props.trainingType,
      blockedAt,
    }));
  }

  /** Check if certificate is currently valid (within validUntil). */
  isCertificateValid(asOf = new Date().toISOString().slice(0, 10)): boolean {
    if (this._props.status !== 'COMPLETED') return false;
    if (!this._props.certificateValidUntil) return false;
    return asOf <= this._props.certificateValidUntil;
  }

  /** Returns true if cert expires within `days` from today. */
  expiresWithin(days: number, asOf = new Date()): boolean {
    if (!this._props.certificateValidUntil) return false;
    const horizon = new Date(asOf); horizon.setDate(horizon.getDate() + days);
    const validUntil = new Date(this._props.certificateValidUntil);
    return validUntil >= asOf && validUntil <= horizon;
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }

  private _requireTransition(target: TrainingStatus): void {
    const allowed = TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(
        `TrainingRecord invalid transition: ${this._props.status} → ${target}. ` +
        `Allowed: ${allowed.join(', ') || '∅ (terminal)'}`
      );
    }
  }
}
