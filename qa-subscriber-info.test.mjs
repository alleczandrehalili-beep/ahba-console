import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const Info = createRequire(import.meta.url)('./qa-subscriber-info.js');

const full = { id: 'ZZ-1', first_name: 'Zz', middle_name: 'Test', last_name: 'Subscriber', birth_date: '1990-02-03', primary_no: '0900 000 0000', other_contact_no: '0900 000 0001', email: 'zz@example.test',
  house_no: '1', street_name: 'Test St', village: 'Test Village', brgy: 'Brgy Test', city: 'Test City', district: 'D1', area: 'Area 1', address: '1 Test St',
  ibass_acct_no: 'IB-ZZ', job_order_no: 'R-ZZ-1', ticket_no: null, load_type: 'New Install', service_type: 'Install', load_date: '2026-10-22', schedule: 'AM', priority: 'Normal', work_account: 'WA-ZZ', ref_no: 'REF-ZZ',
  plan: 'FIBER 100', current_plan: null, play_type: '2P', add_on: 'IPTV', addon_count: 1, vas_no: 'VAS-ZZ', dwelling_type: 'House', install_fee_type: 'Free', wait_time: '2 days', source_of_sales: 'Referral', referral_name: 'Zz Ref', special_note: 'note', encoded_by: 'ENC', created_by: 'AHBA_SA01',
  payment_amount: 999, payment_mode: 'Cash', ar_no: 'AR-SECRET', crew_driver: 'DRV', crew_tech1: 'T1', valid_id_path: 'ids/secret.jpg', history: 'h' };

test('columns() lists every group column with id first and can drop the optional ones', () => {
  const cols = Info.columns();
  assert.equal(cols[0], 'id');
  for (const c of ['first_name','birth_date','email','house_no','city','ibass_acct_no','job_order_no','vas_no','plan','source_of_sales','created_by']) assert.ok(cols.includes(c), c);
  for (const c of ['payment_amount','payment_mode','ar_no','amount_to_collect','crew_driver','crew_tech1','crew_tech2','valid_id_path','history']) assert.ok(!cols.includes(c), 'excluded ' + c);
  const slim = Info.columns({ withoutOptional: true });
  for (const c of Info.OPTIONAL_COLUMNS) { assert.ok(cols.includes(c), c); assert.ok(!slim.includes(c), 'slim ' + c); }
});

test('render shows every labelled field, formats dates, and never renders excluded columns', () => {
  const html = Info.render(full);
  for (const [, label] of Info.GROUPS.flatMap(g => g.fields)) assert.ok(html.includes('<dt>' + label + '</dt>'), label);
  assert.ok(html.includes('IB-ZZ') && html.includes('VAS-ZZ') && html.includes('0900 000 0001') && html.includes('Zz Ref'));
  assert.ok(html.includes('Feb 3, 1990') && html.includes('Oct 22, 2026'), 'dates formatted: ' + html);
  assert.ok(!html.includes('999') && !html.includes('AR-SECRET') && !html.includes('DRV') && !html.includes('secret.jpg'));
  assert.ok(html.includes('<dd>—</dd>'), 'empty values show —');
  assert.ok(!html.includes('<script'));
});

test('render escapes values and renders the audit fallback with a note when there is no job', () => {
  assert.ok(Info.render({ first_name: '<b>x</b>' }).includes('&lt;b&gt;x&lt;/b&gt;'));
  const html = Info.render(null, { note: 'Sheet-only record — no FieldOps JO found', fallback: { subscriber: 'ZZ FALLBACK', mobile_no: '0900', address: 'addr', barangay: 'brgy' } });
  assert.ok(html.includes('ZZ FALLBACK') && html.includes('0900') && html.includes('Sheet-only record'));
});

test('returnState: open return = returned; resolved and not validated = resubmitted; otherwise none', () => {
  assert.equal(Info.returnState(null), 'none');
  assert.equal(Info.returnState({ status: 'completed' }), 'none');
  assert.equal(Info.returnState({ status: 'in-progress', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: null }), 'returned');
  assert.equal(Info.returnState({ status: 'completed', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: '2026-10-22T03:00:00Z', validated: false }), 'resubmitted');
  assert.equal(Info.returnState({ status: 'completed', qa_returned_at: '2026-10-22T01:00:00Z', qa_return_resolved_at: '2026-10-22T03:00:00Z', validated: true }), 'none');
});

test('loadForAudit: job_id first, then JO/account lookup, then the sheet-only fallback; errors become a note', async () => {
  const byId = { getJobFullInfo: async id => ({ id }), findJobByJoOrAcct: async () => { throw new Error('must not be called'); } };
  assert.equal((await Info.loadForAudit(byId, { job_id: 'ZZ-1' })).job.id, 'ZZ-1');
  const byJo = { getJobFullInfo: async () => null, findJobByJoOrAcct: async (jo, acct) => ({ id: 'ZZ-2', jo, acct }) };
  const r2 = await Info.loadForAudit(byJo, { jo_no: 'R-ZZ', acct_no: 'IB' });
  assert.equal(r2.job.id, 'ZZ-2'); assert.equal(r2.note, '');
  const none = { getJobFullInfo: async () => null, findJobByJoOrAcct: async () => null };
  const r3 = await Info.loadForAudit(none, { subscriber: 'ZZ FALLBACK', mobile_no: '0900', address: 'a', barangay: 'b' });
  assert.equal(r3.job, null); assert.match(r3.note, /Sheet-only/); assert.equal(r3.fromAudit.subscriber, 'ZZ FALLBACK');
  const boom = { getJobFullInfo: async () => { throw new Error('rls'); }, findJobByJoOrAcct: async () => null };
  const r4 = await Info.loadForAudit(boom, { job_id: 'ZZ-1', subscriber: 'ZZ' });
  assert.equal(r4.job, null); assert.match(r4.note, /could not be loaded: rls/);
});
