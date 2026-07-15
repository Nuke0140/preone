/**
 * RoleRepository interface — port for Role aggregate.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { RoleAggregate } from '../aggregates/role.aggregate';

export interface RoleRepository extends IRepository<RoleAggregate> {
  findByCode(tenantId: string | undefined, code: string): Promise<RoleAggregate | undefined>;
  listByTenant(tenantId: string): Promise<RoleAggregate[]>;
  listSystemRoles(): Promise<RoleAggregate[]>;
  /** List all roles available in a tenant context (tenant-scoped + PLATFORM). */
  listAvailableForTenant(tenantId: string): Promise<RoleAggregate[]>;

  /**
   * Persist role permission grants (replace strategy).
   * Implementation handles role_permission table upsert + delete.
   */
  savePermissions(roleId: string, permissionIds: string[], grantedBy: string): Promise<void>;
}
