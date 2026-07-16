/**
 * Admissions saga ports — outbound interfaces the AdmissionsSaga depends on.
 *
 * Per BTD §15 — Sagas + Process Managers:
 *   "Sagas subscribe to domain events and orchestrate cross-context work
 *    via ports (interfaces). The actual implementation lives in the
 *    destination context (Student module implements IStudentOnboardingPort,
 *    Finance module implements IFeePlanPort)."
 *
 * Per BTD §15.2 — Saga Idempotency:
 *   "Saga handlers MUST be idempotent. Receiving the same event twice
 *    MUST NOT create duplicate students or fee plans. Use the eventId
 *    for deduplication — track processed IDs in Redis (or DB unique
 *    constraint on (event_id, saga_name))."
 *
 * Defining ports here (instead of importing concrete services) keeps the
 * Admissions module decoupled from Student/Finance — they may not even
 * be present in the deployment (e.g., finance turned off for a tenant).
 */
import type { ProgramType } from '../aggregates/application.aggregate';

// ─────────────────────────────────────────────
// IStudentOnboardingPort
// ─────────────────────────────────────────────

export interface OnboardStudentRequest {
  tenantId: string;
  applicationId: string;
  admissionId: string;
  childFirstName: string;
  childLastName: string;
  childDob: string;
  childGender: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  programType: ProgramType;
  /** The user ID of the admission approver — recorded as createdBy. */
  approvedBy: string;
  /** The eventId of the triggering ApplicationApprovedEvent — for idempotency. */
  triggerEventId: string;
}

export interface OnboardStudentResult {
  studentId: string;
  /** True if a new student was created; false if already existed (idempotent). */
  created: boolean;
}

/**
 * Outbound port: Student module implements this to create a Student record
 * when an admission is approved.
 *
 * MUST be idempotent — calling with the same `triggerEventId` returns the
 * existing student (created=false) without creating a duplicate.
 */
export interface IStudentOnboardingPort {
  onboardStudent(req: OnboardStudentRequest): Promise<OnboardStudentResult>;
}

// ─────────────────────────────────────────────
// IFeePlanPort
// ─────────────────────────────────────────────

export interface CreateFeePlanRequest {
  tenantId: string;
  admissionId: string;
  studentId: string;
  programType: ProgramType;
  /** The user ID of the admission approver — recorded as createdBy. */
  approvedBy: string;
  /** The eventId of the triggering ApplicationApprovedEvent — for idempotency. */
  triggerEventId: string;
}

export interface CreateFeePlanResult {
  feePlanId: string;
  /** True if a new fee plan was created; false if already existed (idempotent). */
  created: boolean;
}

/**
 * Outbound port: Finance module implements this to create a default FeePlan
 * for the newly-admitted student.
 *
 * MUST be idempotent — calling with the same `triggerEventId` returns the
 * existing fee plan (created=false) without creating a duplicate.
 */
export interface IFeePlanPort {
  createFeePlan(req: CreateFeePlanRequest): Promise<CreateFeePlanResult>;
}

// ─────────────────────────────────────────────
// Tokens for DI
// ─────────────────────────────────────────────

export const STUDENT_ONBOARDING_PORT = Symbol('STUDENT_ONBOARDING_PORT');
export const FEE_PLAN_PORT = Symbol('FEE_PLAN_PORT');
