-- Partner directory + connections (P1) — append-only migration.
-- Run after the earlier schema files:  psql $DATABASE_URL -f schema.partners.sql
--
-- partner_listings: the privacy-preserving "ads" — a professional who onboarded
--   at /professionals is listed here (and, via the masters feed, in other suite
--   apps). connections: an end-user connecting to a professional creates a row
--   here and a backend work item (NewTask) routed to the professional's inbox.

CREATE TABLE IF NOT EXISTS partner_listings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_user_id UUID        UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  headline             TEXT,
  profession           TEXT,
  skills               JSONB       NOT NULL DEFAULT '[]',
  role_category        TEXT        NOT NULL DEFAULT 'Partner',
  visible              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_listings_visible ON partner_listings (visible);

CREATE TABLE IF NOT EXISTS connections (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  end_user_id          UUID        REFERENCES users (id) ON DELETE SET NULL,
  professional_user_id UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message              TEXT,
  backend_workitem_id  TEXT,                                    -- BE Workflow work item id
  status               TEXT        NOT NULL DEFAULT 'open',     -- open | accepted | closed
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connections_professional ON connections (professional_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_end_user     ON connections (end_user_id);
