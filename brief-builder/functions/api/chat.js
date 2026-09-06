// Chat between owner and client on a brief.
//   GET  /api/chat?token=T           -> get messages (client)
//   GET  /api/chat?id=ID             -> get messages (admin, needs DASH_KEY)
//   POST /api/chat?token=T           -> client sends message
//   POST /api/chat?id=ID             -> owner sends message (needs DASH_KEY)
import { json, cors, ensureSchema, checkAuth, newId, notify } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const id = url.searchParams.get('id');

  let briefId;
  if (token) {
    const brief = await env.DB.prepare('SELECT id FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
    if (!brief) return json({ ok: false, error: 'Not found' }, 404, cors);
    briefId = brief.id;
  } else if (id) {
    const auth = checkAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
    briefId = id;
  } else {
    return json({ ok: false, error: 'token or id required' }, 400, cors);
  }

  const messages = (await env.DB.prepare(
    'SELECT id, sender, text, created_at FROM messages WHERE brief_id = ? ORDER BY created_at ASC'
  ).bind(briefId).all().catch(() => ({ results: [] }))).results || [];

  return json({ ok: true, messages }, 200, cors);
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const id = url.searchParams.get('id');

  let briefId, sender, brief;
  if (token) {
    brief = await env.DB.prepare('SELECT id, client_name FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
    if (!brief) return json({ ok: false, error: 'Not found' }, 404, cors);
    briefId = brief.id;
    sender = 'client';
  } else if (id) {
    const auth = checkAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
    briefId = id;
    sender = 'owner';
  } else {
    return json({ ok: false, error: 'token or id required' }, 400, cors);
  }

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, cors); }
  const text = String(b.text || '').slice(0, 4000).trim();
  if (!text) return json({ ok: false, error: 'Empty message' }, 400, cors);

  const msgId = newId();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO messages (id, brief_id, sender, text, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(msgId, briefId, sender, text, now).run();

  await env.DB.prepare('UPDATE briefs SET updated_at = ? WHERE id = ?').bind(now, briefId).run().catch(() => {});

  if (sender === 'client') {
    const name = brief?.client_name || 'Client';
    await notify(env,
      `New message from ${name}`,
      `<b>${name}</b> sent a message on their brief:\n\n"${text.slice(0, 500)}"`
    );
  }

  return json({ ok: true, id: msgId }, 200, cors);
}
