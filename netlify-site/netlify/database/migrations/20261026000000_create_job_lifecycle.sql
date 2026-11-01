-- Maintenance Mate job lifecycle (portal-side only; nothing here is ever written to Tapi).
-- job_flow: one row per job that has portal lifecycle state. Native jobs (MM-xxxx) keep their full
-- details here; Tapi jobs (keyed by Tapi issue id) only get a row once someone takes a step on them.
CREATE TABLE IF NOT EXISTS job_flow (
  job_id TEXT PRIMARY KEY,
  n SERIAL,
  source TEXT NOT NULL,              -- 'native' | 'tapi'
  wo TEXT,
  origin TEXT,                       -- native: 'pm' | 'tenant_form'
  title TEXT, description TEXT, location TEXT,
  address TEXT, office TEXT, pm TEXT,
  tenant_name TEXT, tenant_contact TEXT,
  hints TEXT,                        -- JSON array: water, power, gas, security
  photos TEXT,                       -- JSON array of blob keys (intake)
  test BOOLEAN NOT NULL DEFAULT FALSE,
  stage TEXT NOT NULL,               -- new | quoting | awaiting_owner | approved | declined | booked | completed | invoiced | sent_pm
  triage TEXT, trade TEXT, triage_reason TEXT, triaged_by TEXT, triaged_at TIMESTAMPTZ,
  quotes TEXT,                       -- JSON array [{id, supplier, status, amount, note, requested_at, received_at, by}]
  accepted_quote TEXT,
  owner_decision TEXT, owner_by TEXT, owner_at TIMESTAMPTZ,
  booked_supplier TEXT, booked_date TEXT, booked_by TEXT, booked_at TIMESTAMPTZ,
  completed_note TEXT, completed_photos TEXT, completed_by TEXT, completed_at TIMESTAMPTZ,
  invoice_amount NUMERIC, invoice_no TEXT, invoiced_by TEXT, invoiced_at TIMESTAMPTZ,
  pm_sent_by TEXT, pm_sent_at TIMESTAMPTZ,
  created_by TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Every step, who and when. prev holds the row as it was, so a step can be undone.
CREATE TABLE IF NOT EXISTS job_step (
  id SERIAL PRIMARY KEY,
  job_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  actor TEXT NOT NULL,
  acting_as TEXT,
  prev TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  undone_by TEXT, undone_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS job_step_job ON job_step (job_id);
-- Owner approval limit per property (no owner data in Tapi exports). NULL amount = none on file.
CREATE TABLE IF NOT EXISTS approval_limit (
  prop_key TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  amount NUMERIC,
  note TEXT,
  set_by TEXT NOT NULL,
  set_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
