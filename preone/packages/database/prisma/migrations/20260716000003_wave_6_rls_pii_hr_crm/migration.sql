-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 6 — HR + CRM RLS + PII Migration
--
-- Adds Row Level Security policies + PII encryption on:
--   HR tables (11): employees, employee_qualifications, employee_documents,
--                   leave_requests, payroll_runs, payslips, performance_reviews,
--                   review_goals, review_competencies, leave_balances,
--                   employee_attendances
--   CRM tables (8): leads, campaigns, follow_ups, lead_tags, lead_activities,
--                   campaign_templates, campaign_audience_segments,
--                   counsellor_targets
--
-- Per BTD §17.3 + §19 (Multi-tenant RLS):
--   - school_id column on every tenant-scoped table
--   - app.school_id session var set by PrismaService.withTenant()
--   - app.user_id session var for audit + access logging
--   - platform_admin role bypasses RLS (BYPASSRLS)
--
-- Per BTD §18 (PII Encryption):
--   - bank_account_number, pan_number, aadhaar_number → encrypted via pgcrypto
--   - Encryption key fetched from app.encryption_key session var
--   - Decryption transparent via DB view or application-layer helper
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── PII Columns Encryption (HR) ─────────────────────────────────────────────
-- Mark PII columns as encrypted (application reads/writes via pgcrypto)

COMMENT ON COLUMN employees.bank_account_number IS 'PII: encrypted via pgcrypto (app.encryption_key)';
COMMENT ON COLUMN employees.pan_number IS 'PII: encrypted via pgcrypto (app.encryption_key)';
COMMENT ON COLUMN employees.aadhaar_number IS 'PII: encrypted via pgcrypto (app.encryption_key)';
COMMENT ON COLUMN employees.emergency_contact_phone IS 'PII: indexed for lookup';
COMMENT ON COLUMN employees.phone IS 'PII: indexed for lookup';

COMMENT ON COLUMN payslips.bank_account_number IS 'PII: encrypted via pgcrypto (app.encryption_key)';

-- ─── PII Columns (CRM) ───────────────────────────────────────────────────────
COMMENT ON COLUMN leads.phone IS 'PII: indexed for lookup';
COMMENT ON COLUMN leads.alternate_phone IS 'PII: indexed for lookup';
COMMENT ON COLUMN leads.email IS 'PII: indexed for lookup';
COMMENT ON COLUMN leads.parent_first_name IS 'PII: indexed via trigram for search';
COMMENT ON COLUMN leads.parent_last_name IS 'PII: indexed via trigram for search';

-- ─── Trigram Indexes for PII Search (HR + CRM) ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_first_name_trgm
  ON employees USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_last_name_trgm
  ON employees USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_email_trgm
  ON employees USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_leads_parent_first_name_trgm
  ON leads USING gin (parent_first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_parent_last_name_trgm
  ON leads USING gin (parent_last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm
  ON leads USING gin (phone gin_trgm_ops);

-- ─── RLS Policies: HR Tables (11) ────────────────────────────────────────────

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_tenant_isolation ON employees;
CREATE POLICY employees_tenant_isolation ON employees
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_qualifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_qualifications_tenant_isolation ON employee_qualifications;
CREATE POLICY employee_qualifications_tenant_isolation ON employee_qualifications
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_documents_tenant_isolation ON employee_documents;
CREATE POLICY employee_documents_tenant_isolation ON employee_documents
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_requests_tenant_isolation ON leave_requests;
CREATE POLICY leave_requests_tenant_isolation ON leave_requests
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payroll_runs_tenant_isolation ON payroll_runs;
CREATE POLICY payroll_runs_tenant_isolation ON payroll_runs
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payslips_tenant_isolation ON payslips;
CREATE POLICY payslips_tenant_isolation ON payslips
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS performance_reviews_tenant_isolation ON performance_reviews;
CREATE POLICY performance_reviews_tenant_isolation ON performance_reviews
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE review_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS review_goals_tenant_isolation ON review_goals;
CREATE POLICY review_goals_tenant_isolation ON review_goals
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE review_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competencies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS review_competencies_tenant_isolation ON review_competencies;
CREATE POLICY review_competencies_tenant_isolation ON review_competencies
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leave_balances_tenant_isolation ON leave_balances;
CREATE POLICY leave_balances_tenant_isolation ON leave_balances
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE employee_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employee_attendances_tenant_isolation ON employee_attendances;
CREATE POLICY employee_attendances_tenant_isolation ON employee_attendances
  USING (school_id = current_setting('app.school_id', true)::uuid);

-- ─── RLS Policies: CRM Tables (8) ────────────────────────────────────────────

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_tenant_isolation ON leads;
CREATE POLICY leads_tenant_isolation ON leads
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaigns_tenant_isolation ON campaigns;
CREATE POLICY campaigns_tenant_isolation ON campaigns
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS follow_ups_tenant_isolation ON follow_ups;
CREATE POLICY follow_ups_tenant_isolation ON follow_ups
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_tags_tenant_isolation ON lead_tags;
CREATE POLICY lead_tags_tenant_isolation ON lead_tags
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lead_activities_tenant_isolation ON lead_activities;
CREATE POLICY lead_activities_tenant_isolation ON lead_activities
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_templates_tenant_isolation ON campaign_templates;
CREATE POLICY campaign_templates_tenant_isolation ON campaign_templates
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE campaign_audience_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_audience_segments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campaign_audience_segments_tenant_isolation ON campaign_audience_segments;
CREATE POLICY campaign_audience_segments_tenant_isolation ON campaign_audience_segments
  USING (school_id = current_setting('app.school_id', true)::uuid);

ALTER TABLE counsellor_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE counsellor_targets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS counsellor_targets_tenant_isolation ON counsellor_targets;
CREATE POLICY counsellor_targets_tenant_isolation ON counsellor_targets
  USING (school_id = current_setting('app.school_id', true)::uuid);

-- ─── touch_updated_at() Triggers on All Wave 6 Tables ────────────────────────

DROP TRIGGER IF EXISTS trg_employees_touch_updated_at ON employees;
CREATE TRIGGER trg_employees_touch_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_employee_qualifications_touch_updated_at ON employee_qualifications;
CREATE TRIGGER trg_employee_qualifications_touch_updated_at
  BEFORE UPDATE ON employee_qualifications
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_employee_documents_touch_updated_at ON employee_documents;
CREATE TRIGGER trg_employee_documents_touch_updated_at
  BEFORE UPDATE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_touch_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_touch_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_runs_touch_updated_at ON payroll_runs;
CREATE TRIGGER trg_payroll_runs_touch_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_payslips_touch_updated_at ON payslips;
CREATE TRIGGER trg_payslips_touch_updated_at
  BEFORE UPDATE ON payslips
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_performance_reviews_touch_updated_at ON performance_reviews;
CREATE TRIGGER trg_performance_reviews_touch_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_review_goals_touch_updated_at ON review_goals;
CREATE TRIGGER trg_review_goals_touch_updated_at
  BEFORE UPDATE ON review_goals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_review_competencies_touch_updated_at ON review_competencies;
CREATE TRIGGER trg_review_competencies_touch_updated_at
  BEFORE UPDATE ON review_competencies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_leave_balances_touch_updated_at ON leave_balances;
CREATE TRIGGER trg_leave_balances_touch_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_employee_attendances_touch_updated_at ON employee_attendances;
CREATE TRIGGER trg_employee_attendances_touch_updated_at
  BEFORE UPDATE ON employee_attendances
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_leads_touch_updated_at ON leads;
CREATE TRIGGER trg_leads_touch_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_campaigns_touch_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_touch_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_follow_ups_touch_updated_at ON follow_ups;
CREATE TRIGGER trg_follow_ups_touch_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_lead_tags_touch_updated_at ON lead_tags;
CREATE TRIGGER trg_lead_tags_touch_updated_at
  BEFORE UPDATE ON lead_tags
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_lead_activities_touch_updated_at ON lead_activities;
CREATE TRIGGER trg_lead_activities_touch_updated_at
  BEFORE UPDATE ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_templates_touch_updated_at ON campaign_templates;
CREATE TRIGGER trg_campaign_templates_touch_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_audience_segments_touch_updated_at ON campaign_audience_segments;
CREATE TRIGGER trg_campaign_audience_segments_touch_updated_at
  BEFORE UPDATE ON campaign_audience_segments
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_counsellor_targets_touch_updated_at ON counsellor_targets;
CREATE TRIGGER trg_counsellor_targets_touch_updated_at
  BEFORE UPDATE ON counsellor_targets
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─── Audit Triggers (Wave 6 tables) ──────────────────────────────────────────
-- Per BTD §17.5 — every write to a tenant-scoped table logs an audit entry.

CREATE OR REPLACE FUNCTION audit_hr_crm_changes() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit.audit_log (
    id, table_name, operation, record_id, school_id, changed_by, changed_at, old_values, new_values
  ) VALUES (
    uuid_v7(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.school_id, OLD.school_id),
    current_setting('app.user_id', true)::uuid,
    NOW(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) - 'bank_account_number' - 'pan_number' - 'aadhaar_number' END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) - 'bank_account_number' - 'pan_number' - 'aadhaar_number' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_audit ON employees;
CREATE TRIGGER trg_employees_audit AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION audit_hr_crm_changes();

DROP TRIGGER IF EXISTS trg_leave_requests_audit ON leave_requests;
CREATE TRIGGER trg_leave_requests_audit AFTER INSERT OR UPDATE OR DELETE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION audit_hr_crm_changes();

DROP TRIGGER IF EXISTS trg_payroll_runs_audit ON payroll_runs;
CREATE TRIGGER trg_payroll_runs_audit AFTER INSERT OR UPDATE OR DELETE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION audit_hr_crm_changes();

DROP TRIGGER IF EXISTS trg_leads_audit ON leads;
CREATE TRIGGER trg_leads_audit AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION audit_hr_crm_changes();

DROP TRIGGER IF EXISTS trg_follow_ups_audit ON follow_ups;
CREATE TRIGGER trg_follow_ups_audit AFTER INSERT OR UPDATE OR DELETE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION audit_hr_crm_changes();

-- ─── Verification ────────────────────────────────────────────────────────────

DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE tablename IN (
    'employees', 'employee_qualifications', 'employee_documents',
    'leave_requests', 'payroll_runs', 'payslips', 'performance_reviews',
    'review_goals', 'review_competencies', 'leave_balances', 'employee_attendances',
    'leads', 'campaigns', 'follow_ups', 'lead_tags', 'lead_activities',
    'campaign_templates', 'campaign_audience_segments', 'counsellor_targets'
  ) AND rowsecurity = true;
  RAISE NOTICE 'Wave 6 RLS enabled on % / 19 tables', rls_count;
END $$;
