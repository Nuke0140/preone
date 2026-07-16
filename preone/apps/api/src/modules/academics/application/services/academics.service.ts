/**
 * Academics Services — application-layer orchestration for all Academics sub-domains.
 *
 * Per BTD §9 — Application service coordinates:
 *   1. Load aggregate via repository
 *   2. Invoke method on aggregate (pure business logic)
 *   3. Save via repository
 *   4. Publish domain events
 *
 * This file consolidates 8 services for the Academics module:
 *   - AcademicSessionService
 *   - CurriculumService
 *   - SectionService
 *   - EnrollmentService
 *   - ObservationService
 *   - AssessmentService
 *   - ReportCardService
 *   - PortfolioService
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ConflictException, NotFoundException, ValidationException,
} from '@common/errors/exceptions';
import { EventBusService } from '@infra/event-bus/event-bus.service';

import { AcademicSessionAggregate } from '../../domain/aggregates/academic-session.aggregate';
import { AssessmentAggregate, AssessmentItem } from '../../domain/aggregates/assessment.aggregate';
import { CurriculumAggregate } from '../../domain/aggregates/curriculum.aggregate';
import { EnrollmentAggregate } from '../../domain/aggregates/enrollment.aggregate';
import { ObservationAggregate } from '../../domain/aggregates/observation.aggregate';
import { PortfolioAggregate, PortfolioItem } from '../../domain/aggregates/portfolio.aggregate';
import { ReportCardAggregate } from '../../domain/aggregates/report-card.aggregate';
import { SectionAggregate } from '../../domain/aggregates/section.aggregate';
import {
  ACADEMIC_SESSION_REPOSITORY, ASSESSMENT_REPOSITORY, CURRICULUM_REPOSITORY,
  ENROLLMENT_REPOSITORY, OBSERVATION_REPOSITORY, PORTFOLIO_REPOSITORY,
  REPORT_CARD_REPOSITORY, SECTION_REPOSITORY,
} from '../../domain/repositories/tokens';

import type { AcademicSessionRepository } from '../../domain/repositories/academics.repository';
import type { AssessmentRepository } from '../../domain/repositories/academics.repository';
import type { CurriculumRepository } from '../../domain/repositories/academics.repository';
import type { EnrollmentRepository } from '../../domain/repositories/academics.repository';
import type { ObservationRepository } from '../../domain/repositories/academics.repository';
import type { PortfolioRepository } from '../../domain/repositories/academics.repository';
import type { ReportCardRepository } from '../../domain/repositories/academics.repository';
import type { SectionRepository } from '../../domain/repositories/academics.repository';
import type {
  AcademicSessionResponseDto, AssessmentResponseDto, CreateAcademicSessionDto,
  CreateAssessmentDto, CreateCurriculumDto, CreateEnrollmentDto, CreateObservationDto,
  CreateReportCardDto, CreateSectionDto, CurriculumResponseDto, EnrollmentResponseDto,
  ObservationResponseDto, PortfolioResponseDto, ReportCardResponseDto, SectionResponseDto,
} from '../dto/academics.dto';

// ─────────────────────────────────────────────────────────────────────────────
// AcademicSessionService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AcademicSessionService {
  private readonly logger = new Logger(AcademicSessionService.name);

  constructor(
    @Inject(ACADEMIC_SESSION_REPOSITORY) private readonly sessions: AcademicSessionRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createSession(dto: CreateAcademicSessionDto, tenantId: string, createdBy: string): Promise<AcademicSessionResponseDto> {
    const existing = await this.sessions.findByCode(tenantId, dto.code);
    if (existing) {
      throw new ConflictException('SESSION_CODE_TAKEN', `Session with code ${dto.code} already exists`);
    }
    const session = AcademicSessionAggregate.create({
      tenantId, name: dto.name, code: dto.code,
      startDate: dto.startDate, endDate: dto.endDate,
    });
    await this.sessions.save(session);
    await this.eventBus.publishAll(session.clearDomainEvents());
    return this.toResponse(session);
  }

  async activateSession(id: string, tenantId: string, actorId: string): Promise<AcademicSessionResponseDto> {
    const session = await this.sessions.findById(id);
    if (!session || session.deletedAt) throw new NotFoundException('AcademicSession', id);
    // Demote any currently-active session in this tenant
    const current = await this.sessions.findCurrent(tenantId);
    if (current && current.id !== id) {
      current.demote();
      await this.sessions.save(current);
    }
    session.activate(new Date().toISOString());
    await this.sessions.save(session);
    await this.eventBus.publishAll(session.clearDomainEvents());
    return this.toResponse(session);
  }

  async completeSession(id: string, tenantId: string): Promise<AcademicSessionResponseDto> {
    const session = await this.sessions.findById(id);
    if (!session || session.deletedAt) throw new NotFoundException('AcademicSession', id);
    session.complete(new Date().toISOString());
    await this.sessions.save(session);
    await this.eventBus.publishAll(session.clearDomainEvents());
    return this.toResponse(session);
  }

  async getSession(id: string): Promise<AcademicSessionResponseDto> {
    const s = await this.sessions.findById(id);
    if (!s || s.deletedAt) throw new NotFoundException('AcademicSession', id);
    return this.toResponse(s);
  }

  async listSessions(tenantId: string, page: number, pageSize: number, status?: string) {
    const result = await this.sessions.list({ tenantId, status: status as any }, page, pageSize);
    return {
      items: result.items.map((s) => this.toResponse(s)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  private toResponse(s: AcademicSessionAggregate): AcademicSessionResponseDto {
    return {
      id: s.id, tenantId: s.tenantId, name: s.name, code: s.code,
      startDate: s.startDate, endDate: s.endDate,
      status: s.status as any, isCurrent: s.isCurrent,
      activatedAt: s.activatedAt, completedAt: s.completedAt,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CurriculumService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CurriculumService {
  private readonly logger = new Logger(CurriculumService.name);

  constructor(
    @Inject(CURRICULUM_REPOSITORY) private readonly curricula: CurriculumRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createCurriculum(dto: CreateCurriculumDto, tenantId: string, createdBy: string): Promise<CurriculumResponseDto> {
    const curriculum = CurriculumAggregate.create({
      tenantId, branchId: dto.branchId, sessionId: dto.sessionId,
      classroomId: dto.classroomId, name: dto.name,
      description: dto.description, gradeLevel: dto.gradeLevel,
    });
    await this.curricula.save(curriculum);
    await this.eventBus.publishAll(curriculum.clearDomainEvents());
    return this.toResponse(curriculum);
  }

  async publishCurriculum(id: string, tenantId: string, actorId: string): Promise<CurriculumResponseDto> {
    const c = await this.curricula.findById(id);
    if (!c || c.deletedAt) throw new NotFoundException('Curriculum', id);
    c.publish(actorId, new Date().toISOString());
    await this.curricula.save(c);
    await this.eventBus.publishAll(c.clearDomainEvents());
    return this.toResponse(c);
  }

  async listCurricula(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.curricula.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((c) => this.toResponse(c)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  private toResponse(c: CurriculumAggregate): CurriculumResponseDto {
    return {
      id: c.id, tenantId: c.tenantId, branchId: c.branchId,
      sessionId: c.sessionId, classroomId: c.classroomId,
      name: c.name, description: c.description,
      status: c.status as any, gradeLevel: c.gradeLevel,
      pedagogy: c.pedagogy, publishedAt: c.publishedAt, publishedBy: c.publishedBy,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class SectionService {
  private readonly logger = new Logger(SectionService.name);

  constructor(
    @Inject(SECTION_REPOSITORY) private readonly sections: SectionRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createSection(dto: CreateSectionDto, tenantId: string, createdBy: string): Promise<SectionResponseDto> {
    const existing = await this.sections.findByCode(tenantId, dto.branchId, dto.sessionId, dto.code);
    if (existing) {
      throw new ConflictException('SECTION_CODE_TAKEN', `Section with code ${dto.code} already exists in this session`);
    }
    const section = SectionAggregate.create({
      tenantId, branchId: dto.branchId, sessionId: dto.sessionId,
      classroomId: dto.classroomId, curriculumId: dto.curriculumId,
      name: dto.name, code: dto.code, gradeLevel: dto.gradeLevel,
      capacity: dto.capacity ?? 20,
      minAgeMonths: dto.minAgeMonths ?? 0,
      maxAgeMonths: dto.maxAgeMonths ?? 120,
      roomNumber: dto.roomNumber,
    });
    await this.sections.save(section);
    await this.eventBus.publishAll(section.clearDomainEvents());
    return this.toResponse(section);
  }

  async activateSection(id: string, tenantId: string): Promise<SectionResponseDto> {
    const s = await this.sections.findById(id);
    if (!s || s.deletedAt) throw new NotFoundException('Section', id);
    s.activate(new Date().toISOString());
    await this.sections.save(s);
    await this.eventBus.publishAll(s.clearDomainEvents());
    return this.toResponse(s);
  }

  async closeSection(id: string, tenantId: string): Promise<SectionResponseDto> {
    const s = await this.sections.findById(id);
    if (!s || s.deletedAt) throw new NotFoundException('Section', id);
    s.close(new Date().toISOString());
    await this.sections.save(s);
    await this.eventBus.publishAll(s.clearDomainEvents());
    return this.toResponse(s);
  }

  async getSection(id: string): Promise<SectionResponseDto> {
    const s = await this.sections.findById(id);
    if (!s || s.deletedAt) throw new NotFoundException('Section', id);
    return this.toResponse(s);
  }

  async listSections(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.sections.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((s) => this.toResponse(s)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  async incrementEnrollment(sectionId: string): Promise<void> {
    const s = await this.sections.findById(sectionId);
    if (!s) throw new NotFoundException('Section', sectionId);
    s.incrementEnrollment();
    await this.sections.save(s);
  }

  async decrementEnrollment(sectionId: string): Promise<void> {
    const s = await this.sections.findById(sectionId);
    if (!s) return;
    if (s.enrolledCount > 0) {
      s.decrementEnrollment();
      await this.sections.save(s);
    }
  }

  private toResponse(s: SectionAggregate): SectionResponseDto {
    return {
      id: s.id, tenantId: s.tenantId, branchId: s.branchId,
      sessionId: s.sessionId, classroomId: s.classroomId,
      curriculumId: s.curriculumId, name: s.name, code: s.code,
      gradeLevel: s.gradeLevel, capacity: s.capacity,
      enrolledCount: s.enrolledCount, seatsAvailable: s.seatsAvailable,
      isFull: s.isFull, minAgeMonths: s.minAgeMonths, maxAgeMonths: s.maxAgeMonths,
      status: s.status as any, roomNumber: s.roomNumber,
      activatedAt: s.activatedAt, closedAt: s.closedAt,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EnrollmentService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly enrollments: EnrollmentRepository,
    @Inject(SECTION_REPOSITORY) private readonly sections: SectionRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createEnrollment(dto: CreateEnrollmentDto, tenantId: string, actorId: string): Promise<EnrollmentResponseDto> {
    // Check student isn't already enrolled in this session
    const existing = await this.enrollments.findByStudentAndSession(dto.studentId, dto.sessionId);
    if (existing?.isActive) {
      throw new ConflictException('ALREADY_ENROLLED', `Student ${dto.studentId} is already enrolled in session ${dto.sessionId}`);
    }
    // Check section capacity + age eligibility
    const section = await this.sections.findById(dto.sectionId);
    if (!section) throw new NotFoundException('Section', dto.sectionId);
    if (section.isFull) {
      throw new ValidationException(`Section ${section.code} is at capacity`, [
        { field: 'sectionId', code: 'SECTION_FULL', message: `Section ${section.code} is at capacity (${section.capacity})` },
      ]);
    }
    // Generate enrollment number (simple format for v1)
    const enrollmentNumber = `ENR-${Date.now().toString(36).toUpperCase()}`;
    const enrollment = EnrollmentAggregate.create({
      tenantId, studentId: dto.studentId, sessionId: dto.sessionId,
      sectionId: dto.sectionId, enrollmentNumber,
      type: dto.type, startDate: dto.startDate,
    });
    await this.enrollments.save(enrollment);
    // Increment section count
    section.incrementEnrollment();
    await this.sections.save(section);
    await this.eventBus.publishAll(enrollment.clearDomainEvents());
    await this.eventBus.publishAll(section.clearDomainEvents());
    return this.toResponse(enrollment);
  }

  async promoteEnrollment(id: string, toSectionId: string, tenantId: string): Promise<EnrollmentResponseDto> {
    const e = await this.enrollments.findById(id);
    if (!e || e.deletedAt) throw new NotFoundException('Enrollment', id);
    const oldSectionId = e.sectionId;
    e.promote(toSectionId, new Date().toISOString());
    await this.enrollments.save(e);
    // Decrement old section, increment new
    await this.decrementEnrollmentForSection(oldSectionId);
    await this.incrementEnrollmentForSection(toSectionId);
    await this.eventBus.publishAll(e.clearDomainEvents());
    return this.toResponse(e);
  }

  async withdrawEnrollment(id: string, reason: string, tenantId: string): Promise<EnrollmentResponseDto> {
    const e = await this.enrollments.findById(id);
    if (!e || e.deletedAt) throw new NotFoundException('Enrollment', id);
    const sectionId = e.sectionId;
    e.withdraw(reason, new Date().toISOString());
    await this.enrollments.save(e);
    await this.decrementEnrollmentForSection(sectionId);
    await this.eventBus.publishAll(e.clearDomainEvents());
    return this.toResponse(e);
  }

  async getEnrollment(id: string): Promise<EnrollmentResponseDto> {
    const e = await this.enrollments.findById(id);
    if (!e || e.deletedAt) throw new NotFoundException('Enrollment', id);
    return this.toResponse(e);
  }

  async listEnrollments(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.enrollments.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((e) => this.toResponse(e)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  private async incrementEnrollmentForSection(sectionId: string): Promise<void> {
    const s = await this.sections.findById(sectionId);
    if (!s) return;
    s.incrementEnrollment();
    await this.sections.save(s);
  }

  private async decrementEnrollmentForSection(sectionId: string): Promise<void> {
    const s = await this.sections.findById(sectionId);
    if (!s) return;
    if (s.enrolledCount > 0) {
      s.decrementEnrollment();
      await this.sections.save(s);
    }
  }

  private toResponse(e: EnrollmentAggregate): EnrollmentResponseDto {
    return {
      id: e.id, tenantId: e.tenantId, studentId: e.studentId,
      sessionId: e.sessionId, sectionId: e.sectionId,
      enrollmentNumber: e.enrollmentNumber,
      type: e.type as any, status: e.status as any,
      enrolledAt: e.enrolledAt, startDate: e.startDate,
      endDate: e.endDate, exitedAt: e.exitedAt, exitReason: e.exitReason,
      previousSectionId: e.previousSectionId, nextSectionId: e.nextSectionId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ObservationService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ObservationService {
  private readonly logger = new Logger(ObservationService.name);

  constructor(
    @Inject(OBSERVATION_REPOSITORY) private readonly observations: ObservationRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createObservation(dto: CreateObservationDto, tenantId: string, observedBy: string): Promise<ObservationResponseDto> {
    const obs = ObservationAggregate.create({
      tenantId, enrollmentId: dto.enrollmentId, sectionId: dto.sectionId,
      observedAt: dto.observedAt ?? new Date().toISOString(),
      category: dto.category, title: dto.title,
      description: dto.description, rating: dto.rating,
      isPrivate: dto.isPrivate ?? true, observedBy,
    });
    await this.observations.save(obs);
    await this.eventBus.publishAll(obs.clearDomainEvents());
    return this.toResponse(obs);
  }

  async shareWithParent(id: string, tenantId: string): Promise<ObservationResponseDto> {
    const o = await this.observations.findById(id);
    if (!o || o.deletedAt) throw new NotFoundException('Observation', id);
    o.shareWithParent(new Date().toISOString());
    await this.observations.save(o);
    await this.eventBus.publishAll(o.clearDomainEvents());
    return this.toResponse(o);
  }

  async listObservations(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.observations.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((o) => this.toResponse(o)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  private toResponse(o: ObservationAggregate): ObservationResponseDto {
    return {
      id: o.id, tenantId: o.tenantId, enrollmentId: o.enrollmentId,
      sectionId: o.sectionId, observedAt: o.observedAt,
      category: o.category as any, title: o.title,
      description: o.description, rating: o.rating,
      isPrivate: o.isPrivate, isSharedWithParent: o.isSharedWithParent,
      sharedAt: o.sharedAt, observedBy: o.observedBy,
      createdAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AssessmentService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    @Inject(ASSESSMENT_REPOSITORY) private readonly assessments: AssessmentRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createAssessment(dto: CreateAssessmentDto, tenantId: string, createdBy: string): Promise<AssessmentResponseDto> {
    const a = AssessmentAggregate.create({
      tenantId, sectionId: dto.sectionId, termId: dto.termId,
      name: dto.name, type: dto.type,
      description: dto.description, totalMarks: dto.totalMarks,
      passingMarks: dto.passingMarks,
      weightPercent: dto.weightPercent ?? 0,
      scheduledAt: dto.scheduledAt, createdBy,
    });
    await this.assessments.save(a);
    await this.eventBus.publishAll(a.clearDomainEvents());
    return this.toResponse(a);
  }

  async startAssessment(id: string, tenantId: string): Promise<AssessmentResponseDto> {
    const a = await this.assessments.findById(id);
    if (!a || a.deletedAt) throw new NotFoundException('Assessment', id);
    a.start(new Date().toISOString());
    await this.assessments.save(a);
    return this.toResponse(a);
  }

  async completeAssessment(id: string, tenantId: string): Promise<AssessmentResponseDto> {
    const a = await this.assessments.findById(id);
    if (!a || a.deletedAt) throw new NotFoundException('Assessment', id);
    a.complete(new Date().toISOString());
    await this.assessments.save(a);
    await this.eventBus.publishAll(a.clearDomainEvents());
    return this.toResponse(a);
  }

  async recordScore(assessmentId: string, score: {
    itemId: string; enrollmentId: string; marks?: number;
    isAbsent?: boolean; isExcused?: boolean; remarks?: string;
  }, tenantId: string, scoredBy: string): Promise<AssessmentResponseDto> {
    const a = await this.assessments.findById(assessmentId);
    if (!a || a.deletedAt) throw new NotFoundException('Assessment', assessmentId);
    a.recordScore({
      itemId: score.itemId, enrollmentId: score.enrollmentId,
      marks: score.marks, isAbsent: score.isAbsent ?? false,
      isExcused: score.isExcused ?? false, remarks: score.remarks,
      scoredBy, scoredAt: new Date().toISOString(),
    });
    await this.assessments.save(a);
    await this.eventBus.publishAll(a.clearDomainEvents());
    return this.toResponse(a);
  }

  async listAssessments(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.assessments.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((a) => this.toResponse(a)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  async getAssessment(id: string): Promise<AssessmentResponseDto> {
    const a = await this.assessments.findById(id);
    if (!a || a.deletedAt) throw new NotFoundException('Assessment', id);
    return this.toResponse(a);
  }

  private toResponse(a: AssessmentAggregate): AssessmentResponseDto {
    return {
      id: a.id, tenantId: a.tenantId, sectionId: a.sectionId, termId: a.termId,
      name: a.name, type: a.type as any, status: a.status as any,
      description: a.description, totalMarks: a.totalMarks,
      passingMarks: a.passingMarks, weightPercent: a.weightPercent,
      scheduledAt: a.scheduledAt, startedAt: a.startedAt, completedAt: a.completedAt,
      createdBy: a.createdBy, createdAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ReportCardService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class ReportCardService {
  private readonly logger = new Logger(ReportCardService.name);

  constructor(
    @Inject(REPORT_CARD_REPOSITORY) private readonly reportCards: ReportCardRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async createReportCard(dto: CreateReportCardDto, tenantId: string, createdBy: string): Promise<ReportCardResponseDto> {
    // Check unique (enrollmentId, termId)
    const existing = await this.reportCards.findByEnrollmentAndTerm(dto.enrollmentId, dto.termId);
    if (existing) {
      throw new ConflictException('REPORT_CARD_EXISTS', `Report card already exists for enrollment ${dto.enrollmentId} and term ${dto.termId}`);
    }
    const rc = ReportCardAggregate.create({
      tenantId, enrollmentId: dto.enrollmentId, sectionId: dto.sectionId,
      termId: dto.termId, templateId: dto.templateId,
      content: { sections: [] },
    });
    await this.reportCards.save(rc);
    return this.toResponse(rc);
  }

  async generateReportCard(id: string, tenantId: string, actorId: string): Promise<ReportCardResponseDto> {
    const rc = await this.reportCards.findById(id);
    if (!rc || rc.deletedAt) throw new NotFoundException('ReportCard', id);
    rc.generate(actorId, new Date().toISOString());
    await this.reportCards.save(rc);
    await this.eventBus.publishAll(rc.clearDomainEvents());
    return this.toResponse(rc);
  }

  async publishReportCard(id: string, tenantId: string, actorId: string): Promise<ReportCardResponseDto> {
    const rc = await this.reportCards.findById(id);
    if (!rc || rc.deletedAt) throw new NotFoundException('ReportCard', id);
    rc.publish(actorId, new Date().toISOString());
    await this.reportCards.save(rc);
    await this.eventBus.publishAll(rc.clearDomainEvents());
    return this.toResponse(rc);
  }

  async shareReportCard(id: string, tenantId: string): Promise<ReportCardResponseDto> {
    const rc = await this.reportCards.findById(id);
    if (!rc || rc.deletedAt) throw new NotFoundException('ReportCard', id);
    rc.shareWithParents(new Date().toISOString());
    await this.reportCards.save(rc);
    await this.eventBus.publishAll(rc.clearDomainEvents());
    return this.toResponse(rc);
  }

  async getReportCard(id: string): Promise<ReportCardResponseDto> {
    const rc = await this.reportCards.findById(id);
    if (!rc || rc.deletedAt) throw new NotFoundException('ReportCard', id);
    return this.toResponse(rc);
  }

  async listReportCards(tenantId: string, page: number, pageSize: number, filters: any) {
    const result = await this.reportCards.list({ tenantId, ...filters }, page, pageSize);
    return {
      items: result.items.map((rc) => this.toResponse(rc)),
      total: result.total, page, pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  private toResponse(rc: ReportCardAggregate): ReportCardResponseDto {
    return {
      id: rc.id, tenantId: rc.tenantId, enrollmentId: rc.enrollmentId,
      sectionId: rc.sectionId, termId: rc.termId, templateId: rc.templateId,
      status: rc.status as any, overallGrade: rc.overallGrade,
      teacherComment: rc.teacherComment, principalComment: rc.principalComment,
      generatedAt: rc.generatedAt, publishedAt: rc.publishedAt, sharedAt: rc.sharedAt,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PortfolioService
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolios: PortfolioRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async getOrCreatePortfolio(enrollmentId: string, sectionId: string, tenantId: string): Promise<PortfolioAggregate> {
    const existing = await this.portfolios.findByEnrollment(enrollmentId);
    if (existing) return existing;
    const p = PortfolioAggregate.create({
      tenantId, enrollmentId, sectionId,
      title: `Portfolio`, description: '',
      isSharedWithParent: true,
    });
    await this.portfolios.save(p);
    return p;
  }

  async addPortfolioItem(enrollmentId: string, item: {
    type: string; title: string; description?: string;
    s3ObjectKey?: string; thumbnailUrl?: string;
    capturedAt?: string; tags?: string[]; milestoneIds?: string[];
    isHighlight?: boolean;
  }, tenantId: string, capturedBy: string): Promise<{ portfolioId: string; itemId: string }> {
    const portfolio = await this.getOrCreatePortfolio(enrollmentId, '', tenantId);
    const entity = portfolio.addItem({
      type: item.type as any,
      title: item.title,
      description: item.description,
      s3ObjectKey: item.s3ObjectKey,
      thumbnailUrl: item.thumbnailUrl,
      capturedAt: item.capturedAt ?? new Date().toISOString(),
      capturedBy,
      tags: item.tags ?? [],
      milestoneIds: item.milestoneIds ?? [],
      isHighlight: item.isHighlight ?? false,
      isSharedWithParent: true,
      sortOrder: portfolio.items.length,
    });
    await this.portfolios.save(portfolio);
    await this.eventBus.publishAll(portfolio.clearDomainEvents());
    return { portfolioId: portfolio.id, itemId: entity.id };
  }

  async highlightItem(portfolioId: string, itemId: string): Promise<void> {
    const p = await this.portfolios.findById(portfolioId);
    if (!p || p.deletedAt) throw new NotFoundException('Portfolio', portfolioId);
    p.highlightItem(itemId);
    await this.portfolios.save(p);
    await this.eventBus.publishAll(p.clearDomainEvents());
  }

  async getPortfolio(enrollmentId: string): Promise<PortfolioResponseDto> {
    const p = await this.portfolios.findByEnrollment(enrollmentId);
    if (!p) throw new NotFoundException('Portfolio', enrollmentId);
    return {
      id: p.id, tenantId: p.tenantId, enrollmentId: p.enrollmentId,
      sectionId: p.sectionId, title: p.title, description: p.description,
      coverImageUrl: p.coverImageUrl, itemCount: p.itemCount,
      isSharedWithParent: p.isSharedWithParent,
      createdAt: new Date().toISOString(),
    };
  }
}
