/**
 * EnrollmentAggregate — student-section-session binding.
 *
 * Per ERD v3.0 §15.4.13: "An enrollment links a student to a section for a
 *   specific academic session. Each student has exactly one active enrollment
 *   per session."
 *
 * Lifecycle: ENROLLED → {PROMOTED | REPEATED | TRANSFERRED | WITHDRAWN | COMPLETED}
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  StudentEnrolledEvent, StudentPromotedEvent, StudentWithdrawnFromSectionEvent,
} from '../events/academics-events';

export type EnrollmentStatus =
  | 'ENROLLED' | 'PROMOTED' | 'REPEATED' | 'TRANSFERRED' | 'WITHDRAWN' | 'COMPLETED';

export type EnrollmentType = 'NEW' | 'CONTINUING' | 'TRANSFER_IN' | 'REPEAT';

export interface EnrollmentProps {
  tenantId: string;
  studentId: string;
  sessionId: string;
  sectionId: string;

  enrollmentNumber: string;
  type: EnrollmentType;
  status: EnrollmentStatus;

  enrolledAt: string;
  startDate: string;
  endDate?: string;
  exitedAt?: string;
  exitReason?: string;

  previousSectionId?: string;
  nextSectionId?: string;

  metadata?: Record<string, unknown>;
  deletedAt?: string;
}

export class EnrollmentAggregate extends AggregateRoot<EnrollmentProps> {
  get tenantId(): string { return this._props.tenantId; }
  get studentId(): string { return this._props.studentId; }
  get sessionId(): string { return this._props.sessionId; }
  get sectionId(): string { return this._props.sectionId; }
  get enrollmentNumber(): string { return this._props.enrollmentNumber; }
  get type(): EnrollmentType { return this._props.type; }
  get status(): EnrollmentStatus { return this._props.status; }
  get enrolledAt(): string { return this._props.enrolledAt; }
  get startDate(): string { return this._props.startDate; }
  get endDate(): string | undefined { return this._props.endDate; }
  get exitedAt(): string | undefined { return this._props.exitedAt; }
  get exitReason(): string | undefined { return this._props.exitReason; }
  get previousSectionId(): string | undefined { return this._props.previousSectionId; }
  get nextSectionId(): string | undefined { return this._props.nextSectionId; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isActive(): boolean { return this._props.status === 'ENROLLED'; }

  promote(toSectionId: string, promotedAt: string): void {
    if (this._props.status !== 'ENROLLED') {
      throw new Error(`Cannot promote enrollment in status ${this._props.status}`);
    }
    this._props.previousSectionId = this._props.sectionId;
    this._props.nextSectionId = toSectionId;
    this._props.status = 'PROMOTED';
    this._props.exitedAt = promotedAt;
    this._props.endDate = promotedAt;
    this._addDomainEvent(new StudentPromotedEvent({
      enrollmentId: this.id,
      studentId: this._props.studentId,
      tenantId: this._props.tenantId,
      fromSectionId: this._props.previousSectionId,
      toSectionId,
    }));
  }

  repeat(repeatedAt: string): void {
    if (this._props.status !== 'ENROLLED') {
      throw new Error(`Cannot repeat enrollment in status ${this._props.status}`);
    }
    this._props.status = 'REPEATED';
    this._props.exitedAt = repeatedAt;
    this._props.endDate = repeatedAt;
  }

  transfer(toSectionId: string, reason: string, transferredAt: string): void {
    if (this._props.status !== 'ENROLLED') {
      throw new Error(`Cannot transfer enrollment in status ${this._props.status}`);
    }
    this._props.previousSectionId = this._props.sectionId;
    this._props.nextSectionId = toSectionId;
    this._props.status = 'TRANSFERRED';
    this._props.exitedAt = transferredAt;
    this._props.endDate = transferredAt;
    this._props.exitReason = reason;
  }

  withdraw(reason: string, withdrawnAt: string): void {
    if (this._props.status !== 'ENROLLED') {
      throw new Error(`Cannot withdraw enrollment in status ${this._props.status}`);
    }
    this._props.status = 'WITHDRAWN';
    this._props.exitedAt = withdrawnAt;
    this._props.endDate = withdrawnAt;
    this._props.exitReason = reason;
    this._addDomainEvent(new StudentWithdrawnFromSectionEvent({
      enrollmentId: this.id,
      studentId: this._props.studentId,
      tenantId: this._props.tenantId,
      sectionId: this._props.sectionId,
      reason,
    }));
  }

  complete(completedAt: string): void {
    if (this._props.status !== 'ENROLLED') {
      throw new Error(`Cannot complete enrollment in status ${this._props.status}`);
    }
    this._props.status = 'COMPLETED';
    this._props.exitedAt = completedAt;
    this._props.endDate = completedAt;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(props: Omit<EnrollmentProps, 'status' | 'enrolledAt'> & {
    status?: EnrollmentStatus;
    enrolledAt?: string;
  }): EnrollmentAggregate {
    const aggregate = new EnrollmentAggregate({
      ...props,
      status: props.status ?? 'ENROLLED',
      enrolledAt: props.enrolledAt ?? new Date().toISOString(),
    });
    aggregate._addDomainEvent(new StudentEnrolledEvent({
      enrollmentId: aggregate.id,
      studentId: props.studentId,
      tenantId: props.tenantId,
      sectionId: props.sectionId,
      sessionId: props.sessionId,
      enrollmentNumber: props.enrollmentNumber,
      type: props.type,
    }));
    return aggregate;
  }
}
