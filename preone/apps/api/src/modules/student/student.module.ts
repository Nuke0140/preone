/**
 * StudentModule — Student Lifecycle, Profiles, Guardians
 *
 * Per BTD §4.3 Module Catalog #4:
 *   "student — Student Lifecycle, Profiles, Guardians — ~55 APIs"
 *
 * Per ERD v3.0 (Student Lifecycle domain, 22 tables):
 *   - Student profile CRUD (PII: name, DOB, gender, blood group, medical info)
 *   - Guardian management (primary + secondary contacts, pickup authorization)
 *   - Classroom + section assignment
 *   - Promotion to next class
 *   - Graduation / transfer / archival
 *   - Sibling tracking + staff ward flag
 *   - Document vault (birth certificate, medical, photos)
 *   - Medical history + allergy tracking
 *
 * Aggregate: StudentAggregate + GuardianAggregate
 * Events: StudentCreated, StudentEnrolled, StudentPromoted, StudentTransferred,
 *         StudentWithdrawn, StudentGraduated, GuardianAdded, GuardianRemoved,
 *         PrimaryGuardianChanged, MedicalRecordUpdated, StudentFlagAdded,
 *         StudentProfileUpdated
 *
 * Wave 3 — Implements:
 *   - 13 endpoints (CRUD + lifecycle + guardian management)
 *   - CQRS: 8 command handlers + 4 query handlers
 *   - Domain events wired via EventBusService
 *   - Repository ports → Prisma adapters
 */
import { Module } from '@nestjs/common';

import { CommandBus, QueryBus } from '@shared/cqrs';
import { EventBusModule } from '@infra/event-bus/event-bus.module';
import { PrismaModule } from '@infra/prisma/prisma.module';

import {
  AddGuardianCommandHandler, CreateStudentCommandHandler,
  EnrollStudentCommandHandler, GraduateStudentCommandHandler,
  PromoteStudentCommandHandler, SetPrimaryGuardianCommandHandler,
  TransferStudentCommandHandler, UpdateStudentCommandHandler,
  WithdrawStudentCommandHandler,
} from './application/handlers/student-command-handlers';
import {
  GetStudentByIdQueryHandler, GetStudentsBySectionQueryHandler,
  ListStudentsQueryHandler, SearchStudentsQueryHandler,
} from './application/handlers/student-query-handlers';
import { StudentService } from './application/services/student.service';

import { StudentsController } from './controllers/students.controller';

import {
  GUARDIAN_REPOSITORY, STUDENT_REPOSITORY,
} from './domain/repositories/tokens';
import {
  PrismaGuardianRepository,
} from './infrastructure/repositories/prisma-guardian.repository';
import {
  PrismaStudentRepository,
} from './infrastructure/repositories/prisma-student.repository';

@Module({
  imports: [PrismaModule, EventBusModule],
  controllers: [StudentsController],
  providers: [
    // ─── CQRS buses ───
    CommandBus,
    QueryBus,

    // ─── Application services ───
    StudentService,

    // ─── CQRS handlers ───
    CreateStudentCommandHandler,
    UpdateStudentCommandHandler,
    EnrollStudentCommandHandler,
    PromoteStudentCommandHandler,
    TransferStudentCommandHandler,
    WithdrawStudentCommandHandler,
    GraduateStudentCommandHandler,
    AddGuardianCommandHandler,
    SetPrimaryGuardianCommandHandler,

    GetStudentByIdQueryHandler,
    ListStudentsQueryHandler,
    SearchStudentsQueryHandler,
    GetStudentsBySectionQueryHandler,

    // ─── Repository ports → concrete implementations ───
    { provide: STUDENT_REPOSITORY, useClass: PrismaStudentRepository },
    { provide: GUARDIAN_REPOSITORY, useClass: PrismaGuardianRepository },
  ],
  exports: [
    StudentService,
    CommandBus, QueryBus,
    STUDENT_REPOSITORY, GUARDIAN_REPOSITORY,
  ],
})
export class StudentModule {}
