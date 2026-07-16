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
 *
 * Wave 4.1 — AdmissionsEventTranslator registered at bootstrap,
 * emitting 5 integration events (AdmissionApproved.v1 triggers the
 * BTD §17.3 admission approval saga across Identity + Finance +
 * Communication).
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { AdmissionsEventTranslator } from './application/services/admissions-event-translator.service';

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
import { AdmissionsService } from './application/services/admissions.service';
import {
  AdmissionsController, ApplicationsController, WaitingListController,
} from './controllers/admissions.controllers';
import {
  ADMISSION_REPOSITORY, APPLICATION_REPOSITORY, WAITING_LIST_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAdmissionRepository, PrismaApplicationRepository,
  PrismaWaitingListRepository,
} from './infrastructure/repositories/prisma-admissions.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [ApplicationsController, AdmissionsController, WaitingListController],
  providers: [
    AdmissionsService,
    AdmissionsEventTranslator,
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
  exports: [AdmissionsService],
})
export class AdmissionsModule implements OnModuleInit {
  constructor(private readonly translator: AdmissionsEventTranslator) {}

  onModuleInit(): void {
    // Register domain-event → integration-event translations.
    // Per BTD §14.3 — translations are explicit per event type.
    this.translator.register();
  }
}
