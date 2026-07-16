-- PreOne Wave 10 — Outbox retry worker schema
-- =====================================================================
-- This script is idempotent — safe to re-run.
--
-- Extends the outbox table (created in 20260715000001_wave_2_1_outbox_rls_pii.sql)
-- with columns needed by the SagaRetryWorker (Wave 10b, BTD §15.3 + §17.1):
--
--   1. status column widened from varchar(10) to varchar(20) to fit 'DEAD_LETTER' (11 chars)
--   2. last_attempt_at timestamptz — when the retry worker last tried to republish
--      Used for exponential backoff: next retry allowed at last_attempt_at + 2^attempts * base
--   3. next_retry_at timestamptz — precomputed backoff window expiry; indexed for fast polling
--   4. dead_letter_reason text — separate from last_error; set when status becomes DEAD_LETTER
--   5. New index on (status, next_retry_at) for retry polling
--   6. New partial index on (status) WHERE status = 'DEAD_LETTER' for dead-letter queue queries
--
-- Per BTD §15.3 — Saga Failure Handling:
--   "Transient failures (network blip, downstream 5xx) are retried with
--    exponential backoff. Permanent failures (invalid payload, missing
--    aggregate) are moved to a dead-letter queue after max_attempts (default 5)
--    for manual inspection."
--
-- Per BTD §17.1 — Outbox Pattern:
--   "The publisher drains PENDING rows. A separate retry worker drains
--    FAILED rows after a backoff window. DEAD_LETTER rows require manual
--    intervention."

-- ─────────────────────────────────────────────
-- 1. Widen status column to fit 'DEAD_LETTER' (11 chars)
-- ─────────────────────────────────────────────
ALTER TABLE outbox ALTER COLUMN status TYPE varchar(20);

-- ─────────────────────────────────────────────
-- 2. last_attempt_at — set by SagaRetryWorker on each retry attempt
-- ─────────────────────────────────────────────
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- ─────────────────────────────────────────────
-- 3. next_retry_at — precomputed backoff expiry; indexed for fast polling
-- ─────────────────────────────────────────────
-- The retry worker polls WHERE status = 'FAILED' AND next_retry_at <= now().
-- When marking a row for retry, the worker sets next_retry_at = now() + backoff.
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

-- ─────────────────────────────────────────────
-- 4. dead_letter_reason — set when status becomes DEAD_LETTER
-- ─────────────────────────────────────────────
ALTER TABLE outbox ADD COLUMN IF NOT EXISTS dead_letter_reason text;

-- ─────────────────────────────────────────────
-- 5. Index for retry polling — SagaRetryWorker uses this to find retryable rows
-- ─────────────────────────────────────────────
-- Partial index: only FAILED rows with a next_retry_at in the past
CREATE INDEX IF NOT EXISTS outbox_retry_idx
  ON outbox (next_retry_at)
  WHERE status = 'FAILED';

-- ─────────────────────────────────────────────
-- 6. Dead-letter queue index — for admin/listing queries
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS outbox_dead_letter_idx
  ON outbox (created_at DESC)
  WHERE status = 'DEAD_LETTER';

-- ─────────────────────────────────────────────
-- 7. Backfill next_retry_at for existing FAILED rows so the retry worker
--    picks them up on the first poll (treats them as eligible immediately).
-- ─────────────────────────────────────────────
UPDATE outbox
   SET next_retry_at = now()
 WHERE status = 'FAILED'
   AND next_retry_at IS NULL;

-- ─────────────────────────────────────────────
-- 8. Comments for ops visibility
-- ─────────────────────────────────────────────
COMMENT ON COLUMN outbox.last_attempt_at IS
  'When the SagaRetryWorker last attempted to republish this row (Wave 10b, BTD §15.3).';
COMMENT ON COLUMN outbox.next_retry_at IS
  'Earliest time the SagaRetryWorker should retry this row. NULL for non-FAILED rows.';
COMMENT ON COLUMN outbox.dead_letter_reason IS
  'Final failure reason when status = DEAD_LETTER. Set when attempts >= max_attempts.';
