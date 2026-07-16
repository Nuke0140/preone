/**
 * SubscriptionAggregate — SaaS subscription lifecycle (BRC §8.3, R-PLT-002, R-PLT-005).
 *
 * Lifecycle:
 *   TRIAL → ACTIVE → SUSPENDED ⇄ ACTIVE
 *                   ↘ CANCELLED (terminal, with 30-day retention)
 *   TRIAL → CANCELLED (terminal, no retention)
 *
 * Per BRC R-PLT-002: "Subscription grace period (7 days post due date)"
 *   - Auto-suspension 7 days after due date if payment not received.
 *   - SUSPENDED tenants retain read access for 7 more days, then full block.
 *
 * Per BRC R-PLT-005: "License seat allocation (student + staff cap per plan)"
 *   - Each plan enforces a hard cap on student seats + staff seats.
 *   - Seat allocation changes emit SubscriptionSeatAllocationChangedEvent.
 *
 * Invariants:
 *   - trialEndsAt required for TRIAL state
 *   - currentPeriodEndsAt required for ACTIVE/SUSPENDED
 *   - retentionEndsAt required for CANCELLED (when cancelled from ACTIVE)
 *   - studentCap and staffCap must be > 0
 *   - gracePeriodEndsAt computed as currentPeriodEndsAt + 7 days when entering grace
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  SubscriptionActivatedEvent, SubscriptionCancelledEvent,
  SubscriptionCreatedEvent, SubscriptionGracePeriodEnteredEvent,
  SubscriptionReactivatedEvent, SubscriptionSeatAllocationChangedEvent,
  SubscriptionSuspendedEvent,
} from '../events/platform-events';

export type SubscriptionPlan = 'STARTER' | 'GROWTH' | 'PRO' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'SUSPENDED' | 'CANCELLED';

const TERMINAL: SubscriptionStatus[] = ['CANCELLED'];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const PLAN_DEFAULTS: Record<SubscriptionPlan, { studentCap: number; staffCap: number }> = {
  STARTER: { studentCap: 200, staffCap: 15 },
  GROWTH: { studentCap: 800, staffCap: 50 },
  PRO: { studentCap: 2500, staffCap: 150 },
  ENTERPRISE: { studentCap: 10000, staffCap: 500 },
};

export interface SubscriptionProps {
  tenantId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  studentCap: number;
  staffCap: number;
  trialStartsAt: string;
  trialEndsAt?: string;
  currentPeriodStartsAt?: string;
  currentPeriodEndsAt?: string;
  gracePeriodEndsAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  retentionEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class SubscriptionAggregate extends AggregateRoot<SubscriptionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get plan(): SubscriptionPlan { return this._props.plan; }
  get status(): SubscriptionStatus { return this._props.status; }
  get studentCap(): number { return this._props.studentCap; }
  get staffCap(): number { return this._props.staffCap; }
  get trialEndsAt(): string | undefined { return this._props.trialEndsAt; }
  get currentPeriodEndsAt(): string | undefined { return this._props.currentPeriodEndsAt; }
  get gracePeriodEndsAt(): string | undefined { return this._props.gracePeriodEndsAt; }
  get retentionEndsAt(): string | undefined { return this._props.retentionEndsAt; }
  get isTerminal(): boolean { return TERMINAL.includes(this._props.status); }

  static create(props: Omit<
    SubscriptionProps,
    'status' | 'studentCap' | 'staffCap' | 'createdAt' | 'updatedAt'
  >): SubscriptionAggregate {
    if (!props.trialEndsAt) {
      throw new Error('trialEndsAt is required for new subscription');
    }
    if (new Date(props.trialEndsAt).getTime() <= new Date(props.trialStartsAt).getTime()) {
      throw new Error('trialEndsAt must be after trialStartsAt');
    }
    const defaults = PLAN_DEFAULTS[props.plan];
    const now = new Date().toISOString();
    const agg = new SubscriptionAggregate({
      ...props,
      status: 'TRIAL',
      studentCap: defaults.studentCap,
      staffCap: defaults.staffCap,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new SubscriptionCreatedEvent({
      subscriptionId: agg.id,
      tenantId: agg._props.tenantId,
      plan: agg._props.plan,
      trialEndsAt: agg._props.trialEndsAt,
    }));
    return agg;
  }

  activate(currentPeriodStartsAt: string, currentPeriodEndsAt: string): void {
    if (this._props.status !== 'TRIAL') {
      throw new Error(`Cannot activate ${this._props.status} subscription`);
    }
    if (new Date(currentPeriodEndsAt).getTime() <= new Date(currentPeriodStartsAt).getTime()) {
      throw new Error('currentPeriodEndsAt must be after currentPeriodStartsAt');
    }
    this._props.status = 'ACTIVE';
    this._props.currentPeriodStartsAt = currentPeriodStartsAt;
    this._props.currentPeriodEndsAt = currentPeriodEndsAt;
    this._touch();
    this._addDomainEvent(new SubscriptionActivatedEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      activatedAt: currentPeriodStartsAt,
    }));
  }

  enterGracePeriod(enteredAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot enter grace from ${this._props.status}`);
    }
    if (!this._props.currentPeriodEndsAt) {
      throw new Error('currentPeriodEndsAt is required to enter grace');
    }
    const graceEnd = new Date(enteredAt).getTime() + SEVEN_DAYS_MS;
    this._props.status = 'GRACE';
    this._props.gracePeriodEndsAt = new Date(graceEnd).toISOString();
    this._touch();
    this._addDomainEvent(new SubscriptionGracePeriodEnteredEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      gracePeriodEndsAt: this._props.gracePeriodEndsAt!,
    }));
  }

  suspend(reason: string, suspendedAt: string): void {
    if (this._props.status !== 'GRACE' && this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot suspend ${this._props.status} subscription`);
    }
    if (!reason.trim()) throw new Error('suspension reason is required');
    this._props.status = 'SUSPENDED';
    this._props.suspendedAt = suspendedAt;
    this._props.suspensionReason = reason;
    this._touch();
    this._addDomainEvent(new SubscriptionSuspendedEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      reason,
      suspendedAt,
    }));
  }

  reactivate(reactivatedAt: string, newPeriodEndsAt: string): void {
    if (this._props.status !== 'SUSPENDED') {
      throw new Error(`Cannot reactivate ${this._props.status} subscription`);
    }
    if (new Date(newPeriodEndsAt).getTime() <= new Date(reactivatedAt).getTime()) {
      throw new Error('newPeriodEndsAt must be after reactivatedAt');
    }
    this._props.status = 'ACTIVE';
    this._props.suspendedAt = undefined;
    this._props.suspensionReason = undefined;
    this._props.gracePeriodEndsAt = undefined;
    this._props.currentPeriodEndsAt = newPeriodEndsAt;
    this._touch();
    this._addDomainEvent(new SubscriptionReactivatedEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      reactivatedAt,
    }));
  }

  cancel(reason: string, cancelledAt: string): void {
    if (this._props.status === 'CANCELLED') {
      throw new Error('Subscription already CANCELLED');
    }
    if (!reason.trim()) throw new Error('cancellation reason is required');
    const fromActive = this._props.status === 'ACTIVE' || this._props.status === 'GRACE' || this._props.status === 'SUSPENDED';
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = cancelledAt;
    this._props.cancellationReason = reason;
    if (fromActive) {
      // R-PLT-010: 30-day data retention after cancellation
      this._props.retentionEndsAt = new Date(
        new Date(cancelledAt).getTime() + THIRTY_DAYS_MS,
      ).toISOString();
    }
    this._touch();
    this._addDomainEvent(new SubscriptionCancelledEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      reason,
      cancelledAt,
      retentionEndsAt: this._props.retentionEndsAt ?? '',
    }));
  }

  changeSeatAllocation(newStudentCap: number, newStaffCap: number, changedBy: string): void {
    if (this._props.status === 'CANCELLED') {
      throw new Error('Cannot modify CANCELLED subscription');
    }
    if (newStudentCap <= 0 || newStaffCap <= 0) {
      throw new Error('studentCap and staffCap must be > 0');
    }
    if (newStudentCap === this._props.studentCap && newStaffCap === this._props.staffCap) {
      return; // no-op
    }
    const oldStudentCap = this._props.studentCap;
    const oldStaffCap = this._props.staffCap;
    this._props.studentCap = newStudentCap;
    this._props.staffCap = newStaffCap;
    this._touch();
    this._addDomainEvent(new SubscriptionSeatAllocationChangedEvent({
      subscriptionId: this.id,
      tenantId: this._props.tenantId,
      oldStudentCap,
      newStudentCap,
      oldStaffCap,
      newStaffCap,
    }));
  }

  isWithinRetention(at: string): boolean {
    if (!this._props.retentionEndsAt) return false;
    return new Date(at).getTime() <= new Date(this._props.retentionEndsAt).getTime();
  }

  isTrialExpired(at: string): boolean {
    if (this._props.status !== 'TRIAL') return false;
    if (!this._props.trialEndsAt) return false;
    return new Date(at).getTime() > new Date(this._props.trialEndsAt).getTime();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
