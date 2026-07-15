/**
 * AdmissionAggregate — final admission record created after Application approval.
 *
 * Per ERD v3.0 §13.4.7: "Final admission record created after all approvals.
 *   Triggers student record creation."
 *
 * Lifecycle: ACTIVE → {CANCELLED | GRADUATED | TRANSFERRED}
 *
 * Invariants:
 *   - admissionNumber is immutable + unique per school
 *   - studentId may be NULL until Identity module creates the student (via
 *     AdmissionApproved.v1 integration event)
 *   - Cancellation requires reason + refund calculation
 *   - Cannot cancel a non-ACTIVE admission
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { AdmissionCancelledEvent, AdmissionCreatedEvent } from '../events/admissions-events';

export type AdmissionStatus = 'ACTIVE' | 'CANCELLED' | 'GRADUATED' | 'TRANSFERRED';

export interface AdmissionProps {
  tenantId: string;
  applicationId: string;
  admissionNumber: string;

  studentId?: string;
  classroomId?: string;
  feePlanId?: string;

  admissionDate: string;
  admissionType: 'REGULAR' | 'LATE' | 'TRANSFER' | 'MID_SESSION' | 'READMISSION';
  status: AdmissionStatus;

  cancelledAt?: string;
  cancellationReason?: string;
  refundDueCents?: number;

  createdAt: string;
  updatedAt: string;
}

const ALLOWED: Record<AdmissionStatus, AdmissionStatus[]> = {
  ACTIVE: ['CANCELLED', 'GRADUATED', 'TRANSFERRED'],
  CANCELLED: [],
  GRADUATED: [],
  TRANSFERRED: [],
};

export class AdmissionAggregate extends AggregateRoot<AdmissionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get admissionNumber(): string { return this._props.admissionNumber; }
  get applicationId(): string { return this._props.applicationId; }
  get studentId(): string | undefined { return this._props.studentId; }
  get status(): AdmissionStatus { return this._props.status; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }

  static create(props: Omit<AdmissionProps, 'status' | 'createdAt' | 'updatedAt'>): AdmissionAggregate {
    const now = new Date().toISOString();
    const agg = new AdmissionAggregate({
      ...props,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new AdmissionCreatedEvent({
      admissionId: agg.id,
      tenantId: agg._props.tenantId,
      applicationId: agg._props.applicationId,
      admissionNumber: agg._props.admissionNumber,
      admissionDate: agg._props.admissionDate,
    }));

    return agg;
  }

  assignStudent(studentId: string): void {
    if (this._props.studentId) {
      throw new Error('Student already assigned to this admission');
    }
    this._props.studentId = studentId;
    this._touch();
  }

  assignClassroom(classroomId: string): void {
    if (!this.isActive) {
      throw new Error('Cannot assign classroom to non-active admission');
    }
    this._props.classroomId = classroomId;
    this._touch();
  }

  assignFeePlan(feePlanId: string): void {
    if (!this.isActive) {
      throw new Error('Cannot assign fee plan to non-active admission');
    }
    this._props.feePlanId = feePlanId;
    this._touch();
  }

  cancel(reason: string, refundDueCents: number | null, cancelledAt: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = cancelledAt;
    this._props.cancellationReason = reason;
    this._props.refundDueCents = refundDueCents ?? undefined;
    this._touch();
    this._addDomainEvent(new AdmissionCancelledEvent({
      admissionId: this.id,
      tenantId: this._props.tenantId,
      applicationId: this._props.applicationId,
      cancelledAt,
      reason,
      refundDueCents: refundDueCents ?? null,
    }));
  }

  graduate(): void {
    this._requireTransition('GRADUATED');
    this._props.status = 'GRADUATED';
    this._touch();
  }

  transfer(): void {
    this._requireTransition('TRANSFERRED');
    this._props.status = 'TRANSFERRED';
    this._touch();
  }

  private _requireTransition(target: AdmissionStatus): void {
    if (!ALLOWED[this._props.status].includes(target)) {
      throw new Error(`Illegal transition: ${this._props.status} → ${target}`);
    }
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
