/**
 * Admissions DTOs — request/response shapes for Admissions endpoints.
 *
 * Per BTD §12.3 — DTOs are infrastructure-layer contracts (Zod schemas).
 */
import { z } from 'zod';

// ─────────────────────────────────────────────
// Application
// ─────────────────────────────────────────────

export const createApplicationSchema = z.object({
  branchId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  programType: z.enum(['PLAYGROUP', 'NURSERY', 'LKG', 'UKG', 'DAYCARE']),
  admissionType: z.enum(['REGULAR', 'LATE', 'TRANSFER', 'MID_SESSION', 'READMISSION']).default('REGULAR'),
  leadId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
  childFirstName: z.string().min(1).max(64),
  childLastName: z.string().min(1).max(64),
  childDob: z.string().date(),
  childGender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED']),
  childBloodGroup: z.enum([
    'A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE',
    'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN',
  ]).optional(),
  preferredStartDate: z.string().date(),
  parentDeclarations: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = createApplicationSchema.partial().omit({ branchId: true, academicSessionId: true });
export type UpdateApplicationDto = z.infer<typeof updateApplicationSchema>;

export const submitApplicationSchema = z.object({});
export type SubmitApplicationDto = z.infer<typeof submitApplicationSchema>;

export const rejectApplicationSchema = z.object({
  reason: z.enum([
    'AGE_INELIGIBLE', 'NO_SEAT', 'DOCUMENT_INCOMPLETE', 'DOCUMENT_INVALID',
    'FEE_NOT_PAID', 'MEDICAL_UNSUITABLE', 'PARENT_DECLINED', 'OTHER',
  ]),
  notes: z.string().max(2000).optional(),
});
export type RejectApplicationDto = z.infer<typeof rejectApplicationSchema>;

export const cancelApplicationSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type CancelApplicationDto = z.infer<typeof cancelApplicationSchema>;

// ─────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────

export const uploadDocumentSchema = z.object({
  documentType: z.enum([
    'BIRTH_CERTIFICATE', 'AADHAAR', 'PHOTO', 'MEDICAL', 'TRANSFER_CERT',
    'PROOF_OF_ADDRESS', 'INCOME_CERT', 'CASTE_CERT', 'IMMUNIZATION',
  ]),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileKey: z.string().max(512).optional(),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(64),
});
export type UploadDocumentDto = z.infer<typeof uploadDocumentSchema>;

export const rejectDocumentSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type RejectDocumentDto = z.infer<typeof rejectDocumentSchema>;

// ─────────────────────────────────────────────
// Counselling
// ─────────────────────────────────────────────

export const scheduleCounsellingSchema = z.object({
  counsellorId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  mode: z.enum(['IN_PERSON', 'PHONE', 'VIDEO']),
  durationMinutes: z.number().int().min(15).max(180).default(30),
  childPresent: z.boolean().default(true),
});
export type ScheduleCounsellingDto = z.infer<typeof scheduleCounsellingSchema>;

export const completeCounsellingSchema = z.object({
  recommendation: z.enum(['APPROVE', 'REJECT', 'WAITLIST']),
  notes: z.string().max(5000),
});
export type CompleteCounsellingDto = z.infer<typeof completeCounsellingSchema>;

// ─────────────────────────────────────────────
// Approval
// ─────────────────────────────────────────────

export const recordApprovalSchema = z.object({
  approvalLevel: z.number().int().min(1).max(4),
  decision: z.enum(['APPROVED', 'REJECTED', 'WAITLISTED', 'DEFERRED']),
  reason: z.string().max(2000).optional(),
  feeWaiverApprovedCents: z.number().int().nonnegative().optional(),
  conditions: z.array(z.object({
    type: z.string(),
    description: z.string(),
  })).optional(),
});
export type RecordApprovalDto = z.infer<typeof recordApprovalSchema>;

// ─────────────────────────────────────────────
// Admission Offer
// ─────────────────────────────────────────────

export const issueOfferSchema = z.object({
  offeredProgram: z.enum(['PLAYGROUP', 'NURSERY', 'LKG', 'UKG', 'DAYCARE']),
  feeQuoteCents: z.number().int().nonnegative(),
  securityDepositCents: z.number().int().nonnegative(),
  offerLetterUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type IssueOfferDto = z.infer<typeof issueOfferSchema>;

// ─────────────────────────────────────────────
// Age verification
// ─────────────────────────────────────────────

export const ageVerificationSchema = z.object({
  minAgeRequiredYears: z.number().min(0).max(20),
  maxAgeRequiredYears: z.number().min(0).max(20),
  ageAtSessionStartYears: z.number().min(0).max(20),
});
export type AgeVerificationDto = z.infer<typeof ageVerificationSchema>;

export const ageOverrideSchema = z.object({
  reason: z.string().min(1).max(2000),
});
export type AgeOverrideDto = z.infer<typeof ageOverrideSchema>;

// ─────────────────────────────────────────────
// Fee plan quote
// ─────────────────────────────────────────────

export const feePlanQuoteSchema = z.object({
  annualFeeCents: z.number().int().nonnegative(),
  securityDepositCents: z.number().int().nonnegative(),
  siblingConcessionCents: z.number().int().nonnegative().default(0),
  scholarshipCents: z.number().int().nonnegative().default(0),
  installmentCount: z.number().int().min(1).max(12),
  quoteValidUntil: z.string().date(),
});
export type FeePlanQuoteDto = z.infer<typeof feePlanQuoteSchema>;

// ─────────────────────────────────────────────
// Priority factor
// ─────────────────────────────────────────────

export const addPriorityFactorSchema = z.object({
  factor: z.enum(['SIBLING', 'STAFF_CHILD', 'ALUMNI', 'DISTANCE', 'FIRST_GEN', 'GIRL_CHILD']),
  weight: z.number().int().min(0).max(100),
  evidenceUrl: z.string().url().optional(),
});
export type AddPriorityFactorDto = z.infer<typeof addPriorityFactorSchema>;

// ─────────────────────────────────────────────
// Sibling concession
// ─────────────────────────────────────────────

export const siblingConcessionSchema = z.object({
  siblingStudentId: z.string().uuid(),
  siblingName: z.string().min(1).max(160),
  concessionPercent: z.number().int().min(0).max(100).default(10),
});
export type SiblingConcessionDto = z.infer<typeof siblingConcessionSchema>;

// ─────────────────────────────────────────────
// Admission
// ─────────────────────────────────────────────

export const cancelAdmissionSchema = z.object({
  reason: z.string().min(1).max(2000),
  refundDueCents: z.number().int().nonnegative().optional(),
});
export type CancelAdmissionDto = z.infer<typeof cancelAdmissionSchema>;

// ─────────────────────────────────────────────
// Waiting list
// ─────────────────────────────────────────────

export const offerSeatSchema = z.object({
  expiresAt: z.string().datetime(),
});
export type OfferSeatDto = z.infer<typeof offerSeatSchema>;

// ─────────────────────────────────────────────
// List filters
// ─────────────────────────────────────────────

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  academicSessionId: z.string().uuid().optional(),
  programType: z.enum(['PLAYGROUP', 'NURSERY', 'LKG', 'UKG', 'DAYCARE']).optional(),
  status: z.enum([
    'DRAFT', 'SUBMITTED', 'DOCUMENT_PENDING', 'VERIFIED',
    'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED',
  ]).optional(),
  search: z.string().max(160).optional(),
});
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

export const listAdmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'GRADUATED', 'TRANSFERRED']).optional(),
});
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;
