/**
 * PrismaStudentRepository — concrete implementation backed by Prisma.
 *
 * Per BTD §6.1 — Port/Adapter pattern:
 *   - Implements StudentRepository (port) from domain layer
 *   - Maps Prisma rows ↔ StudentAggregate
 *   - Never exposes Prisma types to domain layer
 *
 * Per BTD §20.3 — PII Encryption:
 *   - aadhaarNumber, birthCertificateNumber are encrypted via pgcrypto
 *   - On write: pgp_sym_encrypt(plaintext, key)
 *   - On read: pgp_sym_decrypt(ciphertext, key) — handled at SQL level
 *   - For v1, we store plaintext in the column and rely on RLS for protection.
 *     Encryption will be enabled in Wave 9 (Production Hardening).
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/prisma/prisma.service';

import {
  StudentAggregate, type StudentProps, type StudentStatus, type Gender,
  type BloodGroup, type GuardianLinkProps, type MedicalAlert,
} from '../../domain/aggregates/student.aggregate';

import type { StudentListFilter, StudentRepository } from '../../domain/repositories/student.repository';

@Injectable()
export class PrismaStudentRepository implements StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StudentAggregate | undefined> {
    const row = await this.prisma.student.findUnique({
      where: { id },
      include: { guardianLinks: true },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<StudentAggregate | undefined> {
    const row = await this.prisma.student.findFirst({
      where: { schoolId: tenantId, admissionNumber },
      include: { guardianLinks: true },
    });
    return row ? this.toDomain(row) : undefined;
  }

  async findBySectionId(sectionId: string): Promise<StudentAggregate[]> {
    const rows = await this.prisma.student.findMany({
      where: { currentSectionId: sectionId, deletedAt: null },
      include: { guardianLinks: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findByGuardianId(guardianId: string): Promise<StudentAggregate[]> {
    const rows = await this.prisma.student.findMany({
      where: { guardianLinks: { some: { guardianId } }, deletedAt: null },
      include: { guardianLinks: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async list(filter: StudentListFilter, page: number, pageSize: number): Promise<{
    items: StudentAggregate[];
    total: number;
  }> {
    const where: Prisma.StudentWhereInput = {
      schoolId: filter.tenantId,
      deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.gradeLevel ? { currentGradeLevel: filter.gradeLevel } : {}),
      ...(filter.sectionId ? { currentSectionId: filter.sectionId } : {}),
      ...(filter.search
        ? {
            OR: [
              { admissionNumber: { contains: filter.search, mode: 'insensitive' } },
              { legalFirstName: { contains: filter.search, mode: 'insensitive' } },
              { legalLastName: { contains: filter.search, mode: 'insensitive' } },
              { preferredName: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { guardianLinks: true },
      }),
      this.prisma.student.count({ where }),
    ]);
    return { items: rows.map((r) => this.toDomain(r)), total };
  }

  async countActiveByBranch(branchId: string): Promise<number> {
    return this.prisma.student.count({
      where: { branchId, status: 'ACTIVE', deletedAt: null },
    });
  }

  async findByIds(ids: readonly string[]): Promise<StudentAggregate[]> {
    const rows = await this.prisma.student.findMany({
      where: { id: { in: [...ids] } },
      include: { guardianLinks: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async exists(id: string): Promise<boolean> {
    const c = await this.prisma.student.count({ where: { id } });
    return c > 0;
  }

  async existsByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<boolean> {
    const c = await this.prisma.student.count({
      where: { schoolId: tenantId, admissionNumber },
    });
    return c > 0;
  }

  async save(aggregate: StudentAggregate): Promise<void> {
    const data = this.toPersistence(aggregate);
    await this.prisma.student.upsert({
      where: { id: aggregate.id },
      create: data,
      update: data,
    });

    // Sync guardian links (replace strategy)
    await this.prisma.studentGuardian.deleteMany({ where: { studentId: aggregate.id } });
    if (aggregate.guardianLinks.length > 0) {
      await this.prisma.studentGuardian.createMany({
        data: aggregate.guardianLinks.map((link) => ({
          id: link.guardianId + '-' + aggregate.id, // deterministic ID
          studentId: aggregate.id,
          guardianId: link.guardianId,
          relation: link.relation,
          isPrimary: link.isPrimary,
          isPickupAuthorized: link.isPickupAuthorized,
          isEmergencyContact: link.isEmergencyContact,
          custodyHolder: link.custodyHolder,
          notes: link.notes ?? null,
        })),
      });
    }
  }

  async delete(aggregate: StudentAggregate): Promise<void> {
    await this.prisma.student.update({
      where: { id: aggregate.id },
      data: { deletedAt: new Date() },
    });
  }

  // ─────── Mappers ───────

  private toDomain(row: Prisma.StudentGetPayload<{ include: { guardianLinks: true } }>): StudentAggregate {
    const props: StudentProps = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      admissionNumber: row.admissionNumber,
      legalFirstName: row.legalFirstName,
      legalLastName: row.legalLastName,
      preferredName: row.preferredName ?? undefined,
      dateOfBirth: row.dateOfBirth.toISOString(),
      gender: row.gender as Gender,
      bloodGroup: row.bloodGroup as BloodGroup,
      nationality: row.nationality,
      religion: row.religion ?? undefined,
      motherTongue: row.motherTongue ?? undefined,
      aadhaarNumber: row.aadhaarNumber ?? undefined,
      birthCertificateNumber: row.birthCertificateNumber ?? undefined,
      placeOfBirth: row.placeOfBirth ?? undefined,
      photoUrl: row.photoUrl ?? undefined,
      status: row.status as StudentStatus,
      admittedAt: row.admittedAt.toISOString(),
      enrolledAt: row.enrolledAt?.toISOString(),
      exitedAt: row.exitedAt?.toISOString(),
      exitReason: row.exitReason ?? undefined,
      ageMonths: row.ageMonths,
      currentGradeLevel: row.currentGradeLevel ?? undefined,
      currentSectionId: row.currentSectionId ?? undefined,
      allergiesSummary: row.allergiesSummary ?? undefined,
      medicalAlerts: (row.medicalAlerts as unknown as MedicalAlert[]) ?? undefined,
      custodyNotes: row.custodyNotes ?? undefined,
      isPickupRestricted: row.isPickupRestricted,
      guardianLinks: row.guardianLinks.map((link): GuardianLinkProps => ({
        guardianId: link.guardianId,
        relation: link.relation as any,
        isPrimary: link.isPrimary,
        isPickupAuthorized: link.isPickupAuthorized,
        isEmergencyContact: link.isEmergencyContact,
        custodyHolder: link.custodyHolder,
        notes: link.notes ?? undefined,
      })),
      deletedAt: row.deletedAt?.toISOString(),
    };
    return new StudentAggregate(props, row.id, row.version);
  }

  private toPersistence(a: StudentAggregate): Prisma.StudentUncheckedCreateInput {
    return {
      id: a.id,
      schoolId: a.tenantId,
      branchId: a.branchId,
      admissionNumber: a.admissionNumber,
      legalFirstName: a.legalFirstName,
      legalLastName: a.legalLastName,
      preferredName: a.preferredName ?? null,
      dateOfBirth: new Date(a.dateOfBirth),
      gender: a.gender,
      bloodGroup: a.bloodGroup,
      nationality: a.nationality,
      religion: a.religion ?? null,
      motherTongue: a.motherTongue ?? null,
      aadhaarNumber: a.aadhaarNumber ?? null,
      birthCertificateNumber: a.birthCertificateNumber ?? null,
      placeOfBirth: a.placeOfBirth ?? null,
      photoUrl: a.photoUrl ?? null,
      status: a.status,
      admittedAt: new Date(a.admittedAt),
      enrolledAt: a.enrolledAt ? new Date(a.enrolledAt) : null,
      exitedAt: a.exitedAt ? new Date(a.exitedAt) : null,
      exitReason: a.exitReason ?? null,
      ageMonths: a.ageMonths,
      currentGradeLevel: a.currentGradeLevel ?? null,
      currentSectionId: a.currentSectionId ?? null,
      allergiesSummary: a.allergiesSummary ?? null,
      medicalAlerts: (a.medicalAlerts as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      custodyNotes: a.custodyNotes ?? null,
      isPickupRestricted: a.isPickupRestricted,
      version: a.version,
      deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    };
  }
}
