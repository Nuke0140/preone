/**
 * PrismaAdmissionsRepository — Prisma implementations for Application,
 * Admission, and WaitingList aggregates.
 *
 * Per BTD §6.1 — Adapter implementations live in infrastructure layer.
 */
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import {
  AdmissionAggregate, AdmissionProps,
} from '../../domain/aggregates/admission.aggregate';
import {
  AdmissionPriorityEntity, AdmissionOfferEntity, ApplicationAggregate,
  ApplicationDocumentEntity, ApplicationProps, ApplicationStatus,
  ApprovalEntity, CounsellingSessionEntity, ProgramType,
} from '../../domain/aggregates/application.aggregate';
import {
  WaitingListAggregate, WaitingListProps,
} from '../../domain/aggregates/waiting-list.aggregate';

import type {
  AdmissionListFilter, AdmissionRepository,
  ApplicationListFilter, ApplicationRepository,
  WaitingListListFilter, WaitingListRepository,
} from '../../domain/repositories/admissions.repository';

// ─────────────────────────────────────────────
// Mappers (Prisma row ↔ Aggregate props)
// ─────────────────────────────────────────────

function mapApplicationRow(row: any): ApplicationAggregate {
  const documents = new Map<string, ApplicationDocumentEntity>();
  for (const d of row.documents ?? []) {
    documents.set(d.id, new ApplicationDocumentEntity({
      id: d.id,
      documentType: d.documentType,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileKey: d.fileKey ?? undefined,
      fileSizeBytes: d.fileSizeBytes,
      mimeType: d.mimeType,
      status: d.status,
      verifiedBy: d.verifiedBy ?? undefined,
      verifiedAt: d.verifiedAt?.toISOString(),
      rejectionReason: d.rejectionReason ?? undefined,
      uploadedAt: d.createdAt.toISOString(),
    }, d.id, 1));
  }

  const counselling = new Map<string, CounsellingSessionEntity>();
  for (const c of row.counsellingSessions ?? []) {
    counselling.set(c.id, new CounsellingSessionEntity({
      id: c.id,
      counsellorId: c.counsellorId,
      scheduledAt: c.scheduledAt.toISOString(),
      durationMinutes: c.durationMinutes,
      mode: c.mode,
      status: c.status,
      childPresent: c.childPresent,
      notes: c.notes ?? undefined,
      recommendation: c.recommendation ?? undefined,
      completedAt: c.completedAt?.toISOString(),
    }, c.id, 1));
  }

  const approvals = new Map<string, ApprovalEntity>();
  for (const a of row.approvals ?? []) {
    approvals.set(a.id, new ApprovalEntity({
      id: a.id,
      approverId: a.approverId,
      approvalLevel: a.approvalLevel,
      decision: a.decision,
      decisionReason: a.decisionReason ?? undefined,
      decidedAt: a.decidedAt.toISOString(),
      feeWaiverApprovedCents: a.feeWaiverApprovedCents ?? undefined,
    }, a.id, 1));
  }

  const offers = new Map<string, AdmissionOfferEntity>();
  for (const o of row.admissionOffers ?? []) {
    offers.set(o.id, new AdmissionOfferEntity({
      id: o.id,
      offerNumber: o.offerNumber,
      offeredProgram: o.offeredProgram,
      feeQuoteCents: o.feeQuoteCents,
      securityDepositCents: o.securityDepositCents,
      offerLetterUrl: o.offerLetterUrl,
      issuedAt: o.issuedAt.toISOString(),
      expiresAt: o.expiresAt.toISOString(),
      acceptedAt: o.acceptedAt?.toISOString(),
      declinedAt: o.declinedAt?.toISOString(),
    }, o.id, 1));
  }

  const priorities = new Map<string, AdmissionPriorityEntity>();
  for (const p of row.priorityFactors ?? []) {
    priorities.set(p.id, new AdmissionPriorityEntity({
      id: p.id,
      factor: p.factor,
      weight: p.weight,
      evidenceUrl: p.evidenceUrl ?? undefined,
      verified: p.verified,
    }, p.id, 1));
  }

  const props: ApplicationProps = {
    tenantId: row.schoolId,
    branchId: row.branchId,
    academicSessionId: row.academicSessionId,
    applicationNumber: row.applicationNumber,
    leadId: row.leadId ?? undefined,
    enquiryId: row.enquiryId ?? undefined,
    programType: row.programType,
    admissionType: row.admissionType,
    childFirstName: row.childFirstName,
    childLastName: row.childLastName,
    childDob: row.childDob.toISOString().split('T')[0],
    childGender: row.childGender,
    childBloodGroup: row.childBloodGroup ?? undefined,
    preferredStartDate: row.preferredStartDate.toISOString().split('T')[0],
    status: row.status,
    submittedAt: row.submittedAt?.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString(),
    approvedAt: row.approvedAt?.toISOString(),
    rejectedAt: row.rejectedAt?.toISOString(),
    rejectionReason: row.rejectionReason ?? undefined,
    rejectionNotes: row.rejectionNotes ?? undefined,
    parentDeclarations: row.parentDeclarations as Record<string, unknown>,
    metadata: row.metadata as Record<string, unknown>,
    documents,
    counsellingSessions: counselling,
    approvals,
    offers,
    priorityFactors: priorities,
    createdBy: row.createdBy ?? 'system',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString(),
  };

  return new ApplicationAggregate(props, row.id, row.version ?? 1);
}

function mapAdmissionRow(row: any): AdmissionAggregate {
  const props: AdmissionProps = {
    tenantId: row.schoolId,
    applicationId: row.applicationId,
    admissionNumber: row.admissionNumber,
    studentId: row.studentId ?? undefined,
    classroomId: row.classroomId ?? undefined,
    feePlanId: row.feePlanId ?? undefined,
    admissionDate: row.admissionDate.toISOString().split('T')[0],
    admissionType: row.admissionType,
    status: row.status,
    cancelledAt: row.cancelledAt?.toISOString(),
    cancellationReason: row.cancellationReason ?? undefined,
    refundDueCents: row.refundDueCents ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return new AdmissionAggregate(props, row.id, row.version ?? 1);
}

function mapWaitingListRow(row: any): WaitingListAggregate {
  const props: WaitingListProps = {
    tenantId: row.schoolId,
    applicationId: row.applicationId,
    branchId: row.branchId,
    programType: row.programType,
    academicSessionId: row.academicSessionId,
    position: row.position,
    priorityScore: row.priorityScore,
    state: row.response ? 'ACCEPTED' : (row.offeredAt ? 'SEAT_OFFERED' : 'WAITING'),
    offeredAt: row.offeredAt?.toISOString(),
    offerExpiresAt: row.offerExpiresAt?.toISOString(),
    respondedAt: row.respondedAt?.toISOString(),
    response: row.response ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  return new WaitingListAggregate(props, row.id, row.version ?? 1);
}

// ─────────────────────────────────────────────
// ApplicationRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ApplicationAggregate | undefined> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: {
        documents: true, counsellingSessions: true, approvals: true,
        admissionOffers: true, priorityFactors: true,
      },
    });
    if (!row || row.deletedAt) return undefined;
    return mapApplicationRow(row);
  }

  async findByApplicationNumber(tenantId: string, applicationNumber: string): Promise<ApplicationAggregate | undefined> {
    const row = await this.prisma.application.findFirst({
      where: { schoolId: tenantId, applicationNumber },
    });
    if (!row || row.deletedAt) return undefined;
    return mapApplicationRow(row);
  }

  async list(filter: ApplicationListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      deletedAt: null,
      ...(filter.branchId ? { branchId: filter.branchId } : {}),
      ...(filter.academicSessionId ? { academicSessionId: filter.academicSessionId } : {}),
      ...(filter.programType ? { programType: filter.programType } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search ? {
        OR: [
          { applicationNumber: { contains: filter.search, mode: 'insensitive' as const } },
          { childFirstName: { contains: filter.search, mode: 'insensitive' as const } },
          { childLastName: { contains: filter.search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.application.findMany({
        where, skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { documents: true, counsellingSessions: true, approvals: true, admissionOffers: true, priorityFactors: true },
      }),
      this.prisma.application.count({ where }),
    ]);
    return { items: rows.map(mapApplicationRow), total };
  }

  async save(agg: ApplicationAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      applicationNumber: p.applicationNumber,
      leadId: p.leadId,
      enquiryId: p.enquiryId,
      branchId: p.branchId,
      academicSessionId: p.academicSessionId,
      programType: p.programType,
      admissionType: p.admissionType,
      childFirstName: p.childFirstName,
      childLastName: p.childLastName,
      childDob: new Date(p.childDob),
      childGender: p.childGender,
      childBloodGroup: p.childBloodGroup as any,
      preferredStartDate: new Date(p.preferredStartDate),
      status: p.status,
      submittedAt: p.submittedAt ? new Date(p.submittedAt) : null,
      verifiedAt: p.verifiedAt ? new Date(p.verifiedAt) : null,
      approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
      rejectedAt: p.rejectedAt ? new Date(p.rejectedAt) : null,
      rejectionReason: p.rejectionReason,
      rejectionNotes: p.rejectionNotes,
      parentDeclarations: p.parentDeclarations as any,
      metadata: p.metadata as any,
      createdBy: p.createdBy,
      updatedAt: new Date(),
    };

    const exists = await this.prisma.application.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.application.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.application.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }

    // Persist child entities (delete + recreate for simplicity; production would diff)
    await this._syncChildren(agg);
  }

  private async _syncChildren(agg: ApplicationAggregate): Promise<void> {
    const p = agg._props;

    // Documents
    await this.prisma.applicationDocument.deleteMany({ where: { applicationId: agg.id } });
    for (const d of p.documents.values()) {
      const dp = d._props;
      await this.prisma.applicationDocument.create({
        data: {
          id: d.id, schoolId: p.tenantId, applicationId: agg.id,
          documentType: dp.documentType as any, fileName: dp.fileName,
          fileUrl: dp.fileUrl, fileKey: dp.fileKey ?? null,
          fileSizeBytes: dp.fileSizeBytes, mimeType: dp.mimeType,
          status: dp.status as any, verifiedBy: dp.verifiedBy ?? null,
          verifiedAt: dp.verifiedAt ? new Date(dp.verifiedAt) : null,
          rejectionReason: dp.rejectionReason ?? null,
        },
      });
    }

    // Counselling
    await this.prisma.counsellingSession.deleteMany({ where: { applicationId: agg.id } });
    for (const c of p.counsellingSessions.values()) {
      const cp = c._props;
      await this.prisma.counsellingSession.create({
        data: {
          id: c.id, schoolId: p.tenantId, applicationId: agg.id,
          counsellorId: cp.counsellorId, scheduledAt: new Date(cp.scheduledAt),
          durationMinutes: cp.durationMinutes, mode: cp.mode, status: cp.status,
          childPresent: cp.childPresent, notes: cp.notes ?? null,
          recommendation: cp.recommendation ?? null,
          completedAt: cp.completedAt ? new Date(cp.completedAt) : null,
        },
      });
    }

    // Approvals
    await this.prisma.approval.deleteMany({ where: { applicationId: agg.id } });
    for (const a of p.approvals.values()) {
      const ap = a._props;
      await this.prisma.approval.create({
        data: {
          id: a.id, schoolId: p.tenantId, applicationId: agg.id,
          approverId: ap.approverId, approvalLevel: ap.approvalLevel,
          decision: ap.decision, decisionReason: ap.decisionReason ?? null,
          decidedAt: new Date(ap.decidedAt),
          feeWaiverApprovedCents: ap.feeWaiverApprovedCents ?? null,
          conditions: ap.conditions as any ?? null,
        },
      });
    }

    // Offers
    await this.prisma.admissionOffer.deleteMany({ where: { applicationId: agg.id } });
    for (const o of p.offers.values()) {
      const op = o._props;
      await this.prisma.admissionOffer.create({
        data: {
          id: o.id, schoolId: p.tenantId, applicationId: agg.id,
          offerNumber: op.offerNumber, offeredProgram: op.offeredProgram,
          feeQuoteCents: op.feeQuoteCents, securityDepositCents: op.securityDepositCents,
          offerLetterUrl: op.offerLetterUrl, issuedAt: new Date(op.issuedAt),
          expiresAt: new Date(op.expiresAt),
          acceptedAt: op.acceptedAt ? new Date(op.acceptedAt) : null,
          declinedAt: op.declinedAt ? new Date(op.declinedAt) : null,
        },
      });
    }

    // Priorities
    await this.prisma.admissionPriority.deleteMany({ where: { applicationId: agg.id } });
    for (const pf of p.priorityFactors.values()) {
      const pp = pf._props;
      await this.prisma.admissionPriority.create({
        data: {
          id: pf.id, schoolId: p.tenantId, applicationId: agg.id,
          factor: pp.factor, weight: pp.weight,
          evidenceUrl: pp.evidenceUrl ?? null, verified: pp.verified,
        },
      });
    }
  }

  async delete(agg: ApplicationAggregate): Promise<void> {
    await this.prisma.application.update({
      where: { id: agg.id },
      data: { deletedAt: new Date() },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.application.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<ApplicationAggregate[]> {
    const rows = await this.prisma.application.findMany({
      where: { id: { in: [...ids] } },
      include: { documents: true, counsellingSessions: true, approvals: true, admissionOffers: true, priorityFactors: true },
    });
    return rows.map(mapApplicationRow);
  }

  async countByStatus(tenantId: string, branchId: string, academicSessionId: string): Promise<Record<ApplicationStatus, number>> {
    const rows = await this.prisma.application.groupBy({
      by: ['status'],
      where: { schoolId: tenantId, branchId, academicSessionId, deletedAt: null },
      _count: true,
    });
    const result: Record<string, number> = {};
    for (const r of rows) result[r.status] = r._count;
    return result;
  }
}

// ─────────────────────────────────────────────
// AdmissionRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaAdmissionRepository implements AdmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AdmissionAggregate | undefined> {
    const row = await this.prisma.admission.findUnique({ where: { id } });
    if (!row) return undefined;
    return mapAdmissionRow(row);
  }

  async findByAdmissionNumber(tenantId: string, admissionNumber: string): Promise<AdmissionAggregate | undefined> {
    const row = await this.prisma.admission.findFirst({
      where: { schoolId: tenantId, admissionNumber },
    });
    if (!row) return undefined;
    return mapAdmissionRow(row);
  }

  async findByApplicationId(applicationId: string): Promise<AdmissionAggregate | undefined> {
    const row = await this.prisma.admission.findUnique({ where: { applicationId } });
    if (!row) return undefined;
    return mapAdmissionRow(row);
  }

  async findByStudentId(studentId: string): Promise<AdmissionAggregate | undefined> {
    const row = await this.prisma.admission.findFirst({ where: { studentId } });
    if (!row) return undefined;
    return mapAdmissionRow(row);
  }

  async list(filter: AdmissionListFilter, page: number, pageSize: number) {
    const where = {
      schoolId: filter.tenantId,
      ...(filter.applicationId ? { applicationId: filter.applicationId } : {}),
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    // branchId filter requires a join
    const branchFilter = filter.branchId
      ? { application: { branchId: filter.branchId } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.admission.findMany({
        where: { ...where, ...branchFilter },
        skip: (page - 1) * pageSize, take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.admission.count({ where: { ...where, ...branchFilter } }),
    ]);
    return { items: rows.map(mapAdmissionRow), total };
  }

  async save(agg: AdmissionAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      admissionNumber: p.admissionNumber,
      applicationId: p.applicationId,
      studentId: p.studentId ?? null,
      classroomId: p.classroomId ?? null,
      feePlanId: p.feePlanId ?? null,
      admissionDate: new Date(p.admissionDate),
      admissionType: p.admissionType,
      status: p.status,
      cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
      cancellationReason: p.cancellationReason ?? null,
      refundDueCents: p.refundDueCents ?? null,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.admission.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.admission.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.admission.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }
  }

  async delete(agg: AdmissionAggregate): Promise<void> {
    await this.prisma.admission.delete({ where: { id: agg.id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.admission.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<AdmissionAggregate[]> {
    const rows = await this.prisma.admission.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(mapAdmissionRow);
  }

  async nextAdmissionNumber(tenantId: string, year: number): Promise<string> {
    const count = await this.prisma.admission.count({
      where: { schoolId: tenantId, admissionNumber: { startsWith: `ADM-${year}-` } },
    });
    return `ADM-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}

// ─────────────────────────────────────────────
// WaitingListRepository
// ─────────────────────────────────────────────

@Injectable()
export class PrismaWaitingListRepository implements WaitingListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<WaitingListAggregate | undefined> {
    const row = await this.prisma.waitingList.findUnique({ where: { id } });
    if (!row) return undefined;
    return mapWaitingListRow(row);
  }

  async findByApplicationId(applicationId: string): Promise<WaitingListAggregate | undefined> {
    const row = await this.prisma.waitingList.findUnique({ where: { applicationId } });
    if (!row) return undefined;
    return mapWaitingListRow(row);
  }

  async list(filter: WaitingListListFilter): Promise<WaitingListAggregate[]> {
    const rows = await this.prisma.waitingList.findMany({
      where: {
        schoolId: filter.tenantId,
        branchId: filter.branchId,
        programType: filter.programType,
        academicSessionId: filter.academicSessionId,
        ...(filter.state === 'WAITING' ? { offeredAt: null, response: null } : {}),
        ...(filter.state === 'SEAT_OFFERED' ? { offeredAt: { not: null }, response: null } : {}),
        ...(filter.state === 'ACCEPTED' ? { response: 'ACCEPTED' } : {}),
      },
      orderBy: { position: 'asc' },
    });
    return rows.map(mapWaitingListRow);
  }

  async findNextInLine(tenantId: string, branchId: string, programType: ProgramType, academicSessionId: string): Promise<WaitingListAggregate | undefined> {
    const row = await this.prisma.waitingList.findFirst({
      where: {
        schoolId: tenantId, branchId, programType, academicSessionId,
        offeredAt: null, response: null,
      },
      orderBy: { position: 'asc' },
    });
    if (!row) return undefined;
    return mapWaitingListRow(row);
  }

  async countAhead(tenantId: string, branchId: string, programType: ProgramType, academicSessionId: string, position: number): Promise<number> {
    return this.prisma.waitingList.count({
      where: {
        schoolId: tenantId, branchId, programType, academicSessionId,
        position: { lt: position }, offeredAt: null, response: null,
      },
    });
  }

  async save(agg: WaitingListAggregate): Promise<void> {
    const p = agg._props;
    const data = {
      schoolId: p.tenantId,
      applicationId: p.applicationId,
      branchId: p.branchId,
      programType: p.programType,
      academicSessionId: p.academicSessionId,
      position: p.position,
      priorityScore: p.priorityScore,
      offeredAt: p.offeredAt ? new Date(p.offeredAt) : null,
      offerExpiresAt: p.offerExpiresAt ? new Date(p.offerExpiresAt) : null,
      respondedAt: p.respondedAt ? new Date(p.respondedAt) : null,
      response: p.response,
      updatedAt: new Date(),
    };
    const exists = await this.prisma.waitingList.findUnique({ where: { id: agg.id } });
    if (exists) {
      await this.prisma.waitingList.update({ where: { id: agg.id }, data });
    } else {
      await this.prisma.waitingList.create({ data: { id: agg.id, ...data, createdAt: new Date(p.createdAt) } });
    }
  }

  async saveMany(aggregates: WaitingListAggregate[]): Promise<void> {
    for (const agg of aggregates) await this.save(agg);
  }

  async delete(agg: WaitingListAggregate): Promise<void> {
    await this.prisma.waitingList.delete({ where: { id: agg.id } });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.waitingList.count({ where: { id } });
    return count > 0;
  }

  async findByIds(ids: readonly string[]): Promise<WaitingListAggregate[]> {
    const rows = await this.prisma.waitingList.findMany({ where: { id: { in: [...ids] } } });
    return rows.map(mapWaitingListRow);
  }
}
