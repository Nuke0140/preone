/**
 * CRM Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Lead, Campaign, FollowUp aggregates.
 *
 * Integration events (BTD §14):
 *   - LeadCaptured.v1    → Communication (welcome SMS/email)
 *   - LeadConverted.v1   → Admissions (auto-create application, sync HTTP)
 *   - LeadLost.v1        → Communication (win-back campaign trigger)
 *   - CampaignLaunched.v1 → Communication (fan-out to channels)
 *
 * Per BTD §14.1 — Integration Event Catalog includes:
 *   "AdmissionApproved.v1   Admissions → Identity  Create student record"
 *   We mirror the same pattern: LeadConverted → Admissions creates application.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Lead
// ─────────────────────────────────────────────

export class LeadCapturedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  branchId?: string;
  leadCode: string;
  parentFirstName: string;
  parentLastName: string;
  email?: string;
  phone: string;
  source: string;
  programInterest: string;
  campaignId?: string;
}> {}

export class LeadAssignedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  counsellorId: string;
  previousCounsellorId?: string;
}> {}

export class LeadContactedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  channel: string;
  contactCount: number;
}> {}

export class LeadQualifiedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  score: number;
  priority: string;
}> {}

export class LeadUnqualifiedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  reason: string;
}> {}

export class LeadConvertedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  leadCode: string;
  parentFirstName: string;
  parentLastName: string;
  email?: string;
  phone: string;
  childName?: string;
  childDateOfBirth?: string;
  programInterest: string;
  branchId?: string;
  applicationId: string;
  source: string;
  campaignId?: string;
}> {}

export class LeadLostEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
  reason: string;
}> {}

export class LeadReactivatedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
}> {}

export class LeadDroppedEvent extends DomainEvent<{
  leadId: string;
  tenantId: string;
}> {}

// ─────────────────────────────────────────────
// Campaign
// ─────────────────────────────────────────────

export class CampaignCreatedEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
  campaignCode: string;
  name: string;
  channel: string;
  audience: string;
  budgetCents: number;
}> {}

export class CampaignScheduledEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
  scheduledAt: string;
}> {}

export class CampaignLaunchedEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
  channel: string;
  audienceSize: number;
}> {}

export class CampaignPausedEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
}> {}

export class CampaignCompletedEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
  sentCount: number;
  deliveredCount: number;
  convertedCount: number;
  spentCents: number;
  attributedRevenueCents: number;
}> {}

export class CampaignArchivedEvent extends DomainEvent<{
  campaignId: string;
  tenantId: string;
}> {}

// ─────────────────────────────────────────────
// FollowUp
// ─────────────────────────────────────────────

export class FollowUpScheduledEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
  counsellorId: string;
  type: string;
  scheduledAt: string;
}> {}

export class FollowUpStartedEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
}> {}

export class FollowUpCompletedEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
  outcome: string;
}> {}

export class FollowUpCancelledEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
  reason: string;
}> {}

export class FollowUpMissedEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
  originalScheduledAt: string;
}> {}

export class FollowUpRescheduledEvent extends DomainEvent<{
  followUpId: string;
  tenantId: string;
  leadId: string;
  originalScheduledAt: string;
  newScheduledAt: string;
  newFollowUpId: string;
}> {}
