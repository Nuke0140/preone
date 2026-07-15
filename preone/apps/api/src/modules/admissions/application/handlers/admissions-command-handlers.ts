/**
 * Admissions Command Handlers — CQRS write side (BTD §12.2).
 */
import { Injectable, Logger } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  AcceptOfferCommand, AcceptWaitingListSeatCommand, AddPriorityFactorCommand,
  ApproveApplicationCommand, CancelAdmissionCommand, CancelApplicationCommand,
  CompleteCounsellingCommand, CreateApplicationCommand, DeclineOfferCommand,
  IssueOfferCommand, OfferWaitingListSeatCommand, PerformAgeVerificationCommand,
  RecordSiblingConcessionCommand, RejectApplicationCommand,
  RejectApplicationDocumentCommand, ScheduleCounsellingCommand,
  SetFeePlanQuoteCommand, SubmitApplicationCommand, UpdateApplicationCommand,
  UploadApplicationDocumentCommand, VerifyApplicationDocumentCommand,
  VerifyPriorityFactorCommand, VerifySiblingConcessionCommand,
  WaitlistApplicationCommand,
} from '../commands/admissions.commands';
import { AdmissionsService } from '../services/admissions.service';

@Injectable()
export class CreateApplicationCommandHandler implements CommandHandler<CreateApplicationCommand> {
  private static readonly TYPE = 'Admissions.CreateApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(CreateApplicationCommandHandler.TYPE, this);
  }
  async handle(c: CreateApplicationCommand) {
    const app = await this.svc.createApplication(c.payload, c.payload.tenantId);
    return { id: app.id, applicationNumber: app.applicationNumber };
  }
}

@Injectable()
export class UpdateApplicationCommandHandler implements CommandHandler<UpdateApplicationCommand> {
  private static readonly TYPE = 'Admissions.UpdateApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(UpdateApplicationCommandHandler.TYPE, this);
  }
  async handle(c: UpdateApplicationCommand) {
    const { applicationId, tenantId, ...rest } = c.payload;
    await this.svc.updateApplication(applicationId, rest, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class SubmitApplicationCommandHandler implements CommandHandler<SubmitApplicationCommand> {
  private static readonly TYPE = 'Admissions.SubmitApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(SubmitApplicationCommandHandler.TYPE, this);
  }
  async handle(c: SubmitApplicationCommand) {
    const app = await this.svc.submitApplication(c.payload.applicationId, c.payload.tenantId);
    return { id: app.id };
  }
}

@Injectable()
export class RejectApplicationCommandHandler implements CommandHandler<RejectApplicationCommand> {
  private static readonly TYPE = 'Admissions.RejectApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(RejectApplicationCommandHandler.TYPE, this);
  }
  async handle(c: RejectApplicationCommand) {
    const { applicationId, tenantId, actorId, reason, notes } = c.payload;
    await this.svc.rejectApplication(applicationId, reason, notes, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class CancelApplicationCommandHandler implements CommandHandler<CancelApplicationCommand> {
  private static readonly TYPE = 'Admissions.CancelApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(CancelApplicationCommandHandler.TYPE, this);
  }
  async handle(c: CancelApplicationCommand) {
    const { applicationId, tenantId, reason } = c.payload;
    await this.svc.cancelApplication(applicationId, reason, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class UploadDocumentCommandHandler implements CommandHandler<UploadApplicationDocumentCommand> {
  private static readonly TYPE = 'Admissions.UploadDocument';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(UploadDocumentCommandHandler.TYPE, this);
  }
  async handle(c: UploadApplicationDocumentCommand) {
    const { applicationId, tenantId, ...rest } = c.payload;
    const result = await this.svc.uploadDocument(applicationId, rest, tenantId);
    return { id: applicationId, documentId: result.documentId };
  }
}

@Injectable()
export class VerifyDocumentCommandHandler implements CommandHandler<VerifyApplicationDocumentCommand> {
  private static readonly TYPE = 'Admissions.VerifyDocument';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(VerifyDocumentCommandHandler.TYPE, this);
  }
  async handle(c: VerifyApplicationDocumentCommand) {
    const { applicationId, documentId, tenantId, actorId } = c.payload;
    await this.svc.verifyDocument(applicationId, documentId, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class RejectDocumentCommandHandler implements CommandHandler<RejectApplicationDocumentCommand> {
  private static readonly TYPE = 'Admissions.RejectDocument';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(RejectDocumentCommandHandler.TYPE, this);
  }
  async handle(c: RejectApplicationDocumentCommand) {
    const { applicationId, documentId, tenantId, actorId, reason } = c.payload;
    await this.svc.rejectDocument(applicationId, documentId, reason, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class ScheduleCounsellingCommandHandler implements CommandHandler<ScheduleCounsellingCommand> {
  private static readonly TYPE = 'Admissions.ScheduleCounselling';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(ScheduleCounsellingCommandHandler.TYPE, this);
  }
  async handle(c: ScheduleCounsellingCommand) {
    const { applicationId, tenantId, ...rest } = c.payload;
    const result = await this.svc.scheduleCounselling(applicationId, rest, tenantId);
    return { id: applicationId, sessionId: result.sessionId };
  }
}

@Injectable()
export class CompleteCounsellingCommandHandler implements CommandHandler<CompleteCounsellingCommand> {
  private static readonly TYPE = 'Admissions.CompleteCounselling';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(CompleteCounsellingCommandHandler.TYPE, this);
  }
  async handle(c: CompleteCounsellingCommand) {
    const { applicationId, sessionId, tenantId, actorId, recommendation, notes } = c.payload;
    await this.svc.completeCounselling(applicationId, sessionId, recommendation, notes, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class ApproveApplicationCommandHandler implements CommandHandler<ApproveApplicationCommand> {
  private static readonly TYPE = 'Admissions.ApproveApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(ApproveApplicationCommandHandler.TYPE, this);
  }
  async handle(c: ApproveApplicationCommand) {
    const { applicationId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.approveApplication(applicationId, rest, actorId, tenantId);
    return { id: applicationId, admissionId: result.admissionId };
  }
}

@Injectable()
export class IssueOfferCommandHandler implements CommandHandler<IssueOfferCommand> {
  private static readonly TYPE = 'Admissions.IssueOffer';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(IssueOfferCommandHandler.TYPE, this);
  }
  async handle(c: IssueOfferCommand) {
    const { applicationId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.issueOffer(applicationId, rest, actorId, tenantId);
    return { id: applicationId, offerId: result.offerId };
  }
}

@Injectable()
export class AcceptOfferCommandHandler implements CommandHandler<AcceptOfferCommand> {
  private static readonly TYPE = 'Admissions.AcceptOffer';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(AcceptOfferCommandHandler.TYPE, this);
  }
  async handle(c: AcceptOfferCommand) {
    const { applicationId, offerId, tenantId } = c.payload;
    await this.svc.acceptOffer(applicationId, offerId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class DeclineOfferCommandHandler implements CommandHandler<DeclineOfferCommand> {
  private static readonly TYPE = 'Admissions.DeclineOffer';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(DeclineOfferCommandHandler.TYPE, this);
  }
  async handle(c: DeclineOfferCommand) {
    const { applicationId, offerId, tenantId } = c.payload;
    await this.svc.declineOffer(applicationId, offerId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class PerformAgeVerificationCommandHandler implements CommandHandler<PerformAgeVerificationCommand> {
  private static readonly TYPE = 'Admissions.PerformAgeVerification';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(PerformAgeVerificationCommandHandler.TYPE, this);
  }
  async handle(c: PerformAgeVerificationCommand) {
    const { applicationId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.performAgeVerification(applicationId, rest, actorId, tenantId);
    return { id: applicationId, isEligible: result.isEligible };
  }
}

@Injectable()
export class SetFeePlanQuoteCommandHandler implements CommandHandler<SetFeePlanQuoteCommand> {
  private static readonly TYPE = 'Admissions.SetFeePlanQuote';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(SetFeePlanQuoteCommandHandler.TYPE, this);
  }
  async handle(c: SetFeePlanQuoteCommand) {
    const { applicationId, tenantId, actorId, ...rest } = c.payload;
    const result = await this.svc.setFeePlanQuote(applicationId, rest, actorId, tenantId);
    return { id: applicationId, netAnnualCents: result.netAnnualCents };
  }
}

@Injectable()
export class AddPriorityFactorCommandHandler implements CommandHandler<AddPriorityFactorCommand> {
  private static readonly TYPE = 'Admissions.AddPriorityFactor';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(AddPriorityFactorCommandHandler.TYPE, this);
  }
  async handle(c: AddPriorityFactorCommand) {
    const { applicationId, tenantId, actorId, factor, weight, evidenceUrl } = c.payload;
    const result = await this.svc.addPriorityFactor(applicationId, factor, weight, evidenceUrl, actorId, tenantId);
    return { id: applicationId, priorityId: result.priorityId };
  }
}

@Injectable()
export class VerifyPriorityFactorCommandHandler implements CommandHandler<VerifyPriorityFactorCommand> {
  private static readonly TYPE = 'Admissions.VerifyPriorityFactor';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(VerifyPriorityFactorCommandHandler.TYPE, this);
  }
  async handle(c: VerifyPriorityFactorCommand) {
    const { applicationId, priorityId, tenantId, actorId } = c.payload;
    await this.svc.verifyPriorityFactor(applicationId, priorityId, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class RecordSiblingConcessionCommandHandler implements CommandHandler<RecordSiblingConcessionCommand> {
  private static readonly TYPE = 'Admissions.RecordSiblingConcession';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(RecordSiblingConcessionCommandHandler.TYPE, this);
  }
  async handle(c: RecordSiblingConcessionCommand) {
    const { applicationId, tenantId, actorId, ...rest } = c.payload;
    await this.svc.recordSiblingConcession(applicationId, rest, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class VerifySiblingConcessionCommandHandler implements CommandHandler<VerifySiblingConcessionCommand> {
  private static readonly TYPE = 'Admissions.VerifySiblingConcession';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(VerifySiblingConcessionCommandHandler.TYPE, this);
  }
  async handle(c: VerifySiblingConcessionCommand) {
    const { applicationId, tenantId, actorId } = c.payload;
    await this.svc.verifySiblingConcession(applicationId, actorId, tenantId);
    return { id: applicationId };
  }
}

@Injectable()
export class WaitlistApplicationCommandHandler implements CommandHandler<WaitlistApplicationCommand> {
  private static readonly TYPE = 'Admissions.WaitlistApplication';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(WaitlistApplicationCommandHandler.TYPE, this);
  }
  async handle(c: WaitlistApplicationCommand) {
    const { applicationId, tenantId, actorId } = c.payload;
    const result = await this.svc.waitlistApplication(applicationId, actorId, tenantId);
    return { id: applicationId, position: result.position };
  }
}

@Injectable()
export class OfferWaitingListSeatCommandHandler implements CommandHandler<OfferWaitingListSeatCommand> {
  private static readonly TYPE = 'Admissions.OfferWaitingListSeat';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(OfferWaitingListSeatCommandHandler.TYPE, this);
  }
  async handle(c: OfferWaitingListSeatCommand) {
    const { waitingListId, tenantId, actorId, expiresAt } = c.payload;
    await this.svc.offerWaitingListSeat(waitingListId, expiresAt, actorId, tenantId);
    return { id: waitingListId };
  }
}

@Injectable()
export class AcceptWaitingListSeatCommandHandler implements CommandHandler<AcceptWaitingListSeatCommand> {
  private static readonly TYPE = 'Admissions.AcceptWaitingListSeat';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(AcceptWaitingListSeatCommandHandler.TYPE, this);
  }
  async handle(c: AcceptWaitingListSeatCommand) {
    const { waitingListId, tenantId } = c.payload;
    await this.svc.acceptWaitingListSeat(waitingListId, tenantId);
    return { id: waitingListId };
  }
}

@Injectable()
export class CancelAdmissionCommandHandler implements CommandHandler<CancelAdmissionCommand> {
  private static readonly TYPE = 'Admissions.CancelAdmission';
  constructor(private readonly bus: CommandBus, private readonly svc: AdmissionsService) {
    bus.register(CancelAdmissionCommandHandler.TYPE, this);
  }
  async handle(c: CancelAdmissionCommand) {
    const { admissionId, tenantId, actorId, reason, refundDueCents } = c.payload;
    await this.svc.cancelAdmission(admissionId, reason, refundDueCents, actorId, tenantId);
    return { id: admissionId };
  }
}
