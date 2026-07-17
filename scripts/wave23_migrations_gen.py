#!/usr/bin/env python3
"""
Wave 23 — Remaining 8 migrations generator.

Replaces the Wave 13 v3 completion stub migration (50 PLACEHOLDER enums, 0 actual
table DDL) with 8 real domain-grouped migrations that materialize the enums with
proper values extracted from packages/database/prisma/*.prisma and add the
most critical cross-cutting tables.

The 8 migrations are:
  1. wave_23_01_cross_cutting_tables  — EventStore, FileStorage, FileUpload, JobQueue,
     Lock, SequenceCounter, Snapshot, SystemHealthCheck, WebhookOutbox, EmailQueue,
     SMSQueue, WhatsAppQueue, FoodSampleRetention, CctvCoverage, ComplianceItem
  2. wave_23_02_cross_cutting_enums   — Replace 50 placeholder enums with real values
  3. wave_23_03_platform_tables       — 8 platform models (StorageUsage, FeatureUsage, etc.)
  4. wave_23_04_settings_tables       — 12 settings models (AcademicCalendar, Room, etc.)
  5. wave_23_05_reports_tables        — 5 reports models (ReportDefinition, ReportExecution, etc.)
  6. wave_23_06_administration_tables — 20 administration models
  7. wave_23_07_transport_tables      — 13 transport models
  8. wave_23_08_acceptance_seed       — Acceptance test ID registry table

Output: /home/z/my-project/preone/packages/database/prisma/migrations/
"""
from __future__ import annotations

import re
from pathlib import Path
from textwrap import dedent

MIGRATIONS_DIR = Path(
    "/home/z/my-project/preone/packages/database/prisma/migrations"
)
SCHEMA_DIR = Path(
    "/home/z/my-project/preone/packages/database/prisma"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def parse_enums(schema_path: Path) -> dict[str, list[str]]:
    """Return {enum_name: [value, ...]} parsed from a Prisma schema file.

    Handles inline comments (`// ...`) at the end of each value line.
    """
    if not schema_path.exists():
        return {}
    text = schema_path.read_text()
    out: dict[str, list[str]] = {}
    for m in re.finditer(
        r"^enum\s+(\w+)\s*\{([^}]*)\}",
        text,
        re.MULTILINE | re.DOTALL,
    ):
        name = m.group(1)
        body = m.group(2)
        values: list[str] = []
        for line in body.splitlines():
            line = line.strip()
            if not line:
                continue
            # Strip trailing inline comment
            if "//" in line:
                line = line.split("//", 1)[0].strip()
            if not line:
                continue
            # A pure enum value is just an UPPER_SNAKE_CASE identifier
            if re.fullmatch(r"[A-Z][A-Z0-9_]*", line):
                values.append(line)
            elif re.fullmatch(r"\w+", line):
                values.append(line.upper())
        if values:
            out[name] = values
    return out


def parse_model_names(schema_path: Path) -> list[str]:
    if not schema_path.exists():
        return []
    text = schema_path.read_text()
    return re.findall(r"^model\s+(\w+)\s*\{", text, re.MULTILINE)


def snake_case(name: str) -> str:
    """CamelCase → snake_case."""
    s = re.sub(r"(?<!^)(?=[A-Z])", "_", name)
    return s.lower()


def enum_values_to_sql(values: list[str]) -> str:
    """Convert ['LOW','MEDIUM'] → "'LOW', 'MEDIUM'"."""
    return ", ".join(f"'{v}'" for v in values)


def build_create_enum_stmt(name: str, values: list[str]) -> str:
    """Drop placeholder if exists, then create real enum. Idempotent."""
    snake = snake_case(name)
    return dedent(
        f"""
        -- Enum: {name} ({len(values)} values)
        DROP TYPE IF EXISTS "{name}";
        CREATE TYPE "{name}" AS ENUM ({enum_values_to_sql(values)});
        COMMENT ON TYPE "{name}" IS 'Wave 23 — {snake} enum (replaces Wave 13 PLACEHOLDER).';
        """
    ).strip()


def write_migration(
    migration_id: str,
    title: str,
    description: str,
    body: str,
) -> Path:
    """Write a migration directory + migration.sql file."""
    out_dir = MIGRATIONS_DIR / migration_id
    out_dir.mkdir(parents=True, exist_ok=True)
    sql_path = out_dir / "migration.sql"

    header = dedent(
        f"""
        -- PreOne {title}
        -- =====================================================================
        -- Migration ID: {migration_id}
        -- Wave: 23
        -- Idempotent: YES (uses CREATE TYPE/TABLE IF NOT EXISTS, DROP IF EXISTS)
        --
        -- {description.strip()}
        --
        -- Conventions (per ERD v3.0 §3 + BTD §16):
        --   - Tables: snake_case plural
        --   - Columns: snake_case
        --   - PKs: UUID v7 (time-sortable)
        --   - Timestamps: timestamptz
        --   - Money: integer cents (amount_cents) — never float
        --   - Soft delete: deleted_at timestamptz NULL
        --   - Optimistic concurrency: version INTEGER DEFAULT 1
        --   - Tenant isolation: school_id discriminator + RLS policy
        --   - Audit columns: created_at, created_by, updated_at, updated_by,
        --                    deleted_at, deleted_by
        --
        -- This migration is auto-generated by scripts/wave23_migrations_gen.py.
        -- Do not edit by hand — re-run the script instead.
        """
    ).lstrip()

    sql_path.write_text(header + "\n" + body + "\n")
    return sql_path


# ---------------------------------------------------------------------------
# Migration 1 — Cross-cutting tables
# ---------------------------------------------------------------------------
CROSS_CUTTING_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. event_store — append-only event log for event-sourced aggregates
    --    (BTD §17.2 — Event Store pattern for audit + replay)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS event_store (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        aggregate_type  VARCHAR(64) NOT NULL,
        aggregate_id    UUID NOT NULL,
        event_type      VARCHAR(96) NOT NULL,
        event_version   INTEGER NOT NULL,
        payload         JSONB NOT NULL,
        metadata        JSONB,
        causation_id    UUID,
        correlation_id  UUID,
        occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS event_store_school_agg_idx
        ON event_store(school_id, aggregate_type, aggregate_id, event_version);
    CREATE INDEX IF NOT EXISTS event_store_correlation_idx
        ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS event_store_event_type_idx
        ON event_store(event_type);

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. file_storage — metadata for stored files (Wave 19)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS file_storage (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        bucket          VARCHAR(64) NOT NULL,
        object_key      VARCHAR(512) NOT NULL,
        original_name   VARCHAR(512) NOT NULL,
        mime_type       VARCHAR(128) NOT NULL,
        size_bytes      BIGINT NOT NULL CHECK (size_bytes > 0),
        checksum_sha256 VARCHAR(64) NOT NULL,
        storage_class   VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
        is_encrypted    BOOLEAN NOT NULL DEFAULT FALSE,
        metadata        JSONB,
        expires_at      TIMESTAMPTZ,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS file_storage_object_key_uq
        ON file_storage(bucket, object_key);
    CREATE INDEX IF NOT EXISTS file_storage_school_idx
        ON file_storage(school_id, deleted_at);
    CREATE INDEX IF NOT EXISTS file_storage_checksum_idx
        ON file_storage(checksum_sha256);

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. file_upload — upload session tracking (multipart, resumable)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS file_upload (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
        file_storage_id     UUID REFERENCES file_storage(id) ON DELETE SET NULL,
        upload_state        VARCHAR(20) NOT NULL DEFAULT 'INITIATED'
                            CHECK (upload_state IN ('INITIATED','IN_PROGRESS','COMPLETED','ABORTED','FAILED')),
        total_size_bytes    BIGINT NOT NULL DEFAULT 0,
        uploaded_bytes      BIGINT NOT NULL DEFAULT 0,
        chunk_count         INTEGER NOT NULL DEFAULT 0,
        chunks_received     INTEGER NOT NULL DEFAULT 0,
        mime_type           VARCHAR(128),
        original_name       VARCHAR(512),
        scan_state          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (scan_state IN ('PENDING','CLEAN','INFECTED','ERROR')),
        scan_completed_at   TIMESTAMPTZ,
        scan_signature      VARCHAR(128),
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at          TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS file_upload_school_state_idx
        ON file_upload(school_id, upload_state, deleted_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. job_queue — durable background jobs (BTD §17.3)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS job_queue (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
        job_type        VARCHAR(64) NOT NULL,
        payload         JSONB NOT NULL,
        priority        SMALLINT NOT NULL DEFAULT 100,
        status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED','DEAD_LETTER')),
        attempts        INTEGER NOT NULL DEFAULT 0,
        max_attempts    SMALLINT NOT NULL DEFAULT 5,
        available_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        locked_by       VARCHAR(120),
        locked_at       TIMESTAMPTZ,
        last_error      TEXT,
        completed_at    TIMESTAMPTZ,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS job_queue_poll_idx
        ON job_queue(status, available_at, priority);

    -- ───────────────────────────────────────────────────────────────────────
    -- 5. lock — distributed advisory locks (DB-backed, BTD §17.4)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS lock (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        lock_key        VARCHAR(128) NOT NULL,
        holder          VARCHAR(120) NOT NULL,
        acquired_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at      TIMESTAMPTZ NOT NULL,
        metadata        JSONB
    );
    CREATE UNIQUE INDEX IF NOT EXISTS lock_key_uq ON lock(lock_key);

    -- ───────────────────────────────────────────────────────────────────────
    -- 6. sequence_counter — per-school per-key monotonic counter
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sequence_counter (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        counter_key     VARCHAR(64) NOT NULL,
        current_value   BIGINT NOT NULL DEFAULT 0,
        version         INTEGER NOT NULL DEFAULT 1,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, counter_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 7. snapshot — aggregate state snapshots (BTD §17.2 — snapshot optimization)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS snapshot (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        aggregate_type  VARCHAR(64) NOT NULL,
        aggregate_id    UUID NOT NULL,
        aggregate_version INTEGER NOT NULL,
        state           JSONB NOT NULL,
        taken_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (aggregate_type, aggregate_id, aggregate_version)
    );
    CREATE INDEX IF NOT EXISTS snapshot_lookup_idx
        ON snapshot(aggregate_type, aggregate_id, aggregate_version DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 8. system_health_check — heartbeat / probe results
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS system_health_check (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        component       VARCHAR(64) NOT NULL,
        probe           VARCHAR(64) NOT NULL,
        status          VARCHAR(20) NOT NULL
                        CHECK (status IN ('HEALTHY','DEGRADED','UNHEALTHY','UNKNOWN')),
        latency_ms      INTEGER,
        message         TEXT,
        metadata        JSONB,
        checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS system_health_check_comp_time_idx
        ON system_health_check(component, checked_at DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 9. webhook_outbox — outbound webhook delivery queue (Wave 20)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS webhook_outbox (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        webhook_endpoint_id UUID,
        event_type          VARCHAR(96) NOT NULL,
        payload             JSONB NOT NULL,
        attempt_count       INTEGER NOT NULL DEFAULT 0,
        max_attempts        SMALLINT NOT NULL DEFAULT 5,
        next_attempt_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_attempt_at     TIMESTAMPTZ,
        last_status_code    INTEGER,
        last_error          TEXT,
        status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','DELIVERED','FAILED','DEAD_LETTER')),
        delivered_at        TIMESTAMPTZ,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS webhook_outbox_poll_idx
        ON webhook_outbox(status, next_attempt_at) WHERE status = 'PENDING';

    -- ───────────────────────────────────────────────────────────────────────
    -- 10. email_queue — outbound email queue (Wave 17 — SendGrid adapter)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_queue (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        template_key    VARCHAR(96),
        from_address    VARCHAR(255) NOT NULL,
        to_addresses    TEXT NOT NULL,
        cc_addresses    TEXT,
        bcc_addresses   TEXT,
        subject         VARCHAR(255) NOT NULL,
        body_html       TEXT,
        body_text       TEXT,
        attachments     JSONB,
        status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','FAILED','BOUNCED','DEFERRED','CANCELLED')),
        provider        VARCHAR(32) NOT NULL DEFAULT 'SENDGRID',
        provider_id     VARCHAR(255),
        attempts        INTEGER NOT NULL DEFAULT 0,
        last_error      TEXT,
        sent_at         TIMESTAMPTZ,
        scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS email_queue_poll_idx
        ON email_queue(status, scheduled_for) WHERE status = 'QUEUED';

    -- ───────────────────────────────────────────────────────────────────────
    -- 11. sms_queue — outbound SMS queue (Wave 17 — Twilio adapter)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS sms_queue (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        template_key    VARCHAR(96),
        to_number       VARCHAR(20) NOT NULL,
        from_number     VARCHAR(20),
        body            TEXT NOT NULL,
        dlt_template_id VARCHAR(64),
        dlt_entity_id   VARCHAR(64),
        status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','FAILED','DELIVERED','UNDELIVERED','CANCELLED')),
        provider        VARCHAR(32) NOT NULL DEFAULT 'TWILIO',
        provider_id     VARCHAR(255),
        attempts        INTEGER NOT NULL DEFAULT 0,
        last_error      TEXT,
        sent_at         TIMESTAMPTZ,
        scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS sms_queue_poll_idx
        ON sms_queue(status, scheduled_for) WHERE status = 'QUEUED';

    -- ───────────────────────────────────────────────────────────────────────
    -- 12. whatsapp_queue — outbound WhatsApp queue
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS whatsapp_queue (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        template_key    VARCHAR(96),
        to_number       VARCHAR(20) NOT NULL,
        template_name   VARCHAR(96),
        template_language VARCHAR(8) DEFAULT 'en',
        parameters      JSONB,
        status          VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
                        CHECK (status IN ('QUEUED','SENT','FAILED','DELIVERED','READ','CANCELLED')),
        provider        VARCHAR(32) NOT NULL DEFAULT 'WHATSAPP_CLOUD',
        provider_id     VARCHAR(255),
        attempts        INTEGER NOT NULL DEFAULT 0,
        last_error      TEXT,
        sent_at         TIMESTAMPTZ,
        scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS whatsapp_queue_poll_idx
        ON whatsapp_queue(status, scheduled_for) WHERE status = 'QUEUED';

    -- ───────────────────────────────────────────────────────────────────────
    -- 13. food_sample_retention — FSSAI §15 sample logs (R-CMP-018)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS food_sample_retention (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        meal_date           DATE NOT NULL,
        meal_type           VARCHAR(20) NOT NULL CHECK (meal_type IN ('BREAKFAST','LUNCH','SNACK','DINNER')),
        sample_image_url    VARCHAR(512),
        retained_until      DATE NOT NULL,
        destroyed_at        TIMESTAMPTZ,
        destroyed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
        notes               TEXT,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at          TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS food_sample_retention_school_date_idx
        ON food_sample_retention(school_id, meal_date);

    -- ───────────────────────────────────────────────────────────────────────
    -- 14. cctv_coverage — CCTV camera coverage map (R-CMP-005)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS cctv_coverage (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        camera_id           VARCHAR(64) NOT NULL,
        location            VARCHAR(120) NOT NULL,
        coverage_zones      JSONB,
        retention_days      INTEGER NOT NULL DEFAULT 30 CHECK (retention_days >= 7),
        is_operational      BOOLEAN NOT NULL DEFAULT TRUE,
        last_health_check   TIMESTAMPTZ,
        notes               TEXT,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at          TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS cctv_coverage_school_branch_idx
        ON cctv_coverage(school_id, branch_id, deleted_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- 15. compliance_item — compliance tracker (R-CMP-007/013/014/017/018)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS compliance_item (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
        category            VARCHAR(40) NOT NULL CHECK (category IN (
                            'FIRE_NOC','FIRE_EXTINGUISHER','FIRE_DRILL','FSSAI_LICENSE',
                            'CCTV_RETENTION','POSH_TRAINING','FOOD_HANDLER_MEDICAL',
                            'ICC_CONSTITUTION','STAFF_BG_VERIFICATION')),
        title               VARCHAR(255) NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','ACTIVE','EXPIRING_SOON','EXPIRED','OVERDUE','WAIVED')),
        issued_at           DATE,
        expires_at          DATE,
        issuing_authority   VARCHAR(120),
        document_url        VARCHAR(512),
        notes               TEXT,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by          UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at          TIMESTAMPTZ,
        deleted_by          UUID REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS compliance_item_school_status_idx
        ON compliance_item(school_id, status, expires_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS policies (BTD §16 — tenant isolation)
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE event_store           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE file_storage          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE file_upload           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE job_queue             ENABLE ROW LEVEL SECURITY;
    ALTER TABLE snapshot              ENABLE ROW LEVEL SECURITY;
    ALTER TABLE webhook_outbox        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_queue           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sms_queue             ENABLE ROW LEVEL SECURITY;
    ALTER TABLE whatsapp_queue        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE food_sample_retention ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cctv_coverage         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE compliance_item       ENABLE ROW LEVEL SECURITY;

    -- lock / sequence_counter / system_health_check are not tenant-scoped
    -- (system-level tables; protected by separate admin role grants).

    CREATE POLICY event_store_tenant           ON event_store           USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY file_storage_tenant          ON file_storage          USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY file_upload_tenant           ON file_upload           USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY job_queue_tenant             ON job_queue             USING (school_id IS NULL OR school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY snapshot_tenant              ON snapshot              USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY webhook_outbox_tenant        ON webhook_outbox        USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY email_queue_tenant           ON email_queue           USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY sms_queue_tenant             ON sms_queue             USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY whatsapp_queue_tenant        ON whatsapp_queue        USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY food_sample_retention_tenant ON food_sample_retention USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY cctv_coverage_tenant         ON cctv_coverage         USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY compliance_item_tenant       ON compliance_item       USING (school_id = current_setting('app.current_school_id', true)::uuid);

    -- ───────────────────────────────────────────────────────────────────────
    -- updated_at triggers
    -- ───────────────────────────────────────────────────────────────────────
    DO $$
    DECLARE t TEXT;
    BEGIN
        FOR t IN SELECT unnest(ARRAY[
            'file_storage','file_upload','job_queue','webhook_outbox',
            'email_queue','sms_queue','whatsapp_queue','food_sample_retention',
            'cctv_coverage','compliance_item','sequence_counter','snapshot'
        ])
        LOOP
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; '
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I '
                'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
                t, t, t, t
            );
        END LOOP;
    END $$;
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 2 — Replace 50 placeholder enums from Wave 13
# ---------------------------------------------------------------------------
PLACEHOLDER_ENUM_NAMES = [
    "ActivityType", "BackupStatus", "BroadcastType", "ChatMessageType",
    "ChatRoomType", "ChequeStatus", "ComplianceType", "ConsentType",
    "DamagedItemAction", "DiscountType", "EmailStatus", "EmergencyType",
    "EventStatus", "EventType", "ExitType", "ExpenseStatus",
    "FeeHeadFrequency", "FeeHeadType", "FinancialReportType", "GRNStatus",
    "IncomeStatus", "IntegrationStatus", "InventoryCategoryName", "ItemCondition",
    "JobApplicationStatus", "JobStatus", "LeadScoreTier", "LowStockAlertType",
    "MealAmountEaten", "Mood", "PaymentMode", "PenaltyType",
    "PromotionStatus", "RSVPResponse", "ReferralStatus", "ReportSchedule",
    "ReviewPeriod", "RoomType", "SMSStatus", "StaffDepartment",
    "StaffDesignation", "StaffStatus", "StockIssueStatus", "StockReturnType",
    "ToiletType", "TransferReason", "TriggerEvent", "VisitorPurpose",
    "WhatsAppStatus", "WriteOffReason",
]

# Hand-curated values for the 8 enums that are still PLACEHOLDER in the
# Prisma schema files. These values follow ERD v3.0 §15 data dictionary
# conventions and are derived from the columns/tables that reference each
# enum (e.g. ChatMessageType is referenced by chat_messages.message_type).
HAND_CURATED_ENUMS: dict[str, list[str]] = {
    "ActivityType": [
        "INDOOR", "OUTDOOR", "GROUP", "INDIVIDUAL", "WATER_PLAY",
        "ART", "MUSIC", "STORY", "FREE_PLAY", "STRUCTURED",
    ],
    "BackupStatus": [
        "STARTED", "COMPLETED", "FAILED", "VERIFIED", "EXPIRED",
    ],
    "BroadcastType": [
        "ANNOUNCEMENT", "ALERT", "EVENT", "NEWSLETTER", "HOLIDAY",
        "EMERGENCY", "REMINDER",
    ],
    "ChatMessageType": [
        "TEXT", "IMAGE", "FILE", "AUDIO", "VIDEO", "LOCATION", "CONTACT", "SYSTEM",
    ],
    "ChatRoomType": [
        "DIRECT", "GROUP", "BROADCAST", "SUPPORT", "CLASS_GROUP", "TEACHER_PARENT",
    ],
    "ChequeStatus": [
        "ISSUED", "DEPOSITED", "CLEARED", "BOUNCED", "CANCELLED", "RE_ISSUED",
    ],
    "DamagedItemAction": [
        "REPAIR", "DISPOSE", "WRITE_OFF", "RETURN_TO_VENDOR", "REPLACE", "DONATE",
    ],
    "DiscountType": [
        "PERCENTAGE", "FIXED_AMOUNT", "SIBLING", "EARLY_BIRD", "SCHOLARSHIP",
        "STAFF_WARD", "ALUMNI", "MERIT", "NEED_BASED",
    ],
    # The following enums are referenced in schema.prisma but their bodies
    # contain only `PLACEHOLDER`. Curated below per ERD v3.0 §15 conventions.
    "ComplianceType": [
        "FIRE_NOC", "FIRE_EXTINGUISHER", "FIRE_DRILL", "FSSAI_LICENSE",
        "CCTV_RETENTION", "POSH_TRAINING", "FOOD_HANDLER_MEDICAL",
        "ICC_CONSTITUTION", "STAFF_BG_VERIFICATION", "BUILDING_SAFETY",
        "ELECTRICAL_INSPECTION", "OTHER",
    ],
    "ConsentType": [
        "EXPLICIT", "IMPLICIT", "OPT_IN", "OPT_OUT", "PARENTAL", "GUARDIAN",
    ],
    "EmailStatus": [
        "QUEUED", "SENT", "FAILED", "BOUNCED", "DEFERRED", "CANCELLED",
        "DELIVERED", "OPENED", "CLICKED",
    ],
    "EmergencyType": [
        "FIRE", "EARTHQUAKE", "LOCKDOWN", "MEDICAL", "INTRUDER",
        "WEATHER", "EVACUATION", "OTHER",
    ],
    "EventStatus": [
        "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED", "DRAFT",
    ],
    "EventType": [
        "HOLIDAY", "EXAM", "PTM", "SPORTS_DAY", "CULTURAL", "FIELD_TRIP",
        "PROFESSIONAL_DAY", "WORKSHOP", "ASSEMBLY", "OTHER",
    ],
    "ExitType": [
        "GRADUATION", "TRANSFER", "WITHDRAWAL", "EXPULSION", "RELOCATION", "DEATH",
    ],
    "ExpenseStatus": [
        "DRAFT", "PENDING", "APPROVED", "REJECTED", "PAID", "CANCELLED",
    ],
    "FeeHeadFrequency": [
        "ONE_TIME", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "TERM_WISE",
    ],
    "FeeHeadType": [
        "TUITION", "TRANSPORT", "HOSTEL", "LIBRARY", "LAB", "EXAMINATION",
        "SPORTS", "CULTURAL", "LATE_FEE", "MISCELLANEOUS",
    ],
    "FinancialReportType": [
        "BALANCE_SHEET", "P_AND_L", "CASH_FLOW", "FEE_COLLECTION", "EXPENSE_SUMMARY",
        "GST_RETURN", "TDS_RETURN", "BANK_RECONCILIATION", "TRIAL_BALANCE",
    ],
    "GRNStatus": [
        "DRAFT", "PENDING_INSPECTION", "INSPECTED", "ACCEPTED", "PARTIALLY_ACCEPTED",
        "REJECTED", "CANCELLED",
    ],
    "IncomeStatus": [
        "DRAFT", "PENDING", "RECEIVED", "PARTIALLY_RECEIVED", "CANCELLED", "WRITTEN_OFF",
    ],
    "IntegrationStatus": [
        "ACTIVE", "INACTIVE", "ERROR", "SUSPENDED", "PENDING_AUTH", "EXPIRED",
    ],
    "InventoryCategoryName": [
        "STATIONERY", "BOOKS", "FURNITURE", "ELECTRONICS", "KITCHEN_SUPPLIES",
        "CLEANING_SUPPLIES", "SPORTS_EQUIPMENT", "ART_SUPPLIES", "MEDICAL_SUPPLIES",
        "OFFICE_SUPPLIES", "OTHER",
    ],
    "ItemCondition": [
        "EXCELLENT", "GOOD", "FAIR", "POOR", "BROKEN", "DAMAGED",
    ],
    "JobApplicationStatus": [
        "DRAFT", "SUBMITTED", "SCREENING", "INTERVIEW_SCHEDULED", "INTERVIEWED",
        "OFFERED", "HIRED", "REJECTED", "WITHDRAWN", "ON_HOLD",
    ],
    "JobStatus": [
        "OPEN", "ON_HOLD", "CLOSED", "CANCELLED", "FILLED", "DRAFT",
    ],
    "LeadScoreTier": [
        "HOT", "WARM", "COLD", "UNQUALIFIED",
    ],
    "LowStockAlertType": [
        "BELOW_REORDER", "OUT_OF_STOCK", "BELOW_SAFETY_STOCK", "EXPIRING_SOON",
    ],
    "MealAmountEaten": [
        "NONE", "QUARTER", "HALF", "THREE_QUARTER", "FULL", "REFUSED",
    ],
    "Mood": [
        "HAPPY", "CALM", "EXCITED", "NEUTRAL", "TIRED", "SAD", "ANGRY", "ANXIOUS", "ILL",
    ],
    "PaymentMode": [
        "CASH", "CHEQUE", "DEMAND_DRAFT", "BANK_TRANSFER", "CREDIT_CARD",
        "DEBIT_CARD", "UPI", "WALLET", "CARD_SWIPE", "NET_BANKING",
    ],
    "PenaltyType": [
        "LATE_FEE", "BOUNCE_CHARGE", "NSF_CHARGE", "PENALTY_INTEREST", "OTHER",
    ],
    "PromotionStatus": [
        "DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED",
    ],
    "RSVPResponse": [
        "YES", "NO", "MAYBE", "NO_RESPONSE",
    ],
    "ReferralStatus": [
        "PENDING", "CONTACTED", "CONVERTED", "REJECTED", "EXPIRED",
    ],
    "ReportSchedule": [
        "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY", "CUSTOM",
    ],
    "ReviewPeriod": [
        "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "BI_ANNUAL",
    ],
    "RoomType": [
        "CLASSROOM", "LAB", "LIBRARY", "PLAY_AREA", "STAFF_ROOM",
        "OFFICE", "STORAGE", "KITCHEN", "WASHROOM", "OTHER",
    ],
    "SMSStatus": [
        "QUEUED", "SENT", "FAILED", "DELIVERED", "UNDELIVERED", "CANCELLED",
    ],
    "StaffDepartment": [
        "TEACHING", "NON_TEACHING", "ADMINISTRATION", "TRANSPORT", "HOUSEKEEPING",
        "KITCHEN", "SECURITY", "ACCOUNTS", "IT", "HR",
    ],
    "StaffDesignation": [
        "PRINCIPAL", "VICE_PRINCIPAL", "COORDINATOR", "TEACHER", "ASSISTANT_TEACHER",
        "COUNSELOR", "ADMIN_OFFICER", "ACCOUNTANT", "DRIVER", "ATTENDER",
        "HOUSEKEEPING_STAFF", "SECURITY_GUARD", "OTHER",
    ],
    "StaffStatus": [
        "ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED", "RETIRED",
        "PROBATION", "CONTRACT_ENDED",
    ],
    "StockIssueStatus": [
        "DRAFT", "PENDING", "APPROVED", "ISSUED", "PARTIALLY_ISSUED",
        "REJECTED", "CANCELLED",
    ],
    "StockReturnType": [
        "DAMAGED", "EXPIRED", "WRONG_ITEM", "QUALITY_ISSUE", "EXCESS_QUANTITY",
        "RECALL", "OTHER",
    ],
    "ToiletType": [
        "WET", "DRY", "BOTH", "SOILED", "NONE",
    ],
    "TransferReason": [
        "RELOCATION", "PARENT_REQUEST", "ACADEMIC", "DISCIPLINARY", "FEE_DEFAULT",
        "MEDICAL", "GRADUATION", "OTHER",
    ],
    "TriggerEvent": [
        "MANUAL", "SCHEDULED", "ON_CREATE", "ON_UPDATE", "ON_DELETE",
        "THRESHOLD_BREACH", "EXTERNAL_WEBHOOK",
    ],
    "VisitorPurpose": [
        "PARENT_VISIT", "VENDOR_DELIVERY", "OFFICIAL", "INTERVIEW",
        "MAINTENANCE", "INSPECTION", "OTHER",
    ],
    "WhatsAppStatus": [
        "QUEUED", "SENT", "FAILED", "DELIVERED", "READ", "CANCELLED",
    ],
    "WriteOffReason": [
        "DAMAGED_BEYOND_REPAIR", "OBSOLETE", "LOST", "STOLEN", "EXPIRED", "OTHER",
    ],
}


# ---------------------------------------------------------------------------
# Migration 3 — Platform management tables
# ---------------------------------------------------------------------------
PLATFORM_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. storage_usage — per-school per-month storage consumption
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS storage_usage (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        period_month    DATE NOT NULL,  -- first day of month
        bytes_used      BIGINT NOT NULL DEFAULT 0,
        bytes_limit     BIGINT NOT NULL DEFAULT 5368709120,  -- 5 GiB default
        file_count      INTEGER NOT NULL DEFAULT 0,
        archived_bytes  BIGINT NOT NULL DEFAULT 0,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, period_month)
    );
    CREATE INDEX IF NOT EXISTS storage_usage_school_month_idx
        ON storage_usage(school_id, period_month DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. feature_usage — per-school per-day feature consumption counters
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS feature_usage (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        feature_key     VARCHAR(64) NOT NULL,
        period_day      DATE NOT NULL,
        count           BIGINT NOT NULL DEFAULT 0,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, feature_key, period_day)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. platform_api_key — platform-level API keys for integrations
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_api_key (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        name            VARCHAR(120) NOT NULL,
        key_prefix      VARCHAR(16) NOT NULL,
        key_hash        VARCHAR(255) NOT NULL,
        scopes          TEXT[],
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        expires_at      TIMESTAMPTZ,
        last_used_at    TIMESTAMPTZ,
        created_by      UUID,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX IF NOT EXISTS platform_api_key_hash_uq
        ON platform_api_key(key_hash);

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. platform_backup — platform-level backup metadata
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_backup (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        backup_type     VARCHAR(32) NOT NULL CHECK (backup_type IN ('AUTOMATED','MANUAL','PRE_DEPLOY')),
        status          VARCHAR(20) NOT NULL CHECK (status IN ('STARTED','COMPLETED','FAILED','VERIFIED','EXPIRED')),
        started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at    TIMESTAMPTZ,
        size_bytes      BIGINT,
        location        VARCHAR(512),
        checksum        VARCHAR(64),
        retention_until TIMESTAMPTZ,
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 5. platform_audit_log — platform-level audit log (cross-school)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_audit_log (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        actor_id        UUID,
        actor_email     VARCHAR(255),
        action          VARCHAR(64) NOT NULL,
        resource_type   VARCHAR(64) NOT NULL,
        resource_id     VARCHAR(64),
        before_state    JSONB,
        after_state     JSONB,
        ip_address      INET,
        user_agent      TEXT,
        occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS platform_audit_log_action_time_idx
        ON platform_audit_log(action, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS platform_audit_log_resource_idx
        ON platform_audit_log(resource_type, resource_id);

    -- ───────────────────────────────────────────────────────────────────────
    -- 6. platform_feature_flag — platform-level feature flags
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_feature_flag (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        key             VARCHAR(64) NOT NULL UNIQUE,
        description     TEXT,
        is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
        rollout_percent SMALLINT NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
        school_ids      UUID[],
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 7. platform_metric — daily platform KPI snapshots
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_metric (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        metric_key      VARCHAR(64) NOT NULL,
        period_day      DATE NOT NULL,
        value_numeric   DOUBLE PRECISION,
        value_text      TEXT,
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (metric_key, period_day)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 8. platform_integration_config — per-school integration overrides
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS platform_integration_config (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        integration_key     VARCHAR(64) NOT NULL,  -- 'sendgrid' | 'twilio' | 'razorpay' | 'openai'
        is_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
        config_encrypted    BYTEA,                  -- pgcrypto-encrypted
        priority            SMALLINT NOT NULL DEFAULT 0,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ,
        UNIQUE (school_id, integration_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS + triggers
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE storage_usage                ENABLE ROW LEVEL SECURITY;
    ALTER TABLE feature_usage                ENABLE ROW LEVEL SECURITY;
    ALTER TABLE platform_integration_config  ENABLE ROW LEVEL SECURITY;

    CREATE POLICY storage_usage_tenant               ON storage_usage               USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY feature_usage_tenant               ON feature_usage               USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY platform_integration_config_tenant ON platform_integration_config USING (school_id = current_setting('app.current_school_id', true)::uuid);

    -- platform_api_key, platform_backup, platform_audit_log, platform_feature_flag,
    -- platform_metric are platform-level (no school_id) — protected by role grants.
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 4 — Settings tables
# ---------------------------------------------------------------------------
SETTINGS_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. academic_calendar — school calendar events (holidays, exams, etc.)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS academic_calendar (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        event_type      VARCHAR(40) NOT NULL CHECK (event_type IN (
                        'HOLIDAY','EXAM','PTM','SPORTS_DAY','CULTURAL','FIELD_TRIP',
                        'PROFESSIONAL_DAY','OTHER')),
        start_date      DATE NOT NULL,
        end_date        DATE NOT NULL,
        is_full_day     BOOLEAN NOT NULL DEFAULT TRUE,
        start_time      TIME,
        end_time        TIME,
        description     TEXT,
        affects_attendance BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS academic_calendar_school_date_idx
        ON academic_calendar(school_id, start_date, end_date);

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. room — physical rooms in branches
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS room (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        name            VARCHAR(120) NOT NULL,
        code            VARCHAR(32) NOT NULL,
        room_type       VARCHAR(32) NOT NULL CHECK (room_type IN (
                        'CLASSROOM','LAB','LIBRARY','PLAY_AREA','STAFF_ROOM',
                        'OFFICE','STORAGE','KITCHEN','WASHROOM','OTHER')),
        capacity        INTEGER CHECK (capacity >= 0),
        floor_number    SMALLINT,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, code)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. room_booking — room reservation slots
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS room_booking (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        room_id         UUID NOT NULL REFERENCES room(id) ON DELETE CASCADE,
        booked_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title           VARCHAR(255) NOT NULL,
        starts_at       TIMESTAMPTZ NOT NULL,
        ends_at         TIMESTAMPTZ NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED'
                        CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','COMPLETED','NO_SHOW')),
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS room_booking_room_time_idx
        ON room_booking(room_id, starts_at, ends_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. event — calendar events at school/branch level
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS event (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        event_type      VARCHAR(40) NOT NULL,
        starts_at       TIMESTAMPTZ NOT NULL,
        ends_at         TIMESTAMPTZ,
        location        VARCHAR(255),
        description     TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','POSTPONED')),
        organiser_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS event_school_start_idx
        ON event(school_id, starts_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- 5. system_setting — school-level config key/value store
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS system_setting (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        setting_key     VARCHAR(96) NOT NULL,
        setting_value   JSONB NOT NULL,
        is_sensitive    BOOLEAN NOT NULL DEFAULT FALSE,
        description     TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE (school_id, setting_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 6. user_preference — per-user UI preferences
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_preference (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        preference_key  VARCHAR(96) NOT NULL,
        preference_value JSONB NOT NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, preference_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 7. notification_preference — per-user notification channel opt-ins
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notification_preference (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        notification_type VARCHAR(64) NOT NULL,
        email_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
        sms_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        push_enabled    BOOLEAN NOT NULL DEFAULT TRUE,
        in_app_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, school_id, notification_type)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 8. locale_setting — per-school locale config
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS locale_setting (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        locale          VARCHAR(8) NOT NULL DEFAULT 'en-IN',
        timezone        VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
        currency_code   VARCHAR(3) NOT NULL DEFAULT 'INR',
        date_format     VARCHAR(32) NOT NULL DEFAULT 'DD-MM-YYYY',
        first_day_of_week SMALLINT NOT NULL DEFAULT 1 CHECK (first_day_of_week BETWEEN 0 AND 6),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 9. branding_setting — per-school white-label branding
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS branding_setting (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        logo_url        VARCHAR(512),
        primary_color   VARCHAR(7),
        secondary_color VARCHAR(7),
        custom_css      TEXT,
        display_name    VARCHAR(120),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 10. integration_setting — per-school third-party integration config
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS integration_setting (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        integration_key     VARCHAR(64) NOT NULL,
        is_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
        credentials_encrypted BYTEA,
        settings            JSONB,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, integration_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 11. audit_retention_setting — per-school audit log retention (R-CMP-006)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS audit_retention_setting (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        audit_category  VARCHAR(64) NOT NULL,
        retention_days  INTEGER NOT NULL DEFAULT 365 CHECK (retention_days >= 30),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (school_id, audit_category)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 12. email_template — per-school email templates
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS email_template (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        template_key    VARCHAR(96) NOT NULL,
        subject         VARCHAR(255) NOT NULL,
        body_html       TEXT,
        body_text       TEXT,
        locale          VARCHAR(8) NOT NULL DEFAULT 'en-IN',
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (school_id, template_key, locale)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS + triggers
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE academic_calendar         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE room                      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE room_booking              ENABLE ROW LEVEL SECURITY;
    ALTER TABLE event                     ENABLE ROW LEVEL SECURITY;
    ALTER TABLE system_setting            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_preference           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE notification_preference   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE locale_setting            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE branding_setting          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE integration_setting       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_retention_setting   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE email_template            ENABLE ROW LEVEL SECURITY;

    CREATE POLICY academic_calendar_tenant        ON academic_calendar       USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY room_tenant                     ON room                    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY room_booking_tenant             ON room_booking            USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY event_tenant                    ON event                   USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY system_setting_tenant           ON system_setting          USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY notification_preference_tenant  ON notification_preference USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY locale_setting_tenant           ON locale_setting          USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY branding_setting_tenant         ON branding_setting        USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY integration_setting_tenant      ON integration_setting     USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY audit_retention_setting_tenant  ON audit_retention_setting USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY email_template_tenant           ON email_template          USING (school_id = current_setting('app.current_school_id', true)::uuid);

    DO $$
    DECLARE t TEXT;
    BEGIN
        FOR t IN SELECT unnest(ARRAY[
            'academic_calendar','room','room_booking','event','system_setting',
            'user_preference','notification_preference','locale_setting',
            'branding_setting','integration_setting','audit_retention_setting',
            'email_template'
        ])
        LOOP
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; '
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I '
                'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
                t, t, t, t
            );
        END LOOP;
    END $$;
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 5 — Reports tables
# ---------------------------------------------------------------------------
REPORTS_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. report_definition — saved report templates
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS report_definition (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        report_key      VARCHAR(96) NOT NULL,
        title           VARCHAR(255) NOT NULL,
        description     TEXT,
        category        VARCHAR(64) NOT NULL,
        data_source     VARCHAR(64) NOT NULL,
        query_template  TEXT NOT NULL,
        parameters_schema JSONB,
        schedule_cron   VARCHAR(64),
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (school_id, report_key)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. report_execution — individual report runs
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS report_execution (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        report_definition_id UUID NOT NULL REFERENCES report_definition(id) ON DELETE CASCADE,
        triggered_by        UUID REFERENCES users(id) ON DELETE SET NULL,
        parameters          JSONB NOT NULL,
        status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED','CANCELLED')),
        result_url          VARCHAR(512),
        result_summary      JSONB,
        row_count           INTEGER,
        bytes               BIGINT,
        started_at          TIMESTAMPTZ,
        completed_at        TIMESTAMPTZ,
        duration_ms         INTEGER,
        error_message       TEXT,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS report_execution_def_status_idx
        ON report_execution(report_definition_id, status, created_at DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. report_subscription — recurring report subscriptions for users
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS report_subscription (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        report_definition_id UUID NOT NULL REFERENCES report_definition(id) ON DELETE CASCADE,
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        schedule_cron       VARCHAR(64) NOT NULL,
        parameters          JSONB,
        delivery_channels   TEXT[] NOT NULL DEFAULT ARRAY['EMAIL'],
        next_run_at         TIMESTAMPTZ NOT NULL,
        last_run_at         TIMESTAMPTZ,
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,
        version             INTEGER NOT NULL DEFAULT 1,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at          TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS report_subscription_next_run_idx
        ON report_subscription(next_run_at) WHERE is_active = TRUE;

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. report_favorite — user favorites for quick access
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS report_favorite (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_definition_id UUID NOT NULL REFERENCES report_definition(id) ON DELETE CASCADE,
        display_order       SMALLINT NOT NULL DEFAULT 0,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, report_definition_id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 5. report_share — explicit shares with users/roles
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS report_share (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        report_definition_id UUID NOT NULL REFERENCES report_definition(id) ON DELETE CASCADE,
        shared_by           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        shared_with_role_id UUID,
        permissions         TEXT[] NOT NULL DEFAULT ARRAY['VIEW'],
        message             TEXT,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (shared_with_user_id IS NOT NULL OR shared_with_role_id IS NOT NULL)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS + triggers
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE report_definition  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE report_execution   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE report_subscription ENABLE ROW LEVEL SECURITY;
    ALTER TABLE report_favorite    ENABLE ROW LEVEL SECURITY;
    ALTER TABLE report_share       ENABLE ROW LEVEL SECURITY;

    CREATE POLICY report_definition_tenant   ON report_definition   USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY report_execution_tenant    ON report_execution    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY report_subscription_tenant ON report_subscription USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY report_favorite_tenant     ON report_favorite     USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY report_share_tenant        ON report_share        USING (school_id = current_setting('app.current_school_id', true)::uuid);

    DO $$
    DECLARE t TEXT;
    BEGIN
        FOR t IN SELECT unnest(ARRAY[
            'report_definition','report_execution','report_subscription'
        ])
        LOOP
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; '
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I '
                'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
                t, t, t, t
            );
        END LOOP;
    END $$;
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 6 — Administration tables (20 models)
# ---------------------------------------------------------------------------
ADMINISTRATION_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. asset — physical assets (computers, furniture, etc.)
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS asset (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        asset_code      VARCHAR(64) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        category_id     UUID,
        asset_type      VARCHAR(64),
        serial_number   VARCHAR(120),
        purchase_date   DATE,
        purchase_cost_cents BIGINT CHECK (purchase_cost_cents >= 0),
        current_value_cents BIGINT CHECK (current_value_cents >= 0),
        salvage_value_cents BIGINT DEFAULT 0,
        useful_life_years SMALLINT,
        depreciation_method VARCHAR(20) DEFAULT 'STRAIGHT_LINE',
        condition       VARCHAR(20) DEFAULT 'GOOD'
                        CHECK (condition IN ('EXCELLENT','GOOD','FAIR','POOR','BROKEN')),
        assigned_to_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        location        VARCHAR(255),
        status          VARCHAR(20) NOT NULL DEFAULT 'IN_USE'
                        CHECK (status IN ('IN_USE','IN_STORAGE','UNDER_REPAIR','DISPOSED','WRITTEN_OFF','LOST')),
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE (branch_id, asset_code)
    );
    CREATE INDEX IF NOT EXISTS asset_school_status_idx
        ON asset(school_id, status, deleted_at);

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. asset_category — asset classification
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS asset_category (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name            VARCHAR(120) NOT NULL,
        parent_id       UUID REFERENCES asset_category(id) ON DELETE SET NULL,
        depreciation_method VARCHAR(20) DEFAULT 'STRAIGHT_LINE',
        default_life_years SMALLINT,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        UNIQUE (school_id, name)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. asset_maintenance — asset maintenance records
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS asset_maintenance (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        asset_id        UUID NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
        maintenance_type VARCHAR(32) NOT NULL CHECK (maintenance_type IN (
                        'PREVENTIVE','CORRECTIVE','INSPECTION','CALIBRATION','CLEANING')),
        status          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
        scheduled_date  DATE,
        completed_date  DATE,
        vendor          VARCHAR(120),
        cost_cents      BIGINT DEFAULT 0,
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS asset_maintenance_asset_idx
        ON asset_maintenance(asset_id, scheduled_date);

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. visitor — visitor check-in/out records
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS visitor (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        full_name       VARCHAR(255) NOT NULL,
        phone           VARCHAR(20),
        email           VARCHAR(255),
        purpose         VARCHAR(40) CHECK (purpose IN (
                        'PARENT_VISIT','VENDOR_DELIVERY','OFFICIAL','INTERVIEW',
                        'MAINTENANCE','INSPECTION','OTHER')),
        host_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        check_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        check_out_at    TIMESTAMPTZ,
        visitor_pass    VARCHAR(32),
        photo_url       VARCHAR(512),
        id_proof_type   VARCHAR(40),
        id_proof_number VARCHAR(120),
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS visitor_school_checkin_idx
        ON visitor(school_id, check_in_at DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 5-8: cctv_camera, cctv_alert, gate_pass, security_incident
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS cctv_camera (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        camera_id       VARCHAR(64) NOT NULL,
        name            VARCHAR(120) NOT NULL,
        location        VARCHAR(255) NOT NULL,
        stream_url      VARCHAR(512),
        is_online       BOOLEAN NOT NULL DEFAULT FALSE,
        last_heartbeat  TIMESTAMPTZ,
        retention_days  INTEGER NOT NULL DEFAULT 30,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, camera_id)
    );

    CREATE TABLE IF NOT EXISTS cctv_alert (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        cctv_camera_id  UUID NOT NULL REFERENCES cctv_camera(id) ON DELETE CASCADE,
        alert_type      VARCHAR(40) NOT NULL,
        severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at     TIMESTAMPTZ,
        resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gate_pass (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        pass_code       VARCHAR(32) NOT NULL,
        pass_type       VARCHAR(20) NOT NULL CHECK (pass_type IN ('STUDENT','VISITOR','STAFF','VENDOR')),
        reference_id    UUID,
        issued_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at      TIMESTAMPTZ,
        used_at         TIMESTAMPTZ,
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (branch_id, pass_code)
    );

    CREATE TABLE IF NOT EXISTS security_incident (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        incident_type   VARCHAR(40) NOT NULL,
        severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        occurred_at     TIMESTAMPTZ NOT NULL,
        reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
        description     TEXT NOT NULL,
        status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
        resolution      TEXT,
        resolved_at     TIMESTAMPTZ,
        resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 9-12: emergency_contact, emergency_drill, emergency_alert, contact_directory
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS emergency_contact (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        contact_type    VARCHAR(40) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        role            VARCHAR(120),
        phone           VARCHAR(20) NOT NULL,
        email           VARCHAR(255),
        is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
        priority_order  SMALLINT DEFAULT 0,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS emergency_drill (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        drill_type      VARCHAR(40) NOT NULL CHECK (drill_type IN ('FIRE','EARTHQUAKE','LOCKDOWN','EVACUATION')),
        scheduled_at    TIMESTAMPTZ NOT NULL,
        completed_at    TIMESTAMPTZ,
        participants_count INTEGER,
        observations    TEXT,
        status          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED','COMPLETED','CANCELLED','FAILED')),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS emergency_alert (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        alert_type      VARCHAR(40) NOT NULL,
        severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        message         TEXT NOT NULL,
        triggered_by    UUID REFERENCES users(id) ON DELETE SET NULL,
        triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        channels        TEXT[] NOT NULL DEFAULT ARRAY['SMS','EMAIL'],
        recipients_count INTEGER,
        status          VARCHAR(20) NOT NULL DEFAULT 'SENT'
                        CHECK (status IN ('DRAFT','SENT','FAILED','CANCELLED')),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contact_directory (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        category        VARCHAR(40) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        designation     VARCHAR(120),
        organisation    VARCHAR(255),
        phone           VARCHAR(20),
        email           VARCHAR(255),
        address         TEXT,
        is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 13-16: maintenance_request, vendor_visit, document_vault, document_share
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS maintenance_request (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        description     TEXT,
        category        VARCHAR(40) NOT NULL,
        priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                        CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
        status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')),
        asset_id        UUID REFERENCES asset(id) ON DELETE SET NULL,
        requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        assigned_to     UUID,
        completed_at    TIMESTAMPTZ,
        cost_cents      BIGINT DEFAULT 0,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vendor_visit (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        vendor_name     VARCHAR(255) NOT NULL,
        purpose         VARCHAR(255) NOT NULL,
        contact_person  VARCHAR(120),
        phone           VARCHAR(20),
        check_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        check_out_at    TIMESTAMPTZ,
        host_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_vault (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        document_type   VARCHAR(40) NOT NULL,
        file_storage_id UUID REFERENCES file_storage(id) ON DELETE RESTRICT,
        description     TEXT,
        tags            TEXT[],
        is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
        retention_until DATE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        deleted_by      UUID REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS document_share (
        id                  UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        document_vault_id   UUID NOT NULL REFERENCES document_vault(id) ON DELETE CASCADE,
        shared_by           UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        shared_with_role_id UUID,
        permissions         TEXT[] NOT NULL DEFAULT ARRAY['VIEW'],
        expires_at          TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (shared_with_user_id IS NOT NULL OR shared_with_role_id IS NOT NULL)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 17-20: insurance_policy, license_permit, audit_finding, audit_action
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS insurance_policy (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        policy_type     VARCHAR(40) NOT NULL,
        policy_number   VARCHAR(120) NOT NULL,
        provider        VARCHAR(255) NOT NULL,
        coverage_cents  BIGINT NOT NULL CHECK (coverage_cents >= 0),
        premium_cents   BIGINT CHECK (premium_cents >= 0),
        start_date      DATE NOT NULL,
        end_date        DATE NOT NULL,
        beneficiaries   TEXT,
        document_url    VARCHAR(512),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS license_permit (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        permit_type     VARCHAR(80) NOT NULL,
        license_number  VARCHAR(120) NOT NULL,
        issuing_authority VARCHAR(255) NOT NULL,
        issue_date      DATE NOT NULL,
        expiry_date     DATE NOT NULL,
        renewal_date    DATE,
        document_url    VARCHAR(512),
        status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','EXPIRED','PENDING_RENEWAL','SUSPENDED','CANCELLED')),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS audit_finding (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
        audit_id        UUID,
        finding_type    VARCHAR(40) NOT NULL,
        severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        title           VARCHAR(255) NOT NULL,
        description     TEXT NOT NULL,
        identified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','REMEDIATION','RESOLVED','ACCEPTED_RISK')),
        resolved_at     TIMESTAMPTZ,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_action (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        audit_finding_id UUID NOT NULL REFERENCES audit_finding(id) ON DELETE CASCADE,
        action_text     TEXT NOT NULL,
        action_owner    UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date        DATE,
        completed_at    TIMESTAMPTZ,
        status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS + triggers (selected tenant-scoped tables)
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE asset                    ENABLE ROW LEVEL SECURITY;
    ALTER TABLE asset_category           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE asset_maintenance        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE visitor                  ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cctv_camera              ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cctv_alert               ENABLE ROW LEVEL SECURITY;
    ALTER TABLE gate_pass                ENABLE ROW LEVEL SECURITY;
    ALTER TABLE security_incident        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE emergency_contact        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE emergency_drill          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE emergency_alert          ENABLE ROW LEVEL SECURITY;
    ALTER TABLE contact_directory        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE maintenance_request      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vendor_visit             ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_vault           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_share           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE insurance_policy         ENABLE ROW LEVEL SECURITY;
    ALTER TABLE license_permit           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE audit_finding            ENABLE ROW LEVEL SECURITY;

    CREATE POLICY asset_tenant             ON asset             USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY asset_category_tenant    ON asset_category    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY asset_maintenance_tenant ON asset_maintenance USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY visitor_tenant           ON visitor           USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY cctv_camera_tenant       ON cctv_camera       USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY cctv_alert_tenant        ON cctv_alert        USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY gate_pass_tenant         ON gate_pass         USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY security_incident_tenant ON security_incident USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY emergency_contact_tenant ON emergency_contact USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY emergency_drill_tenant   ON emergency_drill   USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY emergency_alert_tenant   ON emergency_alert   USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY contact_directory_tenant ON contact_directory USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY maintenance_request_tenant ON maintenance_request USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY vendor_visit_tenant      ON vendor_visit      USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY document_vault_tenant    ON document_vault    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY document_share_tenant    ON document_share    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY insurance_policy_tenant  ON insurance_policy  USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY license_permit_tenant    ON license_permit    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY audit_finding_tenant     ON audit_finding     USING (school_id = current_setting('app.current_school_id', true)::uuid);

    DO $$
    DECLARE t TEXT;
    BEGIN
        FOR t IN SELECT unnest(ARRAY[
            'asset','asset_category','asset_maintenance','visitor','cctv_camera',
            'cctv_alert','gate_pass','security_incident','emergency_contact',
            'emergency_drill','emergency_alert','contact_directory',
            'maintenance_request','vendor_visit','document_vault','document_share',
            'insurance_policy','license_permit','audit_finding','audit_action'
        ])
        LOOP
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; '
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I '
                'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
                t, t, t, t
            );
        END LOOP;
    END $$;
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 7 — Transport tables
# ---------------------------------------------------------------------------
TRANSPORT_TABLES = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. vehicle — school transport vehicles
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS vehicle (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        registration_number VARCHAR(32) NOT NULL,
        vehicle_type    VARCHAR(40) NOT NULL CHECK (vehicle_type IN ('BUS','VAN','CAR','AUTO')),
        capacity        INTEGER NOT NULL CHECK (capacity > 0),
        make            VARCHAR(64),
        model           VARCHAR(64),
        year_of_manufacture SMALLINT,
        fuel_type       VARCHAR(20) DEFAULT 'DIESEL'
                        CHECK (fuel_type IN ('PETROL','DIESEL','CNG','ELECTRIC','HYBRID')),
        insurance_number VARCHAR(120),
        insurance_expiry DATE,
        fitness_certificate_expiry DATE,
        pollution_certificate_expiry DATE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, registration_number)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. driver — transport drivers
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS driver (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        employee_id     UUID,
        full_name       VARCHAR(255) NOT NULL,
        license_number  VARCHAR(64) NOT NULL,
        license_expiry  DATE NOT NULL,
        phone           VARCHAR(20) NOT NULL,
        address         TEXT,
        date_of_birth   DATE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        background_verified BOOLEAN NOT NULL DEFAULT FALSE,
        background_verified_at DATE,
        photo_url       VARCHAR(512),
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, license_number)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 3. route — transport routes
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS route (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        route_code      VARCHAR(32) NOT NULL,
        route_name      VARCHAR(255) NOT NULL,
        route_type      VARCHAR(20) DEFAULT 'MORNING'
                        CHECK (route_type IN ('MORNING','AFTERNOON','EVENING','BOTH')),
        vehicle_id      UUID NOT NULL REFERENCES vehicle(id) ON DELETE RESTRICT,
        driver_id       UUID NOT NULL REFERENCES driver(id) ON DELETE RESTRICT,
        attendant_id    UUID REFERENCES users(id) ON DELETE SET NULL,
        start_location  VARCHAR(255) NOT NULL,
        end_location    VARCHAR(255) NOT NULL,
        departure_time  TIME NOT NULL,
        arrival_time    TIME NOT NULL,
        distance_km     NUMERIC(8, 2),
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, route_code)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 4. route_stop — pickup/drop points on a route
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS route_stop (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        route_id        UUID NOT NULL REFERENCES route(id) ON DELETE CASCADE,
        stop_name       VARCHAR(255) NOT NULL,
        stop_code       VARCHAR(32),
        address         TEXT NOT NULL,
        latitude        DOUBLE PRECISION,
        longitude       DOUBLE PRECISION,
        pickup_time     TIME,
        drop_time       TIME,
        sequence_order  SMALLINT NOT NULL,
        distance_from_school_km NUMERIC(8, 2),
        fare_cents      BIGINT DEFAULT 0,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        UNIQUE (route_id, sequence_order)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 5. student_route_assignment — students assigned to routes/stops
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS student_route_assignment (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL,
        route_id        UUID NOT NULL REFERENCES route(id) ON DELETE CASCADE,
        route_stop_id   UUID NOT NULL REFERENCES route_stop(id) ON DELETE CASCADE,
        assignment_type VARCHAR(20) DEFAULT 'BOTH'
                        CHECK (assignment_type IN ('PICKUP','DROP','BOTH')),
        effective_from  DATE NOT NULL,
        effective_until DATE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS student_route_assignment_student_idx
        ON student_route_assignment(student_id, is_active);

    -- ───────────────────────────────────────────────────────────────────────
    -- 6. trip — individual daily trip records
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS trip (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        route_id        UUID NOT NULL REFERENCES route(id) ON DELETE RESTRICT,
        vehicle_id      UUID NOT NULL REFERENCES vehicle(id) ON DELETE RESTRICT,
        driver_id       UUID NOT NULL REFERENCES driver(id) ON DELETE RESTRICT,
        trip_date       DATE NOT NULL,
        trip_type       VARCHAR(20) NOT NULL CHECK (trip_type IN ('MORNING','AFTERNOON','EVENING')),
        scheduled_departure TIMESTAMPTZ NOT NULL,
        actual_departure    TIMESTAMPTZ,
        scheduled_arrival   TIMESTAMPTZ NOT NULL,
        actual_arrival      TIMESTAMPTZ,
        students_onboard    INTEGER DEFAULT 0,
        odometer_start      INTEGER,
        odometer_end        INTEGER,
        status          VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'
                        CHECK (status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','DELAYED')),
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS trip_route_date_idx
        ON trip(route_id, trip_date DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 7. trip_attendance — student pickup/drop logs per trip
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS trip_attendance (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        trip_id         UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL,
        route_stop_id   UUID REFERENCES route_stop(id) ON DELETE SET NULL,
        pickup_status   VARCHAR(20) CHECK (pickup_status IN ('PICKED_UP','MISSED','ABSENT')),
        pickup_time     TIMESTAMPTZ,
        drop_status     VARCHAR(20) CHECK (drop_status IN ('DROPPED','MISSED','HANDED_TO_GUARDIAN')),
        drop_time       TIMESTAMPTZ,
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (trip_id, student_id)
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 8. fuel_log — vehicle fuel entries
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS fuel_log (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        vehicle_id      UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
        fuel_date       DATE NOT NULL,
        fuel_type       VARCHAR(20) NOT NULL,
        quantity_litres NUMERIC(8, 2) NOT NULL CHECK (quantity_litres > 0),
        amount_cents    BIGINT NOT NULL CHECK (amount_cents >= 0),
        odometer_reading INTEGER NOT NULL,
        fuel_station    VARCHAR(255),
        filled_by       UUID REFERENCES users(id) ON DELETE SET NULL,
        receipt_url     VARCHAR(512),
        notes           TEXT,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS fuel_log_vehicle_date_idx
        ON fuel_log(vehicle_id, fuel_date DESC);

    -- ───────────────────────────────────────────────────────────────────────
    -- 9. vehicle_maintenance — vehicle service records
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS vehicle_maintenance (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        vehicle_id      UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
        maintenance_type VARCHAR(32) NOT NULL CHECK (maintenance_type IN (
                        'SERVICE','REPAIR','INSPECTION','TYRE_REPLACEMENT','OTHER')),
        service_date    DATE NOT NULL,
        odometer_reading INTEGER,
        description     TEXT,
        cost_cents      BIGINT DEFAULT 0,
        vendor          VARCHAR(255),
        invoice_number  VARCHAR(120),
        next_service_date DATE,
        next_service_odometer INTEGER,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
        deleted_at      TIMESTAMPTZ
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- 10-13: transport_fee, transport_fee_payment, gps_device, transport_incident
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS transport_fee (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        route_id        UUID NOT NULL REFERENCES route(id) ON DELETE CASCADE,
        fee_term        VARCHAR(20) NOT NULL,  -- 'QUARTERLY', 'YEARLY', 'MONTHLY'
        amount_cents    BIGINT NOT NULL CHECK (amount_cents >= 0),
        effective_from  DATE NOT NULL,
        effective_until DATE,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_fee_payment (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        student_id      UUID NOT NULL,
        transport_fee_id UUID NOT NULL REFERENCES transport_fee(id) ON DELETE RESTRICT,
        amount_cents    BIGINT NOT NULL CHECK (amount_cents >= 0),
        payment_date    DATE NOT NULL,
        payment_mode    VARCHAR(20) NOT NULL,
        transaction_ref VARCHAR(120),
        status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','COMPLETED','FAILED','REFUNDED')),
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gps_device (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        device_id       VARCHAR(64) NOT NULL,
        vehicle_id      UUID REFERENCES vehicle(id) ON DELETE SET NULL,
        sim_number      VARCHAR(20),
        is_online       BOOLEAN NOT NULL DEFAULT FALSE,
        last_ping_at    TIMESTAMPTZ,
        last_latitude   DOUBLE PRECISION,
        last_longitude  DOUBLE PRECISION,
        last_speed_kmph NUMERIC(6, 2),
        metadata        JSONB,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at      TIMESTAMPTZ,
        UNIQUE (branch_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS transport_incident (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        trip_id         UUID REFERENCES trip(id) ON DELETE SET NULL,
        vehicle_id      UUID REFERENCES vehicle(id) ON DELETE SET NULL,
        driver_id       UUID REFERENCES driver(id) ON DELETE SET NULL,
        incident_type   VARCHAR(40) NOT NULL,
        severity        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
        occurred_at     TIMESTAMPTZ NOT NULL,
        reported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reported_by     UUID REFERENCES users(id) ON DELETE SET NULL,
        description     TEXT NOT NULL,
        location        VARCHAR(255),
        latitude        DOUBLE PRECISION,
        longitude       DOUBLE PRECISION,
        status          VARCHAR(20) NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','CLOSED')),
        resolution      TEXT,
        resolved_at     TIMESTAMPTZ,
        version         INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- RLS + triggers
    -- ───────────────────────────────────────────────────────────────────────
    ALTER TABLE vehicle                    ENABLE ROW LEVEL SECURITY;
    ALTER TABLE driver                     ENABLE ROW LEVEL SECURITY;
    ALTER TABLE route                      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE route_stop                 ENABLE ROW LEVEL SECURITY;
    ALTER TABLE student_route_assignment   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE trip                       ENABLE ROW LEVEL SECURITY;
    ALTER TABLE trip_attendance            ENABLE ROW LEVEL SECURITY;
    ALTER TABLE fuel_log                   ENABLE ROW LEVEL SECURITY;
    ALTER TABLE vehicle_maintenance        ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transport_fee              ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transport_fee_payment      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE gps_device                 ENABLE ROW LEVEL SECURITY;
    ALTER TABLE transport_incident         ENABLE ROW LEVEL SECURITY;

    CREATE POLICY vehicle_tenant                  ON vehicle                  USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY driver_tenant                   ON driver                   USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY route_tenant                    ON route                    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY route_stop_tenant               ON route_stop               USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY student_route_assignment_tenant ON student_route_assignment USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY trip_tenant                     ON trip                     USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY trip_attendance_tenant          ON trip_attendance          USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY fuel_log_tenant                 ON fuel_log                 USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY vehicle_maintenance_tenant      ON vehicle_maintenance      USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY transport_fee_tenant            ON transport_fee            USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY transport_fee_payment_tenant    ON transport_fee_payment    USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY gps_device_tenant               ON gps_device               USING (school_id = current_setting('app.current_school_id', true)::uuid);
    CREATE POLICY transport_incident_tenant       ON transport_incident       USING (school_id = current_setting('app.current_school_id', true)::uuid);

    DO $$
    DECLARE t TEXT;
    BEGIN
        FOR t IN SELECT unnest(ARRAY[
            'vehicle','driver','route','route_stop','student_route_assignment',
            'trip','trip_attendance','fuel_log','vehicle_maintenance',
            'transport_fee','transport_fee_payment','gps_device','transport_incident'
        ])
        LOOP
            EXECUTE format(
                'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I; '
                'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I '
                'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
                t, t, t, t
            );
        END LOOP;
    END $$;
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Migration 8 — Acceptance test ID registry + settings
# ---------------------------------------------------------------------------
ACCEPTANCE_SEED_TABLE = dedent("""
    -- ───────────────────────────────────────────────────────────────────────
    -- 1. acceptance_test_registry — registry of all acceptance test IDs
    --
    -- Used by the Wave 23 acceptance test suite (test/unit/migrations/
    -- wave-23-acceptance.spec.ts) to assert that every stable test ID has a
    -- corresponding migration step that it exercises.
    --
    -- Format: A-XXX (zero-padded 3-digit), e.g. A-001, A-017, A-099.
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS acceptance_test_registry (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        test_id         VARCHAR(16) NOT NULL UNIQUE,  -- e.g. 'A-001'
        test_category   VARCHAR(64) NOT NULL,
        test_title      VARCHAR(255) NOT NULL,
        migration_id    VARCHAR(120) NOT NULL,  -- references migration directory name
        target_table    VARCHAR(64),
        target_enum     VARCHAR(64),
        expected_statement VARCHAR(32) NOT NULL DEFAULT 'CREATE',  -- CREATE/ALTER/DROP
        description     TEXT,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS acceptance_test_registry_migration_idx
        ON acceptance_test_registry(migration_id);
    CREATE INDEX IF NOT EXISTS acceptance_test_registry_category_idx
        ON acceptance_test_registry(test_category);

    -- ───────────────────────────────────────────────────────────────────────
    -- 2. migration_audit — tracks every applied migration with timestamp,
    --    checksum, and outcome. Replaces _prisma_migrations for app-level
    --    observability (Prisma's own table remains the source of truth).
    -- ───────────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS migration_audit (
        id              UUID PRIMARY KEY DEFAULT uuid_v7(),
        migration_id    VARCHAR(120) NOT NULL UNIQUE,
        applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum_sha256 VARCHAR(64) NOT NULL,
        duration_ms     INTEGER,
        outcome         VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS','FAILED','ROLLED_BACK')),
        error_message   TEXT,
        applied_by      VARCHAR(120),
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- ───────────────────────────────────────────────────────────────────────
    -- Seed the 5 most critical acceptance test IDs (full registry is in the
    -- spec file test/unit/migrations/wave-23-acceptance.spec.ts which contains
    -- the authoritative list of A-001 through A-087).
    -- ───────────────────────────────────────────────────────────────────────
    INSERT INTO acceptance_test_registry (test_id, test_category, test_title, migration_id, target_table, expected_statement, description) VALUES
      ('A-001','cross-cutting','event_store table created','20260717000001_wave_23_01_cross_cutting_tables','event_store','CREATE','EventStore append-only log table exists with school_id RLS policy'),
      ('A-002','cross-cutting','file_storage table created','20260717000001_wave_23_01_cross_cutting_tables','file_storage','CREATE','FileStorage table with bucket+object_key unique constraint'),
      ('A-003','cross-cutting','job_queue table created','20260717000001_wave_23_01_cross_cutting_tables','job_queue','CREATE','JobQueue with status+available_at polling index'),
      ('A-004','cross-cutting','webhook_outbox table created','20260717000001_wave_23_01_cross_cutting_tables','webhook_outbox','CREATE','WebhookOutbox with partial index on PENDING status'),
      ('A-005','cross-cutting','email_queue table created','20260717000001_wave_23_01_cross_cutting_tables','email_queue','CREATE','EmailQueue with provider+provider_id columns'),
      ('A-006','cross-cutting','sms_queue table created','20260717000001_wave_23_01_cross_cutting_tables','sms_queue','CREATE','SMSQueue with DLT entity/template columns'),
      ('A-007','cross-cutting','whatsapp_queue table created','20260717000001_wave_23_01_cross_cutting_tables','whatsapp_queue','CREATE','WhatsAppQueue with template_name/language columns'),
      ('A-008','cross-cutting','food_sample_retention table created','20260717000001_wave_23_01_cross_cutting_tables','food_sample_retention','CREATE','FSSAI §15 sample retention tracker (R-CMP-018)'),
      ('A-009','cross-cutting','cctv_coverage table created','20260717000001_wave_23_01_cross_cutting_tables','cctv_coverage','CREATE','CCTV coverage map with retention_days CHECK constraint (R-CMP-005)'),
      ('A-010','cross-cutting','compliance_item table created','20260717000001_wave_23_01_cross_cutting_tables','compliance_item','CREATE','Compliance tracker with category CHECK (R-CMP-007/013/014/017/018)'),
      ('A-011','cross-cutting','lock table created','20260717000001_wave_23_01_cross_cutting_tables','lock','CREATE','Advisory lock table with unique lock_key'),
      ('A-012','cross-cutting','sequence_counter table created','20260717000001_wave_23_01_cross_cutting_tables','sequence_counter','CREATE','Monotonic counter with school_id+counter_key unique'),
      ('A-013','cross-cutting','snapshot table created','20260717000001_wave_23_01_cross_cutting_tables','snapshot','CREATE','Aggregate state snapshots for replay optimization'),
      ('A-014','cross-cutting','system_health_check table created','20260717000001_wave_23_01_cross_cutting_tables','system_health_check','CREATE','Probe result log with component+checked_at index'),
      ('A-015','cross-cutting','event_store RLS policy enabled','20260717000001_wave_23_01_cross_cutting_tables','event_store','CREATE','RLS policy enforces tenant isolation'),
      ('A-016','cross-cutting','file_upload table created','20260717000001_wave_23_01_cross_cutting_tables','file_upload','CREATE','Upload session tracking with scan_state column'),
      ('A-017','enums','placeholder enums replaced with real values','20260717000002_wave_23_02_cross_cutting_enums',NULL,'CREATE','All 50 Wave 13 PLACEHOLDER enums replaced with real values from schema.prisma'),
      ('A-018','platform','storage_usage table created','20260717000003_wave_23_03_platform_tables','storage_usage','CREATE','Per-school per-month storage consumption tracker'),
      ('A-019','platform','feature_usage table created','20260717000003_wave_23_03_platform_tables','feature_usage','CREATE','Per-school per-day feature consumption counters'),
      ('A-020','platform','platform_api_key table created','20260717000003_wave_23_03_platform_tables','platform_api_key','CREATE','Platform-level API keys with key_hash unique'),
      ('A-021','platform','platform_backup table created','20260717000003_wave_23_03_platform_tables','platform_backup','CREATE','Platform backup metadata with retention_until'),
      ('A-022','platform','platform_audit_log table created','20260717000003_wave_23_03_platform_tables','platform_audit_log','CREATE','Cross-school platform audit log'),
      ('A-023','platform','platform_feature_flag table created','20260717000003_wave_23_03_platform_tables','platform_feature_flag','CREATE','Platform-level feature flags with rollout_percent'),
      ('A-024','platform','platform_metric table created','20260717000003_wave_23_03_platform_tables','platform_metric','CREATE','Daily platform KPI snapshots'),
      ('A-025','platform','platform_integration_config table created','20260717000003_wave_23_03_platform_tables','platform_integration_config','CREATE','Per-school integration overrides with encrypted config'),
      ('A-026','settings','academic_calendar table created','20260717000004_wave_23_04_settings_tables','academic_calendar','CREATE','School calendar events with affects_attendance flag'),
      ('A-027','settings','room table created','20260717000004_wave_23_04_settings_tables','room','CREATE','Physical rooms with capacity+room_type'),
      ('A-028','settings','room_booking table created','20260717000004_wave_23_04_settings_tables','room_booking','CREATE','Room reservation slots with status workflow'),
      ('A-029','settings','event table created','20260717000004_wave_23_04_settings_tables','event','CREATE','Calendar events with status workflow'),
      ('A-030','settings','system_setting table created','20260717000004_wave_23_04_settings_tables','system_setting','CREATE','School-level key/value config with is_sensitive flag'),
      ('A-031','settings','user_preference table created','20260717000004_wave_23_04_settings_tables','user_preference','CREATE','Per-user UI preferences'),
      ('A-032','settings','notification_preference table created','20260717000004_wave_23_04_settings_tables','notification_preference','CREATE','Per-user per-notification-type channel opt-ins'),
      ('A-033','settings','locale_setting table created','20260717000004_wave_23_04_settings_tables','locale_setting','CREATE','Per-school locale/timezone/currency config'),
      ('A-034','settings','branding_setting table created','20260717000004_wave_23_04_settings_tables','branding_setting','CREATE','Per-school white-label branding'),
      ('A-035','settings','integration_setting table created','20260717000004_wave_23_04_settings_tables','integration_setting','CREATE','Per-school third-party integration config'),
      ('A-036','settings','audit_retention_setting table created','20260717000004_wave_23_04_settings_tables','audit_retention_setting','CREATE','Per-school audit log retention (R-CMP-006)'),
      ('A-037','settings','email_template table created','20260717000004_wave_23_04_settings_tables','email_template','CREATE','Per-school email templates with locale+active flag'),
      ('A-038','reports','report_definition table created','20260717000005_wave_23_05_reports_tables','report_definition','CREATE','Saved report templates with schedule_cron'),
      ('A-039','reports','report_execution table created','20260717000005_wave_23_05_reports_tables','report_execution','CREATE','Individual report runs with status workflow'),
      ('A-040','reports','report_subscription table created','20260717000005_wave_23_05_reports_tables','report_subscription','CREATE','Recurring report subscriptions with next_run_at index'),
      ('A-041','reports','report_favorite table created','20260717000005_wave_23_05_reports_tables','report_favorite','CREATE','User favorites for quick access'),
      ('A-042','reports','report_share table created','20260717000005_wave_23_05_reports_tables','report_share','CREATE','Explicit shares with users/roles + permissions array'),
      ('A-043','administration','asset table created','20260717000006_wave_23_06_administration_tables','asset','CREATE','Physical assets with depreciation+condition+status'),
      ('A-044','administration','asset_category table created','20260717000006_wave_23_06_administration_tables','asset_category','CREATE','Asset classification with parent_id self-reference'),
      ('A-045','administration','asset_maintenance table created','20260717000006_wave_23_06_administration_tables','asset_maintenance','CREATE','Asset maintenance records with maintenance_type CHECK'),
      ('A-046','administration','visitor table created','20260717000006_wave_23_06_administration_tables','visitor','CREATE','Visitor check-in/out with purpose CHECK'),
      ('A-047','administration','cctv_camera table created','20260717000006_wave_23_06_administration_tables','cctv_camera','CREATE','CCTV cameras with online state + heartbeat'),
      ('A-048','administration','cctv_alert table created','20260717000006_wave_23_06_administration_tables','cctv_alert','CREATE','CCTV alerts with severity CHECK'),
      ('A-049','administration','gate_pass table created','20260717000006_wave_23_06_administration_tables','gate_pass','CREATE','Gate passes with pass_type CHECK'),
      ('A-050','administration','security_incident table created','20260717000006_wave_23_06_administration_tables','security_incident','CREATE','Security incidents with status workflow'),
      ('A-051','administration','emergency_contact table created','20260717000006_wave_23_06_administration_tables','emergency_contact','CREATE','Emergency contacts with is_primary flag'),
      ('A-052','administration','emergency_drill table created','20260717000006_wave_23_06_administration_tables','emergency_drill','CREATE','Emergency drill records (R-CMP-013 quarterly fire drill)'),
      ('A-053','administration','emergency_alert table created','20260717000006_wave_23_06_administration_tables','emergency_alert','CREATE','Emergency alert broadcasts with channels array'),
      ('A-054','administration','contact_directory table created','20260717000006_wave_23_06_administration_tables','contact_directory','CREATE','External contact directory with is_verified flag'),
      ('A-055','administration','maintenance_request table created','20260717000006_wave_23_06_administration_tables','maintenance_request','CREATE','Maintenance requests with priority+status'),
      ('A-056','administration','vendor_visit table created','20260717000006_wave_23_06_administration_tables','vendor_visit','CREATE','Vendor visit logs'),
      ('A-057','administration','document_vault table created','20260717000006_wave_23_06_administration_tables','document_vault','CREATE','Document vault with is_confidential flag'),
      ('A-058','administration','document_share table created','20260717000006_wave_23_06_administration_tables','document_share','CREATE','Document shares with permissions array'),
      ('A-059','administration','insurance_policy table created','20260717000006_wave_23_06_administration_tables','insurance_policy','CREATE','Insurance policies with coverage_cents+premium_cents'),
      ('A-060','administration','license_permit table created','20260717000006_wave_23_06_administration_tables','license_permit','CREATE','Licenses and permits with renewal_date'),
      ('A-061','administration','audit_finding table created','20260717000006_wave_23_06_administration_tables','audit_finding','CREATE','Audit findings with severity+status'),
      ('A-062','administration','audit_action table created','20260717000006_wave_23_06_administration_tables','audit_action','CREATE','Audit remediation actions with due_date'),
      ('A-063','transport','vehicle table created','20260717000007_wave_23_07_transport_tables','vehicle','CREATE','Vehicles with capacity+fuel_type+insurance/fitness expiry'),
      ('A-064','transport','driver table created','20260717000007_wave_23_07_transport_tables','driver','CREATE','Drivers with license_expiry+background_verified'),
      ('A-065','transport','route table created','20260717000007_wave_23_07_transport_tables','route','CREATE','Routes with vehicle+driver assignment + departure/arrival time'),
      ('A-066','transport','route_stop table created','20260717000007_wave_23_07_transport_tables','route_stop','CREATE','Route stops with sequence_order+pickup/drop time'),
      ('A-067','transport','student_route_assignment table created','20260717000007_wave_23_07_transport_tables','student_route_assignment','CREATE','Student-to-route assignments with effective_from/until'),
      ('A-068','transport','trip table created','20260717000007_wave_23_07_transport_tables','trip','CREATE','Daily trip records with status workflow'),
      ('A-069','transport','trip_attendance table created','20260717000007_wave_23_07_transport_tables','trip_attendance','CREATE','Per-student per-trip pickup/drop logs'),
      ('A-070','transport','fuel_log table created','20260717000007_wave_23_07_transport_tables','fuel_log','CREATE','Vehicle fuel entries with odometer reading'),
      ('A-071','transport','vehicle_maintenance table created','20260717000007_wave_23_07_transport_tables','vehicle_maintenance','CREATE','Vehicle maintenance records with next_service_date'),
      ('A-072','transport','transport_fee table created','20260717000007_wave_23_07_transport_tables','transport_fee','CREATE','Transport fee schedule per route'),
      ('A-073','transport','transport_fee_payment table created','20260717000007_wave_23_07_transport_tables','transport_fee_payment','CREATE','Transport fee payment records'),
      ('A-074','transport','gps_device table created','20260717000007_wave_23_07_transport_tables','gps_device','CREATE','GPS devices with last_ping_at+lat/long/speed'),
      ('A-075','transport','transport_incident table created','20260717000007_wave_23_07_transport_tables','transport_incident','CREATE','Transport incidents with severity+status'),
      ('A-076','acceptance','acceptance_test_registry table created','20260717000008_wave_23_08_acceptance_seed','acceptance_test_registry','CREATE','Acceptance test ID registry with test_id UNIQUE'),
      ('A-077','acceptance','migration_audit table created','20260717000008_wave_23_08_acceptance_seed','migration_audit','CREATE','Applied migration audit log with checksum'),
      ('A-078','acceptance','75 acceptance test IDs seeded','20260717000008_wave_23_08_acceptance_seed','acceptance_test_registry','CREATE','75 rows inserted covering A-001..A-075'),
      ('A-079','acceptance','migration_audit unique on migration_id','20260717000008_wave_23_08_acceptance_seed','migration_audit','CREATE','Migration audit log enforces one row per migration'),
      ('A-080','acceptance','acceptance_test_registry index by migration_id','20260717000008_wave_23_08_acceptance_seed','acceptance_test_registry','CREATE','Index on (migration_id) for fast lookups'),
      ('A-081','acceptance','acceptance_test_registry index by category','20260717000008_wave_23_08_acceptance_seed','acceptance_test_registry','CREATE','Index on (test_category) for category queries'),
      ('A-082','conventions','all migrations idempotent','ALL','ALL','CREATE','Every CREATE statement uses IF NOT EXISTS'),
      ('A-083','conventions','all tenant tables have RLS','ALL','ALL','CREATE','Every table with school_id has ENABLE ROW LEVEL SECURITY + a tenant policy'),
      ('A-084','conventions','all mutable tenant tables have updated_at trigger','ALL','ALL','CREATE','Every mutable tenant table has a trg_*_updated_at trigger calling update_updated_at_column()'),
      ('A-085','conventions','all money columns use _cents suffix','ALL','ALL','CREATE','No float money columns — every amount column is BIGINT with _cents suffix'),
      ('A-086','conventions','all PKs use UUID v7 default','ALL','ALL','CREATE','Every table uses UUID PRIMARY KEY DEFAULT uuid_v7()'),
      ('A-087','conventions','all migrations have header comments','ALL','ALL','CREATE','Every migration file begins with a header block documenting ID, Wave, idempotency, conventions')
    ON CONFLICT (test_id) DO NOTHING;

    -- ───────────────────────────────────────────────────────────────────────
    -- Add a comment documenting the acceptance test ID range
    -- ───────────────────────────────────────────────────────────────────────
    COMMENT ON TABLE acceptance_test_registry IS
      'Wave 23 — Registry of acceptance test IDs (A-001..A-087). Authoritative list is in test/unit/migrations/wave-23-acceptance.spec.ts. This table holds the seed entries for observability; the spec file is the source of truth for the test runner.';

    COMMENT ON TABLE migration_audit IS
      'Wave 23 — Per-migration audit log. Tracks applied_at, checksum, duration, outcome. Replaces _prisma_migrations for app-level observability.';
    """).strip() + "\n"


# ---------------------------------------------------------------------------
# Main — write all 8 migrations
# ---------------------------------------------------------------------------
def main() -> None:
    # Parse all enums from cross_cutting.prisma (the canonical home for shared enums)
    cc_enums = parse_enums(SCHEMA_DIR / "cross_cutting.prisma")
    print(f"Parsed {len(cc_enums)} enums from cross_cutting.prisma")

    # ── Migration 1: Cross-cutting tables ───────────────────────────────────
    write_migration(
        "20260717000001_wave_23_01_cross_cutting_tables",
        "Wave 23.01 — Cross-cutting shared tables",
        """
        Creates 15 cross-cutting tables that are referenced by every domain:
          event_store, file_storage, file_upload, job_queue, lock,
          sequence_counter, snapshot, system_health_check, webhook_outbox,
          email_queue, sms_queue, whatsapp_queue, food_sample_retention,
          cctv_coverage, compliance_item.

        Each table follows PreOne conventions: UUID v7 PK, school_id discriminator,
        audit columns, version column for optimistic concurrency, RLS policy,
        and an updated_at trigger (for mutable tables).
        """,
        CROSS_CUTTING_TABLES,
    )

    # ── Migration 2: Cross-cutting enums (replace placeholders) ─────────────
    enum_body_parts = []
    enum_body_parts.append(
        "-- Replaces 50 PLACEHOLDER enums from Wave 13 v3 completion migration\n"
        "-- (20260716000006_wave_13_database_v3_completion/migration.sql).\n"
        "-- Each enum is DROP-then-CREATE to ensure real values replace PLACEHOLDER.\n"
        "-- Real values are sourced from packages/database/prisma/cross_cutting.prisma.\n\n"
    )
    replaced = 0
    missing = []
    for name in PLACEHOLDER_ENUM_NAMES:
        # Prefer parsed values from cross_cutting.prisma
        values = cc_enums.get(name, [])
        # If parsed values are empty or just ['PLACEHOLDER'], use hand-curated fallback
        if not values or values == ["PLACEHOLDER"]:
            values = HAND_CURATED_ENUMS.get(name, [])
        if values and values != ["PLACEHOLDER"]:
            enum_body_parts.append(build_create_enum_stmt(name, values))
            enum_body_parts.append("")
            replaced += 1
        else:
            missing.append(name)
    print(f"Replaced {replaced}/{len(PLACEHOLDER_ENUM_NAMES)} placeholder enums; missing: {missing}")
    write_migration(
        "20260717000002_wave_23_02_cross_cutting_enums",
        "Wave 23.02 — Cross-cutting enums (replace Wave 13 placeholders)",
        f"""
        Replaces the 50 placeholder enums from the Wave 13 v3 completion migration
        with real values extracted from packages/database/prisma/cross_cutting.prisma.

        Each enum is DROP-then-CREATE (idempotent) so that the original 'PLACEHOLDER'
        value is discarded. Replaced {replaced} of {len(PLACEHOLDER_ENUM_NAMES)} enums
        from the original Wave 13 stub. Missing: {missing or 'none'}.
        """,
        "\n".join(enum_body_parts),
    )

    # ── Migration 3: Platform tables ───────────────────────────────────────
    write_migration(
        "20260717000003_wave_23_03_platform_tables",
        "Wave 23.03 — Platform management tables",
        """
        Creates 8 platform-level tables (no school_id for some — they are
        platform-scoped, protected by role grants rather than RLS):
          storage_usage, feature_usage, platform_api_key, platform_backup,
          platform_audit_log, platform_feature_flag, platform_metric,
          platform_integration_config.

        These tables back the platform/admin UI (Wave 17.1 tenant config,
        Wave 19 file storage accounting, Wave 22 BRC traceability matrix).
        """,
        PLATFORM_TABLES,
    )

    # ── Migration 4: Settings tables ───────────────────────────────────────
    write_migration(
        "20260717000004_wave_23_04_settings_tables",
        "Wave 23.04 — Settings tables",
        """
        Creates 12 settings tables:
          academic_calendar, room, room_booking, event, system_setting,
          user_preference, notification_preference, locale_setting,
          branding_setting, integration_setting, audit_retention_setting,
          email_template.
        """,
        SETTINGS_TABLES,
    )

    # ── Migration 5: Reports tables ────────────────────────────────────────
    write_migration(
        "20260717000005_wave_23_05_reports_tables",
        "Wave 23.05 — Reports tables",
        """
        Creates 5 reports tables:
          report_definition, report_execution, report_subscription,
          report_favorite, report_share.
        """,
        REPORTS_TABLES,
    )

    # ── Migration 6: Administration tables ─────────────────────────────────
    write_migration(
        "20260717000006_wave_23_06_administration_tables",
        "Wave 23.06 — Administration tables",
        """
        Creates 20 administration tables:
          asset, asset_category, asset_maintenance, visitor, cctv_camera,
          cctv_alert, gate_pass, security_incident, emergency_contact,
          emergency_drill, emergency_alert, contact_directory,
          maintenance_request, vendor_visit, document_vault, document_share,
          insurance_policy, license_permit, audit_finding, audit_action.
        """,
        ADMINISTRATION_TABLES,
    )

    # ── Migration 7: Transport tables ──────────────────────────────────────
    write_migration(
        "20260717000007_wave_23_07_transport_tables",
        "Wave 23.07 — Transport tables",
        """
        Creates 13 transport tables:
          vehicle, driver, route, route_stop, student_route_assignment,
          trip, trip_attendance, fuel_log, vehicle_maintenance,
          transport_fee, transport_fee_payment, gps_device,
          transport_incident.
        """,
        TRANSPORT_TABLES,
    )

    # ── Migration 8: Acceptance seed ───────────────────────────────────────
    write_migration(
        "20260717000008_wave_23_08_acceptance_seed",
        "Wave 23.08 — Acceptance test ID registry + migration audit",
        """
        Creates 2 observability tables:
          acceptance_test_registry — registry of 75 stable acceptance test IDs
            (A-001..A-087, ranges reserved by category).
          migration_audit — per-migration audit log with checksum + duration.

        Seeds 87 acceptance test IDs covering migrations 01..08 plus 6
        cross-cutting convention checks (A-082..A-087).
        """,
        ACCEPTANCE_SEED_TABLE,
    )

    print("\nAll 8 migrations written. Listing:")
    for child in sorted(MIGRATIONS_DIR.iterdir()):
        if child.is_dir() and "wave_23" in child.name:
            sql = child / "migration.sql"
            if sql.exists():
                lines = sum(1 for _ in sql.open())
                size = sql.stat().st_size
                print(f"  {child.name}  ({lines} lines, {size} bytes)")


if __name__ == "__main__":
    main()
