/**
 * TripAggregate — a specific run of a route on a specific date.
 *
 * Per BRC §14 (R-TR-015 to R-TR-018):
 *   - Trip must be scheduled before it starts
 *   - Driver + vehicle assigned at scheduling time
 *   - GPS trail captured during trip
 *   - Delay reason mandatory if status = DELAYED
 *
 * Lifecycle:
 *   SCHEDULED → IN_PROGRESS → COMPLETED (terminal)
 *           → DELAYED → IN_PROGRESS → COMPLETED
 *           → CANCELLED (terminal)
 *           → SKIPPED (terminal, e.g., holiday)
 *
 * Invariants:
 *   - (routeId, tripDate, direction) unique
 *   - actualStart ≤ actualEnd
 *   - Cannot start without driver + vehicle assigned
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  TripCancelledEvent, TripCompletedEvent, TripDelayedEvent, TripScheduledEvent,
  TripStartedEvent,
} from '../events/transport-events';

export type TripDirection = 'PICKUP' | 'DROPOFF';
export type TripStatus =
  | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED' | 'SKIPPED';

const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  SCHEDULED: ['IN_PROGRESS', 'DELAYED', 'CANCELLED', 'SKIPPED'],
  IN_PROGRESS: ['COMPLETED', 'DELAYED'],
  DELAYED: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  SKIPPED: [],
};

export interface TripProps {
  tenantId: string;
  branchId?: string;
  routeId: string;
  vehicleId: string;
  driverId?: string;
  attendantId?: string;
  tripDate: string;
  direction: TripDirection;
  status: TripStatus;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  gpsTrail?: any[];
  totalDistanceKm?: number;
  incidentNotes?: string;
  delayReason?: string;
  createdAt: string;
  updatedAt: string;
}

export class TripAggregate extends AggregateRoot<TripProps> {
  get tenantId(): string { return this._props.tenantId; }
  get routeId(): string { return this._props.routeId; }
  get vehicleId(): string { return this._props.vehicleId; }
  get tripDate(): string { return this._props.tripDate; }
  get direction(): TripDirection { return this._props.direction; }
  get status(): TripStatus { return this._props.status; }
  get driverId(): string | undefined { return this._props.driverId; }
  get scheduledStart(): string { return this._props.scheduledStart; }
  get actualStart(): string | undefined { return this._props.actualStart; }

  static create(props: Omit<
    TripProps,
    'status' | 'gpsTrail' | 'createdAt' | 'updatedAt'
  >): TripAggregate {
    if (!props.driverId) {
      throw new Error('Driver must be assigned when scheduling trip');
    }
    const now = new Date().toISOString();
    const agg = new TripAggregate({
      ...props,
      status: 'SCHEDULED',
      gpsTrail: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new TripScheduledEvent({
      tripId: agg.id,
      tenantId: agg._props.tenantId,
      routeId: agg._props.routeId,
      vehicleId: agg._props.vehicleId,
      tripDate: agg._props.tripDate,
      direction: agg._props.direction,
    }));
    return agg;
  }

  start(actualStart: string): void {
    this._requireTransition('IN_PROGRESS');
    if (!this._props.driverId) {
      throw new Error('Cannot start trip without driver');
    }
    this._props.status = 'IN_PROGRESS';
    this._props.actualStart = actualStart;
    this._touch();
    this._addDomainEvent(new TripStartedEvent({
      tripId: this.id,
      tenantId: this._props.tenantId,
      actualStart,
    }));
  }

  complete(actualEnd: string, totalDistanceKm?: number): void {
    this._requireTransition('COMPLETED');
    if (this._props.actualStart && new Date(actualEnd) < new Date(this._props.actualStart)) {
      throw new Error('actualEnd cannot be before actualStart');
    }
    this._props.status = 'COMPLETED';
    this._props.actualEnd = actualEnd;
    if (totalDistanceKm !== undefined) this._props.totalDistanceKm = totalDistanceKm;
    this._touch();
    this._addDomainEvent(new TripCompletedEvent({
      tripId: this.id,
      tenantId: this._props.tenantId,
      actualEnd,
    }));
  }

  markDelayed(reason: string): void {
    this._requireTransition('DELAYED');
    if (!reason.trim()) {
      throw new Error('Delay reason is mandatory');
    }
    this._props.status = 'DELAYED';
    this._props.delayReason = reason;
    this._touch();
    this._addDomainEvent(new TripDelayedEvent({
      tripId: this.id,
      tenantId: this._props.tenantId,
      delayReason: reason,
    }));
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.incidentNotes = reason;
    this._touch();
    this._addDomainEvent(new TripCancelledEvent({
      tripId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  skip(): void {
    this._requireTransition('SKIPPED');
    this._props.status = 'SKIPPED';
    this._touch();
  }

  appendGpsPoint(point: { lat: number; lng: number; ts: string; speed?: number }): void {
    if (!this._props.gpsTrail) this._props.gpsTrail = [];
    this._props.gpsTrail.push(point);
    this._touch();
  }

  addIncidentNote(note: string): void {
    this._props.incidentNotes = this._props.incidentNotes
      ? `${this._props.incidentNotes}\n${note}`
      : note;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: TripStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid trip transition: ${this._props.status} → ${target}`);
    }
  }
}
