/**
 * Attendance DTOs — request/response shapes for Attendance endpoints.
 */
import { z } from 'zod';

// ─────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────

export const markAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  classroomId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  attendanceDate: z.string().date(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  arrivalMode: z.enum(['WALK_IN', 'CAR', 'BUS', 'AUTO', 'OTHER']).optional(),
  pickupMode: z.enum(['WALK_IN', 'CAR', 'BUS', 'AUTO', 'AFTER_SCHOOL', 'OTHER']).optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(['MANUAL', 'BIOMETRIC', 'RFID', 'APP']).default('MANUAL'),
});
export type MarkAttendanceDto = z.infer<typeof markAttendanceSchema>;

export const markBulkAttendanceSchema = z.object({
  classroomId: z.string().uuid(),
  academicSessionId: z.string().uuid(),
  attendanceDate: z.string().date(),
  source: z.enum(['MANUAL', 'BIOMETRIC', 'RFID', 'APP']).default('MANUAL'),
  notes: z.string().max(2000).optional(),
  entries: z.array(z.object({
    studentId: z.string().uuid(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
    notes: z.string().max(500).optional(),
  })).min(1).max(100),
});
export type MarkBulkAttendanceDto = z.infer<typeof markBulkAttendanceSchema>;

export const correctAttendanceSchema = z.object({
  fromStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
  toStatus: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']),
  reason: z.string().min(1).max(2000),
});
export type CorrectAttendanceDto = z.infer<typeof correctAttendanceSchema>;

export const logArrivalSchema = z.object({
  arrivalAt: z.string().datetime(),
  arrivalMode: z.enum(['WALK_IN', 'CAR', 'BUS', 'AUTO', 'OTHER']),
  droppedByGuardianId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});
export type LogArrivalDto = z.infer<typeof logArrivalSchema>;

export const logPickupSchema = z.object({
  pickupAt: z.string().datetime(),
  pickupMode: z.enum(['WALK_IN', 'CAR', 'BUS', 'AUTO', 'AFTER_SCHOOL', 'OTHER']),
  pickedByGuardianId: z.string().uuid().optional(),
  pickedByAuthorizedPerson: z.string().max(160).optional(),
  notes: z.string().max(2000).optional(),
});
export type LogPickupDto = z.infer<typeof logPickupSchema>;

// ─────────────────────────────────────────────
// Daily logs (meal/nap/toilet/mood/water/medicine)
// ─────────────────────────────────────────────

export const recordDailyLogSchema = z.object({
  logType: z.enum(['MEAL', 'NAP', 'TOILET', 'MOOD', 'WATER', 'MEDICINE']),
  loggedAt: z.string().datetime(),
  payload: z.record(z.unknown()),
  notes: z.string().max(2000).optional(),
});
export type RecordDailyLogDto = z.infer<typeof recordDailyLogSchema>;

export const grantMedicineAuthorizationSchema = z.object({
  authorizedByGuardianId: z.string().uuid(),
  medicineName: z.string().min(1).max(160),
  dosage: z.string().min(1).max(64),
  route: z.enum(['ORAL', 'TOPICAL', 'INHALATION', 'INJECTION', 'OPHTHALMIC', 'OTIC', 'NASAL', 'OTHER']),
  frequency: z.string().min(1).max(64),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  instructions: z.string().max(2000).optional(),
  prescriptionUrl: z.string().url().optional(),
});
export type GrantMedicineAuthorizationDto = z.infer<typeof grantMedicineAuthorizationSchema>;

// ─────────────────────────────────────────────
// Incident
// ─────────────────────────────────────────────

export const createIncidentSchema = z.object({
  studentId: z.string().uuid(),
  classroomId: z.string().uuid(),
  incidentType: z.enum(['INJURY', 'BITE', 'FALL', 'ALLERGIC_REACTION', 'BEHAVIOR', 'ILLNESS', 'LOST_FOUND', 'PROPERTY_DAMAGE', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  occurredAt: z.string().datetime(),
  location: z.string().max(160).optional(),
  description: z.string().min(1).max(10000),
  immediateAction: z.string().max(5000).optional(),
});
export type CreateIncidentDto = z.infer<typeof createIncidentSchema>;

export const escalateIncidentSchema = z.object({
  toSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  reason: z.string().min(1).max(2000),
});
export type EscalateIncidentDto = z.infer<typeof escalateIncidentSchema>;

export const addIncidentActionSchema = z.object({
  actionType: z.enum(['FIRST_AID', 'PARENT_CALL', 'MEDICAL', 'REPORT', 'OTHER']),
  description: z.string().min(1).max(5000),
  performedAt: z.string().datetime(),
});
export type AddIncidentActionDto = z.infer<typeof addIncidentActionSchema>;

export const completeIncidentActionSchema = z.object({
  outcome: z.string().min(1).max(5000),
});
export type CompleteIncidentActionDto = z.infer<typeof completeIncidentActionSchema>;

export const resolveIncidentSchema = z.object({
  resolutionNotes: z.string().min(1).max(10000),
});
export type ResolveIncidentDto = z.infer<typeof resolveIncidentSchema>;

export const notifyGuardianSchema = z.object({
  // Empty — just triggers guardian notification
});
export type NotifyGuardianDto = z.infer<typeof notifyGuardianSchema>;

// ─────────────────────────────────────────────
// Daily report
// ─────────────────────────────────────────────

export const generateDailyReportSchema = z.object({
  summaries: z.object({
    summary: z.string().max(5000).optional(),
    moodSummary: z.string().max(2000).optional(),
    mealsSummary: z.string().max(2000).optional(),
    activitiesSummary: z.string().max(2000).optional(),
    napSummary: z.string().max(2000).optional(),
    toiletSummary: z.string().max(2000).optional(),
    highlights: z.array(z.string().max(500)).max(20).optional(),
    teacherNotes: z.string().max(5000).optional(),
  }),
});
export type GenerateDailyReportDto = z.infer<typeof generateDailyReportSchema>;

export const addHighlightSchema = z.object({
  highlight: z.string().min(1).max(500),
});
export type AddHighlightDto = z.infer<typeof addHighlightSchema>;

// ─────────────────────────────────────────────
// List filters
// ─────────────────────────────────────────────

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  classroomId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  academicSessionId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE']).optional(),
});
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  status: z.enum(['REPORTED', 'INVESTIGATING', 'ACTION_PENDING', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});
export type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;
