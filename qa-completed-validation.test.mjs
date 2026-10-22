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
