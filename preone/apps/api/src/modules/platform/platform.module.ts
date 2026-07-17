/**
 * PlatformModule — wiring for Platform bounded context.
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { PlatformService } from './application/services/platform.service';
import {
  AddSupportTicketCommentCommandHandler, AssignSupportTicketCommandHandler,
  CompleteProvisioningStepCommandHandler, CreateSupportTicketCommandHandler,
  DeleteFeatureFlagCommandHandler, FailProvisioningCommandHandler,
  SetFeatureFlagCommandHandler, SetTicketSatisfactionCommandHandler,
  StartTenantProvisioningCommandHandler, UpdateSupportTicketStatusCommandHandler,
} from './application/handlers/platform-command-handlers';
import {
  GetFeatureFlagQueryHandler, GetPlatformMetricsQueryHandler, GetSupportTicketQueryHandler,
  GetTenantProvisioningBySchoolQueryHandler, GetTenantProvisioningQueryHandler,
  ListFeatureFlagsQueryHandler, ListProvisioningsQueryHandler,
  ListSupportTicketCommentsQueryHandler, ListSupportTicketsQueryHandler,
} from './application/handlers/platform-query-handlers';
import {
  FeatureFlagsController, PlatformMetricsController, ProvisioningsController,
  SupportTicketsController,
} from './controllers/platform.controllers';
import { PlatformGapFillControllerPart1, PlatformGapFillControllerPart2 } from './controllers/platform-gap-fill.controllers';
import {
  FEATURE_FLAG_REPOSITORY, SUPPORT_TICKET_REPOSITORY, TENANT_PROVISIONING_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaFeatureFlagRepository, PrismaSupportTicketRepository, PrismaTenantProvisioningRepository,
} from './infrastructure/repositories/prisma-platform.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [ProvisioningsController, FeatureFlagsController,
    SupportTicketsController, PlatformMetricsController,
    PlatformGapFillControllerPart1, PlatformGapFillControllerPart2,
  ],
  providers: [
    PlatformService,
    { provide: TENANT_PROVISIONING_REPOSITORY, useClass: PrismaTenantProvisioningRepository },
    { provide: FEATURE_FLAG_REPOSITORY, useClass: PrismaFeatureFlagRepository },
    { provide: SUPPORT_TICKET_REPOSITORY, useClass: PrismaSupportTicketRepository },
    // CQRS
    CommandBus, QueryBus,
    StartTenantProvisioningCommandHandler, CompleteProvisioningStepCommandHandler, FailProvisioningCommandHandler,
    SetFeatureFlagCommandHandler, DeleteFeatureFlagCommandHandler,
    CreateSupportTicketCommandHandler, UpdateSupportTicketStatusCommandHandler,
    AssignSupportTicketCommandHandler, AddSupportTicketCommentCommandHandler,
    SetTicketSatisfactionCommandHandler,
    // Queries
    GetTenantProvisioningQueryHandler, GetTenantProvisioningBySchoolQueryHandler, ListProvisioningsQueryHandler,
    GetFeatureFlagQueryHandler, ListFeatureFlagsQueryHandler,
    GetSupportTicketQueryHandler, ListSupportTicketsQueryHandler, ListSupportTicketCommentsQueryHandler,
    GetPlatformMetricsQueryHandler,
  ],
  exports: [PlatformService],
})
export class PlatformModule {}
