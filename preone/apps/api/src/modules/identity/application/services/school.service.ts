/** SchoolService — stub for school aggregate orchestration. */
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { SCHOOL_REPOSITORY } from '../domain/repositories/tokens';
import type { SchoolRepository } from '../domain/repositories/school.repository';

@Injectable()
export class SchoolService {
  constructor(@Inject(SCHOOL_REPOSITORY) private readonly schools: SchoolRepository) {}

  // TODO: Implement:
  //   createSchool(dto, adminUserId) → SchoolAggregate.create() → save → publish events
  //   activateSchool(id)
  //   suspendSchool(id, reason)
  //   updateSchool(id, dto)
  //   getSchool(id)
  //   listSchools(filter, page, pageSize)
}
