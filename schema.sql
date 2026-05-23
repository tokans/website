-- Run this in your Neon SQL editor to initialise the schema
-- psql $DATABASE_URL -f schema.sql

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        UNIQUE NOT NULL,
  name            TEXT,
  password_hash   TEXT,                          -- NULL for OAuth-only users
  github_id       TEXT        UNIQUE,
  github_url      TEXT,
  google_id       TEXT        UNIQUE,
  avatar_url      TEXT,
  website_url     TEXT,                          -- for Builder verification
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_gaming_flagged BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users (github_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- ── User Roles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role        TEXT        NOT NULL,   -- opportunity_seeker | builder | employer | mentor | donor | angel
  sub_type    TEXT,                   -- sde | em | pm | idea_stage | vibe_founder | startup_sme …
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);

-- ── Onboarding Data ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding_data (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role         TEXT        NOT NULL,
  sub_type     TEXT,
  context      JSONB       NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)                               -- one onboarding record per user (primary role)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_data (user_id);

-- ── Activities ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type               TEXT        NOT NULL,
  -- github_pr_merged | github_pr_reviewed | project_shipped | freelance_task |
  -- milestone_verified | employer_verified_work | course_completed |
  -- assessment_passed | technical_explanation | mentoring_session |
  -- peer_review_completed | referral_successful | codebase_audit |
  -- code_handoff | documentation_written | legacy_takeover
  metadata           JSONB       NOT NULL DEFAULT '{}',
  verification_level TEXT        NOT NULL DEFAULT 'self',
  -- self | peer_1_2 | peer_3plus | platform | employer
  impact_level       TEXT        NOT NULL DEFAULT 'medium',
  -- low | medium | high | exceptional
  activity_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities (user_id);

-- ── Tokan Entries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokan_entries (
  id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_id             UUID    REFERENCES activities (id) ON DELETE SET NULL,
  tokan_type              TEXT    NOT NULL,
  -- knowledge | build | work | mentor | impact | legacy_handoff
  base_value              INT     NOT NULL DEFAULT 0,
  verification_multiplier FLOAT   NOT NULL DEFAULT 1.0,
  impact_multiplier       FLOAT   NOT NULL DEFAULT 1.0,
  confidence_factor       FLOAT   NOT NULL DEFAULT 1.0,
  rarity_modifier         FLOAT   NOT NULL DEFAULT 1.0,
  decay_multiplier        FLOAT   NOT NULL DEFAULT 1.0,
  final_score             FLOAT   NOT NULL GENERATED ALWAYS AS (
    base_value
    * verification_multiplier
    * impact_multiplier
    * confidence_factor
    * rarity_modifier
    * decay_multiplier
  ) STORED,
  rqs_adjusted            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokan_entries_user ON tokan_entries (user_id);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reviewee_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_id           UUID        REFERENCES activities (id) ON DELETE SET NULL,
  answers               JSONB       NOT NULL DEFAULT '{}',
  confidence_score      TEXT        NOT NULL DEFAULT 'medium', -- low | medium | high
  rqs_weight            FLOAT       NOT NULL DEFAULT 1.0,
  mutual_review_flagged BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employer Briefs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employer_briefs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  what_they_own        TEXT,
  success_at_60_days   TEXT,
  technical_bottleneck TEXT,
  past_hiring_attempts TEXT,
  technical_setup      TEXT,
  engagement_type      TEXT,       -- project | part_time | full_hire
  budget_range         TEXT,
  status               TEXT        NOT NULL DEFAULT 'draft',  -- draft | active | closed | filled
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Matches ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id                UUID        NOT NULL REFERENCES employer_briefs (id) ON DELETE CASCADE,
  candidate_id            UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  match_score             FLOAT,
  match_reason            TEXT,
  employer_interest       BOOLEAN,
  candidate_interest      BOOLEAN,
  status                  TEXT        NOT NULL DEFAULT 'pending',
  -- pending | mutual | rejected | engaged | completed
  rejection_reason        TEXT,
  post_engagement_rating  INT,        -- 1–5
  rehire_intent           BOOLEAN,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
