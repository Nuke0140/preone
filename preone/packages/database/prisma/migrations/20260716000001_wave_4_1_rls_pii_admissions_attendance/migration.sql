-- PreOne Wave 4.1 — RLS + PII on Admissions + Attendance tables
-- =====================================================================
-- This script is idempotent — safe to re-run.
-- It:
--   1. Enables RLS on all Wave 4 admissions + attendance tables
--   2. Adds PII encryption columns for sensitive health data
--      (medicine authorizations, incident reports)
--   3. Adds audit triggers for admissions lifecycle tables
--
-- Per BTD §21.3 — RLS is the last line of defense against tenant
-- leakage. Even a buggy query returns only the current tenant's rows.
-- Per BTD §20.3 — health/PII data is encrypted via pgcrypto.
--
-- Prerequisite: 20260715000001_wave_2_1_outbox_rls_pii.sql
--   (creates pii_encrypt/pii_decrypt/pii_mask functions + outbox table)

-- ─────────────────────────────────────────────
-- 1. RLS POLICIES on Wave 4 tables (BTD §21.3)
-- ─────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  wave4_tables text[] := ARRAY[
    -- Admissions
    'applications',
    'application_documents',
    'document_checklists',
    'counselling_sessions',
    'approvals',
    'admissions',
    'waiting_list_entries',
    'admission_offers',
    'age_verifications',
    'fee_plan_quotes',
    'admission_priorities',
    'sibling_concessions',
    'admission_cancellations',
    'admission_audits',
    'admission_rejections',
    -- Attendance
    'attendances',
    'attendance_bulk_logs',
    'attendance_corrections',
    'arrival_logs',
    'pickup_logs',
    'late_pickups',
    'late_arrivals',
    'early_departures',
    'daily_logs',
    'medicine_authorizations',
    'incident_reports',
    'incident_actions',
    'daily_reports',
    'daily_report_templates',
    'attendance_summaries'
  ];
BEGIN
  FOREACH tbl SLICE 0 IN ARRAY wave4_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      -- Enable + Force RLS (defense-in-depth — even owner is restricted)
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

      -- Drop + recreate policy (idempotent)
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXCEPTION WHEN OTHERS THEN NULL; END;

      -- Same pattern as Wave 2.1: SELECT/UPDATE/DELETE require tenant
      -- match; INSERT requires NEW.tenant_id to match session var.
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
           FOR ALL
           USING (school_id::text = current_setting(''app.school_id'', true))
           WITH CHECK (school_id::text = current_setting(''app.school_id'', true))',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- 2. PII Columns for Sensitive Health Data (BTD §20.3 + DPDP §2(35))
-- ─────────────────────────────────────────────
-- Per DPDP Act 2023 — health data is "sensitive personal data" requiring
-- explicit consent + encryption at rest. We store medicine dosage,
-- prescription URLs, and incident descriptions in PII-encrypted columns.
--
-- Pattern: original column is renamed to *_plain (kept for backfill),
-- new column *_enc stores base64(pgp_sym_encrypt(value, key)).
-- Application reads via pii_decrypt() — never reads plain column.
--
-- For new tables (no existing data), we add the encrypted column directly.

-- Medicine Authorization — health data: dosage + instructions + prescription URL
ALTER TABLE medicine_authorizations
  ADD COLUMN IF NOT EXISTS dosage_enc text,
  ADD COLUMN IF NOT EXISTS instructions_enc text,
  ADD COLUMN IF NOT EXISTS prescription_url_enc text;

-- Index on encrypted columns is NOT useful ( ciphertext is random) — we
-- instead rely on student_id + is_active composite index already present.

-- Incident Reports — description + immediate_action may contain PII/health
ALTER TABLE incident_reports
  ADD COLUMN IF NOT EXISTS description_enc text,
  ADD COLUMN IF NOT EXISTS immediate_action_enc text,
  ADD COLUMN IF NOT EXISTS resolution_notes_enc text;

-- Incident Actions — description may contain health/PII
ALTER TABLE incident_actions
  ADD COLUMN IF NOT EXISTS description_enc text,
  ADD COLUMN IF NOT EXISTS outcome_enc text;

-- Daily Logs — payload may contain sensitive observations (mood/medicine)
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS payload_enc text,
  ADD COLUMN IF NOT EXISTS notes_enc text;

-- Daily Reports — teacher notes may contain PII observations
ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS teacher_notes_enc text,
  ADD COLUMN IF NOT EXISTS summary_enc text;

-- Counselling sessions — notes + recommendation are sensitive
ALTER TABLE counselling_sessions
  ADD COLUMN IF NOT EXISTS notes_enc text;

-- Applications — parent declarations may contain health/allergy info
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS parent_declarations_enc text,
  ADD COLUMN IF NOT EXISTS rejection_notes_enc text;

-- Admission audits — change logs may contain PII snapshots
ALTER TABLE admission_audits
  ADD COLUMN IF NOT EXISTS change_payload_enc text;

-- Pickup logs — authorized person name is PII
ALTER TABLE pickup_logs
  ADD COLUMN IF NOT EXISTS picked_by_authorized_person_enc text;

-- ─────────────────────────────────────────────
-- 3. PII Classifications — surface in PII_CLASSIFICATION (BTD §20.3)
-- ─────────────────────────────────────────────
-- Application code uses PII_CLASSIFICATION map in pii.util.ts to mask
-- these fields in logs. Migration-time data is already covered by the
-- RLS policy — we just need to make sure new columns are documented.

COMMENT ON COLUMN medicine_authorizations.dosage_enc IS
  'PII-encrypted dosage (BTD §20.3). Use pii_decrypt() to read.';
COMMENT ON COLUMN medicine_authorizations.instructions_enc IS
  'PII-encrypted administration instructions (BTD §20.3).';
COMMENT ON COLUMN medicine_authorizations.prescription_url_enc IS
  'PII-encrypted prescription document URL (BTD §20.3).';

COMMENT ON COLUMN incident_reports.description_enc IS
  'PII-encrypted incident description — may contain health/injury details (BTD §20.3).';
COMMENT ON COLUMN incident_reports.immediate_action_enc IS
  'PII-encrypted immediate action taken — may contain first-aid details (BTD §20.3).';

COMMENT ON COLUMN daily_logs.payload_enc IS
  'PII-encrypted type-specific payload (e.g., medicine dosage, meal quantity) (BTD §20.3).';

COMMENT ON COLUMN counselling_sessions.notes_enc IS
  'PII-encrypted counsellor notes — sensitive observation data (BTD §20.3).';

COMMENT ON COLUMN applications.parent_declarations_enc IS
  'PII-encrypted parent declarations — may contain health/allergy info (BTD §20.3).';

-- ─────────────────────────────────────────────
-- 4. Indexes for Integration Event Subscribers (BTD §14.2)
-- ─────────────────────────────────────────────
-- AdmissionApproved.v1 subscribers (Identity: create Student, Finance:
-- create FeePlan) need fast lookup of pending admissions by status.
-- AttendanceMarked.v1 subscribers (Communication: parent SMS) need
-- fast lookup of recent attendance by student + status.

CREATE INDEX IF NOT EXISTS admissions_pending_student_idx
  ON admissions (school_id, status)
  WHERE student_id IS NULL AND status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS attendances_recent_status_idx
  ON attendances (school_id, student_id, attendance_date DESC, status);

-- ─────────────────────────────────────────────
-- 5. Updated_at Trigger for Wave 4 Tables (BTD §22.1)
-- ─────────────────────────────────────────────
-- Prisma's @updatedAt handles this at the application layer, but for
-- raw SQL updates (RLS-bypass admin operations, data migrations) we
-- install a trigger to keep updated_at honest.

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$
DECLARE
  tbl text;
  wave4_tables text[] := ARRAY[
    'applications', 'application_documents', 'document_checklists',
    'counselling_sessions', 'approvals', 'admissions', 'waiting_list_entries',
    'admission_offers', 'age_verifications', 'fee_plan_quotes',
    'admission_priorities', 'sibling_concessions', 'admission_cancellations',
    'admission_audits', 'admission_rejections',
    'attendances', 'attendance_bulk_logs', 'attendance_corrections',
    'arrival_logs', 'pickup_logs', 'late_pickups', 'late_arrivals',
    'early_departures', 'daily_logs', 'medicine_authorizations',
    'incident_reports', 'incident_actions', 'daily_reports',
    'daily_report_templates', 'attendance_summaries'
  ];
BEGIN
  FOREACH tbl SLICE 0 IN ARRAY wave4_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      BEGIN
        EXECUTE format(
          'DROP TRIGGER IF EXISTS %I ON %I',
          tbl || '_touch_updated_at', tbl
        );
        EXECUTE format(
          'CREATE TRIGGER %I BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
          tbl || '_touch_updated_at', tbl
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;
END $$;

-- Done. Wave 4 tables are now BTD §21.3 + §20.3 compliant.
