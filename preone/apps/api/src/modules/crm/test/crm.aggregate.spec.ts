/**
 * CRM Aggregate Unit Tests — covers Lead, Campaign, FollowUp
 * aggregate invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { LeadAggregate } from '../domain/aggregates/lead.aggregate';
import { CampaignAggregate } from '../domain/aggregates/campaign.aggregate';
import { FollowUpAggregate } from '../domain/aggregates/follow-up.aggregate';

// ─── Lead ────────────────────────────────────────────────────────

describe('LeadAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    branchId: 'b1',
    leadCode: 'LD-20250616-ABCD1234',
    parentFirstName: 'Rahul',
    parentLastName: 'Verma',
    email: 'rahul.verma@example.com',
    phone: '+919876543210',
    childName: 'Aarav Verma',
    childDateOfBirth: '2021-05-15',
    programInterest: 'NURSERY' as const,
    source: 'WEBSITE' as const,
  };

  it('should create in NEW status with LeadCapturedEvent', () => {
    const lead = LeadAggregate.create(baseProps);
    expect(lead.status).toBe('NEW');
    expect(lead.priority).toBe('WARM');
    expect(lead.contactCount).toBe(0);
    expect(lead.domainEvents.some(e => e.eventType === 'LeadCapturedEvent')).toBe(true);
  });

  it('should assign counsellor and move to ASSIGNED', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    expect(lead.status).toBe('ASSIGNED');
    expect(lead.assignedCounsellorId).toBe('counsellor1');
  });

  it('should record previous counsellor on re-assignment', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.assign('counsellor2');
    expect(lead.assignedCounsellorId).toBe('counsellor2');
    expect(lead['_props'].previousCounsellorId).toBe('counsellor1');
  });

  it('should reject contact for unassigned lead', () => {
    const lead = LeadAggregate.create(baseProps);
    expect(() => lead.recordContact('CALL')).toThrow('unassigned');
  });

  it('should record contact and increment counter', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL', 'Discussed programs');
    expect(lead.status).toBe('CONTACTED');
    expect(lead.contactCount).toBe(1);
    expect(lead['_props'].firstContactedAt).toBeDefined();
    expect(lead['_props'].lastContactedAt).toBeDefined();
  });

  it('should qualify with score-based priority', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    lead.qualify(75, 'Strong interest, budget confirmed');
    expect(lead.status).toBe('QUALIFIED');
    expect(lead.priority).toBe('HOT');
    expect(lead.qualificationScore).toBe(75);
  });

  it('should reject invalid qualification score', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    expect(() => lead.qualify(150)).toThrow('0-100');
    expect(() => lead.qualify(-10)).toThrow('0-100');
  });

  it('should convert lead with application reference', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    lead.qualify(80, 'Hot lead');
    lead.convert('app-001');
    expect(lead.status).toBe('CONVERTED');
    expect(lead.convertedApplicationId).toBe('app-001');
    expect(lead['_props'].convertedAt).toBeDefined();
    expect(lead.domainEvents.some(e => e.eventType === 'LeadConvertedEvent')).toBe(true);
  });

  it('should reject conversion without qualification', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    expect(() => lead.convert('app-001')).toThrow('Invalid lead transition');
  });

  it('should lose lead with reason', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    lead.qualify(60, 'Warm lead');
    lead.lose('Chose competitor');
    expect(lead.status).toBe('LOST');
    expect(lead['_props'].lostReason).toBe('Chose competitor');
  });

  it('should reactivate lost lead', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.assign('counsellor1');
    lead.recordContact('CALL');
    lead.qualify(60, 'Warm lead');
    lead.lose('Chose competitor');
    lead.reactivate();
    expect(lead.status).toBe('REACTIVATED');
  });

  it('should add tags without duplicates', () => {
    const lead = LeadAggregate.create(baseProps);
    lead.addTag('high-value');
    lead.addTag('high-value');
    lead.addTag('refundable');
    expect(lead['_props'].tags).toEqual(['high-value', 'refundable']);
  });
});

// ─── Campaign ────────────────────────────────────────────────────

describe('CampaignAggregate', () => {
  it('should create in DRAFT status', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Summer Camp Promo',
      channel: 'WHATSAPP', audience: 'ALL_LEADS', budgetCents: 5000000,
    });
    expect(camp.status).toBe('DRAFT');
    expect(camp.sentCount).toBe(0);
    expect(camp.domainEvents.some(e => e.eventType === 'CampaignCreatedEvent')).toBe(true);
  });

  it('should reject scheduling with zero audience', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'NEW_LEADS', budgetCents: 1000000,
    });
    expect(() => camp.schedule('2025-07-01')).toThrow('zero audience');
  });

  it('should schedule + launch campaign', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 1000000,
    });
    camp.setAudienceSize(100);
    camp.schedule('2025-07-01');
    expect(camp.status).toBe('SCHEDULED');
    camp.launch();
    expect(camp.status).toBe('RUNNING');
    expect(camp.domainEvents.some(e => e.eventType === 'CampaignLaunchedEvent')).toBe(true);
  });

  it('should record delivery stats within budget', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 1000000,
    });
    camp.setAudienceSize(100);
    camp.schedule('2025-07-01');
    camp.launch();
    camp.recordDelivery(50, 48, 30, 10, 500000);
    expect(camp.sentCount).toBe(50);
    expect(camp.spentCents).toBe(500000);
  });

  it('should reject delivery exceeding audience size', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 1000000,
    });
    camp.setAudienceSize(10);
    camp.schedule('2025-07-01');
    camp.launch();
    camp.recordDelivery(5, 5, 0, 0, 50000);
    expect(() => camp.recordDelivery(10, 10, 0, 0, 100000)).toThrow('exceeds audience');
  });

  it('should reject delivery exceeding budget', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 100000,
    });
    camp.setAudienceSize(1000);
    camp.schedule('2025-07-01');
    camp.launch();
    expect(() => camp.recordDelivery(100, 100, 0, 0, 200000)).toThrow('exceeds budget');
  });

  it('should attribute conversion + compute ROI', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 1000000,
    });
    camp.setAudienceSize(100);
    camp.schedule('2025-07-01');
    camp.launch();
    camp.recordDelivery(100, 95, 50, 20, 800000);
    camp.attributeConversion(5000000);
    expect(camp.convertedCount).toBe(1);
    expect(camp.attributedRevenueCents).toBe(5000000);
    expect(camp.roi).toBeCloseTo((5000000 - 800000) / 800000, 2);
    camp.complete();
    expect(camp.status).toBe('COMPLETED');
    expect(camp.domainEvents.some(e => e.eventType === 'CampaignCompletedEvent')).toBe(true);
  });

  it('should pause + resume + complete', () => {
    const camp = CampaignAggregate.create({
      tenantId: 't1', campaignCode: 'CAMP-001', name: 'Promo',
      channel: 'SMS', audience: 'ALL_LEADS', budgetCents: 1000000,
    });
    camp.setAudienceSize(100);
    camp.schedule('2025-07-01');
    camp.launch();
    camp.pause();
    expect(camp.status).toBe('PAUSED');
    camp.resume();
    expect(camp.status).toBe('RUNNING');
    camp.complete();
    expect(camp.status).toBe('COMPLETED');
  });
});

// ─── FollowUp ────────────────────────────────────────────────────

describe('FollowUpAggregate', () => {
  it('should create in SCHEDULED status', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    expect(fu.status).toBe('SCHEDULED');
    expect(fu.domainEvents.some(e => e.eventType === 'FollowUpScheduledEvent')).toBe(true);
  });

  it('should start + complete with outcome', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.start();
    expect(fu.status).toBe('IN_PROGRESS');
    fu.complete('POSITIVE', 'Parent interested in nursery program', 15);
    expect(fu.status).toBe('COMPLETED');
    expect(fu.outcome).toBe('POSITIVE');
    expect(fu['_props'].durationMinutes).toBe(15);
  });

  it('should reject completion without notes', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.start();
    expect(() => fu.complete('POSITIVE', '')).toThrow('outcome notes');
  });

  it('should cancel with reason', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.cancel('Lead dropped');
    expect(fu.status).toBe('CANCELLED');
    expect(fu['_props'].cancellationReason).toBe('Lead dropped');
  });

  it('should mark missed', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.miss();
    expect(fu.status).toBe('MISSED');
    expect(fu.domainEvents.some(e => e.eventType === 'FollowUpMissedEvent')).toBe(true);
  });

  it('should reschedule missed follow-up', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.miss();
    fu.reschedule('2025-06-22T10:00:00Z', 'new-fu-id');
    expect(fu['_props'].rescheduledTo).toBe('2025-06-22T10:00:00Z');
    expect(fu['_props'].rescheduledFollowUpId).toBe('new-fu-id');
    expect(fu.domainEvents.some(e => e.eventType === 'FollowUpRescheduledEvent')).toBe(true);
  });

  it('should record reminder count', () => {
    const fu = FollowUpAggregate.create({
      tenantId: 't1', leadId: 'l1', counsellorId: 'c1',
      type: 'CALL', scheduledAt: '2025-06-20T10:00:00Z',
    });
    fu.recordReminderSent();
    fu.recordReminderSent();
    expect(fu['_props'].reminderSentCount).toBe(2);
  });
});
