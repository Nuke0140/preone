/**
 * CRM Service — application-layer orchestrator for the CRM bounded context.
 *
 * Responsibilities:
 *   - Capture leads from multiple sources (website, walk-in, referral, ads)
 *   - Assign leads to counsellors
 *   - Manage follow-up cadence with auto-reminders
 *   - Track conversion + attribution
 *   - Launch + monitor marketing campaigns
 *
 * Integration events:
 *   - Listens: ApplicationCreatedEvent (Admissions) → auto-convert lead
 *   - Emits:   LeadConverted.v1 → Admissions (auto-create application)
 *              LeadCaptured.v1  → Communication (welcome SMS/email)
 */
import { Injectable, Inject, Logger } from '@nestjs/common';

import { EventBusService } from '@infra/event-bus/event-bus.service';
import { PrismaService } from '@infra/prisma/prisma.service';

import { LeadAggregate } from '../../domain/aggregates/lead.aggregate';
import type {
  LeadSource, LeadPriority, ProgramInterest,
} from '../../domain/aggregates/lead.aggregate';
import { CampaignAggregate } from '../../domain/aggregates/campaign.aggregate';
import type {
  CampaignChannel, CampaignAudience,
} from '../../domain/aggregates/campaign.aggregate';
import { FollowUpAggregate } from '../../domain/aggregates/follow-up.aggregate';
import type { FollowUpType, FollowUpOutcome } from '../../domain/aggregates/follow-up.aggregate';
import type {
  LeadRepository, CampaignRepository, FollowUpRepository,
} from '../../domain/repositories/crm.repository';
import {
  LEAD_REPOSITORY, CAMPAIGN_REPOSITORY, FOLLOW_UP_REPOSITORY,
} from '../../domain/repositories/tokens';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @Inject(LEAD_REPOSITORY) private readonly leads: LeadRepository,
    @Inject(CAMPAIGN_REPOSITORY) private readonly campaigns: CampaignRepository,
    @Inject(FOLLOW_UP_REPOSITORY) private readonly followUps: FollowUpRepository,
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Leads ────────────────────────────────────────────────────

  async captureLead(props: {
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
  }): Promise<LeadAggregate> {
    // Generate lead code: LD-{YYYYMMDD}-{seq}
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const leadCode = `LD-${dateStr}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    // Check for duplicate by phone
    const existing = await this.leads.findByPhone(props.tenantId, props.phone);
    if (existing) {
      throw new Error(`Lead with phone ${props.phone} already exists: ${existing.leadCode}`);
    }
    const lead = LeadAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      leadCode,
      parentFirstName: props.parentFirstName,
      parentLastName: props.parentLastName,
      email: props.email,
      phone: props.phone,
      alternatePhone: props.alternatePhone,
      childName: props.childName,
      childDateOfBirth: props.childDateOfBirth,
      programInterest: props.programInterest as ProgramInterest,
      preferredStartDate: props.preferredStartDate,
      source: props.source as LeadSource,
      sourceDetails: props.sourceDetails,
      campaignId: props.campaignId,
      budgetCents: props.budgetCents,
      location: props.location,
      notes: props.notes,
    });
    if (props.assignedCounsellorId) {
      lead.assign(props.assignedCounsellorId);
    }
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
    this.logger.log(`Captured lead ${lead.leadCode} from source ${props.source}`);
    return lead;
  }

  async assignLead(leadId: string, tenantId: string, counsellorId: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.assign(counsellorId);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async contactLead(leadId: string, tenantId: string, channel: string, notes?: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.recordContact(channel, notes);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async qualifyLead(leadId: string, tenantId: string, score: number, notes?: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.qualify(score, notes);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async unqualifyLead(leadId: string, tenantId: string, reason: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.unqualify(reason);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  /**
   * Convert a lead — links to admission application.
   * Per BTD §14.1: emits LeadConverted.v1 → Admissions auto-creates application.
   */
  async convertLead(leadId: string, tenantId: string, applicationId: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.convert(applicationId);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
    this.logger.log(`Converted lead ${lead.leadCode} → application ${applicationId}`);
  }

  async loseLead(leadId: string, tenantId: string, reason: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.lose(reason);
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async dropLead(leadId: string, tenantId: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.drop();
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async reactivateLead(leadId: string, tenantId: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.reactivate();
    await this.leads.save(lead);
    await this.eventBus.publishAll(lead.commit());
  }

  async linkConvertedStudent(leadId: string, studentId: string, tenantId: string): Promise<void> {
    const lead = await this._loadLeadOrThrow(leadId, tenantId);
    lead.linkConvertedStudent(studentId);
    await this.leads.save(lead);
  }

  // ─── Campaigns ────────────────────────────────────────────────

  async createCampaign(props: {
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
  }): Promise<CampaignAggregate> {
    const existing = await this.campaigns.findByCode(props.tenantId, props.campaignCode);
    if (existing) {
      throw new Error(`Campaign code ${props.campaignCode} already exists`);
    }
    const camp = CampaignAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      campaignCode: props.campaignCode,
      name: props.name,
      description: props.description,
      channel: props.channel as CampaignChannel,
      audience: props.audience as CampaignAudience,
      customSegmentQuery: props.customSegmentQuery,
      budgetCents: props.budgetCents,
      templateId: props.templateId,
      messageContent: props.messageContent,
    });
    // Compute audience size based on segment
    const audienceSize = await this._computeAudienceSize(
      props.tenantId, props.audience, props.customSegmentQuery,
    );
    camp.setAudienceSize(audienceSize);
    await this.campaigns.save(camp);
    await this.eventBus.publishAll(camp.commit());
    return camp;
  }

  async scheduleCampaign(campaignId: string, tenantId: string, scheduledAt: string): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.schedule(scheduledAt);
    await this.campaigns.save(camp);
    await this.eventBus.publishAll(camp.commit());
  }

  async launchCampaign(campaignId: string, tenantId: string): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.launch();
    await this.campaigns.save(camp);
    await this.eventBus.publishAll(camp.commit());
  }

  async pauseCampaign(campaignId: string, tenantId: string): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.pause();
    await this.campaigns.save(camp);
    await this.eventBus.publishAll(camp.commit());
  }

  async completeCampaign(campaignId: string, tenantId: string): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.complete();
    await this.campaigns.save(camp);
    await this.eventBus.publishAll(camp.commit());
  }

  async recordCampaignDelivery(
    campaignId: string, tenantId: string,
    sent: number, delivered: number, opened: number, clicked: number, costCents: number,
  ): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.recordDelivery(sent, delivered, opened, clicked, costCents);
    await this.campaigns.save(camp);
  }

  async attributeCampaignConversion(campaignId: string, tenantId: string, revenueCents: number): Promise<void> {
    const camp = await this._loadCampaignOrThrow(campaignId, tenantId);
    camp.attributeConversion(revenueCents);
    await this.campaigns.save(camp);
  }

  // ─── FollowUps ────────────────────────────────────────────────

  async scheduleFollowUp(props: {
    tenantId: string;
    branchId?: string;
    leadId: string;
    campaignId?: string;
    counsellorId: string;
    type: string;
    scheduledAt: string;
  }): Promise<FollowUpAggregate> {
    await this._loadLeadOrThrow(props.leadId, props.tenantId);
    const fu = FollowUpAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      leadId: props.leadId,
      campaignId: props.campaignId,
      counsellorId: props.counsellorId,
      type: props.type as FollowUpType,
      scheduledAt: props.scheduledAt,
    });
    await this.followUps.save(fu);
    await this.eventBus.publishAll(fu.commit());
    return fu;
  }

  async completeFollowUp(
    followUpId: string, tenantId: string,
    outcome: string, notes: string, durationMinutes?: number,
  ): Promise<void> {
    const fu = await this._loadFollowUpOrThrow(followUpId, tenantId);
    fu.complete(outcome as FollowUpOutcome, notes, durationMinutes);
    await this.followUps.save(fu);
    await this.eventBus.publishAll(fu.commit());
    // If outcome is CONVERTED, trigger lead conversion flow
    if (outcome === 'CONVERTED') {
      this.logger.log(`Follow-up ${followUpId} marked CONVERTED — lead conversion flow may be triggered`);
    }
  }

  async missFollowUp(followUpId: string, tenantId: string): Promise<void> {
    const fu = await this._loadFollowUpOrThrow(followUpId, tenantId);
    fu.miss();
    await this.followUps.save(fu);
    await this.eventBus.publishAll(fu.commit());
  }

  async cancelFollowUp(followUpId: string, tenantId: string, reason: string): Promise<void> {
    const fu = await this._loadFollowUpOrThrow(followUpId, tenantId);
    fu.cancel(reason);
    await this.followUps.save(fu);
    await this.eventBus.publishAll(fu.commit());
  }

  // ─── Private helpers ──────────────────────────────────────────

  private async _loadLeadOrThrow(id: string, tenantId: string): Promise<LeadAggregate> {
    const l = await this.leads.findById(id, tenantId);
    if (!l) throw new Error(`Lead ${id} not found`);
    return l;
  }

  private async _loadCampaignOrThrow(id: string, tenantId: string): Promise<CampaignAggregate> {
    const c = await this.campaigns.findById(id, tenantId);
    if (!c) throw new Error(`Campaign ${id} not found`);
    return c;
  }

  private async _loadFollowUpOrThrow(id: string, tenantId: string): Promise<FollowUpAggregate> {
    const f = await this.followUps.findById(id, tenantId);
    if (!f) throw new Error(`FollowUp ${id} not found`);
    return f;
  }

  private async _computeAudienceSize(
    tenantId: string, audience: string, customSegmentQuery?: string,
  ): Promise<number> {
    const where: any = { schoolId: tenantId };
    switch (audience) {
      case 'NEW_LEADS': where.status = 'NEW'; break;
      case 'QUALIFIED_LEADS': where.status = 'QUALIFIED'; break;
      case 'NURTURED_LEADS': where.status = 'NURTURED'; break;
      case 'PROSPECTIVE_PARENTS':
        where.status = { in: ['NEW', 'ASSIGNED', 'CONTACTED', 'QUALIFIED', 'NURTURED'] };
        break;
      case 'ALL_LEADS':
      case 'CUSTOM_SEGMENT':
      default: break;
    }
    return this.prisma.lead.count({ where });
  }
}
