const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHOTO_ID = /^[1-9][0-9]{0,18}$/;
const ARCHIVE = 'qa-photo-history';
class RequestFailure extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
function fail(status, code, message) { throw new RequestFailure(status, code, message); }
function objectPath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.split('/').some(s => s === '.' || s === '..')) fail(502, 'INVALID_STORAGE_PLAN', 'The server returned an invalid storage plan.');
  return path.split('/').map(encodeURIComponent).join('/');
}
async function digest(bytes) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join(''); }
function imageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)) return 'image/png';
  if (bytes.length >= 12 && [82,73,70,70].every((b,i) => bytes[i] === b) && [87,69,66,80].every((b,i) => bytes[8+i] === b)) return 'image/webp';
  return null;
}

// The only substituted dependency in tests is HTTP transport. Identity, input validation,
// hashing, archive ordering, idempotent upload checks, and response handling run unchanged.
export function createHandler(config, dependencies = {}) {
  const fetch = dependencies.fetch || globalThis.fetch;
  const base = config.supabaseUrl.replace(/\/$/, '');
  const maxFileSize = config.maxFileSize || 10 * 1024 * 1024;
  const userHeaders = token => ({ apikey: config.anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Profile': 'qa', 'Accept-Profile': 'qa' });
  const serviceHeaders = () => ({ apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` });
  async function rpc(name, payload, token, privileged = false) {
    const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: privileged ? { ...serviceHeaders(), 'Content-Type': 'application/json', 'Content-Profile': 'qa', 'Accept-Profile': 'qa' } : userHeaders(token), body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = typeof data.message === 'string' ? data.message.split(':')[0] : '';
      const safeCodes = /^(PHOTO_|RETURN_TOKEN_MISMATCH|CORRECTION_|JOB_NOT_FOUND|DISPATCH_|ARCHIVE_|REASON_REQUIRED|INVALID_)/;
      fail(response.status >= 500 ? 502 : response.status, safeCodes.test(code) ? code : 'CORRECTION_REJECTED', safeCodes.test(code) ? code.replaceAll('_', ' ').toLowerCase() + '. Refresh the job and retry if needed.' : 'The correction was rejected. Refresh the job and check your dispatch access.');
    }
    return data;
  }
  async function getObject(bucket, path) {
    return fetch(`${base}/storage/v1/object/${bucket}/${objectPath(path)}`, { headers: serviceHeaders() });
  }
  async function objectMissing(response) {
    if (response.status === 404) return true;
    if (response.status !== 400) return false;
    const data = await response.clone().json().catch(() => ({}));
    return data.statusCode === '404' || data.statusCode === 404 || data.code === 'NoSuchKey' || data.error === 'not_found';
  }
  async function putImmutable(bucket, path, bytes, contentType) {
    const response = await fetch(`${base}/storage/v1/object/${bucket}/${objectPath(path)}`, { method: 'POST', headers: { ...serviceHeaders(), 'Content-Type': contentType, 'x-upsert': 'false' }, body: bytes });
    if (response.ok) return;
    const data = await response.json().catch(() => ({}));
    if (response.status === 409 || ((response.status === 400 || response.status === 409) && (data.error === 'Duplicate' || data.statusCode === '409'))) {
      const existing = await getObject(bucket, path);
      if (!existing.ok || await digest(await existing.arrayBuffer()) !== await digest(bytes)) fail(409, 'CORRECTION_CONTENT_MISMATCH', 'The saved correction contains different evidence. Start a new correction after refreshing.');
      return;
    }
    fail(502, 'STORAGE_UNAVAILABLE', 'The photo could not be safely stored. Retry this same correction.');
  }
  async function signed(path) {
    const response = await fetch(`${base}/storage/v1/object/sign/${ARCHIVE}/${objectPath(path)}`, { method: 'POST', headers: { ...serviceHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 300 }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.signedURL !== 'string') fail(502, 'ARCHIVE_UNAVAILABLE', 'Photo history could not be opened.');
    if (data.signedURL.startsWith('/object/sign/')) return `${base}/storage/v1${data.signedURL}`;
    const url = new URL(data.signedURL, base);
    if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/storage/v1/object/sign/')) fail(502, 'ARCHIVE_UNAVAILABLE', 'Photo history could not be opened.');
    return url.href;
  }
  return async function handle(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = config.allowedOrigins;
    const allowed = !origin || !allowedOrigins?.length || allowedOrigins.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': allowedOrigins?.length ? (allowed && origin ? origin : allowedOrigins[0]) : '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', Vary: 'Origin', 'Cache-Control': 'no-store' };
    const respond = (data, status = 200) => Response.json(data, { status, headers: cors });
    if (!allowed) return respond({ error: 'ORIGIN_NOT_ALLOWED', message: 'This origin is not allowed.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (!['POST', 'GET'].includes(request.method)) fail(405, 'METHOD_NOT_ALLOWED', 'Use POST to correct a photo or GET to read its history.');
      const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
      if (!match) fail(401, 'AUTH_REQUIRED', 'Sign in again to correct a photo.');
      const token = match[1];
      const auth = await fetch(`${base}/auth/v1/user`, { headers: { apikey: config.anonKey, Authorization: `Bearer ${token}` } });
      const actor = auth.ok ? await auth.json().catch(() => null) : null;
      if (!actor || !UUID.test(actor.id || '')) fail(401, 'AUTH_REQUIRED', 'Sign in again to correct a photo.');
      if (request.method === 'GET') {
        const url = new URL(request.url), job = url.searchParams.get('job_id'), photo = url.searchParams.get('photo_id');
        if (url.searchParams.get('action') !== 'history' || !job || (photo && !PHOTO_ID.test(photo))) fail(400, 'INVALID_HISTORY_REQUEST', 'Choose a job and photo history.');
        const revisions = await rpc('photo_correction_history', { p_job_id: job, p_photo_id: photo || null }, token);
        const items = [];
        for (const revision of revisions) {
          const oldUrl = await signed(revision.old_archive_path), newUrl = await signed(revision.new_archive_path);
          const { old_archive_path, new_archive_path, ...fields } = revision;
          items.push({ ...fields, old_url: oldUrl, new_url: newUrl });
        }
        return respond({ revisions: items });
      }
      const length = Number(request.headers.get('content-length'));
      if (length > maxFileSize + 65536) fail(413, 'PHOTO_TOO_LARGE', 'Choose a smaller image.');
      if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) fail(400, 'INVALID_FORM', 'Upload the correction as a photo form.');
      let form;
      try { form = await request.formData(); } catch { fail(400, 'INVALID_FORM', 'The photo form could not be read.'); }
      const textField = name => typeof form.get(name) === 'string' ? form.get(name) : '';
      const job = textField('job_id').trim(), photo = textField('photo_id'), oldPath = textField('expected_path'), returnedAt = textField('expected_returned_at'), reason = textField('reason').trim(), operation = textField('operation_id').toLowerCase();
      if (!job || job.length > 200 || !PHOTO_ID.test(photo) || !oldPath || !UUID.test(operation) || (returnedAt && !Number.isFinite(Date.parse(returnedAt)))) fail(400, 'INVALID_CORRECTION', 'Choose the exact photo again and refresh the job.');
      if (!reason || reason.length > 2000) fail(400, 'REASON_REQUIRED', 'Enter a reason for the photo correction (up to 2,000 characters).');
      const file = form.get('file');
      if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) fail(400, 'PHOTO_REQUIRED', 'Choose a replacement image.');
      if (file.size > maxFileSize) fail(413, 'PHOTO_TOO_LARGE', 'Choose a smaller image.');
      const bytes = new Uint8Array(await file.arrayBuffer()), contentType = imageType(bytes);
      if (!contentType || contentType !== file.type) fail(415, 'INVALID_PHOTO_TYPE', 'Choose a JPEG, PNG, or WebP image with matching contents.');
      const plan = await rpc('prepare_photo_correction', { p_job_id: job, p_photo_id: photo, p_expected_path: oldPath, p_expected_returned_at: returnedAt || null, p_reason: reason, p_operation_id: operation, p_content_type: contentType, p_size: file.size, p_sha256: await digest(bytes) }, token);
      if (plan.status === 'committed') return respond(plan.result);
      if (plan.operation_id !== operation || plan.status !== 'pending') fail(502, 'INVALID_STORAGE_PLAN', 'The correction could not be planned safely.');
      // All privileged paths come from the permission-checked RPC, never caller input.
      // Prefer the archive on a retry: a stale phone may already have deleted the old active path.
      let original = await getObject(ARCHIVE, plan.original_archive_path);
      if (await objectMissing(original)) original = await getObject('job-photos', plan.old_path);
      if (!original.ok) fail(502, 'ARCHIVE_UNAVAILABLE', 'The original photo could not be protected. Refresh the job and retry.');
      const originalBytes = new Uint8Array(await original.arrayBuffer());
      if (!originalBytes.byteLength) fail(502, 'ARCHIVE_UNAVAILABLE', 'The original photo could not be protected.');
      await putImmutable(ARCHIVE, plan.original_archive_path, originalBytes, original.headers.get('content-type') || 'application/octet-stream');
      await putImmutable(ARCHIVE, plan.replacement_archive_path, bytes, contentType);
      await putImmutable('job-photos', plan.replacement_path, bytes, contentType);
      // A failed or lost commit leaves protected staging available for the same operation retry.
      // Never delete an archive or the old active photo from this endpoint.
      return respond(await rpc('commit_photo_correction', { p_operation_id: operation, p_actor_id: actor.id }, token, true));
    } catch (error) {
      if (error instanceof RequestFailure) return respond({ error: error.code, message: error.message }, error.status);
      return respond({ error: 'SERVICE_UNAVAILABLE', message: 'The correction service is unavailable. Retry this same correction.' }, 502);
    }
  };
}
