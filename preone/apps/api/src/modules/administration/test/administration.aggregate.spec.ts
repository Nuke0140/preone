/**
 * Administration Aggregate Unit Tests — covers Asset, MaintenanceRequest,
 * VisitorLog aggregate invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { AssetAggregate } from '../domain/aggregates/asset.aggregate';
import { MaintenanceRequestAggregate } from '../domain/aggregates/maintenance-request.aggregate';
import { VisitorLogAggregate } from '../domain/aggregates/visitor-log.aggregate';

describe('AssetAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    assetTag: 'AST-001',
    name: 'Projector',
    category: 'IT_EQUIPMENT' as const,
    purchaseCostCents: 50000,
    depreciationRatePercent: 15,
  };

  it('should create in IN_USE status with AssetRegisteredEvent', () => {
    const a = AssetAggregate.create(baseProps);
    expect(a.status).toBe('IN_USE');
    expect(a.currentValueCents).toBe(50000);
    expect(a.domainEvents.some(e => e.eventType === 'AssetRegisteredEvent')).toBe(true);
  });

  it('should assign to a user', () => {
    const a = AssetAggregate.create(baseProps);
    a.assignTo('u1', new Date().toISOString());
    expect(a.status).toBe('ALLOCATED');
    expect(a.assignedToId).toBe('u1');
    expect(a.domainEvents.some(e => e.eventType === 'AssetAssignedEvent')).toBe(true);
  });

  it('should unassign back to IN_USE', () => {
    const a = AssetAggregate.create(baseProps);
    a.assignTo('u1', new Date().toISOString());
    a.unassign();
    expect(a.status).toBe('IN_USE');
    expect(a.assignedToId).toBeUndefined();
  });

  it('should dispose with reason and scrap value', () => {
    const a = AssetAggregate.create(baseProps);
    a.dispose('Old and broken', 500, new Date().toISOString());
    expect(a.status).toBe('DISPOSED');
    expect(a.domainEvents.some(e => e.eventType === 'AssetDisposedEvent')).toBe(true);
  });

  it('should not allow assigning a disposed asset', () => {
    const a = AssetAggregate.create(baseProps);
    a.dispose('test', 0, new Date().toISOString());
    expect(() => a.assignTo('u1', new Date().toISOString())).toThrow('Cannot assign DISPOSED');
  });

  it('should mark asset under repair and back to in-use', () => {
    const a = AssetAggregate.create(baseProps);
    a.markUnderRepair();
    expect(a.status).toBe('UNDER_REPAIR');
    a.markInUse();
    expect(a.status).toBe('IN_USE');
  });

  it('should mark asset lost', () => {
    const a = AssetAggregate.create(baseProps);
    a.markLost('Cannot locate');
    expect(a.status).toBe('LOST');
  });
});

describe('MaintenanceRequestAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    requestNumber: 'MR-001',
    requestedById: 'u1',
    type: 'CORRECTIVE' as const,
    priority: 'HIGH' as const,
    title: 'AC not cooling',
    description: 'AC in classroom 101 is not cooling properly',
  };

  it('should create in REQUESTED status with MaintenanceRequestedEvent', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    expect(r.status).toBe('REQUESTED');
    expect(r.domainEvents.some(e => e.eventType === 'MaintenanceRequestedEvent')).toBe(true);
  });

  it('should follow REQUESTED → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    r.approve();
    expect(r.status).toBe('APPROVED');
    r.schedule(new Date().toISOString(), 'u2');
    expect(r.status).toBe('SCHEDULED');
    r.start(new Date().toISOString());
    expect(r.status).toBe('IN_PROGRESS');
    r.complete(new Date().toISOString(), 'Fixed by replacing compressor', 3000);
    expect(r.status).toBe('COMPLETED');
    expect(r.domainEvents.some(e => e.eventType === 'MaintenanceCompletedEvent')).toBe(true);
  });

  it('should reject completion without resolution notes', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    r.approve();
    r.schedule(new Date().toISOString());
    r.start(new Date().toISOString());
    expect(() => r.complete(new Date().toISOString(), '', 0)).toThrow('Resolution notes');
  });

  it('should reject skipping states', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    expect(() => r.start(new Date().toISOString())).toThrow('Invalid maintenance transition');
  });

  it('should cancel a REQUESTED with reason', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    r.cancel('Duplicate');
    expect(r.status).toBe('CANCELLED');
    expect(r.domainEvents.some(e => e.eventType === 'MaintenanceCancelledEvent')).toBe(true);
  });

  it('should defer and resume from APPROVED', () => {
    const r = MaintenanceRequestAggregate.create(baseProps);
    r.approve();
    r.defer();
    expect(r.status).toBe('DEFERRED');
    r.approve();
    expect(r.status).toBe('APPROVED');
  });
});

describe('VisitorLogAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    visitorType: 'PARENT' as const,
    name: 'John Doe',
    purposeOfVisit: 'PTM',
    numVisitors: 2,
  };

  it('should check in visitor with current timestamp', () => {
    const v = VisitorLogAggregate.create(baseProps);
    expect(v.status).toBe('CHECKED_IN');
    expect(v.checkInAt).toBeDefined();
    expect(v.domainEvents.some(e => e.eventType === 'VisitorCheckedInEvent')).toBe(true);
  });

  it('should check out and compute duration', () => {
    const v = VisitorLogAggregate.create({
      ...baseProps,
      checkInAt: '2025-01-01T10:00:00Z',
    });
    v.checkOut('2025-01-01T11:30:00Z');
    expect(v.status).toBe('CHECKED_OUT');
    expect(v.durationMinutes).toBe(90);
    expect(v.domainEvents.some(e => e.eventType === 'VisitorCheckedOutEvent')).toBe(true);
  });

  it('should deny entry to a checked-in visitor', () => {
    const v = VisitorLogAggregate.create(baseProps);
    v.denyEntry('Not on approved list');
    expect(v.status).toBe('DENIED_ENTRY');
    expect(v.domainEvents.some(e => e.eventType === 'VisitorDeniedEntryEvent')).toBe(true);
  });

  it('should not allow check-out after denial', () => {
    const v = VisitorLogAggregate.create(baseProps);
    v.denyEntry('test');
    expect(() => v.checkOut(new Date().toISOString())).toThrow('Cannot check out');
  });

  it('should not allow denying a checked-out visitor', () => {
    const v = VisitorLogAggregate.create({
      ...baseProps,
      checkInAt: '2025-01-01T10:00:00Z',
    });
    v.checkOut('2025-01-01T11:00:00Z');
    expect(() => v.denyEntry('test')).toThrow('Cannot deny entry');
  });
});
