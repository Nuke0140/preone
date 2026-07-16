/**
 * ReportsModule — wiring for Reports bounded context.
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { ReportsService } from './application/services/reports.service';
import {
  CancelReportExecutionCommandHandler, CreateReportDefinitionCommandHandler,
  CreateReportSubscriptionCommandHandler, CreateSavedReportCommandHandler,
  DeleteReportSubscriptionCommandHandler, ExecuteReportCommandHandler,
} from './application/handlers/reports-command-handlers';
import {
  GetAttendanceStatsQueryHandler, GetDashboardDataQueryHandler,
  GetEnrollmentStatsQueryHandler, GetFeeCollectionStatsQueryHandler,
  GetReportDefinitionQueryHandler, GetReportExecutionQueryHandler,
  ListReportDefinitionsQueryHandler, ListReportExecutionsQueryHandler,
  ListReportSubscriptionsQueryHandler, ListSavedReportsQueryHandler,
} from './application/handlers/reports-query-handlers';
import {
  AnalyticsController, ReportDefinitionsController, ReportExecutionsController,
  ReportSubscriptionsController, SavedReportsController,
} from './controllers/reports.controllers';
import {
  REPORT_DEFINITION_REPOSITORY, REPORT_EXECUTION_REPOSITORY,
  REPORT_SUBSCRIPTION_REPOSITORY, SAVED_REPORT_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaReportDefinitionRepository, PrismaReportExecutionRepository,
  PrismaReportSubscriptionRepository, PrismaSavedReportRepository,
} from './infrastructure/repositories/prisma-reports.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    ReportDefinitionsController, ReportExecutionsController,
    SavedReportsController, ReportSubscriptionsController, AnalyticsController,
  ],
  providers: [
    ReportsService,
    { provide: REPORT_DEFINITION_REPOSITORY, useClass: PrismaReportDefinitionRepository },
    { provide: REPORT_EXECUTION_REPOSITORY, useClass: PrismaReportExecutionRepository },
    { provide: SAVED_REPORT_REPOSITORY, useClass: PrismaSavedReportRepository },
    { provide: REPORT_SUBSCRIPTION_REPOSITORY, useClass: PrismaReportSubscriptionRepository },
    // CQRS
    CommandBus, QueryBus,
    CreateReportDefinitionCommandHandler, ExecuteReportCommandHandler,
    CancelReportExecutionCommandHandler,
    CreateSavedReportCommandHandler,
    CreateReportSubscriptionCommandHandler, DeleteReportSubscriptionCommandHandler,
    // Queries
    GetReportDefinitionQueryHandler, ListReportDefinitionsQueryHandler,
    GetReportExecutionQueryHandler, ListReportExecutionsQueryHandler,
    ListSavedReportsQueryHandler, ListReportSubscriptionsQueryHandler,
    GetDashboardDataQueryHandler, GetEnrollmentStatsQueryHandler,
    GetAttendanceStatsQueryHandler, GetFeeCollectionStatsQueryHandler,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
