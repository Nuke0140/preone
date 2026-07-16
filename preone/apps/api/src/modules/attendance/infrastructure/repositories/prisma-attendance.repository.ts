/**
 * PrismaAttendanceRepository — Prisma implementations for Attendance aggregates.
 *
 * Per BTD §6.1 — Adapter implementations live in infrastructure layer.
 */
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  AttendanceAggregate, AttendanceProps, AttendanceStatus, ArrivalMode, PickupMode,
} from '../../domain/aggregates/attendance.aggregate';
import {
  DailyLogAggregate, DailyLogProps, DailyLogType,
} from '../../domain/aggregates/daily-log.aggregate';
import {
  DailyReportAggregate, DailyReportProps,
} from '../../domain/aggregates/daily-report.aggregate';
import {
  IncidentActionEntity, IncidentReportAggregate, IncidentReportProps,
  IncidentSeverity, IncidentStatus, IncidentType,
} from '../../domain/aggregates/incident-report.aggregate';

import type {
  AttendanceListFilter, AttendanceRepository, DailyLogListFilter,
  DailyLogRepository, DailyReportListFilter, DailyReportRepository,
  IncidentListFilter, IncidentReportRepository,
  MedicineAuthorizationRecord, MedicineAuthorizationRepository,
} from '../../domain/repositories/attendance.repository';

// ─────────────────────────────────────────────
// Mappers
// ─────────────────────────────────────────────

function mapAttendanceRow(row: any): AttendanceAggregate {
  const corrections = new Map();
  for (const c of row.corrections ?? []) {
    corrections.set(c.id, {
      id: c.id, correctedBy: c.correctedBy, approvedBy: c.approvedBy ?? undefined,
      fromStatus: c.fromStatus, toStatus: c.toStatus, reason: c.reason,
      correctedAt: c.correctedAt.toISOString(), approvedAt: c.approvedAt?.toISOString(),
      isApproved: c.isApproved,
    });
  }
  const props: AttendanceProps = {
    tenantId: row.schoolId,
    studentId: row.studentId,
    classroomId: row.classroomId,
    academicSessionId: row.academicSessionId,
    attendanceDate: row.attendanceDate.toISOString().split('T')[0],
    status: row.status,
    checkInAt: row.checkInAt?.toISOString(),
    checkOutAt: row.checkOutAt?.toISOString(),
    arrivalMode: row.arrivalMode ?? undefined,
    pickupMode: row.pickupMode ?? undefined,
    pickupGuardianId: row.pickupGuardianId ?? undefined,
    markedBy: row.markedBy ?? undefined,
    markedAt: row.markedAt.toISOString(),
    notes: row.notes ?? undefined,
    source: row.source,
    corrections,
    arrivalLog: row.arrivalLog ? {
      arrivalAt: row.arrivalLog.arrivalAt.toISOString(),
      arrivalMode: row.arrivalLog.arrivalMode,
      droppedByGuardianId: row.arrivalLog.droppedByGuardianId ?? undefined,
      recordedBy: row.arrivalLog.recordedBy,
      isLate: row.arrivalLog.isLate,
      notes: row.arrivalLog.notes ?? undefined,
    } : undefined,
    pickupLog: row.pickupLog ? {
      pickupAt: row.pickupLog.pickupAt.toISOString(),
      pickupMode: row.pickupLog.pickupMode,
      pickedByGuardianId: row.pickupLog.pickedByGuardianId ?? undefined,
      pickedByAuthorizedPerson: row.pickupLog.pickedByAuthorizedPerson ?? undefined,
      recordedBy: row.pickupLog.recordedBy,
      isLate: row.pickupLog.isLate,
      notes: row.pickupLog.notes ?? undefined,
    } : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString(),
  };
  return new AttendanceAggregate(props, row.id, 1);
}

function mapDailyLogRow(row: any): DailyLogAggregate {
  const props: DailyLogProps = {
    tenantId: row.schoolId,
    attendanceId: row.attendanceId,
    studentId: row.studentId,
    logType: row.logType as DailyLogType,
    loggedAt: row.loggedAt.toISOString(),
    recordedBy: row.recordedBy,
    payload: row.payload as Record<string, unknown>,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return new DailyLogAggregate(props, row.id, 1);
}

function mapIncidentRow(row: any): IncidentReportAggregate {
  const actions = new Map<string, IncidentActionEntity>();
  for (const a of row.actions ?? []) {
    const entity = new IncidentActionEntity({
      id: a.id,
      actionType: a.actionType,
      description: a.description,
      performedBy: a.performedBy,
      performedAt: a.performedAt.toISOString(),
      outcome: a.outcome ?? undefined,
      isCompleted: a.isCompleted,
      completedAt: a.completedAt?.toISOString(),
    }, a.id, 1);
    actions.set(a.id, entity);
  }
  const props: IncidentReportProps = {
    tenantId: row.schoolId,
    studentId: row.studentId,
    classroomId: row.classroomId,
    incidentType: row.incidentType as IncidentType,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    occurredAt: row.occurredAt.toISOString(),
    reportedAt: row.reportedAt.toISOString(),
    reportedBy: row.reportedBy,
    location: row.location ?? undefined,
    description: row.description,
    immediateAction: row.immediateAction ?? undefined,
    guardianNotifiedAt: row.guardianNotifiedAt?.toISOString(),
    guardianNotifiedBy: row.guardianNotifiedBy ?? undefined,
    resolvedAt: row.resolvedAt?.toISOString(),
    resolutionNotes: row.resolutionNotes ?? undefined,
    actions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return new IncidentReportAggregate(props, row.id, 1);
}

function mapDailyReportRow(row: any): DailyReportAggregate {
  const props: DailyReportProps = {
    tenantId: row.schoolId,
    studentId: row.studentId,
    attendanceId: row.attendanceId,
    classroomId: row.classroomId,
    reportDate: row.reportDate.toISOString().split('T')[0],
    templateId: row.templateId ?? undefined,
    summary: row.summary ?? undefined,
    moodSummary: row.moodSummary ?? undefined,
    mealsSummary: row.mealsSummary ?? undefined,
    activitiesSummary: row.activitiesSummary ?? undefined,
    napSummary: row.napSummary ?? undefined,
    toiletSummary: row.toiletSummary ?? undefined,
    highlights: row.highlights as string[] ?? [],
    teacherNotes: row.teacherNotes ?? undefined,
    status: row.status as 'DRAFT' | 'GENERATED' | 'SENT' | 'ACKNOWLEDGED',
    generatedAt: row.generatedAt?.toISOString(),
    generatedBy: row.generatedBy ?? undefined,
    sentToParentAt: row.sentToParentAt?.toISOString(),
    parentAckAt: row.parentAckAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return new DailyReportAggregate(props, row.id, 1);
}

// ─────────────────────────────────────────────
// AttendanceRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaAttendanceRepository implements AttendanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AttendanceAggregate | undefined> {
    const row = await this.prisma.attendance.findUnique({
      where: { id },
      include: { corrections: true, arrivalLog: true, pickupLog: true, latePickup: true, lateArrival: true, earlyDeparture: true },
    });
    if (!row || row.deletedAt) return undefined;
    return mapAttendanceRow(row);
  }

  async findByStudentAndDate(studentId: string, date: string): Promise<AttendanceAggregate | undefined> {
    const row = await this.prisma.attendance.findUnique({
      where: { studentId_attendanceDate: { studentId, attendanceDate: new Date(date) } },
      include: { corrections: true, arrivalLog: true, pickupLog: true },
    });
    if (!row || row.deletedAt) return undefined;
    return mapAttendanceRow(row);
  }

  async findByClassroomAndDate(classroomId: string, date: string): Promise<AttendanceAggregate[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { classroomId, attendanceDate: new Date(date), deletedAt: null },
      include: { corrections: true, arrivalLog: true, pickupLog: true },
    });
    return rows.map(mapAttendanceRow);
  }

  async list(filter: AttendanceListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      deletedAt: null,
      ...(filter.classroomId ? { classroomId: filter.classroomId } : {}),
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.academicSessionId ? { academicSessionId: filter.academicSessionId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.dateFrom || filter.dateTo ? {
        attendanceDate: {
          ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
          ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
        },
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { attendanceDate: 'desc' },
        include: { corrections: true, arrivalLog: true, pickupLog: true },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { items: rows.map(mapAttendanceRow), total };
  }

  async save(agg: AttendanceAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      studentId: p.studentId,
      classroomId: p.classroomId,
      academicSessionId: p.academicSessionId,
      attendanceDate: new Date(p.attendanceDate),
      status: p.status,
      checkInAt: p.checkInAt ? new Date(p.checkInAt) : null,
      checkOutAt: p.checkOutAt ? new Date(p.checkOutAt) : null,
      arrivalMode: p.arrivalMode ?? null,
      pickupMode: p.pickupMode ?? null,
      pickupGuardianId: p.pickupGuardianId ?? null,
      markedBy: p.markedBy ?? null,
      markedAt: new Date(p.markedAt),
      notes: p.notes ?? null,
      source: p.source,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.attendance.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.attendance.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.attendance.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }

    // Sync corrections (delete + recreate)
    await this.prisma.attendanceCorrection.deleteMany({ where: { attendanceId: agg.id } });
    for (const c of p.corrections.values()) {
      await this.prisma.attendanceCorrection.create({
        data: {
          id: c.id, schoolId: p.tenantId, attendanceId: agg.id,
          correctedBy: c._props.correctedBy,
          approvedBy: c._props.approvedBy ?? null,
          fromStatus: c._props.fromStatus, toStatus: c._props.toStatus,
          reason: c._props.reason, correctedAt: new Date(c._props.correctedAt),
          approvedAt: c._props.approvedAt ? new Date(c._props.approvedAt) : null,
          isApproved: c._props.isApproved,
        },
      });
    }

    // Arrival log (1:1)
    if (p.arrivalLog) {
      await this.prisma.arrivalLog.upsert({
        where: { attendanceId: agg.id },
        create: {
          schoolId: p.tenantId, attendanceId: agg.id, studentId: p.studentId,
          droppedByGuardianId: p.arrivalLog.droppedByGuardianId ?? null,
          arrivalAt: new Date(p.arrivalLog.arrivalAt),
          arrivalMode: p.arrivalLog.arrivalMode,
          recordedBy: p.arrivalLog.recordedBy,
          isLate: p.arrivalLog.isLate,
          notes: p.arrivalLog.notes ?? null,
        },
        update: {
          droppedByGuardianId: p.arrivalLog.droppedByGuardianId ?? null,
          arrivalAt: new Date(p.arrivalLog.arrivalAt),
          arrivalMode: p.arrivalLog.arrivalMode,
          recordedBy: p.arrivalLog.recordedBy,
          isLate: p.arrivalLog.isLate,
          notes: p.arrivalLog.notes ?? null,
        },
      });
    }

    // Pickup log (1:1)
    if (p.pickupLog) {
      await this.prisma.pickupLog.upsert({
        where: { attendanceId: agg.id },
        create: {
          schoolId: p.tenantId, attendanceId: agg.id, studentId: p.studentId,
          pickedByGuardianId: p.pickupLog.pickedByGuardianId ?? null,
          pickedByAuthorizedPerson: p.pickupLog.pickedByAuthorizedPerson ?? null,
          pickupAt: new Date(p.pickupLog.pickupAt),
          pickupMode: p.pickupLog.pickupMode,
          recordedBy: p.pickupLog.recordedBy,
          isLate: p.pickupLog.isLate,
          notes: p.pickupLog.notes ?? null,
        },
        update: {
          pickedByGuardianId: p.pickupLog.pickedByGuardianId ?? null,
          pickedByAuthorizedPerson: p.pickupLog.pickedByAuthorizedPerson ?? null,
          pickupAt: new Date(p.pickupLog.pickupAt),
          pickupMode: p.pickupLog.pickupMode,
          recordedBy: p.pickupLog.recordedBy,
          isLate: p.pickupLog.isLate,
          notes: p.pickupLog.notes ?? null,
        },
      });
    }

    // Late pickup (1:1)
    if (p.latePickup) {
      await this.prisma.latePickup.upsert({
        where: { attendanceId: agg.id },
        create: {
          schoolId: p.tenantId, attendanceId: agg.id, studentId: p.studentId,
          scheduledPickup: new Date(p.latePickup.scheduledPickup),
          actualPickup: new Date(p.latePickup.actualPickup),
          delayMinutes: p.latePickup.delayMinutes,
          feeChargedCents: p.latePickup.feeChargedCents ?? null,
          reason: p.latePickup.reason ?? null,
          guardianNotifiedAt: p.latePickup.guardianNotifiedAt ? new Date(p.latePickup.guardianNotifiedAt) : null,
        },
        update: {},
      });
    }
  }

  async saveMany(aggregates: AttendanceAggregate[]): Promise<void> {
    for (const agg of aggregates) await this.save(agg);
  }

  async delete(agg: AttendanceAggregate): Promise<void> {
    await this.prisma.attendance.update({ where: { id: agg.id }, data: { deletedAt: new Date() } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.attendance.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<AttendanceAggregate[]> {
    const rows = await this.prisma.attendance.findMany({
      where: { id: { in: [...ids] } },
      include: { corrections: true, arrivalLog: true, pickupLog: true },
    });
    return rows.map(mapAttendanceRow);
  }

  async getClassroomSummary(classroomId: string, date: string) {
    const rows = await this.prisma.attendance.findMany({
      where: { classroomId, attendanceDate: new Date(date), deletedAt: null },
    });
    const summary = { total: rows.length, present: 0, absent: 0, late: 0, leave: 0 };
    for (const r of rows) {
      if (r.status === 'PRESENT') summary.present++;
      else if (r.status === 'ABSENT' || r.status === 'HALF_DAY') summary.absent++;
      else if (r.status === 'LATE') summary.late++;
      else if (r.status === 'LEAVE') summary.leave++;
    }
    return summary;
  }
}

// ─────────────────────────────────────────────
// DailyLogRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaDailyLogRepository implements DailyLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DailyLogAggregate | undefined> {
    const row = await this.prisma.dailyLog.findUnique({ where: { id } });
    if (!row) return undefined;
    return mapDailyLogRow(row);
  }

  async list(filter: DailyLogListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.attendanceId ? { attendanceId: filter.attendanceId } : {}),
      ...(filter.logType ? { logType: filter.logType } : {}),
      ...(filter.dateFrom || filter.dateTo ? {
        loggedAt: {
          ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
          ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
        },
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.dailyLog.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { loggedAt: 'desc' },
      }),
      this.prisma.dailyLog.count({ where }),
    ]);
    return { items: rows.map(mapDailyLogRow), total };
  }

  async save(agg: DailyLogAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      attendanceId: p.attendanceId,
      studentId: p.studentId,
      logType: p.logType,
      loggedAt: new Date(p.loggedAt),
      recordedBy: p.recordedBy,
      payload: p.payload as any,
      notes: p.notes ?? null,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.dailyLog.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.dailyLog.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.dailyLog.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }
  }

  async delete(agg: DailyLogAggregate): Promise<void> {
    await this.prisma.dailyLog.delete({ where: { id: agg.id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.dailyLog.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<DailyLogAggregate[]> {
    const rows = await this.prisma.dailyLog.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(mapDailyLogRow);
  }
}

// ─────────────────────────────────────────────
// MedicineAuthorizationRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaMedicineAuthorizationRepository implements MedicineAuthorizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MedicineAuthorizationRecord | undefined> {
    const row = await this.prisma.medicineAuthorization.findUnique({ where: { id } });
    if (!row) return undefined;
    return this._map(row);
  }

  async findByStudent(studentId: string, onlyActive = true): Promise<MedicineAuthorizationRecord[]> {
    const rows = await this.prisma.medicineAuthorization.findMany({
      where: { studentId, ...(onlyActive ? { isActive: true } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._map(r));
  }

  async save(record: Omit<MedicineAuthorizationRecord, 'id'> & { id?: string }): Promise<MedicineAuthorizationRecord> {
    const data = {
      schoolId: record.tenantId,
      studentId: record.studentId,
      authorizedByGuardianId: record.authorizedByGuardianId,
      medicineName: record.medicineName,
      dosage: record.dosage,
      route: record.route,
      frequency: record.frequency,
      startAt: new Date(record.startAt),
      endAt: record.endAt ? new Date(record.endAt) : null,
      instructions: record.instructions ?? null,
      prescriptionUrl: record.prescriptionUrl ?? null,
      isVerified: record.isVerified,
      verifiedBy: record.verifiedBy ?? null,
      verifiedAt: record.verifiedAt ? new Date(record.verifiedAt) : null,
      isActive: record.isActive,
    };
    if (record.id) {
      const updated = await this.prisma.medicineAuthorization.update({
        where: { id: record.id }, data,
      });
      return this._map(updated);
    }
    const created = await this.prisma.medicineAuthorization.create({ data });
    return this._map(created);
  }

  async verify(id: string, verifiedBy: string, verifiedAt: string): Promise<void> {
    await this.prisma.medicineAuthorization.update({
      where: { id },
      data: { isVerified: true, verifiedBy, verifiedAt: new Date(verifiedAt) },
    });
  }

  async deactivate(id: string): Promise<void> {
    await this.prisma.medicineAuthorization.update({
      where: { id }, data: { isActive: false },
    });
  }

  private _map(row: any): MedicineAuthorizationRecord {
    return {
      id: row.id,
      tenantId: row.schoolId,
      studentId: row.studentId,
      authorizedByGuardianId: row.authorizedByGuardianId,
      medicineName: row.medicineName,
      dosage: row.dosage,
      route: row.route,
      frequency: row.frequency,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString(),
      instructions: row.instructions ?? undefined,
      prescriptionUrl: row.prescriptionUrl ?? undefined,
      isVerified: row.isVerified,
      verifiedBy: row.verifiedBy ?? undefined,
      verifiedAt: row.verifiedAt?.toISOString(),
      isActive: row.isActive,
    };
  }
}

// ─────────────────────────────────────────────
// IncidentReportRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaIncidentReportRepository implements IncidentReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<IncidentReportAggregate | undefined> {
    const row = await this.prisma.incidentReport.findUnique({
      where: { id }, include: { actions: true },
    });
    if (!row) return undefined;
    return mapIncidentRow(row);
  }

  async list(filter: IncidentListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.classroomId ? { classroomId: filter.classroomId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.severity ? { severity: filter.severity } : {}),
      ...(filter.dateFrom || filter.dateTo ? {
        occurredAt: {
          ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
          ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
        },
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.incidentReport.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { occurredAt: 'desc' },
        include: { actions: true },
      }),
      this.prisma.incidentReport.count({ where }),
    ]);
    return { items: rows.map(mapIncidentRow), total };
  }

  async save(agg: IncidentReportAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      studentId: p.studentId,
      classroomId: p.classroomId,
      incidentType: p.incidentType,
      severity: p.severity,
      status: p.status,
      occurredAt: new Date(p.occurredAt),
      reportedAt: new Date(p.reportedAt),
      reportedBy: p.reportedBy,
      location: p.location ?? null,
      description: p.description,
      immediateAction: p.immediateAction ?? null,
      guardianNotifiedAt: p.guardianNotifiedAt ? new Date(p.guardianNotifiedAt) : null,
      guardianNotifiedBy: p.guardianNotifiedBy ?? null,
      resolvedAt: p.resolvedAt ? new Date(p.resolvedAt) : null,
      resolutionNotes: p.resolutionNotes ?? null,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.incidentReport.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.incidentReport.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.incidentReport.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }

    // Sync actions
    await this.prisma.incidentAction.deleteMany({ where: { incidentId: agg.id } });
    for (const a of p.actions.values()) {
      const ap = a._props;
      await this.prisma.incidentAction.create({
        data: {
          id: a.id, schoolId: p.tenantId, incidentId: agg.id,
          actionType: ap.actionType, description: ap.description,
          performedBy: ap.performedBy, performedAt: new Date(ap.performedAt),
          outcome: ap.outcome ?? null, isCompleted: ap.isCompleted,
          completedAt: ap.completedAt ? new Date(ap.completedAt) : null,
        },
      });
    }
  }

  async delete(agg: IncidentReportAggregate): Promise<void> {
    await this.prisma.incidentReport.delete({ where: { id: agg.id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.incidentReport.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<IncidentReportAggregate[]> {
    const rows = await this.prisma.incidentReport.findMany({
      where: { id: { in: [...ids] } }, include: { actions: true },
    });
    return rows.map(mapIncidentRow);
  }
}

// ─────────────────────────────────────────────
// DailyReportRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaDailyReportRepository implements DailyReportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<DailyReportAggregate | undefined> {
    const row = await this.prisma.dailyReport.findUnique({ where: { id } });
    if (!row) return undefined;
    return mapDailyReportRow(row);
  }

  async findByStudentAndDate(studentId: string, date: string): Promise<DailyReportAggregate | undefined> {
    const row = await this.prisma.dailyReport.findUnique({
      where: { studentId_reportDate: { studentId, reportDate: new Date(date) } },
    });
    if (!row) return undefined;
    return mapDailyReportRow(row);
  }

  async findByAttendance(attendanceId: string): Promise<DailyReportAggregate | undefined> {
    const row = await this.prisma.dailyReport.findUnique({ where: { attendanceId } });
    if (!row) return undefined;
    return mapDailyReportRow(row);
  }

  async list(filter: DailyReportListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.classroomId ? { classroomId: filter.classroomId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.dateFrom || filter.dateTo ? {
        reportDate: {
          ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
          ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
        },
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.dailyReport.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { reportDate: 'desc' },
      }),
      this.prisma.dailyReport.count({ where }),
    ]);
    return { items: rows.map(mapDailyReportRow), total };
  }

  async save(agg: DailyReportAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      studentId: p.studentId,
      attendanceId: p.attendanceId,
      classroomId: p.classroomId,
      reportDate: new Date(p.reportDate),
      templateId: p.templateId ?? null,
      summary: p.summary ?? null,
      moodSummary: p.moodSummary ?? null,
      mealsSummary: p.mealsSummary ?? null,
      activitiesSummary: p.activitiesSummary ?? null,
      napSummary: p.napSummary ?? null,
      toiletSummary: p.toiletSummary ?? null,
      highlights: p.highlights as any,
      teacherNotes: p.teacherNotes ?? null,
      status: p.status,
      generatedAt: p.generatedAt ? new Date(p.generatedAt) : undefined,
      generatedBy: p.generatedBy ?? null,
      sentToParentAt: p.sentToParentAt ? new Date(p.sentToParentAt) : undefined,
      parentAckAt: p.parentAckAt ? new Date(p.parentAckAt) : undefined,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.dailyReport.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.dailyReport.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.dailyReport.create({
        data: {
          id: agg.id,
          schoolId: p.tenantId,
          studentId: p.studentId,
          attendanceId: p.attendanceId,
          classroomId: p.classroomId,
          reportDate: new Date(p.reportDate),
          templateId: p.templateId ?? null,
          summary: p.summary ?? null,
          moodSummary: p.moodSummary ?? null,
          mealsSummary: p.mealsSummary ?? null,
          activitiesSummary: p.activitiesSummary ?? null,
          napSummary: p.napSummary ?? null,
          toiletSummary: p.toiletSummary ?? null,
          highlights: p.highlights as any,
          teacherNotes: p.teacherNotes ?? null,
          status: p.status,
          generatedAt: p.generatedAt ? new Date(p.generatedAt) : new Date(),
          generatedBy: p.generatedBy ?? null,
          sentToParentAt: p.sentToParentAt ? new Date(p.sentToParentAt) : null,
          parentAckAt: p.parentAckAt ? new Date(p.parentAckAt) : null,
          createdAt: new Date(p.createdAt),
        },
      });
    }
  }

  async delete(agg: DailyReportAggregate): Promise<void> {
    await this.prisma.dailyReport.delete({ where: { id: agg.id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.dailyReport.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<DailyReportAggregate[]> {
    const rows = await this.prisma.dailyReport.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(mapDailyReportRow);
  }
}
