// Shared helpers for the Web Analytics HQ API (Cloudflare Pages Functions + D1).

export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

// CORS for the admin API (dashboard is same-origin, so this stays tight).
export const adminCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Dash-Key',
};

// The collect endpoint is called from every tracked website, so it must accept
// cross-origin beacons from anywhere.
export const collectCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Create the schema on first use so a fresh D1 database needs no migration step.
export async function ensureSchema(env) {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT DEFAULT '',
      status TEXT DEFAULT 'building', client_name TEXT DEFAULT '',
      client_contact TEXT DEFAULT '', notes TEXT DEFAULT '', created_at INTEGER )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS visitors (
      site_id TEXT NOT NULL, visitor_id TEXT NOT NULL,
      active_ms INTEGER DEFAULT 0, views INTEGER DEFAULT 0,
      first_ts INTEGER, last_ts INTEGER,
      PRIMARY KEY (site_id, visitor_id) )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS daily (
      site_id TEXT NOT NULL, day TEXT NOT NULL,
      views INTEGER DEFAULT 0, active_ms INTEGER DEFAULT 0,
      PRIMARY KEY (site_id, day) )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_visitors_site ON visitors(site_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_daily_site ON daily(site_id)`),
  ]).catch(() => {});
}

// Owner authentication for the admin API. The dashboard sends the key the owner
// configured as the DASH_KEY secret; a constant-time-ish compare guards it.
export function checkAuth(request, env) {
  const configured = (env.DASH_KEY || '').trim();
  if (!configured) return { ok: false, status: 500, error: 'DASH_KEY is not configured on the server.' };
  const given = (request.headers.get('X-Dash-Key') || '').trim();
  if (!given || given.length !== configured.length) return { ok: false, status: 401, error: 'Unauthorized' };
  let diff = 0;
  for (let i = 0; i < configured.length; i++) diff |= configured.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff !== 0) return { ok: false, status: 401, error: 'Unauthorized' };
  return { ok: true };
}

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);

export const utcDay = (ts) => new Date(ts).toISOString().slice(0, 10);
