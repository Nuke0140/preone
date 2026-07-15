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
import { DomainEvent } from '@shared/kernel/domain-event';

export type SchoolStatus = 'PROSPECT' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type SchoolTier = 'STARTER' | 'GROWTH' | 'SCALE' | 'ENTERPRISE';

export interface SchoolProps {
  name: string;
  legalName?: string;
  email: string;
  phone: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  status: SchoolStatus;
  tier: SchoolTier;
  branchCount: number;
  maxBranches: number;
  studentSeats: number;
  usedSeats: number;
  logoUrl?: string;
  timezone: string;
  locale: string;
  trialEndsAt?: string;
  activatedAt?: string;
  suspendedAt?: string;
  cancelledAt?: string;
  deletedAt?: string;
}

export class SchoolCreatedEvent extends DomainEvent<{
  schoolId: string;
  name: string;
  tier: SchoolTier;
  createdBy: string;
}> {}

export class SchoolActivatedEvent extends DomainEvent<{
  schoolId: string;
  activatedAt: string;
}> {}

export class SchoolSuspendedEvent extends DomainEvent<{
  schoolId: string;
  reason: string;
  suspendedAt: string;
}> {}

export class SchoolCancelledEvent extends DomainEvent<{
  schoolId: string;
  cancelledAt: string;
}> {}

export class SchoolUpdatedEvent extends DomainEvent<{
  schoolId: string;
  fields: string[];
}> {}

export class SchoolAggregate extends AggregateRoot<SchoolProps> {
  // ─────── Read accessors ───────
  get name(): string { return this._props.name; }
  get legalName(): string | undefined { return this._props.legalName; }
  get email(): string { return this._props.email; }
  get phone(): string { return this._props.phone; }
  get website(): string | undefined { return this._props.website; }
  get status(): SchoolStatus { return this._props.status; }
  get tier(): SchoolTier { return this._props.tier; }
  get branchCount(): number { return this._props.branchCount; }
  get maxBranches(): number { return this._props.maxBranches; }
  get studentSeats(): number { return this._props.studentSeats; }
  get usedSeats(): number { return this._props.usedSeats; }
  get logoUrl(): string | undefined { return this._props.logoUrl; }
  get timezone(): string { return this._props.timezone; }
  get locale(): string { return this._props.locale; }
  get gstNumber(): string | undefined { return this._props.gstNumber; }
  get panNumber(): string | undefined { return this._props.panNumber; }
  get trialEndsAt(): string | undefined { return this._props.trialEndsAt; }
  get activatedAt(): string | undefined { return this._props.activatedAt; }
  get suspendedAt(): string | undefined { return this._props.suspendedAt; }
  get cancelledAt(): string | undefined { return this._props.cancelledAt; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  // ─────── Invariants / business rules ───────
  get isProspect(): boolean { return this._props.status === 'PROSPECT'; }
  get isTrial(): boolean { return this._props.status === 'TRIAL'; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isSuspended(): boolean { return this._props.status === 'SUSPENDED'; }
  get isCancelled(): boolean { return this._props.status === 'CANCELLED'; }

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
   * Begin trial — PROSPECT → TRIAL.
   */
  startTrial(trialEndsAt: string): void {
    if (this._props.status !== 'PROSPECT') {
      throw new Error(`Cannot start trial from status ${this._props.status}`);
    }
    this._props.status = 'TRIAL';
    this._props.trialEndsAt = trialEndsAt;
  }

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
   * Reactivate a school — SUSPENDED → ACTIVE.
   */
  reactivate(now: string): void {
    if (this._props.status !== 'SUSPENDED') {
      throw new Error(`Cannot reactivate school in status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._props.suspendedAt = undefined;
  }

  /**
   * Cancel a school — TRIAL/ACTIVE/SUSPENDED → CANCELLED.
   */
  cancel(now: string): void {
    if (this._props.status === 'CANCELLED') return;
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = now;
    this._addDomainEvent(new SchoolCancelledEvent({ schoolId: this.id, cancelledAt: now }));
  }

  updateProfile(props: Partial<Pick<SchoolProps, 'name' | 'legalName' | 'phone' | 'website' | 'logoUrl' | 'gstNumber' | 'panNumber' | 'timezone' | 'locale'>>): void {
    const fields: string[] = [];
    if (props.name !== undefined) { this._props.name = props.name; fields.push('name'); }
    if (props.legalName !== undefined) { this._props.legalName = props.legalName; fields.push('legalName'); }
    if (props.phone !== undefined) { this._props.phone = props.phone; fields.push('phone'); }
    if (props.website !== undefined) { this._props.website = props.website; fields.push('website'); }
    if (props.logoUrl !== undefined) { this._props.logoUrl = props.logoUrl; fields.push('logoUrl'); }
    if (props.gstNumber !== undefined) { this._props.gstNumber = props.gstNumber; fields.push('gstNumber'); }
    if (props.panNumber !== undefined) { this._props.panNumber = props.panNumber; fields.push('panNumber'); }
    if (props.timezone !== undefined) { this._props.timezone = props.timezone; fields.push('timezone'); }
    if (props.locale !== undefined) { this._props.locale = props.locale; fields.push('locale'); }
    if (fields.length > 0) {
      this._addDomainEvent(new SchoolUpdatedEvent({ schoolId: this.id, fields }));
    }
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
   * Decrement branch count when a branch is closed.
   */
  decrementBranchCount(): void {
    if (this._props.branchCount === 0) return;
    this._props.branchCount -= 1;
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

  /**
   * Upgrade tier — STARTER → GROWTH → SCALE → ENTERPRISE.
   */
  upgradeTier(newTier: SchoolTier, newMaxBranches: number, newStudentSeats: number): void {
    this._props.tier = newTier;
    this._props.maxBranches = newMaxBranches;
    this._props.studentSeats = newStudentSeats;
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
