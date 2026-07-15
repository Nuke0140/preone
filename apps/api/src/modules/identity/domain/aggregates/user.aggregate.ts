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
import type { DomainEvent } from '@shared/kernel/domain-event';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type UserChannel = 'EMAIL' | 'PHONE' | 'BOTH';

export interface UserProps {
  tenantId: string;           // school.id
  email: string;
  phone?: string;
  passwordHash?: string;       // argon2id hash (optional if OTP-only)
  firstName: string;
  lastName: string;
  displayName?: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: string[];             // role codes: ['SCHOOL_ADMIN', 'PRINCIPAL']
  permissionsVersion: number;  // bumped on role change
  branchId?: string;           // primary branch (for staff)
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

export class UserAggregate extends AggregateRoot<UserProps> {
  // ─────── Read accessors ───────
  get tenantId(): string { return this._props.tenantId; }
  get email(): string { return this._props.email; }
  get phone(): string | undefined { return this._props.phone; }
  get passwordHash(): string | undefined { return this._props.passwordHash; }
  get firstName(): string { return this._props.firstName; }
  get lastName(): string { return this._props.lastName; }
  get displayName(): string { return this._props.displayName ?? `${this._props.firstName} ${this._props.lastName}`; }
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

  // ─────── Invariants ───────
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isPending(): boolean { return this._props.status === 'PENDING'; }
  get isDeactivated(): boolean { return this._props.status === 'DEACTIVATED'; }

  // ─────── State-changing operations ───────

  changeRoles(newRoles: string[]): void {
    const old = [...this._props.roles];
    this._props.roles = [...newRoles];
    this._props.permissionsVersion += 1;
    this._addDomainEvent(new UserRolesChangedEvent({
      userId: this.id,
      oldRoles: old,
      newRoles,
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

  activate(): void {
    if (this._props.status === 'ACTIVE') return;
    this._props.status = 'ACTIVE';
  }

  suspend(): void {
    if (this._props.status === 'SUSPENDED') return;
    this._props.status = 'SUSPENDED';
  }

  deactivate(): void {
    this._props.status = 'DEACTIVATED';
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
