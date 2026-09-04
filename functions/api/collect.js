// PUBLIC beacon receiver — called by tracker.js on every tracked website.
// POST /api/collect  { s: siteId, v: visitorId, e: 'view'|'ping', d: activeMsDelta, p: path, r: referrer }
import { ensureSchema, collectCors, utcDay } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: collectCors });
}

export async function onRequestPost({ request, env }) {
  try {
    let b;
    try { b = await request.json(); } catch { return new Response(null, { status: 204, headers: collectCors }); }

    const siteId = String(b.s || '').slice(0, 40);
    const visitorId = String(b.v || '').slice(0, 60);
    const event = b.e === 'ping' ? 'ping' : 'view';
    // Clamp active-time per beacon so a tampered client can't inflate minutes.
    const delta = event === 'ping' ? Math.max(0, Math.min(Number(b.d) || 0, 60000)) : 0;
    if (!siteId || !visitorId) return new Response(null, { status: 204, headers: collectCors });

    await ensureSchema(env);
    // Only record hits for sites the owner actually registered — keeps junk out.
    const site = await env.DB.prepare('SELECT id FROM sites WHERE id = ?').bind(siteId).first().catch(() => null);
    if (!site) return new Response(null, { status: 204, headers: collectCors });

    const now = Date.now();
    const day = utcDay(now);

    // Ensure the visitor row exists, then apply the event.
    await env.DB.prepare(
      `INSERT INTO visitors (site_id, visitor_id, active_ms, views, first_ts, last_ts)
       VALUES (?, ?, 0, 0, ?, ?) ON CONFLICT(site_id, visitor_id) DO NOTHING`
    ).bind(siteId, visitorId, now, now).run().catch(() => {});

    if (event === 'view') {
      await env.DB.prepare('UPDATE visitors SET views = views + 1, last_ts = ? WHERE site_id = ? AND visitor_id = ?')
        .bind(now, siteId, visitorId).run().catch(() => {});
      await env.DB.prepare(
        `INSERT INTO daily (site_id, day, views, active_ms) VALUES (?, ?, 1, 0)
         ON CONFLICT(site_id, day) DO UPDATE SET views = views + 1`
      ).bind(siteId, day).run().catch(() => {});
    } else {
      await env.DB.prepare('UPDATE visitors SET active_ms = active_ms + ?, last_ts = ? WHERE site_id = ? AND visitor_id = ?')
        .bind(delta, now, siteId, visitorId).run().catch(() => {});
      await env.DB.prepare(
        `INSERT INTO daily (site_id, day, views, active_ms) VALUES (?, ?, 0, ?)
         ON CONFLICT(site_id, day) DO UPDATE SET active_ms = active_ms + ?`
      ).bind(siteId, day, delta, delta).run().catch(() => {});
    }

    return new Response(null, { status: 204, headers: collectCors });
  } catch {
    // Never let a tracking hiccup surface an error to the visitor's site.
    return new Response(null, { status: 204, headers: collectCors });
  }
}
