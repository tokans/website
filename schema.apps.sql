-- Apps support directory (P1) — append-only migration.
-- Run after the earlier schema files:  psql $DATABASE_URL -f schema.apps.sql
--
-- /apps = the public directory of apps listed for Tokans support. Every app built
-- on sharedCoreLib is eligible; listing is owner-initiated via an acceptance
-- workflow (BE Workflow.NewTask → review → listed) — wiring is a later TODO.

CREATE TABLE IF NOT EXISTS apps (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id      UUID        REFERENCES users (id) ON DELETE SET NULL,
  slug               TEXT        UNIQUE NOT NULL,
  name               TEXT        NOT NULL,
  tagline            TEXT,
  repo_url           TEXT,
  stack              TEXT,
  description        TEXT,
  icon_url           TEXT,                     -- site-relative path, e.g. /app-icons/myfinance.png
  uses_sharedcorelib BOOLEAN     NOT NULL DEFAULT TRUE,
  support_status     TEXT        NOT NULL DEFAULT 'none',  -- none | requested | accepted | listed
  listed             BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_listed ON apps (listed);

-- Added after the table shipped — keep idempotent for already-created DBs.
ALTER TABLE apps ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS site_url TEXT;

-- Seed data is NOT hardcoded here. The seed vibe-coded apps are the local
-- projects in C:\workspace\ whose name starts with 'my' (myFinance, myHealth,
-- myWorkAssistant, …). Seed them with:  npm run seed:apps
-- (scripts/seed-apps.mjs scans the workspace + upserts; dev-only — needs the
-- filesystem + DATABASE_URL). Production apps arrive via the /apps register flow.
