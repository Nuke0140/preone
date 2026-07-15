/**
 * RoleRepository interface — port for Role aggregate.
 */
import type { IRepository } from '@shared/kernel/repository';
import type { RoleAggregate } from '../aggregates/role.aggregate';

export interface RoleRepository extends IRepository<RoleAggregate> {
  findByCode(tenantId: string, code: string): Promise<RoleAggregate | undefined>;
  listByTenant(tenantId: string): Promise<RoleAggregate[]>;
}
