/**
 * Academics Repository Ports — interfaces for all Academics aggregates.
 *
 * Per BTD §6.1 — Port/Adapter pattern:
 *   - Interfaces live in domain layer (ports)
 *   - Concrete implementations live in infrastructure layer (adapters)
 *   - Mockable in unit tests
 */
import type { IRepository } from '@shared/kernel/repository';

import type { AcademicSessionAggregate, AcademicSessionStatus } from '../aggregates/academic-session.aggregate';
import type { AssessmentAggregate } from '../aggregates/assessment.aggregate';
import type { CurriculumAggregate, CurriculumStatus } from '../aggregates/curriculum.aggregate';
import type { EnrollmentAggregate, EnrollmentStatus } from '../aggregates/enrollment.aggregate';
import type { ObservationAggregate, ObservationCategory } from '../aggregates/observation.aggregate';
import type { PortfolioAggregate } from '../aggregates/portfolio.aggregate';
import type { ReportCardAggregate, ReportCardStatus } from '../aggregates/report-card.aggregate';
import type { SectionAggregate, SectionStatus } from '../aggregates/section.aggregate';

// ─────────────────────────────────────────────
// AcademicSession
// ─────────────────────────────────────────────

export interface AcademicSessionListFilter {
  tenantId: string;
  status?: AcademicSessionStatus;
}

export interface AcademicSessionRepository extends IRepository<AcademicSessionAggregate> {
  findById(id: string): Promise<AcademicSessionAggregate | undefined>;
  findByCode(tenantId: string, code: string): Promise<AcademicSessionAggregate | undefined>;
  findCurrent(tenantId: string): Promise<AcademicSessionAggregate | undefined>;
  list(filter: AcademicSessionListFilter, page: number, pageSize: number): Promise<{
    items: AcademicSessionAggregate[];
    total: number;
  }>;
  save(aggregate: AcademicSessionAggregate): Promise<void>;
  delete(aggregate: AcademicSessionAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────

export interface CurriculumListFilter {
  tenantId: string;
  branchId?: string;
  sessionId?: string;
  gradeLevel?: string;
  status?: CurriculumStatus;
}

export interface CurriculumRepository extends IRepository<CurriculumAggregate> {
  findById(id: string): Promise<CurriculumAggregate | undefined>;
  list(filter: CurriculumListFilter, page: number, pageSize: number): Promise<{
    items: CurriculumAggregate[];
    total: number;
  }>;
  save(aggregate: CurriculumAggregate): Promise<void>;
  delete(aggregate: CurriculumAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────

export interface SectionListFilter {
  tenantId: string;
  branchId?: string;
  sessionId?: string;
  gradeLevel?: string;
  status?: SectionStatus;
}

export interface SectionRepository extends IRepository<SectionAggregate> {
  findById(id: string): Promise<SectionAggregate | undefined>;
  findByCode(tenantId: string, branchId: string, sessionId: string, code: string): Promise<SectionAggregate | undefined>;
  list(filter: SectionListFilter, page: number, pageSize: number): Promise<{
    items: SectionAggregate[];
    total: number;
  }>;
  save(aggregate: SectionAggregate): Promise<void>;
  delete(aggregate: SectionAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Enrollment
// ─────────────────────────────────────────────

export interface EnrollmentListFilter {
  tenantId: string;
  sectionId?: string;
  sessionId?: string;
  studentId?: string;
  status?: EnrollmentStatus;
}

export interface EnrollmentRepository extends IRepository<EnrollmentAggregate> {
  findById(id: string): Promise<EnrollmentAggregate | undefined>;
  findByStudentAndSession(studentId: string, sessionId: string): Promise<EnrollmentAggregate | undefined>;
  findByEnrollmentNumber(tenantId: string, enrollmentNumber: string): Promise<EnrollmentAggregate | undefined>;
  list(filter: EnrollmentListFilter, page: number, pageSize: number): Promise<{
    items: EnrollmentAggregate[];
    total: number;
  }>;
  save(aggregate: EnrollmentAggregate): Promise<void>;
  delete(aggregate: EnrollmentAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Observation
// ─────────────────────────────────────────────

export interface ObservationListFilter {
  tenantId: string;
  enrollmentId?: string;
  sectionId?: string;
  category?: ObservationCategory;
  observedBy?: string;
}

export interface ObservationRepository extends IRepository<ObservationAggregate> {
  findById(id: string): Promise<ObservationAggregate | undefined>;
  list(filter: ObservationListFilter, page: number, pageSize: number): Promise<{
    items: ObservationAggregate[];
    total: number;
  }>;
  save(aggregate: ObservationAggregate): Promise<void>;
  delete(aggregate: ObservationAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────

export interface AssessmentListFilter {
  tenantId: string;
  sectionId?: string;
  termId?: string;
  status?: string;
}

export interface AssessmentRepository extends IRepository<AssessmentAggregate> {
  findById(id: string): Promise<AssessmentAggregate | undefined>;
  list(filter: AssessmentListFilter, page: number, pageSize: number): Promise<{
    items: AssessmentAggregate[];
    total: number;
  }>;
  save(aggregate: AssessmentAggregate): Promise<void>;
  delete(aggregate: AssessmentAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// ReportCard
// ─────────────────────────────────────────────

export interface ReportCardListFilter {
  tenantId: string;
  sectionId?: string;
  termId?: string;
  enrollmentId?: string;
  status?: ReportCardStatus;
}

export interface ReportCardRepository extends IRepository<ReportCardAggregate> {
  findById(id: string): Promise<ReportCardAggregate | undefined>;
  findByEnrollmentAndTerm(enrollmentId: string, termId: string): Promise<ReportCardAggregate | undefined>;
  list(filter: ReportCardListFilter, page: number, pageSize: number): Promise<{
    items: ReportCardAggregate[];
    total: number;
  }>;
  save(aggregate: ReportCardAggregate): Promise<void>;
  delete(aggregate: ReportCardAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────

export interface PortfolioRepository extends IRepository<PortfolioAggregate> {
  findById(id: string): Promise<PortfolioAggregate | undefined>;
  findByEnrollment(enrollmentId: string): Promise<PortfolioAggregate | undefined>;
  listBySection(sectionId: string): Promise<PortfolioAggregate[]>;
  save(aggregate: PortfolioAggregate): Promise<void>;
  delete(aggregate: PortfolioAggregate): Promise<void>;
}
