/**
 * AcademicSessionAggregate — represents an academic year (e.g., 2025-26).
 *
 * Per ERD v3.0 §15.4.1: "An academic session is the top-level time container
 *   for a school year. All sections, curricula, enrollments, and report cards
 *   belong to exactly one session."
 *
 * Lifecycle: PLANNED → ACTIVE → COMPLETED → ARCHIVED
 *
 * Only ONE session per school can be ACTIVE (isCurrent=true) at any time.
 * When a session is activated, all other sessions in the same school are
 * demoted to isCurrent=false (handled by the service layer).
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  AcademicSessionActivatedEvent, AcademicSessionCompletedEvent,
  AcademicSessionCreatedEvent,
} from '../events/academics-events';

export type AcademicSessionStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface AcademicSessionProps {
  tenantId: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  status: AcademicSessionStatus;
  isCurrent: boolean;
  activatedAt?: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
  deletedAt?: string;
}

export class AcademicSessionAggregate extends AggregateRoot<AcademicSessionProps> {
  get tenantId(): string { return this._props.tenantId; }
  get name(): string { return this._props.name; }
  get code(): string { return this._props.code; }
  get startDate(): string { return this._props.startDate; }
  get endDate(): string { return this._props.endDate; }
  get status(): AcademicSessionStatus { return this._props.status; }
  get isCurrent(): boolean { return this._props.isCurrent; }
  get activatedAt(): string | undefined { return this._props.activatedAt; }
  get completedAt(): string | undefined { return this._props.completedAt; }
  get deletedAt(): string | undefined { return this._props.deletedAt; }

  get isPlanned(): boolean { return this._props.status === 'PLANNED'; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isCompleted(): boolean { return this._props.status === 'COMPLETED'; }
  get isArchived(): boolean { return this._props.status === 'ARCHIVED'; }

  activate(activatedAt: string): void {
    if (this._props.status !== 'PLANNED') {
      throw new Error(`Cannot activate session in status ${this._props.status}`);
    }
    this._props.status = 'ACTIVE';
    this._props.isCurrent = true;
    this._props.activatedAt = activatedAt;
    this._addDomainEvent(new AcademicSessionActivatedEvent({
      sessionId: this.id, tenantId: this._props.tenantId, activatedAt,
    }));
  }

  complete(completedAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot complete session in status ${this._props.status}`);
    }
    this._props.status = 'COMPLETED';
    this._props.isCurrent = false;
    this._props.completedAt = completedAt;
    this._addDomainEvent(new AcademicSessionCompletedEvent({
      sessionId: this.id, tenantId: this._props.tenantId, completedAt,
    }));
  }

  archive(): void {
    if (this._props.status !== 'COMPLETED') {
      throw new Error(`Cannot archive session in status ${this._props.status}`);
    }
    this._props.status = 'ARCHIVED';
  }

  demote(): void {
    // Called by service when another session is activated
    this._props.isCurrent = false;
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  static create(
    props: Omit<AcademicSessionProps, 'status' | 'isCurrent'> & {
      status?: AcademicSessionStatus;
      isCurrent?: boolean;
    },
  ): AcademicSessionAggregate {
    const aggregate = new AcademicSessionAggregate({
      ...props,
      status: props.status ?? 'PLANNED',
      isCurrent: props.isCurrent ?? false,
    });
    aggregate._addDomainEvent(new AcademicSessionCreatedEvent({
      sessionId: aggregate.id,
      tenantId: props.tenantId,
      name: props.name,
      code: props.code,
      startDate: props.startDate,
      endDate: props.endDate,
    }));
    return aggregate;
  }
}
