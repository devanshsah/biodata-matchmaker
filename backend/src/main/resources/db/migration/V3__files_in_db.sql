-- Scan reports are stored in the database, so the app can run on hosts whose disk is wiped on restart (Cloud Run).
CREATE TABLE fit_files (
  name         TEXT PRIMARY KEY,         -- same value stored in fit_scans.image
  content_type TEXT NOT NULL,
  data         BYTEA NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reminders are now tracked in memory by the server; sent_at is no longer written.
DROP INDEX IF EXISTS fit_reminders_due_idx;
CREATE INDEX fit_reminders_fire_idx ON fit_reminders (fire_at);
