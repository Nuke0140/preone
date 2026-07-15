/**
 * WaitingListAggregate — waitlist per branch/program/academic-session.
 *
 * Per ERD v3.0 §13.4.8: "Waitlist per branch/program/session.
 *   Auto-promotion when seat opens."
 *
 * Each WaitingListAggregate represents a single application's slot on a
 * per-branch/program/session waitlist. Position is 1-based; position 1 is
 * next in line.
 *
 * Lifecycle:
 *   WAITING → SEAT_OFFERED → {ACCEPTED | DECLINED | NO_RESPONSE}
 *
 * Invariants:
 *   - Position must be > 0 and unique within (branchId, programType, academicSessionId)
 *   - priorityScore is computed from Application.priorityFactors
 *   - Seat offer has expiry (default 7 days)
 *   - Once accepted, application moves to APPROVED
 *   - Promoted when a seat frees up (position decreases)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  WaitingListEntryAddedEvent, WaitingListPromotedEvent, WaitingListSeatOfferedEvent,
} from '../events/admissions-events';

export type WaitingListResponse = 'ACCEPTED' | 'DECLINED' | 'NO_RESPONSE';
export type WaitingListState = 'WAITING' | 'SEAT_OFFERED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface WaitingListProps {
  tenantId: string;
  applicationId: string;
  branchId: string;
  programType: 'PLAYGROUP' | 'NURSERY' | 'LKG' | 'UKG' | 'DAYCARE';
  academicSessionId: string;

  position: number;
  priorityScore: number;

  state: WaitingListState;
  offeredAt?: string;
  offerExpiresAt?: string;
  respondedAt?: string;
  response?: WaitingListResponse;

  createdAt: string;
  updatedAt: string;
}

export class WaitingListAggregate extends AggregateRoot<WaitingListProps> {
  get tenantId(): string { return this._props.tenantId; }
  get applicationId(): string { return this._props.applicationId; }
  get branchId(): string { return this._props.branchId; }
  get programType(): string { return this._props.programType; }
  get academicSessionId(): string { return this._props.academicSessionId; }
  get position(): number { return this._props.position; }
  get priorityScore(): number { return this._props.priorityScore; }
  get state(): WaitingListState { return this._props.state; }
  get isOfferActive(): boolean {
    return this._props.state === 'SEAT_OFFERED'
      && !!this._props.offerExpiresAt
      && new Date(this._props.offerExpiresAt) > new Date();
  }

  static create(props: Omit<WaitingListProps, 'state' | 'createdAt' | 'updatedAt'>): WaitingListAggregate {
    if (props.position < 1) {
      throw new Error('Position must be >= 1');
    }
    const now = new Date().toISOString();
    const agg = new WaitingListAggregate({
      ...props,
      state: 'WAITING',
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new WaitingListEntryAddedEvent({
      waitingListId: agg.id,
      tenantId: agg._props.tenantId,
      applicationId: agg._props.applicationId,
      branchId: agg._props.branchId,
      programType: agg._props.programType,
      position: agg._props.position,
      priorityScore: agg._props.priorityScore,
    }));

    return agg;
  }

  offerSeat(offeredAt: string, expiresAt: string): void {
    if (this._props.state !== 'WAITING') {
      throw new Error(`Cannot offer seat: state is ${this._props.state}`);
    }
    this._props.state = 'SEAT_OFFERED';
    this._props.offeredAt = offeredAt;
    this._props.offerExpiresAt = expiresAt;
    this._touch();
    this._addDomainEvent(new WaitingListSeatOfferedEvent({
      waitingListId: this.id,
      tenantId: this._props.tenantId,
      applicationId: this._props.applicationId,
      offeredAt,
      offerExpiresAt: expiresAt,
    }));
  }

  accept(respondedAt: string): void {
    if (this._props.state !== 'SEAT_OFFERED') {
      throw new Error(`Cannot accept: state is ${this._props.state}`);
    }
    if (new Date(this._props.offerExpiresAt!) < new Date(respondedAt)) {
      this._props.state = 'EXPIRED';
      this._touch();
      throw new Error('Offer has expired');
    }
    this._props.state = 'ACCEPTED';
    this._props.response = 'ACCEPTED';
    this._props.respondedAt = respondedAt;
    this._touch();
  }

  decline(respondedAt: string): void {
    if (this._props.state !== 'SEAT_OFFERED') {
      throw new Error(`Cannot decline: state is ${this._props.state}`);
    }
    this._props.state = 'DECLINED';
    this._props.response = 'DECLINED';
    this._props.respondedAt = respondedAt;
    this._touch();
  }

  markNoResponse(): void {
    if (this._props.state !== 'SEAT_OFFERED') return;
    this._props.state = 'EXPIRED';
    this._props.response = 'NO_RESPONSE';
    this._touch();
  }

  /** Called when a seat frees up — this entry moves up by one position. */
  promote(): void {
    if (this._props.state !== 'WAITING') {
      throw new Error(`Cannot promote: state is ${this._props.state}`);
    }
    if (this._props.position === 1) {
      throw new Error('Already at position 1 — offer seat instead');
    }
    const from = this._props.position;
    this._props.position -= 1;
    this._touch();
    this._addDomainEvent(new WaitingListPromotedEvent({
      waitingListId: this.id,
      tenantId: this._props.tenantId,
      applicationId: this._props.applicationId,
      fromPosition: from,
      toPosition: this._props.position,
    }));
  }

  /** Demote (when a higher-priority entry is added in front). */
  demote(): void {
    if (this._props.state !== 'WAITING') return;
    this._props.position += 1;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
