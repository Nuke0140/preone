/**
 * Academics Command Handlers — CQRS write side (BTD §12.2).
 *
 * Each handler:
 *   1. Loads aggregate via repository (via service layer)
 *   2. Mutates aggregate
 *   3. Saves via repository
 *   4. Returns minimal result (ID only)
 */
import { Injectable, Logger } from '@nestjs/common';

import { CommandBus, CommandHandler } from '@shared/cqrs';

import {
  ActivateAcademicSessionCommand, ActivateSectionCommand, CloseSectionCommand,
  CompleteAcademicSessionCommand, CompleteAssessmentCommand, CreateAcademicSessionCommand,
  CreateAssessmentCommand, CreateCurriculumCommand, CreateEnrollmentCommand,
  CreateObservationCommand, CreatePortfolioItemCommand, CreateReportCardCommand,
  CreateSectionCommand, GenerateReportCardCommand, HighlightPortfolioItemCommand,
  PublishCurriculumCommand, PublishReportCardCommand, PromoteEnrollmentCommand,
  RecordScoreCommand, ShareObservationWithParentCommand, ShareReportCardCommand,
  StartAssessmentCommand, WithdrawEnrollmentCommand,
} from '../../application/commands/academics.commands';
import {
  AcademicSessionService, AssessmentService, CurriculumService,
  EnrollmentService, ObservationService, PortfolioService,
  ReportCardService, SectionService,
} from '../services/academics.service';

// ─────────────────────────────────────────────
// AcademicSession
// ─────────────────────────────────────────────

@Injectable()
export class CreateAcademicSessionCommandHandler implements CommandHandler<CreateAcademicSessionCommand> {
  private static readonly TYPE = 'Academics.CreateAcademicSession';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AcademicSessionService,
  ) { bus.register(CreateAcademicSessionCommandHandler.TYPE, this); }
  async handle(c: CreateAcademicSessionCommand): Promise<{ id: string }> {
    const r = await this.svc.createSession(c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class ActivateAcademicSessionCommandHandler implements CommandHandler<ActivateAcademicSessionCommand> {
  private static readonly TYPE = 'Academics.ActivateAcademicSession';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AcademicSessionService,
  ) { bus.register(ActivateAcademicSessionCommandHandler.TYPE, this); }
  async handle(c: ActivateAcademicSessionCommand): Promise<{ id: string }> {
    const r = await this.svc.activateSession(c.payload.sessionId, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class CompleteAcademicSessionCommandHandler implements CommandHandler<CompleteAcademicSessionCommand> {
  private static readonly TYPE = 'Academics.CompleteAcademicSession';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AcademicSessionService,
  ) { bus.register(CompleteAcademicSessionCommandHandler.TYPE, this); }
  async handle(c: CompleteAcademicSessionCommand): Promise<{ id: string }> {
    const r = await this.svc.completeSession(c.payload.sessionId, c.metadata.tenantId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Curriculum
// ─────────────────────────────────────────────

@Injectable()
export class CreateCurriculumCommandHandler implements CommandHandler<CreateCurriculumCommand> {
  private static readonly TYPE = 'Academics.CreateCurriculum';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: CurriculumService,
  ) { bus.register(CreateCurriculumCommandHandler.TYPE, this); }
  async handle(c: CreateCurriculumCommand): Promise<{ id: string }> {
    const r = await this.svc.createCurriculum(c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class PublishCurriculumCommandHandler implements CommandHandler<PublishCurriculumCommand> {
  private static readonly TYPE = 'Academics.PublishCurriculum';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: CurriculumService,
  ) { bus.register(PublishCurriculumCommandHandler.TYPE, this); }
  async handle(c: PublishCurriculumCommand): Promise<{ id: string }> {
    const r = await this.svc.publishCurriculum(c.payload.curriculumId, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────

@Injectable()
export class CreateSectionCommandHandler implements CommandHandler<CreateSectionCommand> {
  private static readonly TYPE = 'Academics.CreateSection';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: SectionService,
  ) { bus.register(CreateSectionCommandHandler.TYPE, this); }
  async handle(c: CreateSectionCommand): Promise<{ id: string }> {
    const r = await this.svc.createSection(c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class ActivateSectionCommandHandler implements CommandHandler<ActivateSectionCommand> {
  private static readonly TYPE = 'Academics.ActivateSection';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: SectionService,
  ) { bus.register(ActivateSectionCommandHandler.TYPE, this); }
  async handle(c: ActivateSectionCommand): Promise<{ id: string }> {
    const r = await this.svc.activateSection(c.payload.sectionId, c.metadata.tenantId);
    return { id: r.id };
  }
}

@Injectable()
export class CloseSectionCommandHandler implements CommandHandler<CloseSectionCommand> {
  private static readonly TYPE = 'Academics.CloseSection';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: SectionService,
  ) { bus.register(CloseSectionCommandHandler.TYPE, this); }
  async handle(c: CloseSectionCommand): Promise<{ id: string }> {
    const r = await this.svc.closeSection(c.payload.sectionId, c.metadata.tenantId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Enrollment
// ─────────────────────────────────────────────

@Injectable()
export class CreateEnrollmentCommandHandler implements CommandHandler<CreateEnrollmentCommand> {
  private static readonly TYPE = 'Academics.CreateEnrollment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: EnrollmentService,
  ) { bus.register(CreateEnrollmentCommandHandler.TYPE, this); }
  async handle(c: CreateEnrollmentCommand): Promise<{ id: string }> {
    const r = await this.svc.createEnrollment(c.payload as any, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class PromoteEnrollmentCommandHandler implements CommandHandler<PromoteEnrollmentCommand> {
  private static readonly TYPE = 'Academics.PromoteEnrollment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: EnrollmentService,
  ) { bus.register(PromoteEnrollmentCommandHandler.TYPE, this); }
  async handle(c: PromoteEnrollmentCommand): Promise<{ id: string }> {
    const r = await this.svc.promoteEnrollment(c.payload.enrollmentId, c.payload.toSectionId, c.metadata.tenantId);
    return { id: r.id };
  }
}

@Injectable()
export class WithdrawEnrollmentCommandHandler implements CommandHandler<WithdrawEnrollmentCommand> {
  private static readonly TYPE = 'Academics.WithdrawEnrollment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: EnrollmentService,
  ) { bus.register(WithdrawEnrollmentCommandHandler.TYPE, this); }
  async handle(c: WithdrawEnrollmentCommand): Promise<{ id: string }> {
    const r = await this.svc.withdrawEnrollment(c.payload.enrollmentId, c.payload.reason, c.metadata.tenantId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Observation
// ─────────────────────────────────────────────

@Injectable()
export class CreateObservationCommandHandler implements CommandHandler<CreateObservationCommand> {
  private static readonly TYPE = 'Academics.CreateObservation';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ObservationService,
  ) { bus.register(CreateObservationCommandHandler.TYPE, this); }
  async handle(c: CreateObservationCommand): Promise<{ id: string }> {
    const r = await this.svc.createObservation(c.payload as any, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class ShareObservationWithParentCommandHandler implements CommandHandler<ShareObservationWithParentCommand> {
  private static readonly TYPE = 'Academics.ShareObservation';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ObservationService,
  ) { bus.register(ShareObservationWithParentCommandHandler.TYPE, this); }
  async handle(c: ShareObservationWithParentCommand): Promise<{ id: string }> {
    const r = await this.svc.shareWithParent(c.payload.observationId, c.metadata.tenantId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Assessment
// ─────────────────────────────────────────────

@Injectable()
export class CreateAssessmentCommandHandler implements CommandHandler<CreateAssessmentCommand> {
  private static readonly TYPE = 'Academics.CreateAssessment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AssessmentService,
  ) { bus.register(CreateAssessmentCommandHandler.TYPE, this); }
  async handle(c: CreateAssessmentCommand): Promise<{ id: string }> {
    const r = await this.svc.createAssessment(c.payload as any, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class StartAssessmentCommandHandler implements CommandHandler<StartAssessmentCommand> {
  private static readonly TYPE = 'Academics.StartAssessment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AssessmentService,
  ) { bus.register(StartAssessmentCommandHandler.TYPE, this); }
  async handle(c: StartAssessmentCommand): Promise<{ id: string }> {
    const r = await this.svc.startAssessment(c.payload.assessmentId, c.metadata.tenantId);
    return { id: r.id };
  }
}

@Injectable()
export class CompleteAssessmentCommandHandler implements CommandHandler<CompleteAssessmentCommand> {
  private static readonly TYPE = 'Academics.CompleteAssessment';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AssessmentService,
  ) { bus.register(CompleteAssessmentCommandHandler.TYPE, this); }
  async handle(c: CompleteAssessmentCommand): Promise<{ id: string }> {
    const r = await this.svc.completeAssessment(c.payload.assessmentId, c.metadata.tenantId);
    return { id: r.id };
  }
}

@Injectable()
export class RecordScoreCommandHandler implements CommandHandler<RecordScoreCommand> {
  private static readonly TYPE = 'Academics.RecordScore';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: AssessmentService,
  ) { bus.register(RecordScoreCommandHandler.TYPE, this); }
  async handle(c: RecordScoreCommand): Promise<{ id: string }> {
    const r = await this.svc.recordScore(c.payload.assessmentId, c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// ReportCard
// ─────────────────────────────────────────────

@Injectable()
export class CreateReportCardCommandHandler implements CommandHandler<CreateReportCardCommand> {
  private static readonly TYPE = 'Academics.CreateReportCard';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ReportCardService,
  ) { bus.register(CreateReportCardCommandHandler.TYPE, this); }
  async handle(c: CreateReportCardCommand): Promise<{ id: string }> {
    const r = await this.svc.createReportCard(c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class GenerateReportCardCommandHandler implements CommandHandler<GenerateReportCardCommand> {
  private static readonly TYPE = 'Academics.GenerateReportCard';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ReportCardService,
  ) { bus.register(GenerateReportCardCommandHandler.TYPE, this); }
  async handle(c: GenerateReportCardCommand): Promise<{ id: string }> {
    const r = await this.svc.generateReportCard(c.payload.reportCardId, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class PublishReportCardCommandHandler implements CommandHandler<PublishReportCardCommand> {
  private static readonly TYPE = 'Academics.PublishReportCard';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ReportCardService,
  ) { bus.register(PublishReportCardCommandHandler.TYPE, this); }
  async handle(c: PublishReportCardCommand): Promise<{ id: string }> {
    const r = await this.svc.publishReportCard(c.payload.reportCardId, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.id };
  }
}

@Injectable()
export class ShareReportCardCommandHandler implements CommandHandler<ShareReportCardCommand> {
  private static readonly TYPE = 'Academics.ShareReportCard';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: ReportCardService,
  ) { bus.register(ShareReportCardCommandHandler.TYPE, this); }
  async handle(c: ShareReportCardCommand): Promise<{ id: string }> {
    const r = await this.svc.shareReportCard(c.payload.reportCardId, c.metadata.tenantId);
    return { id: r.id };
  }
}

// ─────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────

@Injectable()
export class CreatePortfolioItemCommandHandler implements CommandHandler<CreatePortfolioItemCommand> {
  private static readonly TYPE = 'Academics.CreatePortfolioItem';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: PortfolioService,
  ) { bus.register(CreatePortfolioItemCommandHandler.TYPE, this); }
  async handle(c: CreatePortfolioItemCommand): Promise<{ id: string; itemId: string }> {
    const r = await this.svc.addPortfolioItem(c.payload.enrollmentId, c.payload, c.metadata.tenantId, c.metadata.actorId);
    return { id: r.portfolioId, itemId: r.itemId };
  }
}

@Injectable()
export class HighlightPortfolioItemCommandHandler implements CommandHandler<HighlightPortfolioItemCommand> {
  private static readonly TYPE = 'Academics.HighlightPortfolioItem';
  constructor(
    private readonly bus: CommandBus,
    private readonly svc: PortfolioService,
  ) { bus.register(HighlightPortfolioItemCommandHandler.TYPE, this); }
  async handle(c: HighlightPortfolioItemCommand): Promise<{ id: string }> {
    await this.svc.highlightItem(c.payload.portfolioId, c.payload.itemId);
    return { id: c.payload.portfolioId };
  }
}
