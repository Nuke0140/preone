/**
 * TransportModule — wiring for Transport bounded context.
 *
 * Per user request + BRC §14 (Transport Rules):
 *
 * Implements:
 *   - 3 aggregates (Vehicle, Route, Trip)
 *   - 1 service + 3 Prisma repositories + Assignment/Attendance direct via Prisma
 *   - 5 controllers (Vehicles, Routes, Trips, StudentAssignments, Attendance)
 *   - 14 command handlers + 9 query handlers
 *   - 13 domain events wired via EventBusService
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import { TransportService } from './application/services/transport.service';
import {
  AssignRouteVehicleCommandHandler, AssignVehicleDriverCommandHandler,
  CancelTripCommandHandler, ChangeVehicleStatusCommandHandler,
  CompleteTripCommandHandler, CreateRouteCommandHandler,
  DiscontinueRouteCommandHandler, EnrollStudentInTransportCommandHandler,
  MarkTransportAttendanceCommandHandler, MarkTripDelayedCommandHandler,
  OptOutStudentFromTransportCommandHandler, RegisterVehicleCommandHandler,
  ScheduleTripCommandHandler, StartTripCommandHandler,
} from './application/handlers/transport-command-handlers';
import {
  GetRouteQueryHandler, GetStudentRouteAssignmentQueryHandler, GetTripQueryHandler,
  GetVehicleQueryHandler, ListRoutesQueryHandler, ListStudentRouteAssignmentsQueryHandler,
  ListTransportAttendanceQueryHandler, ListTripsQueryHandler, ListVehiclesQueryHandler,
} from './application/handlers/transport-query-handlers';
import {
  StudentRouteAssignmentsController, TransportAttendanceController,
  TransportRoutesController, TripsController, VehiclesController,
} from './controllers/transport.controllers';
import {
  ROUTE_REPOSITORY, TRIP_REPOSITORY, VEHICLE_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaRouteRepository, PrismaTripRepository, PrismaVehicleRepository,
} from './infrastructure/repositories/prisma-transport.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [
    VehiclesController, TransportRoutesController, TripsController,
    StudentRouteAssignmentsController, TransportAttendanceController,
  ],
  providers: [
    TransportService,
    { provide: VEHICLE_REPOSITORY, useClass: PrismaVehicleRepository },
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    { provide: TRIP_REPOSITORY, useClass: PrismaTripRepository },
    // CQRS
    CommandBus, QueryBus,
    RegisterVehicleCommandHandler, ChangeVehicleStatusCommandHandler, AssignVehicleDriverCommandHandler,
    CreateRouteCommandHandler, AssignRouteVehicleCommandHandler, DiscontinueRouteCommandHandler,
    ScheduleTripCommandHandler, StartTripCommandHandler, CompleteTripCommandHandler,
    MarkTripDelayedCommandHandler, CancelTripCommandHandler,
    EnrollStudentInTransportCommandHandler, OptOutStudentFromTransportCommandHandler,
    MarkTransportAttendanceCommandHandler,
    // Queries
    GetVehicleQueryHandler, ListVehiclesQueryHandler,
    GetRouteQueryHandler, ListRoutesQueryHandler,
    GetTripQueryHandler, ListTripsQueryHandler,
    GetStudentRouteAssignmentQueryHandler, ListStudentRouteAssignmentsQueryHandler,
    ListTransportAttendanceQueryHandler,
  ],
  exports: [TransportService],
})
export class TransportModule {}
