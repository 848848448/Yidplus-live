export const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Dash-Key, X-Brief-Token',
};

export async function ensureSchema(env) {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS briefs (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'draft',
      step INTEGER DEFAULT 1,
      data TEXT DEFAULT '{}',
      client_name TEXT DEFAULT '',
      client_email TEXT DEFAULT '',
      client_phone TEXT DEFAULT '',
      business_name TEXT DEFAULT '',
      website_type TEXT DEFAULT '',
      created_at INTEGER,
      updated_at INTEGER,
      submitted_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      brief_id TEXT NOT NULL,
      sender TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      brief_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      type TEXT DEFAULT '',
      r2_key TEXT DEFAULT '',
      created_at INTEGER
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_messages_brief ON messages(brief_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_uploads_brief ON uploads(brief_id)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_briefs_token ON briefs(token)`),
  ]).catch(() => {});
}

export function checkAuth(request, env) {
  const configured = (env.DASH_KEY || '').trim();
  if (!configured) return { ok: false, status: 500, error: 'DASH_KEY not configured.' };
  const given = (request.headers.get('X-Dash-Key') || '').trim();
  if (!given || given.length !== configured.length) return { ok: false, status: 401, error: 'Unauthorized' };
  let diff = 0;
  for (let i = 0; i < configured.length; i++) diff |= configured.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff !== 0) return { ok: false, status: 401, error: 'Unauthorized' };
  return { ok: true };
}

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);
export const newToken = () => crypto.randomUUID().replace(/-/g, '');

export async function notify(env, subject, body) {
  const promises = [];

  const tgToken = (env.TELEGRAM_BOT_TOKEN || '').trim();
  const tgChat = (env.TELEGRAM_CHAT_ID || '').trim();
  if (tgToken && tgChat) {
    promises.push(
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text: `${subject}\n\n${body}`, parse_mode: 'HTML' }),
      }).catch(() => {})
    );
  }

  const emailTo = (env.NOTIFY_EMAIL || '').trim();
  const resendKey = (env.RESEND_API_KEY || '').trim();
  if (emailTo && resendKey) {
    promises.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Brief Builder <briefs@resend.dev>',
          to: [emailTo],
          subject,
          html: body.replace(/\n/g, '<br>'),
        }),
      }).catch(() => {})
    );
  }

  await Promise.allSettled(promises);
}

export async function sendToClient(env, toEmail, subject, htmlBody) {
  const resendKey = (env.RESEND_API_KEY || '').trim();
  if (!resendKey || !toEmail) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({
        from: 'Brief Builder <briefs@resend.dev>',
        to: [toEmail],
        subject,
        html: htmlBody,
      }),
    });
    return r.ok;
  } catch { return false; }
}
