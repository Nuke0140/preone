/**
 * ApplicationAggregate — admission application root with child entities:
 * ApplicationDocument, CounsellingSession, Approval, AdmissionOffer,
 * AgeVerification, FeePlanQuote, AdmissionPriority, SiblingConcession.
 *
 * Per ERD v3.0 §13.4.2: "Formally submitted admission request with parent
 *   declarations + document uploads."
 *
 * Lifecycle (BTD §17.3 — Admission Approval Saga):
 *   DRAFT → SUBMITTED → DOCUMENT_PENDING → VERIFIED → APPROVED/REJECTED/WAITLISTED
 *                ↘ CANCELLED (terminal)
 *
 * Invariants enforced:
 *   - DRAFT → SUBMITTED requires all mandatory fields
 *   - SUBMITTED → VERIFIED requires all mandatory documents verified
 *   - VERIFIED → APPROVED requires at least one counselling session completed with APPROVE recommendation
 *   - Cannot modify child entities after terminal state (APPROVED/REJECTED/CANCELLED)
 *   - At most one AdmissionOffer active at a time
 *   - At most one AgeVerification record (1:1)
 *   - ApplicationNumber is immutable (assigned at creation)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';
import { Entity } from '@shared/kernel/entity';

import {
  AdmissionOfferAcceptedEvent, AdmissionOfferDeclinedEvent,
  AdmissionOfferIssuedEvent, ApplicationApprovedEvent, ApplicationCancelledEvent,
  ApplicationCreatedEvent, ApplicationDocumentRejectedEvent,
  ApplicationDocumentUploadedEvent, ApplicationDocumentVerifiedEvent,
  ApplicationRejectedEvent, ApplicationSubmittedEvent, ApplicationVerifiedEvent,
  ApplicationWaitlistedEvent, CounsellingCompletedEvent, CounsellingScheduledEvent,
} from '../events/admissions-events';

export type ProgramType = 'PLAYGROUP' | 'NURSERY' | 'LKG' | 'UKG' | 'DAYCARE';
export type AdmissionType = 'REGULAR' | 'LATE' | 'TRANSFER' | 'MID_SESSION' | 'READMISSION';
export type ApplicationStatus =
  | 'DRAFT' | 'SUBMITTED' | 'DOCUMENT_PENDING' | 'VERIFIED'
  | 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'CANCELLED';

export type CounsellingMode = 'IN_PERSON' | 'PHONE' | 'VIDEO';
export type CounsellingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type CounsellingRecommendation = 'APPROVE' | 'REJECT' | 'WAITLIST';
export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'DEFERRED';
export type ApprovalLevel = 1 | 2 | 3 | 4; // 1=Branch, 2=Academic, 3=Finance, 4=Director
export type RejectionReason =
  | 'AGE_INELIGIBLE' | 'NO_SEAT' | 'DOCUMENT_INCOMPLETE' | 'DOCUMENT_INVALID'
  | 'FEE_NOT_PAID' | 'MEDICAL_UNSUITABLE' | 'PARENT_DECLINED' | 'OTHER';

export type AdmissionPriorityFactor =
  | 'SIBLING' | 'STAFF_CHILD' | 'ALUMNI' | 'DISTANCE' | 'FIRST_GEN' | 'GIRL_CHILD';

// ─────────────────────────────────────────────
// Child Entity: ApplicationDocument
// ─────────────────────────────────────────────

export interface ApplicationDocumentProps {
  id: string;
  documentType: string; // BIRTH_CERTIFICATE | AADHAAR | PHOTO | MEDICAL | TRANSFER_CERT | PROOF_OF_ADDRESS
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  uploadedAt: string;
}

export class ApplicationDocumentEntity extends Entity<ApplicationDocumentProps> {
  get documentType(): string { return this._props.documentType; }
  get status(): string { return this._props.status; }
  get fileName(): string { return this._props.fileName; }

  verify(verifiedBy: string, verifiedAt: string): void {
    this._props.status = 'VERIFIED';
    this._props.verifiedBy = verifiedBy;
    this._props.verifiedAt = verifiedAt;
    this._props.rejectionReason = undefined;
  }

  reject(reason: string): void {
    this._props.status = 'REJECTED';
    this._props.rejectionReason = reason;
    this._props.verifiedAt = undefined;
    this._props.verifiedBy = undefined;
  }
}

// ─────────────────────────────────────────────
// Child Entity: CounsellingSession
// ─────────────────────────────────────────────

export interface CounsellingSessionProps {
  id: string;
  counsellorId: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: CounsellingMode;
  status: CounsellingStatus;
  childPresent: boolean;
  notes?: string;
  recommendation?: CounsellingRecommendation;
  completedAt?: string;
}

export class CounsellingSessionEntity extends Entity<CounsellingSessionProps> {
  get status(): CounsellingStatus { return this._props.status; }
  get recommendation(): CounsellingRecommendation | undefined { return this._props.recommendation; }

  reschedule(newScheduledAt: string): void {
    this._props.scheduledAt = newScheduledAt;
    this._props.status = 'SCHEDULED';
  }

  complete(recommendation: CounsellingRecommendation, notes: string, completedAt: string): void {
    this._props.status = 'COMPLETED';
    this._props.recommendation = recommendation;
    this._props.notes = notes;
    this._props.completedAt = completedAt;
  }

  markNoShow(): void {
    this._props.status = 'NO_SHOW';
  }

  cancel(): void {
    this._props.status = 'CANCELLED';
  }
}

// ─────────────────────────────────────────────
// Child Entity: Approval
// ─────────────────────────────────────────────

export interface ApprovalProps {
  id: string;
  approverId: string;
  approvalLevel: ApprovalLevel;
  decision: ApprovalDecision;
  decisionReason?: string;
  decidedAt: string;
  feeWaiverApprovedCents?: number;
  conditions?: Array<{ type: string; description: string }>;
}

export class ApprovalEntity extends Entity<ApprovalProps> {
  get approvalLevel(): ApprovalLevel { return this._props.approvalLevel; }
  get decision(): ApprovalDecision { return this._props.decision; }
}

// ─────────────────────────────────────────────
// Child Entity: AdmissionOffer
// ─────────────────────────────────────────────

export interface AdmissionOfferProps {
  id: string;
  offerNumber: string;
  offeredProgram: ProgramType;
  feeQuoteCents: number;
  securityDepositCents: number;
  offerLetterUrl: string;
  issuedAt: string;
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
}

export class AdmissionOfferEntity extends Entity<AdmissionOfferProps> {
  get offerNumber(): string { return this._props.offerNumber; }
  get feeQuoteCents(): number { return this._props.feeQuoteCents; }
  get expiresAt(): string { return this._props.expiresAt; }
  get isExpired(): boolean { return new Date(this._props.expiresAt) < new Date(); }
  get isActive(): boolean {
    return !this._props.acceptedAt && !this._props.declinedAt && !this.isExpired;
  }

  accept(acceptedAt: string): void {
    this._props.acceptedAt = acceptedAt;
  }

  decline(declinedAt: string): void {
    this._props.declinedAt = declinedAt;
  }
}

// ─────────────────────────────────────────────
// Child Entity: AdmissionPriority
// ─────────────────────────────────────────────

export interface AdmissionPriorityProps {
  id: string;
  factor: AdmissionPriorityFactor;
  weight: number;
  evidenceUrl?: string;
  verified: boolean;
}

export class AdmissionPriorityEntity extends Entity<AdmissionPriorityProps> {
  get factor(): AdmissionPriorityFactor { return this._props.factor; }
  get weight(): number { return this._props.weight; }
  get isVerified(): boolean { return this._props.verified; }

  verify(): void {
    this._props.verified = true;
  }
}

// ─────────────────────────────────────────────
// Aggregate Root: Application
// ─────────────────────────────────────────────

export interface ApplicationProps {
  tenantId: string;
  branchId: string;
  academicSessionId: string;

  applicationNumber: string;
  leadId?: string;
  enquiryId?: string;

  programType: ProgramType;
  admissionType: AdmissionType;

  childFirstName: string;
  childLastName: string;
  childDob: string; // ISO date
  childGender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  childBloodGroup?: string;
  preferredStartDate: string; // ISO date

  status: ApplicationStatus;
  submittedAt?: string;
  verifiedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;

  parentDeclarations: Record<string, unknown>;
  metadata: Record<string, unknown>;

  documents: Map<string, ApplicationDocumentEntity>;
  counsellingSessions: Map<string, CounsellingSessionEntity>;
  approvals: Map<string, ApprovalEntity>;
  offers: Map<string, AdmissionOfferEntity>;
  priorityFactors: Map<string, AdmissionPriorityEntity>;

  ageVerification?: {
    minAgeRequiredYears: number;
    maxAgeRequiredYears: number;
    ageAtSessionStartYears: number;
    isEligible: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    overrideReason?: string;
  };

  siblingConcession?: {
    siblingStudentId: string;
    siblingName: string;
    concessionPercent: number;
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
  };

  feePlanQuote?: {
    annualFeeCents: number;
    securityDepositCents: number;
    siblingConcessionCents: number;
    scholarshipCents: number;
    netAnnualCents: number;
    installmentCount: number;
    quoteValidUntil: string;
  };

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['DOCUMENT_PENDING', 'CANCELLED'],
  DOCUMENT_PENDING: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED'],
  APPROVED: [],
  REJECTED: [],
  WAITLISTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  CANCELLED: [],
};

export class ApplicationAggregate extends AggregateRoot<ApplicationProps> {
  get tenantId(): string { return this._props.tenantId; }
  get branchId(): string { return this._props.branchId; }
  get academicSessionId(): string { return this._props.academicSessionId; }
  get applicationNumber(): string { return this._props.applicationNumber; }
  get status(): ApplicationStatus { return this._props.status; }
  get programType(): ProgramType { return this._props.programType; }
  get childFirstName(): string { return this._props.childFirstName; }
  get childLastName(): string { return this._props.childLastName; }
  get childDob(): string { return this._props.childDob; }
  get documents(): ApplicationDocumentEntity[] { return Array.from(this._props.documents.values()); }
  get counsellingSessions(): CounsellingSessionEntity[] {
    return Array.from(this._props.counsellingSessions.values());
  }
  get approvals(): ApprovalEntity[] { return Array.from(this._props.approvals.values()); }
  get offers(): AdmissionOfferEntity[] { return Array.from(this._props.offers.values()); }
  get priorityFactors(): AdmissionPriorityEntity[] {
    return Array.from(this._props.priorityFactors.values());
  }

  static create(props: Omit<ApplicationProps, 'documents' | 'counsellingSessions' | 'approvals' | 'offers' | 'priorityFactors' | 'status' | 'createdAt' | 'updatedAt'> & { status?: ApplicationStatus }): ApplicationAggregate {
    const now = new Date().toISOString();
    const agg = new ApplicationAggregate({
      ...props,
      status: props.status ?? 'DRAFT',
      documents: new Map(),
      counsellingSessions: new Map(),
      approvals: new Map(),
      offers: new Map(),
      priorityFactors: new Map(),
      createdAt: now,
      updatedAt: now,
    });

    agg._addDomainEvent(new ApplicationCreatedEvent({
      applicationId: agg.id,
      tenantId: agg._props.tenantId,
      branchId: agg._props.branchId,
      applicationNumber: agg._props.applicationNumber,
      programType: agg._props.programType,
      childFirstName: agg._props.childFirstName,
      childLastName: agg._props.childLastName,
      admissionType: agg._props.admissionType,
    }));

    return agg;
  }

  // ─── Lifecycle ────────────────────────────────────────

  submit(submittedAt: string): void {
    this._requireTransition('SUBMITTED');
    if (!this._props.childFirstName || !this._props.childLastName || !this._props.childDob) {
      throw new Error('Cannot submit: mandatory child fields missing');
    }
    this._props.status = 'SUBMITTED';
    this._props.submittedAt = submittedAt;
    this._touch();
    this._addDomainEvent(new ApplicationSubmittedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      applicationNumber: this._props.applicationNumber,
      submittedAt,
    }));
  }

  markDocumentsPending(): void {
    this._requireTransition('DOCUMENT_PENDING');
    this._props.status = 'DOCUMENT_PENDING';
    this._touch();
  }

  verify(verifiedAt: string): void {
    this._requireTransition('VERIFIED');
    const allDocsVerified = this._allMandatoryDocumentsVerified();
    if (!allDocsVerified) {
      throw new Error('Cannot verify: not all mandatory documents are verified');
    }
    this._props.status = 'VERIFIED';
    this._props.verifiedAt = verifiedAt;
    this._touch();
    this._addDomainEvent(new ApplicationVerifiedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      verifiedAt,
    }));
  }

  approve(approvedBy: string, approvedAt: string, admissionId: string): void {
    this._requireTransition('APPROVED');
    const hasApproveRecommendation = Array.from(this._props.counsellingSessions.values())
      .some(s => s.status === 'COMPLETED' && s.recommendation === 'APPROVE');
    if (!hasApproveRecommendation) {
      throw new Error('Cannot approve: no counselling session with APPROVE recommendation');
    }
    this._props.status = 'APPROVED';
    this._props.approvedAt = approvedAt;
    this._touch();
    this._addDomainEvent(new ApplicationApprovedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      approvedAt,
      approvedBy,
      admissionId,
    }));
  }

  reject(rejectedBy: string, rejectedAt: string, reason: RejectionReason, notes?: string): void {
    this._requireTransition('REJECTED');
    this._props.status = 'REJECTED';
    this._props.rejectedAt = rejectedAt;
    this._props.rejectionReason = reason;
    this._props.rejectionNotes = notes;
    this._touch();
    this._addDomainEvent(new ApplicationRejectedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      rejectedAt,
      rejectedBy,
      reason,
    }));
  }

  waitlist(position: number, priorityScore: number): void {
    this._requireTransition('WAITLISTED');
    this._props.status = 'WAITLISTED';
    this._touch();
    this._addDomainEvent(new ApplicationWaitlistedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      position,
      priorityScore,
    }));
  }

  cancel(reason: string, cancelledAt: string): void {
    this._requireTransition('CANCELLED');
    this._props.status = 'CANCELLED';
    this._touch();
    this._addDomainEvent(new ApplicationCancelledEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      cancelledAt,
      reason,
    }));
  }

  // ─── Child entities ────────────────────────────────────

  uploadDocument(doc: Omit<ApplicationDocumentProps, 'id' | 'status' | 'uploadedAt'> & { id?: string }): ApplicationDocumentEntity {
    this._requireMutable();
    const document = new ApplicationDocumentEntity({
      id: doc.id ?? crypto.randomUUID(),
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    });
    this._props.documents.set(document.id, document);
    this._touch();
    this._addDomainEvent(new ApplicationDocumentUploadedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      documentId: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
    }));
    return document;
  }

  verifyDocument(documentId: string, verifiedBy: string, verifiedAt: string): void {
    this._requireMutable();
    const doc = this._props.documents.get(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);
    doc.verify(verifiedBy, verifiedAt);
    this._touch();
    this._addDomainEvent(new ApplicationDocumentVerifiedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      documentId,
      verifiedBy,
      verifiedAt,
    }));
  }

  rejectDocument(documentId: string, reason: string): void {
    this._requireMutable();
    const doc = this._props.documents.get(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);
    doc.reject(reason);
    this._touch();
    this._addDomainEvent(new ApplicationDocumentRejectedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      documentId,
      rejectionReason: reason,
    }));
  }

  scheduleCounselling(counsellorId: string, scheduledAt: string, mode: CounsellingMode, durationMinutes = 30, childPresent = true): CounsellingSessionEntity {
    this._requireMutable();
    const session = new CounsellingSessionEntity({
      id: crypto.randomUUID(),
      counsellorId,
      scheduledAt,
      durationMinutes,
      mode,
      status: 'SCHEDULED',
      childPresent,
    });
    this._props.counsellingSessions.set(session.id, session);
    this._touch();
    this._addDomainEvent(new CounsellingScheduledEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      sessionId: session.id,
      counsellorId,
      scheduledAt,
      mode,
    }));
    return session;
  }

  completeCounselling(sessionId: string, recommendation: CounsellingRecommendation, notes: string, completedAt: string): void {
    this._requireMutable();
    const session = this._props.counsellingSessions.get(sessionId);
    if (!session) throw new Error(`Counselling session ${sessionId} not found`);
    session.complete(recommendation, notes, completedAt);
    this._touch();
    this._addDomainEvent(new CounsellingCompletedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      sessionId,
      recommendation,
      completedAt,
    }));
  }

  recordApproval(approverId: string, approvalLevel: ApprovalLevel, decision: ApprovalDecision, decidedAt: string, reason?: string): ApprovalEntity {
    this._requireMutable();
    const approval = new ApprovalEntity({
      id: crypto.randomUUID(),
      approverId,
      approvalLevel,
      decision,
      decisionReason: reason,
      decidedAt,
    });
    this._props.approvals.set(approval.id, approval);
    this._touch();
    return approval;
  }

  issueOffer(props: Omit<AdmissionOfferProps, 'id' | 'acceptedAt' | 'declinedAt'> & { id?: string }): AdmissionOfferEntity {
    this._requireMutable();
    const hasActiveOffer = Array.from(this._props.offers.values()).some(o => o.isActive);
    if (hasActiveOffer) {
      throw new Error('Cannot issue offer: an active offer already exists');
    }
    const offer = new AdmissionOfferEntity({
      id: props.id ?? crypto.randomUUID(),
      offerNumber: props.offerNumber,
      offeredProgram: props.offeredProgram,
      feeQuoteCents: props.feeQuoteCents,
      securityDepositCents: props.securityDepositCents,
      offerLetterUrl: props.offerLetterUrl,
      issuedAt: props.issuedAt,
      expiresAt: props.expiresAt,
    });
    this._props.offers.set(offer.id, offer);
    this._touch();
    this._addDomainEvent(new AdmissionOfferIssuedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      offerId: offer.id,
      offerNumber: offer.offerNumber,
      feeQuoteCents: offer.feeQuoteCents,
      expiresAt: offer.expiresAt,
    }));
    return offer;
  }

  acceptOffer(offerId: string, acceptedAt: string): void {
    this._requireMutable();
    const offer = this._props.offers.get(offerId);
    if (!offer) throw new Error(`Offer ${offerId} not found`);
    if (!offer.isActive) throw new Error('Offer is not active (already accepted/declined/expired)');
    offer.accept(acceptedAt);
    this._touch();
    this._addDomainEvent(new AdmissionOfferAcceptedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      offerId,
      acceptedAt,
    }));
  }

  declineOffer(offerId: string, declinedAt: string): void {
    this._requireMutable();
    const offer = this._props.offers.get(offerId);
    if (!offer) throw new Error(`Offer ${offerId} not found`);
    if (!offer.isActive) throw new Error('Offer is not active');
    offer.decline(declinedAt);
    this._touch();
    this._addDomainEvent(new AdmissionOfferDeclinedEvent({
      applicationId: this.id,
      tenantId: this._props.tenantId,
      offerId,
      declinedAt,
    }));
  }

  addPriorityFactor(factor: AdmissionPriorityFactor, weight: number, evidenceUrl?: string): AdmissionPriorityEntity {
    this._requireMutable();
    const pf = new AdmissionPriorityEntity({
      id: crypto.randomUUID(),
      factor,
      weight,
      evidenceUrl,
      verified: false,
    });
    this._props.priorityFactors.set(pf.id, pf);
    this._touch();
    return pf;
  }

  verifyPriorityFactor(priorityId: string): void {
    this._requireMutable();
    const pf = this._props.priorityFactors.get(priorityId);
    if (!pf) throw new Error(`Priority factor ${priorityId} not found`);
    pf.verify();
    this._touch();
  }

  computePriorityScore(): number {
    return Array.from(this._props.priorityFactors.values())
      .filter(p => p.isVerified)
      .reduce((sum, p) => sum + p.weight, 0);
  }

  // ─── Age verification ─────────────────────────────────

  performAgeVerification(
    minAge: number, maxAge: number, ageAtSession: number,
    verifiedBy: string, verifiedAt: string,
  ): void {
    this._requireMutable();
    if (this._props.ageVerification) {
      throw new Error('Age verification already performed');
    }
    this._props.ageVerification = {
      minAgeRequiredYears: minAge,
      maxAgeRequiredYears: maxAge,
      ageAtSessionStartYears: ageAtSession,
      isEligible: ageAtSession >= minAge && ageAtSession <= maxAge,
      verifiedBy,
      verifiedAt,
    };
    this._touch();
  }

  overrideAgeEligibility(reason: string, overriddenBy: string): void {
    this._requireMutable();
    if (!this._props.ageVerification) {
      throw new Error('Age verification not yet performed');
    }
    if (this._props.ageVerification.isEligible) {
      throw new Error('Override not required — child is already eligible');
    }
    this._props.ageVerification.isEligible = true;
    this._props.ageVerification.overrideReason = reason;
    this._props.ageVerification.verifiedBy = overriddenBy;
    this._touch();
  }

  // ─── Sibling concession ───────────────────────────────

  recordSiblingConcession(siblingStudentId: string, siblingName: string, concessionPercent: number): void {
    this._requireMutable();
    if (this._props.siblingConcession) {
      throw new Error('Sibling concession already recorded');
    }
    this._props.siblingConcession = {
      siblingStudentId,
      siblingName,
      concessionPercent,
      verified: false,
    };
    this._touch();
  }

  verifySiblingConcession(verifiedBy: string, verifiedAt: string): void {
    this._requireMutable();
    if (!this._props.siblingConcession) {
      throw new Error('Sibling concession not recorded');
    }
    this._props.siblingConcession.verified = true;
    this._props.siblingConcession.verifiedBy = verifiedBy;
    this._props.siblingConcession.verifiedAt = verifiedAt;
    this._touch();
  }

  // ─── Fee plan quote ───────────────────────────────────

  setFeePlanQuote(props: {
    annualFeeCents: number; securityDepositCents: number;
    siblingConcessionCents: number; scholarshipCents: number;
    installmentCount: number; quoteValidUntil: string;
  }): void {
    this._requireMutable();
    const netAnnual = props.annualFeeCents
      - props.siblingConcessionCents
      - props.scholarshipCents;
    this._props.feePlanQuote = {
      ...props,
      netAnnualCents: Math.max(0, netAnnual),
    };
    this._touch();
  }

  // ─── Helpers ──────────────────────────────────────────

  get priorityScore(): number { return this.computePriorityScore(); }
  get ageEligible(): boolean { return this._props.ageVerification?.isEligible ?? false; }
  get hasActiveOffer(): boolean {
    return Array.from(this._props.offers.values()).some(o => o.isActive);
  }
  get activeOffer(): AdmissionOfferEntity | undefined {
    return Array.from(this._props.offers.values()).find(o => o.isActive);
  }
  get admissionType(): string { return this._props.admissionType; }
  get feePlanNetAnnualCents(): number { return this._props.feePlanQuote?.netAnnualCents ?? 0; }

  /** Apply updates to DRAFT application (only allowed in DRAFT state). */
  applyDraftUpdates(updates: Record<string, unknown>): void {
    if (this._props.status !== 'DRAFT') {
      throw new Error(`Cannot apply draft updates in ${this._props.status} state`);
    }
    const allowed = [
      'leadId', 'enquiryId', 'programType', 'admissionType',
      'childFirstName', 'childLastName', 'childDob', 'childGender',
      'childBloodGroup', 'preferredStartDate', 'parentDeclarations', 'metadata',
    ];
    for (const key of allowed) {
      if (key in updates && updates[key] !== undefined) {
        (this._props as any)[key] = updates[key];
      }
    }
    this._touch();
  }

  private _requireTransition(target: ApplicationStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this._props.status];
    if (!allowed.includes(target)) {
      throw new Error(`Illegal transition: ${this._props.status} → ${target}`);
    }
  }

  private _requireMutable(): void {
    if (this._props.status === 'APPROVED' || this._props.status === 'REJECTED' || this._props.status === 'CANCELLED') {
      throw new Error(`Application is in terminal state ${this._props.status}; cannot modify`);
    }
  }

  private _allMandatoryDocumentsVerified(): boolean {
    // Minimum: birth certificate + photo
    const docs = Array.from(this._props.documents.values());
    if (docs.length === 0) return false;
    const hasBirthCert = docs.some(d => d.documentType === 'BIRTH_CERTIFICATE' && d.status === 'VERIFIED');
    const hasPhoto = docs.some(d => d.documentType === 'PHOTO' && d.status === 'VERIFIED');
    return hasBirthCert && hasPhoto;
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }
}
