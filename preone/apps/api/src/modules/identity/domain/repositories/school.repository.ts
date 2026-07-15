/**
 * SchoolRepository interface — port for School aggregate persistence.
 *
 * Per BTD §11.1: Repository interface contracts.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { SchoolAggregate } from '../aggregates/school.aggregate';
import type { SchoolStatus } from '../aggregates/school.aggregate';

export interface SchoolListFilter {
  status?: SchoolStatus;
  search?: string;
}

export interface SchoolRepository extends IRepository<SchoolAggregate> {
  /** Find by email (case-insensitive). */
  findByEmail(email: string): Promise<SchoolAggregate | undefined>;

  /** Find by GST number (for invoicing reconciliation). */
  findByGstNumber(gstNumber: string): Promise<SchoolAggregate | undefined>;

  /** Find by phone. */
  findByPhone(phone: string): Promise<SchoolAggregate | undefined>;

  /** List schools by status (for platform admin). */
  listByStatus(status: SchoolStatus, page: number, pageSize: number): Promise<{
    items: SchoolAggregate[];
    total: number;
  }>;

  /** List with filter (search + status). */
  list(filter: SchoolListFilter, page: number, pageSize: number): Promise<{
    items: SchoolAggregate[];
    total: number;
  }>;
}
