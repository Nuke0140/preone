/**
 * Admissions Repository Ports — interfaces for all Admissions aggregates.
 *
 * Per BTD §6.1 Port/Adapter pattern.
 */
import type { IRepository } from '@shared/kernel/repository';

import type {
  AdmissionAggregate, AdmissionStatus,
} from '../aggregates/admission.aggregate';
import type {
  ApplicationAggregate, ApplicationStatus, ProgramType,
} from '../aggregates/application.aggregate';
import type { WaitingListAggregate } from '../aggregates/waiting-list.aggregate';

// ─────────────────────────────────────────────
// Application
// ─────────────────────────────────────────────

export interface ApplicationListFilter {
  tenantId: string;
  branchId?: string;
  academicSessionId?: string;
  programType?: ProgramType;
  status?: ApplicationStatus;
  search?: string; // child name or application number
}

export interface ApplicationRepository extends IRepository<ApplicationAggregate> {
  findById(id: string): Promise<ApplicationAggregate | undefined>;
  findByApplicationNumber(tenantId: string, applicationNumber: string): Promise<ApplicationAggregate | undefined>;
  list(filter: ApplicationListFilter, page: number, pageSize: number): Promise<{
    items: ApplicationAggregate[];
    total: number;
  }>;
  save(aggregate: ApplicationAggregate): Promise<void>;
  delete(aggregate: ApplicationAggregate): Promise<void>;
  countByStatus(tenantId: string, branchId: string, academicSessionId: string): Promise<Record<ApplicationStatus, number>>;
}

// ─────────────────────────────────────────────
// Admission
// ─────────────────────────────────────────────

export interface AdmissionListFilter {
  tenantId: string;
  branchId?: string;
  applicationId?: string;
  studentId?: string;
  status?: AdmissionStatus;
}

export interface AdmissionRepository extends IRepository<AdmissionAggregate> {
  findById(id: string): Promise<AdmissionAggregate | undefined>;
  findByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<AdmissionAggregate | undefined>;
  findByApplicationId(applicationId: string): Promise<AdmissionAggregate | undefined>;
  findByStudentId(studentId: string): Promise<AdmissionAggregate | undefined>;
  list(filter: AdmissionListFilter, page: number, pageSize: number): Promise<{
    items: AdmissionAggregate[];
    total: number;
  }>;
  save(aggregate: AdmissionAggregate): Promise<void>;
  delete(aggregate: AdmissionAggregate): Promise<void>;
  nextAdmissionNumber(tenantId: string, year: number): Promise<string>;
}

// ─────────────────────────────────────────────
// WaitingList
// ─────────────────────────────────────────────

export interface WaitingListListFilter {
  tenantId: string;
  branchId: string;
  programType: ProgramType;
  academicSessionId: string;
  state?: 'WAITING' | 'SEAT_OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
}

export interface WaitingListRepository extends IRepository<WaitingListAggregate> {
  findById(id: string): Promise<WaitingListAggregate | undefined>;
  findByApplicationId(applicationId: string): Promise<WaitingListAggregate | undefined>;
  list(filter: WaitingListListFilter): Promise<WaitingListAggregate[]>;
  findNextInLine(tenantId: string, branchId: string, programType: ProgramType, academicSessionId: string): Promise<WaitingListAggregate | undefined>;
  countAhead(tenantId: string, branchId: string, programType: ProgramType, academicSessionId: string, position: number): Promise<number>;
  save(aggregate: WaitingListAggregate): Promise<void>;
  saveMany(aggregates: WaitingListAggregate[]): Promise<void>;
  delete(aggregate: WaitingListAggregate): Promise<void>;
}
