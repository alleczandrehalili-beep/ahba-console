// The warehouse review panels' renderers (extracted from wims-admin-live.html between the WIMS-RENDER markers) must render
// technician-supplied text (attempted serials, notes, JO keys, resolutions) as TEXT — never as markup or attribute breakouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(new URL('./wims-admin-live.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('/*WIMS-RENDER-START*/'), html.indexOf('/*WIMS-RENDER-END*/'));
const ctx = { Date, JSON, String }; vm.createContext(ctx);
vm.runInContext(src + '\nglobalThis.R = { wimsEsc, wimsAttr, wimsArgsSummary, wimsRenderConflictRows, wimsRenderReusedRows };', ctx);
const R = ctx.R;
const bad = '<img src=x onerror="alert(1)">';
const row = { id: 'c1', created_at: '2026-10-12T01:00:00Z', jo_key: 'R1"><b x="', job_id: 'J<1>', team_id: 't1', reason: 'changed_payload', rpc: 'complete_install', status: 'open', existing_id: 'e1',
  note: 'note ' + bad, args: { p_modem_serial: bad, p_iptv_serials: ['<svg/onload=1>'], p_materials: { clip5: 2 }, p_pulled_serials: ['PULL<'], p_pulled_note: bad, p_kit_remarks: '"quoted"', p_foc_reel: 'R<1>' } };

test('conflict rows: every technician-supplied value is rendered as text; no raw markup, no attribute breakout', () => {
  const out = R.wimsRenderConflictRows([row], () => 'TEAM<1>', { e1: { modem_serial: 'M<1>', kit_used: { conn: 2 }, materials_used: { clip5: 2 }, completed_at: '2026-10-11T00:00:00Z' } });
  assert.ok(!out.includes('<img'), 'no raw img tag'); assert.ok(!out.includes('<svg'), 'no raw svg tag');
  assert.ok(out.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'), 'attempted serial escaped');
  assert.ok(out.includes('data-cfrev="c1"'), 'the review buttons carry the id attribute');
  assert.ok(!/data-cfrev="[^"]*"[^>]*\bx=/.test(out), 'no injected attribute');
  assert.ok(out.includes('R1&quot;&gt;&lt;b x=&quot;'), 'JO key escaped in text context');
  assert.ok(out.includes('TEAM&lt;1&gt;') && out.includes('M&lt;1&gt;') && out.includes('J&lt;1&gt;'), 'team, receipt modem and job id escaped');
  assert.ok(out.includes('<pre') && out.includes('&quot;p_modem_serial&quot;'), 'full attempted payload shown, escaped');
  assert.ok(out.includes('Original receipt'), 'original receipt shown for comparison');
});

test('reused-JO rows: JO key in the binding button attribute cannot break out; resolution text is escaped', () => {
  const out = R.wimsRenderReusedRows([{ jo_key: 'R2" onclick="x', reason: 'reused_jo', install_ids: ['11111111-2222'], job_id: 'J<2>', resolved_at: null }, { jo_key: 'R3', reason: 'reused_jo', install_ids: [], job_id: null, resolved_at: '2026-10-12', resolution: '<b>bound</b>' }]);
  assert.ok(out.includes('data-rjbind="R2&quot; onclick=&quot;x"'), 'attribute-escaped JO key'); assert.ok(!/onclick=/.test(out.replace(/&quot;/g, '')) || !out.includes(' onclick="x"'), 'no live onclick');
  assert.ok(out.includes('&lt;b&gt;bound&lt;/b&gt;'), 'resolution escaped'); assert.ok(out.includes('J&lt;2&gt;'));
});

test('summary covers every inventory-relevant input (reels, second reel, pulled note, kit remarks, work account)', () => {
  const s = R.wimsArgsSummary({ p_modem_serial: 'M1', p_foc_reel: 'RL-1', p_foc_start: 2000, p_foc_end: 1900, p_foc2_reel: 'RL-2', p_foc2_end: 1500, p_pulled_serials: ['P1'], p_pulled_note: 'note', p_kit_remarks: 'extra', p_work_account: 'ACC' });
  for (const k of ['RL-1', '2000→1900', 'reel2 RL-2', '→1500', 'pulled P1 (note)', 'kit remarks: extra', 'work acct ACC']) assert.ok(s.includes(k), 'summary has ' + k);
});
