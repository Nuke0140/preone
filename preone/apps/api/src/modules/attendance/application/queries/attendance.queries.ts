/**
 * Attendance Queries — read-side projections (BTD §12.3).
 */
import type { Query, QueryMetadata } from '@shared/cqrs';

import type { ListAttendanceQuery, ListIncidentsQuery } from '../dto/attendance.dto';

export class GetAttendanceQuery implements Query<{ attendanceId: string; tenantId: string }, unknown> {
  readonly type = 'Attendance.GetAttendance';
  constructor(readonly payload: { attendanceId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListAttendanceQueryQuery implements Query<ListAttendanceQuery & { tenantId: string }, { items: unknown[]; total: number; page: number; pageSize: number }> {
  readonly type = 'Attendance.ListAttendance';
  constructor(readonly payload: ListAttendanceQuery & { tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetClassroomAttendanceSummaryQuery implements Query<{ classroomId: string; date: string; tenantId: string }, unknown> {
  readonly type = 'Attendance.GetClassroomSummary';
  constructor(readonly payload: { classroomId: string; date: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetIncidentQuery implements Query<{ incidentId: string; tenantId: string }, unknown> {
  readonly type = 'Attendance.GetIncident';
  constructor(readonly payload: { incidentId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class ListIncidentsQueryQuery implements Query<ListIncidentsQuery & { tenantId: string }, { items: unknown[]; total: number; page: number; pageSize: number }> {
  readonly type = 'Attendance.ListIncidents';
  constructor(readonly payload: ListIncidentsQuery & { tenantId: string }, readonly metadata: QueryMetadata) {}
}

export class GetDailyReportQuery implements Query<{ dailyReportId: string; tenantId: string }, unknown> {
  readonly type = 'Attendance.GetDailyReport';
  constructor(readonly payload: { dailyReportId: string; tenantId: string }, readonly metadata: QueryMetadata) {}
}
