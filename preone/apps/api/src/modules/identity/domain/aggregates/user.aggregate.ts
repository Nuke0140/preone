/**
 * UserAggregate — application user (staff / parent / system).
 *
 * Per ERD v3.0 §11.4.4: "Application user — staff, parent, or system.
 *   Linked via user_role to one or more roles. Authentication via password
 *   hash or OTP."
 *
 * Per ADR v1.0:
 *   - 11 staff roles + Parent: SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL,
 *     COORDINATOR, CLASS_TEACHER, ACTIVITY_TEACHER, RECEPTION_ADMISSION,
 *     ACCOUNTS, INVENTORY_STORE_KEEPER, TRANSPORT_MANAGER, HR, PARENT
 *   - MFA support via OTP
 *   - Soft delete (deleted_at)
 *   - permissionsVersion bumped on role change → invalidates cache
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type UserChannel = 'EMAIL' | 'PHONE' | 'BOTH';

export interface UserProps {
  tenantId: string;
  email: string;
  phone?: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: string[];
  permissionsVersion: number;
  branchId?: string;
  academicYearId?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  sessionId?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  mfaEnabled: boolean;
  locale: string;
  timezone: string;
  deletedAt?: string;
}

export class UserCreatedEvent extends DomainEvent<{
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  createdBy: string;
}> {}

export class UserRolesChangedEvent extends DomainEvent<{
  userId: string;
  oldRoles: string[];
  newRoles: string[];
  newPermissionsVersion: number;
}> {}

export class UserActivatedEvent extends DomainEvent<{ userId: string; activatedAt: string }> {}

export class UserSuspendedEvent extends DomainEvent<{ userId: string; reason: string; suspendedAt: string }> {}

export class UserDeactivatedEvent extends DomainEvent<{ userId: string; deactivatedAt: string }> {}

export class UserAggregate extends AggregateRoot<UserProps> {
  // ─────── Read accessors ───────
  get tenantId(): string { return this._props.tenantId; }
  get email(): string { return this._props.email; }
  get phone(): string | undefined { return this._props.phone; }
  get passwordHash(): string | undefined { return this._props.passwordHash; }
  get firstName(): string { return this._props.firstName; }
  get lastName(): string { return this._props.lastName; }
  get displayName(): string { return this._props.displayName ?? `${this._props.firstName} ${this._props.lastName}`; }
  get avatarUrl(): string | undefined { return this._props.avatarUrl; }
  get status(): UserStatus { return this._props.status; }
  get roles(): string[] { return [...this._props.roles]; }
  get permissionsVersion(): number { return this._props.permissionsVersion; }
  get branchId(): string | undefined { return this._props.branchId; }
  get academicYearId(): string | undefined { return this._props.academicYearId; }
  get sessionId(): string | undefined { return this._props.sessionId; }
  get mfaEnabled(): boolean { return this._props.mfaEnabled; }
  get locale(): string { return this._props.locale; }
  get timezone(): string { return this._props.timezone; }
  get lastLoginAt(): string | undefined { return this._props.lastLoginAt; }
  get lastLoginIp(): string | undefined { return this._props.lastLoginIp; }
  get emailVerifiedAt(): string | undefined { return this._props.emailVerifiedAt; }
  get phoneVerifiedAt(): string | undefined { return this._props.phoneVerifiedAt; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  // ─────── Invariants ───────
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isPending(): boolean { return this._props.status === 'PENDING'; }
  get isDeactivated(): boolean { return this._props.status === 'DEACTIVATED'; }
  get isSuspended(): boolean { return this._props.status === 'SUSPENDED'; }

  // ─────── State-changing operations ───────

  changeRoles(newRoles: string[]): void {
    const old = [...this._props.roles];
    const deduped = Array.from(new Set(newRoles));
    if (old.length === deduped.length && old.every((r) => deduped.includes(r))) return;
    this._props.roles = deduped;
    this._props.permissionsVersion += 1;
    this._addDomainEvent(new UserRolesChangedEvent({
      userId: this.id,
      oldRoles: old,
      newRoles: deduped,
      newPermissionsVersion: this._props.permissionsVersion,
    }));
  }

  addRole(role: string): void {
    if (this._props.roles.includes(role)) return;
    this.changeRoles([...this._props.roles, role]);
  }

  removeRole(role: string): void {
    if (!this._props.roles.includes(role)) return;
    this.changeRoles(this._props.roles.filter((r) => r !== role));
  }

  activate(now: string): void {
    if (this._props.status === 'ACTIVE') return;
    this._props.status = 'ACTIVE';
    this._addDomainEvent(new UserActivatedEvent({ userId: this.id, activatedAt: now }));
  }

  suspend(reason: string, now: string): void {
    if (this._props.status === 'SUSPENDED') return;
    this._props.status = 'SUSPENDED';
    this._addDomainEvent(new UserSuspendedEvent({ userId: this.id, reason, suspendedAt: now }));
  }

  deactivate(now: string): void {
    if (this._props.status === 'DEACTIVATED') return;
    this._props.status = 'DEACTIVATED';
    this._addDomainEvent(new UserDeactivatedEvent({ userId: this.id, deactivatedAt: now }));
  }

  updateProfile(props: Partial<Pick<UserProps, 'firstName' | 'lastName' | 'displayName' | 'avatarUrl' | 'phone' | 'locale' | 'timezone'>>): void {
    if (props.firstName !== undefined) this._props.firstName = props.firstName;
    if (props.lastName !== undefined) this._props.lastName = props.lastName;
    if (props.displayName !== undefined) this._props.displayName = props.displayName;
    if (props.avatarUrl !== undefined) this._props.avatarUrl = props.avatarUrl;
    if (props.phone !== undefined) this._props.phone = props.phone;
    if (props.locale !== undefined) this._props.locale = props.locale;
    if (props.timezone !== undefined) this._props.timezone = props.timezone;
  }

  setBranch(branchId: string | undefined): void {
    this._props.branchId = branchId;
  }

  recordLogin(ip: string, sessionId: string, now: string): void {
    this._props.lastLoginAt = now;
    this._props.lastLoginIp = ip;
    this._props.sessionId = sessionId;
  }

  verifyEmail(now: string): void {
    this._props.emailVerifiedAt = now;
  }

  verifyPhone(now: string): void {
    this._props.phoneVerifiedAt = now;
  }

  setPassword(hash: string): void {
    this._props.passwordHash = hash;
  }

  enableMfa(): void { this._props.mfaEnabled = true; }
  disableMfa(): void { this._props.mfaEnabled = false; }

  softDelete(now: string): void {
    this._props.deletedAt = now;
    this._props.status = 'DEACTIVATED';
  }

  // ─────── Factory ───────
  static create(
    props: Omit<UserProps, 'permissionsVersion' | 'status' | 'mfaEnabled'> & {
      status?: UserStatus;
      mfaEnabled?: boolean;
    },
    createdBy: string,
  ): UserAggregate {
    const aggregate = new UserAggregate({
      ...props,
      status: props.status ?? 'PENDING',
      permissionsVersion: 1,
      mfaEnabled: props.mfaEnabled ?? false,
    });
    aggregate._addDomainEvent(new UserCreatedEvent({
      userId: aggregate.id,
      tenantId: props.tenantId,
      email: props.email,
      roles: props.roles,
      createdBy,
    }));
    return aggregate;
  }
}
