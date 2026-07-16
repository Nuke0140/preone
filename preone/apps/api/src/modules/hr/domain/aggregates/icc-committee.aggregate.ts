/**
 * IccCommitteeAggregate — Internal Complaints Committee (ICC) lifecycle.
 *
 * Per BRC R-HR-009 — Internal Complaints Committee (ICC):
 *   Trigger: Annual ICC constitution (April)
 *   Action: Constitute ICC; publish committee details on notice board + employee
 *           handbook; annual training
 *   Owners: HR + Director
 *
 * Per POSH Act 2013 (Indian Parliament):
 *   - Mandatory for any workplace with >=10 employees
 *   - Chairperson MUST be a senior woman employee
 *   - At least 2 employee members
 *   - At least 1 external member (from NGO / women's rights org)
 *   - Tenure: 3 years max per member
 *
 * Lifecycle:
 *   ACTIVE → DISSOLVED (annual reconstitution)
 *
 * Invariants:
 *   - One active committee per (school, fiscalYear, branch?)
 *   - Cannot dissolve if there are pending complaints (checked at service layer)
 *   - publish() must be called before complaints can be filed against this committee
 *   - Member composition rules enforced at service layer (cross-aggregate)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

export interface IccCommitteeMemberProps {
  id: string;
  employeeId: string;
  role: 'CHAIRPERSON' | 'MEMBER' | 'EXTERNAL_MEMBER';
  externalOrgName?: string;
  appointedAt: string;
  isActive: boolean;
}

export interface IccCommitteeProps {
  tenantId: string;
  branchId?: string;
  constitutionDate: string;   // YYYY-MM-DD (April 1 of FY)
  fiscalYear: string;          // "2026-2027"
  status: 'ACTIVE' | 'DISSOLVED';
  publishedAt?: string;
  dissolvedAt?: string;
  members: IccCommitteeMemberProps[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== Domain Events =====

export class IccCommitteeConstitutedEvent extends DomainEvent<{
  tenantId: string; committeeId: string; fiscalYear: string;
  constitutionDate: string; memberCount: number;
}> {}

export class IccCommitteePublishedEvent extends DomainEvent<{
  tenantId: string; committeeId: string; publishedAt: string;
}> {}

export class IccCommitteeDissolvedEvent extends DomainEvent<{
  tenantId: string; committeeId: string; dissolvedAt: string;
}> {}

export class IccMemberAddedEvent extends DomainEvent<{
  tenantId: string; committeeId: string; employeeId: string;
  role: IccCommitteeMemberProps['role'];
}> {}

export class IccMemberRemovedEvent extends DomainEvent<{
  tenantId: string; committeeId: string; employeeId: string;
}> {}

// ===== Aggregate =====

export class IccCommitteeAggregate extends AggregateRoot<IccCommitteeProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string | undefined { return this._props.branchId; }
  get constitutionDate(): string { return this._props.constitutionDate; }
  get fiscalYear(): string { return this._props.fiscalYear; }
  get status(): 'ACTIVE' | 'DISSOLVED' { return this._props.status; }
  get publishedAt(): string | undefined { return this._props.publishedAt; }
  get members(): readonly IccCommitteeMemberProps[] { return this._props.members; }

  static create(props: Omit<IccCommitteeProps, 'status' | 'members' | 'createdAt' | 'updatedAt'>): IccCommitteeAggregate {
    const now = new Date().toISOString();
    const agg = new IccCommitteeAggregate({
      ...props,
      status: 'ACTIVE',
      members: [],
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new IccCommitteeConstitutedEvent({
      tenantId: props.tenantId,
      committeeId: agg.id,
      fiscalYear: props.fiscalYear,
      constitutionDate: props.constitutionDate,
      memberCount: 0,
    }));

    return agg;
  }

  /** Add a member to the committee. */
  addMember(employeeId: string, role: IccCommitteeMemberProps['role'], externalOrgName?: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot add member to ${this._props.status} committee`);
    }

    // Invariant: no duplicate members
    if (this._props.members.some(m => m.employeeId === employeeId && m.isActive)) {
      throw new Error(`Employee ${employeeId} is already an active member of this committee`);
    }

    // Invariant: only one chairperson per committee
    if (role === 'CHAIRPERSON' && this._props.members.some(m => m.role === 'CHAIRPERSON' && m.isActive)) {
      throw new Error('Committee already has an active chairperson');
    }

    // Invariant: external member must have external org name
    if (role === 'EXTERNAL_MEMBER' && !externalOrgName) {
      throw new Error('External member must have externalOrgName');
    }

    const member: IccCommitteeMemberProps = {
      id: crypto.randomUUID(),
      employeeId,
      role,
      externalOrgName,
      appointedAt: new Date().toISOString(),
      isActive: true,
    };
    this._props.members.push(member);
    this._touch();
    this._addDomainEvent(new IccMemberAddedEvent({
      tenantId: this._props.tenantId,
      committeeId: this.id,
      employeeId,
      role,
    }));
  }

  /** Remove a member (mark inactive). */
  removeMember(employeeId: string): void {
    const member = this._props.members.find(m => m.employeeId === employeeId && m.isActive);
    if (!member) {
      throw new Error(`Employee ${employeeId} is not an active member of this committee`);
    }
    member.isActive = false;
    this._touch();
    this._addDomainEvent(new IccMemberRemovedEvent({
      tenantId: this._props.tenantId,
      committeeId: this.id,
      employeeId,
    }));
  }

  /**
   * Publish committee details (notice board + employee handbook).
   * Required before complaints can be filed against this committee.
   */
  publish(publishedAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot publish ${this._props.status} committee`);
    }
    if (this._props.publishedAt) {
      throw new Error('Committee already published');
    }
    // Invariant: cannot publish without minimum composition (POSH Act)
    this._requireValidComposition();

    this._props.publishedAt = publishedAt;
    this._touch();
    this._addDomainEvent(new IccCommitteePublishedEvent({
      tenantId: this._props.tenantId,
      committeeId: this.id,
      publishedAt,
    }));
  }

  /** Dissolve committee (annual reconstitution). */
  dissolve(dissolvedAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot dissolve ${this._props.status} committee`);
    }
    this._props.status = 'DISSOLVED';
    this._props.dissolvedAt = dissolvedAt;
    this._touch();
    this._addDomainEvent(new IccCommitteeDissolvedEvent({
      tenantId: this._props.tenantId,
      committeeId: this.id,
      dissolvedAt,
    }));
  }

  /** Active members only (excludes removed). */
  get activeMembers(): readonly IccCommitteeMemberProps[] {
    return this._props.members.filter(m => m.isActive);
  }

  /** Validate committee composition per POSH Act 2013. */
  private _requireValidComposition(): void {
    const active = this.activeMembers;
    const chair = active.find(m => m.role === 'CHAIRPERSON');
    const external = active.filter(m => m.role === 'EXTERNAL_MEMBER');
    const regular = active.filter(m => m.role === 'MEMBER');

    if (!chair) {
      throw new Error('POSH Act violation: committee must have a chairperson (senior woman employee)');
    }
    if (regular.length < 2) {
      throw new Error(`POSH Act violation: committee must have at least 2 regular members (has ${regular.length})`);
    }
    if (external.length < 1) {
      throw new Error('POSH Act violation: committee must have at least 1 external member (NGO/representative)');
    }
  }

  /** Composition check (public — for service-layer pre-flight validation). */
  get isCompositionValid(): boolean {
    try {
      this._requireValidComposition();
      return true;
    } catch {
      return false;
    }
  }

  private _touch(): void { this._props.updatedAt = new Date().toISOString(); }
}
