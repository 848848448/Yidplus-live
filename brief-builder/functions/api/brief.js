// Client-facing brief API — no admin key needed, uses brief token.
//   POST   /api/brief              -> create new brief, returns { ok, id, token }
//   GET    /api/brief?token=T      -> get brief by token
//   PUT    /api/brief?token=T      -> update brief data
//   POST   /api/brief?token=T&submit=1 -> submit the brief
import { json, cors, ensureSchema, newId, newToken, notify } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token && url.searchParams.get('submit') === '1') {
    const brief = await env.DB.prepare('SELECT * FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
    if (!brief) return json({ ok: false, error: 'Brief not found' }, 404, cors);
    if (brief.status !== 'draft') return json({ ok: false, error: 'Already submitted' }, 400, cors);

    const now = Date.now();
    await env.DB.prepare('UPDATE briefs SET status = ?, submitted_at = ?, updated_at = ? WHERE token = ?')
      .bind('submitted', now, now, token).run();

    const data = JSON.parse(brief.data || '{}');
    const name = brief.client_name || data.client_name || 'Unknown';
    const biz = brief.business_name || data.business_name || '';
    const type = brief.website_type || data.website_type || '';
    await notify(env,
      `New Brief Submitted: ${name}`,
      `<b>${name}</b>${biz ? ` (${biz})` : ''} submitted a new website brief.\n\nType: ${type}\nEmail: ${brief.client_email || ''}\nPhone: ${brief.client_phone || ''}\n\nView it in your admin panel.`
    );

    return json({ ok: true }, 200, cors);
  }

  let b;
  try { b = await request.json(); } catch { b = {}; }

  const id = newId();
  const tk = newToken();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO briefs (id, token, status, step, data, client_name, client_email, client_phone, business_name, website_type, created_at, updated_at)
     VALUES (?, ?, 'draft', 1, '{}', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, tk, s(b.client_name, 120), s(b.client_email, 200), s(b.client_phone, 40), s(b.business_name, 200), '', now, now).run();

  return json({ ok: true, id, token: tk }, 200, cors);
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return json({ ok: false, error: 'token required' }, 400, cors);

  const brief = await env.DB.prepare('SELECT * FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
  if (!brief) return json({ ok: false, error: 'Brief not found' }, 404, cors);

  const messages = (await env.DB.prepare('SELECT id, sender, text, created_at FROM messages WHERE brief_id = ? ORDER BY created_at ASC')
    .bind(brief.id).all().catch(() => ({ results: [] }))).results || [];

  const uploads = (await env.DB.prepare('SELECT id, filename, size, type, created_at FROM uploads WHERE brief_id = ? ORDER BY created_at ASC')
    .bind(brief.id).all().catch(() => ({ results: [] }))).results || [];

  return json({
    ok: true,
    brief: {
      id: brief.id,
      status: brief.status,
      step: brief.step,
      data: JSON.parse(brief.data || '{}'),
      client_name: brief.client_name,
      client_email: brief.client_email,
      client_phone: brief.client_phone,
      business_name: brief.business_name,
      website_type: brief.website_type,
      created_at: brief.created_at,
      updated_at: brief.updated_at,
      submitted_at: brief.submitted_at,
    },
    messages,
    uploads,
  }, 200, cors);
}

export async function onRequestPut({ request, env }) {
  await ensureSchema(env);
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return json({ ok: false, error: 'token required' }, 400, cors);

  const brief = await env.DB.prepare('SELECT * FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
  if (!brief) return json({ ok: false, error: 'Brief not found' }, 404, cors);

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, cors); }

  const existing = JSON.parse(brief.data || '{}');
  const merged = { ...existing, ...b.data };
  const now = Date.now();

  await env.DB.prepare(
    `UPDATE briefs SET data = ?, step = ?, client_name = ?, client_email = ?, client_phone = ?, business_name = ?, website_type = ?, updated_at = ? WHERE token = ?`
  ).bind(
    JSON.stringify(merged),
    b.step != null ? Number(b.step) : brief.step,
    s(b.client_name ?? brief.client_name, 120),
    s(b.client_email ?? brief.client_email, 200),
    s(b.client_phone ?? brief.client_phone, 40),
    s(b.business_name ?? brief.business_name, 200),
    s(b.website_type ?? brief.website_type, 100),
    now,
    token
  ).run();

  return json({ ok: true }, 200, cors);
}

const s = (v, max) => String(v == null ? '' : v).slice(0, max).trim();
