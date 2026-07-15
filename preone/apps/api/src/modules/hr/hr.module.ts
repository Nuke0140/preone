/**
 * HrModule — Staff, Payroll, Leave, Attendance, Performance
 *
 * Per BTD §4.3 Module Catalog #10:
 *   "hr — Staff, Payroll, Leave, Attendance — ~40 APIs"
 *
 * Per BRC v1.0 §6 (HR Rules, 12 rules) + §9 (Compliance, POSH) +
 *   API Catalog §16.13 + ERD v3.0 (HR, 31 tables):
 *   - Employee onboarding + BGV (R-HR-002: Background Verification)
 *   - Staff qualification minimum (R-HR-001)
 *   - Leave management (R-HR-003: 18 days annual, R-HR-004: max 10 consecutive)
 *   - Substitute teacher assignment (R-HR-005)
 *   - Payroll cutoff + payslip generation (R-HR-006)
 *   - Performance review cycle (R-HR-007: quarterly)
 *   - Exit process (R-HR-008: notice period + handover)
 *   - Internal Complaints Committee (R-HR-009, R-CMP-009 to R-CMP-012)
 *   - Annual POSH training (R-HR-010)
 *   - Food handler medical certificate (R-HR-011, R-CMP-018)
 *   - Probation period (R-HR-012: 3 months)
 *   - Salary revision approval (R-APR-011) + new position (R-APR-010)
 *   - Biometric integration (eSSL / Secugen / Mantra)
 *
 * Aggregates: EmployeeAggregate, LeaveAggregate, PayrollAggregate,
 *             PerformanceReviewAggregate
 *
 * Status: STUB — to be implemented in Wave 7 per BUILD_ROADMAP.md
 */
import { Module } from '@nestjs/common';

@Module({})
export class HrModule {}
