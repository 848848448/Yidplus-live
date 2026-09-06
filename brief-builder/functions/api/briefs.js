// Admin API — list all briefs, update status, delete.
//   GET    /api/briefs              -> all briefs with message counts
//   PUT    /api/briefs?id=ID        -> update status
//   DELETE /api/briefs?id=ID        -> delete brief + its data
import { json, cors, ensureSchema, checkAuth } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
  await ensureSchema(env);

  const briefs = (await env.DB.prepare(
    'SELECT * FROM briefs ORDER BY updated_at DESC'
  ).all().catch(() => ({ results: [] }))).results || [];

  const msgCounts = (await env.DB.prepare(
    'SELECT brief_id, COUNT(*) AS cnt FROM messages GROUP BY brief_id'
  ).all().catch(() => ({ results: [] }))).results || [];
  const mc = {};
  msgCounts.forEach(r => { mc[r.brief_id] = r.cnt; });

  const uploadCounts = (await env.DB.prepare(
    'SELECT brief_id, COUNT(*) AS cnt FROM uploads GROUP BY brief_id'
  ).all().catch(() => ({ results: [] }))).results || [];
  const uc = {};
  uploadCounts.forEach(r => { uc[r.brief_id] = r.cnt; });

  const out = briefs.map(b => ({
    id: b.id,
    token: b.token,
    status: b.status,
    step: b.step,
    client_name: b.client_name,
    client_email: b.client_email,
    client_phone: b.client_phone,
    business_name: b.business_name,
    website_type: b.website_type,
    data: JSON.parse(b.data || '{}'),
    messages: mc[b.id] || 0,
    files: uc[b.id] || 0,
    created_at: b.created_at,
    updated_at: b.updated_at,
    submitted_at: b.submitted_at,
  }));

  return json({ ok: true, briefs: out }, 200, cors);
}

const VALID_STATUSES = ['draft', 'submitted', 'reviewing', 'building', 'client_review', 'ready', 'archived'];

export async function onRequestPut({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
  await ensureSchema(env);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id required' }, 400, cors);

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, cors); }

  if (b.status && !VALID_STATUSES.includes(b.status)) {
    return json({ ok: false, error: 'Invalid status' }, 400, cors);
  }

  const sets = [];
  const vals = [];
  if (b.status) { sets.push('status = ?'); vals.push(b.status); }
  if (b.notes != null) { sets.push('data = json_set(data, "$.admin_notes", ?)'); vals.push(String(b.notes).slice(0, 2000)); }
  sets.push('updated_at = ?');
  vals.push(Date.now());
  vals.push(id);

  await env.DB.prepare(`UPDATE briefs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
  return json({ ok: true }, 200, cors);
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
  await ensureSchema(env);

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id required' }, 400, cors);

  const uploads = (await env.DB.prepare('SELECT r2_key FROM uploads WHERE brief_id = ?').bind(id).all().catch(() => ({ results: [] }))).results || [];
  if (env.BUCKET) {
    await Promise.allSettled(uploads.filter(u => u.r2_key).map(u => env.BUCKET.delete(u.r2_key)));
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM briefs WHERE id = ?').bind(id),
    env.DB.prepare('DELETE FROM messages WHERE brief_id = ?').bind(id),
    env.DB.prepare('DELETE FROM uploads WHERE brief_id = ?').bind(id),
  ]).catch(() => {});

  return json({ ok: true }, 200, cors);
}
