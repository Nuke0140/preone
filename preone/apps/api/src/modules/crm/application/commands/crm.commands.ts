/**
 * CRM Commands — CQRS write side (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─── Lead ───────────────────────────────────────────────────

export class CaptureLeadCommand implements Command<{
  tenantId: string;
  branchId?: string;
  parentFirstName: string;
  parentLastName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  childName?: string;
  childDateOfBirth?: string;
  programInterest: string;
  preferredStartDate?: string;
  source: string;
  sourceDetails?: string;
  campaignId?: string;
  budgetCents?: number;
  location?: string;
  notes?: string;
  assignedCounsellorId?: string;
}, { id: string; leadCode: string }> {
  readonly type = 'Crm.CaptureLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class AssignLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  counsellorId: string;
}, { id: string }> {
  readonly type = 'Crm.AssignLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ContactLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  channel: string;
  notes?: string;
}, { id: string }> {
  readonly type = 'Crm.ContactLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class QualifyLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  score: number;
  notes?: string;
}, { id: string }> {
  readonly type = 'Crm.QualifyLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class UnqualifyLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Crm.UnqualifyLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ConvertLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  applicationId: string;
}, { id: string }> {
  readonly type = 'Crm.ConvertLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class LoseLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Crm.LoseLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class DropLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.DropLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ReactivateLeadCommand implements Command<{
  leadId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.ReactivateLead';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── Campaign ───────────────────────────────────────────────

export class CreateCampaignCommand implements Command<{
  tenantId: string;
  branchId?: string;
  campaignCode: string;
  name: string;
  description?: string;
  channel: string;
  audience: string;
  customSegmentQuery?: string;
  budgetCents: number;
  templateId?: string;
  messageContent?: string;
}, { id: string }> {
  readonly type = 'Crm.CreateCampaign';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class ScheduleCampaignCommand implements Command<{
  campaignId: string;
  tenantId: string;
  scheduledAt: string;
}, { id: string }> {
  readonly type = 'Crm.ScheduleCampaign';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class LaunchCampaignCommand implements Command<{
  campaignId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.LaunchCampaign';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class PauseCampaignCommand implements Command<{
  campaignId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.PauseCampaign';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteCampaignCommand implements Command<{
  campaignId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.CompleteCampaign';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

// ─── FollowUp ───────────────────────────────────────────────

export class ScheduleFollowUpCommand implements Command<{
  tenantId: string;
  branchId?: string;
  leadId: string;
  campaignId?: string;
  counsellorId: string;
  type: string;
  scheduledAt: string;
}, { id: string }> {
  readonly type = 'Crm.ScheduleFollowUp';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CompleteFollowUpCommand implements Command<{
  followUpId: string;
  tenantId: string;
  outcome: string;
  notes: string;
  durationMinutes?: number;
}, { id: string }> {
  readonly type = 'Crm.CompleteFollowUp';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class MissFollowUpCommand implements Command<{
  followUpId: string;
  tenantId: string;
}, { id: string }> {
  readonly type = 'Crm.MissFollowUp';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}

export class CancelFollowUpCommand implements Command<{
  followUpId: string;
  tenantId: string;
  reason: string;
}, { id: string }> {
  readonly type = 'Crm.CancelFollowUp';
  constructor(readonly payload: any, readonly metadata: CommandMetadata) {}
}
