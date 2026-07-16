/**
 * PrismaHrRepository — concrete impl of HR repos.
 *
 * Per BTD §17.3 — PII columns (bank_account_number, pan_number,
 * aadhaar_number) are encrypted via pgcrypto at the DB layer; the
 * Prisma schema maps them to Bytes and the migration sets up the
 * encryption triggers. Reads decrypt transparently via DB function.
 */
import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infra/prisma/prisma.service';

import { EmployeeAggregate } from '../../domain/aggregates/employee.aggregate';
import type {
  EmployeeDocument, EmployeeQualification, EmploymentType, StaffRole,
} from '../../domain/aggregates/employee.aggregate';
import { LeaveAggregate } from '../../domain/aggregates/leave.aggregate';
import type { LeaveDayType, LeaveType } from '../../domain/aggregates/leave.aggregate';
import { PayrollAggregate } from '../../domain/aggregates/payroll.aggregate';
import type { PayslipEntry } from '../../domain/aggregates/payroll.aggregate';
import { PerformanceReviewAggregate } from '../../domain/aggregates/performance-review.aggregate';
import type {
  EmployeeRepository, LeaveRepository, PayrollRepository,
  PerformanceReviewRepository,
} from '../../domain/repositories/hr.repository';

// ─── Employee Repository ──────────────────────────────────────

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: EmployeeAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.employee.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        employeeCode: p.employeeCode,
        userId: p.userId,
        firstName: p.firstName,
        lastName: p.lastName,
        displayName: p.displayName,
        email: p.email,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
        gender: p.gender,
        role: p.role,
        designation: p.designation,
        employmentType: p.employmentType,
        status: p.status,
        dateOfJoining: new Date(p.dateOfJoining),
        probationEndDate: p.probationEndDate ? new Date(p.probationEndDate) : null,
        bgvStatus: p.bgvStatus,
        bgvInitiatedAt: p.bgvInitiatedAt ? new Date(p.bgvInitiatedAt) : null,
        bgvClearedAt: p.bgvClearedAt ? new Date(p.bgvClearedAt) : null,
        bgvVendor: p.bgvVendor,
        bgvReportUrl: p.bgvReportUrl,
        salaryCents: p.salaryCents,
        bankAccountNumber: p.bankAccountNumber,
        bankIfsc: p.bankIfsc,
        panNumber: p.panNumber,
        aadhaarNumber: p.aadhaarNumber,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        reportingManagerId: p.reportingManagerId,
        handoverCompleted: p.handoverCompleted,
        resignationDate: p.resignationDate ? new Date(p.resignationDate) : null,
        lastWorkingDate: p.lastWorkingDate ? new Date(p.lastWorkingDate) : null,
        exitReason: p.exitReason,
        exitInterviewConducted: p.exitInterviewConducted,
      },
      update: {
        userId: p.userId,
        status: p.status,
        role: p.role,
        designation: p.designation,
        salaryCents: p.salaryCents,
        bgvStatus: p.bgvStatus,
        bgvClearedAt: p.bgvClearedAt ? new Date(p.bgvClearedAt) : null,
        handoverCompleted: p.handoverCompleted,
        exitInterviewConducted: p.exitInterviewConducted,
        resignationDate: p.resignationDate ? new Date(p.resignationDate) : null,
        lastWorkingDate: p.lastWorkingDate ? new Date(p.lastWorkingDate) : null,
        exitReason: p.exitReason,
      },
    });
    // Persist qualifications + documents (replace on update)
    if (p.qualifications.length > 0) {
      await this.prisma.employeeQualification.deleteMany({
        where: { employeeId: agg.id },
      }).catch(() => {});
      for (const q of p.qualifications as EmployeeQualification[]) {
        await this.prisma.employeeQualification.upsert({
          where: { id: q.id },
          create: {
            id: q.id,
            schoolId: p.tenantId,
            employeeId: agg.id,
            degree: q.degree,
            institution: q.institution,
            yearOfPassing: q.yearOfPassing,
            isVerified: q.isVerified,
          },
          update: {
            isVerified: q.isVerified,
          },
        });
      }
    }
    if (p.documents.length > 0) {
      for (const d of p.documents as EmployeeDocument[]) {
        await this.prisma.employeeDocument.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            schoolId: p.tenantId,
            employeeId: agg.id,
            documentType: d.documentType,
            fileName: d.fileName,
            fileUrl: d.fileUrl,
            uploadedAt: new Date(d.uploadedAt),
            verifiedAt: d.verifiedAt ? new Date(d.verifiedAt) : null,
          },
          update: {
            verifiedAt: d.verifiedAt ? new Date(d.verifiedAt) : null,
          },
        });
      }
    }
  }

  async findById(id: string, tenantId: string): Promise<EmployeeAggregate | null> {
    const row = await this.prisma.employee.findFirst({
      where: { id, schoolId: tenantId },
      include: { qualifications: true, documents: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByCode(tenantId: string, employeeCode: string): Promise<EmployeeAggregate | null> {
    const row = await this.prisma.employee.findFirst({
      where: { schoolId: tenantId, employeeCode },
      include: { qualifications: true, documents: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByUserId(userId: string, tenantId: string): Promise<EmployeeAggregate | null> {
    const row = await this.prisma.employee.findFirst({
      where: { schoolId: tenantId, userId },
      include: { qualifications: true, documents: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findActive(tenantId: string, branchId?: string): Promise<EmployeeAggregate[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        schoolId: tenantId,
        status: 'ACTIVE',
        ...(branchId ? { branchId } : {}),
      },
      include: { qualifications: true, documents: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findOnboarding(tenantId: string): Promise<EmployeeAggregate[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        schoolId: tenantId,
        status: { in: ['PROSPECTIVE', 'ONBOARDED'] },
      },
      include: { qualifications: true, documents: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): EmployeeAggregate {
    const agg = Object.create(EmployeeAggregate.prototype) as EmployeeAggregate;
    const props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      employeeCode: row.employeeCode,
      userId: row.userId ?? undefined,
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: row.displayName ?? undefined,
      email: row.email,
      phone: row.phone,
      dateOfBirth: row.dateOfBirth?.toISOString(),
      gender: row.gender,
      role: row.role as any,
      designation: row.designation,
      employmentType: row.employmentType as any,
      status: row.status as any,
      dateOfJoining: row.dateOfJoining.toISOString(),
      probationEndDate: row.probationEndDate?.toISOString(),
      qualifications: (row.qualifications ?? []).map((q: any) => ({
        id: q.id, degree: q.degree, institution: q.institution,
        yearOfPassing: q.yearOfPassing, isVerified: q.isVerified,
      })),
      documents: (row.documents ?? []).map((d: any) => ({
        id: d.id, documentType: d.documentType, fileName: d.fileName,
        fileUrl: d.fileUrl, uploadedAt: d.uploadedAt.toISOString(),
        verifiedAt: d.verifiedAt?.toISOString(),
      })),
      bgvStatus: row.bgvStatus,
      bgvInitiatedAt: row.bgvInitiatedAt?.toISOString(),
      bgvClearedAt: row.bgvClearedAt?.toISOString(),
      bgvVendor: row.bgvVendor ?? undefined,
      bgvReportUrl: row.bgvReportUrl ?? undefined,
      salaryCents: row.salaryCents,
      bankAccountNumber: row.bankAccountNumber ?? undefined,
      bankIfsc: row.bankIfsc ?? undefined,
      panNumber: row.panNumber ?? undefined,
      aadhaarNumber: row.aadhaarNumber ?? undefined,
      emergencyContactName: row.emergencyContactName ?? undefined,
      emergencyContactPhone: row.emergencyContactPhone ?? undefined,
      reportingManagerId: row.reportingManagerId ?? undefined,
      handoverCompleted: row.handoverCompleted,
      resignationDate: row.resignationDate?.toISOString(),
      lastWorkingDate: row.lastWorkingDate?.toISOString(),
      exitReason: row.exitReason ?? undefined,
      exitInterviewConducted: row.exitInterviewConducted,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    (agg as any)._id = row.id;
    (agg as any)._props = props;
    return agg;
  }
}

// ─── Leave Repository ─────────────────────────────────────────

@Injectable()
export class PrismaLeaveRepository implements LeaveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: LeaveAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.leaveRequest.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        employeeId: p.employeeId,
        leaveType: p.leaveType,
        status: p.status,
        fromDate: new Date(p.fromDate),
        toDate: new Date(p.toDate),
        dayType: p.dayType,
        totalDays: p.totalDays,
        reason: p.reason,
        appliedAt: new Date(p.appliedAt),
        approverId: p.approverId,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        approvalNotes: p.approvalNotes,
        rejectionReason: p.rejectionReason,
        substituteEmployeeId: p.substituteEmployeeId,
        isCriticalPeriod: p.isCriticalPeriod,
        attachmentUrl: p.attachmentUrl,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        takenAt: p.takenAt ? new Date(p.takenAt) : null,
      },
      update: {
        status: p.status,
        approverId: p.approverId,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        approvalNotes: p.approvalNotes,
        rejectionReason: p.rejectionReason,
        substituteEmployeeId: p.substituteEmployeeId,
        isCriticalPeriod: p.isCriticalPeriod,
        cancelledAt: p.cancelledAt ? new Date(p.cancelledAt) : null,
        cancellationReason: p.cancellationReason,
        takenAt: p.takenAt ? new Date(p.takenAt) : null,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<LeaveAggregate | null> {
    const row = await this.prisma.leaveRequest.findFirst({
      where: { id, schoolId: tenantId },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByEmployee(employeeId: string, tenantId: string): Promise<LeaveAggregate[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { schoolId: tenantId, employeeId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findPending(tenantId: string): Promise<LeaveAggregate[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: { schoolId: tenantId, status: 'PENDING' },
      orderBy: { appliedAt: 'asc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findOverlapping(
    tenantId: string, employeeId: string, fromDate: string, toDate: string,
  ): Promise<LeaveAggregate[]> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        schoolId: tenantId,
        employeeId,
        status: { in: ['PENDING', 'APPROVED', 'TAKEN'] },
        OR: [
          { fromDate: { lte: new Date(toDate) }, toDate: { gte: new Date(fromDate) } },
        ],
      },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): LeaveAggregate {
    const agg = Object.create(LeaveAggregate.prototype) as LeaveAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      employeeId: row.employeeId,
      leaveType: row.leaveType as LeaveType,
      status: row.status,
      fromDate: row.fromDate.toISOString(),
      toDate: row.toDate.toISOString(),
      dayType: row.dayType as LeaveDayType,
      totalDays: row.totalDays,
      reason: row.reason,
      appliedAt: row.appliedAt.toISOString(),
      approverId: row.approverId ?? undefined,
      approvedAt: row.approvedAt?.toISOString(),
      approvalNotes: row.approvalNotes ?? undefined,
      rejectionReason: row.rejectionReason ?? undefined,
      substituteEmployeeId: row.substituteEmployeeId ?? undefined,
      isCriticalPeriod: row.isCriticalPeriod,
      attachmentUrl: row.attachmentUrl ?? undefined,
      cancelledAt: row.cancelledAt?.toISOString(),
      cancellationReason: row.cancellationReason ?? undefined,
      takenAt: row.takenAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── Payroll Repository ───────────────────────────────────────

@Injectable()
export class PrismaPayrollRepository implements PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: PayrollAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.payrollRun.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        payrollRunCode: p.payrollRunCode,
        payPeriodMonth: p.payPeriodMonth,
        payPeriodYear: p.payPeriodYear,
        status: p.status,
        cutoffDate: new Date(p.cutoffDate),
        generatedAt: p.generatedAt ? new Date(p.generatedAt) : null,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        approvedBy: p.approvedBy,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        totalGrossCents: p.totalGrossCents,
        totalDeductionsCents: p.totalDeductionsCents,
        totalNetPayCents: p.totalNetPayCents,
        employeeCount: p.employeeCount,
        holdReason: p.holdReason,
      },
      update: {
        status: p.status,
        generatedAt: p.generatedAt ? new Date(p.generatedAt) : null,
        approvedAt: p.approvedAt ? new Date(p.approvedAt) : null,
        approvedBy: p.approvedBy,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        totalGrossCents: p.totalGrossCents,
        totalDeductionsCents: p.totalDeductionsCents,
        totalNetPayCents: p.totalNetPayCents,
        employeeCount: p.employeeCount,
        holdReason: p.holdReason,
      },
    });
    // Persist payslips
    for (const slip of p.payslips as PayslipEntry[]) {
      await this.prisma.payslip.upsert({
        where: { id: `${agg.id}-${slip.employeeId}` },
        create: {
          id: `${agg.id}-${slip.employeeId}`,
          schoolId: p.tenantId,
          payrollRunId: agg.id,
          employeeId: slip.employeeId,
          payPeriodMonth: slip.payPeriodMonth,
          payPeriodYear: slip.payPeriodYear,
          basicCents: slip.basicCents,
          hraCents: slip.hraCents,
          conveyanceAllowanceCents: slip.conveyanceAllowanceCents,
          specialAllowanceCents: slip.specialAllowanceCents,
          medicalAllowanceCents: slip.medicalAllowanceCents,
          otherAllowancesCents: slip.otherAllowancesCents,
          grossCents: slip.grossCents,
          pfDeductionCents: slip.pfDeductionCents,
          esiDeductionCents: slip.esiDeductionCents,
          tdsDeductionCents: slip.tdsDeductionCents,
          professionalTaxCents: slip.professionalTaxCents,
          loanDeductionCents: slip.loanDeductionCents,
          otherDeductionsCents: slip.otherDeductionsCents,
          totalDeductionsCents: slip.totalDeductionsCents,
          netPayCents: slip.netPayCents,
          bankAccountNumber: slip.bankAccountNumber,
          bankIfsc: slip.bankIfsc,
          utrNumber: slip.utrNumber,
          paymentDate: slip.paymentDate ? new Date(slip.paymentDate) : null,
          status: slip.status,
        },
        update: {
          utrNumber: slip.utrNumber,
          paymentDate: slip.paymentDate ? new Date(slip.paymentDate) : null,
          status: slip.status,
        },
      });
    }
  }

  async findById(id: string, tenantId: string): Promise<PayrollAggregate | null> {
    const row = await this.prisma.payrollRun.findFirst({
      where: { id, schoolId: tenantId },
      include: { payslips: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByRunCode(tenantId: string, runCode: string): Promise<PayrollAggregate | null> {
    const row = await this.prisma.payrollRun.findFirst({
      where: { schoolId: tenantId, payrollRunCode: runCode },
      include: { payslips: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByPeriod(tenantId: string, month: number, year: number): Promise<PayrollAggregate | null> {
    const row = await this.prisma.payrollRun.findFirst({
      where: { schoolId: tenantId, payPeriodMonth: month, payPeriodYear: year },
      include: { payslips: true },
    });
    return row ? this._hydrate(row) : null;
  }

  private _hydrate(row: any): PayrollAggregate {
    const agg = Object.create(PayrollAggregate.prototype) as PayrollAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      payrollRunCode: row.payrollRunCode,
      payPeriodMonth: row.payPeriodMonth,
      payPeriodYear: row.payPeriodYear,
      status: row.status,
      cutoffDate: row.cutoffDate.toISOString(),
      generatedAt: row.generatedAt?.toISOString(),
      approvedAt: row.approvedAt?.toISOString(),
      approvedBy: row.approvedBy ?? undefined,
      paidAt: row.paidAt?.toISOString(),
      totalGrossCents: row.totalGrossCents,
      totalDeductionsCents: row.totalDeductionsCents,
      totalNetPayCents: row.totalNetPayCents,
      employeeCount: row.employeeCount,
      payslips: (row.payslips ?? []).map((s: any) => ({
        employeeId: s.employeeId,
        employeeCode: s.employeeCode ?? '',
        employeeName: s.employeeName ?? '',
        payPeriodMonth: s.payPeriodMonth,
        payPeriodYear: s.payPeriodYear,
        basicCents: s.basicCents,
        hraCents: s.hraCents,
        conveyanceAllowanceCents: s.conveyanceAllowanceCents,
        specialAllowanceCents: s.specialAllowanceCents,
        medicalAllowanceCents: s.medicalAllowanceCents,
        otherAllowancesCents: s.otherAllowancesCents,
        grossCents: s.grossCents,
        pfDeductionCents: s.pfDeductionCents,
        esiDeductionCents: s.esiDeductionCents,
        tdsDeductionCents: s.tdsDeductionCents,
        professionalTaxCents: s.professionalTaxCents,
        loanDeductionCents: s.loanDeductionCents,
        otherDeductionsCents: s.otherDeductionsCents,
        totalDeductionsCents: s.totalDeductionsCents,
        netPayCents: s.netPayCents,
        bankAccountNumber: s.bankAccountNumber ?? undefined,
        bankIfsc: s.bankIfsc ?? undefined,
        utrNumber: s.utrNumber ?? undefined,
        paymentDate: s.paymentDate?.toISOString(),
        status: s.status,
      })),
      holdReason: row.holdReason ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}

// ─── Performance Review Repository ────────────────────────────

@Injectable()
export class PrismaPerformanceReviewRepository implements PerformanceReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(agg: PerformanceReviewAggregate): Promise<void> {
    const p = (agg as any)._props;
    await this.prisma.performanceReview.upsert({
      where: { id: agg.id },
      create: {
        id: agg.id,
        schoolId: p.tenantId,
        branchId: p.branchId,
        employeeId: p.employeeId,
        reviewerId: p.reviewerId,
        hrReviewerId: p.hrReviewerId,
        cycle: p.cycle,
        cycleYear: p.cycleYear,
        status: p.status,
        selfAssessmentSubmittedAt: p.selfAssessmentSubmittedAt ? new Date(p.selfAssessmentSubmittedAt) : null,
        managerReviewSubmittedAt: p.managerReviewSubmittedAt ? new Date(p.managerReviewSubmittedAt) : null,
        hrReviewSubmittedAt: p.hrReviewSubmittedAt ? new Date(p.hrReviewSubmittedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        overallRating: p.overallRating,
        promotionRecommended: p.promotionRecommended,
        salaryRevisionPercent: p.salaryRevisionPercent,
        strengths: p.strengths,
        improvements: p.improvements,
        actionPlan: p.actionPlan,
        employeeAcknowledgedAt: p.employeeAcknowledgedAt ? new Date(p.employeeAcknowledgedAt) : null,
        employeeFeedback: p.employeeFeedback,
      },
      update: {
        status: p.status,
        selfAssessmentSubmittedAt: p.selfAssessmentSubmittedAt ? new Date(p.selfAssessmentSubmittedAt) : null,
        managerReviewSubmittedAt: p.managerReviewSubmittedAt ? new Date(p.managerReviewSubmittedAt) : null,
        hrReviewSubmittedAt: p.hrReviewSubmittedAt ? new Date(p.hrReviewSubmittedAt) : null,
        completedAt: p.completedAt ? new Date(p.completedAt) : null,
        overallRating: p.overallRating,
        promotionRecommended: p.promotionRecommended,
        salaryRevisionPercent: p.salaryRevisionPercent,
        strengths: p.strengths,
        improvements: p.improvements,
        actionPlan: p.actionPlan,
        employeeAcknowledgedAt: p.employeeAcknowledgedAt ? new Date(p.employeeAcknowledgedAt) : null,
        employeeFeedback: p.employeeFeedback,
      },
    });
  }

  async findById(id: string, tenantId: string): Promise<PerformanceReviewAggregate | null> {
    const row = await this.prisma.performanceReview.findFirst({
      where: { id, schoolId: tenantId },
      include: { goals: true, competencies: true },
    });
    return row ? this._hydrate(row) : null;
  }

  async findByEmployee(employeeId: string, tenantId: string): Promise<PerformanceReviewAggregate[]> {
    const rows = await this.prisma.performanceReview.findMany({
      where: { schoolId: tenantId, employeeId },
      include: { goals: true, competencies: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => this._hydrate(r));
  }

  async findByCycle(
    tenantId: string, cycle: string, cycleYear: number,
  ): Promise<PerformanceReviewAggregate[]> {
    const rows = await this.prisma.performanceReview.findMany({
      where: { schoolId: tenantId, cycle: cycle as any, cycleYear },
      include: { goals: true, competencies: true },
    });
    return rows.map(r => this._hydrate(r));
  }

  private _hydrate(row: any): PerformanceReviewAggregate {
    const agg = Object.create(PerformanceReviewAggregate.prototype) as PerformanceReviewAggregate;
    (agg as any)._id = row.id;
    (agg as any)._props = {
      tenantId: row.schoolId,
      branchId: row.branchId,
      employeeId: row.employeeId,
      reviewerId: row.reviewerId,
      hrReviewerId: row.hrReviewerId ?? undefined,
      cycle: row.cycle as any,  // Prisma ReviewCycle → local ReviewCycle
      cycleYear: row.cycleYear,
      status: row.status,
      goals: (row.goals ?? []).map((g: any) => ({
        id: g.id, title: g.title, description: g.description,
        weightPercent: g.weightPercent, selfRating: g.selfRating,
        managerRating: g.managerRating, finalRating: g.finalRating,
        selfComments: g.selfComments, managerComments: g.managerComments,
      })),
      competencies: (row.competencies ?? []).map((c: any) => ({
        competency: c.competency, selfRating: c.selfRating,
        managerRating: c.managerRating, finalRating: c.finalRating,
        comments: c.comments,
      })),
      selfAssessmentSubmittedAt: row.selfAssessmentSubmittedAt?.toISOString(),
      managerReviewSubmittedAt: row.managerReviewSubmittedAt?.toISOString(),
      hrReviewSubmittedAt: row.hrReviewSubmittedAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      overallRating: row.overallRating,
      promotionRecommended: row.promotionRecommended,
      salaryRevisionPercent: row.salaryRevisionPercent ?? undefined,
      strengths: row.strengths ?? undefined,
      improvements: row.improvements ?? undefined,
      actionPlan: row.actionPlan ?? undefined,
      employeeAcknowledgedAt: row.employeeAcknowledgedAt?.toISOString(),
      employeeFeedback: row.employeeFeedback ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
    return agg;
  }
}
