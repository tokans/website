-- Professional profiles (P0) — append-only migration.
-- Run after schema.sql:  psql $DATABASE_URL -f schema.professionals.sql
--
-- A professional signs up at tokans.org/professionals, is profiled, assigned a
-- UAM Partner role, and gated to download myWorkAssistant. This is the rich
-- record behind GET /api/professionals/status and the download gate; the
-- existing user_roles table also gets a 'partner' row (see api/lib/backend/mock.ts).

CREATE TABLE IF NOT EXISTS professional_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  profession          TEXT        NOT NULL,   -- profession id (see api/lib/professions.ts)
  role_name           TEXT        NOT NULL,   -- UAM Role.roleName, e.g. partner.software_engineer
  role_category       TEXT        NOT NULL DEFAULT 'Partner',  -- UAM RoleCategory
  sub_type            TEXT,
  answers             JSONB       NOT NULL DEFAULT '{}',
  status              TEXT        NOT NULL DEFAULT 'pending',   -- none | pending | approved
  download_granted_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_user ON professional_profiles (user_id);
