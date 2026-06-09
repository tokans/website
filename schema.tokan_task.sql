-- First Tokan Task (P1) — append-only migration.
-- Run after schema.sql:  psql $DATABASE_URL -f schema.tokan_task.sql
--
-- An Opportunity Seeker's first contribution: review an anonymised seed profile
-- and answer 5 structured questions. Submitting awards the first Tokan (via the
-- existing `activities` + `tokan_entries` tables). Seed profiles are synthetic
-- (server/lib/seedProfiles.ts), so reviewee identity is a text id, not a user FK.

CREATE TABLE IF NOT EXISTS tokan_task_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  seed_profile_id TEXT        NOT NULL,
  answers         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reviewer_id, seed_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_tokan_task_reviewer ON tokan_task_submissions (reviewer_id);
