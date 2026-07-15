/**
 * Attendance Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Attendance, DailyLog, IncidentReport, and DailyReport aggregates.
 *
 * Integration events (BTD §14):
 *   - AttendanceMarked.v1     → Communication (parent SMS if ABSENT/LATE)
 *   - IncidentReported.v1     → Communication (parent notification within 1h SLA)
 *   - DailyReportSent.v1      → Communication (parent ack tracker)
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────

export class AttendanceMarkedEvent extends DomainEvent<{
  attendanceId: string;
  tenantId: string;
  studentId: string;
  classroomId: string;
  attendanceDate: string;
  status: string;
  markedBy: string;
  source: string;
}> {}

export class AttendanceBulkMarkedEvent extends DomainEvent<{
  tenantId: string;
  classroomId: string;
  attendanceDate: string;
  totalCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  markedBy: string;
}> {}

export class AttendanceCorrectedEvent extends DomainEvent<{
  attendanceId: string;
  tenantId: string;
  correctedBy: string;
  fromStatus: string;
  toStatus: string;
  reason: string;
}> {}

export class ArrivalLoggedEvent extends DomainEvent<{
  attendanceId: string;
  tenantId: string;
  studentId: string;
  arrivalAt: string;
  arrivalMode: string;
  isLate: boolean;
}> {}

export class PickupLoggedEvent extends DomainEvent<{
  attendanceId: string;
  tenantId: string;
  studentId: string;
  pickupAt: string;
  pickupMode: string;
  isLate: boolean;
}> {}

export class LatePickupRecordedEvent extends DomainEvent<{
  latePickupId: string;
  tenantId: string;
  studentId: string;
  delayMinutes: number;
  feeChargedCents: number | null;
}> {}

// ─────────────────────────────────────────────
// Daily logs (meal/nap/toilet/mood/water/medicine)
// ─────────────────────────────────────────────

export class DailyLogRecordedEvent extends DomainEvent<{
  dailyLogId: string;
  tenantId: string;
  studentId: string;
  attendanceId: string;
  logType: string; // MEAL | NAP | TOILET | MOOD | WATER | MEDICINE
  recordedBy: string;
  loggedAt: string;
}> {}

export class MedicineAuthorizationGrantedEvent extends DomainEvent<{
  medicineAuthId: string;
  tenantId: string;
  studentId: string;
  medicineName: string;
  dosage: string;
  grantedBy: string;
}> {}

export class MedicineAdministrationLoggedEvent extends DomainEvent<{
  dailyLogId: string;
  tenantId: string;
  studentId: string;
  medicineName: string;
  administeredBy: string;
  administeredAt: string;
}> {}

// ─────────────────────────────────────────────
// Incident
// ─────────────────────────────────────────────

export class IncidentReportedEvent extends DomainEvent<{
  incidentId: string;
  tenantId: string;
  studentId: string;
  classroomId: string;
  incidentType: string;
  severity: string;
  occurredAt: string;
  reportedBy: string;
}> {}

export class IncidentActionAddedEvent extends DomainEvent<{
  incidentId: string;
  tenantId: string;
  actionId: string;
  actionType: string;
  performedBy: string;
  performedAt: string;
}> {}

export class IncidentResolvedEvent extends DomainEvent<{
  incidentId: string;
  tenantId: string;
  resolvedAt: string;
  resolutionNotes: string;
}> {}

export class IncidentEscalatedEvent extends DomainEvent<{
  incidentId: string;
  tenantId: string;
  fromSeverity: string;
  toSeverity: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Daily Report
// ─────────────────────────────────────────────

export class DailyReportGeneratedEvent extends DomainEvent<{
  dailyReportId: string;
  tenantId: string;
  studentId: string;
  reportDate: string;
  generatedBy: string;
}> {}

export class DailyReportSentEvent extends DomainEvent<{
  dailyReportId: string;
  tenantId: string;
  studentId: string;
  sentToParentAt: string;
}> {}
