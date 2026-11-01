-- Per-job override of the automatic "vacate work" flag (portal-side only; never written to Tapi).
-- state 'vacate' = parked as vacate work; 'active' = kept in the active backlog even if the rules flag it.
CREATE TABLE IF NOT EXISTS job_vacate (
  job_id     TEXT PRIMARY KEY,
  wo         TEXT,
  state      TEXT NOT NULL CHECK (state IN ('vacate','active')),
  set_by     TEXT NOT NULL,
  set_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
