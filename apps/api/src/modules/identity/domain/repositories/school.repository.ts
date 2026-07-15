/**
 * SchoolRepository interface — port for School aggregate persistence.
 *
 * Per BTD §11.1: Repository interface contracts.
 */
import type { IRepository } from '@shared/kernel/repository';
import type { SchoolAggregate } from '../aggregates/school.aggregate';

export interface SchoolRepository extends IRepository<SchoolAggregate> {
  /** Find by email (case-insensitive). */
  findByEmail(email: string): Promise<SchoolAggregate | undefined>;

  /** Find by GST number (for invoicing reconciliation). */
  findByGstNumber(gstNumber: string): Promise<SchoolAggregate | undefined>;

  /** List schools by status (for platform admin). */
  listByStatus(status: string, page: number, pageSize: number): Promise<{
    items: SchoolAggregate[];
    total: number;
  }>;
}
