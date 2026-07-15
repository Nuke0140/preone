/**
 * AcademicsModule — Curriculum, Observations, Report Cards
 *
 * Per BTD §4.3 Module Catalog #5:
 *   "academics — Curriculum, Observations, Report Cards — ~60 APIs"
 *
 * Per ERD v3.0 (Academics domain, 27 tables):
 *   - Academic sessions + terms + holidays
 *   - Curriculum templates + published curricula + units + lesson plans
 *   - Subjects + learning outcomes + grade scales + report card templates
 *   - Sections (concrete class groupings) + section-subjects + section-teachers
 *   - Enrollments (student-section-session binding)
 *   - Observations (teacher observations of student behaviour/learning)
 *   - Assessments + assessment items + assessment scores
 *   - Report cards (per-student per-term progress reports)
 *   - Portfolios + portfolio items (curated student work)
 *   - Milestones + milestone achievements (developmental tracking)
 *
 * Wave 3 — Implements:
 *   - 8 aggregates (AcademicSession, Curriculum, Section, Enrollment,
 *     Observation, Assessment, ReportCard, Portfolio)
 *   - 8 services + 8 Prisma repositories
 *   - 8 controllers (30+ endpoints)
 *   - 26 command handlers + 13 query handlers
 *   - Domain events wired via EventBusService
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import {
  ActivateAcademicSessionCommandHandler, ActivateSectionCommandHandler,
  CloseSectionCommandHandler, CompleteAcademicSessionCommandHandler,
  CompleteAssessmentCommandHandler, CreateAcademicSessionCommandHandler,
  CreateAssessmentCommandHandler, CreateCurriculumCommandHandler,
  CreateEnrollmentCommandHandler, CreateObservationCommandHandler,
  CreatePortfolioItemCommandHandler, CreateReportCardCommandHandler,
  CreateSectionCommandHandler, GenerateReportCardCommandHandler,
  HighlightPortfolioItemCommandHandler, PublishCurriculumCommandHandler,
  PublishReportCardCommandHandler, PromoteEnrollmentCommandHandler,
  RecordScoreCommandHandler, ShareObservationWithParentCommandHandler,
  ShareReportCardCommandHandler, StartAssessmentCommandHandler,
  WithdrawEnrollmentCommandHandler,
} from './application/handlers/academics-command-handlers';
import {
  GetAcademicSessionQueryHandler, GetAssessmentQueryHandler,
  GetEnrollmentQueryHandler, GetPortfolioQueryHandler,
  GetReportCardQueryHandler, GetSectionQueryHandler,
  ListAcademicSessionsQueryHandler, ListAssessmentsQueryHandler,
  ListCurriculaQueryHandler, ListEnrollmentsQueryHandler,
  ListObservationsQueryHandler, ListReportCardsQueryHandler,
  ListSectionsQueryHandler,
} from './application/handlers/academics-query-handlers';
import {
  AcademicSessionService, AssessmentService, CurriculumService,
  EnrollmentService, ObservationService, PortfolioService,
  ReportCardService, SectionService,
} from './application/services/academics.service';

import {
  AcademicSessionsController, AssessmentsController, CurriculaController,
  EnrollmentsController, ObservationsController, PortfoliosController,
  ReportCardsController, SectionsController,
} from './controllers/academics.controllers';

import {
  ACADEMIC_SESSION_REPOSITORY, ASSESSMENT_REPOSITORY, CURRICULUM_REPOSITORY,
  ENROLLMENT_REPOSITORY, OBSERVATION_REPOSITORY, PORTFOLIO_REPOSITORY,
  REPORT_CARD_REPOSITORY, SECTION_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAcademicSessionRepository, PrismaAssessmentRepository,
  PrismaCurriculumRepository, PrismaEnrollmentRepository,
  PrismaObservationRepository, PrismaPortfolioRepository,
  PrismaReportCardRepository, PrismaSectionRepository,
} from './infrastructure/repositories/prisma-academics.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    AcademicSessionsController,
    CurriculaController,
    SectionsController,
    EnrollmentsController,
    ObservationsController,
    AssessmentsController,
    ReportCardsController,
    PortfoliosController,
  ],
  providers: [
    // ─── CQRS buses ───
    CommandBus,
    QueryBus,

    // ─── Application services ───
    AcademicSessionService,
    CurriculumService,
    SectionService,
    EnrollmentService,
    ObservationService,
    AssessmentService,
    ReportCardService,
    PortfolioService,

    // ─── Command handlers ───
    CreateAcademicSessionCommandHandler,
    ActivateAcademicSessionCommandHandler,
    CompleteAcademicSessionCommandHandler,
    CreateCurriculumCommandHandler,
    PublishCurriculumCommandHandler,
    CreateSectionCommandHandler,
    ActivateSectionCommandHandler,
    CloseSectionCommandHandler,
    CreateEnrollmentCommandHandler,
    PromoteEnrollmentCommandHandler,
    WithdrawEnrollmentCommandHandler,
    CreateObservationCommandHandler,
    ShareObservationWithParentCommandHandler,
    CreateAssessmentCommandHandler,
    StartAssessmentCommandHandler,
    CompleteAssessmentCommandHandler,
    RecordScoreCommandHandler,
    CreateReportCardCommandHandler,
    GenerateReportCardCommandHandler,
    PublishReportCardCommandHandler,
    ShareReportCardCommandHandler,
    CreatePortfolioItemCommandHandler,
    HighlightPortfolioItemCommandHandler,

    // ─── Query handlers ───
    ListAcademicSessionsQueryHandler,
    GetAcademicSessionQueryHandler,
    ListSectionsQueryHandler,
    GetSectionQueryHandler,
    ListEnrollmentsQueryHandler,
    GetEnrollmentQueryHandler,
    ListCurriculaQueryHandler,
    ListObservationsQueryHandler,
    ListAssessmentsQueryHandler,
    GetAssessmentQueryHandler,
    GetReportCardQueryHandler,
    ListReportCardsQueryHandler,
    GetPortfolioQueryHandler,

    // ─── Repository ports → concrete implementations ───
    { provide: ACADEMIC_SESSION_REPOSITORY, useClass: PrismaAcademicSessionRepository },
    { provide: CURRICULUM_REPOSITORY, useClass: PrismaCurriculumRepository },
    { provide: SECTION_REPOSITORY, useClass: PrismaSectionRepository },
    { provide: ENROLLMENT_REPOSITORY, useClass: PrismaEnrollmentRepository },
    { provide: OBSERVATION_REPOSITORY, useClass: PrismaObservationRepository },
    { provide: ASSESSMENT_REPOSITORY, useClass: PrismaAssessmentRepository },
    { provide: REPORT_CARD_REPOSITORY, useClass: PrismaReportCardRepository },
    { provide: PORTFOLIO_REPOSITORY, useClass: PrismaPortfolioRepository },
  ],
  exports: [
    AcademicSessionService, CurriculumService, SectionService,
    EnrollmentService, ObservationService, AssessmentService,
    ReportCardService, PortfolioService,
    CommandBus, QueryBus,
    ENROLLMENT_REPOSITORY, SECTION_REPOSITORY,
  ],
})
export class AcademicsModule {}
