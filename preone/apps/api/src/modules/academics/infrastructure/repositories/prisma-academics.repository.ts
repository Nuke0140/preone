/**
 * Prisma Academics Repositories — concrete implementations backed by Prisma.
 *
 * This file consolidates 8 repository adapters:
 *   - PrismaAcademicSessionRepository
 *   - PrismaCurriculumRepository
 *   - PrismaSectionRepository
 *   - PrismaEnrollmentRepository
 *   - PrismaObservationRepository
 *   - PrismaAssessmentRepository
 *   - PrismaReportCardRepository
 *   - PrismaPortfolioRepository
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import { AcademicSessionAggregate, type AcademicSessionProps, type AcademicSessionStatus } from '../../domain/aggregates/academic-session.aggregate';
import { AssessmentAggregate, AssessmentItem, type AssessmentProps, type AssessmentStatus, type AssessmentType, type AssessmentScoreProps } from '../../domain/aggregates/assessment.aggregate';
import { CurriculumAggregate, type CurriculumProps, type CurriculumStatus } from '../../domain/aggregates/curriculum.aggregate';
import { EnrollmentAggregate, type EnrollmentProps, type EnrollmentStatus, type EnrollmentType } from '../../domain/aggregates/enrollment.aggregate';
import { ObservationAggregate, type ObservationCategory, type ObservationProps } from '../../domain/aggregates/observation.aggregate';
import { PortfolioAggregate, PortfolioItem, type PortfolioProps } from '../../domain/aggregates/portfolio.aggregate';
import { ReportCardAggregate, type ReportCardProps, type ReportCardStatus } from '../../domain/aggregates/report-card.aggregate';
import { SectionAggregate, type SectionProps, type SectionStatus } from '../../domain/aggregates/section.aggregate';
import type {
  AcademicSessionListFilter, AcademicSessionRepository,
  AssessmentListFilter, AssessmentRepository,
  CurriculumListFilter, CurriculumRepository,
  EnrollmentListFilter, EnrollmentRepository,
  ObservationListFilter, ObservationRepository,
  PortfolioRepository, ReportCardListFilter, ReportCardRepository,
  SectionListFilter, SectionRepository,
} from '../../domain/repositories/academics.repository';

// ─────────────────────────────────────────────
// AcademicSession
// ─────────────────────────────────────────────

@Injectable()
export class PrismaAcademicSessionRepository implements AcademicSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.academicSession.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByCode(tenantId: string, code: string) {
    const row = await this.prisma.academicSession.findUnique({
      where: { schoolId_code: { schoolId: tenantId, code } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findCurrent(tenantId: string) {
    const row = await this.prisma.academicSession.findFirst({
      where: { schoolId: tenantId, isCurrent: true, deletedAt: null },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: AcademicSessionListFilter, page: number, pageSize: number) {
    const where: Prisma.AcademicSessionWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.academicSession.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.academicSession.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<AcademicSessionAggregate[]> {
    const rows = await this.prisma.academicSession.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.academicSession.count({ where: { id } });
    return c > 0;
  }

  async save(a: AcademicSessionAggregate) {
    const data: Prisma.AcademicSessionUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId, name: a.name, code: a.code,
      startDate: new Date(a.startDate), endDate: new Date(a.endDate),
      status: a.status, isCurrent: a.isCurrent,
      activatedAt: a.activatedAt ? new Date(a.activatedAt) : null,
      completedAt: a.completedAt ? new Date(a.completedAt) : null,
      metadata: (a as any)._props.metadata ?? Prisma.JsonNull,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.academicSession.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: AcademicSessionAggregate) {
    await this.prisma.academicSession.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.AcademicSessionGetPayload<{}>): AcademicSessionAggregate {
    const props: AcademicSessionProps = {
      tenantId: row.schoolId, name: row.name, code: row.code,
      startDate: row.startDate.toISOString(), endDate: row.endDate.toISOString(),
      status: row.status as AcademicSessionStatus, isCurrent: row.isCurrent,
      activatedAt: row.activatedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      metadata: row.metadata as Record<string, unknown> | undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new AcademicSessionAggregate(props, row.id, row.version);
  }
}

// ─────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────

@Injectable()
export class PrismaCurriculumRepository implements CurriculumRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.curriculum.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: CurriculumListFilter, page: number, pageSize: number) {
    const where: Prisma.CurriculumWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.sessionId ? { sessionId: filter.sessionId } : {}),
      ...(filter.gradeLevel ? { gradeLevel: filter.gradeLevel } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.curriculum.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.curriculum.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<CurriculumAggregate[]> {
    const rows = await this.prisma.curriculum.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.curriculum.count({ where: { id } });
    return c > 0;
  }

  async save(a: CurriculumAggregate) {
    const data: Prisma.CurriculumUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId, branchId: a.branchId,
      sessionId: a.sessionId, classroomId: a.classroomId,
      name: a.name, description: a.description ?? null,
      status: a.status, gradeLevel: a.gradeLevel,
      objectives: (a as any)._props.objectives ?? Prisma.JsonNull,
      pedagogy: (a as any)._props.pedagogy ?? null,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      publishedBy: a.publishedBy ?? null,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.curriculum.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: CurriculumAggregate) {
    await this.prisma.curriculum.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.CurriculumGetPayload<{}>): CurriculumAggregate {
    const props: CurriculumProps = {
      tenantId: row.schoolId, branchId: row.branchId,
      sessionId: row.sessionId, classroomId: row.classroomId,
      name: row.name, description: row.description ?? undefined,
      status: row.status as CurriculumStatus, gradeLevel: row.gradeLevel,
      objectives: row.objectives as any,
      pedagogy: row.pedagogy ?? undefined,
      publishedAt: row.publishedAt?.toISOString(),
      publishedBy: row.publishedBy ?? undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new CurriculumAggregate(props, row.id, row.version);
  }
}

// ─────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────

@Injectable()
export class PrismaSectionRepository implements SectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.section.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByCode(tenantId: string, branchId: string, sessionId: string, code: string) {
    const row = await this.prisma.section.findFirst({
      where: { schoolId: tenantId, branchId, sessionId, code, deletedAt: null },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: SectionListFilter, page: number, pageSize: number) {
    const where: Prisma.SectionWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.sessionId ? { sessionId: filter.sessionId } : {}),
      ...(filter.gradeLevel ? { gradeLevel: filter.gradeLevel } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.section.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.section.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<SectionAggregate[]> {
    const rows = await this.prisma.section.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.section.count({ where: { id } });
    return c > 0;
  }

  async save(a: SectionAggregate) {
    const data: Prisma.SectionUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId, branchId: a.branchId,
      sessionId: a.sessionId, classroomId: a.classroomId,
      curriculumId: a.curriculumId ?? null,
      name: a.name, code: a.code, gradeLevel: a.gradeLevel,
      capacity: a.capacity, enrolledCount: a.enrolledCount,
      minAgeMonths: a.minAgeMonths, maxAgeMonths: a.maxAgeMonths,
      status: a.status,
      startDate: a.startDate ? new Date(a.startDate) : null,
      endDate: a.endDate ? new Date(a.endDate) : null,
      activatedAt: a.activatedAt ? new Date(a.activatedAt) : null,
      closedAt: a.closedAt ? new Date(a.closedAt) : null,
      roomNumber: a.roomNumber ?? null,
      metadata: (a as any)._props.metadata ?? Prisma.JsonNull,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.section.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: SectionAggregate) {
    await this.prisma.section.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.SectionGetPayload<{}>): SectionAggregate {
    const props: SectionProps = {
      tenantId: row.schoolId, branchId: row.branchId,
      sessionId: row.sessionId, classroomId: row.classroomId,
      curriculumId: row.curriculumId ?? undefined,
      name: row.name, code: row.code, gradeLevel: row.gradeLevel,
      capacity: row.capacity, enrolledCount: row.enrolledCount,
      minAgeMonths: row.minAgeMonths, maxAgeMonths: row.maxAgeMonths,
      status: row.status as SectionStatus,
      startDate: row.startDate?.toISOString(),
      endDate: row.endDate?.toISOString(),
      activatedAt: row.activatedAt?.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      roomNumber: row.roomNumber ?? undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new SectionAggregate(props, row.id, row.version);
  }
}

// ─────────────────────────────────────────────
// Enrollment
// ─────────────────────────────────────────────

@Injectable()
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.enrollment.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByStudentAndSession(studentId: string, sessionId: string) {
    const row = await this.prisma.enrollment.findUnique({
      where: { studentId_sessionId: { studentId, sessionId } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByEnrollmentNumber(tenantId: string, enrollmentNumber: string) {
    const row = await this.prisma.enrollment.findUnique({ where: { enrollmentNumber } });
    return row && row.schoolId === tenantId ? this.toDomain(row) : undefined;
  }

  async list(filter: EnrollmentListFilter, page: number, pageSize: number) {
    const where: Prisma.EnrollmentWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
      ...(filter.sessionId ? { sessionId: filter.sessionId } : {}),
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<EnrollmentAggregate[]> {
    const rows = await this.prisma.enrollment.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.enrollment.count({ where: { id } });
    return c > 0;
  }

  async save(a: EnrollmentAggregate) {
    const data: Prisma.EnrollmentUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId, studentId: a.studentId,
      sessionId: a.sessionId, sectionId: a.sectionId,
      enrollmentNumber: a.enrollmentNumber, type: a.type, status: a.status,
      enrolledAt: new Date(a.enrolledAt),
      startDate: new Date(a.startDate),
      endDate: a.endDate ? new Date(a.endDate) : null,
      exitedAt: a.exitedAt ? new Date(a.exitedAt) : null,
      exitReason: a.exitReason ?? null,
      previousSectionId: a.previousSectionId ?? null,
      nextSectionId: a.nextSectionId ?? null,
      metadata: (a as any)._props.metadata ?? Prisma.JsonNull,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.enrollment.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: EnrollmentAggregate) {
    await this.prisma.enrollment.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.EnrollmentGetPayload<{}>): EnrollmentAggregate {
    const props: EnrollmentProps = {
      tenantId: row.schoolId, studentId: row.studentId,
      sessionId: row.sessionId, sectionId: row.sectionId,
      enrollmentNumber: row.enrollmentNumber,
      type: row.type as EnrollmentType, status: row.status as EnrollmentStatus,
      enrolledAt: row.enrolledAt.toISOString(),
      startDate: row.startDate.toISOString(),
      endDate: row.endDate?.toISOString(),
      exitedAt: row.exitedAt?.toISOString(),
      exitReason: row.exitReason ?? undefined,
      previousSectionId: row.previousSectionId ?? undefined,
      nextSectionId: row.nextSectionId ?? undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new EnrollmentAggregate(props, row.id, row.version);
  }
}

// ─────────────────────────────────────────────
// Observation
// ─────────────────────────────────────────────

@Injectable()
export class PrismaObservationRepository implements ObservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.observation.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: ObservationListFilter, page: number, pageSize: number) {
    const where: Prisma.ObservationWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.enrollmentId ? { enrollmentId: filter.enrollmentId } : {}),
      ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
      ...(filter.category ? { category: filter.category } : {}),
      ...(filter.observedBy ? { observedBy: filter.observedBy } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.observation.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { observedAt: 'desc' },
      }),
      this.prisma.observation.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<ObservationAggregate[]> {
    const rows = await this.prisma.observation.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.observation.count({ where: { id } });
    return c > 0;
  }

  async save(a: ObservationAggregate) {
    const data: Prisma.ObservationUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId,
      enrollmentId: a.enrollmentId, sectionId: a.sectionId,
      observedAt: new Date(a.observedAt),
      category: a.category, title: a.title ?? null,
      description: a.description,
      evidenceUrls: (a as any)._props.evidenceUrls ?? Prisma.JsonNull,
      rating: a.rating ?? null,
      isPrivate: a.isPrivate, isSharedWithParent: a.isSharedWithParent,
      sharedAt: a.sharedAt ? new Date(a.sharedAt) : null,
      observedBy: a.observedBy,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.observation.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: ObservationAggregate) {
    await this.prisma.observation.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.ObservationGetPayload<{}>): ObservationAggregate {
    const props: ObservationProps = {
      tenantId: row.schoolId, enrollmentId: row.enrollmentId, sectionId: row.sectionId,
      observedAt: row.observedAt.toISOString(),
      category: row.category as ObservationCategory,
      title: row.title ?? undefined, description: row.description,
      evidenceUrls: row.evidenceUrls as any,
      rating: row.rating ?? undefined,
      isPrivate: row.isPrivate, isSharedWithParent: row.isSharedWithParent,
      sharedAt: row.sharedAt?.toISOString(),
      observedBy: row.observedBy,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new ObservationAggregate(props, row.id);
  }
}

// ─────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.assessment.findUnique({
      where: { id }, include: { items: true, scores: true },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: AssessmentListFilter, page: number, pageSize: number) {
    const where: Prisma.AssessmentWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
      ...(filter.termId ? { termId: filter.termId } : {}),
      ...(filter.status ? { status: filter.status as any } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assessment.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r, [], [])), total };
  }

  async findByIds(ids: readonly string[]): Promise<AssessmentAggregate[]> {
    const rows = await this.prisma.assessment.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.assessment.count({ where: { id } });
    return c > 0;
  }

  async save(a: AssessmentAggregate) {
    const data: Prisma.AssessmentUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId, sectionId: a.sectionId,
      termId: a.termId ?? null, name: a.name, type: a.type, status: a.status,
      description: a.description ?? null, totalMarks: a.totalMarks ?? null,
      passingMarks: a.passingMarks ?? null, weightPercent: a.weightPercent,
      scheduledAt: a.scheduledAt ? new Date(a.scheduledAt) : null,
      startedAt: a.startedAt ? new Date(a.startedAt) : null,
      completedAt: a.completedAt ? new Date(a.completedAt) : null,
      createdBy: a.createdBy,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.assessment.upsert({ where: { id: a.id }, create: data, update: data });

    // Sync items (replace strategy)
    await this.prisma.assessmentItem.deleteMany({ where: { assessmentId: a.id } });
    if (a.items.length > 0) {
      await this.prisma.assessmentItem.createMany({
        data: a.items.map((item) => ({
          id: item.id, assessmentId: a.id, subjectId: (item as any)._props.subjectId ?? null,
          description: item.description, maxMarks: item.maxMarks,
          weightPercent: item.weightPercent, sortOrder: item.sortOrder,
          rubric: (item as any)._props.rubric ?? Prisma.JsonNull,
          learningOutcomeId: (item as any)._props.learningOutcomeId ?? null,
        })),
      });
    }

    // Sync scores (replace strategy)
    await this.prisma.assessmentScore.deleteMany({ where: { assessmentId: a.id } });
    const scores = a.scores;
    if (scores.length > 0) {
      await this.prisma.assessmentScore.createMany({
        data: scores.map((s) => ({
          id: `${s.itemId}-${s.enrollmentId}`,
          assessmentId: a.id, itemId: s.itemId, enrollmentId: s.enrollmentId,
          marks: s.marks ?? null, grade: null,
          isAbsent: s.isAbsent, isExcused: s.isExcused,
          remarks: s.remarks ?? null, scoredBy: s.scoredBy,
        })),
      });
    }
  }

  async delete(a: AssessmentAggregate) {
    await this.prisma.assessment.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(
    row: Prisma.AssessmentGetPayload<{}>,
    items: Prisma.AssessmentItemGetPayload<{}>[] = [],
    scores: Prisma.AssessmentScoreGetPayload<{}>[] = [],
  ): AssessmentAggregate {
    const props: AssessmentProps = {
      tenantId: row.schoolId, sectionId: row.sectionId, termId: row.termId ?? undefined,
      name: row.name, type: row.type as AssessmentType, status: row.status as AssessmentStatus,
      description: row.description ?? undefined,
      totalMarks: row.totalMarks ?? undefined,
      passingMarks: row.passingMarks ?? undefined,
      weightPercent: row.weightPercent,
      scheduledAt: row.scheduledAt?.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      items: items.map((i) => new AssessmentItem({
        id: i.id, description: i.description, maxMarks: i.maxMarks,
        weightPercent: i.weightPercent, sortOrder: i.sortOrder,
        rubric: i.rubric as any,
        subjectId: i.subjectId ?? undefined,
        learningOutcomeId: i.learningOutcomeId ?? undefined,
      }, i.id)),
      scores: new Map(scores.map((s): [string, AssessmentScoreProps] => [
        `${s.itemId}:${s.enrollmentId}`,
        {
          itemId: s.itemId, enrollmentId: s.enrollmentId,
          marks: s.marks ?? undefined, grade: s.grade ?? undefined,
          isAbsent: s.isAbsent, isExcused: s.isExcused,
          remarks: s.remarks ?? undefined,
          scoredBy: s.scoredBy, scoredAt: s.scoredAt.toISOString(),
        },
      ])),
      createdBy: row.createdBy,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new AssessmentAggregate(props, row.id);
  }
}

// ─────────────────────────────────────────────
// ReportCard
// ─────────────────────────────────────────────

@Injectable()
export class PrismaReportCardRepository implements ReportCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.reportCard.findUnique({ where: { id } });
    return row ? this.toDomain(row) : undefined;
  }

  async findByEnrollmentAndTerm(enrollmentId: string, termId: string) {
    const row = await this.prisma.reportCard.findUnique({
      where: { enrollmentId_termId: { enrollmentId, termId } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async list(filter: ReportCardListFilter, page: number, pageSize: number) {
    const where: Prisma.ReportCardWhereInput = {
      schoolId: filter.tenantId, deletedAt: null,
      ...(filter.sectionId ? { sectionId: filter.sectionId } : {}),
      ...(filter.termId ? { termId: filter.termId } : {}),
      ...(filter.enrollmentId ? { enrollmentId: filter.enrollmentId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.reportCard.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reportCard.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async findByIds(ids: readonly string[]): Promise<ReportCardAggregate[]> {
    const rows = await this.prisma.reportCard.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.reportCard.count({ where: { id } });
    return c > 0;
  }

  async save(a: ReportCardAggregate) {
    const data: Prisma.ReportCardUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId,
      enrollmentId: a.enrollmentId, sectionId: a.sectionId,
      termId: a.termId, templateId: a.templateId,
      status: a.status, content: a.content as any,
      overallGrade: a.overallGrade ?? null,
      attendanceSummary: a.attendanceSummary as any ?? Prisma.JsonNull,
      teacherComment: a.teacherComment ?? null,
      principalComment: a.principalComment ?? null,
      generatedAt: a.generatedAt ? new Date(a.generatedAt) : null,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
      sharedAt: a.sharedAt ? new Date(a.sharedAt) : null,
      generatedBy: a.generatedBy ?? null,
      publishedBy: a.publishedBy ?? null,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.reportCard.upsert({ where: { id: a.id }, create: data, update: data });
  }

  async delete(a: ReportCardAggregate) {
    await this.prisma.reportCard.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.ReportCardGetPayload<{}>): ReportCardAggregate {
    const props: ReportCardProps = {
      tenantId: row.schoolId, enrollmentId: row.enrollmentId,
      sectionId: row.sectionId, termId: row.termId, templateId: row.templateId,
      status: row.status as ReportCardStatus,
      content: row.content as any,
      overallGrade: row.overallGrade ?? undefined,
      attendanceSummary: row.attendanceSummary as any,
      teacherComment: row.teacherComment ?? undefined,
      principalComment: row.principalComment ?? undefined,
      generatedAt: row.generatedAt?.toISOString(),
      publishedAt: row.publishedAt?.toISOString(),
      sharedAt: row.sharedAt?.toISOString(),
      generatedBy: row.generatedBy ?? undefined,
      publishedBy: row.publishedBy ?? undefined,
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new ReportCardAggregate(props, row.id, row.version);
  }
}

// ─────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────

@Injectable()
export class PrismaPortfolioRepository implements PortfolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const row = await this.prisma.portfolio.findUnique({
      where: { id }, include: { items: { where: { deletedAt: null } } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByEnrollment(enrollmentId: string) {
    const row = await this.prisma.portfolio.findUnique({
      where: { enrollmentId }, include: { items: { where: { deletedAt: null } } },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async listBySection(sectionId: string) {
    const rows = await this.prisma.portfolio.findMany({
      where: { sectionId, deletedAt: null },
      include: { items: { where: { deletedAt: null } } },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByIds(ids: readonly string[]): Promise<PortfolioAggregate[]> {
    const rows = await this.prisma.portfolio.findMany({ where: { id: { in: [...ids] } } });
    return rows.map((r) => this.toDomain(r as any));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.portfolio.count({ where: { id } });
    return c > 0;
  }

  async save(a: PortfolioAggregate) {
    const data: Prisma.PortfolioUncheckedCreateInput = {
      id: a.id, schoolId: a.tenantId,
      enrollmentId: a.enrollmentId, sectionId: a.sectionId,
      title: a.title, description: a.description ?? null,
      coverImageUrl: a.coverImageUrl ?? null,
      itemCount: a.itemCount, isSharedWithParent: a.isSharedWithParent,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
    await this.prisma.portfolio.upsert({ where: { id: a.id }, create: data, update: data });

    // Sync items (replace strategy — soft delete removed items)
    const existingItems = await this.prisma.portfolioItem.findMany({ where: { portfolioId: a.id } });
    const currentIds = new Set(a.items.map((i) => i.id));
    // Soft-delete items that are no longer in the aggregate
    for (const existing of existingItems) {
      if (!currentIds.has(existing.id) && !existing.deletedAt) {
        await this.prisma.portfolioItem.update({
          where: { id: existing.id }, data: { deletedAt: new Date() },
        });
      }
    }
    // Upsert current items
    for (const item of a.items) {
      const itemData: Prisma.PortfolioItemUncheckedCreateInput = {
        id: item.id, portfolioId: a.id, enrollmentId: a.enrollmentId,
        type: item.type, title: item.title, description: item.description ?? null,
        s3ObjectKey: item.s3ObjectKey ?? null, thumbnailUrl: item.thumbnailUrl ?? null,
        capturedAt: new Date(item.capturedAt), capturedBy: item.capturedBy,
        tags: item.tags, milestoneIds: item.milestoneIds,
        isHighlight: item.isHighlight, isSharedWithParent: item.isSharedWithParent,
        sortOrder: item.sortOrder,
        deletedAt: null,
      };
      await this.prisma.portfolioItem.upsert({ where: { id: item.id }, create: itemData, update: itemData });
    }
  }

  async delete(a: PortfolioAggregate) {
    await this.prisma.portfolio.update({ where: { id: a.id }, data: { deletedAt: new Date() } });
  }

  private toDomain(row: Prisma.PortfolioGetPayload<{ include: { items: true } }>): PortfolioAggregate {
    const props: PortfolioProps = {
      tenantId: row.schoolId, enrollmentId: row.enrollmentId, sectionId: row.sectionId,
      title: row.title, description: row.description ?? undefined,
      coverImageUrl: row.coverImageUrl ?? undefined,
      itemCount: row.itemCount, isSharedWithParent: row.isSharedWithParent,
      items: row.items.map((i) => new PortfolioItem({
        id: i.id, type: i.type as any, title: i.title,
        description: i.description ?? undefined,
        s3ObjectKey: i.s3ObjectKey ?? undefined,
        thumbnailUrl: i.thumbnailUrl ?? undefined,
        capturedAt: i.capturedAt.toISOString(), capturedBy: i.capturedBy,
        tags: i.tags, milestoneIds: i.milestoneIds,
        isHighlight: i.isHighlight, isSharedWithParent: i.isSharedWithParent,
        sortOrder: i.sortOrder,
        deletedAt: i.deletedAt?.toISOString(),
      }, i.id)),
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new PortfolioAggregate(props, row.id);
  }
}
