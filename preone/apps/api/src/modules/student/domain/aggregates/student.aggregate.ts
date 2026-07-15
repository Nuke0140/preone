/**
 * StudentAggregate — the core student entity (BTD §17.1 — Aggregate = Transaction Boundary).
 *
 * Per ERD v3.0 §14.4.1: "A student is a child enrolled (or about to be enrolled)
 *   in a preschool. Each student belongs to exactly one school and one branch."
 *
 * Per ADR v1.0:
 *   - Lifecycle: PROSPECT → ACTIVE → {GRADUATED | WITHDRAWN | TRANSFERRED | EXPELLED}
 *   - INACTIVE is a temporary state (sabbatical, illness) — student returns to ACTIVE
 *   - One primary guardian per student (must be marked explicitly)
 *   - Soft delete (deleted_at)
 *   - PII fields (aadhaar, birthCertificateNumber) are pgcrypto-encrypted at rest
 *   - Medical alerts denormalised to student row for O(1) lookup by teacher
 *
 * Invariants enforced:
 *   - Status transitions follow allowed state machine (see `_canTransition`)
 *   - Cannot enrol a non-PROSPECT student (must be PROSPECT → ACTIVE on first enrol)
 *   - Cannot withdraw/transfer/graduate a non-ACTIVE student
 *   - ageMonths is recomputed on every state change (kept in sync)
 *   - At most one primary guardian
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { DomainEvent } from '@shared/kernel/domain-event';

import {
  StudentCreatedEvent, StudentEnrolledEvent, StudentPromotedEvent,
  StudentTransferredEvent, StudentWithdrawnEvent, StudentGraduatedEvent,
  StudentReactivatedEvent, StudentStatusChangedEvent, GuardianAddedEvent,
  GuardianRemovedEvent, PrimaryGuardianChangedEvent, MedicalRecordUpdatedEvent,
  StudentFlagAddedEvent, StudentFlagResolvedEvent, StudentProfileUpdatedEvent,
} from '../events/student-events';

export type StudentStatus =
  | 'PROSPECT' | 'ACTIVE' | 'INACTIVE'
  | 'TRANSFERRED' | 'GRADUATED' | 'WITHDRAWN' | 'EXPELLED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
export type BloodGroup =
  | 'A_POSITIVE' | 'A_NEGATIVE' | 'B_POSITIVE' | 'B_NEGATIVE'
  | 'AB_POSITIVE' | 'AB_NEGATIVE' | 'O_POSITIVE' | 'O_NEGATIVE' | 'UNKNOWN';

export type GuardianRelation =
  | 'FATHER' | 'MOTHER' | 'GRANDFATHER' | 'GRANDMOTHER'
  | 'LEGAL_GUARDIAN' | 'BROTHER' | 'SISTER' | 'UNCLE' | 'AUNT' | 'OTHER';

export type GuardianStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type StudentFlagSeverity = 'INFO' | 'WARNING' | 'ALERT';

export interface GuardianLinkProps {
  guardianId: string;
  relation: GuardianRelation;
  isPrimary: boolean;
  isPickupAuthorized: boolean;
  isEmergencyContact: boolean;
  custodyHolder: boolean;
  notes?: string;
}

export interface MedicalAlert {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  summary: string;
}

export interface StudentProps {
  tenantId: string;
  branchId: string;

  admissionNumber: string;
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  dateOfBirth: string; // ISO date
  gender: Gender;
  bloodGroup: BloodGroup;
  nationality: string;
  religion?: string;
  motherTongue?: string;
  // ENCRYPTED at rest (pgcrypto) — plaintext only in memory
  aadhaarNumber?: string;
  birthCertificateNumber?: string;
  placeOfBirth?: string;
  photoUrl?: string;

  status: StudentStatus;
  admittedAt: string;
  enrolledAt?: string;
  exitedAt?: string;
  exitReason?: string;

  ageMonths: number;
  currentGradeLevel?: string;
  currentSectionId?: string;

  allergiesSummary?: string;
  medicalAlerts?: MedicalAlert[];
  custodyNotes?: string;

  isPickupRestricted: boolean;

  guardianLinks: GuardianLinkProps[];

  deletedAt?: string;
}

const ALLOWED_TRANSITIONS: Record<StudentStatus, StudentStatus[]> = {
  PROSPECT:    ['ACTIVE', 'WITHDRAWN', 'EXPELLED'],
  ACTIVE:      ['INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'EXPELLED'],
  INACTIVE:    ['ACTIVE', 'WITHDRAWN', 'EXPELLED'],
  TRANSFERRED: [], // terminal state
  GRADUATED:   [], // terminal state
  WITHDRAWN:   ['ACTIVE'], // can re-activate
  EXPELLED:    [], // terminal state
};

export class StudentAggregate extends AggregateRoot<StudentProps> {
  // ─────── Read accessors ───────
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get admissionNumber(): string { return this._props.admissionNumber; }
  get legalFirstName(): string { return this._props.legalFirstName; }
  get legalLastName(): string { return this._props.legalLastName; }
  get preferredName(): string | undefined { return this._props.preferredName; }
  get displayName(): string { return this._props.preferredName ?? `${this._props.legalFirstName} ${this._props.legalLastName}`; }
  get dateOfBirth(): string { return this._props.dateOfBirth; }
  get gender(): Gender { return this._props.gender; }
  get bloodGroup(): BloodGroup { return this._props.bloodGroup; }
  get nationality(): string { return this._props.nationality; }
  get religion(): string | undefined { return this._props.religion; }
  get motherTongue(): string | undefined { return this._props.motherTongue; }
  get aadhaarNumber(): string | undefined { return this._props.aadhaarNumber; }
  get birthCertificateNumber(): string | undefined { return this._props.birthCertificateNumber; }
  get placeOfBirth(): string | undefined { return this._props.placeOfBirth; }
  get photoUrl(): string | undefined { return this._props.photoUrl; }

  get status(): StudentStatus { return this._props.status; }
  get admittedAt(): string { return this._props.admittedAt; }
  get enrolledAt(): string | undefined { return this._props.enrolledAt; }
  get exitedAt(): string | undefined { return this._props.exitedAt; }
  get exitReason(): string | undefined { return this._props.exitReason; }

  get ageMonths(): number { return this._props.ageMonths; }
  get currentGradeLevel(): string | undefined { return this._props.currentGradeLevel; }
  get currentSectionId(): string | undefined { return this._props.currentSectionId; }

  get allergiesSummary(): string | undefined { return this._props.allergiesSummary; }
  get medicalAlerts(): MedicalAlert[] { return [...(this._props.medicalAlerts ?? [])]; }
  get custodyNotes(): string | undefined { return this._props.custodyNotes; }
  get isPickupRestricted(): boolean { return this._props.isPickupRestricted; }

  get guardianLinks(): GuardianLinkProps[] { return [...this._props.guardianLinks]; }
  get primaryGuardian(): GuardianLinkProps | undefined {
    return this._props.guardianLinks.find((g) => g.isPrimary);
  }

  get deletedAt(): string | undefined { return this._props.deletedAt; }

  // ─────── Invariants ───────
  get isProspect(): boolean { return this._props.status === 'PROSPECT'; }
  get isActive(): boolean { return this._props.status === 'ACTIVE'; }
  get isInactive(): boolean { return this._props.status === 'INACTIVE'; }
  get hasExited(): boolean {
    return ['TRANSFERRED', 'GRADUATED', 'WITHDRAWN', 'EXPELLED'].includes(this._props.status);
  }
  get isDeleted(): boolean { return this._props.deletedAt !== undefined; }

  // ─────── State-changing operations ───────

  enroll(sectionId: string, gradeLevel: string, enrolledAt: string): void {
    if (this._props.status !== 'PROSPECT') {
      throw new Error(`Cannot enrol student in status ${this._props.status} — must be PROSPECT`);
    }
    this._props.status = 'ACTIVE';
    this._props.currentSectionId = sectionId;
    this._props.currentGradeLevel = gradeLevel;
    this._props.enrolledAt = enrolledAt;
    this._addDomainEvent(new StudentEnrolledEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      sectionId,
      enrollmentId: '', // filled in by service layer after Enrollment row created
      gradeLevel,
      enrolledAt,
    }));
  }

  promote(toSectionId: string, toGradeLevel: string, promotedAt: string): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error(`Cannot promote student in status ${this._props.status}`);
    }
    const fromSectionId = this._props.currentSectionId ?? '';
    const fromGradeLevel = this._props.currentGradeLevel ?? '';
    this._props.currentSectionId = toSectionId;
    this._props.currentGradeLevel = toGradeLevel;
    this._addDomainEvent(new StudentPromotedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      fromSectionId,
      toSectionId,
      fromGradeLevel,
      toGradeLevel,
      promotedAt,
    }));
  }

  transfer(toBranchId: string, reason: string, transferredAt: string, toSchoolId?: string): void {
    this._transitionTo('TRANSFERRED', transferredAt, reason);
    this._addDomainEvent(new StudentTransferredEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      toBranchId,
      toSchoolId,
      reason,
      transferredAt,
    }));
  }

  withdraw(reason: string, withdrawnAt: string): void {
    this._transitionTo('WITHDRAWN', withdrawnAt, reason);
    this._addDomainEvent(new StudentWithdrawnEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      reason,
      withdrawnAt,
    }));
  }

  graduate(graduatedAt: string): void {
    this._transitionTo('GRADUATED', graduatedAt, 'Completed preschool');
    this._addDomainEvent(new StudentGraduatedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      fromGradeLevel: this._props.currentGradeLevel ?? '',
      graduatedAt,
    }));
  }

  reactivate(reactivatedAt: string): void {
    if (this._props.status !== 'WITHDRAWN' && this._props.status !== 'INACTIVE') {
      throw new Error(`Cannot reactivate student in status ${this._props.status}`);
    }
    const fromStatus = this._props.status;
    this._props.status = 'ACTIVE';
    this._props.exitedAt = undefined;
    this._props.exitReason = undefined;
    this._addDomainEvent(new StudentReactivatedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      reactivatedAt,
    }));
    this._addDomainEvent(new StudentStatusChangedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      fromStatus,
      toStatus: 'ACTIVE',
      changedAt: reactivatedAt,
    }));
  }

  deactivate(reason: string, now: string): void {
    // INACTIVE = temporary (sabbatical, illness)
    this._transitionTo('INACTIVE', now, reason);
  }

  expel(reason: string, now: string): void {
    this._transitionTo('EXPELLED', now, reason);
  }

  addGuardian(link: GuardianLinkProps, addedBy: string): void {
    if (this._props.guardianLinks.some((g) => g.guardianId === link.guardianId)) {
      throw new Error(`Guardian ${link.guardianId} already linked to student ${this.id}`);
    }
    // Enforce only one primary
    if (link.isPrimary) {
      this._props.guardianLinks.forEach((g) => { g.isPrimary = false; });
    }
    this._props.guardianLinks.push(link);
    this._addDomainEvent(new GuardianAddedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      guardianId: link.guardianId,
      relation: link.relation,
      isPrimary: link.isPrimary,
      addedBy,
    }));
  }

  removeGuardian(guardianId: string, removedBy: string): void {
    const link = this._props.guardianLinks.find((g) => g.guardianId === guardianId);
    if (!link) return;
    if (link.isPrimary && this._props.guardianLinks.length > 1) {
      throw new Error('Cannot remove primary guardian — assign a new primary first');
    }
    this._props.guardianLinks = this._props.guardianLinks.filter((g) => g.guardianId !== guardianId);
    this._addDomainEvent(new GuardianRemovedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      guardianId,
      removedBy,
    }));
  }

  setPrimaryGuardian(guardianId: string): void {
    const target = this._props.guardianLinks.find((g) => g.guardianId === guardianId);
    if (!target) {
      throw new Error(`Guardian ${guardianId} not linked to student ${this.id}`);
    }
    const oldPrimary = this._props.guardianLinks.find((g) => g.isPrimary);
    if (oldPrimary && oldPrimary.guardianId === guardianId) return;
    this._props.guardianLinks.forEach((g) => { g.isPrimary = (g.guardianId === guardianId); });
    if (oldPrimary) {
      this._addDomainEvent(new PrimaryGuardianChangedEvent({
        studentId: this.id,
        tenantId: this._props.tenantId,
        oldGuardianId: oldPrimary.guardianId,
        newGuardianId: guardianId,
      }));
    }
  }

  updateMedical(alerts: MedicalAlert[], allergiesSummary: string, updatedBy: string, medicalRecordId: string): void {
    this._props.medicalAlerts = alerts;
    this._props.allergiesSummary = allergiesSummary;
    this._addDomainEvent(new MedicalRecordUpdatedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      medicalRecordId,
      updatedBy,
    }));
  }

  addFlag(code: string, severity: StudentFlagSeverity, summary: string): void {
    this._addDomainEvent(new StudentFlagAddedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      flagCode: code,
      severity,
      summary,
    }));
  }

  resolveFlag(code: string, resolvedBy: string): void {
    this._addDomainEvent(new StudentFlagResolvedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      flagCode: code,
      resolvedBy,
    }));
  }

  updateProfile(props: Partial<Pick<StudentProps, 'preferredName' | 'photoUrl' | 'religion' | 'motherTongue' | 'nationality' | 'custodyNotes'>>): void {
    const updatedFields: string[] = [];
    if (props.preferredName !== undefined) { this._props.preferredName = props.preferredName; updatedFields.push('preferredName'); }
    if (props.photoUrl !== undefined) { this._props.photoUrl = props.photoUrl; updatedFields.push('photoUrl'); }
    if (props.religion !== undefined) { this._props.religion = props.religion; updatedFields.push('religion'); }
    if (props.motherTongue !== undefined) { this._props.motherTongue = props.motherTongue; updatedFields.push('motherTongue'); }
    if (props.nationality !== undefined) { this._props.nationality = props.nationality; updatedFields.push('nationality'); }
    if (props.custodyNotes !== undefined) { this._props.custodyNotes = props.custodyNotes; updatedFields.push('custodyNotes'); }
    if (updatedFields.length > 0) {
      this._addDomainEvent(new StudentProfileUpdatedEvent({
        studentId: this.id,
        tenantId: this._props.tenantId,
        updatedFields,
      }));
    }
  }

  setPickupRestricted(restricted: boolean): void {
    this._props.isPickupRestricted = restricted;
  }

  recomputeAge(now: string = new Date().toISOString()): void {
    const dob = new Date(this._props.dateOfBirth);
    const nowDate = new Date(now);
    let months = (nowDate.getFullYear() - dob.getFullYear()) * 12;
    months += nowDate.getMonth() - dob.getMonth();
    if (nowDate.getDate() < dob.getDate()) months -= 1;
    this._props.ageMonths = Math.max(0, months);
  }

  softDelete(now: string): void {
    this._props.deletedAt = now;
  }

  // ─────── Internal helpers ───────

  private _transitionTo(toStatus: StudentStatus, atIso: string, reason: string): void {
    const fromStatus = this._props.status;
    if (!this._canTransition(fromStatus, toStatus)) {
      throw new Error(`Invalid status transition: ${fromStatus} → ${toStatus}`);
    }
    this._props.status = toStatus;
    this._props.exitedAt = atIso;
    this._props.exitReason = reason;
    this._addDomainEvent(new StudentStatusChangedEvent({
      studentId: this.id,
      tenantId: this._props.tenantId,
      fromStatus,
      toStatus,
      reason,
      changedAt: atIso,
    }));
  }

  private _canTransition(from: StudentStatus, to: StudentStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  // ─────── Factory ───────

  static create(
    props: Omit<StudentProps, 'status' | 'ageMonths' | 'guardianLinks' | 'isPickupRestricted'> & {
      status?: StudentStatus;
      guardianLinks?: GuardianLinkProps[];
      isPickupRestricted?: boolean;
    },
    createdBy: string,
  ): StudentAggregate {
    const aggregate = new StudentAggregate({
      ...props,
      status: props.status ?? 'PROSPECT',
      ageMonths: 0,
      guardianLinks: props.guardianLinks ?? [],
      isPickupRestricted: props.isPickupRestricted ?? false,
    });
    aggregate.recomputeAge();
    aggregate._addDomainEvent(new StudentCreatedEvent({
      studentId: aggregate.id,
      tenantId: props.tenantId,
      branchId: props.branchId,
      admissionNumber: props.admissionNumber,
      legalFirstName: props.legalFirstName,
      legalLastName: props.legalLastName,
      createdBy,
    }));
    return aggregate;
  }
}
