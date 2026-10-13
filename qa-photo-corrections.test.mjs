import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';

const require = createRequire(import.meta.url);
const modulePath = new URL('./qa-photo-corrections.js', import.meta.url);
const Qa = fs.existsSync(modulePath) ? require('./qa-photo-corrections.js') : {};
const operationId = '51f09e13-8e3d-4693-96c6-5099d74ce975';
const selectedPhotoId = '9223372036854775806';
const file = new File(['replacement evidence'], 'replacement.jpg', { type: 'image/jpeg' });
const input = {
  jobId: 'JO 123/returned', photoId: selectedPhotoId,
  expectedPath: 'jobs/123/original.jpg', expectedReturnedAt: '2026-10-12T08:00:00.000Z',
  reason: 'Original photo is out of focus', file, operationId
};

function clientWithResponse(status, payload) {
  assert.equal(typeof Qa.createClient, 'function', 'photo correction client is implemented');
  const calls = [];
  const client = Qa.createClient({
    url: 'https://example.invalid/', key: 'public-test-key', token: () => 'signed-test-token',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
    }
  });
  return { client, calls };
}

test('replacement posts the exact selected bigint photo and snapshot in one authenticated multipart request', async () => {
  const result = { job: { id: 'JO 123/returned' }, photo: { id: selectedPhotoId, path: 'jobs/123/new.jpg' }, correction: { id: 'revision-1' } };
  const { client, calls } = clientWithResponse(200, result);
  assert.deepEqual(await client.replace(input), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.invalid/functions/v1/qa-replace-photo');
  assert.equal(calls[0].options.method, 'POST');
  const headers = new Headers(calls[0].options.headers);
  assert.equal(headers.get('Authorization'), 'Bearer signed-test-token');
  assert.equal(headers.get('apikey'), 'public-test-key');
  assert.equal(headers.has('Content-Type'), false, 'the browser must add the multipart boundary');
  const body = calls[0].options.body;
  assert.ok(body instanceof FormData);
  assert.deepEqual([...body.keys()], ['job_id', 'photo_id', 'expected_path', 'expected_returned_at', 'reason', 'operation_id', 'file']);
  assert.equal(body.get('job_id'), 'JO 123/returned');
  assert.equal(body.get('photo_id'), '9223372036854775806');
  assert.equal(body.get('expected_path'), 'jobs/123/original.jpg');
  assert.equal(body.get('expected_returned_at'), '2026-10-12T08:00:00.000Z');
  assert.equal(body.get('reason'), 'Original photo is out of focus');
  assert.equal(body.get('operation_id'), operationId);
  assert.equal(await body.get('file').text(), 'replacement evidence');
  assert.equal(body.get('file').name, 'replacement.jpg');
});

test('a job without a return timestamp sends an empty snapshot value', async () => {
  const { client, calls } = clientWithResponse(200, { photo: { id: selectedPhotoId } });
  await client.replace({ ...input, expectedReturnedAt: null });
  assert.equal(calls[0].options.body.get('expected_returned_at'), '');
});

test('missing or whitespace-only reasons are rejected before any request', async () => {
  const { client, calls } = clientWithResponse(200, {});
  for (const reason of [undefined, '', ' \n ']) {
    await assert.rejects(client.replace({ ...input, reason }), e => e.code === 'reason_required');
  }
  assert.equal(calls.length, 0);
});

test('missing or empty replacement files are rejected before any request', async () => {
  const { client, calls } = clientWithResponse(200, {});
  for (const missingFile of [undefined, null, new File([], 'empty.jpg', { type: 'image/jpeg' })]) {
    await assert.rejects(client.replace({ ...input, file: missingFile }), e => e.code === 'file_required');
  }
  assert.equal(calls.length, 0);
});

test('inexact numeric bigint identifiers cannot silently target another photo', async () => {
  const { client, calls } = clientWithResponse(200, {});
  await assert.rejects(client.replace({ ...input, photoId: Number(selectedPhotoId) }), e => e.code === 'invalid_photo_id');
  assert.equal(calls.length, 0);
  await client.replace({ ...input, photoId: 27 });
  assert.equal(calls[0].options.body.get('photo_id'), '27');
});

test('a missing operation UUID cannot trigger an untracked replacement', async () => {
  const { client, calls } = clientWithResponse(200, {});
  await assert.rejects(client.replace({ ...input, operationId: undefined }), e => e.code === 'invalid_operation_id');
  assert.equal(calls.length, 0);
});

test('prepared operations preserve file, reason, exact IDs and the same UUID across retry', () => {
  assert.equal(typeof Qa.prepareOperation, 'function', 'operation preparation is implemented');
  const original = { ...input, operationId: undefined, reason: '  Original photo is out of focus  ' };
  const operation = Qa.prepareOperation(original);
  assert.match(operation.operationId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(operation.photoId, '9223372036854775806');
  assert.equal(operation.reason, 'Original photo is out of focus');
  assert.equal(operation.file, file);
  assert.ok(Object.isFrozen(operation));
  original.reason = 'Changed outside the prepared operation';
  assert.equal(operation.reason, 'Original photo is out of focus');
  assert.equal(Qa.prepareOperation({ ...input, operationId: undefined }, operation), operation);
});

test('a changed file, reason, photo, job or snapshot receives a new operation UUID', () => {
  assert.equal(typeof Qa.prepareOperation, 'function', 'operation preparation is implemented');
  const base = { ...input, operationId: undefined };
  const previous = Qa.prepareOperation(base);
  for (const change of [
    { file: new File(['different'], 'replacement.jpg', { type: 'image/jpeg' }) },
    { reason: 'Wrong subscriber photo' },
    { photoId: '9223372036854775805' },
    { jobId: 'JO-124' },
    { expectedPath: 'jobs/123/newer.jpg' },
    { expectedReturnedAt: '2026-10-12T09:00:00.000Z' }
  ]) {
    const next = Qa.prepareOperation({ ...base, ...change }, previous);
    assert.notEqual(next.operationId, previous.operationId);
  }
});

test('a lost response can be retried with the same prepared UUID and file', async () => {
  assert.equal(typeof Qa.prepareOperation, 'function', 'operation preparation is implemented');
  assert.equal(typeof Qa.createClient, 'function', 'photo correction client is implemented');
  const calls = [];
  const operation = Qa.prepareOperation({ ...input, operationId: undefined });
  const client = Qa.createClient({ url: 'https://example.invalid', key: 'key', token: () => 'token', fetch: async (url, options) => {
    calls.push({ url, options });
    if (calls.length === 1) throw new TypeError('Response lost after server commit');
    return new Response(JSON.stringify({ correction: { id: 'already-committed', replayed: true } }), { status: 200 });
  } });
  await assert.rejects(client.submit(operation), e => e.code === 'network_error' && e.retryable === true);
  assert.equal(operation.file, file);
  assert.equal(operation.reason, 'Original photo is out of focus');
  assert.deepEqual(await client.submit(operation), { correction: { id: 'already-committed', replayed: true } });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.body.get('operation_id'), operation.operationId);
  assert.equal(calls[1].options.body.get('operation_id'), operation.operationId);
  assert.equal(await calls[1].options.body.get('file').text(), 'replacement evidence');
});

test('stale 409 conflicts report the server reason while preserving correction inputs', async () => {
  const payload = { code: 'stale_photo', error: 'Selected photo changed. Reload it before replacing.' };
  const { client, calls } = clientWithResponse(409, payload);
  const before = { ...input };
  await assert.rejects(client.replace(input), e => {
    assert.equal(e.status, 409);
    assert.equal(e.code, 'stale_photo');
    assert.equal(e.message, 'Selected photo changed. Reload it before replacing.');
    assert.deepEqual(e.details, payload);
    return true;
  });
  assert.deepEqual(input, before);
  assert.equal(calls.length, 1, 'a stale photo must never fall back to PATCH or delete');
});

test('authentication and permission failures are surfaced with no fallback mutation', async () => {
  for (const status of [401, 403]) {
    const { client, calls } = clientWithResponse(status, { error: { code: 'access_denied', message: 'Dispatch edit access required' } });
    await assert.rejects(client.replace(input), e => e.status === status && e.code === 'access_denied' && e.message === 'Dispatch edit access required');
    assert.equal(calls.length, 1);
    assert.equal(input.file, file);
  }
});

test('an absent signed-in token stops both mutation and history before the network boundary', async () => {
  assert.equal(typeof Qa.createClient, 'function', 'photo correction client is implemented');
  let calls = 0;
  const client = Qa.createClient({ url: 'https://example.invalid', key: 'key', token: () => '', fetch: async () => { calls++; } });
  await assert.rejects(client.replace(input), e => e.status === 401 && e.code === 'auth_required');
  await assert.rejects(client.history({ jobId: input.jobId, photoId: input.photoId }), e => e.status === 401 && e.code === 'auth_required');
  assert.equal(calls, 0);
});

test('current auth is read for each request instead of retaining an expired token', async () => {
  assert.equal(typeof Qa.createClient, 'function', 'photo correction client is implemented');
  let token = 'first-token';
  const observedTokens = [];
  const client = Qa.createClient({ url: 'https://example.invalid', key: 'key', token: () => token, fetch: async (_url, options) => {
    observedTokens.push(new Headers(options.headers).get('Authorization'));
    return new Response('{}', { status: 200 });
  } });
  await client.replace(input);
  token = 'refreshed-token';
  await client.replace(input);
  assert.deepEqual(observedTokens, ['Bearer first-token', 'Bearer refreshed-token']);
});

test('service failures preserve the prepared operation and expose a retryable error', async () => {
  assert.equal(typeof Qa.prepareOperation, 'function', 'operation preparation is implemented');
  const operation = Qa.prepareOperation({ ...input, operationId: undefined });
  const { client, calls } = clientWithResponse(503, { code: 'storage_unavailable', message: 'Photo service is temporarily unavailable' });
  await assert.rejects(client.submit(operation), e => e.status === 503 && e.code === 'storage_unavailable' && e.retryable === true);
  assert.equal(operation.file, file);
  assert.equal(operation.expectedPath, 'jobs/123/original.jpg');
  assert.equal(operation.reason, 'Original photo is out of focus');
  assert.equal(calls.length, 1);
});

test('malformed success responses cannot masquerade as a completed correction', async () => {
  assert.equal(typeof Qa.createClient, 'function', 'photo correction client is implemented');
  const client = Qa.createClient({ url: 'https://example.invalid', key: 'key', token: () => 'token', fetch: async () => new Response('<html>gateway failure</html>', { status: 200 }) });
  await assert.rejects(client.replace(input), e => e.code === 'invalid_response');
});

test('history is read only for the selected photo with short-lived URL data returned intact', async () => {
  const payload = { revisions: [{ id: 'revision-1', photo_id: selectedPhotoId, old_url: 'https://example.invalid/old?token=short-lived', new_url: 'https://example.invalid/new?token=short-lived', reason: 'Out of focus', corrected_by: 'dispatcher-1' }] };
  const { client, calls } = clientWithResponse(200, payload);
  assert.deepEqual(await client.history({ jobId: input.jobId, photoId: input.photoId }), payload);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, '/functions/v1/qa-replace-photo');
  assert.equal(url.searchParams.get('action'), 'history');
  assert.equal(url.searchParams.get('job_id'), 'JO 123/returned');
  assert.equal(url.searchParams.get('photo_id'), '9223372036854775806');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(new Headers(calls[0].options.headers).get('Authorization'), 'Bearer signed-test-token');
});

test('history failures are visible to the caller instead of being shown as empty audit history', async () => {
  const { client, calls } = clientWithResponse(403, { code: 'org_mismatch', error: 'This job belongs to another organization' });
  await assert.rejects(client.history({ jobId: input.jobId, photoId: input.photoId }), e => e.status === 403 && e.code === 'org_mismatch');
  assert.equal(calls.length, 1);
});

test('replacement controls require the "QA Photo Fix" Access Control entry with Edit (or superadmin)', () => {
  assert.equal(typeof Qa.canReplace, 'function', 'permission display helper is implemented');
  assert.equal(Qa.canReplace(null), false);
  assert.equal(Qa.canReplace({ is_super: true }), true);
  assert.equal(Qa.canReplace({ allowed_pages: ['photofix'], edit_pages: ['photofix'] }), true);
  assert.equal(Qa.canReplace({ allowed_pages: ['photofix'], edit_pages: [] }), false, 'View = history only');
  assert.equal(Qa.canReplace({ allowed_pages: [], edit_pages: ['photofix'] }), false);
  assert.equal(Qa.canReplace({ allowed_pages: ['dispatch'], edit_pages: ['dispatch'] }), false, 'the old dispatch rule no longer grants it');
  assert.equal(Qa.canReplace({ allowed_pages: ['dispatch', 'timeline', 'completed'], edit_pages: ['timeline', 'completed'] }), false, 'never inferred from dispatch / Dashboard / Completed');
  assert.equal(Qa.canReplace({ allowed_pages: 'photofix', edit_pages: 'photofix' }), false);
});

test('history controls require the "QA Photo Fix" entry with View or Edit (or superadmin)', () => {
  assert.equal(typeof Qa.canViewHistory, 'function', 'history permission display helper is implemented');
  assert.equal(Qa.canViewHistory(null), false);
  assert.equal(Qa.canViewHistory({ is_super: true }), true);
  assert.equal(Qa.canViewHistory({ allowed_pages: ['photofix'], edit_pages: ['photofix'] }), true);
  assert.equal(Qa.canViewHistory({ allowed_pages: ['photofix'], edit_pages: [] }), true, 'View opens history');
  assert.equal(Qa.canViewHistory({ allowed_pages: ['completed'], edit_pages: ['completed'] }), false, 'Completed edit alone no longer implies history');
  assert.equal(Qa.canViewHistory({ allowed_pages: ['dispatch'], edit_pages: ['dispatch'] }), false);
  assert.equal(Qa.canViewHistory({ allowed_pages: [], edit_pages: ['photofix'] }), false);
  assert.equal(Qa.canViewHistory({ allowed_pages: 'photofix', edit_pages: 'photofix' }), false);
  assert.equal(Qa.canReplace({ allowed_pages: ['photofix'], edit_pages: [] }), false, 'reading correction history does not authorize replacement');
});

test('the browser export leaves surrounding form, storage and queue state untouched', async () => {
  assert.ok(fs.existsSync(modulePath), 'browser helper is implemented');
  const formState = { remarks: 'draft remarks', oldPhotos: [selectedPhotoId] };
  const queue = [{ jobId: 'another-job', state: 'pending' }];
  const originalForm = structuredClone(formState);
  const originalQueue = structuredClone(queue);
  let storageCalls = 0;
  const context = { Blob, File, FormData, URLSearchParams, crypto: webcrypto,
    formState, qaQueue: queue, localStorage: { setItem() { storageCalls++; }, removeItem() { storageCalls++; }, clear() { storageCalls++; } }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context);
  assert.equal(typeof context.QaPhotoCorrections.createClient, 'function');
  const client = context.QaPhotoCorrections.createClient({ url: 'https://example.invalid', key: 'key', token: () => 'token', fetch: async () => new Response('{"error":"Unavailable"}', { status: 500 }) });
  const operation = context.QaPhotoCorrections.prepareOperation({ ...input, operationId: undefined });
  await assert.rejects(client.submit(operation), e => e.status === 500);
  assert.deepEqual(formState, originalForm);
  assert.deepEqual(queue, originalQueue);
  assert.equal(storageCalls, 0);
});
