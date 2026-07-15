/**
 * Student Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Per BTD §13.3 — Event Schema Rules:
 *   - Event names: past-tense verb (StudentCreated, not CreateStudent)
 *   - Events are immutable — once published, never modified
 *   - Event payload includes: eventId, occurredAt, tenantId, userId, aggregateId, version
 *   - Schema versioned via .v1, .v2 suffix — backward-compatible only
 *   - Subscribers must be idempotent
 *   - Events published after transaction commit — never before
 *
 * These events are emitted by StudentAggregate and its child entities. The
 * IdentityEventTranslator (and future student-specific translator) converts
 * them to integration events for the outbox.
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Lifecycle events
// ─────────────────────────────────────────────

export class StudentCreatedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  branchId: string;
  admissionNumber: string;
  legalFirstName: string;
  legalLastName: string;
  createdBy: string;
}> {}

export class StudentEnrolledEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  sectionId: string;
  enrollmentId: string;
  gradeLevel: string;
  enrolledAt: string;
}> {}

export class StudentPromotedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  fromSectionId: string;
  toSectionId: string;
  fromGradeLevel: string;
  toGradeLevel: string;
  promotedAt: string;
}> {}

export class StudentTransferredEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  toBranchId: string;
  toSchoolId?: string;
  reason: string;
  transferredAt: string;
}> {}

export class StudentWithdrawnEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  reason: string;
  withdrawnAt: string;
}> {}

export class StudentGraduatedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  fromGradeLevel: string;
  graduatedAt: string;
}> {}

export class StudentReactivatedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  reactivatedAt: string;
}> {}

export class StudentStatusChangedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  changedAt: string;
}> {}

// ─────────────────────────────────────────────
// Guardian events
// ─────────────────────────────────────────────

export class GuardianAddedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  guardianId: string;
  relation: string;
  isPrimary: boolean;
  addedBy: string;
}> {}

export class GuardianRemovedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  guardianId: string;
  removedBy: string;
}> {}

export class PrimaryGuardianChangedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  oldGuardianId: string;
  newGuardianId: string;
}> {}

// ─────────────────────────────────────────────
// Medical / Flag events
// ─────────────────────────────────────────────

export class MedicalRecordUpdatedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  medicalRecordId: string;
  updatedBy: string;
}> {}

export class StudentFlagAddedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  flagCode: string;
  severity: string;
  summary: string;
}> {}

export class StudentFlagResolvedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  flagCode: string;
  resolvedBy: string;
}> {}

// ─────────────────────────────────────────────
// Profile events
// ─────────────────────────────────────────────

export class StudentProfileUpdatedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  updatedFields: string[];
}> {}

export class StudentDocumentUploadedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  documentId: string;
  documentType: string;
  uploadedBy: string;
}> {}

export class StudentPhotoUploadedEvent extends DomainEvent<{
  studentId: string;
  tenantId: string;
  photoId: string;
  photoType: string;
}> {}
