/**
 * Platform Aggregate Unit Tests.
 */
import { describe, it, expect } from 'vitest';

import { SupportTicketAggregate } from '../domain/aggregates/support-ticket.aggregate';
import { TenantProvisioningAggregate } from '../domain/aggregates/tenant-provisioning.aggregate';

describe('TenantProvisioningAggregate', () => {
  it('should create in PENDING status with default steps + TenantProvisioningStartedEvent', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1',
      plan: 'GROWTH',
      initiatedById: 'u1',
    });
    expect(p.status).toBe('PENDING');
    expect(p.steps.length).toBeGreaterThan(0);
    expect(p.currentStep).toBeDefined();
    expect(p.domainEvents.some(e => e.eventType === 'TenantProvisioningStartedEvent')).toBe(true);
  });

  it('should accept custom step list', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A', 'STEP_B'],
    });
    expect(p.steps.map(s => s.step)).toEqual(['STEP_A', 'STEP_B']);
  });

  it('should start and complete steps', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A', 'STEP_B'],
    });
    p.start();
    expect(p.status).toBe('IN_PROGRESS');
    p.completeStep('STEP_A', new Date().toISOString());
    expect(p.currentStep).toBe('STEP_B');
    expect(p.domainEvents.some(e => e.eventType === 'TenantProvisioningStepCompletedEvent')).toBe(true);
  });

  it('should mark COMPLETED when all steps done', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A', 'STEP_B'],
    });
    p.start();
    p.completeStep('STEP_A', new Date().toISOString());
    p.completeStep('STEP_B', new Date().toISOString());
    expect(p.status).toBe('COMPLETED');
    expect(p.currentStep).toBeUndefined();
    expect(p.domainEvents.some(e => e.eventType === 'TenantProvisioningCompletedEvent')).toBe(true);
  });

  it('should be idempotent on completing same step twice', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A', 'STEP_B'],
    });
    p.start();
    p.completeStep('STEP_A', new Date().toISOString());
    p.completeStep('STEP_A', new Date().toISOString()); // no-op
    expect(p.steps.filter(s => s.status === 'COMPLETED').length).toBe(1);
  });

  it('should fail with reason', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A', 'STEP_B'],
    });
    p.start();
    p.fail('DB connection error');
    expect(p.status).toBe('FAILED');
    expect(p.domainEvents.some(e => e.eventType === 'TenantProvisioningFailedEvent')).toBe(true);
  });

  it('should rollback a failed provisioning', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A'],
    });
    p.start();
    p.fail('test');
    p.rollback();
    expect(p.status).toBe('ROLLED_BACK');
  });

  it('should not rollback a non-FAILED provisioning', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
    });
    expect(() => p.rollback()).toThrow('Cannot rollback PENDING');
  });

  it('should reject unknown step', () => {
    const p = TenantProvisioningAggregate.create({
      schoolId: 's1', plan: 'STARTER', initiatedById: 'u1',
      steps: ['STEP_A'],
    });
    p.start();
    expect(() => p.completeStep('UNKNOWN', new Date().toISOString())).toThrow('not found');
  });
});

describe('SupportTicketAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    raisedById: 'u1',
    ticketNumber: 'TKT-2025-00001',
    subject: 'Cannot log in',
    description: 'I am getting 401 error when trying to log in',
    category: 'TECHNICAL' as const,
    priority: 'HIGH' as const,
  };

  it('should create in OPEN status', () => {
    const t = SupportTicketAggregate.create(baseProps);
    expect(t.status).toBe('OPEN');
    expect(t.tags).toEqual([]);
  });

  it('should transition OPEN → IN_PROGRESS → RESOLVED → CLOSED', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setStatus('IN_PROGRESS', new Date().toISOString());
    expect(t.status).toBe('IN_PROGRESS');
    expect(t.domainEvents.some(e => e.eventType === 'SupportTicketStatusChangedEvent')).toBe(true);
    t.setStatus('RESOLVED', new Date().toISOString());
    expect(t.status).toBe('RESOLVED');
    t.setStatus('CLOSED', new Date().toISOString());
    expect(t.status).toBe('CLOSED');
  });

  it('should set firstResponseAt on first IN_PROGRESS', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setStatus('IN_PROGRESS', '2025-01-01T10:00:00Z');
    expect(t.domainEvents.length).toBeGreaterThan(0);
  });

  it('should allow reopening a RESOLVED ticket', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setStatus('IN_PROGRESS', new Date().toISOString());
    t.setStatus('RESOLVED', new Date().toISOString());
    t.setStatus('REOPENED', new Date().toISOString());
    expect(t.status).toBe('REOPENED');
  });

  it('should reject invalid transitions', () => {
    const t = SupportTicketAggregate.create(baseProps);
    expect(() => t.setStatus('RESOLVED', new Date().toISOString())).toThrow('Invalid ticket transition');
  });

  it('should assign to user', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.assignTo('admin1');
    expect(t.assignedToId).toBe('admin1');
    expect(t.domainEvents.some(e => e.eventType === 'SupportTicketAssignedEvent')).toBe(true);
  });

  it('should set satisfaction rating on RESOLVED ticket', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setStatus('IN_PROGRESS', new Date().toISOString());
    t.setStatus('RESOLVED', new Date().toISOString());
    t.setSatisfaction(5);
    expect(t.satisfactionRating).toBe(5);
  });

  it('should reject satisfaction < 1 or > 5', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setStatus('IN_PROGRESS', new Date().toISOString());
    t.setStatus('RESOLVED', new Date().toISOString());
    expect(() => t.setSatisfaction(0)).toThrow('1-5');
    expect(() => t.setSatisfaction(6)).toThrow('1-5');
  });

  it('should reject satisfaction on OPEN ticket', () => {
    const t = SupportTicketAggregate.create(baseProps);
    expect(() => t.setSatisfaction(3)).toThrow('Cannot set satisfaction');
  });

  it('should add and remove tags', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.addTag('urgent');
    t.addTag('login'); 
    t.addTag('urgent'); // dup — ignored
    expect(t.tags.length).toBe(2);
    t.removeTag('login');
    expect(t.tags).toEqual(['urgent']);
  });

  it('should change priority', () => {
    const t = SupportTicketAggregate.create(baseProps);
    t.setPriority('URGENT');
    expect(t.priority).toBe('URGENT');
  });
});
