/**
 * Transport Command Handlers — CQRS write side.
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AssignRouteVehicleCommand, AssignVehicleDriverCommand, CancelTripCommand,
  ChangeVehicleStatusCommand, CompleteTripCommand, CreateRouteCommand,
  DiscontinueRouteCommand, EnrollStudentInTransportCommand,
  MarkTransportAttendanceCommand, MarkTripDelayedCommand,
  OptOutStudentFromTransportCommand, RegisterVehicleCommand,
  ScheduleTripCommand, StartTripCommand,
} from '../commands/transport.commands';
import { TransportService } from '../services/transport.service';

@Injectable()
export class RegisterVehicleCommandHandler implements CommandHandler<RegisterVehicleCommand> {
  private static readonly TYPE = 'Transport.RegisterVehicle';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(RegisterVehicleCommandHandler.TYPE, this);
  }
  async handle(c: RegisterVehicleCommand) {
    const v = await this.svc.registerVehicle(c.payload);
    return { id: v.id };
  }
}

@Injectable()
export class ChangeVehicleStatusCommandHandler implements CommandHandler<ChangeVehicleStatusCommand> {
  private static readonly TYPE = 'Transport.ChangeVehicleStatus';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(ChangeVehicleStatusCommandHandler.TYPE, this);
  }
  async handle(c: ChangeVehicleStatusCommand) {
    await this.svc.changeVehicleStatus(c.payload.vehicleId, c.payload.newStatus, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.vehicleId };
  }
}

@Injectable()
export class AssignVehicleDriverCommandHandler implements CommandHandler<AssignVehicleDriverCommand> {
  private static readonly TYPE = 'Transport.AssignVehicleDriver';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(AssignVehicleDriverCommandHandler.TYPE, this);
  }
  async handle(c: AssignVehicleDriverCommand) {
    await this.svc.assignVehicleDriver(c.payload.vehicleId, c.payload.driverId, c.payload.tenantId);
    return { id: c.payload.vehicleId };
  }
}

@Injectable()
export class CreateRouteCommandHandler implements CommandHandler<CreateRouteCommand> {
  private static readonly TYPE = 'Transport.CreateRoute';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(CreateRouteCommandHandler.TYPE, this);
  }
  async handle(c: CreateRouteCommand) {
    const r = await this.svc.createRoute(c.payload);
    return { id: r.id, routeCode: r.routeCode };
  }
}

@Injectable()
export class AssignRouteVehicleCommandHandler implements CommandHandler<AssignRouteVehicleCommand> {
  private static readonly TYPE = 'Transport.AssignRouteVehicle';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(AssignRouteVehicleCommandHandler.TYPE, this);
  }
  async handle(c: AssignRouteVehicleCommand) {
    await this.svc.assignRouteVehicle(c.payload.routeId, c.payload.vehicleId, c.payload.tenantId);
    return { id: c.payload.routeId };
  }
}

@Injectable()
export class DiscontinueRouteCommandHandler implements CommandHandler<DiscontinueRouteCommand> {
  private static readonly TYPE = 'Transport.DiscontinueRoute';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(DiscontinueRouteCommandHandler.TYPE, this);
  }
  async handle(c: DiscontinueRouteCommand) {
    await this.svc.discontinueRoute(c.payload.routeId, c.payload.tenantId);
    return { id: c.payload.routeId };
  }
}

@Injectable()
export class ScheduleTripCommandHandler implements CommandHandler<ScheduleTripCommand> {
  private static readonly TYPE = 'Transport.ScheduleTrip';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(ScheduleTripCommandHandler.TYPE, this);
  }
  async handle(c: ScheduleTripCommand) {
    const t = await this.svc.scheduleTrip(c.payload);
    return { id: t.id };
  }
}

@Injectable()
export class StartTripCommandHandler implements CommandHandler<StartTripCommand> {
  private static readonly TYPE = 'Transport.StartTrip';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(StartTripCommandHandler.TYPE, this);
  }
  async handle(c: StartTripCommand) {
    await this.svc.startTrip(c.payload.tripId, c.payload.tenantId);
    return { id: c.payload.tripId };
  }
}

@Injectable()
export class CompleteTripCommandHandler implements CommandHandler<CompleteTripCommand> {
  private static readonly TYPE = 'Transport.CompleteTrip';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(CompleteTripCommandHandler.TYPE, this);
  }
  async handle(c: CompleteTripCommand) {
    await this.svc.completeTrip(c.payload.tripId, c.payload.actualEnd, c.payload.totalDistanceKm, c.payload.tenantId);
    return { id: c.payload.tripId };
  }
}

@Injectable()
export class MarkTripDelayedCommandHandler implements CommandHandler<MarkTripDelayedCommand> {
  private static readonly TYPE = 'Transport.MarkTripDelayed';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(MarkTripDelayedCommandHandler.TYPE, this);
  }
  async handle(c: MarkTripDelayedCommand) {
    await this.svc.markTripDelayed(c.payload.tripId, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.tripId };
  }
}

@Injectable()
export class CancelTripCommandHandler implements CommandHandler<CancelTripCommand> {
  private static readonly TYPE = 'Transport.CancelTrip';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(CancelTripCommandHandler.TYPE, this);
  }
  async handle(c: CancelTripCommand) {
    await this.svc.cancelTrip(c.payload.tripId, c.payload.reason, c.payload.tenantId);
    return { id: c.payload.tripId };
  }
}

@Injectable()
export class EnrollStudentInTransportCommandHandler implements CommandHandler<EnrollStudentInTransportCommand> {
  private static readonly TYPE = 'Transport.EnrollStudent';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(EnrollStudentInTransportCommandHandler.TYPE, this);
  }
  async handle(c: EnrollStudentInTransportCommand) {
    const a = await this.svc.enrollStudent(c.payload);
    return { id: a.id };
  }
}

@Injectable()
export class OptOutStudentFromTransportCommandHandler implements CommandHandler<OptOutStudentFromTransportCommand> {
  private static readonly TYPE = 'Transport.OptOutStudent';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(OptOutStudentFromTransportCommandHandler.TYPE, this);
  }
  async handle(c: OptOutStudentFromTransportCommand) {
    await this.svc.optOutStudent(c.payload.assignmentId, c.payload.tenantId);
    return { id: c.payload.assignmentId };
  }
}

@Injectable()
export class MarkTransportAttendanceCommandHandler implements CommandHandler<MarkTransportAttendanceCommand> {
  private static readonly TYPE = 'Transport.MarkAttendance';
  constructor(private readonly bus: CommandBus, private readonly svc: TransportService) {
    bus.register(MarkTransportAttendanceCommandHandler.TYPE, this);
  }
  async handle(c: MarkTransportAttendanceCommand) {
    const a = await this.svc.markAttendance(c.payload);
    return { id: a.id };
  }
}
