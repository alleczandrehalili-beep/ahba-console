import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const QaApi = require('./qa-api.js');
const Info = require('./qa-subscriber-info.js');

// Minimal chainable fake of supabase-js: records every call; `handler(query, mode)` decides the result.
function fakeClient(handler) {
  return {
    schema() { return this; },
    storage: { from() { return {}; } },
    from(table) {
      const q = { table, ops: [] }; const b = {};
      ['select', 'eq', 'is', 'order', 'limit'].forEach(m => { b[m] = (...a) => { q.ops.push([m, ...a]); return b; }; });
      b.maybeSingle = () => Promise.resolve(handler(q, 'single'));
      b.then = (res, rej) => Promise.resolve(handler(q, 'list')).then(res, rej);
      return b;
    }
  };
}
const sel = q => q.ops.find(o => o[0] === 'select')[1];

test('getJobFullInfo selects the explicit column list and never *', async () => {
  const calls = [];
  const api = QaApi.create(fakeClient(q => { calls.push(q); return { data: { id: 'ZZ-1', first_name: 'Zz' }, error: null }; }), {});
  const job = await api.getJobFullInfo('ZZ-1');
  assert.equal(job.first_name, 'Zz');
  assert.equal(calls.length, 1);
  assert.equal(sel(calls[0]), Info.columns().join(','));
  assert.ok(!sel(calls[0]).includes('*') && !sel(calls[0]).includes('payment') && !sel(calls[0]).includes('crew_'));
  assert.deepEqual(calls[0].ops.find(o => o[0] === 'eq'), ['eq', 'id', 'ZZ-1']);
  assert.deepEqual(calls[0].ops.find(o => o[0] === 'is'), ['is', 'deleted_at', null]);
});

test('getJobFullInfo retries once without the optional columns when the schema lacks one', async () => {
  const calls = [];
  const api = QaApi.create(fakeClient(q => { calls.push(q); return calls.length === 1 ? { data: null, error: { message: 'column jobs.vas_no does not exist' } } : { data: { id: 'ZZ-1' }, error: null }; }), {});
  const job = await api.getJobFullInfo('ZZ-1');
  assert.equal(job.id, 'ZZ-1');
  assert.equal(calls.length, 2);
  assert.equal(sel(calls[1]), Info.columns({ withoutOptional: true }).join(','));
});

test('getJobFullInfo surfaces other errors and returns null without an id', async () => {
  const api = QaApi.create(fakeClient(() => ({ data: null, error: { message: 'permission denied' } })), {});
  await assert.rejects(api.getJobFullInfo('ZZ-1'), /permission denied/);
  assert.equal(await api.getJobFullInfo(''), null);
});

test('findJobByJoOrAcct looks up by JO no first, then by account no, newest first, live rows only', async () => {
  const calls = [];
  const api = QaApi.create(fakeClient(q => { calls.push(q); const byJo = q.ops.some(o => o[0] === 'eq' && o[1] === 'job_order_no'); return { data: byJo ? [] : [{ id: 'ZZ-2' }], error: null }; }), {});
  const job = await api.findJobByJoOrAcct('R-ZZ-9', 'IB-ZZ');
  assert.equal(job.id, 'ZZ-2');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].ops.find(o => o[0] === 'eq'), ['eq', 'job_order_no', 'R-ZZ-9']);
  assert.deepEqual(calls[1].ops.find(o => o[0] === 'eq'), ['eq', 'ibass_acct_no', 'IB-ZZ']);
  for (const c of calls) { assert.deepEqual(c.ops.find(o => o[0] === 'is'), ['is', 'deleted_at', null]); assert.deepEqual(c.ops.find(o => o[0] === 'order'), ['order', 'created_at', { ascending: false }]); assert.deepEqual(c.ops.find(o => o[0] === 'limit'), ['limit', 1]); }
  assert.equal(await api.findJobByJoOrAcct('', ''), null);
});
