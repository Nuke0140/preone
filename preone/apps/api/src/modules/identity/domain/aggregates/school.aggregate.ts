/**
 * School (Tenant) Aggregate Root — the multi-tenant anchor entity.
 *
 * Per ERD v3.0 §11.4.2: "Multi-tenant anchor entity. One school = one tenant.
 *   All tenant-scoped tables reference this via school_id."
 *
 * Per ADR-002 Multi-Tenancy: Shared schema with discriminator.
 * Per ADR-001 Multi-School → Multi-Branch → Multi-Academic-Year isolation.
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import type { DomainEvent } from '@shared/kernel/domain-event';

export type SchoolStatus = 'PROSPECT' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type SchoolTier = 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';

export interface SchoolProps {
  name: string;
  legalName?: string;
  email: string;
  phone: string;
  website?: string;
  gstNumber?: string;       // 15-char GSTIN
  panNumber?: string;       // 10-char PAN
  status: SchoolStatus;
  tier: SchoolTier;
  branchCount: number;
  maxBranches: number;
  studentSeats: number;
  usedSeats: number;
  logoUrl?: string;
  timezone: string;         // 'Asia/Kolkata'
  locale: string;           // 'en-IN' | 'mr-IN' | 'hi-IN'
  trialEndsAt?: string;     // ISO date
  activatedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  deletedAt?: string;
}

export interface SchoolCreatedPayload {
  schoolId: string;
  name: string;
  tier: SchoolTier;
  createdBy: string;
}

export class SchoolCreatedEvent extends DomainEvent<SchoolCreatedPayload> {}

export class SchoolActivatedEvent extends DomainEvent<{
  schoolId: string;
  activatedAt: string;
}> {}

export class SchoolSuspendedEvent extends DomainEvent<{
  schoolId: string;
  reason: string;
  suspendedAt: string;
}> {}

export class SchoolAggregate extends AggregateRoot<SchoolProps> {
  // ─────── Read accessors ───────
  get name(): string { return this._props.name; }
  get email(): string { return this._props.email; }
  get phone(): string { return this._props.phone; }
  get status(): SchoolStatus { return this._props.status; }
  get tier(): SchoolTier { return this._props.tier; }
  get branchCount(): number { return this._props.branchCount; }
  get maxBranches(): number { return this._props.maxBranches; }
  get studentSeats(): number { return this._props.studentSeats; }
  get usedSeats(): number { return this._props.usedSeats; }
  get timezone(): string { return this._props.timezone; }
  get locale(): string { return this._props.locale; }
  get gstNumber(): string | undefined { return this._props.gstNumber; }
  get panNumber(): string | undefined { return this._props.panNumber; }
  get trialEndsAt(): string | undefined { return this._props.trialEndsAt; }
  get activatedAt(): string | undefined { return this._props.activatedAt; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  // ─────── Invariants / business rules ───────

  get isTrial(): boolean { return this._props.status === 'TRIAL'; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isSuspended(): boolean { return this._props.status === 'SUSPENDED'; }

  get seatsAvailable(): number {
    return Math.max(0, this._props.studentSeats - this._props.usedSeats);
  }

  canAddBranch(): boolean {
    return this._props.branchCount < this._props.maxBranches;
  }

  canAddStudent(): boolean {
    return this.seatsAvailable > 0 && this.isActive;
  }

  // ─────── State-changing operations (raise events) ───────

  /**
   * Activate a school — TRIAL → ACTIVE.
   * Per BRC: school must have at least one branch + one admin user.
   */
  activate(now: string): void {
    if (this._props.status !== 'TRIAL' && this._props.status !== 'PROSPECT') {
      throw new Error(`Cannot activate school in status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._props.activatedAt = now;
    this._addDomainEvent(new SchoolActivatedEvent({ schoolId: this.id, activatedAt: now }));
  }

  /**
   * Suspend a school — ACTIVE → SUSPENDED.
   * Triggers: payment failure, policy violation, admin action.
   */
  suspend(reason: string, now: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot suspend school in status ${this._props.status}`);
    }
    this._props.status = 'SUSPENDED';
    this._props.suspendedAt = now;
    this._addDomainEvent(new SchoolSuspendedEvent({ schoolId: this.id, reason, suspendedAt: now }));
  }

  /**
   * Increment branch count when a new branch is added.
   */
  incrementBranchCount(): void {
    if (!this.canAddBranch()) {
      throw new Error(`Max branches (${this._props.maxBranches}) reached for tier ${this._props.tier}`);
    }
    this._props.branchCount += 1;
  }

  /**
   * Increment used seats when a new student is admitted.
   */
  incrementUsedSeats(): void {
    if (!this.canAddStudent()) {
      throw new Error(`No available seats (used ${this._props.usedSeats}/${this._props.studentSeats})`);
    }
    this._props.usedSeats += 1;
  }

  /**
   * Decrement used seats when a student exits.
   */
  decrementUsedSeats(): void {
    if (this._props.usedSeats === 0) return;
    this._props.usedSeats -= 1;
  }

  // ─────── Factory ───────

  static create(props: Omit<SchoolProps, 'branchCount' | 'usedSeats' | 'status' | 'tier'> & {
    tier: SchoolTier;
    status?: SchoolStatus;
  }, createdBy: string): SchoolAggregate {
    const aggregate = new SchoolAggregate({
      ...props,
      status: props.status ?? 'PROSPECT',
      branchCount: 0,
      usedSeats: 0,
    });
    aggregate._addDomainEvent(
      new SchoolCreatedEvent({
        schoolId: aggregate.id,
        name: props.name,
        tier: props.tier,
        createdBy,
      }),
    );
    return aggregate;
  }
}
