-- ─────────────────────────────────────────────────────────────────────────────
-- Wave 13 — Platform compliance: DSAR + Breach Notification
-- Closes BRC gaps: R-DAT-007, R-DAT-008, R-DAT-010, R-CMP-008
-- ─────────────────────────────────────────────────────────────────────────────

-- R-DAT-007/008 — Data Subject Access Request
CREATE TABLE IF NOT EXISTS dsar_requests (
    id                          UUID PRIMARY KEY DEFAULT uuid_v7(),
    school_id                   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    data_subject_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    data_subject_email          VARCHAR(255) NOT NULL,  -- PII: encrypted at rest via app layer
    request_type                VARCHAR(20) NOT NULL CHECK (request_type IN ('ACCESS','ERASURE','PORTABILITY','RECTIFICATION')),
    status                      VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED'
                                CHECK (status IN ('SUBMITTED','VERIFIED','PROCESSING','COMPLETED','REJECTED')),
    description                 TEXT,
    submitted_at                TIMESTAMPTZ NOT NULL,
    verified_at                 TIMESTAMPTZ,
    verified_by                 UUID,
    processing_started_at       TIMESTAMPTZ,
    completed_at                TIMESTAMPTZ,
    completed_by                UUID,
    artifacts_url               VARCHAR(512),
    rejected_at                 TIMESTAMPTZ,
    rejected_by                 UUID,
    rejection_reason            TEXT,
    sla_deadline                TIMESTAMPTZ NOT NULL,  -- submitted_at + 30 days
    version                     INTEGER NOT NULL DEFAULT 1,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsar_requests_school_status    ON dsar_requests(school_id, status);
CREATE INDEX idx_dsar_requests_sla_deadline     ON dsar_requests(sla_deadline);
CREATE INDEX idx_dsar_requests_data_subject     ON dsar_requests(data_subject_id);

-- R-DAT-010 / R-CMP-008 — Personal Data Breach Notification
CREATE TABLE IF NOT EXISTS breach_notifications (
    id                              UUID PRIMARY KEY DEFAULT uuid_v7(),
    school_id                       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    severity                        VARCHAR(10) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status                          VARCHAR(30) NOT NULL DEFAULT 'DETECTED'
                                    CHECK (status IN ('DETECTED','ASSESSED','NOTIFIED','CLOSED','NOT_REPORTABLE_CLOSED')),
    detected_at                     TIMESTAMPTZ NOT NULL,
    detected_by                     VARCHAR(120) NOT NULL,
    description                     TEXT NOT NULL,
    affected_records_estimate       INTEGER NOT NULL CHECK (affected_records_estimate > 0),
    affected_records_confirmed      INTEGER,
    assessed_at                     TIMESTAMPTZ,
    assessed_by                     UUID,
    is_reportable                   BOOLEAN,
    notification_sent_at            TIMESTAMPTZ,
    notification_recipient          VARCHAR(20) CHECK (notification_recipient IN ('MEITY','AFFECTED_USERS','BOTH')),
    within_72h                      BOOLEAN,
    closed_at                       TIMESTAMPTZ,
    closed_by                       UUID,
    root_cause                      TEXT,
    remediation                     TEXT,
    version                         INTEGER NOT NULL DEFAULT 1,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breach_notif_school_status     ON breach_notifications(school_id, status);
CREATE INDEX idx_breach_notif_detected_at       ON breach_notifications(detected_at);
CREATE INDEX idx_breach_notif_severity_status   ON breach_notifications(severity, status);

-- ─── Row-Level Security (BTD §16 — Tenant isolation) ─────────────────────────
ALTER TABLE dsar_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE breach_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY dsar_tenant_isolation ON dsar_requests
    USING (school_id = current_setting('app.current_school_id', true)::uuid);

CREATE POLICY breach_tenant_isolation ON breach_notifications
    USING (school_id = current_setting('app.current_school_id', true)::uuid);

-- ─── updated_at triggers (BTD §16.4) ────────────────────────────────────────
CREATE TRIGGER trg_dsar_requests_updated_at
    BEFORE UPDATE ON dsar_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_breach_notifications_updated_at
    BEFORE UPDATE ON breach_notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
