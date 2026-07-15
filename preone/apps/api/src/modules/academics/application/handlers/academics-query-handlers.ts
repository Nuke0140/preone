/**
 * Academics Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';

import {
  GetAcademicSessionQuery, GetAssessmentQuery, GetEnrollmentQuery,
  GetPortfolioQuery, GetReportCardQuery, GetSectionQuery,
  ListAcademicSessionsQuery, ListAssessmentsQuery, ListCurriculaQuery,
  ListEnrollmentsQuery, ListObservationsQuery, ListReportCardsQuery,
  ListSectionsQuery,
} from '../../application/queries/academics.queries';
import {
  AcademicSessionService, AssessmentService, CurriculumService,
  EnrollmentService, ObservationService, PortfolioService,
  ReportCardService, SectionService,
} from '../services/academics.service';

@Injectable()
export class ListAcademicSessionsQueryHandler implements QueryHandler<ListAcademicSessionsQuery> {
  private static readonly TYPE = 'Academics.ListAcademicSessions';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: AcademicSessionService,
  ) { bus.register(ListAcademicSessionsQueryHandler.TYPE, this); }
  async handle(q: ListAcademicSessionsQuery): Promise<unknown> {
    return this.svc.listSessions(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload.status);
  }
}

@Injectable()
export class GetAcademicSessionQueryHandler implements QueryHandler<GetAcademicSessionQuery> {
  private static readonly TYPE = 'Academics.GetAcademicSession';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: AcademicSessionService,
  ) { bus.register(GetAcademicSessionQueryHandler.TYPE, this); }
  async handle(q: GetAcademicSessionQuery): Promise<unknown> {
    return this.svc.getSession(q.payload.sessionId);
  }
}

@Injectable()
export class ListSectionsQueryHandler implements QueryHandler<ListSectionsQuery> {
  private static readonly TYPE = 'Academics.ListSections';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: SectionService,
  ) { bus.register(ListSectionsQueryHandler.TYPE, this); }
  async handle(q: ListSectionsQuery): Promise<unknown> {
    return this.svc.listSections(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class GetSectionQueryHandler implements QueryHandler<GetSectionQuery> {
  private static readonly TYPE = 'Academics.GetSection';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: SectionService,
  ) { bus.register(GetSectionQueryHandler.TYPE, this); }
  async handle(q: GetSectionQuery): Promise<unknown> {
    return this.svc.getSection(q.payload.sectionId);
  }
}

@Injectable()
export class ListEnrollmentsQueryHandler implements QueryHandler<ListEnrollmentsQuery> {
  private static readonly TYPE = 'Academics.ListEnrollments';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: EnrollmentService,
  ) { bus.register(ListEnrollmentsQueryHandler.TYPE, this); }
  async handle(q: ListEnrollmentsQuery): Promise<unknown> {
    return this.svc.listEnrollments(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class GetEnrollmentQueryHandler implements QueryHandler<GetEnrollmentQuery> {
  private static readonly TYPE = 'Academics.GetEnrollment';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: EnrollmentService,
  ) { bus.register(GetEnrollmentQueryHandler.TYPE, this); }
  async handle(q: GetEnrollmentQuery): Promise<unknown> {
    return this.svc.getEnrollment(q.payload.enrollmentId);
  }
}

@Injectable()
export class ListCurriculaQueryHandler implements QueryHandler<ListCurriculaQuery> {
  private static readonly TYPE = 'Academics.ListCurricula';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: CurriculumService,
  ) { bus.register(ListCurriculaQueryHandler.TYPE, this); }
  async handle(q: ListCurriculaQuery): Promise<unknown> {
    return this.svc.listCurricula(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class ListObservationsQueryHandler implements QueryHandler<ListObservationsQuery> {
  private static readonly TYPE = 'Academics.ListObservations';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: ObservationService,
  ) { bus.register(ListObservationsQueryHandler.TYPE, this); }
  async handle(q: ListObservationsQuery): Promise<unknown> {
    return this.svc.listObservations(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class ListAssessmentsQueryHandler implements QueryHandler<ListAssessmentsQuery> {
  private static readonly TYPE = 'Academics.ListAssessments';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: AssessmentService,
  ) { bus.register(ListAssessmentsQueryHandler.TYPE, this); }
  async handle(q: ListAssessmentsQuery): Promise<unknown> {
    return this.svc.listAssessments(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class GetAssessmentQueryHandler implements QueryHandler<GetAssessmentQuery> {
  private static readonly TYPE = 'Academics.GetAssessment';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: AssessmentService,
  ) { bus.register(GetAssessmentQueryHandler.TYPE, this); }
  async handle(q: GetAssessmentQuery): Promise<unknown> {
    return this.svc.getAssessment(q.payload.assessmentId);
  }
}

@Injectable()
export class GetReportCardQueryHandler implements QueryHandler<GetReportCardQuery> {
  private static readonly TYPE = 'Academics.GetReportCard';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: ReportCardService,
  ) { bus.register(GetReportCardQueryHandler.TYPE, this); }
  async handle(q: GetReportCardQuery): Promise<unknown> {
    return this.svc.getReportCard(q.payload.reportCardId);
  }
}

@Injectable()
export class ListReportCardsQueryHandler implements QueryHandler<ListReportCardsQuery> {
  private static readonly TYPE = 'Academics.ListReportCards';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: ReportCardService,
  ) { bus.register(ListReportCardsQueryHandler.TYPE, this); }
  async handle(q: ListReportCardsQuery): Promise<unknown> {
    return this.svc.listReportCards(q.metadata.tenantId, q.payload.page, q.payload.pageSize, q.payload);
  }
}

@Injectable()
export class GetPortfolioQueryHandler implements QueryHandler<GetPortfolioQuery> {
  private static readonly TYPE = 'Academics.GetPortfolio';
  constructor(
    private readonly bus: QueryBus,
    private readonly svc: PortfolioService,
  ) { bus.register(GetPortfolioQueryHandler.TYPE, this); }
  async handle(q: GetPortfolioQuery): Promise<unknown> {
    return this.svc.getPortfolio(q.payload.enrollmentId);
  }
}
