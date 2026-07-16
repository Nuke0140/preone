/**
 * Transport Aggregate Unit Tests — covers Vehicle, Route, Trip aggregate
 * invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { RouteAggregate } from '../domain/aggregates/route.aggregate';
import { TripAggregate } from '../domain/aggregates/trip.aggregate';
import { VehicleAggregate } from '../domain/aggregates/vehicle.aggregate';

describe('VehicleAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    vehicleNumber: 'KA01AB1234',
    type: 'BUS' as const,
    capacity: 30,
    registeredSeats: 28,
  };

  it('should create in ACTIVE status with VehicleRegisteredEvent', () => {
    const v = VehicleAggregate.create(baseProps);
    expect(v.status).toBe('ACTIVE');
    expect(v.capacity).toBe(30);
    expect(v.domainEvents.some(e => e.eventType === 'VehicleRegisteredEvent')).toBe(true);
  });

  it('should reject registeredSeats > capacity', () => {
    expect(() => VehicleAggregate.create({ ...baseProps, registeredSeats: 35 })).toThrow('cannot exceed capacity');
  });

  it('should transition ACTIVE → MAINTENANCE → ACTIVE', () => {
    const v = VehicleAggregate.create(baseProps);
    v.setStatus('MAINTENANCE', 'Oil change');
    expect(v.status).toBe('MAINTENANCE');
    v.setStatus('ACTIVE');
    expect(v.status).toBe('ACTIVE');
  });

  it('should retire vehicle (terminal)', () => {
    const v = VehicleAggregate.create(baseProps);
    v.setStatus('RETIRED', 'End of life');
    expect(v.status).toBe('RETIRED');
    expect(v.isActive).toBe(false);
    expect(() => v.setStatus('ACTIVE')).toThrow('Invalid vehicle transition');
  });

  it('should detect expired compliance documents', () => {
    const v = VehicleAggregate.create({
      ...baseProps,
      insuranceValidTill: '2020-01-01',
      pollutionCertValidTill: '2025-12-31',
    });
    const issues = v.getComplianceIssues('2025-06-01');
    expect(issues).toContain('Insurance expired');
    expect(issues).not.toContain('Pollution certificate expired');
  });

  it('should assign driver', () => {
    const v = VehicleAggregate.create(baseProps);
    v.assignDriver('emp1');
    expect(v.driverId).toBe('emp1');
  });

  it('should not assign driver to retired vehicle', () => {
    const v = VehicleAggregate.create(baseProps);
    v.setStatus('RETIRED');
    expect(() => v.assignDriver('emp1')).toThrow('retired');
  });
});

describe('RouteAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    routeCode: 'R-001',
    name: 'Main Route',
    stops: [
      { name: 'School', pickupTime: '07:30', dropoffTime: '15:30' },
      { name: 'Stop A', pickupTime: '07:45', dropoffTime: '15:15' },
      { name: 'Stop B', pickupTime: '08:00', dropoffTime: '15:00' },
    ],
    fareCents: 150000,
    roundTripFareCents: 250000,
  };

  it('should create in ACTIVE status with RouteCreatedEvent', () => {
    const r = RouteAggregate.create(baseProps);
    expect(r.status).toBe('ACTIVE');
    expect(r.stops.length).toBe(3);
    expect(r.domainEvents.some(e => e.eventType === 'RouteCreatedEvent')).toBe(true);
  });

  it('should reject route with fewer than 2 stops', () => {
    expect(() => RouteAggregate.create({
      ...baseProps,
      stops: [{ name: 'Only one' }],
    })).toThrow('at least 2 stops');
  });

  it('should increment / decrement enrollment', () => {
    const r = RouteAggregate.create(baseProps);
    expect(r.enrolledCount).toBe(0);
    r.incrementEnrollment();
    r.incrementEnrollment();
    expect(r.enrolledCount).toBe(2);
    r.decrementEnrollment();
    expect(r.enrolledCount).toBe(1);
  });

  it('should not decrement below zero', () => {
    const r = RouteAggregate.create(baseProps);
    r.decrementEnrollment();
    expect(r.enrolledCount).toBe(0);
  });

  it('should discontinue (terminal)', () => {
    const r = RouteAggregate.create(baseProps);
    r.discontinue();
    expect(r.status).toBe('DISCONTINUED');
    expect(() => r.activate()).toThrow('Invalid route transition');
  });

  it('should activate / deactivate', () => {
    const r = RouteAggregate.create(baseProps);
    r.deactivate();
    expect(r.status).toBe('INACTIVE');
    r.activate();
    expect(r.status).toBe('ACTIVE');
  });

  it('should assign and unassign vehicle', () => {
    const r = RouteAggregate.create(baseProps);
    r.assignVehicle('v1');
    expect(r.vehicleId).toBe('v1');
    r.unassignVehicle();
    expect(r.vehicleId).toBeUndefined();
  });

  it('should not assign vehicle to discontinued route', () => {
    const r = RouteAggregate.create(baseProps);
    r.discontinue();
    expect(() => r.assignVehicle('v1')).toThrow('discontinued');
  });

  it('should update stops (≥2 required)', () => {
    const r = RouteAggregate.create(baseProps);
    r.updateStops([{ name: 'A' }, { name: 'B' }]);
    expect(r.stops.length).toBe(2);
    expect(() => r.updateStops([{ name: 'X' }])).toThrow('at least 2 stops');
  });
});

describe('TripAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    routeId: 'r1',
    vehicleId: 'v1',
    driverId: 'd1',
    tripDate: '2025-01-15',
    direction: 'PICKUP' as const,
    scheduledStart: '2025-01-15T07:30:00Z',
    scheduledEnd: '2025-01-15T08:30:00Z',
  };

  it('should create in SCHEDULED status with TripScheduledEvent', () => {
    const t = TripAggregate.create(baseProps);
    expect(t.status).toBe('SCHEDULED');
    expect(t.domainEvents.some(e => e.eventType === 'TripScheduledEvent')).toBe(true);
  });

  it('should reject scheduling without driver', () => {
    expect(() => TripAggregate.create({ ...baseProps, driverId: undefined as any })).toThrow('Driver must be assigned');
  });

  it('should start and complete', () => {
    const t = TripAggregate.create(baseProps);
    t.start('2025-01-15T07:35:00Z');
    expect(t.status).toBe('IN_PROGRESS');
    t.complete('2025-01-15T08:40:00Z', 25);
    expect(t.status).toBe('COMPLETED');
    expect(t.domainEvents.some(e => e.eventType === 'TripCompletedEvent')).toBe(true);
  });

  it('should reject completion before start time', () => {
    const t = TripAggregate.create(baseProps);
    t.start('2025-01-15T08:00:00Z');
    expect(() => t.complete('2025-01-15T07:00:00Z')).toThrow('before actualStart');
  });

  it('should mark delayed with reason', () => {
    const t = TripAggregate.create(baseProps);
    t.markDelayed('Traffic jam');
    expect(t.status).toBe('DELAYED');
    expect(t.domainEvents.some(e => e.eventType === 'TripDelayedEvent')).toBe(true);
  });

  it('should reject delay without reason', () => {
    const t = TripAggregate.create(baseProps);
    expect(() => t.markDelayed('')).toThrow('Delay reason');
  });

  it('should cancel a scheduled trip', () => {
    const t = TripAggregate.create(baseProps);
    t.cancel('Vehicle breakdown');
    expect(t.status).toBe('CANCELLED');
    expect(t.domainEvents.some(e => e.eventType === 'TripCancelledEvent')).toBe(true);
  });

  it('should skip a scheduled trip', () => {
    const t = TripAggregate.create(baseProps);
    t.skip();
    expect(t.status).toBe('SKIPPED');
  });

  it('should append GPS points to trail', () => {
    const t = TripAggregate.create(baseProps);
    t.start('2025-01-15T07:35:00Z');
    t.appendGpsPoint({ lat: 12.97, lng: 77.59, ts: '2025-01-15T07:40:00Z', speed: 30 });
    t.appendGpsPoint({ lat: 12.98, lng: 77.60, ts: '2025-01-15T07:45:00Z', speed: 35 });
    expect((t as any)._props.gpsTrail.length).toBe(2);
  });

  it('should resume from DELAYED to IN_PROGRESS', () => {
    const t = TripAggregate.create(baseProps);
    t.markDelayed('Traffic');
    t.start('2025-01-15T08:00:00Z');
    expect(t.status).toBe('IN_PROGRESS');
  });

  it('should reject invalid transitions', () => {
    const t = TripAggregate.create(baseProps);
    expect(() => t.complete('2025-01-15T08:00:00Z')).toThrow('Invalid trip transition');
  });
});
