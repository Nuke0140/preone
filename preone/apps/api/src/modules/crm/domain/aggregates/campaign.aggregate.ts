/**
 * CampaignAggregate — marketing campaign lifecycle.
 *
 * Lifecycle:
 *   DRAFT → SCHEDULED → RUNNING → {PAUSED | COMPLETED} → ARCHIVED
 *
 * Invariants:
 *   - Campaign code is unique per school
 *   - Cannot run without channel config
 *   - Budget stored as integer paise (NEVER float)
 *   - Sent count <= audience size
 *   - ROI computed from attributed conversions
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  CampaignCreatedEvent, CampaignScheduledEvent, CampaignLaunchedEvent,
  CampaignPausedEvent, CampaignCompletedEvent, CampaignArchivedEvent,
} from '../events/crm-events';

export type CampaignStatus =
  | 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | 'CANCELLED';

export type CampaignChannel =
  | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'MULTI';

export type CampaignAudience =
  | 'ALL_LEADS' | 'NEW_LEADS' | 'QUALIFIED_LEADS' | 'NURTURED_LEADS'
  | 'ALL_PARENTS' | 'PROSPECTIVE_PARENTS' | 'CUSTOM_SEGMENT';

export interface CampaignProps {
  tenantId: string;
  branchId?: string;
  campaignCode: string;
  name: string;
  description?: string;
  channel: CampaignChannel;
  audience: CampaignAudience;
  customSegmentQuery?: string; // JSON filter for CUSTOM_SEGMENT
  status: CampaignStatus;
  budgetCents: number;
  spentCents: number;
  audienceSize: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  convertedCount: number;
  templateId?: string;
  messageContent?: string;
  scheduledAt?: string;
  launchedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  attributedRevenueCents: number;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['RUNNING', 'CANCELLED', 'DRAFT'],
  RUNNING: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
  CANCELLED: [],
};

export class CampaignAggregate extends AggregateRoot<CampaignProps> {
  get tenantId(): string { return this._props.tenantId; }
  get campaignCode(): string { return this._props.campaignCode; }
  get status(): CampaignStatus { return this._props.status; }
  get channel(): CampaignChannel { return this._props.channel; }
  get audience(): CampaignAudience { return this._props.audience; }
  get budgetCents(): number { return this._props.budgetCents; }
  get spentCents(): number { return this._props.spentCents; }
  get sentCount(): number { return this._props.sentCount; }
  get convertedCount(): number { return this._props.convertedCount; }
  get attributedRevenueCents(): number { return this._props.attributedRevenueCents; }

  static create(props: Omit<
    CampaignProps,
    'status' | 'spentCents' | 'audienceSize' | 'sentCount' |
    'deliveredCount' | 'openedCount' | 'clickedCount' | 'convertedCount' |
    'attributedRevenueCents' | 'createdAt' | 'updatedAt'
  >): CampaignAggregate {
    const now = new Date().toISOString();
    const agg = new CampaignAggregate({
      ...props,
      status: 'DRAFT',
      spentCents: 0,
      audienceSize: 0,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      convertedCount: 0,
      attributedRevenueCents: 0,
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new CampaignCreatedEvent({
      campaignId: agg.id,
      tenantId: agg._props.tenantId,
      campaignCode: agg._props.campaignCode,
      name: agg._props.name,
      channel: agg._props.channel,
      audience: agg._props.audience,
      budgetCents: agg._props.budgetCents,
    }));
    return agg;
  }

  /**
   * Set audience size — fetched from segment query.
   */
  setAudienceSize(size: number): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error('Cannot set audience size after launch');
    }
    this._props.audienceSize = size;
    this._touch();
  }

  /**
   * Schedule the campaign for launch at a future time.
   */
  schedule(scheduledAt: string): void {
    this._requireTransition('SCHEDULED');
    if (this._props.audienceSize === 0) {
      throw new Error('Cannot schedule campaign with zero audience');
    }
    this._props.scheduledAt = scheduledAt;
    this._props.status = 'SCHEDULED';
    this._touch();
    this._addDomainEvent(new CampaignScheduledEvent({
      campaignId: this.id,
      tenantId: this._props.tenantId,
      scheduledAt,
    }));
  }

  /**
   * Launch the campaign — sends messages to audience.
   */
  launch(): void {
    this._requireTransition('RUNNING');
    this._props.status = 'RUNNING';
    this._props.launchedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new CampaignLaunchedEvent({
      campaignId: this.id,
      tenantId: this._props.tenantId,
      channel: this._props.channel,
      audienceSize: this._props.audienceSize,
    }));
  }

  /**
   * Record delivery stats — called by message gateway callback.
   */
  recordDelivery(sent: number, delivered: number, opened: number, clicked: number, costCents: number): void {
    if (this._props.status !== 'RUNNING' && this._props.status !== 'PAUSED') {
      throw new Error('Can only record delivery for RUNNING/PAUSED campaigns');
    }
    this._props.sentCount += sent;
    this._props.deliveredCount += delivered;
    this._props.openedCount += opened;
    this._props.clickedCount += clicked;
    this._props.spentCents += costCents;
    if (this._props.sentCount > this._props.audienceSize) {
      throw new Error(`Sent count ${this._props.sentCount} exceeds audience ${this._props.audienceSize}`);
    }
    if (this._props.spentCents > this._props.budgetCents) {
      throw new Error(`Spent ${this._props.spentCents}c exceeds budget ${this._props.budgetCents}c`);
    }
    this._touch();
  }

  /**
   * Attribute a conversion to this campaign.
   */
  attributeConversion(revenueCents: number): void {
    this._props.convertedCount += 1;
    this._props.attributedRevenueCents += revenueCents;
    this._touch();
  }

  pause(): void {
    this._requireTransition('PAUSED');
    this._props.status = 'PAUSED';
    this._touch();
    this._addDomainEvent(new CampaignPausedEvent({
      campaignId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  resume(): void {
    if (this._props.status !== 'PAUSED') {
      throw new Error('Can only resume from PAUSED status');
    }
    this._props.status = 'RUNNING';
    this._touch();
  }

  complete(): void {
    this._requireTransition('COMPLETED');
    this._props.status = 'COMPLETED';
    this._props.completedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new CampaignCompletedEvent({
      campaignId: this.id,
      tenantId: this._props.tenantId,
      sentCount: this._props.sentCount,
      deliveredCount: this._props.deliveredCount,
      convertedCount: this._props.convertedCount,
      spentCents: this._props.spentCents,
      attributedRevenueCents: this._props.attributedRevenueCents,
    }));
  }

  cancel(reason: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._props.cancelledAt = new Date().toISOString();
    this._props.cancellationReason = reason;
    this._touch();
  }

  archive(): void {
    this._requireTransition('ARCHIVED');
    this._props.status = 'ARCHIVED';
    this._touch();
    this._addDomainEvent(new CampaignArchivedEvent({
      campaignId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  get roi(): number {
    if (this._props.spentCents === 0) return 0;
    return (this._props.attributedRevenueCents - this._props.spentCents) / this._props.spentCents;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: CampaignStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid campaign transition: ${this._props.status} → ${target}`);
    }
  }
}
