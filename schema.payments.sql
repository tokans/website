-- Payments (P0) — append-only migration.
-- Run after schema.sql + schema.professionals.sql:
--   psql $DATABASE_URL -f schema.payments.sql
--
-- Donations (tokans.org/donate; anonymous-friendly) and professional
-- subscriptions (tokans.org/professionals/subscribe). An active subscription is
-- what unlocks the myWorkAssistant download (see api/lib/backend/mock.ts).

CREATE TABLE IF NOT EXISTS donations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES users (id) ON DELETE SET NULL,  -- NULL = anonymous
  email         TEXT,
  amount_minor  INT         NOT NULL,                 -- smallest currency unit (paise for INR)
  currency      TEXT        NOT NULL DEFAULT 'INR',
  status        TEXT        NOT NULL DEFAULT 'pending', -- pending | completed | failed
  provider      TEXT        NOT NULL DEFAULT 'mock',    -- mock | stripe
  provider_ref  TEXT,                                   -- gateway session/intent id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user ON donations (user_id);
CREATE INDEX IF NOT EXISTS idx_donations_ref  ON donations (provider_ref);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan                TEXT        NOT NULL,                  -- plan id (see api/lib/plans.ts)
  status              TEXT        NOT NULL DEFAULT 'incomplete', -- incomplete | active | past_due | canceled
  provider            TEXT        NOT NULL DEFAULT 'mock',   -- mock | stripe
  provider_ref        TEXT,                                  -- gateway session/subscription id
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_ref ON subscriptions (provider_ref);
