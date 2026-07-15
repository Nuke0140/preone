/**
 * Attendance Commands — intent-bearing operations (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

import type {
  AddHighlightDto, AddIncidentActionDto, CompleteIncidentActionDto,
  CorrectAttendanceDto, CreateIncidentDto, EscalateIncidentDto,
  GenerateDailyReportDto, GrantMedicineAuthorizationDto, LogArrivalDto,
  LogPickupDto, MarkAttendanceDto, MarkBulkAttendanceDto,
  RecordDailyLogDto, ResolveIncidentDto,
} from '../dto/attendance.dto';

// ─── Attendance ─────────────────────────────────

export class MarkAttendanceCommand implements Command<MarkAttendanceDto & { tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Attendance.MarkAttendance';
  constructor(readonly payload: MarkAttendanceDto & { tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

export class MarkBulkAttendanceCommand implements Command<MarkBulkAttendanceDto & { tenantId: string; actorId: string }, { ids: string[] }> {
  readonly type = 'Attendance.MarkBulkAttendance';
  constructor(readonly payload: MarkBulkAttendanceDto & { tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

export class CorrectAttendanceCommand implements Command<{ attendanceId: string; tenantId: string; actorId: string } & CorrectAttendanceDto, { id: string }> {
  readonly type = 'Attendance.CorrectAttendance';
  constructor(readonly payload: { attendanceId: string; tenantId: string; actorId: string } & CorrectAttendanceDto, readonly metadata: CommandMetadata) {}
}

export class LogArrivalCommand implements Command<{ attendanceId: string; tenantId: string; actorId: string } & LogArrivalDto, { id: string }> {
  readonly type = 'Attendance.LogArrival';
  constructor(readonly payload: { attendanceId: string; tenantId: string; actorId: string } & LogArrivalDto, readonly metadata: CommandMetadata) {}
}

export class LogPickupCommand implements Command<{ attendanceId: string; tenantId: string; actorId: string } & LogPickupDto, { id: string }> {
  readonly type = 'Attendance.LogPickup';
  constructor(readonly payload: { attendanceId: string; tenantId: string; actorId: string } & LogPickupDto, readonly metadata: CommandMetadata) {}
}

// ─── Daily logs ────────────────────────────────

export class RecordDailyLogCommand implements Command<{ attendanceId: string; tenantId: string; actorId: string } & RecordDailyLogDto, { id: string }> {
  readonly type = 'Attendance.RecordDailyLog';
  constructor(readonly payload: { attendanceId: string; tenantId: string; actorId: string } & RecordDailyLogDto, readonly metadata: CommandMetadata) {}
}

export class GrantMedicineAuthorizationCommand implements Command<{ studentId: string; tenantId: string; actorId: string } & GrantMedicineAuthorizationDto, { id: string }> {
  readonly type = 'Attendance.GrantMedicineAuthorization';
  constructor(readonly payload: { studentId: string; tenantId: string; actorId: string } & GrantMedicineAuthorizationDto, readonly metadata: CommandMetadata) {}
}

// ─── Incident ──────────────────────────────────

export class CreateIncidentCommand implements Command<CreateIncidentDto & { tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Attendance.CreateIncident';
  constructor(readonly payload: CreateIncidentDto & { tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

export class EscalateIncidentCommand implements Command<{ incidentId: string; tenantId: string; actorId: string } & EscalateIncidentDto, { id: string }> {
  readonly type = 'Attendance.EscalateIncident';
  constructor(readonly payload: { incidentId: string; tenantId: string; actorId: string } & EscalateIncidentDto, readonly metadata: CommandMetadata) {}
}

export class AddIncidentActionCommand implements Command<{ incidentId: string; tenantId: string; actorId: string } & AddIncidentActionDto, { id: string; actionId: string }> {
  readonly type = 'Attendance.AddIncidentAction';
  constructor(readonly payload: { incidentId: string; tenantId: string; actorId: string } & AddIncidentActionDto, readonly metadata: CommandMetadata) {}
}

export class CompleteIncidentActionCommand implements Command<{ incidentId: string; actionId: string; tenantId: string; actorId: string } & CompleteIncidentActionDto, { id: string }> {
  readonly type = 'Attendance.CompleteIncidentAction';
  constructor(readonly payload: { incidentId: string; actionId: string; tenantId: string; actorId: string } & CompleteIncidentActionDto, readonly metadata: CommandMetadata) {}
}

export class ResolveIncidentCommand implements Command<{ incidentId: string; tenantId: string; actorId: string } & ResolveIncidentDto, { id: string }> {
  readonly type = 'Attendance.ResolveIncident';
  constructor(readonly payload: { incidentId: string; tenantId: string; actorId: string } & ResolveIncidentDto, readonly metadata: CommandMetadata) {}
}

export class NotifyIncidentGuardianCommand implements Command<{ incidentId: string; tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Attendance.NotifyIncidentGuardian';
  constructor(readonly payload: { incidentId: string; tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

// ─── Daily report ──────────────────────────────

export class GenerateDailyReportCommand implements Command<{ attendanceId: string; tenantId: string; actorId: string } & GenerateDailyReportDto, { id: string }> {
  readonly type = 'Attendance.GenerateDailyReport';
  constructor(readonly payload: { attendanceId: string; tenantId: string; actorId: string } & GenerateDailyReportDto, readonly metadata: CommandMetadata) {}
}

export class AddDailyReportHighlightCommand implements Command<{ dailyReportId: string; tenantId: string } & AddHighlightDto, { id: string }> {
  readonly type = 'Attendance.AddDailyReportHighlight';
  constructor(readonly payload: { dailyReportId: string; tenantId: string } & AddHighlightDto, readonly metadata: CommandMetadata) {}
}

export class SendDailyReportCommand implements Command<{ dailyReportId: string; tenantId: string }, { id: string }> {
  readonly type = 'Attendance.SendDailyReport';
  constructor(readonly payload: { dailyReportId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}
