-- Outreach email log (portal-side only; the portal never sends email and never writes to Tapi).
-- 'prepared' = a PM copied the email or opened it in their mail app; 'sent' / 'not_sent' = their own one-tap confirmation.
CREATE TABLE IF NOT EXISTS email_log (
  id          BIGSERIAL PRIMARY KEY,
  event       TEXT NOT NULL CHECK (event IN ('prepared','sent','not_sent')),
  action      TEXT NOT NULL CHECK (action IN ('copy_to','copy_subject','copy_email','open_email','mark')),
  ref_kind    TEXT NOT NULL CHECK (ref_kind IN ('job','batch')),
  ref_id      TEXT NOT NULL,
  wo          TEXT,
  recipient   TEXT,
  template    TEXT NOT NULL,
  actor       TEXT NOT NULL,
  acting_as   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_log_ref ON email_log (ref_kind, ref_id);
