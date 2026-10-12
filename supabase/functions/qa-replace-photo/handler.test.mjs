import test from 'node:test';
import assert from 'node:assert/strict';

let createHandler;
try { ({ createHandler } = await import('./handler.mjs')); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
test('photo correction endpoint exists', () => assert.equal(typeof createHandler, 'function'));
const run = (name, fn) => test(name, { skip: !createHandler }, fn);
const ACTOR = '11111111-1111-4111-8111-111111111111';
const OP = '22222222-2222-4222-8222-222222222222';
const PNG = new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4]);
const config = { supabaseUrl: 'https://example.supabase.co', anonKey: 'public-key', serviceRoleKey: 'server-secret', maxFileSize: 1024 };
const paths = { old_path: 'team/old.jpg', original_archive_path: 'org/op/original', replacement_archive_path: 'org/op/replacement.png', replacement_path: 'qa-corrections/org/op/replacement.png' };
const plan = { operation_id: OP, status: 'pending', ...paths };
const result = { operation_id: OP, photo_id: 42, path: paths.replacement_path, returned_at: '2026-10-13T04:00:00Z', validated: false };
function request(overrides = {}, options = {}) {
  const form = new FormData();
  const fields = { job_id: 'JO-1', photo_id: '42', expected_path: paths.old_path, expected_returned_at: '', reason: 'Wrong router photo', operation_id: OP, ...overrides };
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.set(key, value);
  form.set('file', new Blob([options.bytes || PNG], { type: options.type || 'image/png' }), 'proof.png');
  return new Request('https://edge.example/qa-replace-photo', { method: 'POST', headers: options.noAuth ? {} : { Authorization: 'Bearer user-token' }, body: form });
}
function transport(options = {}) {
  const calls = [], objects = new Map(options.objects || []);
  const fetch = async (input, init = {}) => {
    const url = new URL(input), headers = new Headers(init.headers), body = init.body;
    calls.push({ path: url.pathname, method: init.method || 'GET', headers, body });
    if (url.pathname === '/auth/v1/user') return Response.json(options.unauthorized ? { message: 'Expired' } : { id: ACTOR }, { status: options.unauthorized ? 401 : 200 });
    if (url.pathname === '/rest/v1/rpc/prepare_photo_correction') return Response.json(options.prepareError || options.plan || plan, { status: options.prepareError ? (options.prepareStatus || 403) : 200 });
    if (url.pathname === '/rest/v1/rpc/commit_photo_correction') return Response.json(options.commitError || result, { status: options.commitError ? 409 : 200 });
    if (url.pathname === '/rest/v1/rpc/photo_correction_history') return Response.json(options.history || [{ id: 1, old_archive_path: paths.original_archive_path, new_archive_path: paths.replacement_archive_path, reason: 'Wrong router photo' }]);
    if (url.pathname.startsWith('/storage/v1/object/sign/')) return Response.json({ signedURL: '/object/sign/qa-photo-history/safe?token=short' });
    if (url.pathname.startsWith('/storage/v1/object/')) {
      const key = decodeURIComponent(url.pathname.slice('/storage/v1/object/'.length));
      if ((init.method || 'GET') === 'GET') {
        if (objects.has(key)) return new Response(objects.get(key), { headers: { 'Content-Type': 'image/png' } });
        if (key === 'job-photos/team/old.jpg') return new Response(new Uint8Array([255,216,255,1]), { headers: { 'Content-Type': 'image/jpeg' } });
        return Response.json({ statusCode: '404', error: 'not_found', message: 'Object not found' }, { status: options.missingStatus || 404 });
      }
      if (options.failUpload && key.includes(options.failUpload)) return Response.json({ message: 'Storage unavailable' }, { status: 503 });
      if (objects.has(key)) return Response.json({ message: 'The resource already exists', error: 'Duplicate' }, { status: 409 });
      objects.set(key, new Uint8Array(await new Response(body).arrayBuffer()));
      return Response.json({ Key: key });
    }
    throw new Error(`Unexpected transport request ${url.pathname}`);
  };
  return { fetch, calls, objects };
}
run('requires authenticated user before planning or storage', async () => {
  const t = transport(); const response = await createHandler(config, t)(request({}, { noAuth: true }));
  assert.equal(response.status, 401); assert.equal(t.calls.length, 0);
});
run('verifies bearer identity with Auth before using service credentials', async () => {
  const t = transport({ unauthorized: true }); const response = await createHandler(config, t)(request());
  assert.equal(response.status, 401); assert.deepEqual(t.calls.map(c => c.path), ['/auth/v1/user']);
});
run('rejects missing reason before privileged storage access', async () => {
  const t = transport(); const response = await createHandler(config, t)(request({ reason: '  ' }));
  assert.equal(response.status, 400); assert.equal(t.calls.some(c => c.path.startsWith('/storage')), false);
});
run('rejects spoofed image MIME and oversized evidence', async () => {
  for (const options of [{ bytes: new Uint8Array([1,2,3]), type: 'image/png' }, { bytes: new Uint8Array(1025), type: 'image/png' }, { bytes: PNG, type: 'image/jpeg' }]) {
    const t = transport(); const response = await createHandler(config, t)(request({}, options));
    assert.ok([413,415].includes(response.status)); assert.equal(t.calls.some(c => c.path.startsWith('/storage')), false);
  }
});
run('preserves bigint photo identifiers without rounding', async () => {
  const t = transport(); await createHandler(config, t)(request({ photo_id: '9007199254740993' }));
  const body = JSON.parse(t.calls.find(c => c.path.endsWith('/prepare_photo_correction')).body);
  assert.equal(body.p_photo_id, '9007199254740993');
});
run('uploads protected original and replacement before committing the selected row', async () => {
  const t = transport(); const response = await createHandler(config, t)(request());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), result);
  const prep = t.calls.find(c => c.path.endsWith('/prepare_photo_correction'));
  assert.equal(prep.headers.get('authorization'), 'Bearer user-token'); assert.equal(prep.headers.get('content-profile'), 'qa');
  const payload = JSON.parse(prep.body); assert.equal(payload.p_photo_id, '42'); assert.equal(payload.p_expected_returned_at, null); assert.match(payload.p_sha256, /^[0-9a-f]{64}$/);
  const commit = t.calls.at(-1); assert.equal(commit.path, '/rest/v1/rpc/commit_photo_correction'); assert.equal(commit.headers.get('authorization'), 'Bearer server-secret');
  assert.deepEqual(JSON.parse(commit.body), { p_operation_id: OP, p_actor_id: ACTOR });
  assert.ok(t.objects.has('qa-photo-history/org/op/original')); assert.deepEqual(t.objects.get('qa-photo-history/org/op/replacement.png'), PNG); assert.deepEqual(t.objects.get('job-photos/qa-corrections/org/op/replacement.png'), PNG);
  assert.equal(t.calls.some(c => c.method === 'DELETE'), false);
});
run('never turns caller supplied stale path into privileged object access', async () => {
  const t = transport({ prepareStatus: 409, prepareError: { code: 'PT409', message: 'PHOTO_PATH_MISMATCH' } });
  const response = await createHandler(config, t)(request({ expected_path: 'another-org/secret.png' }));
  assert.equal(response.status, 409); assert.equal(t.calls.some(c => c.path.startsWith('/storage')), false);
});
run('preserves current return token in preflight', async () => {
  const t = transport(); await createHandler(config, t)(request({ expected_returned_at: '2026-10-13T01:00:00Z' }));
  assert.equal(JSON.parse(t.calls.find(c => c.path.endsWith('/prepare_photo_correction')).body).p_expected_returned_at, '2026-10-13T01:00:00Z');
});
run('accepts uppercase operation UUIDs using canonical database identity', async () => {
  const op = 'abcdefab-abcd-4abc-8abc-abcdefabcdef';
  const t = transport({ plan: { ...plan, operation_id: op } });
  const response = await createHandler(config, t)(request({ operation_id: op.toUpperCase() }));
  assert.equal(response.status, 200);
  assert.equal(JSON.parse(t.calls.find(c => c.path.endsWith('/prepare_photo_correction')).body).p_operation_id, op);
});
run('failed staging leaves active original and never commits', async () => {
  const t = transport({ failUpload: 'replacement.png' }); const response = await createHandler(config, t)(request());
  assert.equal(response.status, 502); assert.equal(t.calls.some(c => c.path.endsWith('/commit_photo_correction')), false);
  assert.equal(t.calls.some(c => c.method === 'DELETE'), false);
});
run('failed commit retains protected staging for same-operation retry', async () => {
  const t = transport({ commitError: { code: 'PT409', message: 'RETURN_TOKEN_MISMATCH' } });
  const response = await createHandler(config, t)(request());
  assert.equal(response.status, 409); assert.ok(t.objects.has('qa-photo-history/org/op/original')); assert.equal(t.calls.some(c => c.method === 'DELETE'), false);
});
run('committed operation replay returns saved result without re-upload or another commit', async () => {
  const t = transport({ plan: { status: 'committed', result } }); const response = await createHandler(config, t)(request());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), result);
  assert.equal(t.calls.some(c => c.path.startsWith('/storage') || c.path.endsWith('/commit_photo_correction')), false);
});
run('retry uses protected original even when an old phone deleted its old active path', async () => {
  const t = transport({ objects: [['qa-photo-history/org/op/original', new Uint8Array([255,216,255,1])], ['qa-photo-history/org/op/replacement.png', PNG], ['job-photos/qa-corrections/org/op/replacement.png', PNG]] });
  const response = await createHandler(config, t)(request()); assert.equal(response.status, 200);
  assert.equal(t.calls.some(c => c.path === '/storage/v1/object/job-photos/team/old.jpg'), false);
});
run('supports older Storage object-not-found responses without treating them as archive failure', async () => {
  const t = transport({ missingStatus: 400 }); const response = await createHandler(config, t)(request());
  assert.equal(response.status, 200); assert.ok(t.objects.has('qa-photo-history/org/op/original'));
});
run('conflicting immutable replacement content is rejected', async () => {
  const t = transport({ objects: [['qa-photo-history/org/op/replacement.png', new Uint8Array([9,9])]] });
  const response = await createHandler(config, t)(request()); assert.equal(response.status, 409);
  assert.equal(t.calls.some(c => c.path.endsWith('/commit_photo_correction')), false);
});
run('history signs only authorized RPC archive paths with a short expiry', async () => {
  const t = transport(); const response = await createHandler(config, t)(new Request('https://edge.example/qa-replace-photo?action=history&job_id=JO-1&photo_id=42', { headers: { Authorization: 'Bearer user-token' } }));
  assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.revisions[0].reason, 'Wrong router photo'); assert.match(data.revisions[0].old_url, /^https:\/\/example.supabase.co\/storage\/v1\/object\/sign/);
  const signs = t.calls.filter(c => c.path.includes('/object/sign/')); assert.equal(signs.length, 2); assert.equal(JSON.parse(signs[0].body).expiresIn, 300);
});
run('unexpected transport errors never expose server credentials', async () => {
  const response = await createHandler(config, { fetch: async () => { throw new Error('server-secret'); } })(request());
  assert.equal(response.status, 502); assert.equal((await response.text()).includes('server-secret'), false);
});
