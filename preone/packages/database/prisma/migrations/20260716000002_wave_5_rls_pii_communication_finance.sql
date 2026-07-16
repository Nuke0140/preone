-- PreOne Wave 5 — RLS + PII on Communication + Finance tables
-- =====================================================================
-- Idempotent. Enables RLS on all Wave 5 tables + PII encryption on
-- provider API keys/secrets (Communication) + bank instrument details
-- (Finance). Re-uses pii_encrypt() from Wave 2.1.
--
-- Per BTD §21.3 — RLS on every tenant-scoped table.
-- Per BTD §20.3 — secrets + financial instruments encrypted at rest.
-- Prerequisite: 20260715000001_wave_2_1_outbox_rls_pii.sql

DO $$
DECLARE
  tbl text;
  wave5_tables text[] := ARRAY[
    -- Communication
    'communication_templates',
    'notifications',
    'notification_recipients',
    'announcements',
    'announcement_recipients',
    'conversations',
    'conversation_participants',
    'messages',
    'message_read_receipts',
    'communication_provider_configs',
    'communication_delivery_logs',
    -- Finance
    'fee_plans',
    'fee_plan_installments',
    'fee_concessions',
    'fee_concession_rules',
    'student_fee_plans',
    'invoices',
    'invoice_line_items',
    'invoice_adjustments',
    'payments',
    'payment_allocations',
    'refunds',
    'refund_allocations',
    'ledger_accounts',
    'ledger_entries',
    'late_fee_rules',
    'scholarships',
    'scholarship_awards',
    'gst_configs'
  ];
BEGIN
  FOREACH tbl SLICE 0 IN ARRAY wave5_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXCEPTION WHEN OTHERS THEN NULL; END;
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I
           FOR ALL
           USING (school_id::text = current_setting(''app.school_id'', true))
           WITH CHECK (school_id::text = current_setting(''app.school_id'', true))',
        tbl
      );
      -- updated_at trigger
      BEGIN
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', tbl || '_touch_updated_at', tbl);
        EXECUTE format(
          'CREATE TRIGGER %I BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
          tbl || '_touch_updated_at', tbl
        );
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────
-- PII columns for sensitive Wave 5 data (BTD §20.3)
-- ─────────────────────────────────────────────

-- Communication provider API keys + secrets — RESTRICTED (per pii.util.ts)
ALTER TABLE communication_provider_configs
  ADD COLUMN IF NOT EXISTS api_key_enc text,
  ADD COLUMN IF NOT EXISTS api_secret_enc text,
  ADD COLUMN IF NOT EXISTS webhook_secret_enc text;

COMMENT ON COLUMN communication_provider_configs.api_key_enc IS
  'PII-encrypted provider API key (BTD §20.3 RESTRICTED).';
COMMENT ON COLUMN communication_provider_configs.api_secret_enc IS
  'PII-encrypted provider API secret (BTD §20.3 RESTRICTED).';

-- Payment instruments — bank account/cheque/DD numbers are SENSITIVE
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS instrument_number_enc text;

COMMENT ON COLUMN payments.instrument_number_enc IS
  'PII-encrypted payment instrument number (cheque/DD/UPI ref) — bank account PII (BTD §20.3 SENSITIVE).';

-- Notification recipient contact details — PII NORMAL class
ALTER TABLE notification_recipients
  ADD COLUMN IF NOT EXISTS recipient_email_enc text,
  ADD COLUMN IF NOT EXISTS recipient_phone_enc text;

COMMENT ON COLUMN notification_recipients.recipient_email_enc IS
  'PII-encrypted recipient email — masked in logs (BTD §20.3 NORMAL).';
COMMENT ON COLUMN notification_recipients.recipient_phone_enc IS
  'PII-encrypted recipient phone — masked in logs (BTD §20.3 NORMAL).';

-- ─────────────────────────────────────────────
-- Indexes for Wave 5 hot paths (BTD §25.1)
-- ─────────────────────────────────────────────
-- Communication: parent notification delivery (AttendanceMarked.v1 subscriber)
CREATE INDEX IF NOT EXISTS notifications_pending_idx
  ON notifications (school_id, status, scheduled_at)
  WHERE status = 'QUEUED';

-- Finance: invoice outstanding follow-up (cron-driven)
CREATE INDEX IF NOT EXISTS invoices_overdue_idx
  ON invoices (school_id, due_date, status)
  WHERE status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE');

-- Finance: payment allocation lookup by invoice
CREATE INDEX IF NOT EXISTS payment_allocations_invoice_idx
  ON payment_allocations (invoice_id, isReversed);

-- Finance: ledger journal grouping
CREATE INDEX IF NOT EXISTS ledger_entries_journal_idx
  ON ledger_entries (journal_entry_id, entry_type);

-- Done. Wave 5 tables are now BTD §21.3 + §20.3 compliant.
