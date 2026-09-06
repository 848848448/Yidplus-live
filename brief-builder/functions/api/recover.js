import { json, cors, ensureSchema, checkAuth, notify, sendToClient } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const adminId = url.searchParams.get('id');

  if (adminId) {
    const auth = checkAuth(request, env);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);

    const brief = await env.DB.prepare('SELECT * FROM briefs WHERE id = ?').bind(adminId).first().catch(() => null);
    if (!brief) return json({ ok: false, error: 'Brief not found' }, 404, cors);

    const origin = url.origin;
    const link = `${origin}/?token=${brief.token}`;
    const sent = await sendToClient(env, brief.client_email,
      'Your Brief Builder Link',
      `<p>Hello${brief.client_name ? ' ' + brief.client_name : ''},</p>
       <p>Here is your brief link:</p>
       <p><a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Open Your Brief</a></p>
       <p style="margin-top:16px;color:#6b7280;font-size:14px">Or copy this link: ${link}</p>`
    );

    return json({ ok: true, sent, link }, 200, cors);
  }

  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'Bad body' }, 400, cors); }

  const email = String(b.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ ok: false, error: 'Valid email required' }, 400, cors);

  const briefs = (await env.DB.prepare(
    'SELECT id, token, client_name, client_email, status, created_at FROM briefs WHERE LOWER(client_email) = ? ORDER BY updated_at DESC'
  ).bind(email).all().catch(() => ({ results: [] }))).results || [];

  if (briefs.length > 0) {
    const origin = url.origin;
    const links = briefs.map(br => ({
      link: `${origin}/?token=${br.token}`,
      name: br.client_name,
    }));

    await sendToClient(env, briefs[0].client_email,
      'Your Brief Builder Links',
      `<p>Here ${links.length === 1 ? 'is your brief link' : 'are your brief links'}:</p>
       ${links.map(l => `<p><a href="${l.link}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;margin:4px 0">${l.name ? l.name + "'s Brief" : 'Open Brief'}</a></p>`).join('')}
       <p style="margin-top:16px;color:#6b7280;font-size:14px">If you did not request this, you can safely ignore this email.</p>`
    );

    await notify(env,
      'Brief Recovery Requested',
      `Recovery link requested for: ${email}\nBriefs found: ${briefs.length}`
    );
  }

  return json({ ok: true, message: 'If a brief exists with that email, a recovery link has been sent.' }, 200, cors);
}
