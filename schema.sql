-- Web Analytics HQ — D1 schema.
-- The API also creates these automatically on first request, so you normally
-- do NOT need to run this. It is here for reference, or to apply manually with:
--   npx wrangler d1 execute yidplus-analytics --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS sites (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  url            TEXT DEFAULT '',
  status         TEXT DEFAULT 'building',   -- live | building | handed
  client_name    TEXT DEFAULT '',
  client_contact TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  created_at     INTEGER
);

-- One row per unique visitor per site: unique-visitor count + total active time.
CREATE TABLE IF NOT EXISTS visitors (
  site_id    TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  active_ms  INTEGER DEFAULT 0,
  views      INTEGER DEFAULT 0,
  first_ts   INTEGER,
  last_ts    INTEGER,
  PRIMARY KEY (site_id, visitor_id)
);

-- Per-day rollup for the trend sparkline.
CREATE TABLE IF NOT EXISTS daily (
  site_id   TEXT NOT NULL,
  day       TEXT NOT NULL,             -- YYYY-MM-DD (UTC)
  views     INTEGER DEFAULT 0,
  active_ms INTEGER DEFAULT 0,
  PRIMARY KEY (site_id, day)
);

CREATE INDEX IF NOT EXISTS idx_visitors_site ON visitors(site_id);
CREATE INDEX IF NOT EXISTS idx_daily_site    ON daily(site_id);
