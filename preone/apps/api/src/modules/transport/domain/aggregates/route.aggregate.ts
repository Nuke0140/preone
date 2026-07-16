/**
 * RouteAggregate — transport route with stops + schedule + fare.
 *
 * Per BRC §14 (R-TR-009 to R-TR-014):
 *   - Route must have ≥ 2 stops (start + end)
 *   - Pickup time before dropoff time (or same for both directions)
 *   - Fare mandatory for paid transport
 *
 * Lifecycle: ACTIVE → INACTIVE → DISCONTINUED (terminal)
 *
 * Invariants:
 *   - routeCode unique per school
 *   - stops is a JSON array of {name, lat, lng, pickupTime, dropoffTime, fareCents}
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  RouteActivatedEvent, RouteCreatedEvent, RouteDiscontinuedEvent,
} from '../events/transport-events';

export type RouteStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

export interface RouteStop {
  name: string;
  lat?: number;
  lng?: number;
  pickupTime?: string; // HH:MM
  dropoffTime?: string; // HH:MM
  fareCents?: number;
}

export interface RouteProps {
  tenantId: string;
  branchId?: string;
  routeCode: string;
  name: string;
  status: RouteStatus;
  vehicleId?: string;
  stops: RouteStop[];
  totalDistanceKm?: number;
  estimatedDurationMin?: number;
  fareCents: number;
  roundTripFareCents: number;
  pickupStartTime?: string;
  dropoffStartTime?: string;
  enrolledCount: number;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  ACTIVE: ['INACTIVE', 'DISCONTINUED'],
  INACTIVE: ['ACTIVE', 'DISCONTINUED'],
  DISCONTINUED: [],
};

export class RouteAggregate extends AggregateRoot<RouteProps> {
  get tenantId(): string { return this._props.tenantId; }
  get routeCode(): string { return this._props.routeCode; }
  get name(): string { return this._props.name; }
  get status(): RouteStatus { return this._props.status; }
  get vehicleId(): string | undefined { return this._props.vehicleId; }
  get stops(): readonly RouteStop[] {
    return Object.freeze([...this._props.stops]);
  }
  get enrolledCount(): number { return this._props.enrolledCount; }
  get fareCents(): number { return this._props.fareCents; }

  static create(props: Omit<
    RouteProps,
    'status' | 'enrolledCount' | 'createdAt' | 'updatedAt'
  >): RouteAggregate {
    if (props.stops.length < 2) {
      throw new Error('Route must have at least 2 stops (start + end)');
    }
    const now = new Date().toISOString();
    const agg = new RouteAggregate({
      ...props,
      status: 'ACTIVE',
      enrolledCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new RouteCreatedEvent({
      routeId: agg.id,
      tenantId: agg._props.tenantId,
      routeCode: agg._props.routeCode,
      name: agg._props.name,
    }));
    agg._addDomainEvent(new RouteActivatedEvent({
      routeId: agg.id,
      tenantId: agg._props.tenantId,
    }));
    return agg;
  }

  assignVehicle(vehicleId: string): void {
    if (this._props.status === 'DISCONTINUED') {
      throw new Error('Cannot assign vehicle to discontinued route');
    }
    this._props.vehicleId = vehicleId;
    this._touch();
  }

  unassignVehicle(): void {
    this._props.vehicleId = undefined;
    this._touch();
  }

  updateStops(stops: RouteStop[]): void {
    if (stops.length < 2) {
      throw new Error('Route must have at least 2 stops');
    }
    this._props.stops = [...stops];
    this._touch();
  }

  incrementEnrollment(): void {
    this._props.enrolledCount += 1;
    this._touch();
  }

  decrementEnrollment(): void {
    if (this._props.enrolledCount > 0) {
      this._props.enrolledCount -= 1;
      this._touch();
    }
  }

  deactivate(): void {
    this._requireTransition('INACTIVE');
    this._props.status = 'INACTIVE';
    this._touch();
  }

  activate(): void {
    this._requireTransition('ACTIVE');
    this._props.status = 'ACTIVE';
    this._touch();
    this._addDomainEvent(new RouteActivatedEvent({
      routeId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  discontinue(): void {
    this._requireTransition('DISCONTINUED');
    this._props.status = 'DISCONTINUED';
    this._touch();
    this._addDomainEvent(new RouteDiscontinuedEvent({
      routeId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: RouteStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid route transition: ${this._props.status} → ${target}`);
    }
  }
}
