-- Public "join our preferred supplier list" submissions. Pending until an admin approves.
CREATE TABLE IF NOT EXISTS supplier_join_submissions (
  id            BIGSERIAL PRIMARY KEY,
  token         TEXT NOT NULL,
  supplier      TEXT NOT NULL,
  data          JSONB NOT NULL,
  consent       BOOLEAN NOT NULL,
  consent_text  TEXT NOT NULL,
  consent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS supplier_join_submissions_status ON supplier_join_submissions (status, created_at);
-- Opt-outs: respected by the reach buttons, outreach lists and the join link.
CREATE TABLE IF NOT EXISTS supplier_optouts (
  id          BIGSERIAL PRIMARY KEY,
  supplier    TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'all' CHECK (channel IN ('all','sms','email','form','phone')),
  reason      TEXT,
  recorded_by TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS supplier_optouts_sup ON supplier_optouts (supplier);
-- Every attempt to reach a supplier about a job (nothing is sent by the portal).
CREATE TABLE IF NOT EXISTS supplier_reach_log (
  id          BIGSERIAL PRIMARY KEY,
  wo          TEXT NOT NULL,
  supplier    TEXT NOT NULL,
  method      TEXT NOT NULL CHECK (method IN ('email','sms','form','call')),
  event       TEXT NOT NULL CHECK (event IN ('prepared','sent','not_sent')),
  actor       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS supplier_reach_log_wo ON supplier_reach_log (wo, created_at);
