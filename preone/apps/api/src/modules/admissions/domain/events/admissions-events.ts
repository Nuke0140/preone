/**
 * Admissions Domain Events — versioned, past-tense, immutable (BTD §13.3).
 *
 * Emitted by Application, Admission, and WaitingList aggregates.
 *
 * Integration events (BTD §14) — published to Redis Stream after outbox drain:
 *   - ApplicationSubmitted.v1   → Communication (parent confirmation)
 *   - AdmissionApproved.v1      → Identity (create student), Finance (create fee plan)
 *   - AdmissionRejected.v1      → Communication (rejection email)
 *   - SeatOffered.v1            → Communication (offer letter)
 *   - AdmissionCancelled.v1     → Finance (refund), Communication (notify parent)
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// ─────────────────────────────────────────────
// Application lifecycle
// ─────────────────────────────────────────────

export class ApplicationCreatedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  branchId: string;
  applicationNumber: string;
  programType: string;
  childFirstName: string;
  childLastName: string;
  admissionType: string;
}> {}

export class ApplicationSubmittedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  applicationNumber: string;
  submittedAt: string;
}> {}

export class ApplicationDocumentUploadedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  documentId: string;
  documentType: string;
  fileName: string;
}> {}

export class ApplicationDocumentVerifiedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  documentId: string;
  verifiedBy: string;
  verifiedAt: string;
}> {}

export class ApplicationDocumentRejectedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  documentId: string;
  rejectionReason: string;
}> {}

export class ApplicationVerifiedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  verifiedAt: string;
}> {}

export class ApplicationApprovedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  approvedAt: string;
  approvedBy: string;
  admissionId: string;
}> {}

export class ApplicationRejectedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  rejectedAt: string;
  rejectedBy: string;
  reason: string;
}> {}

export class ApplicationWaitlistedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  position: number;
  priorityScore: number;
}> {}

export class ApplicationCancelledEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  cancelledAt: string;
  reason: string;
}> {}

// ─────────────────────────────────────────────
// Counselling
// ─────────────────────────────────────────────

export class CounsellingScheduledEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  sessionId: string;
  counsellorId: string;
  scheduledAt: string;
  mode: string;
}> {}

export class CounsellingCompletedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  sessionId: string;
  recommendation: string;
  completedAt: string;
}> {}

// ─────────────────────────────────────────────
// Admission Offer
// ─────────────────────────────────────────────

export class AdmissionOfferIssuedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  offerId: string;
  offerNumber: string;
  feeQuoteCents: number;
  expiresAt: string;
}> {}

export class AdmissionOfferAcceptedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  offerId: string;
  acceptedAt: string;
}> {}

export class AdmissionOfferDeclinedEvent extends DomainEvent<{
  applicationId: string;
  tenantId: string;
  offerId: string;
  declinedAt: string;
}> {}

// ─────────────────────────────────────────────
// Admission (post-approval)
// ─────────────────────────────────────────────

export class AdmissionCreatedEvent extends DomainEvent<{
  admissionId: string;
  tenantId: string;
  applicationId: string;
  admissionNumber: string;
  admissionDate: string;
}> {}

export class AdmissionCancelledEvent extends DomainEvent<{
  admissionId: string;
  tenantId: string;
  applicationId: string;
  cancelledAt: string;
  reason: string;
  refundDueCents: number | null;
}> {}

// ─────────────────────────────────────────────
// Waiting List
// ─────────────────────────────────────────────

export class WaitingListEntryAddedEvent extends DomainEvent<{
  waitingListId: string;
  tenantId: string;
  applicationId: string;
  branchId: string;
  programType: string;
  position: number;
  priorityScore: number;
}> {}

export class WaitingListSeatOfferedEvent extends DomainEvent<{
  waitingListId: string;
  tenantId: string;
  applicationId: string;
  offeredAt: string;
  offerExpiresAt: string;
}> {}

export class WaitingListPromotedEvent extends DomainEvent<{
  waitingListId: string;
  tenantId: string;
  applicationId: string;
  fromPosition: number;
  toPosition: number;
}> {}
