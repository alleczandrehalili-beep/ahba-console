// qa-completed-validation.test.mjs — vm slices of app.js (pattern of qa-validation-integration.test.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const Info = createRequire(import.meta.url)('./qa-subscriber-info.js');
const src = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
function slice(startMarker, endMarker) { const s = src.indexOf(startMarker); assert.ok(s >= 0, startMarker); const e = src.indexOf(endMarker, s); assert.ok(e > s, endMarker); return src.slice(s, e); }
function ctx(extra) { const c = Object.assign({ window: {}, QaSubscriberInfo: Info, esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])), fmtWhen: s => s ? 'WHEN(' + s + ')' : '—' }, extra || {}); c.window.QaSubscriberInfo = Info; vm.createContext(c); return c; }

test('completedQuery: that day (completed_at, updated_at fallback) AND (completed OR open return)', () => {
  const c = ctx(); vm.runInContext(slice('function completedQuery(', '\n}\n') + '\n}', c);
  const q = c.completedQuery('2026-10-22');
  assert.ok(q.startsWith('and=('), q);
  assert.ok(q.includes('completed_at.gte.2026-10-22T00:00:00%2B08:00') && q.includes('completed_at.lte.2026-10-22T23:59:59.999%2B08:00'));
  assert.ok(q.includes('and(completed_at.is.null,updated_at.gte.2026-10-22T00:00:00%2B08:00'));
  assert.ok(q.includes('or(status.eq.completed,and(status.eq.in-progress,qa_returned_at.not.is.null,qa_return_resolved_at.is.null))'));
  assert.ok(q.endsWith('&select=*&order=updated_at.desc&limit=2000'));
});

test('completedValidationCell: Pending (+Validate for editors), Returned to team (no Validate), Validated, re-submitted note', () => {
  const c = ctx(); vm.runInContext(slice('function completedValidationCell(', '\n}\n') + '\n}', c);
  const pend = c.completedValidationCell({ id: 'ZZ-1', status: 'completed' }, true);
  assert.ok(pend.includes('vbadge no') && pend.includes('data-validate="ZZ-1"'));
  assert.ok(!c.completedValidationCell({ id: 'ZZ-1', status: 'completed' }, false).includes('data-validate'));
  const ret = c.completedValidationCell({ id: 'ZZ-2', status: 'in-progress', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: null, qa_return_remarks: 'missing modem photo', qa_returned_by: 'QA Head' }, true);
  assert.ok(ret.includes('vbadge ret') && ret.includes('Returned to team') && ret.includes('missing modem photo') && ret.includes('by QA Head') && ret.includes('WHEN(2026-10-22T01:00:00Z)'));
  assert.ok(!ret.includes('data-validate'));
  const val = c.completedValidationCell({ id: 'ZZ-3', validated: true, validated_by: 'QA01', validated_at: '2026-10-22T02:00:00Z' }, true);
  assert.ok(val.includes('vbadge yes') && val.includes('by QA01') && !val.includes('data-validate'));
  const re = c.completedValidationCell({ id: 'ZZ-4', status: 'completed', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: '2026-10-22T03:00:00Z', validated: false }, true);
  assert.ok(re.includes('vbadge no') && re.includes('re-submitted WHEN(2026-10-22T03:00:00Z)') && re.includes('data-validate="ZZ-4"'));
  assert.ok(!c.completedValidationCell({ id: 'ZZ-5', status: 'completed', qa_return_remarks: '<script>' , qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: null }, true).includes('<script>'));
});

test('returnJobToTeam: empty remarks → no RPC; RPC error → toast, row untouched; success → row patched to returned and true', async () => {
  const body = slice('async function returnJobToTeam(', '\nasync function jdReturnToTeam(');
  const calls = [], toasts = [];
  const job = { id: 'ZZ-1', team: 'AHBA_TEST', status: 'completed' };
  const mk = (promptValue, rpcResult) => {
    const c = ctx({ findJob: () => null, compJobs: [job], jobs: [], prompt: () => promptValue, showToast: m => toasts.push(m), pushNotify: () => {}, renderJobs: () => {}, renderTimeline: () => {}, openJobDetail: () => {},
      $: sel => sel === '#jdTitle' ? { textContent: '' } : null });
    c.window.dashUser = { username: 'QA01' }; c.window.dashAuthClient = { schema: () => ({ rpc: async (name, args) => { calls.push([name, args]); return rpcResult; } }) };
    vm.runInContext(body, c); return c;
  };
  assert.equal(await mk('   ', { data: null, error: null }).returnJobToTeam('ZZ-1', {}), false);
  assert.equal(calls.length, 0); assert.match(toasts.at(-1), /Remarks are required/);
  assert.equal(await mk('no modem photo', { data: null, error: { message: 'QA Head or inspector only' } }).returnJobToTeam('ZZ-1', {}), false);
  assert.equal(job.status, 'completed'); assert.match(toasts.at(-1), /Return failed: QA Head or inspector only/);
  assert.equal(await mk('no modem photo', { data: [{ status: 'in-progress', qa_returned_at: '2026-10-22T01:00:00Z', qa_returned_by: 'QA01', updated_at: '2026-10-22T01:00:00Z' }], error: null }).returnJobToTeam('ZZ-1', { prompt: 'Ano ang kulang?' }), true);
  assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify(['return_job_for_photos', { p_job_id: 'ZZ-1', p_remarks: 'no modem photo' }]));   // vm realm: compare by value
  assert.equal(job.status, 'in-progress'); assert.equal(job.qa_return_remarks, 'no modem photo'); assert.equal(job.qa_returned_by, 'QA01'); assert.equal(job.qa_status, 'RETURNED TO TEAM');
  assert.match(toasts.at(-1), /JO returned to AHBA_TEST/);
});

test('QA Validation modal: the photo grid comes BEFORE the collapsible subscriber block, and the dialog scrolls', () => {
  const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const grid = html.indexOf('id="photoGrid"'), info = html.indexOf('id="photoSubInfo"'), details = html.indexOf('<details class="qa-sub-details"');
  assert.ok(grid > 0 && info > grid && details > grid && details < info, 'photos first, then the details block');
  assert.ok(/#photoModal\{max-height:92vh;overflow:auto\}/.test(html), 'the modal itself scrolls');
});

test('Gate B (Phase 1 branch): an open return the team already re-submitted shows FOR QA CHECK, never Returned to team, and no Validate', () => {
  const c = ctx({ qaReturnSubmitted: j => !!j.qa_return_submitted_at }); vm.runInContext(slice('function completedValidationCell(', '\n}\n') + '\n}', c);
  const html = c.completedValidationCell({ id: 'ZZ-6', status: 'completed', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: null, qa_return_submitted_at: '2026-10-22T02:00:00Z' }, true);
  assert.ok(html.includes('FOR QA CHECK') && html.includes('WHEN(2026-10-22T02:00:00Z)') && !html.includes('Returned to team') && !html.includes('data-validate'));
  const c2 = ctx({ qaReturnSubmitted: () => false }); vm.runInContext(slice('function completedValidationCell(', '\n}\n') + '\n}', c2);
  assert.ok(c2.completedValidationCell({ id: 'ZZ-7', status: 'in-progress', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: null }, true).includes('Returned to team'));
});
