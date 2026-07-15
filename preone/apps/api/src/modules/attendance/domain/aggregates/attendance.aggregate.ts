/**
 * AttendanceAggregate — per-student per-day attendance + child entities:
 * corrections, arrival/pickup logs, late pickup/arrival, early departure.
 *
 * Per ERD v3.0 §16.4.2: "Per-student per-day attendance record with
 *   check-in/check-out timestamps."
 *
 * Invariants:
 *   - One attendance per (studentId, attendanceDate) — enforced by unique index
 *   - status ∈ {PRESENT, ABSENT, LATE, HALF_DAY, LEAVE}
 *   - checkInAt < checkOutAt (when both present)
 *   - Cannot mark attendance for a future date
 *   - Corrections require approval (two-step: corrected → approved)
 *   - Arrival log is 1:1 with attendance
 *   - Pickup log is 1:1 with attendance
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { Entity } from '@shared/kernel/entity';

import {
  ArrivalLoggedEvent, AttendanceCorrectedEvent, AttendanceMarkedEvent,
  LatePickupRecordedEvent, PickupLoggedEvent,
} from '../events/attendance-events';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
export type ArrivalMode = 'WALK_IN' | 'CAR' | 'BUS' | 'AUTO' | 'OTHER';
export type PickupMode = 'WALK_IN' | 'CAR' | 'BUS' | 'AUTO' | 'AFTER_SCHOOL' | 'OTHER';
export type AttendanceSource = 'MANUAL' | 'BIOMETRIC' | 'RFID' | 'APP';

// ─────────────────────────────────────────────
// Child: Correction
// ─────────────────────────────────────────────

export interface AttendanceCorrectionProps {
  id: string;
  correctedBy: string;
  approvedBy?: string;
  fromStatus: AttendanceStatus;
  toStatus: AttendanceStatus;
  reason: string;
  correctedAt: string;
  approvedAt?: string;
  isApproved: boolean;
}

export class AttendanceCorrectionEntity extends Entity<AttendanceCorrectionProps> {
  get isApproved(): boolean { return this._props.isApproved; }
  get toStatus(): AttendanceStatus { return this._props.toStatus; }

  approve(approvedBy: string, approvedAt: string): void {
    this._props.approvedBy = approvedBy;
    this._props.approvedAt = approvedAt;
    this._props.isApproved = true;
  }
}

// ─────────────────────────────────────────────
// Root: Attendance
// ─────────────────────────────────────────────

export interface AttendanceProps {
  tenantId: string;
  studentId: string;
  classroomId: string;
  academicSessionId: string;

  attendanceDate: string; // ISO date
  status: AttendanceStatus;

  checkInAt?: string;
  checkOutAt?: string;
  arrivalMode?: ArrivalMode;
  pickupMode?: PickupMode;
  pickupGuardianId?: string;

  markedBy?: string;
  markedAt: string;
  notes?: string;
  source: AttendanceSource;

  corrections: Map<string, AttendanceCorrectionEntity>;

  // 1:1 child logs (optional)
  arrivalLog?: {
    arrivalAt: string;
    arrivalMode: ArrivalMode;
    droppedByGuardianId?: string;
    recordedBy: string;
    isLate: boolean;
    notes?: string;
  };
  pickupLog?: {
    pickupAt: string;
    pickupMode: PickupMode;
    pickedByGuardianId?: string;
    pickedByAuthorizedPerson?: string;
    recordedBy: string;
    isLate: boolean;
    notes?: string;
  };
  latePickup?: {
    scheduledPickup: string;
    actualPickup: string;
    delayMinutes: number;
    feeChargedCents?: number;
    reason?: string;
    guardianNotifiedAt?: string;
  };
  lateArrival?: {
    scheduledStart: string;
    actualArrival: string;
    delayMinutes: number;
    reason?: string;
    notifiedAt?: string;
  };
  earlyDeparture?: {
    scheduledEnd: string;
    actualDeparture: string;
    earlyMinutes: number;
    reason?: string;
    approvedBy?: string;
  };

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export class AttendanceAggregate extends AggregateRoot<AttendanceProps> {
  get tenantId(): string { return this._props.tenantId; }
  get studentId(): string { return this._props.studentId; }
  get classroomId(): string { return this._props.classroomId; }
  get attendanceDate(): string { return this._props.attendanceDate; }
  get status(): AttendanceStatus { return this._props.status; }
  get corrections(): AttendanceCorrectionEntity[] {
    return Array.from(this._props.corrections.values());
  }

  static create(props: Omit<AttendanceProps, 'corrections' | 'createdAt' | 'updatedAt'>): AttendanceAggregate {
    if (new Date(props.attendanceDate) > new Date()) {
      throw new Error('Cannot mark attendance for a future date');
    }
    const now = new Date().toISOString();
    const agg = new AttendanceAggregate({
      ...props,
      corrections: new Map(),
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new AttendanceMarkedEvent({
      attendanceId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      classroomId: agg._props.classroomId,
      attendanceDate: agg._props.attendanceDate,
      status: agg._props.status,
      markedBy: agg._props.markedBy ?? '',
      source: agg._props.source,
    }));

    return agg;
  }

  updateStatus(newStatus: AttendanceStatus, markedBy: string, markedAt: string, notes?: string): void {
    this._props.status = newStatus;
    this._props.markedBy = markedBy;
    this._props.markedAt = markedAt;
    if (notes !== undefined) this._props.notes = notes;
    this._touch();
    this._addDomainEvent(new AttendanceMarkedEvent({
      attendanceId: this.id,
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      classroomId: this._props.classroomId,
      attendanceDate: this._props.attendanceDate,
      status: newStatus,
      markedBy,
      source: this._props.source,
    }));
  }

  setCheckIn(checkInAt: string, arrivalMode: ArrivalMode): void {
    if (this._props.checkOutAt && new Date(checkInAt) > new Date(this._props.checkOutAt)) {
      throw new Error('checkInAt cannot be after checkOutAt');
    }
    this._props.checkInAt = checkInAt;
    this._props.arrivalMode = arrivalMode;
    this._touch();
  }

  setCheckOut(checkOutAt: string, pickupMode: PickupMode, pickupGuardianId?: string): void {
    if (this._props.checkInAt && new Date(checkOutAt) < new Date(this._props.checkInAt)) {
      throw new Error('checkOutAt cannot be before checkInAt');
    }
    this._props.checkOutAt = checkOutAt;
    this._props.pickupMode = pickupMode;
    this._props.pickupGuardianId = pickupGuardianId;
    this._touch();
  }

  // ─── Corrections ────────────────────────────────

  correct(correctedBy: string, fromStatus: AttendanceStatus, toStatus: AttendanceStatus, reason: string, correctedAt: string): AttendanceCorrectionEntity {
    if (fromStatus !== this._props.status) {
      throw new Error(`fromStatus (${fromStatus}) does not match current status (${this._props.status})`);
    }
    const correction = new AttendanceCorrectionEntity({
      id: crypto.randomUUID(),
      correctedBy,
      fromStatus,
      toStatus,
      reason,
      correctedAt,
      isApproved: false,
    });
    this._props.corrections.set(correction.id, correction);
    // Apply immediately (corrected but pending approval)
    this._props.status = toStatus;
    this._touch();
    this._addDomainEvent(new AttendanceCorrectedEvent({
      attendanceId: this.id,
      tenantId: this._props.tenantId,
      correctedBy,
      fromStatus,
      toStatus,
      reason,
    }));
    return correction;
  }

  approveCorrection(correctionId: string, approvedBy: string, approvedAt: string): void {
    const c = this._props.corrections.get(correctionId);
    if (!c) throw new Error(`Correction ${correctionId} not found`);
    c.approve(approvedBy, approvedAt);
    this._touch();
  }

  // ─── Arrival / Pickup ──────────────────────────

  logArrival(arrivalAt: string, arrivalMode: ArrivalMode, recordedBy: string, droppedByGuardianId?: string, notes?: string): void {
    if (this._props.arrivalLog) {
      throw new Error('Arrival already logged for this attendance');
    }
    const isLate = this._isLateArrival(arrivalAt);
    this._props.arrivalLog = {
      arrivalAt, arrivalMode, droppedByGuardianId, recordedBy, isLate, notes,
    };
    if (!this._props.checkInAt) this._props.checkInAt = arrivalAt;
    if (!this._props.arrivalMode) this._props.arrivalMode = arrivalMode;
    this._touch();
    this._addDomainEvent(new ArrivalLoggedEvent({
      attendanceId: this.id,
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      arrivalAt,
      arrivalMode,
      isLate,
    }));
  }

  logPickup(pickupAt: string, pickupMode: PickupMode, recordedBy: string, pickedByGuardianId?: string, pickedByAuthorizedPerson?: string, notes?: string): void {
    if (this._props.pickupLog) {
      throw new Error('Pickup already logged for this attendance');
    }
    const isLate = this._isLatePickup(pickupAt);
    this._props.pickupLog = {
      pickupAt, pickupMode, pickedByGuardianId, pickedByAuthorizedPerson, recordedBy, isLate, notes,
    };
    if (!this._props.checkOutAt) this._props.checkOutAt = pickupAt;
    if (!this._props.pickupMode) this._props.pickupMode = pickupMode;
    this._props.pickupGuardianId = pickedByGuardianId;
    this._touch();
    this._addDomainEvent(new PickupLoggedEvent({
      attendanceId: this.id,
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      pickupAt,
      pickupMode,
      isLate,
    }));

    if (isLate) {
      this._recordLatePickup(pickupAt);
    }
  }

  private _recordLatePickup(actualPickup: string): void {
    // Scheduled pickup = 6 PM local (configurable; for now hard-coded)
    const scheduled = new Date(actualPickup);
    scheduled.setHours(18, 0, 0, 0);
    const delayMin = Math.max(0, Math.round((new Date(actualPickup).getTime() - scheduled.getTime()) / 60_000));
    this._props.latePickup = {
      scheduledPickup: scheduled.toISOString(),
      actualPickup,
      delayMinutes: delayMin,
      // Default fee: ₹1/minute late (in cents)
      feeChargedCents: delayMin * 100,
    };
    this._addDomainEvent(new LatePickupRecordedEvent({
      latePickupId: crypto.randomUUID(),
      tenantId: this._props.tenantId,
      studentId: this._props.studentId,
      delayMinutes: delayMin,
      feeChargedCents: this._props.latePickup.feeChargedCents ?? null,
    }));
  }

  private _isLateArrival(arrivalAt: string): boolean {
    const a = new Date(arrivalAt);
    const start = new Date(a);
    start.setHours(9, 0, 0, 0); // 9 AM start
    return a > start;
  }

  private _isLatePickup(pickupAt: string): boolean {
    const p = new Date(pickupAt);
    const end = new Date(p);
    end.setHours(18, 0, 0, 0); // 6 PM pickup
    return p > end;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
