/**
 * GuardianRepository interface — port for GuardianAggregate persistence.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { GuardianAggregate, GuardianStatus } from '../aggregates/guardian.aggregate';

export interface GuardianListFilter {
  tenantId: string;
  search?: string;
  status?: GuardianStatus;
}

export interface GuardianRepository extends IRepository<GuardianAggregate> {
  findById(id: string): Promise<GuardianAggregate | undefined>;
  findByPhone(tenantId: string, phone: string): Promise<GuardianAggregate | undefined>;
  findByEmail(tenantId: string, email: string): Promise<GuardianAggregate | undefined>;
  findByUserId(userId: string): Promise<GuardianAggregate | undefined>;
  list(filter: GuardianListFilter, page: number, pageSize: number): Promise<{
    items: GuardianAggregate[];
    total: number;
  }>;
  save(aggregate: GuardianAggregate): Promise<void>;
  delete(aggregate: GuardianAggregate): Promise<void>;
}
