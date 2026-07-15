/**
 * UserRepository interface — port for UserAggregate persistence.
 */
import type { IRepository } from '@shared/kernel/repository';
import type { UserAggregate } from '../aggregates/user.aggregate';

export interface UserRepository extends IRepository<UserAggregate> {
  findByEmail(email: string): Promise<UserAggregate | undefined>;
  findByPhone(phone: string): Promise<UserAggregate | undefined>;
  findByTenant(tenantId: string, page: number, pageSize: number): Promise<{
    items: UserAggregate[];
    total: number;
  }>;
}
