/**
 * AttendanceModule — wiring for Attendance bounded context.
 *
 * Per BTD §4.3 Module Catalog #6:
 *   "attendance — Daily Attendance, Arrival, Pickup — ~35 APIs"
 *
 * Implements:
 *   - 4 aggregates (Attendance, DailyLog, IncidentReport, DailyReport)
 *   - 4 services + 5 Prisma repositories
 *   - 5 controllers (Attendance, DailyLogs, MedicineAuthorizations,
 *     Incidents, DailyReports)
 *   - 16 command handlers + 6 query handlers
 *   - 21 domain events wired via EventBusService
 *
 * Wave 4.1 — AttendanceEventTranslator registered at bootstrap,
 * emitting 4 integration events (AttendanceMarked.v1, IncidentReported.v1,
 * DailyReportSent.v1, LatePickupRecorded.v1) that the Communication
 * module will subscribe to for parent notifications.
 */
import { Module, OnModuleInit } from '@nestjs/common';

import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';
import { CommandBus, QueryBus } from '@shared/cqrs';

import { AttendanceEventTranslator } from './application/services/attendance-event-translator.service';

import {
  AddDailyReportHighlightCommandHandler, AddIncidentActionCommandHandler,
  CompleteIncidentActionCommandHandler, CorrectAttendanceCommandHandler,
  CreateIncidentCommandHandler, EscalateIncidentCommandHandler,
  GenerateDailyReportCommandHandler, GrantMedicineAuthorizationCommandHandler,
  LogArrivalCommandHandler, LogPickupCommandHandler,
  MarkAttendanceCommandHandler, MarkBulkAttendanceCommandHandler,
  NotifyIncidentGuardianCommandHandler, RecordDailyLogCommandHandler,
  ResolveIncidentCommandHandler, SendDailyReportCommandHandler,
} from './application/handlers/attendance-command-handlers';
import {
  GetAttendanceQueryHandler, GetClassroomSummaryQueryHandler,
  GetDailyReportQueryHandler, GetIncidentQueryHandler,
  ListAttendanceQueryHandler, ListIncidentsQueryHandler,
} from './application/handlers/attendance-query-handlers';
import { AttendanceService } from './application/services/attendance.service';
import {
  AttendanceController, DailyLogsController, DailyReportsController,
  IncidentsController, MedicineAuthorizationsController,
} from './controllers/attendance.controllers';
import {
  ATTENDANCE_REPOSITORY, DAILY_LOG_REPOSITORY, DAILY_REPORT_REPOSITORY,
  INCIDENT_REPORT_REPOSITORY, MEDICINE_AUTHORIZATION_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaAttendanceRepository, PrismaDailyLogRepository,
  PrismaDailyReportRepository, PrismaIncidentReportRepository,
  PrismaMedicineAuthorizationRepository,
} from './infrastructure/repositories/prisma-attendance.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    AttendanceController, DailyLogsController, MedicineAuthorizationsController,
    IncidentsController, DailyReportsController,
  ],
  providers: [
    AttendanceService,
    AttendanceEventTranslator,
    // Repositories
    { provide: ATTENDANCE_REPOSITORY, useClass: PrismaAttendanceRepository },
    { provide: DAILY_LOG_REPOSITORY, useClass: PrismaDailyLogRepository },
    { provide: MEDICINE_AUTHORIZATION_REPOSITORY, useClass: PrismaMedicineAuthorizationRepository },
    { provide: INCIDENT_REPORT_REPOSITORY, useClass: PrismaIncidentReportRepository },
    { provide: DAILY_REPORT_REPOSITORY, useClass: PrismaDailyReportRepository },
    // CQRS
    CommandBus, QueryBus,
    MarkAttendanceCommandHandler, MarkBulkAttendanceCommandHandler,
    CorrectAttendanceCommandHandler, LogArrivalCommandHandler, LogPickupCommandHandler,
    RecordDailyLogCommandHandler, GrantMedicineAuthorizationCommandHandler,
    CreateIncidentCommandHandler, EscalateIncidentCommandHandler,
    AddIncidentActionCommandHandler, CompleteIncidentActionCommandHandler,
    ResolveIncidentCommandHandler, NotifyIncidentGuardianCommandHandler,
    GenerateDailyReportCommandHandler, AddDailyReportHighlightCommandHandler,
    SendDailyReportCommandHandler,
    // Query handlers
    GetAttendanceQueryHandler, ListAttendanceQueryHandler,
    GetClassroomSummaryQueryHandler, GetIncidentQueryHandler,
    ListIncidentsQueryHandler, GetDailyReportQueryHandler,
  ],
  exports: [AttendanceService],
})
export class AttendanceModule implements OnModuleInit {
  constructor(private readonly translator: AttendanceEventTranslator) {}

  onModuleInit(): void {
    // Register domain-event → integration-event translations.
    // Per BTD §14.3 — translations are explicit per event type.
    this.translator.register();
  }
}
