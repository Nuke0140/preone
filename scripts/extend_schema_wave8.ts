/**
 * Schema extension script — appends Wave 8 models (Reports, Settings, Platform)
 * to packages/database/prisma/schema.prisma
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const SCHEMA_PATH = '/home/z/my-project/preone/packages/database/prisma/schema.prisma';

const NEW_MODELS = `
// ─────────────────────────────────────────────────────────────────────────────
// WAVE 8 — SETTINGS MODULE (BTD §4.3 #13, ~20 APIs)
// Per BRC §15 (Settings Rules) + ERD v3.0 §22 + API Catalog §16.16
// Aggregates: SystemConfig, UserPreference, CalendarEvent
// ─────────────────────────────────────────────────────────────────────────────

enum ConfigScope {
  PLATFORM
  SCHOOL
  BRANCH
  USER
}

enum CalendarEventType {
  HOLIDAY
  EVENT
  EXAM
  PTM
  SPORTS_DAY
  CULTURAL_DAY
  FIELD_TRIP
  STAFF_MEETING
  GOVERNMENT_HOLIDAY
  OTHER
}

enum CalendarEventVisibility {
  PUBLIC
  STAFF_ONLY
  ADMIN_ONLY
  PARENTS_ONLY
}

model SystemConfig {
  id          String       @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId    String?      @map("school_id") @db.Uuid
  branchId    String?      @map("branch_id") @db.Uuid
  scope       ConfigScope  @default(SCHOOL)
  key         String       @db.VarChar(120)
  value       Json
  description String?      @db.Text
  isEncrypted Boolean      @default(false) @map("is_encrypted")
  changedBy   String?      @map("changed_by") @db.Uuid
  changedAt   DateTime     @default(now()) @map("changed_at") @db.Timestamptz
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime     @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt   DateTime?    @map("deleted_at") @db.Timestamptz

  school      School?      @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch      Branch?      @relation(fields: [branchId], references: [id])

  @@unique([scope, schoolId, branchId, key])
  @@index([schoolId, scope])
  @@map("system_configs")
}

model UserPreference {
  id        String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  schoolId  String   @map("school_id") @db.Uuid
  category  String   @db.VarChar(64)  // NOTIFICATION, DISPLAY, LANGUAGE, etc.
  key       String   @db.VarChar(120)
  value     Json
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  school    School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([userId, schoolId, category, key])
  @@index([userId])
  @@map("user_preferences")
}

model CalendarEvent {
  id          String                @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId    String                @map("school_id") @db.Uuid
  branchId    String?               @map("branch_id") @db.Uuid
  academicSessionId String?         @map("academic_session_id") @db.Uuid
  title       String                @db.VarChar(200)
  description String?               @db.Text
  type        CalendarEventType     @default(EVENT)
  visibility  CalendarEventVisibility @default(PUBLIC)
  startDate   DateTime              @map("start_date") @db.Timestamptz
  endDate     DateTime              @map("end_date") @db.Timestamptz
  isFullDay   Boolean               @default(true) @map("is_full_day")
  location    String?               @db.VarChar(255)
  organizerId String?               @map("organizer_id") @db.Uuid
  isCancelled Boolean               @default(false) @map("is_cancelled")
  isRecurring Boolean               @default(false) @map("is_recurring")
  recurrenceRule String?            @map("recurrence_rule") @db.VarChar(255) // RRULE per iCalendar
  metadata    Json?
  createdAt   DateTime              @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime              @updatedAt @map("updated_at") @db.Timestamptz

  school            School                @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch            Branch?               @relation(fields: [branchId], references: [id])
  academicSession   AcademicSession?      @relation("CalendarEventSession", fields: [academicSessionId], references: [id])
  organizer         User?                 @relation("CalendarEventOrganizer", fields: [organizerId], references: [id])

  @@index([schoolId, startDate])
  @@index([branchId, startDate])
  @@index([academicSessionId])
  @@map("calendar_events")
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 8 — REPORTS MODULE (BTD §4.3 #12, ~30 APIs)
// Per BRC §16 (Reporting Rules) + ERD v3.0 §23 + API Catalog §16.17
// Aggregates: ReportDefinition, ReportExecution, SavedReport
// ─────────────────────────────────────────────────────────────────────────────

enum ReportCategory {
  ADMISSIONS
  ATTENDANCE
  FINANCE
  ACADEMICS
  HR
  INVENTORY
  TRANSPORT
  CRM
  ADMINISTRATION
  COMMUNICATION
  COMPLIANCE
  PLATFORM
}

enum ReportFormat {
  PDF
  XLSX
  CSV
  JSON
  HTML
}

enum ReportStatus {
  QUEUED
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum ReportScheduleFrequency {
  DAILY
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
  CUSTOM
}

model ReportDefinition {
  id              String          @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String?         @map("school_id") @db.Uuid
  key             String          @db.VarChar(80)
  name            String          @db.VarChar(200)
  description     String?         @db.Text
  category        ReportCategory
  dataSource      String          @map("data_source") @db.VarChar(120) // view name or service
  queryTemplate   String          @map("query_template") @db.Text // SQL or builder spec
  parameters      Json?           // JSON schema for parameter validation
  defaultFormat   ReportFormat    @default(PDF) @map("default_format")
  allowedFormats  ReportFormat[]  @default([PDF]) @map("allowed_formats")
  isSystem        Boolean         @default(false) @map("is_system")
  isActive        Boolean         @default(true) @map("is_active")
  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt       DateTime?       @map("deleted_at") @db.Timestamptz

  school          School?         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  executions      ReportExecution[]
  subscriptions   ReportSubscription[]
  savedReports    SavedReport[]

  @@unique([schoolId, key])
  @@index([category])
  @@map("report_definitions")
}

model ReportExecution {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String?       @map("branch_id") @db.Uuid
  reportDefId     String        @map("report_def_id") @db.Uuid
  requestedById   String        @map("requested_by_id") @db.Uuid
  status          ReportStatus  @default(QUEUED)
  format          ReportFormat  @default(PDF)

  parameters      Json?
  resultUrl       String?       @map("result_url") @db.VarChar(512)
  resultSizeBytes Int?          @map("result_size_bytes")
  rowCount        Int?          @map("row_count")

  errorMessage    String?       @map("error_message") @db.Text
  startedAt       DateTime?     @map("started_at") @db.Timestamptz
  completedAt     DateTime?     @map("completed_at") @db.Timestamptz
  durationMs      Int?          @map("duration_ms")

  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?       @relation(fields: [branchId], references: [id])
  reportDef       ReportDefinition @relation(fields: [reportDefId], references: [id], onDelete: Cascade)
  requestedBy     User          @relation("ReportRequestedBy", fields: [requestedById], references: [id])

  @@index([schoolId, createdAt])
  @@index([reportDefId])
  @@index([status])
  @@map("report_executions")
}

model SavedReport {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  userId          String        @map("user_id") @db.Uuid
  reportDefId     String        @map("report_def_id") @db.Uuid
  name            String        @db.VarChar(200)
  parameters      Json?
  isPinned        Boolean       @default(false) @map("is_pinned")
  lastExecutedAt  DateTime?     @map("last_executed_at") @db.Timestamptz
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user            User          @relation("SavedReportOwner", fields: [userId], references: [id], onDelete: Cascade)
  reportDef       ReportDefinition @relation(fields: [reportDefId], references: [id])

  @@unique([userId, schoolId, name])
  @@index([userId])
  @@map("saved_reports")
}

model ReportSubscription {
  id              String                  @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                  @map("school_id") @db.Uuid
  reportDefId     String                  @map("report_def_id") @db.Uuid
  userId          String                  @map("user_id") @db.Uuid
  frequency       ReportScheduleFrequency
  cronExpression  String?                 @map("cron_expression") @db.VarChar(80)
  parameters      Json?
  channels        String[]                @default([])  // EMAIL, WHATSAPP, IN_APP
  nextRunAt       DateTime                @map("next_run_at") @db.Timestamptz
  lastRunAt       DateTime?               @map("last_run_at") @db.Timestamptz
  isActive        Boolean                 @default(true) @map("is_active")
  createdAt       DateTime                @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime                @updatedAt @map("updated_at") @db.Timestamptz

  school          School                  @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  reportDef       ReportDefinition        @relation(fields: [reportDefId], references: [id], onDelete: Cascade)
  user            User                    @relation("ReportSubscriber", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, reportDefId])
  @@index([nextRunAt])
  @@index([schoolId, isActive])
  @@map("report_subscriptions")
}

model DashboardWidget {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  userId          String        @map("user_id") @db.Uuid
  widgetKey       String        @map("widget_key") @db.VarChar(80)
  title           String        @db.VarChar(200)
  dataSource      String        @map("data_source") @db.VarChar(120)
  config          Json?
  position        Int           @default(0)
  isVisible       Boolean       @default(true) @map("is_visible")
  refreshSec      Int           @default(300) @map("refresh_sec")
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  user            User          @relation("DashboardWidgetOwner", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, widgetKey])
  @@index([userId, isVisible])
  @@map("dashboard_widgets")
}

// ─────────────────────────────────────────────────────────────────────────────
// WAVE 8 — PLATFORM MODULE EXTENSIONS (BTD §4.3 #14, ~25 APIs)
// Per BRC §17 (Platform Rules) + ERD v3.0 §24 + API Catalog §16.18
// Aggregates: TenantProvisioning, SupportTicket
// (Existing: SchoolSubscription, PlatformBilling, PlatformIntegration, FeatureFlag)
// ─────────────────────────────────────────────────────────────────────────────

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_ON_USER
  RESOLVED
  CLOSED
  REOPENED
}

enum SupportTicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum SupportTicketCategory {
  BILLING
  TECHNICAL
  ONBOARDING
  FEATURE_REQUEST
  BUG
  DATA_MIGRATION
  OTHER
}

enum ProvisioningStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  ROLLED_BACK
}

model TenantProvisioning {
  id              String            @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String            @unique @map("school_id") @db.Uuid
  status          ProvisioningStatus @default(PENDING)
  plan            String            @db.VarChar(32) // STARTER, GROWTH, ENTERPRISE
  steps           Json              // [{ step, status, startedAt, completedAt, error }]
  currentStep     String?           @map("current_step") @db.VarChar(80)
  initiatedById   String            @map("initiated_by_id") @db.Uuid
  completedAt     DateTime?         @map("completed_at") @db.Timestamptz
  failureReason   String?           @map("failure_reason") @db.Text
  metadata        Json?
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  school          School            @relation("TenantProvisioningSchool", fields: [schoolId], references: [id], onDelete: Cascade)
  initiatedBy     User              @relation("ProvisioningInitiatedBy", fields: [initiatedById], references: [id])

  @@index([status])
  @@map("tenant_provisionings")
}

model SupportTicket {
  id              String                  @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                  @map("school_id") @db.Uuid
  raisedById      String                  @map("raised_by_id") @db.Uuid
  assignedToId    String?                 @map("assigned_to_id") @db.Uuid
  ticketNumber    String                  @map("ticket_number") @db.VarChar(32)
  subject         String                  @db.VarChar(200)
  description     String                  @db.Text
  category        SupportTicketCategory   @default(OTHER)
  status          SupportTicketStatus     @default(OPEN)
  priority        SupportTicketPriority   @default(MEDIUM)
  tags            String[]                @default([])
  attachments     Json?
  firstResponseAt DateTime?               @map("first_response_at") @db.Timestamptz
  resolvedAt      DateTime?               @map("resolved_at") @db.Timestamptz
  closedAt        DateTime?               @map("closed_at") @db.Timestamptz
  satisfactionRating Int?                 @map("satisfaction_rating") // 1-5
  createdAt       DateTime                @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime                @updatedAt @map("updated_at") @db.Timestamptz

  school          School                  @relation("SupportTicketSchool", fields: [schoolId], references: [id], onDelete: Cascade)
  raisedBy        User                    @relation("TicketRaisedBy", fields: [raisedById], references: [id])
  assignedTo      User?                   @relation("TicketAssignedTo", fields: [assignedToId], references: [id])
  comments        SupportTicketComment[]

  @@unique([schoolId, ticketNumber])
  @@index([schoolId, status])
  @@index([priority, status])
  @@map("support_tickets")
}

model SupportTicketComment {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  ticketId        String        @map("ticket_id") @db.Uuid
  authorId        String        @map("author_id") @db.Uuid
  body            String        @db.Text
  isInternal      Boolean       @default(false) @map("is_internal")
  attachments     Json?
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  ticket          SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author          User          @relation("TicketCommentAuthor", fields: [authorId], references: [id])

  @@index([ticketId, createdAt])
  @@map("support_ticket_comments")
}
`;

const current = fs.readFileSync(SCHEMA_PATH, 'utf8');
const updated = current.replace(/\n$/, '') + '\n' + NEW_MODELS;
fs.writeFileSync(SCHEMA_PATH, updated);
console.log('Schema extended successfully');
console.log('Previous size:', current.length, 'bytes');
console.log('New size:', updated.length, 'bytes');
