/**
 * StudentService — orchestrates Student lifecycle (BTD §9).
 *
 * Per BTD §9 — Application service coordinates:
 *   1. Load aggregate via repository
 *   2. Invoke method on aggregate (pure business logic)
 *   3. Save via repository
 *   4. Publish domain events
 *
 * Per ADR v1.0:
 *   - Admission numbers are unique per branch (validated in service before aggregate creation)
 *   - At least one guardian required (validated in DTO + service)
 *   - One primary guardian per student (enforced by aggregate)
 *   - PII fields (aadhaar, birthCertificateNumber) handled with care — never logged
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BusinessException, ConflictException, NotFoundException, ValidationException,
} from '@common/errors/exceptions';

import { EventBusService } from '@infra/event-bus/event-bus.service';

import {
  StudentAggregate, type StudentStatus, type Gender, type BloodGroup,
} from '../../domain/aggregates/student.aggregate';
import { GuardianAggregate } from '../../domain/aggregates/guardian.aggregate';
import {
  GUARDIAN_REPOSITORY, STUDENT_REPOSITORY,
} from '../../domain/repositories/tokens';
import type { GuardianRepository } from '../../domain/repositories/guardian.repository';
import type { StudentRepository, StudentListFilter } from '../../domain/repositories/student.repository';

import type {
  CreateStudentDto, UpdateStudentDto, EnrollStudentDto, PromoteStudentDto,
  TransferStudentDto, WithdrawStudentDto, AddGuardianDto, StudentResponseDto,
  StudentListItemDto, GuardianResponseDto, ListStudentsQueryDto,
} from '../dto/student.dto';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @Inject(STUDENT_REPOSITORY) private readonly students: StudentRepository,
    @Inject(GUARDIAN_REPOSITORY) private readonly guardians: GuardianRepository,
    private readonly eventBus: EventBusService,
  ) {}

  // ─────── Create ───────

  async createStudent(dto: CreateStudentDto, tenantId: string, createdBy: string): Promise<StudentResponseDto> {
    // Pre-checks
    const existingAdmission = await this.students.findByAdmissionNumber(tenantId, dto.admissionNumber);
    if (existingAdmission) {
      throw new ConflictException(
        'STUDENT_ADMISSION_NUMBER_TAKEN',
        `Student with admission number ${dto.admissionNumber} already exists in this tenant.`,
      );
    }

    if (!dto.guardians || dto.guardians.length === 0) {
      throw new ValidationException('At least one guardian is required', [
        { field: 'guardians', code: 'MIN_ITEMS', message: 'At least one guardian is required' },
      ]);
    }

    const primaryCount = dto.guardians.filter((g) => g.isPrimary).length;
    if (primaryCount > 1) {
      throw new ValidationException('Only one guardian can be primary', [
        { field: 'guardians', code: 'MULTIPLE_PRIMARY', message: `Found ${primaryCount} primary guardians; only 1 allowed` },
      ]);
    }

    // Create guardian aggregates first (so we can link them by ID)
    const guardianAggregates: GuardianAggregate[] = [];
    for (const gDto of dto.guardians) {
      // Dedupe by phone within same tenant — reuse if exists
      const existing = await this.guardians.findByPhone(tenantId, gDto.phone);
      if (existing) {
        guardianAggregates.push(existing);
        continue;
      }
      const g = GuardianAggregate.create({
        tenantId,
        firstName: gDto.firstName,
        lastName: gDto.lastName,
        email: gDto.email,
        phone: gDto.phone,
        altPhone: gDto.altPhone,
        occupation: gDto.occupation,
        employer: gDto.employer,
        annualIncomeCents: gDto.annualIncomeCents,
        education: gDto.education,
      });
      guardianAggregates.push(g);
    }

    // Create student aggregate
    const student = StudentAggregate.create({
      tenantId,
      branchId: dto.branchId,
      admissionNumber: dto.admissionNumber,
      legalFirstName: dto.legalFirstName,
      legalLastName: dto.legalLastName,
      preferredName: dto.preferredName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender as Gender,
      bloodGroup: (dto.bloodGroup ?? 'UNKNOWN') as BloodGroup,
      nationality: dto.nationality ?? 'Indian',
      religion: dto.religion,
      motherTongue: dto.motherTongue,
      aadhaarNumber: dto.aadhaarNumber,
      birthCertificateNumber: dto.birthCertificateNumber,
      placeOfBirth: dto.placeOfBirth,
      photoUrl: dto.photoUrl,
      custodyNotes: dto.custodyNotes,
      isPickupRestricted: dto.isPickupRestricted ?? false,
      admittedAt: new Date().toISOString(),
    }, createdBy);

    // Link guardians to student
    for (const g of guardianAggregates) {
      const gDto = dto.guardians.find((d) => d.phone === g.phone)!;
      student.addGuardian({
        guardianId: g.id,
        relation: gDto.relation as any,
        isPrimary: gDto.isPrimary ?? false,
        isPickupAuthorized: gDto.isPickupAuthorized ?? true,
        isEmergencyContact: gDto.isEmergencyContact ?? true,
        custodyHolder: gDto.custodyHolder ?? false,
      }, createdBy);
    }

    // Persist (in a real system this would be a UoW with transaction; for v1 we persist sequentially)
    for (const g of guardianAggregates) {
      // Skip if already persisted (existing guardian from findByPhone)
      if (g.version > 1) continue;
      await this.guardians.save(g);
    }
    await this.students.save(student);

    // Dispatch domain events
    await this.eventBus.publishAll(student.clearDomainEvents());
    for (const g of guardianAggregates) {
      await this.eventBus.publishAll(g.clearDomainEvents());
    }

    this.logger.log(`Student created: ${student.id} (${student.admissionNumber}) by ${createdBy}`);
    return this.toResponse(student, guardianAggregates);
  }

  // ─────── Read ───────

  async getStudent(id: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    // Load guardian aggregates
    const guardianAggregates: GuardianAggregate[] = [];
    for (const link of student.guardianLinks) {
      const g = await this.guardians.findById(link.guardianId);
      if (g) guardianAggregates.push(g);
    }
    return this.toResponse(student, guardianAggregates);
  }

  async listStudents(query: ListStudentsQueryDto, tenantId: string): Promise<{
    items: StudentListItemDto[];
    total: number;
    page: number;
    pageSize: number;
    hasNext: boolean;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const filter: StudentListFilter = {
      tenantId,
      branchId: query.branchId,
      status: query.status as StudentStatus | undefined,
      gradeLevel: query.gradeLevel,
      sectionId: query.sectionId,
      search: query.search,
    };
    const result = await this.students.list(filter, page, pageSize);
    const items = await Promise.all(result.items.map((s) => this.toListItem(s)));
    return {
      items,
      total: result.total,
      page,
      pageSize,
      hasNext: page * pageSize < result.total,
    };
  }

  // ─────── Update ───────

  async updateStudent(id: string, dto: UpdateStudentDto, tenantId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.updateProfile({
      preferredName: dto.preferredName,
      photoUrl: dto.photoUrl,
      religion: dto.religion,
      motherTongue: dto.motherTongue,
      nationality: dto.nationality,
      custodyNotes: dto.custodyNotes,
    });
    if (dto.isPickupRestricted !== undefined) {
      student.setPickupRestricted(dto.isPickupRestricted);
    }
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());

    return this.getStudent(id);
  }

  // ─────── Lifecycle ───────

  async enrollStudent(id: string, dto: EnrollStudentDto, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.enroll(dto.sectionId, dto.gradeLevel, dto.enrolledAt ?? new Date().toISOString());
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    this.logger.log(`Student enrolled: ${id} → section ${dto.sectionId}`);
    return this.getStudent(id);
  }

  async promoteStudent(id: string, dto: PromoteStudentDto, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.promote(dto.toSectionId, dto.toGradeLevel, new Date().toISOString());
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(id);
  }

  async transferStudent(id: string, dto: TransferStudentDto, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.transfer(dto.toBranchId, dto.reason, new Date().toISOString(), dto.toSchoolId);
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(id);
  }

  async withdrawStudent(id: string, dto: WithdrawStudentDto, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.withdraw(dto.reason, new Date().toISOString());
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(id);
  }

  async graduateStudent(id: string, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.graduate(new Date().toISOString());
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(id);
  }

  async reactivateStudent(id: string, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(id);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', id);
    }
    student.reactivate(new Date().toISOString());
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(id);
  }

  // ─────── Guardian management ───────

  async addGuardian(studentId: string, dto: AddGuardianDto, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(studentId);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', studentId);
    }
    // Find or create guardian
    let guardian = await this.guardians.findByPhone(tenantId, dto.phone);
    if (!guardian) {
      guardian = GuardianAggregate.create({
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        altPhone: dto.altPhone,
        occupation: dto.occupation,
        employer: dto.employer,
        annualIncomeCents: dto.annualIncomeCents,
        education: dto.education,
      });
      await this.guardians.save(guardian);
    }
    student.addGuardian({
      guardianId: guardian.id,
      relation: dto.relation as any,
      isPrimary: dto.isPrimary ?? false,
      isPickupAuthorized: dto.isPickupAuthorized ?? true,
      isEmergencyContact: dto.isEmergencyContact ?? true,
      custodyHolder: dto.custodyHolder ?? false,
    }, actorId);
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(studentId);
  }

  async removeGuardian(studentId: string, guardianId: string, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(studentId);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', studentId);
    }
    student.removeGuardian(guardianId, actorId);
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(studentId);
  }

  async setPrimaryGuardian(studentId: string, guardianId: string, tenantId: string, actorId: string): Promise<StudentResponseDto> {
    const student = await this.students.findById(studentId);
    if (!student || student.deletedAt) {
      throw new NotFoundException('Student', studentId);
    }
    student.setPrimaryGuardian(guardianId);
    await this.students.save(student);
    await this.eventBus.publishAll(student.clearDomainEvents());
    return this.getStudent(studentId);
  }

  // ─────── Mappers ───────

  private async toListItem(s: StudentAggregate): Promise<StudentListItemDto> {
    const primaryLink = s.guardianLinks.find((g) => g.isPrimary) ?? s.guardianLinks[0];
    let primaryName = '';
    let primaryPhone = '';
    if (primaryLink) {
      const g = await this.guardians.findById(primaryLink.guardianId);
      primaryName = g?.fullName ?? '';
      primaryPhone = g?.phone ?? '';
    }
    return {
      id: s.id,
      admissionNumber: s.admissionNumber,
      displayName: s.displayName,
      legalFirstName: s.legalFirstName,
      legalLastName: s.legalLastName,
      dateOfBirth: s.dateOfBirth,
      ageMonths: s.ageMonths,
      gender: s.gender as any,
      status: s.status as any,
      currentGradeLevel: s.currentGradeLevel,
      currentSectionId: s.currentSectionId,
      primaryGuardianName: primaryName,
      primaryGuardianPhone: primaryPhone,
    };
  }

  private toResponse(s: StudentAggregate, guardianAggregates: GuardianAggregate[]): StudentResponseDto {
    const guardianMap = new Map(guardianAggregates.map((g) => [g.id, g]));
    return {
      id: s.id,
      tenantId: s.tenantId,
      branchId: s.branchId,
      admissionNumber: s.admissionNumber,
      legalFirstName: s.legalFirstName,
      legalLastName: s.legalLastName,
      preferredName: s.preferredName,
      displayName: s.displayName,
      dateOfBirth: s.dateOfBirth,
      ageMonths: s.ageMonths,
      gender: s.gender as any,
      bloodGroup: s.bloodGroup as any,
      nationality: s.nationality,
      religion: s.religion,
      motherTongue: s.motherTongue,
      photoUrl: s.photoUrl,
      status: s.status as any,
      admittedAt: s.admittedAt,
      enrolledAt: s.enrolledAt,
      exitedAt: s.exitedAt,
      exitReason: s.exitReason,
      currentGradeLevel: s.currentGradeLevel,
      currentSectionId: s.currentSectionId,
      allergiesSummary: s.allergiesSummary,
      medicalAlerts: s.medicalAlerts,
      custodyNotes: s.custodyNotes,
      isPickupRestricted: s.isPickupRestricted,
      guardians: s.guardianLinks.map((link) => {
        const g = guardianMap.get(link.guardianId);
        return {
          id: link.guardianId,
          firstName: g?.firstName ?? '',
          lastName: g?.lastName ?? '',
          email: g?.email,
          phone: g?.phone ?? '',
          altPhone: g?.altPhone,
          occupation: g?.occupation,
          employer: g?.employer,
          annualIncomeCents: g?.annualIncomeCents,
          education: g?.education,
          relation: link.relation as any,
          isPrimary: link.isPrimary,
          isPickupAuthorized: link.isPickupAuthorized,
          isEmergencyContact: link.isEmergencyContact,
          custodyHolder: link.custodyHolder,
          userId: g?.userId,
        } satisfies GuardianResponseDto;
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
