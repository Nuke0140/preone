/**
 * Attendance Repository Ports — interfaces for Attendance aggregates.
 */
import type { IRepository } from '@shared/kernel/repository';

import type { AttendanceAggregate, AttendanceStatus } from '../aggregates/attendance.aggregate';
import type { DailyLogAggregate, DailyLogType } from '../aggregates/daily-log.aggregate';
import type { DailyReportAggregate } from '../aggregates/daily-report.aggregate';
import type { IncidentReportAggregate, IncidentSeverity, IncidentStatus } from '../aggregates/incident-report.aggregate';

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────

export interface AttendanceListFilter {
  tenantId: string;
  classroomId?: string;
  studentId?: string;
  academicSessionId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: AttendanceStatus;
}

export interface AttendanceBulkMarker {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceRepository extends IRepository<AttendanceAggregate> {
  findById(id: string): Promise<AttendanceAggregate | undefined>;
  findByStudentAndDate(studentId: string, date: string): Promise<AttendanceAggregate | undefined>;
  findByClassroomAndDate(classroomId: string, date: string): Promise<AttendanceAggregate[]>;
  list(filter: AttendanceListFilter, page: number, pageSize: number): Promise<{
    items: AttendanceAggregate[];
    total: number;
  }>;
  save(aggregate: AttendanceAggregate): Promise<void>;
  saveMany(aggregates: AttendanceAggregate[]): Promise<void>;
  delete(aggregate: AttendanceAggregate): Promise<void>;
  getClassroomSummary(classroomId: string, date: string): Promise<{
    total: number; present: number; absent: number; late: number; leave: number;
  }>;
}

// ─────────────────────────────────────────────
// Daily Log
// ─────────────────────────────────────────────

export interface DailyLogListFilter {
  tenantId: string;
  studentId?: string;
  attendanceId?: string;
  logType?: DailyLogType;
  dateFrom?: string;
  dateTo?: string;
}

export interface DailyLogRepository extends IRepository<DailyLogAggregate> {
  findById(id: string): Promise<DailyLogAggregate | undefined>;
  list(filter: DailyLogListFilter, page: number, pageSize: number): Promise<{
    items: DailyLogAggregate[];
    total: number;
  }>;
  save(aggregate: DailyLogAggregate): Promise<void>;
  delete(aggregate: DailyLogAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Medicine Authorization (separate table, no aggregate root needed)
// ─────────────────────────────────────────────

export interface MedicineAuthorizationRecord {
  id: string;
  tenantId: string;
  studentId: string;
  authorizedByGuardianId: string;
  medicineName: string;
  dosage: string;
  route: 'ORAL' | 'TOPICAL' | 'INHALATION' | 'INJECTION' | 'OPHTHALMIC' | 'OTIC' | 'NASAL' | 'OTHER';
  frequency: string;
  startAt: string;
  endAt?: string;
  instructions?: string;
  prescriptionUrl?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  isActive: boolean;
}

export interface MedicineAuthorizationRepository {
  findById(id: string): Promise<MedicineAuthorizationRecord | undefined>;
  findByStudent(studentId: string, onlyActive?: boolean): Promise<MedicineAuthorizationRecord[]>;
  save(record: Omit<MedicineAuthorizationRecord, 'id'> & { id?: string }): Promise<MedicineAuthorizationRecord>;
  verify(id: string, verifiedBy: string, verifiedAt: string): Promise<void>;
  deactivate(id: string): Promise<void>;
}

// ─────────────────────────────────────────────
// Incident Report
// ─────────────────────────────────────────────

export interface IncidentListFilter {
  tenantId: string;
  studentId?: string;
  classroomId?: string;
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  dateFrom?: string;
  dateTo?: string;
}

export interface IncidentReportRepository extends IRepository<IncidentReportAggregate> {
  findById(id: string): Promise<IncidentReportAggregate | undefined>;
  list(filter: IncidentListFilter, page: number, pageSize: number): Promise<{
    items: IncidentReportAggregate[];
    total: number;
  }>;
  save(aggregate: IncidentReportAggregate): Promise<void>;
  delete(aggregate: IncidentReportAggregate): Promise<void>;
}

// ─────────────────────────────────────────────
// Daily Report
// ─────────────────────────────────────────────

export interface DailyReportListFilter {
  tenantId: string;
  studentId?: string;
  classroomId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED';
}

export interface DailyReportRepository extends IRepository<DailyReportAggregate> {
  findById(id: string): Promise<DailyReportAggregate | undefined>;
  findByStudentAndDate(studentId: string, date: string): Promise<DailyReportAggregate | undefined>;
  findByAttendance(attendanceId: string): Promise<DailyReportAggregate | undefined>;
  list(filter: DailyReportListFilter, page: number, pageSize: number): Promise<{
    items: DailyReportAggregate[];
    total: number;
  }>;
  save(aggregate: DailyReportAggregate): Promise<void>;
  delete(aggregate: DailyReportAggregate): Promise<void>;
}
