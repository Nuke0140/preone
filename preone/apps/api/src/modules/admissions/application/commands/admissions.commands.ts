/**
 * Admissions Commands — intent-bearing operations (BTD §12.2).
 */
import type { Command, CommandMetadata } from '@shared/cqrs';

import type {
  AddPriorityFactorDto, AgeVerificationDto, CancelAdmissionDto,
  CancelApplicationDto, CompleteCounsellingDto, CreateApplicationDto,
  FeePlanQuoteDto, IssueOfferDto, OfferSeatDto, RecordApprovalDto,
  RejectApplicationDto, ScheduleCounsellingDto, SiblingConcessionDto,
  UpdateApplicationDto, UploadDocumentDto,
} from '../dto/admissions.dto';

// ─── Application lifecycle ──────────────────────

export class CreateApplicationCommand implements Command<CreateApplicationDto & { tenantId: string }, { id: string; applicationNumber: string }> {
  readonly type = 'Admissions.CreateApplication';
  constructor(readonly payload: CreateApplicationDto & { tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class UpdateApplicationCommand implements Command<UpdateApplicationDto & { applicationId: string; tenantId: string }, { id: string }> {
  readonly type = 'Admissions.UpdateApplication';
  constructor(readonly payload: UpdateApplicationDto & { applicationId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class SubmitApplicationCommand implements Command<{ applicationId: string; tenantId: string }, { id: string }> {
  readonly type = 'Admissions.SubmitApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class RejectApplicationCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & RejectApplicationDto, { id: string }> {
  readonly type = 'Admissions.RejectApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & RejectApplicationDto, readonly metadata: CommandMetadata) {}
}

export class CancelApplicationCommand implements Command<{ applicationId: string; tenantId: string } & CancelApplicationDto, { id: string }> {
  readonly type = 'Admissions.CancelApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string } & CancelApplicationDto, readonly metadata: CommandMetadata) {}
}

// ─── Documents ─────────────────────────────────

export class UploadApplicationDocumentCommand implements Command<{ applicationId: string; tenantId: string } & UploadDocumentDto, { id: string; documentId: string }> {
  readonly type = 'Admissions.UploadDocument';
  constructor(readonly payload: { applicationId: string; tenantId: string } & UploadDocumentDto, readonly metadata: CommandMetadata) {}
}

export class VerifyApplicationDocumentCommand implements Command<{ applicationId: string; documentId: string; tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Admissions.VerifyDocument';
  constructor(readonly payload: { applicationId: string; documentId: string; tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

export class RejectApplicationDocumentCommand implements Command<{ applicationId: string; documentId: string; tenantId: string; actorId: string; reason: string }, { id: string }> {
  readonly type = 'Admissions.RejectDocument';
  constructor(readonly payload: { applicationId: string; documentId: string; tenantId: string; actorId: string; reason: string }, readonly metadata: CommandMetadata) {}
}

// ─── Counselling ───────────────────────────────

export class ScheduleCounsellingCommand implements Command<{ applicationId: string; tenantId: string } & ScheduleCounsellingDto, { id: string; sessionId: string }> {
  readonly type = 'Admissions.ScheduleCounselling';
  constructor(readonly payload: { applicationId: string; tenantId: string } & ScheduleCounsellingDto, readonly metadata: CommandMetadata) {}
}

export class CompleteCounsellingCommand implements Command<{ applicationId: string; sessionId: string; tenantId: string; actorId: string } & CompleteCounsellingDto, { id: string }> {
  readonly type = 'Admissions.CompleteCounselling';
  constructor(readonly payload: { applicationId: string; sessionId: string; tenantId: string; actorId: string } & CompleteCounsellingDto, readonly metadata: CommandMetadata) {}
}

// ─── Approval ──────────────────────────────────

export class ApproveApplicationCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & RecordApprovalDto, { id: string; admissionId: string }> {
  readonly type = 'Admissions.ApproveApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & RecordApprovalDto, readonly metadata: CommandMetadata) {}
}

// ─── Offer ─────────────────────────────────────

export class IssueOfferCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & IssueOfferDto, { id: string; offerId: string }> {
  readonly type = 'Admissions.IssueOffer';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & IssueOfferDto, readonly metadata: CommandMetadata) {}
}

export class AcceptOfferCommand implements Command<{ applicationId: string; offerId: string; tenantId: string }, { id: string }> {
  readonly type = 'Admissions.AcceptOffer';
  constructor(readonly payload: { applicationId: string; offerId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

export class DeclineOfferCommand implements Command<{ applicationId: string; offerId: string; tenantId: string }, { id: string }> {
  readonly type = 'Admissions.DeclineOffer';
  constructor(readonly payload: { applicationId: string; offerId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

// ─── Age verification ──────────────────────────

export class PerformAgeVerificationCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & AgeVerificationDto, { id: string; isEligible: boolean }> {
  readonly type = 'Admissions.PerformAgeVerification';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & AgeVerificationDto, readonly metadata: CommandMetadata) {}
}

// ─── Fee plan quote ────────────────────────────

export class SetFeePlanQuoteCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & FeePlanQuoteDto, { id: string; netAnnualCents: number }> {
  readonly type = 'Admissions.SetFeePlanQuote';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & FeePlanQuoteDto, readonly metadata: CommandMetadata) {}
}

// ─── Priority factors ──────────────────────────

export class AddPriorityFactorCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & AddPriorityFactorDto, { id: string; priorityId: string }> {
  readonly type = 'Admissions.AddPriorityFactor';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & AddPriorityFactorDto, readonly metadata: CommandMetadata) {}
}

export class VerifyPriorityFactorCommand implements Command<{ applicationId: string; priorityId: string; tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Admissions.VerifyPriorityFactor';
  constructor(readonly payload: { applicationId: string; priorityId: string; tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

// ─── Sibling concession ────────────────────────

export class RecordSiblingConcessionCommand implements Command<{ applicationId: string; tenantId: string; actorId: string } & SiblingConcessionDto, { id: string }> {
  readonly type = 'Admissions.RecordSiblingConcession';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string } & SiblingConcessionDto, readonly metadata: CommandMetadata) {}
}

export class VerifySiblingConcessionCommand implements Command<{ applicationId: string; tenantId: string; actorId: string }, { id: string }> {
  readonly type = 'Admissions.VerifySiblingConcession';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

// ─── Waitlist ──────────────────────────────────

export class WaitlistApplicationCommand implements Command<{ applicationId: string; tenantId: string; actorId: string }, { id: string; position: number }> {
  readonly type = 'Admissions.WaitlistApplication';
  constructor(readonly payload: { applicationId: string; tenantId: string; actorId: string }, readonly metadata: CommandMetadata) {}
}

export class OfferWaitingListSeatCommand implements Command<{ waitingListId: string; tenantId: string; actorId: string } & OfferSeatDto, { id: string }> {
  readonly type = 'Admissions.OfferWaitingListSeat';
  constructor(readonly payload: { waitingListId: string; tenantId: string; actorId: string } & OfferSeatDto, readonly metadata: CommandMetadata) {}
}

export class AcceptWaitingListSeatCommand implements Command<{ waitingListId: string; tenantId: string }, { id: string }> {
  readonly type = 'Admissions.AcceptWaitingListSeat';
  constructor(readonly payload: { waitingListId: string; tenantId: string }, readonly metadata: CommandMetadata) {}
}

// ─── Admission lifecycle ───────────────────────

export class CancelAdmissionCommand implements Command<{ admissionId: string; tenantId: string; actorId: string } & CancelAdmissionDto, { id: string }> {
  readonly type = 'Admissions.CancelAdmission';
  constructor(readonly payload: { admissionId: string; tenantId: string; actorId: string } & CancelAdmissionDto, readonly metadata: CommandMetadata) {}
}
