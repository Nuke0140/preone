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
 *
 * Wave 4.1 — full integration event catalogue + AdmissionsEventTranslator
 * wires these to the outbox for downstream consumption (BTD §17.3 saga).
 */
import { DomainEvent } from '@shared/kernel/domain-event';

// Re-export the IntegrationEventEnvelope type so consumers don't need to
// import from identity module (avoids a circular module dep).
import type { IntegrationEventEnvelope } from '../../../identity/domain/events/identity-events';

export type { IntegrationEventEnvelope };

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

// ─────────────────────────────────────────────
// INTEGRATION EVENT TRANSLATIONS (BTD §14)
// ─────────────────────────────────────────────
// Each function takes a domain event + context (tenantId, actorId) and
// produces an IntegrationEventEnvelope ready for the outbox. Translations
// are explicit per event type (no reflection) — schema changes must be
// reviewed at the call site (BTD §14.3).
//
// Subscribers (BTD §14.2):
//   AdmissionApproved.v1 →
//     Identity    : create Student record from application child fields
//     Finance     : create StudentFeePlan from FeePlanQuote
//     Communication: send welcome email to parent
//   AdmissionCancelled.v1 →
//     Finance     : initiate refund workflow
//     Communication: notify parent of cancellation
//   ApplicationSubmitted.v1 →
//     Communication: send confirmation SMS to parent
//   ApplicationRejected.v1 →
//     Communication: send rejection email with reason
//   SeatOffered.v1 →
//     Communication: send offer letter email + SMS

export function toAdmissionApprovedV1(
  domainEvent: ApplicationApprovedEvent,
): IntegrationEventEnvelope<{
  applicationId: string;
  admissionId: string;
  tenantId: string;
  approvedAt: string;
  approvedBy: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'AdmissionApproved.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    userId: domainEvent.payload.approvedBy,
    aggregateId: domainEvent.payload.admissionId,
    aggregateType: 'Admission',
    payload: {
      applicationId: domainEvent.payload.applicationId,
      admissionId: domainEvent.payload.admissionId,
      tenantId: domainEvent.payload.tenantId,
      approvedAt: domainEvent.payload.approvedAt,
      approvedBy: domainEvent.payload.approvedBy,
    },
  };
}

export function toAdmissionCancelledV1(
  domainEvent: AdmissionCancelledEvent,
): IntegrationEventEnvelope<{
  admissionId: string;
  applicationId: string;
  tenantId: string;
  cancelledAt: string;
  reason: string;
  refundDueCents: number | null;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'AdmissionCancelled.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    aggregateId: domainEvent.payload.admissionId,
    aggregateType: 'Admission',
    payload: {
      admissionId: domainEvent.payload.admissionId,
      applicationId: domainEvent.payload.applicationId,
      tenantId: domainEvent.payload.tenantId,
      cancelledAt: domainEvent.payload.cancelledAt,
      reason: domainEvent.payload.reason,
      refundDueCents: domainEvent.payload.refundDueCents,
    },
  };
}

export function toApplicationSubmittedV1(
  domainEvent: ApplicationSubmittedEvent,
): IntegrationEventEnvelope<{
  applicationId: string;
  tenantId: string;
  applicationNumber: string;
  submittedAt: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'ApplicationSubmitted.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    aggregateId: domainEvent.payload.applicationId,
    aggregateType: 'Application',
    payload: {
      applicationId: domainEvent.payload.applicationId,
      tenantId: domainEvent.payload.tenantId,
      applicationNumber: domainEvent.payload.applicationNumber,
      submittedAt: domainEvent.payload.submittedAt,
    },
  };
}

export function toApplicationRejectedV1(
  domainEvent: ApplicationRejectedEvent,
): IntegrationEventEnvelope<{
  applicationId: string;
  tenantId: string;
  rejectedAt: string;
  rejectedBy: string;
  reason: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'ApplicationRejected.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    userId: domainEvent.payload.rejectedBy,
    aggregateId: domainEvent.payload.applicationId,
    aggregateType: 'Application',
    payload: {
      applicationId: domainEvent.payload.applicationId,
      tenantId: domainEvent.payload.tenantId,
      rejectedAt: domainEvent.payload.rejectedAt,
      rejectedBy: domainEvent.payload.rejectedBy,
      reason: domainEvent.payload.reason,
    },
  };
}

export function toSeatOfferedV1(
  domainEvent: AdmissionOfferIssuedEvent,
): IntegrationEventEnvelope<{
  applicationId: string;
  tenantId: string;
  offerId: string;
  offerNumber: string;
  feeQuoteCents: number;
  expiresAt: string;
}> {
  return {
    eventId: domainEvent.eventId,
    eventType: 'SeatOffered.v1',
    schemaVersion: 'v1',
    occurredAt: domainEvent.occurredAt,
    tenantId: domainEvent.payload.tenantId,
    aggregateId: domainEvent.payload.offerId,
    aggregateType: 'AdmissionOffer',
    payload: {
      applicationId: domainEvent.payload.applicationId,
      tenantId: domainEvent.payload.tenantId,
      offerId: domainEvent.payload.offerId,
      offerNumber: domainEvent.payload.offerNumber,
      feeQuoteCents: domainEvent.payload.feeQuoteCents,
      expiresAt: domainEvent.payload.expiresAt,
    },
  };
}
