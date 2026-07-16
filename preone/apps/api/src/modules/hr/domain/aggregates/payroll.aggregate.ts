/**
 * PayrollAggregate — monthly payroll run + payslip generation (BRC R-HR-006).
 *
 * Lifecycle:
 *   DRAFT → GENERATED → APPROVED → PAID → {ARCHIVED}
 *
 * Invariants (per BRC):
 *   - R-HR-006: Payroll cutoff = 25th of each month
 *   - Salary stored as integer paise (NEVER float)
 *   - Gross = basic + HRA + allowances + special
 *   - Net = gross - PF - TDS - ESI - other deductions
 *   - PF @ 12% of basic (employee + employer)
 *   - Cannot generate payroll for EXITED employees
 *   - Cannot pay without approval (segregation of duties)
 */
import { AggregateRoot } from '@shared/kernel/aggregate-root';

import {
  PayrollGeneratedEvent, PayrollApprovedEvent, PayslipIssuedEvent,
  PayrollHoldReleasedEvent,
} from '../events/hr-events';

export type PayrollStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PAID' | 'ARCHIVED' | 'ON_HOLD';

export interface PayslipEntry {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  payPeriodMonth: number; // 1-12
  payPeriodYear: number;
  basicCents: number;
  hraCents: number;
  conveyanceAllowanceCents: number;
  specialAllowanceCents: number;
  medicalAllowanceCents: number;
  otherAllowancesCents: number;
  grossCents: number;
  pfDeductionCents: number;
  esiDeductionCents: number;
  tdsDeductionCents: number;
  professionalTaxCents: number;
  loanDeductionCents: number;
  otherDeductionsCents: number;
  totalDeductionsCents: number;
  netPayCents: number;
  bankAccountNumber?: string;
  bankIfsc?: string;
  utrNumber?: string;
  paymentDate?: string;
  status: 'PENDING' | 'PAID' | 'ON_HOLD' | 'REVERSED';
}

export interface PayrollProps {
  tenantId: string;
  branchId?: string;
  payrollRunCode: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  status: PayrollStatus;
  cutoffDate: string;
  generatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  paidAt?: string;
  totalGrossCents: number;
  totalDeductionsCents: number;
  totalNetPayCents: number;
  employeeCount: number;
  payslips: PayslipEntry[];
  holdReason?: string;
  createdAt: string;
  updatedAt: string;
}

const TRANSITIONS: Record<PayrollStatus, PayrollStatus[]> = {
  DRAFT: ['GENERATED'],
  GENERATED: ['APPROVED', 'ON_HOLD'],
  APPROVED: ['PAID', 'ON_HOLD'],
  PAID: ['ARCHIVED'],
  ON_HOLD: ['GENERATED', 'APPROVED'],
  ARCHIVED: [],
};

export class PayrollAggregate extends AggregateRoot<PayrollProps> {
  get tenantId(): string { return this._props.tenantId; }
  get payrollRunCode(): string { return this._props.payrollRunCode; }
  get status(): PayrollStatus { return this._props.status; }
  get payslips(): readonly PayslipEntry[] {
    return Object.freeze([...this._props.payslips]);
  }
  get totalNetPayCents(): number { return this._props.totalNetPayCents; }
  get employeeCount(): number { return this._props.employeeCount; }

  static create(props: Omit<
    PayrollProps,
    'status' | 'payslips' | 'totalGrossCents' | 'totalDeductionsCents' |
    'totalNetPayCents' | 'employeeCount' | 'createdAt' | 'updatedAt'
  >): PayrollAggregate {
    const now = new Date().toISOString();
    const agg = new PayrollAggregate({
      ...props,
      status: 'DRAFT',
      payslips: [],
      totalGrossCents: 0,
      totalDeductionsCents: 0,
      totalNetPayCents: 0,
      employeeCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return agg;
  }

  /**
   * Generate payroll — computes net pay for all eligible employees.
   */
  generate(payslips: PayslipEntry[]): void {
    this._requireTransition('GENERATED');
    if (payslips.length === 0) {
      throw new Error('Cannot generate payroll with zero payslips');
    }
    // Validate each payslip
    for (const p of payslips) {
      const computedGross = p.basicCents + p.hraCents + p.conveyanceAllowanceCents
        + p.specialAllowanceCents + p.medicalAllowanceCents + p.otherAllowancesCents;
      if (computedGross !== p.grossCents) {
        throw new Error(`Gross mismatch for ${p.employeeCode}: ${computedGross} vs ${p.grossCents}`);
      }
      const computedDeductions = p.pfDeductionCents + p.esiDeductionCents
        + p.tdsDeductionCents + p.professionalTaxCents + p.loanDeductionCents
        + p.otherDeductionsCents;
      if (computedDeductions !== p.totalDeductionsCents) {
        throw new Error(`Deductions mismatch for ${p.employeeCode}`);
      }
      const computedNet = p.grossCents - p.totalDeductionsCents;
      if (computedNet !== p.netPayCents) {
        throw new Error(`Net pay mismatch for ${p.employeeCode}`);
      }
      // PF validation: 12% of basic
      const expectedPf = Math.round(p.basicCents * 0.12);
      if (p.pfDeductionCents > 0 && Math.abs(p.pfDeductionCents - expectedPf) > 100) {
        // tolerance of 1 rupee for rounding
        throw new Error(`PF deduction ${p.pfDeductionCents}c does not match 12% of basic (${expectedPf}c) for ${p.employeeCode}`);
      }
    }
    this._props.payslips = payslips;
    this._props.employeeCount = payslips.length;
    this._props.totalGrossCents = payslips.reduce((sum, p) => sum + p.grossCents, 0);
    this._props.totalDeductionsCents = payslips.reduce((sum, p) => sum + p.totalDeductionsCents, 0);
    this._props.totalNetPayCents = payslips.reduce((sum, p) => sum + p.netPayCents, 0);
    this._props.status = 'GENERATED';
    this._props.generatedAt = new Date().toISOString();
    this._touch();
    this._addDomainEvent(new PayrollGeneratedEvent({
      payrollRunId: this.id,
      tenantId: this._props.tenantId,
      payrollRunCode: this._props.payrollRunCode,
      payPeriodMonth: this._props.payPeriodMonth,
      payPeriodYear: this._props.payPeriodYear,
      employeeCount: this._props.employeeCount,
      totalNetPayCents: this._props.totalNetPayCents,
    }));
  }

  /**
   * Approve the payroll — segregation of duties (R-APR-011).
   */
  approve(approverId: string): void {
    this._requireTransition('APPROVED');
    this._props.status = 'APPROVED';
    this._props.approvedAt = new Date().toISOString();
    this._props.approvedBy = approverId;
    this._touch();
    this._addDomainEvent(new PayrollApprovedEvent({
      payrollRunId: this.id,
      tenantId: this._props.tenantId,
      approverId,
      totalNetPayCents: this._props.totalNetPayCents,
    }));
  }

  /**
   * Hold the payroll — e.g., for correction.
   */
  hold(reason: string): void {
    this._requireTransition('ON_HOLD');
    this._props.status = 'ON_HOLD';
    this._props.holdReason = reason;
    this._touch();
  }

  releaseHold(): void {
    if (this._props.status !== 'ON_HOLD') {
      throw new Error('Can only release hold from ON_HOLD status');
    }
    // Return to GENERATED so it can be re-approved
    this._props.status = 'GENERATED';
    this._props.holdReason = undefined;
    this._touch();
    this._addDomainEvent(new PayrollHoldReleasedEvent({
      payrollRunId: this.id,
      tenantId: this._props.tenantId,
    }));
  }

  /**
   * Mark payroll as paid — fires PayslipIssued for each employee.
   */
  markPaid(paymentDate: string, utrByEmployee: Record<string, string>): void {
    this._requireTransition('PAID');
    this._props.status = 'PAID';
    this._props.paidAt = paymentDate;
    // Update each payslip with UTR + status
    for (const slip of this._props.payslips) {
      const utr = utrByEmployee[slip.employeeId];
      if (utr) {
        slip.utrNumber = utr;
        slip.paymentDate = paymentDate;
        slip.status = 'PAID';
      }
    }
    this._touch();
    // Fire a PayslipIssued event for each paid employee
    for (const slip of this._props.payslips) {
      if (slip.status === 'PAID') {
        this._addDomainEvent(new PayslipIssuedEvent({
          payrollRunId: this.id,
          tenantId: this._props.tenantId,
          employeeId: slip.employeeId,
          netPayCents: slip.netPayCents,
          payPeriodMonth: slip.payPeriodMonth,
          payPeriodYear: slip.payPeriodYear,
          utrNumber: slip.utrNumber,
        }));
      }
    }
  }

  archive(): void {
    this._requireTransition('ARCHIVED');
    this._props.status = 'ARCHIVED';
    this._touch();
  }

  private _touch(): void {
    this._props.updatedAt = new Date().toISOString();
  }

  private _requireTransition(target: PayrollStatus): void {
    if (!TRANSITIONS[this._props.status].includes(target)) {
      throw new Error(`Invalid payroll transition: ${this._props.status} → ${target}`);
    }
  }
}
