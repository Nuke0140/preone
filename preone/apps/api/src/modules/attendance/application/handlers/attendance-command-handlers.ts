/**
 * Attendance Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AddDailyReportHighlightCommand, AddIncidentActionCommand,
  CompleteIncidentActionCommand, CorrectAttendanceCommand,
  CreateIncidentCommand, EscalateIncidentCommand, GenerateDailyReportCommand,
  GrantMedicineAuthorizationCommand, LogArrivalCommand, LogPickupCommand,
  MarkAttendanceCommand, MarkBulkAttendanceCommand, NotifyIncidentGuardianCommand,
  RecordDailyLogCommand, ResolveIncidentCommand, SendDailyReportCommand,
} from '../commands/attendance.commands';
import { AttendanceService } from '../services/attendance.service';

@Injectable()
export class MarkAttendanceCommandHandler implements CommandHandler<MarkAttendanceCommand> {
  private static readonly TYPE = 'Attendance.MarkAttendance';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(MarkAttendanceCommandHandler.TYPE, this);
  }
  async handle(c: MarkAttendanceCommand) {
    const { tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.markAttendance(rest, actorId, tenantId);
    return { id: result.id };
  }
}

@Injectable()
export class MarkBulkAttendanceCommandHandler implements CommandHandler<MarkBulkAttendanceCommand> {
  private static readonly TYPE = 'Attendance.MarkBulkAttendance';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(MarkBulkAttendanceCommandHandler.TYPE, this);
  }
  async handle(c: MarkBulkAttendanceCommand) {
    const { tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.markBulkAttendance(rest, actorId, tenantId);
    return { ids: result.ids };
  }
}

@Injectable()
export class CorrectAttendanceCommandHandler implements CommandHandler<CorrectAttendanceCommand> {
  private static readonly TYPE = 'Attendance.CorrectAttendance';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(CorrectAttendanceCommandHandler.TYPE, this);
  }
  async handle(c: CorrectAttendanceCommand) {
    const { attendanceId, tenantId, actorId, ...rest } = c.payload;
    await this.svc.correctAttendance(attendanceId, rest, actorId, tenantId);
    return { id: attendanceId };
  }
}

@Injectable()
export class LogArrivalCommandHandler implements CommandHandler<LogArrivalCommand> {
  private static readonly TYPE = 'Attendance.LogArrival';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(LogArrivalCommandHandler.TYPE, this);
  }
  async handle(c: LogArrivalCommand) {
    const { attendanceId, tenantId, actorId, ...rest } = c.payload;
    await this.svc.logArrival(attendanceId, rest, actorId, tenantId);
    return { id: attendanceId };
  }
}

@Injectable()
export class LogPickupCommandHandler implements CommandHandler<LogPickupCommand> {
  private static readonly TYPE = 'Attendance.LogPickup';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(LogPickupCommandHandler.TYPE, this);
  }
  async handle(c: LogPickupCommand) {
    const { attendanceId, tenantId, actorId, ...rest } = c.payload;
    await this.svc.logPickup(attendanceId, rest, actorId, tenantId);
    return { id: attendanceId };
  }
}

@Injectable()
export class RecordDailyLogCommandHandler implements CommandHandler<RecordDailyLogCommand> {
  private static readonly TYPE = 'Attendance.RecordDailyLog';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(RecordDailyLogCommandHandler.TYPE, this);
  }
  async handle(c: RecordDailyLogCommand) {
    const { attendanceId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.recordDailyLog(attendanceId, rest, actorId, tenantId);
    return { id: result.id };
  }
}

@Injectable()
export class GrantMedicineAuthorizationCommandHandler implements CommandHandler<GrantMedicineAuthorizationCommand> {
  private static readonly TYPE = 'Attendance.GrantMedicineAuthorization';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(GrantMedicineAuthorizationCommandHandler.TYPE, this);
  }
  async handle(c: GrantMedicineAuthorizationCommand) {
    const { studentId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.grantMedicineAuthorization(studentId, rest, actorId, tenantId);
    return { id: result.id };
  }
}

@Injectable()
export class CreateIncidentCommandHandler implements CommandHandler<CreateIncidentCommand> {
  private static readonly TYPE = 'Attendance.CreateIncident';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(CreateIncidentCommandHandler.TYPE, this);
  }
  async handle(c: CreateIncidentCommand) {
    const { tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.createIncident(rest, actorId, tenantId);
    return { id: result.id };
  }
}

@Injectable()
export class EscalateIncidentCommandHandler implements CommandHandler<EscalateIncidentCommand> {
  private static readonly TYPE = 'Attendance.EscalateIncident';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(EscalateIncidentCommandHandler.TYPE, this);
  }
  async handle(c: EscalateIncidentCommand) {
    const { incidentId, tenantId, actorId, ...rest } = c.payload;
    await this.svc.escalateIncident(incidentId, rest.toSeverity, rest.reason, actorId, tenantId);
    return { id: incidentId };
  }
}

@Injectable()
export class AddIncidentActionCommandHandler implements CommandHandler<AddIncidentActionCommand> {
  private static readonly TYPE = 'Attendance.AddIncidentAction';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(AddIncidentActionCommandHandler.TYPE, this);
  }
  async handle(c: AddIncidentActionCommand) {
    const { incidentId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.addIncidentAction(incidentId, rest, actorId, tenantId);
    return { id: incidentId, actionId: result.actionId };
  }
}

@Injectable()
export class CompleteIncidentActionCommandHandler implements CommandHandler<CompleteIncidentActionCommand> {
  private static readonly TYPE = 'Attendance.CompleteIncidentAction';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(CompleteIncidentActionCommandHandler.TYPE, this);
  }
  async handle(c: CompleteIncidentActionCommand) {
    const { incidentId, actionId, tenantId, actorId, outcome } = c.payload;
    await this.svc.completeIncidentAction(incidentId, actionId, outcome, actorId, tenantId);
    return { id: incidentId };
  }
}

@Injectable()
export class ResolveIncidentCommandHandler implements CommandHandler<ResolveIncidentCommand> {
  private static readonly TYPE = 'Attendance.ResolveIncident';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(ResolveIncidentCommandHandler.TYPE, this);
  }
  async handle(c: ResolveIncidentCommand) {
    const { incidentId, tenantId, actorId, resolutionNotes } = c.payload;
    await this.svc.resolveIncident(incidentId, resolutionNotes, actorId, tenantId);
    return { id: incidentId };
  }
}

@Injectable()
export class NotifyIncidentGuardianCommandHandler implements CommandHandler<NotifyIncidentGuardianCommand> {
  private static readonly TYPE = 'Attendance.NotifyIncidentGuardian';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(NotifyIncidentGuardianCommandHandler.TYPE, this);
  }
  async handle(c: NotifyIncidentGuardianCommand) {
    const { incidentId, tenantId, actorId } = c.payload;
    await this.svc.notifyIncidentGuardian(incidentId, actorId, tenantId);
    return { id: incidentId };
  }
}

@Injectable()
export class GenerateDailyReportCommandHandler implements CommandHandler<GenerateDailyReportCommand> {
  private static readonly TYPE = 'Attendance.GenerateDailyReport';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(GenerateDailyReportCommandHandler.TYPE, this);
  }
  async handle(c: GenerateDailyReportCommand) {
    const { attendanceId, tenantId, actorId, summaries } = c.payload;
    const result = await this.svc.generateDailyReport(attendanceId, summaries, actorId, tenantId);
    return { id: result.id };
  }
}

@Injectable()
export class AddDailyReportHighlightCommandHandler implements CommandHandler<AddDailyReportHighlightCommand> {
  private static readonly TYPE = 'Attendance.AddDailyReportHighlight';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(AddDailyReportHighlightCommandHandler.TYPE, this);
  }
  async handle(c: AddDailyReportHighlightCommand) {
    const { dailyReportId, tenantId, highlight } = c.payload;
    await this.svc.addDailyReportHighlight(dailyReportId, highlight, tenantId);
    return { id: dailyReportId };
  }
}

@Injectable()
export class SendDailyReportCommandHandler implements CommandHandler<SendDailyReportCommand> {
  private static readonly TYPE = 'Attendance.SendDailyReport';
  constructor(private readonly bus: CommandBus, private readonly svc: AttendanceService) {
    bus.register(SendDailyReportCommandHandler.TYPE, this);
  }
  async handle(c: SendDailyReportCommand) {
    const { dailyReportId, tenantId } = c.payload;
    await this.svc.sendDailyReport(dailyReportId, tenantId);
    return { id: dailyReportId };
  }
}
