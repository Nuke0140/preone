-- PreOne PostgreSQL 16 — Initialization script
-- Runs once on first container start (docker-entrypoint-initdb.d).

-- ─────────────────────────────────────────────
-- 1. Required extensions
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID v4 (legacy)
CREATE EXTENSION IF NOT EXISTS pgcrypto;          -- PII encryption (pgp_sym_encrypt)
CREATE EXTENSION IF NOT EXISTS pg_trgm;           -- Trigram full-text search
CREATE EXTENSION IF NOT EXISTS unaccent;          -- Accent-insensitive search
CREATE EXTENSION IF NOT EXISTS vector;            -- pgvector (AI embeddings)
CREATE EXTENSION IF NOT EXISTS btree_gist;        -- GiST on btree types (for EXCLUDE)

-- ─────────────────────────────────────────────
-- 2. RLS support role (BYPASSRLS for platform admin)
-- Per ERD v3.0 §5.3 — Cross-Tenant Admin Endpoints
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'platform_admin') THEN
    CREATE ROLE platform_admin BYPASSRLS;
  END IF;
END$$;

-- ─────────────────────────────────────────────
-- 3. Application roles
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'preone_app') THEN
    CREATE ROLE preone_app LOGIN PASSWORD 'preone' NOBYPASSRLS;
  END IF;
END$$;

-- Grant extensions to app role
GRANT USAGE ON SCHEMA public TO preone_app;
GRANT CREATE ON SCHEMA public TO preone_app;

-- ─────────────────────────────────────────────
-- 4. UUID v7 function (PostgreSQL 16 has gen_random_uuid() for v4,
--    but we need time-sortable v7 for primary keys).
--    Implementation per RFC 4122 + IETF draft-peabody-dispatch-new-uuid-format.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION uuid_v7()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  unix_ts_ms bigint;
  uuid_bytes bytea;
  rand_a bigint;
  rand_b bigint;
BEGIN
  unix_ts_ms := extract(epoch from clock_timestamp()) * 1000;

  -- 48-bit timestamp + 4-bit version (7) + 12-bit random_a
  rand_a := floor(random() * 4096)::bigint;
  uuid_bytes := substring(int8send((unix_ts_ms << 16) | (7 << 12) | rand_a) from 1 for 8);

  -- 2-bit variant + 62-bit random_b
  rand_b := floor(random() * 4611686018427387904)::bigint | (2::bigint << 62);
  uuid_bytes := uuid_bytes || substring(int8send(rand_b) from 1 for 8);

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$;

-- Default UUID generator for new rows
ALTER DATABASE preone SET uuid_version = 'v7';

-- ─────────────────────────────────────────────
-- 5. updated_at auto-trigger function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────
-- 6. Soft-delete trigger (BTD §8.1 + ERD §8.1)
--    Intercepts DELETE → converts to UPDATE ... SET deleted_at = now()
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION soft_delete_handler()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE pg_catalog.pg_class
      SET relrowsecurity = relrowsecurity  -- no-op to satisfy parser
    WHERE false;
    -- Convert DELETE to UPDATE on deleted_at column
    EXECUTE format('UPDATE %I.%I SET deleted_at = NOW() WHERE id = $1.id', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      USING OLD;
    RETURN NULL;
  END IF;
  RETURN OLD;
END;
$$;

-- ─────────────────────────────────────────────
-- 7. Audit log trigger (BTD §8.2)
--    Captures INSERT / UPDATE / DELETE → inserts into audit_log
-- ─────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.audit_log (
  id              uuid PRIMARY KEY DEFAULT uuid_v7(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  user_id         uuid,
  tenant_id       uuid,
  branch_id       uuid,
  action          varchar(32) NOT NULL,
  module          varchar(64) NOT NULL,
  entity          varchar(64) NOT NULL,
  entity_id       uuid,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  request_id      varchar(64),
  trace_id        varchar(64),
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS audit_log_occurred_at_idx
  ON audit.audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_tenant_entity_idx
  ON audit.audit_log (tenant_id, entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_user_idx
  ON audit.audit_log (user_id, occurred_at DESC);

-- ─────────────────────────────────────────────
-- 8. Connection settings
-- ─────────────────────────────────────────────
ALTER DATABASE preone SET timezone = 'Asia/Kolkata';
ALTER DATABASE preone SET log_min_duration_statement = 500;  -- log queries > 500ms
ALTER DATABASE preone SET log_lock_waits = on;
ALTER DATABASE preone SET statement_timeout = '5s';
ALTER DATABASE preone SET idle_in_transaction_session_timeout = '30s';

-- ─────────────────────────────────────────────
-- 9. Initial app config
-- ─────────────────────────────────────────────
-- pgbouncer setup happens at the connection pooler layer (separate container in prod)
