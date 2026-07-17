/**
 * AdministrationModule — wiring for Administration bounded context.
 *
 * Per BTD §4.3 Module Catalog #11:
 *   "administration — Assets, Maintenance, Visitors — ~25 APIs"
 *
 * Implements:
 *   - 3 aggregates (Asset, MaintenanceRequest, VisitorLog)
 *   - 1 service + 3 Prisma repositories + Facility/Inspection direct via Prisma
 *   - 5 controllers (Assets, MaintenanceRequests, Visitors, Facilities, Inspections)
 *   - 12 command handlers + 8 query handlers
 *   - 13 domain events wired via EventBusService
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { AdministrationService } from './application/services/administration.service';
import {
  ApproveMaintenanceCommandHandler, AssignAssetCommandHandler,
  CancelMaintenanceCommandHandler, CheckInVisitorCommandHandler,
  CheckOutVisitorCommandHandler, CompleteMaintenanceCommandHandler,
  CreateMaintenanceRequestCommandHandler, DenyVisitorEntryCommandHandler,
  DisposeAssetCommandHandler, RegisterAssetCommandHandler,
  StartMaintenanceCommandHandler, UnassignAssetCommandHandler,
} from './application/handlers/administration-command-handlers';
import {
  GetAssetQueryHandler, GetMaintenanceRequestQueryHandler, GetVisitorLogQueryHandler,
  ListAssetsQueryHandler, ListFacilitiesQueryHandler, ListFacilityInspectionsQueryHandler,
  ListMaintenanceRequestsQueryHandler, ListVisitorLogsQueryHandler,
} from './application/handlers/administration-query-handlers';
import {
  AssetsController, FacilityInspectionsController, FacilitiesController,
  MaintenanceRequestsController, VisitorsController,
} from './controllers/administration.controllers';
import { AdministrationGapFillControllerPart1, AdministrationGapFillControllerPart2 } from './controllers/administration-gap-fill.controllers';
import {
  ASSET_REPOSITORY, MAINTENANCE_REQUEST_REPOSITORY, VISITOR_LOG_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAssetRepository, PrismaMaintenanceRequestRepository, PrismaVisitorLogRepository,
} from './infrastructure/repositories/prisma-administration.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [AssetsController, MaintenanceRequestsController, VisitorsController,
    FacilitiesController, FacilityInspectionsController,
    AdministrationGapFillControllerPart1, AdministrationGapFillControllerPart2,
  ],
  providers: [
    AdministrationService,
    { provide: ASSET_REPOSITORY, useClass: PrismaAssetRepository },
    { provide: MAINTENANCE_REQUEST_REPOSITORY, useClass: PrismaMaintenanceRequestRepository },
    { provide: VISITOR_LOG_REPOSITORY, useClass: PrismaVisitorLogRepository },
    // CQRS
    CommandBus, QueryBus,
    RegisterAssetCommandHandler, AssignAssetCommandHandler, UnassignAssetCommandHandler, DisposeAssetCommandHandler,
    CreateMaintenanceRequestCommandHandler, ApproveMaintenanceCommandHandler,
    StartMaintenanceCommandHandler, CompleteMaintenanceCommandHandler, CancelMaintenanceCommandHandler,
    CheckInVisitorCommandHandler, CheckOutVisitorCommandHandler, DenyVisitorEntryCommandHandler,
    // Queries
    GetAssetQueryHandler, ListAssetsQueryHandler,
    GetMaintenanceRequestQueryHandler, ListMaintenanceRequestsQueryHandler,
    GetVisitorLogQueryHandler, ListVisitorLogsQueryHandler,
    ListFacilitiesQueryHandler, ListFacilityInspectionsQueryHandler,
  ],
  exports: [AdministrationService],
})
export class AdministrationModule {}
