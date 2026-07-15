/**
 * SectionAggregate — a concrete class section (e.g., 'Nursery A').
 *
 * Per ERD v3.0 §15.4.4: "A section is a concrete grouping of students within
 *   a classroom for a specific academic session. Each section has a capacity
 *   and tracks enrolled count."
 *
 * Lifecycle: PLANNED → ACTIVE → CLOSED
 *
 * Invariants:
 *   - enrolledCount <= capacity (cannot exceed capacity)
 *   - minAgeMonths <= student.ageMonths <= maxAgeMonths (checked at enrollment time)
 *   - code is unique within branch + session
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  SectionActivatedEvent, SectionClosedEvent, SectionCreatedEvent,
} from '../events/academics-events';

export type SectionStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED' | 'MERGED';

export interface SectionProps {
  tenantId: string;
  branchId: string;
  sessionId: string;
  classroomId: string;
  curriculumId?: string;

  name: string;
  code: string;
  gradeLevel: string;
  capacity: number;
  enrolledCount: number;
  minAgeMonths: number;
  maxAgeMonths: number;

  status: SectionStatus;
  startDate?: string;
  endDate?: string;
  activatedAt?: string;
  closedAt?: string;

  roomNumber?: string;
  metadata?: Record<string, unknown>;

  deletedAt?: string;
}

export class SectionAggregate extends AggregateRoot<SectionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get sessionId(): string { return this._props.sessionId; }
  get classroomId(): string { return this._props.classroomId; }
  get curriculumId(): string | undefined { return this._props.curriculumId; }
  get name(): string { return this._props.name; }
  get code(): string { return this._props.code; }
  get gradeLevel(): string { return this._props.gradeLevel; }
  get capacity(): number { return this._props.capacity; }
  get enrolledCount(): number { return this._props.enrolledCount; }
  get minAgeMonths(): number { return this._props.minAgeMonths; }
  get maxAgeMonths(): number { return this._props.maxAgeMonths; }
  get status(): SectionStatus { return this._props.status; }
  get startDate(): string | undefined { return this._props.startDate; }
  get endDate(): string | undefined { return this._props.endDate; }
  get activatedAt(): string | undefined { return this._props.activatedAt; }
  get closedAt(): string | undefined { return this._props.closedAt; }
  get roomNumber(): string | undefined { return this._props.roomNumber; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isPlanned(): boolean { return this._props.status === 'PLANNED'; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isClosed(): boolean { return this._props.status === 'CLOSED'; }
  get seatsAvailable(): number { return this._props.capacity - this._props.enrolledCount; }
  get isFull(): boolean { return this._props.enrolledCount >= this._props.capacity; }

  isEligible(ageMonths: number): boolean {
    return ageMonths >= this._props.minAgeMonths && ageMonths <= this._props.maxAgeMonths;
  }

  activate(activatedAt: string): void {
    if (this._props.status !== 'PLANNED') {
      throw new Error(`Cannot activate section in status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._props.activatedAt = activatedAt;
    this._addDomainEvent(new SectionActivatedEvent({
      sectionId: this.id, tenantId: this._props.tenantId, activatedAt,
    }));
  }

  close(closedAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot close section in status ${this._props.status}`);
    }
    this._props.status = 'CLOSED';
    this._props.closedAt = closedAt;
    this._addDomainEvent(new SectionClosedEvent({
      sectionId: this.id, tenantId: this._props.tenantId, closedAt,
    }));
  }

  incrementEnrollment(): void {
    if (this.isFull) {
      throw new Error(`Section ${this._props.code} is at capacity (${this._props.capacity})`);
    }
    this._props.enrolledCount += 1;
  }

  decrementEnrollment(): void {
    if (this._props.enrolledCount === 0) {
      throw new Error(`Section ${this._props.code} has 0 enrollments`);
    }
    this._props.enrolledCount -= 1;
  }

  assignCurriculum(curriculumId: string): void {
    this._props.curriculumId = curriculumId;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(
    props: Omit<SectionProps, 'status' | 'enrolledCount'> & {
      status?: SectionStatus;
      enrolledCount?: number;
    },
  ): SectionAggregate {
    const aggregate = new SectionAggregate({
      ...props,
      status: props.status ?? 'PLANNED',
      enrolledCount: props.enrolledCount ?? 0,
    });
    aggregate._addDomainEvent(new SectionCreatedEvent({
      sectionId: aggregate.id,
      tenantId: props.tenantId,
      branchId: props.branchId,
      name: props.name,
      code: props.code,
      gradeLevel: props.gradeLevel,
    }));
    return aggregate;
  }
}
