/**
 * LeadAggregate — CRM lead lifecycle (BTD §4.3 #2).
 *
 * Lifecycle:
 *   NEW → ASSIGNED → CONTACTED → {QUALIFIED | UNQUALIFIED}
 *     → {NURTURED | DROPPED}
 *     → {CONVERTED | LOST}
 *
 * Invariants:
 *   - Lead code is unique per school
 *   - Cannot convert without qualification
 *   - Conversion requires admission application ID (cross-context ref)
 *   - Lost leads require reason
 *   - Re-assignment logs previous counsellor
 *
 * Integration events emitted:
 *   - LeadConverted.v1 → Admissions (auto-create application)
 *   - LeadCaptured.v1 → Communication (welcome SMS/email)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  LeadCapturedEvent, LeadAssignedEvent, LeadContactedEvent,
  LeadQualifiedEvent, LeadUnqualifiedEvent, LeadConvertedEvent,
  LeadLostEvent, LeadReactivatedEvent, LeadDroppedEvent,
} from '../events/crm-events';

export type LeadStatus =
  | 'NEW' | 'ASSIGNED' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED'
  | 'NURTURED' | 'CONVERTED' | 'LOST' | 'DROPPED' | 'REACTIVATED';

export type LeadSource =
  | 'WEBSITE' | 'WALK_IN' | 'REFERRAL' | 'DIGITAL_AD' | 'SOCIAL_MEDIA'
  | 'PHONE_INQUIRY' | 'EMAIL_INQUIRY' | 'EVENT' | 'PARTNER' | 'OTHER';

export type LeadPriority = 'HOT' | 'WARM' | 'COLD';

export type ProgramInterest =
  | 'PLAYGROUP' | 'NURSERY' | 'JR_KG' | 'SR_KG' | 'DAYCARE'
  | 'AFTER_SCHOOL' | 'SUMMER_CAMP' | 'MULTI';

export interface LeadProps {
  tenantId: string;
  branchId?: string;
  leadCode: string;
  parentFirstName: string;
  parentLastName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  childName?: string;
  childDateOfBirth?: string;
  programInterest: ProgramInterest;
  preferredStartDate?: string;
  source: LeadSource;
  sourceDetails?: string; // e.g., campaign name, referrer name
  campaignId?: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedCounsellorId?: string;
  previousCounsellorId?: string;
  assignedAt?: string;
  firstContactedAt?: string;
  lastContactedAt?: string;
  contactCount: number;
  qualificationScore?: number; // 0-100
  qualificationNotes?: string;
  convertedAt?: string;
  convertedApplicationId?: string; // cross-context ref to Admissions
  convertedStudentId?: string;
  lostReason?: string;
  lostAt?: string;
  budgetCents?: number;
  location?: string;
  notes?: string;
  tags: string[];
  followUpCount: number;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['ASSIGNED', 'DROPPED'],
  ASSIGNED: ['CONTACTED', 'DROPPED', 'REACTIVATED'],
  CONTACTED: ['QUALIFIED', 'UNQUALIFIED', 'NURTURED', 'DROPPED', 'REACTIVATED'],
  QUALIFIED: ['NURTURED', 'CONVERTED', 'LOST', 'DROPPED', 'REACTIVATED'],
  UNQUALIFIED: ['NURTURED', 'DROPPED', 'REACTIVATED'],
  NURTURED: ['QUALIFIED', 'CONVERTED', 'LOST', 'DROPPED', 'REACTIVATED'],
  CONVERTED: [],
  LOST: ['REACTIVATED'],
  DROPPED: ['REACTIVATED'],
  REACTIVATED: ['ASSIGNED', 'CONTACTED', 'QUALIFIED'],
};

export class LeadAggregate extends AggregateRoot<LeadProps> {
  get tenantId(): string { return this._props.tenantId; }
  get leadCode(): string { return this._props.leadCode; }
  get status(): LeadStatus { return this._props.status; }
  get priority(): LeadPriority { return this._props.priority; }
  get assignedCounsellorId(): string | undefined { return this._props.assignedCounsellorId; }
  get contactCount(): number { return this._props.contactCount; }
  get qualificationScore(): number | undefined { return this._props.qualificationScore; }
  get convertedApplicationId(): string | undefined { return this._props.convertedApplicationId; }

  static create(props: Omit<
    LeadProps,
    'status' | 'priority' | 'contactCount' | 'followUpCount' | 'tags' |
    'createdAt' | 'updatedAt'
  >): LeadAggregate {
    const now = new Date().toISOString();
    const agg = new LeadAggregate({
      ...props,
      status: 'NEW',
      priority: 'WARM',
      contactCount: 0,
      followUpCount: 0,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    agg._addDomainEvent(new LeadCapturedEvent({
      leadId: agg.id,
      tenantId: agg._props.tenantId,
      branchId: agg._props.branchId,
      leadCode: agg._props.leadCode,
      parentFirstName: agg._props.parentFirstName,
      parentLastName: agg._props.parentLastName,
      email: agg._props.email,
      phone: agg._props.phone,
      source: agg._props.source,
      programInterest: agg._props.programInterest,
      campaignId: agg._props.campaignId,
    }));
    return agg;
  }

  /**
   * Assign lead to a counsellor.
   */
  assign(counsellorId: string): void {
    if (this._props.assignedCounsellorId && this._props.assignedCounsellorId !== counsellorId) {
      this._props.previousCounsellorId = this._props.assignedCounsellorId;
    }
    this._props.assignedCounsellorId = counsellorId;
    this._props.assignedAt = new Date().toISOString();
    if (this._props.status === 'NEW') {
      this._props.status = 'ASSIGNED';
    }
    this._touch();
    this._addDomainEvent(new LeadAssignedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      counsellorId,
      previousCounsellorId: this._props.previousCounsellorId,
    }));
  }

  /**
   * Record contact — increments counter + updates lastContactedAt.
   */
  recordContact(channel: string, notes?: string): void {
    if (!this._props.assignedCounsellorId) {
      throw new Error('Cannot contact unassigned lead');
    }
    this._props.contactCount += 1;
    const now = new Date().toISOString();
    if (!this._props.firstContactedAt) {
      this._props.firstContactedAt = now;
    }
    this._props.lastContactedAt = now;
    if (this._props.status === 'ASSIGNED' || this._props.status === 'REACTIVATED') {
      this._props.status = 'CONTACTED';
    }
    if (notes) this._props.notes = notes;
    this._touch();
    this._addDomainEvent(new LeadContactedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      channel,
      contactCount: this._props.contactCount,
    }));
  }

  /**
   * Qualify the lead — sets qualification score + moves to QUALIFIED.
   */
  qualify(score: number, notes?: string): void {
    if (score < 0 || score > 100) {
      throw new Error('Qualification score must be 0-100');
    }
    this._requireTransition('QUALIFIED');
    this._props.qualificationScore = score;
    this._props.qualificationNotes = notes;
    this._props.status = 'QUALIFIED';
    if (score >= 70) this._props.priority = 'HOT';
    else if (score >= 40) this._props.priority = 'WARM';
    else this._props.priority = 'COLD';
    this._touch();
    this._addDomainEvent(new LeadQualifiedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      score,
      priority: this._props.priority,
    }));
  }

  /**
   * Disqualify the lead — moves to UNQUALIFIED.
   */
  unqualify(reason: string): void {
    this._requireTransition('UNQUALIFIED');
    this._props.qualificationNotes = reason;
    this._props.status = 'UNQUALIFIED';
    this._props.priority = 'COLD';
    this._touch();
    this._addDomainEvent(new LeadUnqualifiedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  /**
   * Nurture the lead — long-term follow-up.
   */
  nurture(): void {
    this._requireTransition('NURTURED');
    this._props.status = 'NURTURED';
    this._touch();
  }

  /**
   * Convert the lead — links to admission application.
   * Per BTD §14.1: emits LeadConverted.v1 → Admissions auto-creates application.
   */
  convert(applicationId: string): void {
    this._requireTransition('CONVERTED');
    this._props.status = 'CONVERTED';
    this._props.convertedAt = new Date().toISOString();
    this._props.convertedApplicationId = applicationId;
    this._touch();
    this._addDomainEvent(new LeadConvertedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      leadCode: this._props.leadCode,
      parentFirstName: this._props.parentFirstName,
      parentLastName: this._props.parentLastName,
      email: this._props.email,
      phone: this._props.phone,
      childName: this._props.childName,
      childDateOfBirth: this._props.childDateOfBirth,
      programInterest: this._props.programInterest,
      branchId: this._props.branchId,
      applicationId,
      source: this._props.source,
      campaignId: this._props.campaignId,
    }));
  }

  /**
   * Mark lead as lost.
   */
  lose(reason: string): void {
    this._requireTransition('LOST');
    this._props.status = 'LOST';
    this._props.lostReason = reason;
    this._props.lostAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new LeadLostEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  /**
   * Drop the lead — no response after multiple attempts.
   */
  drop(): void {
    this._requireTransition('DROPPED');
    this._props.status = 'DROPPED';
    this._touch();
    this._addDomainEvent(new LeadDroppedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  /**
   * Reactivate a lost/dropped lead.
   */
  reactivate(): void {
    this._requireTransition('REACTIVATED');
    this._props.status = 'REACTIVATED';
    this._props.lostReason = undefined;
    this._props.lostAt = undefined;
    this._touch();
    this._addDomainEvent(new LeadReactivatedEvent({
      leadId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  setPriority(p: LeadPriority): void {
    this._props.priority = p;
    this._touch();
  }

  addTag(tag: string): void {
    if (!this._props.tags.includes(tag)) {
      this._props.tags.push(tag);
      this._touch();
    }
  }

  incrementFollowUp(): void {
    this._props.followUpCount += 1;
    this._touch();
  }

  linkConvertedStudent(studentId: string): void {
    this._props.convertedStudentId = studentId;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: LeadStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid lead transition: ${this._props.status} → ${target}`);
    }
  }
}
