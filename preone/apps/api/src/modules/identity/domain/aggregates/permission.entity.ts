/**
 * PermissionEntity — read-only permission catalog entry.
 *
 * Per ERD v3.0 §11.4.6: Permissions are global (not tenant-scoped).
 *   Code format: '<resource>.<action>.<scope>' e.g. 'students.create.execute'
 *
 * Per BTD §20.1 RBAC: Casbin-style role→permission mapping.
 * Per ADR-011: Permission UNION (never promote).
 */
import { Entity } from '@shared/kernel/entity';

export type PermissionScope = 'PLATFORM' | 'TENANT' | 'BRANCH' | 'CLASSROOM';
export type PermissionAction =
  | 'create' | 'read' | 'update' | 'delete'
  | 'execute' | 'approve' | 'reject' | 'export'
  | 'assign' | 'configure';

export interface PermissionProps {
  code: string;          // 'students.create.execute'
  name: string;
  description?: string;
  module: string;        // 'student', 'finance'
  action: PermissionAction;
  resource: string;      // 'student', 'invoice'
  scopeType: PermissionScope;
  isDangerous: boolean;
}

export class PermissionEntity extends Entity<PermissionProps> {
  get code(): string { return this._props.code; }
  get name(): string { return this._props.name; }
  get description(): string | undefined { return this._props.description; }
  get module(): string { return this._props.module; }
  get action(): PermissionAction { return this._props.action; }
  get resource(): string { return this._props.resource; }
  get scopeType(): PermissionScope { return this._props.scopeType; }
  get isDangerous(): boolean { return this._props.isDangerous; }

  static create(props: PermissionProps, id?: string): PermissionEntity {
    return new PermissionEntity(props, id);
  }
}
