-- PM corrections to supplier contact details (portal-side only; Tapi is never written).
-- Append-only: the latest row per (supplier, field) wins. An empty value means "cleared by a PM".
CREATE TABLE IF NOT EXISTS supplier_contact_edits (
  id          BIGSERIAL PRIMARY KEY,
  supplier    TEXT NOT NULL,
  field       TEXT NOT NULL CHECK (field IN ('phone','mobile','email','website','address','form','contact_name','abn','insurance','insurance_expiry','trades','areas','preferred')),
  value       TEXT,
  edited_by   TEXT NOT NULL,
  edited_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS supplier_contact_edits_sup ON supplier_contact_edits (supplier, field, edited_at);
