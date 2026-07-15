/**
 * StudentRepository interface — port for StudentAggregate persistence.
 *
 * Per BTD §6.1 — Repository pattern:
 *   - Interface lives in domain layer (port)
 *   - Concrete implementation lives in infrastructure layer (adapter)
 *   - Mockable in unit tests
 *
 * Per BTD §17.1 — Aggregate = Transaction Boundary:
 *   - save() persists the entire aggregate (student + guardian links + denormalised fields)
 *   - Cross-aggregate transactions go through UnitOfWork + saga
 */
import type { IRepository } from '@shared/kernel/repository';

import type { StudentAggregate, StudentStatus } from '../aggregates/student.aggregate';

export interface StudentListFilter {
  tenantId: string;
  branchId?: string;
  status?: StudentStatus;
  gradeLevel?: string;
  sectionId?: string;
  search?: string;
  tagIds?: string[];
}

export interface StudentRepository extends IRepository<StudentAggregate> {
  findByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<StudentAggregate | undefined>;
  findBySectionId(sectionId: string): Promise<StudentAggregate[]>;
  findByGuardianId(guardianId: string): Promise<StudentAggregate[]>;
  list(filter: StudentListFilter, page: number, pageSize: number): Promise<{
    items: StudentAggregate[];
    total: number;
  }>;
  countActiveByBranch(branchId: string): Promise<number>;
  existsByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<boolean>;
  save(aggregate: StudentAggregate): Promise<void>;
  delete(aggregate: StudentAggregate): Promise<void>;
}
