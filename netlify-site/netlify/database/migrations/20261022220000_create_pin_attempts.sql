CREATE TABLE IF NOT EXISTS pin_attempts (
  scope TEXT NOT NULL,          -- 'ip:<addr>' or 'global'
  bucket BIGINT NOT NULL,       -- floor(epoch_ms / 15 min)
  n INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, bucket)
);
