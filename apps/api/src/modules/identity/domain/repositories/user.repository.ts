/**
 * UserRepository interface — port for UserAggregate persistence.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { UserAggregate } from '../aggregates/user.aggregate';
import type { UserStatus } from '../aggregates/user.aggregate';

export interface UserListFilter {
  tenantId: string;
  branchId?: string;
  status?: UserStatus;
  role?: string;
  search?: string;
}

export interface UserRepository extends IRepository<UserAggregate> {
  findByEmail(email: string): Promise<UserAggregate | undefined>;
  findByPhone(phone: string): Promise<UserAggregate | undefined>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }>;
  list(filter: UserListFilter, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }>;

  /**
   * Load roles for a user (joined from user_role + role tables).
   * Returns role codes (e.g., ['SCHOOL_ADMIN', 'PRINCIPAL']).
   */
  loadRoleCodes(userId: string): Promise<string[]>;

  /**
   * Persist role assignments for a user (replace strategy).
   * Implementation handles user_role table upsert + delete.
   */
  saveRoles(userId: string, roleIds: string[], assignedBy: string, schoolId: string, branchId?: string): Promise<void>;

  /**
   * Load effective permission codes for a user (UNION across all roles).
   * Used by PermissionsGuard.
   */
  loadPermissionCodes(userId: string, tenantId: string): Promise<string[]>;
}
