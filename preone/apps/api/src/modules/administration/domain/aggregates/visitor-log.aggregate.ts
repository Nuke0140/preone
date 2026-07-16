/**
 * VisitorLogAggregate — visitor check-in / check-out at school gate.
 *
 * Per BRC §13 (R-FAC-005): Visitor management with photo capture
 * Per BRC §8 (R-OPS-020): CCTV coverage + 30-day retention
 *
 * Lifecycle:
 *   CHECKED_IN → CHECKED_OUT (terminal)
 *             → DENIED_ENTRY (terminal)
 *             → NO_SHOW (terminal, if pre-registered and not arrived)
 *
 * Invariants:
 *   - Cannot check out without check-in
 *   - Cannot deny entry after check-out
 *   - Duration computed on check-out
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  VisitorCheckedInEvent, VisitorCheckedOutEvent, VisitorDeniedEntryEvent,
} from '../events/administration-events';

export type VisitorType =
  | 'PARENT' | 'VENDOR' | 'INSPECTOR' | 'DELIVERY' | 'GUEST'
  | 'INTERVIEW_CANDIDATE' | 'MAINTENANCE_CONTRACTOR' | 'OTHER';

export type VisitorStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED_ENTRY' | 'NO_SHOW';

export interface VisitorLogProps {
  tenantId: string;
  branchId?: string;
  visitorType: VisitorType;
  status: VisitorStatus;
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  purposeOfVisit: string;
  personToMeetId?: string;
  numVisitors: number;
  checkInAt: string;
  checkOutAt?: string;
  durationMinutes?: number;
  idProofType?: string;
  idProofNumber?: string;
  photoUrl?: string;
  signatureUrl?: string;
  approvedById?: string;
  denialReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export class VisitorLogAggregate extends AggregateRoot<VisitorLogProps> {
  get tenantId(): string { return this._props.tenantId; }
  get name(): string { return this._props.name; }
  get status(): VisitorStatus { return this._props.status; }
  get checkInAt(): string { return this._props.checkInAt; }
  get checkOutAt(): string | undefined { return this._props.checkOutAt; }
  get durationMinutes(): number | undefined { return this._props.durationMinutes; }

  static create(props: Omit<
    VisitorLogProps,
    'status' | 'checkInAt' | 'createdAt' | 'updatedAt'
  > & { checkInAt?: string }): VisitorLogAggregate {
    const now = new Date().toISOString();
    const checkInAt = props.checkInAt ?? now;
    const agg = new VisitorLogAggregate({
      ...props,
      status: 'CHECKED_IN',
      checkInAt,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new VisitorCheckedInEvent({
      visitorLogId: agg.id,
      tenantId: agg._props.tenantId,
      name: agg._props.name,
      visitorType: agg._props.visitorType,
      checkInAt,
    }));
    return agg;
  }

  checkOut(checkOutAt: string): void {
    if (this._props.status !== 'CHECKED_IN') {
      throw new Error(`Cannot check out visitor with status ${this._props.status}`);
    }
    this._props.status = 'CHECKED_OUT';
    this._props.checkOutAt = checkOutAt;
    const ms = new Date(checkOutAt).getTime() - new Date(this._props.checkInAt).getTime();
    this._props.durationMinutes = Math.max(0, Math.round(ms / 60_000));
    this._touch();
    this._addDomainEvent(new VisitorCheckedOutEvent({
      visitorLogId: this.id,
      tenantId: this._props.tenantId,
      checkOutAt,
      durationMinutes: this._props.durationMinutes,
    }));
  }

  denyEntry(reason: string): void {
    if (this._props.status !== 'CHECKED_IN') {
      throw new Error(`Cannot deny entry to visitor with status ${this._props.status}`);
    }
    this._props.status = 'DENIED_ENTRY';
    this._props.denialReason = reason;
    this._touch();
    this._addDomainEvent(new VisitorDeniedEntryEvent({
      visitorLogId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  markNoShow(): void {
    if (this._props.status !== 'CHECKED_IN') {
      throw new Error(`Cannot mark no-show for ${this._props.status} visitor`);
    }
    this._props.status = 'NO_SHOW';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
