#!/usr/bin/env python3
"""
Wave 12 — Append new Prisma models + enums for HR/Inventory/Administration compliance.

Adds:
  HR (5 new models):
    - SubstituteAssignment (R-HR-005)
    - IccCommittee + IccCommitteeMember (R-HR-009)
    - TrainingRecord (R-HR-010 POSH + R-HR-011 Food Handler)
    - PositionOpening (R-APR-010)
    - SalaryRevision (R-APR-011)

  Inventory (4 new models):
    - ExpiredItemDisposal (R-INV-004)
    - StockAudit + StockAuditLine (R-INV-009)
    - ReturnNote + ReturnNoteLine (R-INV-010)
    - ReorderAlert (R-INV-001)

  Administration (3 new models):
    - ComplianceItem (R-CMP-005/007/013/014/017/018)
    - FoodSampleRetention (R-OPS-018)
    - CctvCoverage (R-OPS-020)

  Extensions to existing models (via ALTER TABLE in migration):
    - Employee: probation_reviewed_at, probation_extended_until, exit_notice_period_days, final_settlement_due_at
    - LeaveRequest: carry_forward_balance, year_credited_at
    - PayrollRun: cutoff_locked_at
    - PerformanceReview: cycle_start_date, cycle_end_date
    - InventoryItem: fifo_issue_policy
    - Supplier: last_rating_at, improvement_period_ends_at
    - PurchaseOrder: approval_level, current_approver_id
    - Asset: depreciation_rate, depreciation_method, accumulated_depreciation_cents, book_value_cents, disposal_method
"""
from pathlib import Path

SCHEMA_PATH = Path('/home/z/my-project/preone/packages/database/prisma/schema.prisma')

# New enums
NEW_ENUMS = '''
// ===== Wave 12 — Compliance enums =====

enum ComplianceCategory {
  FIRE_NOC              // R-CMP-007 — Fire NOC Renewal
  FIRE_EXTINGUISHER     // R-CMP-014 — Fire Extinguisher Inspection
  FIRE_DRILL            // R-CMP-013 — Quarterly Fire Drill
  FSSAI_LICENSE         // R-CMP-017 — FSSAI Kitchen License
  CCTV_RETENTION        // R-CMP-005 — CCTV Retention Period
  POSH_TRAINING         // R-CMP-011 — POSH Training for All Staff
  FOOD_HANDLER_MEDICAL  // R-CMP-018 + R-HR-011 — Food Handler Medical Certificate
  ICC_CONSTITUTION      // R-HR-009 — ICC annual constitution
  STAFF_BG_VERIFICATION // R-HR-002 — Background verification
}

enum ComplianceStatus {
  PENDING       // not yet started / no record
  ACTIVE        // current and within validity
  EXPIRING_SOON // within 30 days of expiry
  EXPIRED       // past expiry date
  OVERDUE       // missed renewal
  WAIVED        // formally waived with reason
}

enum DisposalMethod {
  SALE      // sell to third party
  SCRAP     // discard as scrap
  DONATION  // donate to NGO/school
  WRITE_OFF // accounting write-off only (no physical disposal)
}

enum DepreciationMethod {
  STRAIGHT_LINE   // (cost - salvage) / useful_life
  DECLINING_BALANCE // 2x straight-line rate on remaining book value
  UNITS_OF_PRODUCTION // per unit of usage
}

enum ReorderStatus {
  CREATED      // PR created, awaiting approval
  APPROVED     // Branch Admin approved
  REJECTED     // Branch Admin rejected
  CONVERTED    // converted to PurchaseOrder
  CANCELLED    // cancelled
}

enum StockAuditStatus {
  SCHEDULED    // audit scheduled
  IN_PROGRESS  // physical count underway
  RECONCILING  // system vs physical reconciliation
  COMPLETED    // finalized
  ADJUSTED     // adjustments applied with Branch Head approval
}

enum StockAuditVarianceAction {
  NONE               // within 5% tolerance
  INVESTIGATION      // >5% variance — investigation triggered
  ADJUSTMENT_APPLIED // adjustment approved by Branch Head
}

enum ReturnReason {
  DAMAGED         // item received damaged
  EXPIRED         // item expired on receipt
  WRONG_ITEM      // wrong item shipped
  QUALITY_ISSUE   // quality below standard
  EXCESS_QUANTITY // over-shipped
  RECALL          // vendor recall
  OTHER
}

enum ReturnStatus {
  INITIATED    // return note created
  APPROVED     // approved by Inventory Manager
  PICKUP_SCHEDULED // vendor pickup scheduled
  RETURNED     // item handed over to vendor
  CREDIT_RECEIVED // credit note received
  CANCELLED
}

enum TrainingType {
  POSH                // R-HR-010 — Sexual Harassment Prevention
  FOOD_HANDLER_MEDICAL // R-HR-011 — Food handler medical (overlap with ComplianceItem)
  FIRE_SAFETY         // Fire safety training
  FIRST_AID           // Pediatric first aid
  CHILD_SAFEGUARDING  // Child protection policy
  GENERAL_INDUCTION   // New staff induction
  OTHER
}

enum TrainingStatus {
  ASSIGNED     // training assigned, not started
  IN_PROGRESS  // staff started the module
  COMPLETED    // quiz passed (>=80% for POSH)
  FAILED       // quiz failed
  EXPIRED      // certificate expired (validity period passed)
  BLOCKED      // payroll blocked due to non-completion (R-HR-010)
}

enum IccMemberRole {
  CHAIRPERSON     // senior woman employee — mandatory
  MEMBER          // regular member
  EXTERNAL_MEMBER // external NGO/representative (mandatory)
}

enum PositionStatus {
  OPEN         // position approved, hiring started
  ON_HOLD      // hiring paused
  FILLED       // employee onboarded
  CANCELLED    // position withdrawn
}

enum SalaryRevisionStatus {
  PENDING      // awaiting approver
  APPROVED     // approved
  REJECTED     // rejected
  EFFECTIVE    // salary change applied
}

enum SubstituteStatus {
  ASSIGNED    // substitute assigned
  DECLINED    // substitute declined
  COMPLETED   // assignment completed
  CANCELLED   // original teacher returned
}
'''

# New models — each maps to a BRC rule
NEW_MODELS = '''
// ===== Wave 12 — HR Compliance =====

/// R-HR-005 — Substitute Teacher Assignment
/// When teacher is absent (approved leave or unplanned), auto-assign from
/// substitute pool; if unavailable, Coordinator covers; parent notification
/// if delay >30 min.
model SubstituteAssignment {
  id                String          @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId          String          @map("school_id") @db.Uuid
  branchId          String          @map("branch_id") @db.Uuid
  absentEmployeeId  String          @map("absent_employee_id") @db.Uuid
  substituteEmployeeId String?      @map("substitute_employee_id") @db.Uuid
  sectionId         String          @map("section_id") @db.Uuid
  date              DateTime        @db.Date
  startTime         DateTime        @map("start_time") @db.Timestamptz
  endTime           DateTime?       @map("end_time") @db.Timestamptz
  status            SubstituteStatus @default(ASSIGNED)
  assignmentReason  String          @map("assignment_reason") @db.VarChar(100) // APPROVED_LEAVE | UNPLANNED_ABSENCE | EMERGENCY
  fallbackStrategy  String?         @map("fallback_strategy") @db.VarChar(50)  // COORDINATOR_COVERS | CLASS_MERGED
  parentNotifiedAt  DateTime?       @map("parent_notified_at") @db.Timestamptz
  parentNotificationDelayMinutes Int? @map("parent_notification_delay_minutes")
  notes             String?         @db.Text
  createdAt         DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime        @updatedAt @map("updated_at") @db.Timestamptz

  school            School          @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch            Branch          @relation(fields: [branchId], references: [id], onDelete: Cascade)
  absentEmployee    Employee        @relation("SubstituteForAbsent", fields: [absentEmployeeId], references: [id])
  substituteEmployee Employee?      @relation("SubstituteAssigned", fields: [substituteEmployeeId], references: [id])

  @@unique([branchId, sectionId, date])
  @@index([schoolId, date])
  @@index([absentEmployeeId, date])
  @@map("substitute_assignments")
}

/// R-HR-009 — Internal Complaints Committee (ICC)
/// Annual ICC constitution (April). Mandatory: chairperson (senior woman),
/// 2+ members, 1+ external member (NGO/representative).
model IccCommittee {
  id              String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String   @map("school_id") @db.Uuid
  branchId        String?  @map("branch_id") @db.Uuid // null = school-wide
  constitutionDate DateTime @map("constitution_date") @db.Date // April 1 of FY
  fiscalYear      String   @map("fiscal_year") @db.VarChar(9) // "2026-2027"
  status          String   @default("ACTIVE") @db.VarChar(20) // ACTIVE | DISSOLVED
  publishedAt     DateTime? @map("published_at") @db.Timestamptz // notice board + handbook
  dissolvedAt     DateTime? @map("dissolved_at") @db.Timestamptz
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?  @relation("IccBranch", fields: [branchId], references: [id])
  members         IccCommitteeMember[]

  @@unique([schoolId, fiscalYear, branchId])
  @@map("icc_committees")
}

model IccCommitteeMember {
  id          String       @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  committeeId String       @map("committee_id") @db.Uuid
  employeeId  String       @map("employee_id") @db.Uuid
  role        IccMemberRole
  externalOrgName String?  @map("external_org_name") @db.VarChar(200) // for EXTERNAL_MEMBER
  appointedAt DateTime     @map("appointed_at") @db.Date
  isActive    Boolean      @default(true) @map("is_active")
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  committee   IccCommittee @relation(fields: [committeeId], references: [id], onDelete: Cascade)
  employee    Employee     @relation("IccMember", fields: [employeeId], references: [id])

  @@unique([committeeId, employeeId])
  @@map("icc_committee_members")
}

/// R-HR-010 (POSH) + R-HR-011 (Food Handler Medical) — generic training/medical record
/// Annual training cycle; quiz with 80% pass mark; certificate valid 1 year;
/// non-completion blocks payroll (R-HR-010).
model TrainingRecord {
  id              String         @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String         @map("school_id") @db.Uuid
  employeeId      String         @map("employee_id") @db.Uuid
  trainingType    TrainingType
  status          TrainingStatus @default(ASSIGNED)
  assignedAt      DateTime       @map("assigned_at") @db.Timestamptz
  startedAt       DateTime?      @map("started_at") @db.Timestamptz
  completedAt     DateTime?      @map("completed_at") @db.Timestamptz
  certificateNumber String?      @map("certificate_number") @db.VarChar(100)
  certificateUrl  String?        @map("certificate_url") @db.VarChar(500)
  certificateValidUntil DateTime? @map("certificate_valid_until") @db.Date
  quizScore       Int?           @map("quiz_score") // 0-100
  passMark        Int            @default(80) @map("pass_mark")
  payrollBlockedAt DateTime?     @map("payroll_blocked_at") @db.Timestamptz // R-HR-010
  notes           String?        @db.Text
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz

  school          School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  employee        Employee       @relation("EmployeeTrainings", fields: [employeeId], references: [id])

  @@unique([schoolId, employeeId, trainingType, assignedAt])
  @@index([schoolId, trainingType, status])
  @@index([employeeId, status])
  @@map("training_records")
}

/// R-APR-010 — New Position Approval
/// Multi-level approval for creating a new position (Director → Board).
model PositionOpening {
  id              String         @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String         @map("school_id") @db.Uuid
  branchId        String         @map("branch_id") @db.Uuid
  positionCode    String         @map("position_code") @db.VarChar(32)
  role            String         @db.VarChar(50) // StaffRole enum value
  designation     String         @db.VarChar(100)
  employmentType  String         @map("employment_type") @db.VarChar(20)
  budgetedSalaryCents BigInt     @map("budgeted_salary_cents")
  justification   String         @db.Text
  status          PositionStatus @default(OPEN)
  approvedByDirectorId String?   @map("approved_by_director_id") @db.Uuid
  approvedByDirectorAt DateTime? @map("approved_by_director_at") @db.Timestamptz
  boardApprovalRequired Boolean  @default(false) @map("board_approval_required")
  boardApprovedAt DateTime?      @map("board_approved_at") @db.Timestamptz
  filledAt        DateTime?      @map("filled_at") @db.Timestamptz
  filledByEmployeeId String?     @map("filled_by_employee_id") @db.Uuid
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz

  school          School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch         @relation("PositionBranch", fields: [branchId], references: [id])
  approvedByDirector User?       @relation("PositionApprovedBy", fields: [approvedByDirectorId], references: [id])
  filledByEmployee  Employee?    @relation("PositionFilledBy", fields: [filledByEmployeeId], references: [id])

  @@unique([schoolId, positionCode])
  @@map("position_openings")
}

/// R-APR-011 — Salary Revision Approval
/// Approves a salary change (raise/promotion). Requires Director + Board approval
/// if delta > 25% (configurable per school).
model SalaryRevision {
  id                String             @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId          String             @map("school_id") @db.Uuid
  employeeId        String             @map("employee_id") @db.Uuid
  currentSalaryCents BigInt            @map("current_salary_cents")
  proposedSalaryCents BigInt           @map("proposed_salary_cents")
  deltaPercent      Decimal            @map("delta_percent") @db.Decimal(5,2)
  effectiveDate     DateTime           @map("effective_date") @db.Date
  reason            String             @db.VarChar(200) // ANNUAL_REVIEW | PROMOTION | MARKET_CORRECTION | RETENTION
  status            SalaryRevisionStatus @default(PENDING)
  requestedById     String             @map("requested_by_id") @db.Uuid
  approvedByManagerId String?          @map("approved_by_manager_id") @db.Uuid
  approvedByManagerAt DateTime?        @map("approved_by_manager_at") @db.Timestamptz
  approvedByDirectorId String?         @map("approved_by_director_id") @db.Uuid
  approvedByDirectorAt DateTime?       @map("approved_by_director_at") @db.Timestamptz
  boardApprovalRequired Boolean        @default(false) @map("board_approval_required")
  boardApprovedAt   DateTime?          @map("board_approved_at") @db.Timestamptz
  rejectionReason   String?            @db.Text
  appliedAt         DateTime?          @map("applied_at") @db.Timestamptz
  createdAt         DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  school            School             @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  employee          Employee           @relation("EmployeeSalaryRevisions", fields: [employeeId], references: [id])
  requestedBy       User               @relation("SalaryRevisionRequestedBy", fields: [requestedById], references: [id])
  approvedByManager User?              @relation("SalaryRevisionManagerApproval", fields: [approvedByManagerId], references: [id])
  approvedByDirector User?             @relation("SalaryRevisionDirectorApproval", fields: [approvedByDirectorId], references: [id])

  @@index([schoolId, status])
  @@index([employeeId, status])
  @@map("salary_revisions")
}

// ===== Wave 12 — Inventory Compliance =====

/// R-INV-001 — Auto Reorder Trigger
/// When stock <= reorderLevel, system auto-creates PR (Purchase Request)
/// routed to Branch Admin for approval; sets expected delivery date.
model ReorderAlert {
  id              String        @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String        @map("school_id") @db.Uuid
  branchId        String        @map("branch_id") @db.Uuid
  itemId          String        @map("item_id") @db.Uuid
  currentStock    Decimal       @map("current_stock") @db.Decimal(12,3)
  reorderLevel    Decimal       @map("reorder_level") @db.Decimal(12,3)
  suggestedQty    Decimal       @map("suggested_qty") @db.Decimal(12,3)
  suggestedVendorId String?     @map("suggested_vendor_id") @db.Uuid
  status          ReorderStatus @default(CREATED)
  expectedDeliveryDate DateTime? @map("expected_delivery_date") @db.Date
  approvedById    String?       @map("approved_by_id") @db.Uuid
  approvedAt      DateTime?     @map("approved_at") @db.Timestamptz
  rejectionReason String?       @db.Text
  convertedPoId   String?       @map("converted_po_id") @db.Uuid
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  school          School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch        @relation("ReorderBranch", fields: [branchId], references: [id])
  item            InventoryItem @relation("ReorderItem", fields: [itemId], references: [id])
  suggestedVendor Supplier?     @relation("ReorderSuggestedVendor", fields: [suggestedVendorId], references: [id])

  @@index([schoolId, status])
  @@index([itemId, status])
  @@map("reorder_alerts")
}

/// R-INV-004 — Expired Item Disposal
/// Item crosses expiry date → mark 'Expired - Dispose'; generate disposal log;
/// Inventory Manager + Branch Head joint approval for write-off.
model ExpiredItemDisposal {
  id              String         @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String         @map("school_id") @db.Uuid
  branchId        String         @map("branch_id") @db.Uuid
  itemId          String         @map("item_id") @db.Uuid
  batchId         String?        @map("batch_id") @db.Uuid
  quantity        Decimal        @db.Decimal(12,3)
  expiryDate      DateTime       @map("expiry_date") @db.Date
  disposedAt      DateTime?      @map("disposed_at") @db.Timestamptz
  disposalMethod  DisposalMethod @default(WRITE_OFF)
  writeOffValueCents BigInt      @default(0) @map("write_off_value_cents")
  status          String         @default("PENDING_APPROVAL") @db.VarChar(30) // PENDING_APPROVAL | APPROVED | DISPOSED | REJECTED
  inventoryManagerApprovedAt DateTime? @map("inv_mgr_approved_at") @db.Timestamptz
  branchHeadApprovedAt DateTime? @map("branch_head_approved_at") @db.Timestamptz
  disposalLogUrl  String?        @map("disposal_log_url") @db.VarChar(500)
  notes           String?        @db.Text
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz

  school          School         @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch         @relation("DisposalBranch", fields: [branchId], references: [id])
  item            InventoryItem  @relation("DisposalItem", fields: [itemId], references: [id])

  @@index([schoolId, status])
  @@index([itemId, status])
  @@map("expired_item_disposals")
}

/// R-INV-009 — Stock Audit Frequency
/// Quarterly audit cycle. Physical count; reconcile with system;
/// variance >5% triggers investigation; Branch Head approval for adjustments.
model StockAudit {
  id              String                 @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String                 @map("school_id") @db.Uuid
  branchId        String                 @map("branch_id") @db.Uuid
  auditNumber     String                 @map("audit_number") @db.VarChar(32)
  quarter         String                 @db.VarChar(8) // "2026-Q1"
  scheduledDate   DateTime               @map("scheduled_date") @db.Date
  startedAt       DateTime?              @map("started_at") @db.Timestamptz
  completedAt     DateTime?              @map("completed_at") @db.Timestamptz
  status          StockAuditStatus       @default(SCHEDULED)
  varianceAction  StockAuditVarianceAction @default(NONE)
  totalItems      Int      @default(0)   @map("total_items")
  itemsWithVariance Int    @default(0)   @map("items_with_variance")
  totalVarianceValueCents BigInt          @default(0) @map("total_variance_value_cents")
  branchHeadApprovedAt DateTime?         @map("branch_head_approved_at") @db.Timestamptz
  notes           String?                @db.Text
  createdAt       DateTime               @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime               @updatedAt @map("updated_at") @db.Timestamptz

  school          School                 @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch                 @relation("AuditBranch", fields: [branchId], references: [id])
  lines           StockAuditLine[]

  @@unique([schoolId, auditNumber])
  @@unique([branchId, quarter])
  @@map("stock_audits")
}

model StockAuditLine {
  id              String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  auditId         String   @map("audit_id") @db.Uuid
  itemId          String   @map("item_id") @db.Uuid
  systemQty       Decimal  @map("system_qty") @db.Decimal(12,3)
  physicalQty     Decimal  @map("physical_qty") @db.Decimal(12,3)
  varianceQty     Decimal  @map("variance_qty") @db.Decimal(12,3)
  variancePercent Decimal  @map("variance_percent") @db.Decimal(6,2)
  unitCostCents   BigInt   @map("unit_cost_cents")
  varianceValueCents BigInt @map("variance_value_cents")
  notes           String?  @db.Text

  audit           StockAudit @relation(fields: [auditId], references: [id], onDelete: Cascade)
  item            InventoryItem @relation("AuditItem", fields: [itemId], references: [id])

  @@index([auditId, itemId])
  @@map("stock_audit_lines")
}

/// R-INV-010 — Return Window
/// Item return request → generate return note; vendor pickup arranged;
/// credit note raised.
model ReturnNote {
  id              String       @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String       @map("school_id") @db.Uuid
  branchId        String       @map("branch_id") @db.Uuid
  returnNumber    String       @map("return_number") @db.VarChar(32)
  supplierId      String       @map("supplier_id") @db.Uuid
  poId            String?      @map("po_id") @db.Uuid
  grnId           String?      @map("grn_id") @db.Uuid
  reason          ReturnReason
  status          ReturnStatus @default(INITIATED)
  initiatedAt     DateTime     @default(now()) @map("initiated_at") @db.Timestamptz
  approvedAt      DateTime?    @map("approved_at") @db.Timestamptz
  pickupScheduledAt DateTime?  @map("pickup_scheduled_at") @db.Timestamptz
  returnedAt      DateTime?    @map("returned_at") @db.Timestamptz
  creditNoteNumber String?     @map("credit_note_number") @db.VarChar(64)
  creditNoteAmountCents BigInt? @map("credit_note_amount_cents")
  creditReceivedAt DateTime?   @map("credit_received_at") @db.Timestamptz
  notes           String?      @db.Text
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  school          School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch       @relation("ReturnBranch", fields: [branchId], references: [id])
  supplier        Supplier     @relation("ReturnSupplier", fields: [supplierId], references: [id])
  po              PurchaseOrder? @relation("ReturnPo", fields: [poId], references: [id])
  lines           ReturnNoteLine[]

  @@unique([schoolId, returnNumber])
  @@index([supplierId, status])
  @@map("return_notes")
}

model ReturnNoteLine {
  id              String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  returnNoteId    String   @map("return_note_id") @db.Uuid
  itemId          String   @map("item_id") @db.Uuid
  batchId         String?  @map("batch_id") @db.Uuid
  quantity        Decimal  @db.Decimal(12,3)
  unitCostCents   BigInt   @map("unit_cost_cents")
  totalValueCents BigInt   @map("total_value_cents")
  notes           String?  @db.Text

  returnNote      ReturnNote @relation(fields: [returnNoteId], references: [id], onDelete: Cascade)
  item            InventoryItem @relation("ReturnItem", fields: [itemId], references: [id])

  @@index([returnNoteId, itemId])
  @@map("return_note_lines")
}

// ===== Wave 12 — Administration / Facility Compliance =====

/// ComplianceItem — generic renewable compliance tracker.
/// Covers: R-CMP-005 (CCTV retention), R-CMP-007 (Fire NOC), R-CMP-013 (Fire Drill),
/// R-CMP-014 (Fire Extinguisher), R-CMP-017 (FSSAI License), R-CMP-018 (Food Handler Medical),
/// R-HR-009 (ICC constitution).
model ComplianceItem {
  id              String             @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String             @map("school_id") @db.Uuid
  branchId        String?            @map("branch_id") @db.Uuid // null = school-wide
  category        ComplianceCategory
  title           String             @db.VarChar(200)
  issuingAuthority String?           @map("issuing_authority") @db.VarChar(200)
  certificateNumber String?          @map("certificate_number") @db.VarChar(100)
  certificateUrl  String?            @map("certificate_url") @db.VarChar(500)
  issuedAt        DateTime?          @map("issued_at") @db.Date
  validFrom       DateTime           @map("valid_from") @db.Date
  validUntil      DateTime           @map("valid_until") @db.Date
  status          ComplianceStatus   @default(PENDING)
  renewalWindowDays Int              @default(30) @map("renewal_window_days")
  reminderSentAt  DateTime?          @map("reminder_sent_at") @db.Timestamptz
  overdueMarkedAt DateTime?          @map("overdue_marked_at") @db.Timestamptz
  waivedReason    String?            @map("waived_reason") @db.Text
  notes           String?            @db.Text
  createdAt       DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  school          School             @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch?            @relation("ComplianceBranch", fields: [branchId], references: [id])

  @@index([schoolId, category, status])
  @@index([validUntil])
  @@map("compliance_items")
}

/// R-OPS-018 — Food Sample Retention
/// Food samples must be retained for 24 hours post-serving for lab testing in
/// case of food poisoning incident.
model FoodSampleRetention {
  id              String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String   @map("school_id") @db.Uuid
  branchId        String   @map("branch_id") @db.Uuid
  mealType        String   @map("meal_type") @db.VarChar(20) // BREAKFAST | LUNCH | SNACK
  mealDate        DateTime @map("meal_date") @db.Date
  sampleCollectedAt DateTime @map("sample_collected_at") @db.Timestamptz
  storedAt        DateTime @map("stored_at") @db.Timestamptz
  storageLocation String   @map("storage_location") @db.VarChar(100)
  retentionUntil  DateTime @map("retention_until") @db.Timestamptz
  disposedAt      DateTime? @map("disposed_at") @db.Timestamptz
  disposalMethod  String?  @map("disposal_method") @db.VarChar(20)
  labTestRequestedAt DateTime? @map("lab_test_requested_at") @db.Timestamptz
  labTestResult   String?  @map("lab_test_result") @db.Text
  collectedByEmployeeId String? @map("collected_by_employee_id") @db.Uuid
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch   @relation("FoodSampleBranch", fields: [branchId], references: [id])
  collectedBy     Employee? @relation("FoodSampleCollectedBy", fields: [collectedByEmployeeId], references: [id])

  @@unique([branchId, mealType, mealDate])
  @@index([retentionUntil])
  @@map("food_sample_retentions")
}

/// R-OPS-020 — CCTV Coverage and Retention
/// Registry of CCTV cameras + retention enforcement (>=30 days, per R-CMP-005).
model CctvCoverage {
  id              String   @id @default(dbgenerated("uuid_v7()")) @db.Uuid
  schoolId        String   @map("school_id") @db.Uuid
  branchId        String   @map("branch_id") @db.Uuid
  cameraId        String   @map("camera_id") @db.VarChar(32)
  location        String   @db.VarChar(200)
  coverageZone    String   @map("coverage_zone") @db.VarChar(100) // ENTRANCE | CLASSROOM | PLAY_AREA | KITCHEN | CORRIDOR
  installedAt     DateTime @map("installed_at") @db.Date
  isActive        Boolean  @default(true) @map("is_active")
  retentionDays   Int      @default(30) @map("retention_days")
  storageEndpoint String?  @map("storage_endpoint") @db.VarChar(500)
  lastHealthCheckAt DateTime? @map("last_health_check_at") @db.Timestamptz
  lastHealthCheckStatus String? @map("last_health_check_status") @db.VarChar(20) // OK | DEGRADED | OFFLINE
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  school          School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch          Branch   @relation("CctvBranch", fields: [branchId], references: [id])

  @@unique([branchId, cameraId])
  @@index([schoolId, isActive])
  @@map("cctv_coverages")
}
'''

# Back-relations that need to be added to existing models.
# We'll inject these into the existing School, Branch, Employee, User, InventoryItem, Supplier, PurchaseOrder, Asset models.
BACK_RELATIONS = {
    'School': '''
  // Wave 12 back-relations
  substituteAssignments   SubstituteAssignment[]
  iccCommittees           IccCommittee[]
  trainingRecords         TrainingRecord[]
  positionOpenings        PositionOpening[]
  salaryRevisions         SalaryRevision[]
  reorderAlerts           ReorderAlert[]
  expiredItemDisposals    ExpiredItemDisposal[]
  stockAudits             StockAudit[]
  returnNotes             ReturnNote[]
  complianceItems         ComplianceItem[]
  foodSampleRetentions    FoodSampleRetention[]
  cctvCoverages           CctvCoverage[]''',
    'Branch': '''
  // Wave 12 back-relations
  substituteAssignments   SubstituteAssignment[]
  iccCommittees           IccCommittee[]      @relation("IccBranch")
  positionOpenings        PositionOpening[]   @relation("PositionBranch")
  reorderAlerts           ReorderAlert[]      @relation("ReorderBranch")
  expiredItemDisposals    ExpiredItemDisposal[] @relation("DisposalBranch")
  stockAudits             StockAudit[]        @relation("AuditBranch")
  returnNotes             ReturnNote[]        @relation("ReturnBranch")
  complianceItems         ComplianceItem[]    @relation("ComplianceBranch")
  foodSampleRetentions    FoodSampleRetention[] @relation("FoodSampleBranch")
  cctvCoverages           CctvCoverage[]      @relation("CctvBranch")''',
    'Employee': '''
  // Wave 12 back-relations
  substituteForAbsences   SubstituteAssignment[] @relation("SubstituteForAbsent")
  substituteAssignments   SubstituteAssignment[] @relation("SubstituteAssigned")
  iccMemberships          IccCommitteeMember[]   @relation("IccMember")
  trainings               TrainingRecord[]       @relation("EmployeeTrainings")
  filledPositions         PositionOpening[]      @relation("PositionFilledBy")
  salaryRevisions         SalaryRevision[]       @relation("EmployeeSalaryRevisions")
  foodSamplesCollected    FoodSampleRetention[]  @relation("FoodSampleCollectedBy")''',
    'User': '''
  // Wave 12 back-relations
  positionApprovalsDirector  PositionOpening[]    @relation("PositionApprovedBy")
  salaryRevisionRequested    SalaryRevision[]     @relation("SalaryRevisionRequestedBy")
  salaryRevisionManagerApproval SalaryRevision[]  @relation("SalaryRevisionManagerApproval")
  salaryRevisionDirectorApproval SalaryRevision[] @relation("SalaryRevisionDirectorApproval")''',
    'InventoryItem': '''
  // Wave 12 back-relations
  reorderAlerts           ReorderAlert[]      @relation("ReorderItem")
  expiredItemDisposals    ExpiredItemDisposal[] @relation("DisposalItem")
  stockAuditLines         StockAuditLine[]    @relation("AuditItem")
  returnNoteLines         ReturnNoteLine[]    @relation("ReturnItem")''',
    'Supplier': '''
  // Wave 12 back-relations
  reorderSuggestions      ReorderAlert[]      @relation("ReorderSuggestedVendor")
  returnNotes             ReturnNote[]        @relation("ReturnSupplier")''',
    'PurchaseOrder': '''
  // Wave 12 back-relations
  returnNotes             ReturnNote[]        @relation("ReturnPo")''',
}

def main():
    schema_text = SCHEMA_PATH.read_text()

    # 1. Sanity-check we don't already have any of the new model names
    new_model_names = ['SubstituteAssignment', 'IccCommittee', 'IccCommitteeMember',
                       'TrainingRecord', 'PositionOpening', 'SalaryRevision',
                       'ReorderAlert', 'ExpiredItemDisposal', 'StockAudit', 'StockAuditLine',
                       'ReturnNote', 'ReturnNoteLine', 'ComplianceItem',
                       'FoodSampleRetention', 'CctvCoverage']
    for name in new_model_names:
        if f'model {name} ' in schema_text or f'model {name} {{' in schema_text:
            raise SystemExit(f'ERROR: model {name} already exists in schema — refusing to overwrite')

    # 2. Append new enums + models at end of file
    new_block = '\n\n' + NEW_ENUMS.strip() + '\n\n' + NEW_MODELS.strip() + '\n'
    schema_text = schema_text.rstrip() + new_block

    # 3. Inject back-relations into existing models
    for model_name, rels_text in BACK_RELATIONS.items():
        marker = f'model {model_name} {{'
        idx = schema_text.find(marker)
        if idx < 0:
            print(f'WARNING: model {model_name} not found in schema — skipping back-relations')
            continue
        # Find the closing brace of this model
        brace_idx = schema_text.find('{', idx)
        depth = 1
        i = brace_idx + 1
        while i < len(schema_text) and depth > 0:
            if schema_text[i] == '{':
                depth += 1
            elif schema_text[i] == '}':
                depth -= 1
            i += 1
        close_idx = i - 1  # position of the closing }
        # Insert back-relations just before the closing brace
        schema_text = schema_text[:close_idx] + rels_text + '\n' + schema_text[close_idx:]
        print(f'OK — injected back-relations into model {model_name}')

    SCHEMA_PATH.write_text(schema_text)
    print(f'\nSchema updated. New size: {len(schema_text)} bytes / {schema_text.count(chr(10))} lines')

if __name__ == '__main__':
    main()
