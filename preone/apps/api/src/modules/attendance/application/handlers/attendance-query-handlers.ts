/**
 * Attendance Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';

import {
  GetAttendanceQuery, GetClassroomAttendanceSummaryQuery, GetDailyReportQuery,
  GetIncidentQuery, ListAttendanceQueryQuery, ListIncidentsQueryQuery,
} from '../queries/attendance.queries';
import { AttendanceService } from '../services/attendance.service';

@Injectable()
export class GetAttendanceQueryHandler implements QueryHandler<GetAttendanceQuery> {
  private static readonly TYPE = 'Attendance.GetAttendance';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(GetAttendanceQueryHandler.TYPE, this);
  }
  async handle(q: GetAttendanceQuery) {
    return this.svc.getAttendance(q.payload.attendanceId, q.payload.tenantId);
  }
}

@Injectable()
export class ListAttendanceQueryHandler implements QueryHandler<ListAttendanceQueryQuery> {
  private static readonly TYPE = 'Attendance.ListAttendance';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(ListAttendanceQueryHandler.TYPE, this);
  }
  async handle(q: ListAttendanceQueryQuery) {
    const { tenantId, page, pageSize, ...filter } = q.payload;
    return this.svc.listAttendance({ tenantId, ...filter }, page, pageSize);
  }
}

@Injectable()
export class GetClassroomSummaryQueryHandler implements QueryHandler<GetClassroomAttendanceSummaryQuery> {
  private static readonly TYPE = 'Attendance.GetClassroomSummary';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(GetClassroomSummaryQueryHandler.TYPE, this);
  }
  async handle(q: GetClassroomAttendanceSummaryQuery) {
    return this.svc.getClassroomSummary(q.payload.classroomId, q.payload.date, q.payload.tenantId);
  }
}

@Injectable()
export class GetIncidentQueryHandler implements QueryHandler<GetIncidentQuery> {
  private static readonly TYPE = 'Attendance.GetIncident';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(GetIncidentQueryHandler.TYPE, this);
  }
  async handle(q: GetIncidentQuery) {
    return this.svc.getIncident(q.payload.incidentId, q.payload.tenantId);
  }
}

@Injectable()
export class ListIncidentsQueryHandler implements QueryHandler<ListIncidentsQueryQuery> {
  private static readonly TYPE = 'Attendance.ListIncidents';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(ListIncidentsQueryHandler.TYPE, this);
  }
  async handle(q: ListIncidentsQueryQuery) {
    const { tenantId, page, pageSize, ...filter } = q.payload;
    return this.svc.listIncidents({ tenantId, ...filter }, page, pageSize);
  }
}

@Injectable()
export class GetDailyReportQueryHandler implements QueryHandler<GetDailyReportQuery> {
  private static readonly TYPE = 'Attendance.GetDailyReport';
  constructor(private readonly bus: QueryBus, private readonly svc: AttendanceService) {
    bus.register(GetDailyReportQueryHandler.TYPE, this);
  }
  async handle(q: GetDailyReportQuery) {
    return this.svc.getDailyReport(q.payload.dailyReportId, q.payload.tenantId);
  }
}
