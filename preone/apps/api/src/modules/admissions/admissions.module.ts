/**
 * AdmissionsModule — wiring for Admissions bounded context.
 *
 * Per BTD §4.3 Module Catalog #3:
 *   "admissions — Applications, Counselling, Approvals — ~50 APIs"
 *
 * Implements:
 *   - 3 aggregates (Application, Admission, WaitingList)
 *   - 3 services + 3 Prisma repositories
 *   - 3 controllers (Applications, Admissions, WaitingList)
 *   - 22 command handlers + 6 query handlers
 *   - 21 domain events wired via EventBusService
 *   - 1 saga (AdmissionsSaga) — orchestrates student onboarding + fee plan creation
 *     on ApplicationApprovedEvent (BTD §15)
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';
import { CommandBus, QueryBus } from '@shared/cqrs';

import {
  AcceptOfferCommandHandler, AcceptWaitingListSeatCommandHandler,
  AddPriorityFactorCommandHandler, ApproveApplicationCommandHandler,
  CancelAdmissionCommandHandler, CancelApplicationCommandHandler,
  CompleteCounsellingCommandHandler, CreateApplicationCommandHandler,
  DeclineOfferCommandHandler, IssueOfferCommandHandler,
  OfferWaitingListSeatCommandHandler, PerformAgeVerificationCommandHandler,
  RecordSiblingConcessionCommandHandler, RejectApplicationCommandHandler,
  RejectDocumentCommandHandler, ScheduleCounsellingCommandHandler,
  SetFeePlanQuoteCommandHandler, SubmitApplicationCommandHandler,
  UpdateApplicationCommandHandler, UploadDocumentCommandHandler,
  VerifyDocumentCommandHandler, VerifyPriorityFactorCommandHandler,
  VerifySiblingConcessionCommandHandler, WaitlistApplicationCommandHandler,
} from './application/handlers/admissions-command-handlers';
import {
  GetPipelineQueryHandler, GetAdmissionQueryHandler,
  GetApplicationQueryHandler, ListAdmissionsQueryHandler,
  ListApplicationsQueryHandler, ListWaitingListQueryHandler,
} from './application/handlers/admissions-query-handlers';
import { AdmissionsSaga } from './application/sagas/admissions.saga';
import { AdmissionsService } from './application/services/admissions.service';
import {
  AdmissionsController, ApplicationsController, WaitingListController,
} from './controllers/admissions.controllers';
import {
  FEE_PLAN_PORT,
  STUDENT_ONBOARDING_PORT,
  type CreateFeePlanRequest, type CreateFeePlanResult,
  type IStudentOnboardingPort, type IFeePlanPort,
  type OnboardStudentRequest, type OnboardStudentResult,
} from './domain/ports/saga-ports';
import {
  ADMISSION_REPOSITORY, APPLICATION_REPOSITORY, WAITING_LIST_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAdmissionRepository, PrismaApplicationRepository,
  PrismaWaitingListRepository,
} from './infrastructure/repositories/prisma-admissions.repository';

/**
 * Default NoOp implementations of the saga ports.
 *
 * These exist so the AdmissionsModule can boot standalone (e.g., in tests
 * that don't care about student onboarding). In production deployment,
 * the Student and Finance modules override these providers with their
 * real implementations.
 *
 * Per BTD §15.2 — even NoOp implementations MUST be idempotent (return
 * the same synthetic ID on duplicate calls).
 */
class NoOpStudentOnboardingPort implements IStudentOnboardingPort {
  async onboardStudent(req: OnboardStudentRequest): Promise<OnboardStudentResult> {
    return { studentId: `noop-student-${req.applicationId}`, created: false };
  }
}

class NoOpFeePlanPort implements IFeePlanPort {
  async createFeePlan(req: CreateFeePlanRequest): Promise<CreateFeePlanResult> {
    return { feePlanId: `noop-feeplan-${req.admissionId}`, created: false };
  }
}

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [ApplicationsController, AdmissionsController, WaitingListController],
  providers: [
    AdmissionsService,
    // Saga (BTD §15)
    AdmissionsSaga,
    // Saga ports — NoOp defaults; overridden by Student/Finance in production
    { provide: STUDENT_ONBOARDING_PORT, useClass: NoOpStudentOnboardingPort },
    { provide: FEE_PLAN_PORT, useClass: NoOpFeePlanPort },
    // Repositories
    { provide: APPLICATION_REPOSITORY, useClass: PrismaApplicationRepository },
    { provide: ADMISSION_REPOSITORY, useClass: PrismaAdmissionRepository },
    { provide: WAITING_LIST_REPOSITORY, useClass: PrismaWaitingListRepository },
    // CQRS handlers
    CommandBus, QueryBus,
    CreateApplicationCommandHandler, UpdateApplicationCommandHandler,
    SubmitApplicationCommandHandler, RejectApplicationCommandHandler,
    CancelApplicationCommandHandler,
    UploadDocumentCommandHandler, VerifyDocumentCommandHandler,
    RejectDocumentCommandHandler,
    ScheduleCounsellingCommandHandler, CompleteCounsellingCommandHandler,
    ApproveApplicationCommandHandler,
    IssueOfferCommandHandler, AcceptOfferCommandHandler, DeclineOfferCommandHandler,
    PerformAgeVerificationCommandHandler, SetFeePlanQuoteCommandHandler,
    AddPriorityFactorCommandHandler, VerifyPriorityFactorCommandHandler,
    RecordSiblingConcessionCommandHandler, VerifySiblingConcessionCommandHandler,
    WaitlistApplicationCommandHandler, OfferWaitingListSeatCommandHandler,
    AcceptWaitingListSeatCommandHandler, CancelAdmissionCommandHandler,
    // Query handlers
    GetApplicationQueryHandler, ListApplicationsQueryHandler,
    GetAdmissionQueryHandler, ListAdmissionsQueryHandler,
    GetPipelineQueryHandler, ListWaitingListQueryHandler,
  ],
  exports: [AdmissionsService, STUDENT_ONBOARDING_PORT, FEE_PLAN_PORT],
})
export class AdmissionsModule implements OnModuleInit {
  constructor(private readonly translator: AdmissionsEventTranslator) {}

  onModuleInit(): void {
    // Register domain-event → integration-event translations.
    // Per BTD §14.3 — translations are explicit per event type.
    this.translator.register();
  }
}
