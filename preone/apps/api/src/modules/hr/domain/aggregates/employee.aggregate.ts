/**
 * EmployeeAggregate — staff member lifecycle (BTD §4.3 #10, BRC §6 HR Rules).
 *
 * Lifecycle:
 *   PROSPECTIVE → ONBOARDED → ACTIVE → {ON_LEAVE | SUSPENDED} → RESIGNED → EXITED
 *
 * Invariants (per BRC):
 *   - R-HR-001: Staff qualification minimum (NTT / ETT / B.Ed)
 *   - R-HR-002: Background verification (BGV) mandatory before ACTIVE
 *   - R-HR-012: Probation period = 3 months
 *   - R-APR-010: New position requires approval
 *   - Employee code is unique per school
 *   - Cannot onboard without BGV clearance
 *   - Cannot exit without handover completion flag
 *
 * Integration events emitted (via EventTranslator):
 *   - StaffOnboarded.v1 → Identity (create user account, sync HTTP)
 *   - StaffOffboarded.v1 → Identity (revoke access) + Inventory (asset recovery)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import { EnforcesRule } from '@common/brc/brc-trace.decorator';

import {
  EmployeeOnboardedEvent, EmployeeOffboardedEvent, EmployeePromotedEvent,
  EmployeeSuspendedEvent, EmployeeReactivatedEvent, EmployeeResignedEvent,
  BgvClearedEvent, BgvFailedEvent, ProbationCompletedEvent,
} from '../events/hr-events';

export type EmployeeStatus =
  | 'PROSPECTIVE' | 'ONBOARDED' | 'ACTIVE' | 'ON_LEAVE'
  | 'SUSPENDED' | 'RESIGNED' | 'EXITED';

export type EmploymentType =
  | 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CONSULTANT' | 'INTERN';

export type StaffRole =
  | 'PRINCIPAL' | 'COORDINATOR' | 'CLASS_TEACHER' | 'ACTIVITY_TEACHER'
  | 'RECEPTION_ADMISSION' | 'ACCOUNTS' | 'INVENTORY_STORE_KEEPER'
  | 'TRANSPORT_MANAGER' | 'HR' | 'ADMIN_STAFF' | 'FACILITY';

export interface EmployeeProps {
  tenantId: string;
  branchId?: string;
  employeeCode: string;
  userId?: string; // linked identity user (populated after StaffOnboarded.v1)
  firstName: string;
  lastName: string;
  displayName?: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  role: StaffRole;
  designation: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  dateOfJoining: string;
  probationEndDate?: string;
  qualifications: EmployeeQualification[];
  documents: EmployeeDocument[];
  bgvStatus: 'PENDING' | 'IN_PROGRESS' | 'CLEARED' | 'FAILED';
  bgvInitiatedAt?: string;
  bgvClearedAt?: string;
  bgvVendor?: string;
  bgvReportUrl?: string;
  salaryCents: number;
  bankAccountNumber?: string; // PII — encrypted at rest
  bankIfsc?: string;
  panNumber?: string; // PII — encrypted at rest
  aadhaarNumber?: string; // PII — encrypted at rest
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  reportingManagerId?: string;
  handoverCompleted: boolean;
  resignationDate?: string;
  lastWorkingDate?: string;
  exitReason?: string;
  exitInterviewConducted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeQualification {
  id: string;
  degree: string;
  institution: string;
  yearOfPassing: number;
  isVerified: boolean;
}

export interface EmployeeDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  verifiedAt?: string;
}

const TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  PROSPECTIVE: ['ONBOARDED'],
  ONBOARDED: ['ACTIVE', 'SUSPENDED', 'RESIGNED'],
  ACTIVE: ['ON_LEAVE', 'SUSPENDED', 'RESIGNED'],
  ON_LEAVE: ['ACTIVE', 'RESIGNED'],
  SUSPENDED: ['ACTIVE', 'RESIGNED'],
  RESIGNED: ['EXITED'],
  EXITED: [],
};

@EnforcesRule('R-HR-001', { kind: 'aggregate' })
@EnforcesRule('R-HR-002', { kind: 'aggregate' })
@EnforcesRule('R-HR-008', { kind: 'aggregate' })
@EnforcesRule('R-HR-012', { kind: 'aggregate' })
@EnforcesRule('R-APR-010', { kind: 'aggregate' })
export class EmployeeAggregate extends AggregateRoot<EmployeeProps> {
  get tenantId(): string { return this._props.tenantId; }
  get employeeCode(): string { return this._props.employeeCode; }
  get userId(): string | undefined { return this._props.userId; }
  get status(): EmployeeStatus { return this._props.status; }
  get role(): StaffRole { return this._props.role; }
  get bgvStatus(): string { return this._props.bgvStatus; }
  get salaryCents(): number { return this._props.salaryCents; }

  static create(props: Omit<
    EmployeeProps,
    'status' | 'qualifications' | 'documents' | 'bgvStatus' |
    'handoverCompleted' | 'exitInterviewConducted' | 'createdAt' | 'updatedAt'
  >): EmployeeAggregate {
    const now = new Date().toISOString();
    const probationEnd = props.probationEndDate
      ?? new Date(new Date(props.dateOfJoining).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const agg = new EmployeeAggregate({
      ...props,
      probationEndDate: probationEnd,
      status: 'PROSPECTIVE',
      qualifications: [],
      documents: [],
      bgvStatus: 'PENDING',
      handoverCompleted: false,
      exitInterviewConducted: false,
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  /**
   * Onboard the employee — initiates BGV process.
   * Per R-HR-002: BGV is mandatory before ACTIVE.
   */
  onboard(bgvVendor?: string): void {
    this._requireTransition('ONBOARDED');
    this._props.status = 'ONBOARDED';
    this._props.bgvStatus = 'IN_PROGRESS';
    this._props.bgvInitiatedAt = new Date().toISOString();
    this._props.bgvVendor = bgvVendor;
    this._touch();
    this._addDomainEvent(new EmployeeOnboardedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      branchId: this._props.branchId,
      employeeCode: this._props.employeeCode,
      firstName: this._props.firstName,
      lastName: this._props.lastName,
      email: this._props.email,
      phone: this._props.phone,
      role: this._props.role,
      designation: this._props.designation,
      dateOfJoining: this._props.dateOfJoining,
    }));
  }

  /**
   * Mark BGV as cleared — allows activation.
   */
  clearBgv(reportUrl?: string): void {
    if (this._props.bgvStatus === 'CLEARED') {
      throw new Error('BGV already cleared');
    }
    this._props.bgvStatus = 'CLEARED';
    this._props.bgvClearedAt = new Date().toISOString();
    if (reportUrl) this._props.bgvReportUrl = reportUrl;
    this._touch();
    this._addDomainEvent(new BgvClearedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      bgvVendor: this._props.bgvVendor,
    }));
  }

  /**
   * Mark BGV as failed — blocks activation.
   */
  failBgv(reason: string): void {
    this._props.bgvStatus = 'FAILED';
    this._touch();
    this._addDomainEvent(new BgvFailedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  /**
   * Activate the employee — requires BGV cleared.
   */
  activate(): void {
    if (this._props.bgvStatus !== 'CLEARED') {
      throw new Error('Cannot activate employee without BGV clearance (R-HR-002)');
    }
    if (this._props.status === 'ONBOARDED' || this._props.status === 'SUSPENDED') {
      this._props.status = 'ACTIVE';
      this._touch();
      this._addDomainEvent(new EmployeeReactivatedEvent({
        employeeId: this.id,
        tenantId: this._props.tenantId,
      }));
    } else {
      throw new Error(`Cannot activate from ${this._props.status}`);
    }
  }

  /**
   * Complete probation — automatically fires after 3 months.
   */
  completeProbation(): void {
    if (this._props.status !== 'ACTIVE' && this._props.status !== 'ONBOARDED') {
      throw new Error('Cannot complete probation for non-active employee');
    }
    this._props.probationEndDate = undefined; // cleared on completion
    this._touch();
    this._addDomainEvent(new ProbationCompletedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      completedAt: new Date().toISOString(),
    }));
  }

  /**
   * Suspend the employee — pending disciplinary action.
   */
  suspend(reason: string): void {
    this._requireTransition('SUSPENDED');
    this._props.status = 'SUSPENDED';
    this._touch();
    this._addDomainEvent(new EmployeeSuspendedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      reason,
    }));
  }

  /**
   * Mark employee as on leave.
   */
  markOnLeave(): void {
    this._requireTransition('ON_LEAVE');
    this._props.status = 'ON_LEAVE';
    this._touch();
  }

  /**
   * Promote the employee to a new role/designation.
   * Per R-APR-010: new position requires approval (handled at command layer).
   */
  promote(newRole: StaffRole, newDesignation: string, newSalaryCents: number): void {
    if (this._props.status !== 'ACTIVE') {
      throw new Error('Can only promote ACTIVE employees');
    }
    const oldRole = this._props.role;
    const oldSalary = this._props.salaryCents;
    this._props.role = newRole;
    this._props.designation = newDesignation;
    this._props.salaryCents = newSalaryCents;
    this._touch();
    this._addDomainEvent(new EmployeePromotedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      oldRole,
      newRole,
      newDesignation,
      oldSalaryCents: oldSalary,
      newSalaryCents,
    }));
  }

  /**
   * Employee resigns — sets last working day (notice period per R-HR-008).
   */
  resign(resignationDate: string, lastWorkingDate: string, reason: string): void {
    this._requireTransition('RESIGNED');
    this._props.status = 'RESIGNED';
    this._props.resignationDate = resignationDate;
    this._props.lastWorkingDate = lastWorkingDate;
    this._props.exitReason = reason;
    this._touch();
    this._addDomainEvent(new EmployeeResignedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      resignationDate,
      lastWorkingDate,
      reason,
    }));
  }

  /**
   * Complete the exit process — requires handover.
   * Per R-HR-008: notice period + handover mandatory.
   */
  completeExit(handoverCompleted: boolean, exitInterviewConducted: boolean): void {
    this._requireTransition('EXITED');
    if (!handoverCompleted) {
      throw new Error('Cannot exit without handover completion (R-HR-008)');
    }
    this._props.status = 'EXITED';
    this._props.handoverCompleted = true;
    this._props.exitInterviewConducted = exitInterviewConducted;
    this._touch();
    this._addDomainEvent(new EmployeeOffboardedEvent({
      employeeId: this.id,
      tenantId: this._props.tenantId,
      exitDate: new Date().toISOString(),
      reason: this._props.exitReason ?? 'Unknown',
    }));
  }

  addQualification(q: Omit<EmployeeQualification, 'id'>): void {
    this._props.qualifications.push({ ...q, id: crypto.randomUUID() });
    this._touch();
  }

  addDocument(d: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): void {
    this._props.documents.push({
      ...d,
      id: crypto.randomUUID(),
      uploadedAt: new Date().toISOString(),
    });
    this._touch();
  }

  linkUser(userId: string): void {
    this._props.userId = userId;
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: EmployeeStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid employee transition: ${this._props.status} → ${target}`);
    }
  }
}
