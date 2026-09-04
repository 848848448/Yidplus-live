// ADMIN API for the dashboard — list sites with live aggregated stats, and
// create / update / delete sites. Guarded by the owner's DASH_KEY.
//   GET    /api/sites            -> { ok, sites:[{...stats, trend:[...] }] }
//   POST   /api/sites            -> { ok, id }         (create)
//   PUT    /api/sites?id=SITE    -> { ok }             (update)
//   DELETE /api/sites?id=SITE    -> { ok }             (delete + its stats)
import { json, adminCors, ensureSchema, checkAuth, newId, utcDay } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: adminCors });
}

const STATUSES = ['live', 'building', 'handed'];
const clean = (s, max) => String(s == null ? '' : s).slice(0, max);

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, adminCors);
  await ensureSchema(env);

  const sites = (await env.DB.prepare('SELECT * FROM sites ORDER BY created_at DESC').all().catch(() => ({ results: [] }))).results || [];

  // One grouped query each for totals and the 14-day trend, then merge in JS.
  const totals = (await env.DB.prepare(
    'SELECT site_id, COUNT(*) AS visitors, SUM(active_ms) AS ams, SUM(views) AS views FROM visitors GROUP BY site_id'
  ).all().catch(() => ({ results: [] }))).results || [];
  const tmap = {};
  totals.forEach((r) => { tmap[r.site_id] = r; });

  const since = utcDay(Date.now() - 13 * 86400000);
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(utcDay(Date.now() - i * 86400000));
  const daily = (await env.DB.prepare('SELECT site_id, day, views FROM daily WHERE day >= ?').bind(since).all().catch(() => ({ results: [] }))).results || [];
  const dmap = {};
  daily.forEach((r) => { (dmap[r.site_id] = dmap[r.site_id] || {})[r.day] = r.views; });

  const out = sites.map((s) => {
    const t = tmap[s.id] || {};
    const trend = days.map((d) => (dmap[s.id] && dmap[s.id][d]) || 0);
    return {
      id: s.id, name: s.name, url: s.url, status: s.status,
      client_name: s.client_name, client_contact: s.client_contact, notes: s.notes,
      created_at: s.created_at,
      visitors: Number(t.visitors) || 0,
      minutes: Math.round((Number(t.ams) || 0) / 60000),
      views: Number(t.views) || 0,
      trend,
    };
  });
  return json({ ok: true, sites: out }, 200, adminCors);
}

export async function onRequestPost({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, adminCors);
  await ensureSchema(env);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, adminCors); }
  const name = clean(b.name, 120).trim() || 'Untitled site';
  const status = STATUSES.includes(b.status) ? b.status : 'building';
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO sites (id, name, url, status, client_name, client_contact, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, name, clean(b.url, 300).trim(), status, clean(b.client_name, 120).trim(),
    clean(b.client_contact, 160).trim(), clean(b.notes, 2000), Date.now()).run();
  return json({ ok: true, id }, 200, adminCors);
}

export async function onRequestPut({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, adminCors);
  await ensureSchema(env);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id required' }, 400, adminCors);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, adminCors); }
  const status = STATUSES.includes(b.status) ? b.status : 'building';
  const res = await env.DB.prepare(
    `UPDATE sites SET name = ?, url = ?, status = ?, client_name = ?, client_contact = ?, notes = ? WHERE id = ?`
  ).bind(clean(b.name, 120).trim() || 'Untitled site', clean(b.url, 300).trim(), status,
    clean(b.client_name, 120).trim(), clean(b.client_contact, 160).trim(), clean(b.notes, 2000), id).run();
  return json({ ok: true, changed: res.meta ? res.meta.changes : undefined }, 200, adminCors);
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, adminCors);
  await ensureSchema(env);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id required' }, 400, adminCors);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sites WHERE id = ?').bind(id),
    env.DB.prepare('DELETE FROM visitors WHERE site_id = ?').bind(id),
    env.DB.prepare('DELETE FROM daily WHERE site_id = ?').bind(id),
  ]).catch(() => {});
  return json({ ok: true }, 200, adminCors);
}
