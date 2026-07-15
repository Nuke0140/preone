/**
 * Student Commands — intent-bearing operations on Student aggregates (BTD §12.2).
 *
 * Per BTD §12.2:
 *   - Commands are intent-bearing (CreateStudentCommand, not StudentDto)
 *   - Handlers load aggregate → mutate → save → return ID
 *   - Never return read models — only IDs or void
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

// ─────────────────────────────────────────────
// CreateStudent
// ─────────────────────────────────────────────

export interface CreateStudentPayload {
  branchId: string;
  admissionNumber: string;
  legalFirstName: string;
  legalLastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  bloodGroup?: string;
  nationality?: string;
  religion?: string;
  motherTongue?: string;
  aadhaarNumber?: string;
  birthCertificateNumber?: string;
  placeOfBirth?: string;
  photoUrl?: string;
  custodyNotes?: string;
  isPickupRestricted?: boolean;
  guardians: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    altPhone?: string;
    occupation?: string;
    employer?: string;
    annualIncomeCents?: number;
    education?: string;
    relation: string;
    isPrimary: boolean;
    isPickupAuthorized: boolean;
    isEmergencyContact: boolean;
    custodyHolder: boolean;
  }>;
}

export class CreateStudentCommand implements Command<CreateStudentPayload, { id: string }> {
  readonly type = 'Student.CreateStudent';
  constructor(
    readonly payload: CreateStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// UpdateStudent
// ─────────────────────────────────────────────

export interface UpdateStudentPayload {
  studentId: string;
  preferredName?: string;
  photoUrl?: string;
  religion?: string;
  motherTongue?: string;
  nationality?: string;
  custodyNotes?: string;
  isPickupRestricted?: boolean;
}

export class UpdateStudentCommand implements Command<UpdateStudentPayload, { id: string }> {
  readonly type = 'Student.UpdateStudent';
  constructor(
    readonly payload: UpdateStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// EnrollStudent
// ─────────────────────────────────────────────

export interface EnrollStudentPayload {
  studentId: string;
  sectionId: string;
  gradeLevel: string;
  enrolledAt?: string;
}

export class EnrollStudentCommand implements Command<EnrollStudentPayload, { id: string; enrollmentId: string }> {
  readonly type = 'Student.Enroll';
  constructor(
    readonly payload: EnrollStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// PromoteStudent
// ─────────────────────────────────────────────

export interface PromoteStudentPayload {
  studentId: string;
  toSectionId: string;
  toGradeLevel: string;
}

export class PromoteStudentCommand implements Command<PromoteStudentPayload, { id: string }> {
  readonly type = 'Student.Promote';
  constructor(
    readonly payload: PromoteStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// TransferStudent
// ─────────────────────────────────────────────

export interface TransferStudentPayload {
  studentId: string;
  toBranchId: string;
  toSchoolId?: string;
  reason: string;
}

export class TransferStudentCommand implements Command<TransferStudentPayload, { id: string }> {
  readonly type = 'Student.Transfer';
  constructor(
    readonly payload: TransferStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// WithdrawStudent
// ─────────────────────────────────────────────

export interface WithdrawStudentPayload {
  studentId: string;
  reason: string;
}

export class WithdrawStudentCommand implements Command<WithdrawStudentPayload, { id: string }> {
  readonly type = 'Student.Withdraw';
  constructor(
    readonly payload: WithdrawStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// GraduateStudent
// ─────────────────────────────────────────────

export interface GraduateStudentPayload {
  studentId: string;
}

export class GraduateStudentCommand implements Command<GraduateStudentPayload, { id: string }> {
  readonly type = 'Student.Graduate';
  constructor(
    readonly payload: GraduateStudentPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// AddGuardian
// ─────────────────────────────────────────────

export interface AddGuardianPayload {
  studentId: string;
  guardian: {
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    altPhone?: string;
    occupation?: string;
    employer?: string;
    annualIncomeCents?: number;
    education?: string;
    relation: string;
    isPrimary: boolean;
    isPickupAuthorized: boolean;
    isEmergencyContact: boolean;
    custodyHolder: boolean;
  };
}

export class AddGuardianCommand implements Command<AddGuardianPayload, { id: string; guardianId: string }> {
  readonly type = 'Student.AddGuardian';
  constructor(
    readonly payload: AddGuardianPayload,
    readonly metadata: CommandMetadata,
  ) {}
}

// ─────────────────────────────────────────────
// SetPrimaryGuardian
// ─────────────────────────────────────────────

export interface SetPrimaryGuardianPayload {
  studentId: string;
  guardianId: string;
}

export class SetPrimaryGuardianCommand implements Command<SetPrimaryGuardianPayload, { id: string }> {
  readonly type = 'Student.SetPrimaryGuardian';
  constructor(
    readonly payload: SetPrimaryGuardianPayload,
    readonly metadata: CommandMetadata,
  ) {}
}
