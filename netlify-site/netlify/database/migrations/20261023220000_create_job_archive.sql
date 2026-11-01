-- Portal-side archive of maintenance jobs that are no longer required. Never written back to Tapi.
-- One row per job; restored jobs keep their row (restored_at set) so who/when stays on record.
CREATE TABLE IF NOT EXISTS job_archive (
  job_id      TEXT PRIMARY KEY,                -- Tapi job id (read-only reference)
  wo          TEXT,
  reason      TEXT NOT NULL CHECK (reason IN ('no_longer_required','duplicate','completed_elsewhere','tenant_resolved','other')),
  note        TEXT,
  archived_by TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_by TEXT,
  restored_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS job_archive_active ON job_archive (archived_at) WHERE restored_at IS NULL;
