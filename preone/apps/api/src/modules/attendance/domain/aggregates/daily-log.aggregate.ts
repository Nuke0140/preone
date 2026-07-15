/**
 * DailyLogAggregate — single log entry for meal/nap/toilet/mood/water/medicine.
 *
 * Per ERD v3.0 §16.4.9-16.4.16: Per-student per-activity daily logs.
 *
 * Invariants:
 *   - logType ∈ {MEAL, NAP, TOILET, MOOD, WATER, MEDICINE}
 *   - For MEDICINE logs, an active MedicineAuthorization must exist (checked in service)
 *   - payload is type-specific JSON (e.g., {mealType, rating} for MEAL)
 *   - loggedAt cannot be in the future
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { DailyLogRecordedEvent } from '../events/attendance-events';

export type DailyLogType = 'MEAL' | 'NAP' | 'TOILET' | 'MOOD' | 'WATER' | 'MEDICINE';

export interface MealPayload {
  mealType: 'BREAKFAST' | 'MORNING_SNACK' | 'LUNCH' | 'AFTERNOON_SNACK' | 'DINNER';
  rating: 'ATE_WELL' | 'ATE_SOME' | 'ATE_LITTLE' | 'REFUSED' | 'NOT_SERVED';
  quantity?: string;
}

export interface NapPayload {
  quality: 'SLEPT_WELL' | 'RESTLESS' | 'DID_NOT_SLEEP' | 'SHORT_NAP';
  durationMinutes: number;
  startedAt?: string;
  endedAt?: string;
}

export interface ToiletPayload {
  type: 'WET' | 'BOWEL' | 'DRY' | 'ACCIDENT';
  isToiletTraining: boolean;
  notes?: string;
}

export interface MoodPayload {
  rating: 'HAPPY' | 'CALM' | 'NEUTRAL' | 'TIRED' | 'UPSET' | 'AGGRESSIVE' | 'SICK';
  context?: string;
}

export interface WaterPayload {
  intakeMl: number;
  cups?: number;
}

export interface MedicinePayload {
  medicineName: string;
  dosage: string;
  route: 'ORAL' | 'TOPICAL' | 'INHALATION' | 'INJECTION' | 'OPHTHALMIC' | 'OTIC' | 'NASAL' | 'OTHER';
  medicineAuthorizationId: string;
  administeredBy: string;
}

export type DailyLogPayload = MealPayload | NapPayload | ToiletPayload | MoodPayload | WaterPayload | MedicinePayload;

export interface DailyLogProps {
  tenantId: string;
  attendanceId: string;
  studentId: string;
  logType: DailyLogType;
  loggedAt: string;
  recordedBy: string;
  payload: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class DailyLogAggregate extends AggregateRoot<DailyLogProps> {
  get tenantId(): string { return this._props.tenantId; }
  get studentId(): string { return this._props.studentId; }
  get attendanceId(): string { return this._props.attendanceId; }
  get logType(): DailyLogType { return this._props.logType; }
  get loggedAt(): string { return this._props.loggedAt; }
  get payload(): Record<string, unknown> { return this._props.payload; }

  static create(props: Omit<DailyLogProps, 'createdAt' | 'updatedAt'>): DailyLogAggregate {
    if (new Date(props.loggedAt) > new Date()) {
      throw new Error('loggedAt cannot be in the future');
    }
    const now = new Date().toISOString();
    const agg = new DailyLogAggregate({
      ...props,
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new DailyLogRecordedEvent({
      dailyLogId: agg.id,
      tenantId: agg._props.tenantId,
      studentId: agg._props.studentId,
      attendanceId: agg._props.attendanceId,
      logType: agg._props.logType,
      recordedBy: agg._props.recordedBy,
      loggedAt: agg._props.loggedAt,
    }));

    return agg;
  }

  updateNotes(notes: string): void {
    this._props.notes = notes;
    this._props.updatedAt = new Date().toISOString();
  }
}
