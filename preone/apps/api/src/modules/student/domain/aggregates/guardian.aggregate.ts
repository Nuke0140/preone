/**
 * GuardianAggregate — parent/guardian master record (BTD §17.1).
 *
 * Per ERD v3.0 §14.4.5: "Guardian — a parent or legal guardian who is financially
 *   responsible for one or more students. A guardian may be linked to multiple
 *   students (siblings) within the same school."
 *
 * Per ADR v1.0:
 *   - A guardian MAY have portal access (linked User) — optional
 *   - governmentId (PAN/Aadhaar) is pgcrypto-encrypted at rest
 *   - Soft delete (deleted_at)
 *   - Annual income stored in integer cents (no float)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { GuardianAddedEvent, GuardianRemovedEvent } from '../events/student-events';

export type GuardianStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface GuardianProps {
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  altPhone?: string;
  occupation?: string;
  employer?: string;
  annualIncomeCents?: number;
  education?: string;
  // ENCRYPTED at rest (pgcrypto) — plaintext only in memory
  governmentId?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  status: GuardianStatus;
  userId?: string;

  deletedAt?: string;
}

export class GuardianCreatedEvent extends GuardianAddedEvent {}

export class GuardianAggregate extends AggregateRoot<GuardianProps> {
  // ─────── Read accessors ───────
  get tenantId(): string { return this._props.tenantId; }
  get firstName(): string { return this._props.firstName; }
  get lastName(): string { return this._props.lastName; }
  get fullName(): string { return `${this._props.firstName} ${this._props.lastName}`; }
  get email(): string | undefined { return this._props.email; }
  get phone(): string { return this._props.phone; }
  get altPhone(): string | undefined { return this._props.altPhone; }
  get occupation(): string | undefined { return this._props.occupation; }
  get employer(): string | undefined { return this._props.employer; }
  get annualIncomeCents(): number | undefined { return this._props.annualIncomeCents; }
  get education(): string | undefined { return this._props.education; }
  get governmentId(): string | undefined { return this._props.governmentId; }

  get addressLine1(): string | undefined { return this._props.addressLine1; }
  get addressLine2(): string | undefined { return this._props.addressLine2; }
  get city(): string | undefined { return this._props.city; }
  get state(): string | undefined { return this._props.state; }
  get postalCode(): string | undefined { return this._props.postalCode; }

  get status(): GuardianStatus { return this._props.status; }
  get userId(): string | undefined { return this._props.userId; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  // ─────── Invariants ───────
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isBlocked(): boolean { return this._props.status === 'BLOCKED'; }
  get isDeleted(): boolean { return this._props.deletedAt !== undefined; }

  // ─────── State-changing operations ───────

  updateProfile(props: Partial<Pick<GuardianProps,
    'firstName' | 'lastName' | 'email' | 'phone' | 'altPhone' | 'occupation' |
    'employer' | 'annualIncomeCents' | 'education' | 'governmentId' |
    'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode'
  >>): void {
    Object.assign(this._props, props);
  }

  linkUser(userId: string): void {
    this._props.userId = userId;
  }

  unlinkUser(): void {
    this._props.userId = undefined;
  }

  block(): void {
    this._props.status = 'BLOCKED';
  }

  reactivate(): void {
    this._props.status = 'ACTIVE';
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
    this._props.status = 'INACTIVE';
  }

  // ─────── Factory ───────

  static create(props: Omit<GuardianProps, 'status'> & { status?: GuardianStatus }): GuardianAggregate {
    return new GuardianAggregate({
      ...props,
      status: props.status ?? 'ACTIVE',
    });
  }
}
