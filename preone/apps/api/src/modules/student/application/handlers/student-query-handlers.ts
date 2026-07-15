/**
 * Student Query Handlers — CQRS read side (BTD §12.3).
 *
 * Queries bypass aggregates — use read-optimized Prisma models.
 */
import { Injectable, Logger } from '@nestjs/common';

import { QueryBus, QueryHandler } from '@shared/cqrs';

import {
  GetStudentByIdQuery, GetStudentsBySectionQuery, ListStudentsQuery,
  SearchStudentsQuery,
} from '../../application/queries/student.queries';
import { StudentService } from '../services/student.service';

@Injectable()
export class GetStudentByIdQueryHandler implements QueryHandler<GetStudentByIdQuery> {
  private static readonly TYPE = 'Student.GetStudentById';
  constructor(
    private readonly bus: QueryBus,
    private readonly students: StudentService,
  ) { bus.register(GetStudentByIdQueryHandler.TYPE, this); }
  async handle(query: GetStudentByIdQuery): Promise<unknown> {
    return this.students.getStudent(query.payload.studentId);
  }
}

@Injectable()
export class ListStudentsQueryHandler implements QueryHandler<ListStudentsQuery> {
  private static readonly TYPE = 'Student.ListStudents';
  constructor(
    private readonly bus: QueryBus,
    private readonly students: StudentService,
  ) { bus.register(ListStudentsQueryHandler.TYPE, this); }
  async handle(query: ListStudentsQuery): Promise<unknown> {
    return this.students.listStudents(query.payload as any, query.metadata.tenantId);
  }
}

@Injectable()
export class SearchStudentsQueryHandler implements QueryHandler<SearchStudentsQuery> {
  private static readonly TYPE = 'Student.SearchStudents';
  constructor(
    private readonly bus: QueryBus,
    private readonly students: StudentService,
  ) { bus.register(SearchStudentsQueryHandler.TYPE, this); }
  async handle(query: SearchStudentsQuery): Promise<unknown> {
    return this.students.listStudents(
      { search: query.payload.query, branchId: query.payload.branchId, page: 1, pageSize: query.payload.limit },
      query.metadata.tenantId,
    );
  }
}

@Injectable()
export class GetStudentsBySectionQueryHandler implements QueryHandler<GetStudentsBySectionQuery> {
  private static readonly TYPE = 'Student.GetStudentsBySection';
  constructor(
    private readonly bus: QueryBus,
    private readonly students: StudentService,
  ) { bus.register(GetStudentsBySectionQueryHandler.TYPE, this); }
  async handle(query: GetStudentsBySectionQuery): Promise<unknown> {
    return this.students.listStudents(
      { sectionId: query.payload.sectionId, status: query.payload.status as any, page: 1, pageSize: 100 },
      query.metadata.tenantId,
    );
  }
}
