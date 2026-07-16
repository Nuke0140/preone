/**
 * FeePlanAggregate — annual fee structure per program + academic session.
 *
 * Lifecycle: DRAFT → ACTIVE → ARCHIVED
 *
 * Invariants:
 *   - code is unique per school
 *   - ACTIVE requires at least one installment
 *   - annualFeeCents equals sum of installment amounts (validation on activate)
 *   - Cannot modify installments after ACTIVE
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { FeePlanActivatedEvent, FeePlanArchivedEvent, FeePlanCreatedEvent } from '../events/finance-events';

export type FeePlanFrequency = 'ONE_TIME' | 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'TERM_WISE';
export type FeePlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface FeePlanInstallment {
  id: string;
  installmentNumber: number;
  label: string;
  dueDate: string;
  amountCents: number;
  gracePeriodDays: number;
  isMandatory: boolean;
}

export interface FeePlanProps {
  tenantId: string;
  branchId?: string;
  academicSessionId: string;
  programType: string;
  name: string;
  code: string;
  description?: string;
  frequency: FeePlanFrequency;
  status: FeePlanStatus;
  annualFeeCents: number;
  securityDepositCents: number;
  admissionFeeCents: number;
  applicationFeeCents: number;
  lateFeePerDayCents: number;
  gstApplicable: boolean;
  gstRatePercent: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  installments: FeePlanInstallment[];
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<FeePlanStatus, FeePlanStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: [],
};

export class FeePlanAggregate extends AggregateRoot<FeePlanProps> {
  get tenantId(): string { return this._props.tenantId; }
  get code(): string { return this._props.code; }
  get status(): FeePlanStatus { return this._props.status; }
  get installments(): readonly FeePlanInstallment[] {
    return Object.freeze([...this._props.installments]);
  }

  static create(props: Omit<
    FeePlanProps,
    'status' | 'installments' | 'createdAt' | 'updatedAt'
  >): FeePlanAggregate {
    const now = new Date().toISOString();
    const agg = new FeePlanAggregate({
      ...props,
      status: 'DRAFT',
      installments: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new FeePlanCreatedEvent({
      feePlanId: agg.id,
      tenantId: agg._props.tenantId,
      branchId: agg._props.branchId,
      academicSessionId: agg._props.academicSessionId,
      programType: agg._props.programType,
      annualFeeCents: agg._props.annualFeeCents,
      frequency: agg._props.frequency,
    }));
    return agg;
  }

  addInstallment(inst: Omit<FeePlanInstallment, 'id'>): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error('Cannot add installment to non-DRAFT fee plan');
    }
    const id = crypto.randomUUID();
    this._props.installments.push({ ...inst, id });
    this._touch();
  }

  activate(): void {
    this._requireTransition('ACTIVE');
    if (this._props.installments.length === 0) {
      throw new Error('Cannot activate fee plan without installments');
    }
    // Validate: sum of installment amounts equals annual fee (excluding ONE_TIME)
    if (this._props.frequency !== 'ONE_TIME') {
      const sum = this._props.installments.reduce((acc, i) => acc + i.amountCents, 0);
      if (sum !== this._props.annualFeeCents) {
        throw new Error(
          `Installment sum (${sum}c) does not match annual fee (${this._props.annualFeeCents}c)`,
        );
      }
    }
    this._props.status = 'ACTIVE';
    this._touch();
    this._addDomainEvent(new FeePlanActivatedEvent({
      feePlanId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  archive(): void {
    this._requireTransition('ARCHIVED');
    this._props.status = 'ARCHIVED';
    this._touch();
    this._addDomainEvent(new FeePlanArchivedEvent({
      feePlanId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: FeePlanStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid fee plan transition: ${this._props.status} → ${target}`);
    }
  }
}
