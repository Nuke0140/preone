/**
 * CrmModule — wiring for CRM bounded context.
 *
 * Per BTD §4.3 Module Catalog #2:
 *   "crm — Leads, Campaigns, Conversions — ~40 APIs"
 *
 * Implements:
 *   - 3 aggregates (Lead, Campaign, FollowUp)
 *   - 1 service + 3 Prisma repositories
 *   - 4 controllers (Leads, Campaigns, FollowUps, Counsellors)
 *   - 18 command handlers + 6 query handlers
 *   - 22 domain events wired via EventBusService
 *   - 1 integration-event subscriber (Admissions ↔ CRM bidirectional)
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { CrmIntegrationEventSubscriber } from './application/services/crm-integration-subscriber.service';
import { CrmService } from './application/services/crm.service';
import {
  AssignLeadCommandHandler, CancelFollowUpCommandHandler, CaptureLeadCommandHandler,
  CompleteCampaignCommandHandler, CompleteFollowUpCommandHandler,
  ContactLeadCommandHandler, ConvertLeadCommandHandler, CreateCampaignCommandHandler,
  DropLeadCommandHandler, LaunchCampaignCommandHandler, LoseLeadCommandHandler,
  MissFollowUpCommandHandler, PauseCampaignCommandHandler, QualifyLeadCommandHandler,
  ReactivateLeadCommandHandler, ScheduleCampaignCommandHandler,
  ScheduleFollowUpCommandHandler, UnqualifyLeadCommandHandler,
} from './application/handlers/crm-command-handlers';
import {
  GetCampaignQueryHandler, GetCounsellorDashboardQueryHandler,
  GetLeadQueryHandler, ListCampaignsQueryHandler, ListFollowUpsQueryHandler,
  ListLeadsQueryHandler,
} from './application/handlers/crm-query-handlers';
import {
  CampaignsController, CounsellorsController, FollowUpsController,
  LeadsController,
} from './controllers/crm.controllers';
import {
  CAMPAIGN_REPOSITORY, FOLLOW_UP_REPOSITORY, LEAD_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaCampaignRepository, PrismaFollowUpRepository, PrismaLeadRepository,
} from './infrastructure/repositories/prisma-crm.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    LeadsController, CampaignsController, FollowUpsController, CounsellorsController,
  ],
  providers: [
    CrmService,
    CrmIntegrationEventSubscriber,
    // Repositories
    { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
    { provide: CAMPAIGN_REPOSITORY, useClass: PrismaCampaignRepository },
    { provide: FOLLOW_UP_REPOSITORY, useClass: PrismaFollowUpRepository },
    // CQRS
    CommandBus, QueryBus,
    // Command handlers (18)
    CaptureLeadCommandHandler, AssignLeadCommandHandler,
    ContactLeadCommandHandler, QualifyLeadCommandHandler,
    UnqualifyLeadCommandHandler, ConvertLeadCommandHandler,
    LoseLeadCommandHandler, DropLeadCommandHandler,
    ReactivateLeadCommandHandler,
    CreateCampaignCommandHandler, ScheduleCampaignCommandHandler,
    LaunchCampaignCommandHandler, PauseCampaignCommandHandler,
    CompleteCampaignCommandHandler,
    ScheduleFollowUpCommandHandler, CompleteFollowUpCommandHandler,
    MissFollowUpCommandHandler, CancelFollowUpCommandHandler,
    // Query handlers (6)
    GetLeadQueryHandler, ListLeadsQueryHandler,
    GetCampaignQueryHandler, ListCampaignsQueryHandler,
    ListFollowUpsQueryHandler, GetCounsellorDashboardQueryHandler,
  ],
  exports: [CrmService],
})
export class CrmModule implements OnModuleInit {
  constructor(private readonly subscriber: CrmIntegrationEventSubscriber) {}

  onModuleInit(): void {
    // Subscribe to Admissions integration events
    // Per BTD §14.1 — CRM is a SUBSCRIBER on AdmissionApproved (auto-convert lead)
    // and a PRODUCER of LeadConverted.v1 (Admissions links application → lead)
    this.subscriber.register();
  }
}
