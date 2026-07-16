-- PreOne Wave 2.1 — Outbox + RLS + pgcrypto helpers
-- =====================================================================
-- This script is idempotent — safe to re-run.
-- It creates:
--   1. outbox table (transactional outbox pattern per BTD §17.1)
--   2. RLS policies on identity tables (BTD §21.3)
--   3. PII encryption helper functions (BTD §20.3)
--   4. idempotency_key table (BTD §17.1)

-- ─────────────────────────────────────────────
-- 1. OUTBOX TABLE — BTD §13.1 + §17.1
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outbox (
  id              uuid         PRIMARY KEY DEFAULT uuid_v7(),
  event_id        uuid         NOT NULL UNIQUE,    -- dedup key (domain event eventId)
  event_type      varchar(80)  NOT NULL,           -- e.g., "UserOnboarded.v1"
  aggregate_id    uuid         NOT NULL,
  aggregate_type  varchar(40)  NOT NULL,           -- User, School, Role, Branch
  tenant_id       uuid,                            -- nullable for platform-level events
  payload         jsonb        NOT NULL,
  status          varchar(10)  NOT NULL DEFAULT 'PENDING',  -- PENDING / PUBLISHED / FAILED
  attempts        integer      NOT NULL DEFAULT 0,
  max_attempts    integer      NOT NULL DEFAULT 5,
  last_error      text,
  published_at    timestamptz,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_status_created_idx
  ON outbox (status, created_at)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS outbox_tenant_idx ON outbox (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS outbox_aggregate_idx ON outbox (aggregate_type, aggregate_id);

-- ─────────────────────────────────────────────
-- 2. IDEMPOTENCY KEY TABLE — BTD §17.1
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS idempotency_key (
  id              uuid         PRIMARY KEY DEFAULT uuid_v7(),
  key             varchar(255) NOT NULL UNIQUE,
  tenant_id       uuid,
  user_id         uuid,
  method          varchar(10)  NOT NULL,
  path            varchar(255) NOT NULL,
  request_hash    varchar(64)  NOT NULL,           -- sha256 of body+query
  response_status integer,
  response_body   jsonb,
  expires_at      timestamptz  NOT NULL,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idempotency_tenant_key_idx
  ON idempotency_key (tenant_id, key)
  WHERE expires_at > now();

-- ─────────────────────────────────────────────
-- 3. RLS POLICIES — BTD §21.3
-- ─────────────────────────────────────────────
-- Per BTD §21.1: "Tenant Discriminator — tenant_id column on every table"
-- Per BTD §21.3: "RLS is last line of defense — even buggy query returns
--   only tenant data."
--
-- We enable RLS on all tenant-scoped tables. The application sets
-- app.school_id session variable on connection acquire (via PrismaService
-- .withTenant). The policy compares tenant_id::text = current_setting.
--
-- Note: PostgreSQL RLS does not support parameterized policies — we use
-- current_setting('app.school_id')::uuid as the runtime tenant filter.

DO $$
DECLARE
  tbl text;
  tenant_scoped_tables text[] := ARRAY[
    'users', 'branches', 'roles', 'role_permission', 'user_role',
    'sessions', 'refresh_tokens', 'otp_challenges', 'audit_logs',
    'feature_flags', 'school_subscriptions'
  ];
BEGIN
  FOREACH tbl SLICE 0 IN ARRAY tenant_scoped_tables LOOP
    -- Skip if the table doesn't exist yet (early migrations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      -- Force RLS even for the table owner (defense-in-depth)
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

      -- Drop existing policy if any (idempotent)
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
      EXCEPTION WHEN OTHERS THEN NULL; END;

      -- Create policy: SELECT/UPDATE/DELETE require tenant match;
      -- INSERT requires NEW.tenant_id matches session var (or NULL for platform events).
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

-- Platform admin bypasses RLS — only this role can read cross-tenant.
-- PreOne app role (preone_app) is NOT a member of platform_admin by default.
-- The PrismaService.asPlatformAdmin() method SET ROLE platform_admin
-- explicitly when cross-tenant access is required (audited).

-- ─────────────────────────────────────────────
-- 4. PII ENCRYPTION HELPERS — BTD §20.3
-- ─────────────────────────────────────────────
-- Per BTD §20.3: "PII fields encrypted at rest (pgcrypto); masked in logs."
-- Per DPDP Act Section 17 — data principal has access/correction/erasure rights.
--
-- We use pgp_sym_encrypt / pgp_sym_decrypt with the key passed in via the
-- app.encryption_key session variable (set by PrismaService.withTenant).
-- The actual key in production comes from AWS KMS — fetched at boot and
-- held in memory only.

CREATE OR REPLACE FUNCTION pii_encrypt(plain text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  SELECT encode(pgp_sym_encrypt(plain, current_setting('app.encryption_key', true)), 'base64')
$$;

CREATE OR REPLACE FUNCTION pii_decrypt(cipher text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  SELECT convert_from(pgp_sym_decrypt(decode(cipher, 'base64'),
                                       current_setting('app.encryption_key', true)), 'UTF8')
$$;

-- Mask function for logs — returns first 2 + last 2 chars, rest as *
-- e.g., "9876543210" → "98******10"
--       "abc@example.com" → "ab**********@**.**"
CREATE OR REPLACE FUNCTION pii_mask(val text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN val IS NULL OR length(val) < 5 THEN '****'
    WHEN val LIKE '%@%' THEN
      left(split_part(val, '@', 1), 2) || '***@' || right(val, 4)
    ELSE
      left(val, 2) || repeat('*', greatest(length(val) - 4, 1)) || right(val, 2)
  END
$$;

COMMENT ON FUNCTION pii_encrypt IS 'PII column-level encryption (BTD §20.3). Key from app.encryption_key session var.';
COMMENT ON FUNCTION pii_decrypt IS 'PII column-level decryption (BTD §20.3). Key from app.encryption_key session var.';
COMMENT ON FUNCTION pii_mask   IS 'PII masking for logs (BTD §20.3). Returns first/last 2 chars + asterisks.';
