-- ============================================================
-- Wave 12 — HR/Inventory/Administration Compliance Migration
-- Migration ID: 20260716000004_wave_12_compliance_hr_inv_admin
-- Date: 2026-07-16
--
-- Implements BRC compliance rules:
--   HR:         R-HR-005, R-HR-009, R-HR-010, R-HR-011, R-APR-010, R-APR-011
--   Inventory:  R-INV-001, R-INV-004, R-INV-009, R-INV-010
--   Admin:      R-CMP-005, R-CMP-007, R-CMP-013, R-CMP-014, R-CMP-017, R-CMP-018,
--               R-OPS-018, R-OPS-020, R-HR-009 (ICC)
-- ============================================================

-- ===== Wave 12 — New enums =====

CREATE TYPE "ComplianceCategory" AS ENUM (
  'FIRE_NOC', 'FIRE_EXTINGUISHER', 'FIRE_DRILL', 'FSSAI_LICENSE',
  'CCTV_RETENTION', 'POSH_TRAINING', 'FOOD_HANDLER_MEDICAL',
  'ICC_CONSTITUTION', 'STAFF_BG_VERIFICATION'
);

CREATE TYPE "ComplianceStatus" AS ENUM (
  'PENDING', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'OVERDUE', 'WAIVED'
);

CREATE TYPE "DisposalMethod" AS ENUM (
  'SALE', 'SCRAP', 'DONATION', 'WRITE_OFF'
);

CREATE TYPE "DepreciationMethod" AS ENUM (
  'STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION'
);

CREATE TYPE "ReorderStatus" AS ENUM (
  'CREATED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED'
);

CREATE TYPE "StockAuditStatus" AS ENUM (
  'SCHEDULED', 'IN_PROGRESS', 'RECONCILING', 'COMPLETED', 'ADJUSTED'
);

CREATE TYPE "StockAuditVarianceAction" AS ENUM (
  'NONE', 'INVESTIGATION', 'ADJUSTMENT_APPLIED'
);

CREATE TYPE "ReturnReason" AS ENUM (
  'DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'QUALITY_ISSUE',
  'EXCESS_QUANTITY', 'RECALL', 'OTHER'
);

CREATE TYPE "ReturnStatus" AS ENUM (
  'INITIATED', 'APPROVED', 'PICKUP_SCHEDULED', 'RETURNED',
  'CREDIT_RECEIVED', 'CANCELLED'
);

CREATE TYPE "TrainingType" AS ENUM (
  'POSH', 'FOOD_HANDLER_MEDICAL', 'FIRE_SAFETY', 'FIRST_AID',
  'CHILD_SAFEGUARDING', 'GENERAL_INDUCTION', 'OTHER'
);

CREATE TYPE "TrainingStatus" AS ENUM (
  'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'BLOCKED'
);

CREATE TYPE "IccMemberRole" AS ENUM (
  'CHAIRPERSON', 'MEMBER', 'EXTERNAL_MEMBER'
);

CREATE TYPE "PositionStatus" AS ENUM (
  'OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED'
);

CREATE TYPE "SalaryRevisionStatus" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'EFFECTIVE'
);

CREATE TYPE "SubstituteStatus" AS ENUM (
  'ASSIGNED', 'DECLINED', 'COMPLETED', 'CANCELLED'
);

-- ===== Wave 12 — HR tables =====

-- R-HR-005 — Substitute Teacher Assignment
CREATE TABLE "substitute_assignments" (
  "id"                                UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                         UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                         UUID NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
  "absent_employee_id"                UUID NOT NULL REFERENCES "employees"("id"),
  "substitute_employee_id"            UUID REFERENCES "employees"("id"),
  "section_id"                        UUID NOT NULL,
  "date"                              DATE NOT NULL,
  "start_time"                        TIMESTAMPTZ NOT NULL,
  "end_time"                          TIMESTAMPTZ,
  "status"                            "SubstituteStatus" NOT NULL DEFAULT 'ASSIGNED',
  "assignment_reason"                 VARCHAR(100) NOT NULL,
  "fallback_strategy"                 VARCHAR(50),
  "parent_notified_at"                TIMESTAMPTZ,
  "parent_notification_delay_minutes" INTEGER,
  "notes"                             TEXT,
  "created_at"                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_substitute_branch_section_date" UNIQUE ("branch_id", "section_id", "date")
);
CREATE INDEX "idx_substitute_school_date"        ON "substitute_assignments" ("school_id", "date");
CREATE INDEX "idx_substitute_absent_date"        ON "substitute_assignments" ("absent_employee_id", "date");

-- R-HR-009 — ICC Committee
CREATE TABLE "icc_committees" (
  "id"                UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"         UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"         UUID REFERENCES "branches"("id"),
  "constitution_date" DATE NOT NULL,
  "fiscal_year"       VARCHAR(9) NOT NULL,
  "status"            VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  "published_at"      TIMESTAMPTZ,
  "dissolved_at"      TIMESTAMPTZ,
  "notes"             TEXT,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_icc_school_fy_branch" UNIQUE ("school_id", "fiscal_year", "branch_id")
);

CREATE TABLE "icc_committee_members" (
  "id"              UUID PRIMARY KEY DEFAULT uuid_v7(),
  "committee_id"    UUID NOT NULL REFERENCES "icc_committees"("id") ON DELETE CASCADE,
  "employee_id"     UUID NOT NULL REFERENCES "employees"("id"),
  "role"            "IccMemberRole" NOT NULL,
  "external_org_name" VARCHAR(200),
  "appointed_at"    DATE NOT NULL,
  "is_active"       BOOLEAN NOT NULL DEFAULT true,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_icc_member_committee_employee" UNIQUE ("committee_id", "employee_id")
);

-- R-HR-010 / R-HR-011 — Training Records (POSH + Food Handler Medical)
CREATE TABLE "training_records" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "employee_id"                 UUID NOT NULL REFERENCES "employees"("id"),
  "training_type"               "TrainingType" NOT NULL,
  "status"                      "TrainingStatus" NOT NULL DEFAULT 'ASSIGNED',
  "assigned_at"                 TIMESTAMPTZ NOT NULL,
  "started_at"                  TIMESTAMPTZ,
  "completed_at"                TIMESTAMPTZ,
  "certificate_number"          VARCHAR(100),
  "certificate_url"             VARCHAR(500),
  "certificate_valid_until"     DATE,
  "quiz_score"                  INTEGER,
  "pass_mark"                   INTEGER NOT NULL DEFAULT 80,
  "payroll_blocked_at"          TIMESTAMPTZ,
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_training_school_emp_type_assigned" UNIQUE ("school_id", "employee_id", "training_type", "assigned_at")
);
CREATE INDEX "idx_training_school_type_status" ON "training_records" ("school_id", "training_type", "status");
CREATE INDEX "idx_training_emp_status"         ON "training_records" ("employee_id", "status");

-- R-APR-010 — New Position Approval
CREATE TABLE "position_openings" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                   UUID NOT NULL REFERENCES "branches"("id"),
  "position_code"               VARCHAR(32) NOT NULL,
  "role"                        VARCHAR(50) NOT NULL,
  "designation"                 VARCHAR(100) NOT NULL,
  "employment_type"             VARCHAR(20) NOT NULL,
  "budgeted_salary_cents"       BIGINT NOT NULL,
  "justification"               TEXT NOT NULL,
  "status"                      "PositionStatus" NOT NULL DEFAULT 'OPEN',
  "approved_by_director_id"     UUID REFERENCES "users"("id"),
  "approved_by_director_at"     TIMESTAMPTZ,
  "board_approval_required"     BOOLEAN NOT NULL DEFAULT false,
  "board_approved_at"           TIMESTAMPTZ,
  "filled_at"                   TIMESTAMPTZ,
  "filled_by_employee_id"       UUID REFERENCES "employees"("id"),
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_position_school_code" UNIQUE ("school_id", "position_code")
);

-- R-APR-011 — Salary Revision Approval
CREATE TABLE "salary_revisions" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "employee_id"                 UUID NOT NULL REFERENCES "employees"("id"),
  "current_salary_cents"        BIGINT NOT NULL,
  "proposed_salary_cents"       BIGINT NOT NULL,
  "delta_percent"               DECIMAL(5,2) NOT NULL,
  "effective_date"              DATE NOT NULL,
  "reason"                      VARCHAR(200) NOT NULL,
  "status"                      "SalaryRevisionStatus" NOT NULL DEFAULT 'PENDING',
  "requested_by_id"             UUID NOT NULL REFERENCES "users"("id"),
  "approved_by_manager_id"      UUID REFERENCES "users"("id"),
  "approved_by_manager_at"      TIMESTAMPTZ,
  "approved_by_director_id"     UUID REFERENCES "users"("id"),
  "approved_by_director_at"     TIMESTAMPTZ,
  "board_approval_required"     BOOLEAN NOT NULL DEFAULT false,
  "board_approved_at"           TIMESTAMPTZ,
  "rejection_reason"            TEXT,
  "applied_at"                  TIMESTAMPTZ,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "idx_salary_revision_school_status" ON "salary_revisions" ("school_id", "status");
CREATE INDEX "idx_salary_revision_emp_status"    ON "salary_revisions" ("employee_id", "status");

-- ===== Wave 12 — Inventory tables =====

-- R-INV-001 — Auto Reorder Trigger
CREATE TABLE "reorder_alerts" (
  "id"                       UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                UUID NOT NULL REFERENCES "branches"("id"),
  "item_id"                  UUID NOT NULL REFERENCES "inventory_items"("id"),
  "current_stock"            DECIMAL(12,3) NOT NULL,
  "reorder_level"            DECIMAL(12,3) NOT NULL,
  "suggested_qty"            DECIMAL(12,3) NOT NULL,
  "suggested_vendor_id"      UUID REFERENCES "suppliers"("id"),
  "status"                   "ReorderStatus" NOT NULL DEFAULT 'CREATED',
  "expected_delivery_date"   DATE,
  "approved_by_id"           UUID,
  "approved_at"              TIMESTAMPTZ,
  "rejection_reason"         TEXT,
  "converted_po_id"          UUID REFERENCES "purchase_orders"("id"),
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "idx_reorder_school_status" ON "reorder_alerts" ("school_id", "status");
CREATE INDEX "idx_reorder_item_status"   ON "reorder_alerts" ("item_id", "status");

-- R-INV-004 — Expired Item Disposal
CREATE TABLE "expired_item_disposals" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                   UUID NOT NULL REFERENCES "branches"("id"),
  "item_id"                     UUID NOT NULL REFERENCES "inventory_items"("id"),
  "batch_id"                    UUID,
  "quantity"                    DECIMAL(12,3) NOT NULL,
  "expiry_date"                 DATE NOT NULL,
  "disposed_at"                 TIMESTAMPTZ,
  "disposal_method"             "DisposalMethod" NOT NULL DEFAULT 'WRITE_OFF',
  "write_off_value_cents"       BIGINT NOT NULL DEFAULT 0,
  "status"                      VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  "inv_mgr_approved_at"         TIMESTAMPTZ,
  "branch_head_approved_at"     TIMESTAMPTZ,
  "disposal_log_url"            VARCHAR(500),
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "idx_disposal_school_status" ON "expired_item_disposals" ("school_id", "status");
CREATE INDEX "idx_disposal_item_status"   ON "expired_item_disposals" ("item_id", "status");

-- R-INV-009 — Stock Audit
CREATE TABLE "stock_audits" (
  "id"                            UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                     UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                     UUID NOT NULL REFERENCES "branches"("id"),
  "audit_number"                  VARCHAR(32) NOT NULL,
  "quarter"                       VARCHAR(8) NOT NULL,
  "scheduled_date"                DATE NOT NULL,
  "started_at"                    TIMESTAMPTZ,
  "completed_at"                  TIMESTAMPTZ,
  "status"                        "StockAuditStatus" NOT NULL DEFAULT 'SCHEDULED',
  "variance_action"               "StockAuditVarianceAction" NOT NULL DEFAULT 'NONE',
  "total_items"                   INTEGER NOT NULL DEFAULT 0,
  "items_with_variance"           INTEGER NOT NULL DEFAULT 0,
  "total_variance_value_cents"    BIGINT NOT NULL DEFAULT 0,
  "branch_head_approved_at"       TIMESTAMPTZ,
  "notes"                         TEXT,
  "created_at"                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_audit_school_number"     UNIQUE ("school_id", "audit_number"),
  CONSTRAINT "uq_audit_branch_quarter"    UNIQUE ("branch_id", "quarter")
);

CREATE TABLE "stock_audit_lines" (
  "id"                       UUID PRIMARY KEY DEFAULT uuid_v7(),
  "audit_id"                 UUID NOT NULL REFERENCES "stock_audits"("id") ON DELETE CASCADE,
  "item_id"                  UUID NOT NULL REFERENCES "inventory_items"("id"),
  "system_qty"               DECIMAL(12,3) NOT NULL,
  "physical_qty"             DECIMAL(12,3) NOT NULL,
  "variance_qty"             DECIMAL(12,3) NOT NULL,
  "variance_percent"         DECIMAL(6,2) NOT NULL,
  "unit_cost_cents"          BIGINT NOT NULL,
  "variance_value_cents"     BIGINT NOT NULL,
  "notes"                    TEXT
);
CREATE INDEX "idx_audit_line_audit_item" ON "stock_audit_lines" ("audit_id", "item_id");

-- R-INV-010 — Return Note
CREATE TABLE "return_notes" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                   UUID NOT NULL REFERENCES "branches"("id"),
  "return_number"               VARCHAR(32) NOT NULL,
  "supplier_id"                 UUID NOT NULL REFERENCES "suppliers"("id"),
  "po_id"                       UUID REFERENCES "purchase_orders"("id"),
  "grn_id"                      UUID,
  "reason"                      "ReturnReason" NOT NULL,
  "status"                      "ReturnStatus" NOT NULL DEFAULT 'INITIATED',
  "initiated_at"                TIMESTAMPTZ NOT NULL DEFAULT now(),
  "approved_at"                 TIMESTAMPTZ,
  "pickup_scheduled_at"         TIMESTAMPTZ,
  "returned_at"                 TIMESTAMPTZ,
  "credit_note_number"          VARCHAR(64),
  "credit_note_amount_cents"    BIGINT,
  "credit_received_at"          TIMESTAMPTZ,
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_return_school_number" UNIQUE ("school_id", "return_number")
);
CREATE INDEX "idx_return_supplier_status" ON "return_notes" ("supplier_id", "status");

CREATE TABLE "return_note_lines" (
  "id"                  UUID PRIMARY KEY DEFAULT uuid_v7(),
  "return_note_id"      UUID NOT NULL REFERENCES "return_notes"("id") ON DELETE CASCADE,
  "item_id"             UUID NOT NULL REFERENCES "inventory_items"("id"),
  "batch_id"            UUID,
  "quantity"            DECIMAL(12,3) NOT NULL,
  "unit_cost_cents"     BIGINT NOT NULL,
  "total_value_cents"   BIGINT NOT NULL,
  "notes"               TEXT
);
CREATE INDEX "idx_return_line_note_item" ON "return_note_lines" ("return_note_id", "item_id");

-- ===== Wave 12 — Administration / Facility Compliance =====

-- Generic Compliance Tracker — covers R-CMP-005, R-CMP-007, R-CMP-013, R-CMP-014, R-CMP-017, R-CMP-018, R-HR-009
CREATE TABLE "compliance_items" (
  "id"                       UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                UUID REFERENCES "branches"("id"),
  "category"                 "ComplianceCategory" NOT NULL,
  "title"                    VARCHAR(200) NOT NULL,
  "issuing_authority"        VARCHAR(200),
  "certificate_number"       VARCHAR(100),
  "certificate_url"          VARCHAR(500),
  "issued_at"                DATE,
  "valid_from"               DATE NOT NULL,
  "valid_until"              DATE NOT NULL,
  "status"                   "ComplianceStatus" NOT NULL DEFAULT 'PENDING',
  "renewal_window_days"      INTEGER NOT NULL DEFAULT 30,
  "reminder_sent_at"         TIMESTAMPTZ,
  "overdue_marked_at"        TIMESTAMPTZ,
  "waived_reason"            TEXT,
  "notes"                    TEXT,
  "created_at"               TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "idx_compliance_school_cat_status" ON "compliance_items" ("school_id", "category", "status");
CREATE INDEX "idx_compliance_valid_until"        ON "compliance_items" ("valid_until");

-- R-OPS-018 — Food Sample Retention
CREATE TABLE "food_sample_retentions" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                   UUID NOT NULL REFERENCES "branches"("id"),
  "meal_type"                   VARCHAR(20) NOT NULL,
  "meal_date"                   DATE NOT NULL,
  "sample_collected_at"         TIMESTAMPTZ NOT NULL,
  "stored_at"                   TIMESTAMPTZ NOT NULL,
  "storage_location"            VARCHAR(100) NOT NULL,
  "retention_until"             TIMESTAMPTZ NOT NULL,
  "disposed_at"                 TIMESTAMPTZ,
  "disposal_method"             VARCHAR(20),
  "lab_test_requested_at"       TIMESTAMPTZ,
  "lab_test_result"             TEXT,
  "collected_by_employee_id"    UUID REFERENCES "employees"("id"),
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_food_sample_branch_meal_date" UNIQUE ("branch_id", "meal_type", "meal_date")
);
CREATE INDEX "idx_food_sample_retention_until" ON "food_sample_retentions" ("retention_until");

-- R-OPS-020 — CCTV Coverage
CREATE TABLE "cctv_coverages" (
  "id"                          UUID PRIMARY KEY DEFAULT uuid_v7(),
  "school_id"                   UUID NOT NULL REFERENCES "schools"("id") ON DELETE CASCADE,
  "branch_id"                   UUID NOT NULL REFERENCES "branches"("id"),
  "camera_id"                   VARCHAR(32) NOT NULL,
  "location"                    VARCHAR(200) NOT NULL,
  "coverage_zone"               VARCHAR(100) NOT NULL,
  "installed_at"                DATE NOT NULL,
  "is_active"                   BOOLEAN NOT NULL DEFAULT true,
  "retention_days"              INTEGER NOT NULL DEFAULT 30,
  "storage_endpoint"            VARCHAR(500),
  "last_health_check_at"        TIMESTAMPTZ,
  "last_health_check_status"    VARCHAR(20),
  "notes"                       TEXT,
  "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "uq_cctv_branch_camera" UNIQUE ("branch_id", "camera_id")
);
CREATE INDEX "idx_cctv_school_active" ON "cctv_coverages" ("school_id", "is_active");

-- ===== Wave 12 — RLS policies for all new tables =====
-- Per BTD §19 (Multi-tenant strategy): every tenant-scoped table gets RLS on school_id.

ALTER TABLE "substitute_assignments"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "icc_committees"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "icc_committee_members"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "training_records"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "position_openings"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "salary_revisions"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reorder_alerts"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expired_item_disposals"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_audits"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_audit_lines"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "return_notes"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "return_note_lines"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_items"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "food_sample_retentions"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cctv_coverages"             ENABLE ROW LEVEL SECURITY;

-- RLS policies: tenant isolation by school_id
CREATE POLICY "tenant_isolation_substitute_assignments" ON "substitute_assignments"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_icc_committees" ON "icc_committees"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_icc_committee_members" ON "icc_committee_members"
  USING (EXISTS (SELECT 1 FROM "icc_committees" c WHERE c.id = committee_id AND c.school_id = current_setting('app.school_id', true)::uuid));
CREATE POLICY "tenant_isolation_training_records" ON "training_records"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_position_openings" ON "position_openings"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_salary_revisions" ON "salary_revisions"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_reorder_alerts" ON "reorder_alerts"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_expired_item_disposals" ON "expired_item_disposals"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_stock_audits" ON "stock_audits"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_stock_audit_lines" ON "stock_audit_lines"
  USING (EXISTS (SELECT 1 FROM "stock_audits" a WHERE a.id = audit_id AND a.school_id = current_setting('app.school_id', true)::uuid));
CREATE POLICY "tenant_isolation_return_notes" ON "return_notes"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_return_note_lines" ON "return_note_lines"
  USING (EXISTS (SELECT 1 FROM "return_notes" r WHERE r.id = return_note_id AND r.school_id = current_setting('app.school_id', true)::uuid));
CREATE POLICY "tenant_isolation_compliance_items" ON "compliance_items"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_food_sample_retentions" ON "food_sample_retentions"
  USING (school_id = current_setting('app.school_id', true)::uuid);
CREATE POLICY "tenant_isolation_cctv_coverages" ON "cctv_coverages"
  USING (school_id = current_setting('app.school_id', true)::uuid);

-- ===== Wave 12 — updated_at triggers =====
CREATE TRIGGER "set_updated_at_substitute_assignments"    BEFORE UPDATE ON "substitute_assignments"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_icc_committees"            BEFORE UPDATE ON "icc_committees"            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_icc_committee_members"     BEFORE UPDATE ON "icc_committee_members"     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_training_records"          BEFORE UPDATE ON "training_records"          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_position_openings"         BEFORE UPDATE ON "position_openings"         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_salary_revisions"          BEFORE UPDATE ON "salary_revisions"          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_reorder_alerts"            BEFORE UPDATE ON "reorder_alerts"            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_expired_item_disposals"    BEFORE UPDATE ON "expired_item_disposals"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_stock_audits"              BEFORE UPDATE ON "stock_audits"              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_stock_audit_lines"         BEFORE UPDATE ON "stock_audit_lines"         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_return_notes"              BEFORE UPDATE ON "return_notes"              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_return_note_lines"         BEFORE UPDATE ON "return_note_lines"         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_compliance_items"          BEFORE UPDATE ON "compliance_items"          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_food_sample_retentions"    BEFORE UPDATE ON "food_sample_retentions"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "set_updated_at_cctv_coverages"            BEFORE UPDATE ON "cctv_coverages"            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
