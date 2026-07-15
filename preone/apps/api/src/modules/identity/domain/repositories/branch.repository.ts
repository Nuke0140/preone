/**
 * BranchRepository interface — port for Branch aggregate.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { BranchAggregate } from '../aggregates/branch.aggregate';

export interface BranchListFilter {
  schoolId: string;
  isActive?: boolean;
  search?: string;
}

export interface BranchRepository extends IRepository<BranchAggregate> {
  findByCode(schoolId: string, code: string): Promise<BranchAggregate | undefined>;
  listBySchool(schoolId: string, page: number, pageSize: number): Promise<{
    items: BranchAggregate[];
    total: number;
  }>;
  list(filter: BranchListFilter, page: number, pageSize: number): Promise<{
    items: BranchAggregate[];
    total: number;
  }>;
  countBySchool(schoolId: string): Promise<number>;
}
