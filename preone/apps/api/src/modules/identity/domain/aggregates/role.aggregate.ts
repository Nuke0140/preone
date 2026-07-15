/**
 * RoleAggregate — named permission bundle (e.g., 'SCHOOL_ADMIN', 'TEACHER').
 *
 * Per ERD v3.0 §11.4.5: "Named permission bundle (Center Head, Teacher, Parent, Accountant).
 *   Roles are tenant-scoped; super_admin role is platform-wide."
 *
 * Per ADR v1.0: 11 staff roles + Parent
 *   SUPER_ADMIN, SCHOOL_ADMIN, PRINCIPAL, COORDINATOR, CLASS_TEACHER,
 *   ACTIVITY_TEACHER, RECEPTION_ADMISSION, ACCOUNTS, INVENTORY_STORE_KEEPER,
 *   TRANSPORT_MANAGER, HR, PARENT
 *
 * Per ADR-011: Permission UNION (never promote) — a user's effective permissions
 *   are the UNION of permissions from ALL their roles. Roles never grant
 *   negatives (denials).
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export type RoleScope = 'PLATFORM' | 'TENANT' | 'BRANCH' | 'CLASSROOM';

export interface RoleProps {
  tenantId?: string;
  code: string;
  name: string;
  description?: string;
  scope: RoleScope;
  isSystem: boolean;
  permissionIds: string[];
  color?: string;
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string;
}

export class RoleCreatedEvent extends DomainEvent<{
  roleId: string;
  tenantId?: string;
  code: string;
  createdBy: string;
}> {}

export class RolePermissionGrantedEvent extends DomainEvent<{
  roleId: string;
  permissionId: string;
  grantedBy: string;
}> {}

export class RolePermissionRevokedEvent extends DomainEvent<{
  roleId: string;
  permissionId: string;
  revokedBy: string;
}> {}

export class RoleDeletedEvent extends DomainEvent<{ roleId: string; deletedAt: string }> {}

export class RoleAggregate extends AggregateRoot<RoleProps> {
  get code(): string { return this._props.code; }
  get name(): string { return this._props.name; }
  get description(): string | undefined { return this._props.description; }
  get scope(): RoleScope { return this._props.scope; }
  get isSystem(): boolean { return this._props.isSystem; }
  get permissionIds(): string[] { return [...this._props.permissionIds]; }
  get color(): string | undefined { return this._props.color; }
  get sortOrder(): number { return this._props.sortOrder; }
  get isActive(): boolean { return this._props.isActive; }
  get tenantId(): string | undefined { return this._props.tenantId; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  grantPermission(permissionId: string, grantedBy: string): void {
    if (!this._props.permissionIds.includes(permissionId)) {
      this._props.permissionIds.push(permissionId);
      this._addDomainEvent(new RolePermissionGrantedEvent({ roleId: this.id, permissionId, grantedBy }));
    }
  }

  revokePermission(permissionId: string, revokedBy: string): void {
    const before = this._props.permissionIds.length;
    this._props.permissionIds = this._props.permissionIds.filter((p) => p !== permissionId);
    if (this._props.permissionIds.length !== before) {
      this._addDomainEvent(new RolePermissionRevokedEvent({ roleId: this.id, permissionId, revokedBy }));
    }
  }

  updateProfile(props: Partial<Pick<RoleProps, 'name' | 'description' | 'color' | 'sortOrder' | 'isActive'>>): void {
    if (props.name !== undefined) this._props.name = props.name;
    if (props.description !== undefined) this._props.description = props.description;
    if (props.color !== undefined) this._props.color = props.color;
    if (props.sortOrder !== undefined) this._props.sortOrder = props.sortOrder;
    if (props.isActive !== undefined) this._props.isActive = props.isActive;
  }

  /**
   * Soft-delete — blocked if isSystem=true (BRC R-HR-012).
   */
  delete(now: string): void {
    if (this._props.isSystem) {
      throw new Error('System roles cannot be deleted.');
    }
    this._props.deletedAt = now;
    this._props.isActive = false;
    this._addDomainEvent(new RoleDeletedEvent({ roleId: this.id, deletedAt: now }));
  }

  static create(
    props: Omit<RoleProps, 'permissionIds' | 'isActive' | 'sortOrder'> & {
      permissionIds?: string[];
      isActive?: boolean;
      sortOrder?: number;
    },
    createdBy: string,
  ): RoleAggregate {
    const aggregate = new RoleAggregate({
      ...props,
      permissionIds: props.permissionIds ?? [],
      isActive: props.isActive ?? true,
      sortOrder: props.sortOrder ?? 100,
    });
    aggregate._addDomainEvent(new RoleCreatedEvent({
      roleId: aggregate.id,
      tenantId: props.tenantId,
      code: props.code,
      createdBy,
    }));
    return aggregate;
  }
}
