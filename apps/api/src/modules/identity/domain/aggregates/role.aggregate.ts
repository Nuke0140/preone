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

export type RoleScope = 'PLATFORM' | 'TENANT' | 'BRANCH' | 'CLASSROOM';

export interface RoleProps {
  tenantId?: string;      // undefined for PLATFORM scope (super_admin)
  code: string;            // 'SCHOOL_ADMIN'
  name: string;            // 'School Administrator'
  description?: string;
  scope: RoleScope;
  isSystem: boolean;       // true = built-in role, cannot be deleted
  permissionIds: string[]; // permission.id values
  color?: string;          // for UI badge
  sortOrder: number;
  isActive: boolean;
  deletedAt?: string;
}

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

  grantPermission(permissionId: string): void {
    if (!this._props.permissionIds.includes(permissionId)) {
      this._props.permissionIds.push(permissionId);
    }
  }

  revokePermission(permissionId: string): void {
    this._props.permissionIds = this._props.permissionIds.filter((p) => p !== permissionId);
  }

  static create(props: Omit<RoleProps, 'permissionIds' | 'isActive' | 'sortOrder'> & {
    permissionIds?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }): RoleAggregate {
    return new RoleAggregate({
      ...props,
      permissionIds: props.permissionIds ?? [],
      isActive: props.isActive ?? true,
      sortOrder: props.sortOrder ?? 100,
    });
  }
}
