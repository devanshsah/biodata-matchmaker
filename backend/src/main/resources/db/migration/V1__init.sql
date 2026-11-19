-- devanshsah.com schema. Replaces the Supabase tables and adds the fitness planner.

-- Accounts (replaces Supabase auth.users + profiles + user_roles). The first account becomes admin.
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- People who viewed or downloaded the biodata (same columns as the Supabase table, so CSV exports import directly).
CREATE TABLE downloads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action     TEXT NOT NULL DEFAULT 'view'
);
CREATE INDEX downloads_created_at_idx ON downloads (created_at DESC);

-- Server-generated secrets (session signing key, push keys)
CREATE TABLE app_secrets (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ---------- Fitness planner ----------

-- Your edits to the plan (meals, workouts, study topics), stored as one JSON document
CREATE TABLE fit_overrides (
  id         INT PRIMARY KEY CHECK (id = 1),
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every ticked task and gym set, one row per tick
CREATE TABLE fit_ticks (
  day        DATE NOT NULL,
  item       TEXT NOT NULL,            -- task id ("walk", "b", "st1") or gym set ("g1:0" = exercise 1, set 1)
  done       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, item)
);

-- Latest weight used per exercise, plus a full history
CREATE TABLE fit_lift_weights (
  exercise   TEXT PRIMARY KEY,
  kg         TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE fit_lift_log (
  id        BIGSERIAL PRIMARY KEY,
  exercise  TEXT NOT NULL,
  kg        TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Body composition scans (ACCUNIQ BC380)
CREATE TABLE fit_scans (
  day         DATE PRIMARY KEY,
  time_of_day TEXT NOT NULL DEFAULT 'evening' CHECK (time_of_day IN ('morning', 'evening')),
  weight      NUMERIC(5, 1),
  fat         NUMERIC(5, 1),
  pbf         NUMERIC(5, 1),
  smm         NUMERIC(5, 1),
  vfa         NUMERIC(6, 1),
  waist       NUMERIC(5, 1),
  image       TEXT,                    -- file name in the uploads folder
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Phones and browsers that receive reminders
CREATE TABLE fit_push_subs (
  endpoint   TEXT PRIMARY KEY,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upcoming reminders, synced from the app's schedule
CREATE TABLE fit_reminders (
  id      BIGSERIAL PRIMARY KEY,
  day     DATE NOT NULL,
  item    TEXT NOT NULL,
  kind    TEXT NOT NULL CHECK (kind IN ('start', 'late')),
  fire_at TIMESTAMPTZ NOT NULL,
  title   TEXT NOT NULL,
  body    TEXT,
  sent_at TIMESTAMPTZ,
  UNIQUE (day, item, kind)
);
CREATE INDEX fit_reminders_due_idx ON fit_reminders (fire_at) WHERE sent_at IS NULL;
