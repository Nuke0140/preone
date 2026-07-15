/**
 * Attendance Application Service — orchestrates Attendance, DailyLog,
 * IncidentReport, and DailyReport aggregates.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ConflictException, NotFoundException, ValidationException,
} from '@common/errors/exceptions';
import { EventBusService } from '@infra/event-bus/event-bus.service';

import {
  AttendanceAggregate, AttendanceStatus, ArrivalMode, PickupMode,
} from '../../domain/aggregates/attendance.aggregate';
import {
  DailyLogAggregate, DailyLogType,
} from '../../domain/aggregates/daily-log.aggregate';
import {
  DailyReportAggregate,
} from '../../domain/aggregates/daily-report.aggregate';
import {
  IncidentReportAggregate, IncidentSeverity, IncidentType,
} from '../../domain/aggregates/incident-report.aggregate';
import {
  ATTENDANCE_REPOSITORY, DAILY_LOG_REPOSITORY, DAILY_REPORT_REPOSITORY,
  INCIDENT_REPORT_REPOSITORY, MEDICINE_AUTHORIZATION_REPOSITORY,
} from '../../domain/repositories/tokens';
import type {
  AttendanceListFilter, AttendanceRepository,
  DailyLogRepository, DailyReportRepository,
  IncidentListFilter, IncidentReportRepository,
  MedicineAuthorizationRecord, MedicineAuthorizationRepository,
} from '../../domain/repositories/attendance.repository';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @Inject(ATTENDANCE_REPOSITORY) private readonly attendances: AttendanceRepository,
    @Inject(DAILY_LOG_REPOSITORY) private readonly dailyLogs: DailyLogRepository,
    @Inject(INCIDENT_REPORT_REPOSITORY) private readonly incidents: IncidentReportRepository,
    @Inject(DAILY_REPORT_REPOSITORY) private readonly dailyReports: DailyReportRepository,
    @Inject(MEDICINE_AUTHORIZATION_REPOSITORY) private readonly medicineAuths: MedicineAuthorizationRepository,
    private readonly eventBus: EventBusService,
  ) {}

  // ─── Attendance ────────────────────────────────────

  async markAttendance(props: {
    studentId: string;
    classroomId: string;
    academicSessionId: string;
    attendanceDate: string;
    status: AttendanceStatus;
    checkInAt?: string;
    checkOutAt?: string;
    arrivalMode?: ArrivalMode;
    pickupMode?: PickupMode;
    notes?: string;
    source: 'MANUAL' | 'BIOMETRIC' | 'RFID' | 'APP';
  }, actorId: string, tenantId: string): Promise<AttendanceAggregate> {
    // Check for existing attendance on this date for this student
    const existing = await this.attendances.findByStudentAndDate(props.studentId, props.attendanceDate);
    if (existing) {
      // Update existing
      existing.updateStatus(props.status, actorId, new Date().toISOString(), props.notes);
      if (props.checkInAt && props.arrivalMode) {
        existing.setCheckIn(props.checkInAt, props.arrivalMode);
      }
      if (props.checkOutAt && props.pickupMode) {
        existing.setCheckOut(props.checkOutAt, props.pickupMode);
      }
      await this.attendances.save(existing);
      await this.eventBus.publishAll(existing.commit());
      return existing;
    }

    const attendance = AttendanceAggregate.create({
      tenantId,
      studentId: props.studentId,
      classroomId: props.classroomId,
      academicSessionId: props.academicSessionId,
      attendanceDate: props.attendanceDate,
      status: props.status,
      checkInAt: props.checkInAt,
      checkOutAt: props.checkOutAt,
      arrivalMode: props.arrivalMode,
      pickupMode: props.pickupMode,
      markedBy: actorId,
      markedAt: new Date().toISOString(),
      notes: props.notes,
      source: props.source,
    });
    await this.attendances.save(attendance);
    await this.eventBus.publishAll(attendance.commit());
    return attendance;
  }

  async markBulkAttendance(props: {
    classroomId: string;
    academicSessionId: string;
    attendanceDate: string;
    source: 'MANUAL' | 'BIOMETRIC' | 'RFID' | 'APP';
    notes?: string;
    entries: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>;
  }, actorId: string, tenantId: string): Promise<{ ids: string[] }> {
    const ids: string[] = [];
    for (const entry of props.entries) {
      const attendance = await this.markAttendance({
        studentId: entry.studentId,
        classroomId: props.classroomId,
        academicSessionId: props.academicSessionId,
        attendanceDate: props.attendanceDate,
        status: entry.status,
        notes: entry.notes ?? props.notes,
        source: props.source,
      }, actorId, tenantId);
      ids.push(attendance.id);
    }
    this.logger.log(`Bulk-marked ${ids.length} attendance entries for classroom ${props.classroomId} on ${props.attendanceDate}`);
    return { ids };
  }

  async correctAttendance(attendanceId: string, props: {
    fromStatus: AttendanceStatus;
    toStatus: AttendanceStatus;
    reason: string;
  }, actorId: string, tenantId: string): Promise<void> {
    const a = await this.getAttendanceOrThrow(attendanceId, tenantId);
    a.correct(actorId, props.fromStatus, props.toStatus, props.reason, new Date().toISOString());
    await this.attendances.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  async logArrival(attendanceId: string, props: {
    arrivalAt: string;
    arrivalMode: ArrivalMode;
    droppedByGuardianId?: string;
    notes?: string;
  }, actorId: string, tenantId: string): Promise<void> {
    const a = await this.getAttendanceOrThrow(attendanceId, tenantId);
    a.logArrival(props.arrivalAt, props.arrivalMode, actorId, props.droppedByGuardianId, props.notes);
    await this.attendances.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  async logPickup(attendanceId: string, props: {
    pickupAt: string;
    pickupMode: PickupMode;
    pickedByGuardianId?: string;
    pickedByAuthorizedPerson?: string;
    notes?: string;
  }, actorId: string, tenantId: string): Promise<void> {
    const a = await this.getAttendanceOrThrow(attendanceId, tenantId);
    a.logPickup(props.pickupAt, props.pickupMode, actorId, props.pickedByGuardianId, props.pickedByAuthorizedPerson, props.notes);
    await this.attendances.save(a);
    await this.eventBus.publishAll(a.commit());
  }

  // ─── Daily logs ────────────────────────────────────

  async recordDailyLog(attendanceId: string, props: {
    logType: DailyLogType;
    loggedAt: string;
    payload: Record<string, unknown>;
    notes?: string;
  }, actorId: string, tenantId: string): Promise<DailyLogAggregate> {
    const attendance = await this.getAttendanceOrThrow(attendanceId, tenantId);

    // For MEDICINE logs, verify authorization exists
    if (props.logType === 'MEDICINE') {
      const payload = props.payload as { medicineName?: string };
      if (!payload.medicineName) {
        throw new ValidationException('Medicine name is required for MEDICINE logs');
      }
      const auths = await this.medicineAuths.findByStudent(attendance.studentId, true);
      const matching = auths.find((a: MedicineAuthorizationRecord) => a.medicineName.toLowerCase() === payload.medicineName!.toLowerCase());
      if (!matching) {
        throw new ConflictException(
          'MEDICINE_NOT_AUTHORIZED',
          `No active authorization for medicine "${payload.medicineName}"`,
        );
      }
      if (!matching.isVerified) {
        throw new ConflictException(
          'MEDICINE_AUTH_NOT_VERIFIED',
          `Medicine authorization for "${payload.medicineName}" not yet verified by staff`,
        );
      }
    }

    const log = DailyLogAggregate.create({
      tenantId,
      attendanceId,
      studentId: attendance.studentId,
      logType: props.logType,
      loggedAt: props.loggedAt,
      recordedBy: actorId,
      payload: props.payload,
      notes: props.notes,
    });
    await this.dailyLogs.save(log);
    await this.eventBus.publishAll(log.commit());
    return log;
  }

  async grantMedicineAuthorization(studentId: string, props: {
    authorizedByGuardianId: string;
    medicineName: string;
    dosage: string;
    route: 'ORAL' | 'TOPICAL' | 'INHALATION' | 'INJECTION' | 'OPHTHALMIC' | 'OTIC' | 'NASAL' | 'OTHER';
    frequency: string;
    startAt: string;
    endAt?: string;
    instructions?: string;
    prescriptionUrl?: string;
  }, _actorId: string, tenantId: string): Promise<MedicineAuthorizationRecord> {
    const record = await this.medicineAuths.save({
      tenantId,
      studentId,
      authorizedByGuardianId: props.authorizedByGuardianId,
      medicineName: props.medicineName,
      dosage: props.dosage,
      route: props.route,
      frequency: props.frequency,
      startAt: props.startAt,
      endAt: props.endAt,
      instructions: props.instructions,
      prescriptionUrl: props.prescriptionUrl,
      isVerified: false,
      isActive: true,
    });
    return record;
  }

  // ─── Incident ──────────────────────────────────────

  async createIncident(props: {
    studentId: string;
    classroomId: string;
    incidentType: IncidentType;
    severity: IncidentSeverity;
    occurredAt: string;
    location?: string;
    description: string;
    immediateAction?: string;
  }, actorId: string, tenantId: string): Promise<IncidentReportAggregate> {
    const incident = IncidentReportAggregate.create({
      tenantId,
      studentId: props.studentId,
      classroomId: props.classroomId,
      incidentType: props.incidentType,
      severity: props.severity,
      occurredAt: props.occurredAt,
      reportedAt: new Date().toISOString(),
      reportedBy: actorId,
      location: props.location,
      description: props.description,
      immediateAction: props.immediateAction,
    });
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
    return incident;
  }

  async escalateIncident(incidentId: string, toSeverity: IncidentSeverity, reason: string, _actorId: string, tenantId: string): Promise<void> {
    const incident = await this.getIncidentOrThrow(incidentId, tenantId);
    incident.escalate(toSeverity, reason);
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
  }

  async addIncidentAction(incidentId: string, props: {
    actionType: string;
    description: string;
    performedAt: string;
  }, actorId: string, tenantId: string): Promise<{ actionId: string }> {
    const incident = await this.getIncidentOrThrow(incidentId, tenantId);
    const action = incident.addAction(props.actionType, props.description, actorId, props.performedAt);
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
    return { actionId: action.id };
  }

  async completeIncidentAction(incidentId: string, actionId: string, outcome: string, _actorId: string, tenantId: string): Promise<void> {
    const incident = await this.getIncidentOrThrow(incidentId, tenantId);
    incident.completeAction(actionId, outcome, new Date().toISOString());
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
  }

  async resolveIncident(incidentId: string, resolutionNotes: string, _actorId: string, tenantId: string): Promise<void> {
    const incident = await this.getIncidentOrThrow(incidentId, tenantId);
    incident.resolve(new Date().toISOString(), resolutionNotes);
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
  }

  async notifyIncidentGuardian(incidentId: string, actorId: string, tenantId: string): Promise<void> {
    const incident = await this.getIncidentOrThrow(incidentId, tenantId);
    incident.notifyGuardian(actorId, new Date().toISOString());
    await this.incidents.save(incident);
    await this.eventBus.publishAll(incident.commit());
  }

  // ─── Daily report ──────────────────────────────────

  async generateDailyReport(attendanceId: string, summaries: {
    summary?: string;
    moodSummary?: string;
    mealsSummary?: string;
    activitiesSummary?: string;
    napSummary?: string;
    toiletSummary?: string;
    highlights?: string[];
    teacherNotes?: string;
  }, actorId: string, tenantId: string): Promise<DailyReportAggregate> {
    const attendance = await this.getAttendanceOrThrow(attendanceId, tenantId);
    if (attendance.status === 'ABSENT' || attendance.status === 'LEAVE') {
      throw new ConflictException(
        'DAILY_REPORT_NOT_APPLICABLE',
        `Cannot generate daily report for ${attendance.status} student`,
      );
    }

    // Check if report already exists for this attendance
    const existing = await this.dailyReports.findByAttendance(attendanceId);
    if (existing) {
      existing.generate(actorId, new Date().toISOString(), summaries);
      await this.dailyReports.save(existing);
      await this.eventBus.publishAll(existing.commit());
      return existing;
    }

    const report = DailyReportAggregate.create({
      tenantId,
      studentId: attendance.studentId,
      attendanceId,
      classroomId: attendance.classroomId,
      reportDate: attendance.attendanceDate,
    });
    report.generate(actorId, new Date().toISOString(), summaries);
    await this.dailyReports.save(report);
    await this.eventBus.publishAll(report.commit());
    return report;
  }

  async addDailyReportHighlight(dailyReportId: string, highlight: string, tenantId: string): Promise<void> {
    const report = await this.getDailyReportOrThrow(dailyReportId, tenantId);
    report.addHighlight(highlight);
    await this.dailyReports.save(report);
    await this.eventBus.publishAll(report.commit());
  }

  async sendDailyReport(dailyReportId: string, tenantId: string): Promise<void> {
    const report = await this.getDailyReportOrThrow(dailyReportId, tenantId);
    report.sendToParent(new Date().toISOString());
    await this.dailyReports.save(report);
    await this.eventBus.publishAll(report.commit());
  }

  // ─── Queries ───────────────────────────────────────

  async getAttendance(attendanceId: string, tenantId: string): Promise<AttendanceAggregate | undefined> {
    return this.attendances.findById(attendanceId);
  }

  async listAttendance(filter: AttendanceListFilter, page: number, pageSize: number) {
    return this.attendances.list(filter, page, pageSize);
  }

  async getClassroomSummary(classroomId: string, date: string, _tenantId: string) {
    return this.attendances.getClassroomSummary(classroomId, date);
  }

  async getIncident(incidentId: string, tenantId: string): Promise<IncidentReportAggregate | undefined> {
    return this.incidents.findById(incidentId);
  }

  async listIncidents(filter: IncidentListFilter, page: number, pageSize: number) {
    return this.incidents.list(filter, page, pageSize);
  }

  async getDailyReport(dailyReportId: string, tenantId: string): Promise<DailyReportAggregate | undefined> {
    return this.dailyReports.findById(dailyReportId);
  }

  // ─── Helpers ───────────────────────────────────────

  private async getAttendanceOrThrow(attendanceId: string, tenantId: string): Promise<AttendanceAggregate> {
    const a = await this.attendances.findById(attendanceId);
    if (!a || a.tenantId !== tenantId) {
      throw new NotFoundException('Attendance', attendanceId);
    }
    return a;
  }

  private async getIncidentOrThrow(incidentId: string, tenantId: string): Promise<IncidentReportAggregate> {
    const i = await this.incidents.findById(incidentId);
    if (!i || i.tenantId !== tenantId) {
      throw new NotFoundException('Incident', incidentId);
    }
    return i;
  }

  private async getDailyReportOrThrow(dailyReportId: string, tenantId: string): Promise<DailyReportAggregate> {
    const r = await this.dailyReports.findById(dailyReportId);
    if (!r || r.tenantId !== tenantId) {
      throw new NotFoundException('DailyReport', dailyReportId);
    }
    return r;
  }
}
