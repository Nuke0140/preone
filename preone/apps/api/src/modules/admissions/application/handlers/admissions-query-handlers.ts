/**
 * Admissions Query Handlers — CQRS read side (BTD §12.3).
 */
import { Injectable } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';

import {
  GetAdmissionPipelineQuery, GetAdmissionQuery, GetApplicationQuery,
  ListAdmissionsQueryQuery, ListApplicationsQueryQuery, ListWaitingListQuery,
} from '../queries/admissions.queries';
import { AdmissionsService } from '../services/admissions.service';

@Injectable()
export class GetApplicationQueryHandler implements QueryHandler<GetApplicationQuery> {
  private static readonly TYPE = 'Admissions.GetApplication';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(GetApplicationQueryHandler.TYPE, this);
  }
  async handle(q: GetApplicationQuery) {
    return this.svc.getApplication(q.payload.applicationId, q.payload.tenantId);
  }
}

@Injectable()
export class ListApplicationsQueryHandler implements QueryHandler<ListApplicationsQueryQuery> {
  private static readonly TYPE = 'Admissions.ListApplications';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(ListApplicationsQueryHandler.TYPE, this);
  }
  async handle(q: ListApplicationsQueryQuery) {
    const { tenantId, page, pageSize, ...filter } = q.payload;
    return this.svc.listApplications({ tenantId, ...filter }, page, pageSize);
  }
}

@Injectable()
export class GetAdmissionQueryHandler implements QueryHandler<GetAdmissionQuery> {
  private static readonly TYPE = 'Admissions.GetAdmission';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(GetAdmissionQueryHandler.TYPE, this);
  }
  async handle(q: GetAdmissionQuery) {
    return this.svc.getAdmission(q.payload.admissionId, q.payload.tenantId);
  }
}

@Injectable()
export class ListAdmissionsQueryHandler implements QueryHandler<ListAdmissionsQueryQuery> {
  private static readonly TYPE = 'Admissions.ListAdmissions';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(ListAdmissionsQueryHandler.TYPE, this);
  }
  async handle(q: ListAdmissionsQueryQuery) {
    const { tenantId, page, pageSize, ...filter } = q.payload;
    return this.svc.listAdmissions({ tenantId, ...filter }, page, pageSize);
  }
}

@Injectable()
export class GetPipelineQueryHandler implements QueryHandler<GetAdmissionPipelineQuery> {
  private static readonly TYPE = 'Admissions.GetPipeline';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(GetPipelineQueryHandler.TYPE, this);
  }
  async handle(q: GetAdmissionPipelineQuery) {
    return this.svc.getPipeline(q.payload.tenantId, q.payload.branchId, q.payload.academicSessionId);
  }
}

@Injectable()
export class ListWaitingListQueryHandler implements QueryHandler<ListWaitingListQuery> {
  private static readonly TYPE = 'Admissions.ListWaitingList';
  constructor(private readonly bus: QueryBus, private readonly svc: AdmissionsService) {
    bus.register(ListWaitingListQueryHandler.TYPE, this);
  }
  async handle(q: ListWaitingListQuery) {
    return this.svc.listWaitingList(
      q.payload.tenantId, q.payload.branchId,
      q.payload.programType, q.payload.academicSessionId,
    );
  }
}
