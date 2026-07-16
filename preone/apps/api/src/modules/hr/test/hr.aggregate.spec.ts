/**
 * HR Aggregate Unit Tests — covers Employee, Leave, Payroll,
 * PerformanceReview aggregate invariants + lifecycle transitions.
 */
import { describe, it, expect } from 'vitest';

import { EmployeeAggregate } from '../domain/aggregates/employee.aggregate';
import { LeaveAggregate } from '../domain/aggregates/leave.aggregate';
import { PayrollAggregate } from '../domain/aggregates/payroll.aggregate';
import { PerformanceReviewAggregate } from '../domain/aggregates/performance-review.aggregate';

// ─── Employee ────────────────────────────────────────────────────

describe('EmployeeAggregate', () => {
  const baseProps = {
    tenantId: 't1',
    branchId: 'b1',
    employeeCode: 'EMP-001',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya@school.com',
    phone: '+919876543210',
    role: 'CLASS_TEACHER' as const,
    designation: 'Class Teacher - Nursery',
    employmentType: 'FULL_TIME' as const,
    dateOfJoining: '2025-04-01T00:00:00Z',
    salaryCents: 3500000, // ₹35,000/mo
  };

  it('should create in PROSPECTIVE status', () => {
    const emp = EmployeeAggregate.create(baseProps);
    expect(emp.status).toBe('PROSPECTIVE');
    expect(emp.employeeCode).toBe('EMP-001');
    expect(emp.bgvStatus).toBe('PENDING');
    // Probation should be 3 months from dateOfJoining
    const probationEnd = new Date(emp['_props'].probationEndDate!);
    const expectedEnd = new Date('2025-06-30T00:00:00Z');
    expect(Math.abs(probationEnd.getTime() - expectedEnd.getTime())).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('should onboard and start BGV (IN_PROGRESS)', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard('Securanow');
    expect(emp.status).toBe('ONBOARDED');
    expect(emp.bgvStatus).toBe('IN_PROGRESS');
    expect(emp.domainEvents.some(e => e.eventType === 'EmployeeOnboardedEvent')).toBe(true);
  });

  it('should reject activation before BGV clearance (R-HR-002)', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    expect(() => emp.activate()).toThrow('BGV clearance');
  });

  it('should clear BGV and activate', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv('https://s3/bgv-report.pdf');
    expect(emp.bgvStatus).toBe('CLEARED');
    emp.activate();
    expect(emp.status).toBe('ACTIVE');
  });

  it('should fail BGV and block activation', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.failBgv('Criminal record found');
    expect(emp.bgvStatus).toBe('FAILED');
    expect(() => emp.activate()).toThrow('BGV clearance');
  });

  it('should promote only ACTIVE employees', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv();
    emp.activate();
    emp.promote('COORDINATOR', 'Academic Coordinator', 5000000);
    expect(emp.role).toBe('COORDINATOR');
    expect(emp.salaryCents).toBe(5000000);
    expect(emp.domainEvents.some(e => e.eventType === 'EmployeePromotedEvent')).toBe(true);
  });

  it('should reject promotion of non-ACTIVE employees', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    expect(() => emp.promote('COORDINATOR', 'Coordinator', 5000000)).toThrow('ACTIVE');
  });

  it('should suspend an employee with reason', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv();
    emp.activate();
    emp.suspend('Pending inquiry');
    expect(emp.status).toBe('SUSPENDED');
  });

  it('should allow resignation after activation', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv();
    emp.activate();
    emp.resign('2025-10-01', '2025-11-01', 'Better opportunity');
    expect(emp.status).toBe('RESIGNED');
    expect(emp['_props'].lastWorkingDate).toBe('2025-11-01');
  });

  it('should reject exit without handover (R-HR-008)', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv();
    emp.activate();
    emp.resign('2025-10-01', '2025-11-01', 'Better opportunity');
    expect(() => emp.completeExit(false, false)).toThrow('handover');
  });

  it('should complete exit with handover', () => {
    const emp = EmployeeAggregate.create(baseProps);
    emp.onboard();
    emp.clearBgv();
    emp.activate();
    emp.resign('2025-10-01', '2025-11-01', 'Better opportunity');
    emp.completeExit(true, true);
    expect(emp.status).toBe('EXITED');
    expect(emp.domainEvents.some(e => e.eventType === 'EmployeeOffboardedEvent')).toBe(true);
  });

  it('should reject invalid transitions', () => {
    const emp = EmployeeAggregate.create(baseProps);
    expect(() => emp.activate()).toThrow(); // PROSPECTIVE → ACTIVE not allowed
    expect(() => emp.resign('2025-10-01', '2025-11-01', 'x')).toThrow(); // PROSPECTIVE → RESIGNED
  });
});

// ─── Leave ────────────────────────────────────────────────────────

describe('LeaveAggregate', () => {
  it('should create in PENDING status with LeaveAppliedEvent', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-12', dayType: 'FULL',
      reason: 'Personal work',
    });
    expect(leave.status).toBe('PENDING');
    expect(leave.totalDays).toBe(3); // 10, 11, 12 June
    expect(leave.domainEvents.some(e => e.eventType === 'LeaveAppliedEvent')).toBe(true);
  });

  it('should reject leave exceeding 10 days (R-HR-004)', () => {
    expect(() => LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-01', toDate: '2025-06-15', dayType: 'FULL',
      reason: 'Long vacation',
    })).toThrow('10 consecutive days');
  });

  it('should allow maternity leave > 10 days', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'MATERNITY',
      fromDate: '2025-06-01', toDate: '2025-11-30', dayType: 'FULL',
      reason: 'Maternity leave',
    });
    expect(leave.totalDays).toBeGreaterThan(180);
  });

  it('should compute half-day leave correctly', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-10', dayType: 'FIRST_HALF',
      reason: 'Half day',
    });
    expect(leave.totalDays).toBe(0.5);
  });

  it('should approve leave with substitute (R-HR-005)', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-12', dayType: 'FULL',
      reason: 'Personal',
    });
    leave.approve('mgr1', 'sub1', 'Approved with substitute');
    expect(leave.status).toBe('APPROVED');
    expect(leave.substituteEmployeeId).toBe('sub1');
    expect(leave.domainEvents.some(e => e.eventType === 'LeaveApprovedEvent')).toBe(true);
  });

  it('should reject leave with reason', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-12', dayType: 'FULL',
      reason: 'Personal',
    });
    leave.reject('mgr1', 'Critical period — exam week');
    expect(leave.status).toBe('REJECTED');
    expect(leave.domainEvents.some(e => e.eventType === 'LeaveRejectedEvent')).toBe(true);
  });

  it('should cancel leave before taken', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-12', dayType: 'FULL',
      reason: 'Personal',
    });
    leave.cancel('Plan changed');
    expect(leave.status).toBe('CANCELLED');
  });

  it('should mark taken after leave period', () => {
    const leave = LeaveAggregate.create({
      tenantId: 't1', employeeId: 'e1', leaveType: 'CASUAL',
      fromDate: '2025-06-10', toDate: '2025-06-12', dayType: 'FULL',
      reason: 'Personal',
    });
    leave.approve('mgr1', undefined);
    leave.markTaken();
    expect(leave.status).toBe('TAKEN');
    expect(leave.domainEvents.some(e => e.eventType === 'LeaveTakenEvent')).toBe(true);
  });
});

// ─── Payroll ──────────────────────────────────────────────────────

describe('PayrollAggregate', () => {
  it('should create in DRAFT status', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    expect(p.status).toBe('DRAFT');
    expect(p.payslips.length).toBe(0);
  });

  it('should reject generation with zero payslips', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    expect(() => p.generate([])).toThrow('zero payslips');
  });

  it('should validate payslip gross = basic + hra + allowances', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    expect(() => p.generate([{
      employeeId: 'e1', employeeCode: 'EMP-001', employeeName: 'Priya',
      payPeriodMonth: 6, payPeriodYear: 2025,
      basicCents: 2000000, hraCents: 800000, conveyanceAllowanceCents: 160000,
      specialAllowanceCents: 540000, medicalAllowanceCents: 125000, otherAllowancesCents: 0,
      grossCents: 9999999, // wrong
      pfDeductionCents: 240000, esiDeductionCents: 0, tdsDeductionCents: 0,
      professionalTaxCents: 20000, loanDeductionCents: 0, otherDeductionsCents: 0,
      totalDeductionsCents: 260000, netPayCents: 0,
      status: 'PENDING',
    }])).toThrow('Gross mismatch');
  });

  it('should validate PF = 12% of basic', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    expect(() => p.generate([{
      employeeId: 'e1', employeeCode: 'EMP-001', employeeName: 'Priya',
      payPeriodMonth: 6, payPeriodYear: 2025,
      basicCents: 2000000, hraCents: 800000, conveyanceAllowanceCents: 160000,
      specialAllowanceCents: 540000, medicalAllowanceCents: 125000, otherAllowancesCents: 0,
      grossCents: 3625000,
      pfDeductionCents: 500000, // should be 240000 (12% of 2M)
      esiDeductionCents: 0, tdsDeductionCents: 0,
      professionalTaxCents: 20000, loanDeductionCents: 0, otherDeductionsCents: 0,
      totalDeductionsCents: 520000, netPayCents: 3105000,
      status: 'PENDING',
    }])).toThrow('PF deduction');
  });

  it('should generate payroll with valid payslips', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    p.generate([{
      employeeId: 'e1', employeeCode: 'EMP-001', employeeName: 'Priya',
      payPeriodMonth: 6, payPeriodYear: 2025,
      basicCents: 2000000, hraCents: 800000, conveyanceAllowanceCents: 160000,
      specialAllowanceCents: 540000, medicalAllowanceCents: 125000, otherAllowancesCents: 0,
      grossCents: 3625000,
      pfDeductionCents: 240000, esiDeductionCents: 0, tdsDeductionCents: 0,
      professionalTaxCents: 20000, loanDeductionCents: 0, otherDeductionsCents: 0,
      totalDeductionsCents: 260000, netPayCents: 3365000,
      status: 'PENDING',
    }]);
    expect(p.status).toBe('GENERATED');
    expect(p.employeeCount).toBe(1);
    expect(p.totalNetPayCents).toBe(3365000);
    expect(p.domainEvents.some(e => e.eventType === 'PayrollGeneratedEvent')).toBe(true);
  });

  it('should approve + pay payroll with UTR per employee', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    p.generate([{
      employeeId: 'e1', employeeCode: 'EMP-001', employeeName: 'Priya',
      payPeriodMonth: 6, payPeriodYear: 2025,
      basicCents: 2000000, hraCents: 800000, conveyanceAllowanceCents: 160000,
      specialAllowanceCents: 540000, medicalAllowanceCents: 125000, otherAllowancesCents: 0,
      grossCents: 3625000,
      pfDeductionCents: 240000, esiDeductionCents: 0, tdsDeductionCents: 0,
      professionalTaxCents: 20000, loanDeductionCents: 0, otherDeductionsCents: 0,
      totalDeductionsCents: 260000, netPayCents: 3365000,
      status: 'PENDING',
    }]);
    p.approve('principal1');
    expect(p.status).toBe('APPROVED');
    p.markPaid('2025-06-28', { 'e1': 'UTR12345' });
    expect(p.status).toBe('PAID');
    expect(p.payslips[0].utrNumber).toBe('UTR12345');
    expect(p.payslips[0].status).toBe('PAID');
    expect(p.domainEvents.some(e => e.eventType === 'PayslipIssuedEvent')).toBe(true);
  });

  it('should hold and release payroll', () => {
    const p = PayrollAggregate.create({
      tenantId: 't1', payrollRunCode: 'PAY-202506',
      payPeriodMonth: 6, payPeriodYear: 2025, cutoffDate: '2025-06-25',
    });
    p.generate([{
      employeeId: 'e1', employeeCode: 'EMP-001', employeeName: 'Priya',
      payPeriodMonth: 6, payPeriodYear: 2025,
      basicCents: 2000000, hraCents: 800000, conveyanceAllowanceCents: 160000,
      specialAllowanceCents: 540000, medicalAllowanceCents: 125000, otherAllowancesCents: 0,
      grossCents: 3625000,
      pfDeductionCents: 240000, esiDeductionCents: 0, tdsDeductionCents: 0,
      professionalTaxCents: 20000, loanDeductionCents: 0, otherDeductionsCents: 0,
      totalDeductionsCents: 260000, netPayCents: 3365000,
      status: 'PENDING',
    }]);
    p.hold('Pending verification');
    expect(p.status).toBe('ON_HOLD');
    p.releaseHold();
    expect(p.status).toBe('GENERATED');
  });
});

// ─── Performance Review ───────────────────────────────────────

describe('PerformanceReviewAggregate', () => {
  it('should create in DRAFT status', () => {
    const r = PerformanceReviewAggregate.create({
      tenantId: 't1', employeeId: 'e1', reviewerId: 'mgr1',
      cycle: 'Q1', cycleYear: 2025,
    });
    expect(r.status).toBe('DRAFT');
    expect(r.cycle).toBe('Q1');
  });

  it('should start review → SELF_ASSESSMENT', () => {
    const r = PerformanceReviewAggregate.create({
      tenantId: 't1', employeeId: 'e1', reviewerId: 'mgr1',
      cycle: 'Q1', cycleYear: 2025,
    });
    r.start();
    expect(r.status).toBe('SELF_ASSESSMENT');
    expect(r.domainEvents.some(e => e.eventType === 'PerformanceReviewStartedEvent')).toBe(true);
  });

  it('should reject goal weights exceeding 100%', () => {
    const r = PerformanceReviewAggregate.create({
      tenantId: 't1', employeeId: 'e1', reviewerId: 'mgr1',
      cycle: 'Q1', cycleYear: 2025,
    });
    r.addGoal({ title: 'G1', description: 'Goal 1', weightPercent: 60 });
    expect(() => r.addGoal({ title: 'G2', description: 'Goal 2', weightPercent: 50 })).toThrow('100%');
  });

  it('should complete review with HR finalization', () => {
    const r = PerformanceReviewAggregate.create({
      tenantId: 't1', employeeId: 'e1', reviewerId: 'mgr1',
      hrReviewerId: 'hr1', cycle: 'Q1', cycleYear: 2025,
    });
    r.addGoal({ title: 'G1', description: 'Goal 1', weightPercent: 100 });
    r.start();
    const goalId = r['_props'].goals[0].id;
    r.submitSelfAssessment({ [goalId]: { rating: 4, comments: 'Did well' } });
    r.submitManagerReview(
      { [goalId]: { rating: 4, comments: 'Agree' } },
      'Teaching', 'Punctuality', 'Action plan',
      false, undefined,
    );
    expect(r.status).toBe('HR_REVIEW');
    r.completeHrReview({ [goalId]: 4 }, 4);
    expect(r.status).toBe('COMPLETED');
    expect(r.overallRating).toBe(4);
    expect(r.domainEvents.some(e => e.eventType === 'PerformanceReviewCompletedEvent')).toBe(true);
  });

  it('should allow employee to acknowledge completed review', () => {
    const r = PerformanceReviewAggregate.create({
      tenantId: 't1', employeeId: 'e1', reviewerId: 'mgr1',
      cycle: 'Q1', cycleYear: 2025,
    });
    r.addGoal({ title: 'G1', description: 'Goal 1', weightPercent: 100 });
    r.start();
    const goalId = r['_props'].goals[0].id;
    r.submitSelfAssessment({ [goalId]: { rating: 4 } });
    // No HR reviewer — direct completion
    r.submitManagerReview({ [goalId]: { rating: 4 } }, 'S', 'I', 'A', false);
    expect(r.status).toBe('COMPLETED');
    r.acknowledgeByEmployee('Agreed with feedback');
    expect(r['_props'].employeeAcknowledgedAt).toBeDefined();
    expect(r['_props'].employeeFeedback).toBe('Agreed with feedback');
  });
});
