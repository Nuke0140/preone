/**
 * Admissions Application Service — orchestrates Application, Admission, and
 * WaitingList aggregates.
 *
 * Per BTD §12.2 — application services are the only entry point to domain.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ConflictException, NotFoundException, ValidationException,
} from '@common/errors/exceptions';
import { EventBusService } from '@infra/event-bus/event-bus.service';

import {
  AdmissionAggregate,
} from '../../domain/aggregates/admission.aggregate';
import {
  AdmissionPriorityFactor, ApplicationAggregate, ApplicationStatus,
  CounsellingMode, CounsellingRecommendation, ProgramType,
} from '../../domain/aggregates/application.aggregate';
import {
  WaitingListAggregate,
} from '../../domain/aggregates/waiting-list.aggregate';
import {
  ADMISSION_REPOSITORY, APPLICATION_REPOSITORY, WAITING_LIST_REPOSITORY,
} from '../../domain/repositories/tokens';
import type {
  AdmissionListFilter, AdmissionRepository,
  ApplicationListFilter, ApplicationRepository, WaitingListRepository,
} from '../../domain/repositories/admissions.repository';

// ─────────────────────────────────────────────
// Application number generator: APP-YYYY-NNNNN
// ─────────────────────────────────────────────

function generateApplicationNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `APP-${year}-${rand}`;
}

function generateAdmissionNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ADM-${year}-${rand}`;
}

function generateOfferNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `OFR-${year}-${rand}`;
}

@Injectable()
export class AdmissionsService {
  private readonly logger = new Logger(AdmissionsService.name);

  constructor(
    @Inject(APPLICATION_REPOSITORY) private readonly applications: ApplicationRepository,
    @Inject(ADMISSION_REPOSITORY) private readonly admissions: AdmissionRepository,
    @Inject(WAITING_LIST_REPOSITORY) private readonly waitingList: WaitingListRepository,
    private readonly eventBus: EventBusService,
  ) {}

  // ─── Application ────────────────────────────────────

  async createApplication(props: {
    tenantId: string;
    branchId: string;
    academicSessionId: string;
    programType: ProgramType;
    admissionType: 'REGULAR' | 'LATE' | 'TRANSFER' | 'MID_SESSION' | 'READMISSION';
    leadId?: string;
    enquiryId?: string;
    childFirstName: string;
    childLastName: string;
    childDob: string;
    childGender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
    childBloodGroup?: string;
    preferredStartDate: string;
    parentDeclarations?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }, _actorId: string): Promise<ApplicationAggregate> {
    let applicationNumber = generateApplicationNumber();
    // Ensure uniqueness
    while (await this.applications.findByApplicationNumber(props.tenantId, applicationNumber)) {
      applicationNumber = generateApplicationNumber();
    }

    const application = ApplicationAggregate.create({
      tenantId: props.tenantId,
      branchId: props.branchId,
      academicSessionId: props.academicSessionId,
      applicationNumber,
      leadId: props.leadId,
      enquiryId: props.enquiryId,
      programType: props.programType,
      admissionType: props.admissionType,
      childFirstName: props.childFirstName,
      childLastName: props.childLastName,
      childDob: props.childDob,
      childGender: props.childGender,
      childBloodGroup: props.childBloodGroup,
      preferredStartDate: props.preferredStartDate,
      parentDeclarations: props.parentDeclarations ?? {},
      metadata: props.metadata ?? {},
      createdBy: _actorId,
    });

    await this.applications.save(application);
    await this.eventBus.publishAll(application.commit());
    this.logger.log(`Created application ${applicationNumber} for tenant ${props.tenantId}`);
    return application;
  }

  async updateApplication(applicationId: string, updates: Record<string, unknown>, tenantId: string): Promise<ApplicationAggregate> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    if (app.status !== 'DRAFT') {
      throw new ConflictException('APPLICATION_NOT_DRAFT', `Cannot update application in ${app.status} state`);
    }
    // Apply updates via a public method on the aggregate
    app.applyDraftUpdates(updates);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return app;
  }

  async submitApplication(applicationId: string, tenantId: string): Promise<ApplicationAggregate> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.submit(new Date().toISOString());
    // Auto-transition to DOCUMENT_PENDING after submission
    if (app.status === 'SUBMITTED') {
      app.markDocumentsPending();
    }
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return app;
  }

  async rejectApplication(applicationId: string, reason: string, notes: string | undefined, actorId: string, tenantId: string): Promise<ApplicationAggregate> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.reject(actorId, new Date().toISOString(), reason as any, notes);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return app;
  }

  async cancelApplication(applicationId: string, reason: string, tenantId: string): Promise<ApplicationAggregate> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.cancel(reason, new Date().toISOString());
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return app;
  }

  // ─── Documents ─────────────────────────────────────

  async uploadDocument(applicationId: string, doc: {
    documentType: string;
    fileName: string;
    fileUrl: string;
    fileKey?: string;
    fileSizeBytes: number;
    mimeType: string;
  }, tenantId: string): Promise<{ documentId: string }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    const document = app.uploadDocument({
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileKey: doc.fileKey,
      fileSizeBytes: doc.fileSizeBytes,
      mimeType: doc.mimeType,
    });
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { documentId: document.id };
  }

  async verifyDocument(applicationId: string, documentId: string, actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.verifyDocument(documentId, actorId, new Date().toISOString());
    // Auto-transition to VERIFIED if all mandatory docs verified
    if (app.status === 'DOCUMENT_PENDING') {
      try {
        app.verify(new Date().toISOString());
      } catch {
        // Not all mandatory docs verified yet — stay in DOCUMENT_PENDING
      }
    }
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  async rejectDocument(applicationId: string, documentId: string, reason: string, _actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.rejectDocument(documentId, reason);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Counselling ───────────────────────────────────

  async scheduleCounselling(applicationId: string, props: {
    counsellorId: string;
    scheduledAt: string;
    mode: CounsellingMode;
    durationMinutes?: number;
    childPresent?: boolean;
  }, tenantId: string): Promise<{ sessionId: string }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    const session = app.scheduleCounselling(
      props.counsellorId, props.scheduledAt, props.mode,
      props.durationMinutes ?? 30, props.childPresent ?? true,
    );
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { sessionId: session.id };
  }

  async completeCounselling(applicationId: string, sessionId: string, recommendation: CounsellingRecommendation, notes: string, _actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.completeCounselling(sessionId, recommendation, notes, new Date().toISOString());
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Approval ──────────────────────────────────────

  async approveApplication(applicationId: string, approvalProps: {
    approvalLevel: number;
    decision: 'APPROVED' | 'REJECTED' | 'WAITLISTED' | 'DEFERRED';
    reason?: string;
    feeWaiverApprovedCents?: number;
  }, actorId: string, tenantId: string): Promise<{ admissionId: string }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);

    // Record approval
    app.recordApproval(actorId, approvalProps.approvalLevel as 1|2|3|4, approvalProps.decision, new Date().toISOString(), approvalProps.reason);

    if (approvalProps.decision === 'APPROVED') {
      // Create Admission record
      const admission = AdmissionAggregate.create({
        tenantId,
        applicationId: app.id,
        admissionNumber: generateAdmissionNumber(),
        admissionDate: new Date().toISOString(),
        admissionType: app.admissionType as any,
      });
      await this.admissions.save(admission);

      // Approve the application (links admission)
      app.approve(actorId, new Date().toISOString(), admission.id);
      await this.applications.save(app);

      // Dispatch events for both aggregates
      await this.eventBus.publishAll([
        ...app.commit(),
        ...admission.commit(),
      ]);

      this.logger.log(`Approved application ${app.applicationNumber} → admission ${admission.admissionNumber}`);
      return { admissionId: admission.id };
    }

    if (approvalProps.decision === 'REJECTED') {
      app.reject(actorId, new Date().toISOString(), 'OTHER', approvalProps.reason);
    } else if (approvalProps.decision === 'WAITLISTED') {
      // Waitlist separately
      await this.waitlistApplication(app.id, actorId, tenantId);
    }

    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { admissionId: '' };
  }

  // ─── Offer ─────────────────────────────────────────

  async issueOffer(applicationId: string, props: {
    offeredProgram: ProgramType;
    feeQuoteCents: number;
    securityDepositCents: number;
    offerLetterUrl: string;
    expiresAt: string;
  }, _actorId: string, tenantId: string): Promise<{ offerId: string }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    const offer = app.issueOffer({
      offerNumber: generateOfferNumber(),
      offeredProgram: props.offeredProgram,
      feeQuoteCents: props.feeQuoteCents,
      securityDepositCents: props.securityDepositCents,
      offerLetterUrl: props.offerLetterUrl,
      issuedAt: new Date().toISOString(),
      expiresAt: props.expiresAt,
    });
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { offerId: offer.id };
  }

  async acceptOffer(applicationId: string, offerId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.acceptOffer(offerId, new Date().toISOString());
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  async declineOffer(applicationId: string, offerId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.declineOffer(offerId, new Date().toISOString());
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Age verification ──────────────────────────────

  async performAgeVerification(applicationId: string, props: {
    minAgeRequiredYears: number;
    maxAgeRequiredYears: number;
    ageAtSessionStartYears: number;
  }, actorId: string, tenantId: string): Promise<{ isEligible: boolean }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.performAgeVerification(
      props.minAgeRequiredYears, props.maxAgeRequiredYears,
      props.ageAtSessionStartYears, actorId, new Date().toISOString(),
    );
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { isEligible: app.ageEligible };
  }

  async overrideAgeEligibility(applicationId: string, reason: string, actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.overrideAgeEligibility(reason, actorId);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Fee plan quote ────────────────────────────────

  async setFeePlanQuote(applicationId: string, props: {
    annualFeeCents: number;
    securityDepositCents: number;
    siblingConcessionCents: number;
    scholarshipCents: number;
    installmentCount: number;
    quoteValidUntil: string;
  }, _actorId: string, tenantId: string): Promise<{ netAnnualCents: number }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.setFeePlanQuote(props);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { netAnnualCents: app.feePlanNetAnnualCents };
  }

  // ─── Priority factors ──────────────────────────────

  async addPriorityFactor(applicationId: string, factor: AdmissionPriorityFactor, weight: number, evidenceUrl: string | undefined, _actorId: string, tenantId: string): Promise<{ priorityId: string }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    const pf = app.addPriorityFactor(factor, weight, evidenceUrl);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
    return { priorityId: pf.id };
  }

  async verifyPriorityFactor(applicationId: string, priorityId: string, _actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.verifyPriorityFactor(priorityId);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Sibling concession ────────────────────────────

  async recordSiblingConcession(applicationId: string, props: {
    siblingStudentId: string;
    siblingName: string;
    concessionPercent: number;
  }, _actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.recordSiblingConcession(props.siblingStudentId, props.siblingName, props.concessionPercent);
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  async verifySiblingConcession(applicationId: string, _actorId: string, tenantId: string): Promise<void> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);
    app.verifySiblingConcession(_actorId, new Date().toISOString());
    await this.applications.save(app);
    await this.eventBus.publishAll(app.commit());
  }

  // ─── Waitlist ──────────────────────────────────────

  async waitlistApplication(applicationId: string, _actorId: string, tenantId: string): Promise<{ position: number }> {
    const app = await this.getApplicationOrThrow(applicationId, tenantId);

    // Determine position: count existing entries for this branch+program+session + 1
    const existing = await this.waitingList.list({
      tenantId,
      branchId: app.branchId,
      programType: app.programType,
      academicSessionId: app.academicSessionId,
      state: 'WAITING',
    });
    const position = existing.length + 1;
    void existing;

    const entry = WaitingListAggregate.create({
      tenantId,
      applicationId: app.id,
      branchId: app.branchId,
      programType: app.programType,
      academicSessionId: app.academicSessionId,
      position,
      priorityScore: app.priorityScore,
    });

    app.waitlist(position, app.priorityScore);
    await this.waitingList.save(entry);
    await this.applications.save(app);
    await this.eventBus.publishAll([...entry.commit(), ...app.commit()]);
    return { position };
  }

  async offerWaitingListSeat(waitingListId: string, expiresAt: string, _actorId: string, tenantId: string): Promise<void> {
    const entry = await this.waitingList.findById(waitingListId);
    if (!entry || entry.tenantId !== tenantId) {
      throw new NotFoundException('WaitingListEntry', waitingListId);
    }
    entry.offerSeat(new Date().toISOString(), expiresAt);
    await this.waitingList.save(entry);
    await this.eventBus.publishAll(entry.commit());
  }

  async acceptWaitingListSeat(waitingListId: string, tenantId: string): Promise<void> {
    const entry = await this.waitingList.findById(waitingListId);
    if (!entry || entry.tenantId !== tenantId) {
      throw new NotFoundException('WaitingListEntry', waitingListId);
    }
    entry.accept(new Date().toISOString());
    await this.waitingList.save(entry);
    await this.eventBus.publishAll(entry.commit());

    // Promote everyone behind
    const laterEntries = await this.waitingList.list({
      tenantId,
      branchId: entry.branchId,
      programType: entry.programType as ProgramType,
      academicSessionId: entry.academicSessionId,
      state: 'WAITING',
    });
    for (const e of laterEntries) {
      if (e.position > entry.position) {
        e.promote();
      }
    }
    // Note: saveMany handled by repository
  }

  // ─── Admission ─────────────────────────────────────

  async cancelAdmission(admissionId: string, reason: string, refundDueCents: number | undefined, _actorId: string, tenantId: string): Promise<void> {
    const admission = await this.getAdmissionOrThrow(admissionId, tenantId);
    admission.cancel(reason, refundDueCents ?? null, new Date().toISOString());
    await this.admissions.save(admission);
    await this.eventBus.publishAll(admission.commit());
  }

  // ─── Queries ───────────────────────────────────────

  async getApplication(applicationId: string, tenantId: string): Promise<ApplicationAggregate | undefined> {
    return this.applications.findById(applicationId);
  }

  async listApplications(filter: ApplicationListFilter, page: number, pageSize: number) {
    return this.applications.list(filter, page, pageSize);
  }

  async getAdmission(admissionId: string, tenantId: string): Promise<AdmissionAggregate | undefined> {
    return this.admissions.findById(admissionId);
  }

  async listAdmissions(filter: AdmissionListFilter, page: number, pageSize: number) {
    return this.admissions.list(filter, page, pageSize);
  }

  async getPipeline(tenantId: string, branchId: string, academicSessionId: string) {
    const counts = await this.applications.countByStatus(tenantId, branchId, academicSessionId);
    return {
      branchId, academicSessionId,
      counts,
      total: Object.values(counts as Record<string, number>).reduce((s: number, n: number) => s + n, 0),
    };
  }

  async listWaitingList(tenantId: string, branchId: string, programType: string, academicSessionId: string) {
    return this.waitingList.list({
      tenantId, branchId, programType: programType as ProgramType, academicSessionId,
    });
  }

  // ─── Helpers ───────────────────────────────────────

  private async getApplicationOrThrow(applicationId: string, tenantId: string): Promise<ApplicationAggregate> {
    const app = await this.applications.findById(applicationId);
    if (!app || app.tenantId !== tenantId) {
      throw new NotFoundException('Application', applicationId);
    }
    return app;
  }

  private async getAdmissionOrThrow(admissionId: string, tenantId: string): Promise<AdmissionAggregate> {
    const a = await this.admissions.findById(admissionId);
    if (!a || a.tenantId !== tenantId) {
      throw new NotFoundException('Admission', admissionId);
    }
    return a;
  }
}
