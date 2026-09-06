// File upload for briefs. Uses R2 if BUCKET binding exists, otherwise rejects.
//   POST   /api/upload?token=T     -> upload file (multipart/form-data)
//   GET    /api/upload?id=FILE_ID  -> download file (admin, needs DASH_KEY)
//   DELETE /api/upload?id=FILE_ID  -> delete file (admin)
import { json, cors, ensureSchema, checkAuth, newId } from './_lib.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors });
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/csv',
  'application/zip',
];

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  if (!env.BUCKET) return json({ ok: false, error: 'File storage not configured' }, 500, cors);

  const token = new URL(request.url).searchParams.get('token');
  if (!token) return json({ ok: false, error: 'token required' }, 400, cors);

  const brief = await env.DB.prepare('SELECT id FROM briefs WHERE token = ?').bind(token).first().catch(() => null);
  if (!brief) return json({ ok: false, error: 'Brief not found' }, 404, cors);

  let formData;
  try { formData = await request.formData(); } catch { return json({ ok: false, error: 'Bad form data' }, 400, cors); }

  const file = formData.get('file');
  if (!file || typeof file === 'string') return json({ ok: false, error: 'No file' }, 400, cors);
  if (file.size > MAX_SIZE) return json({ ok: false, error: 'File too large (10 MB max)' }, 400, cors);
  if (!ALLOWED_TYPES.includes(file.type)) return json({ ok: false, error: 'File type not allowed' }, 400, cors);

  const fileId = newId();
  const ext = (file.name || '').split('.').pop() || 'bin';
  const r2Key = `briefs/${brief.id}/${fileId}.${ext}`;

  await env.BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name || 'file' },
  });

  await env.DB.prepare(
    'INSERT INTO uploads (id, brief_id, filename, size, type, r2_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(fileId, brief.id, (file.name || 'file').slice(0, 200), file.size, file.type, r2Key, Date.now()).run();

  return json({ ok: true, id: fileId, filename: file.name, size: file.size }, 200, cors);
}

export async function onRequestGet({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
  if (!env.BUCKET) return json({ ok: false, error: 'File storage not configured' }, 500, cors);
  await ensureSchema(env);

  const fileId = new URL(request.url).searchParams.get('id');
  if (!fileId) return json({ ok: false, error: 'id required' }, 400, cors);

  const upload = await env.DB.prepare('SELECT * FROM uploads WHERE id = ?').bind(fileId).first().catch(() => null);
  if (!upload) return json({ ok: false, error: 'File not found' }, 404, cors);

  const obj = await env.BUCKET.get(upload.r2_key);
  if (!obj) return json({ ok: false, error: 'File missing from storage' }, 404, cors);

  return new Response(obj.body, {
    headers: {
      'Content-Type': upload.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${upload.filename}"`,
      ...cors,
    },
  });
}

export async function onRequestDelete({ request, env }) {
  const auth = checkAuth(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status, cors);
  await ensureSchema(env);

  const fileId = new URL(request.url).searchParams.get('id');
  if (!fileId) return json({ ok: false, error: 'id required' }, 400, cors);

  const upload = await env.DB.prepare('SELECT * FROM uploads WHERE id = ?').bind(fileId).first().catch(() => null);
  if (!upload) return json({ ok: false, error: 'Not found' }, 404, cors);

  if (env.BUCKET && upload.r2_key) await env.BUCKET.delete(upload.r2_key).catch(() => {});
  await env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(fileId).run();

  return json({ ok: true }, 200, cors);
}
