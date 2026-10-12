import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
let wims = {};
try { wims = require('./qa-wims-export.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
function api() { assert.equal(typeof wims.load, 'function', 'WIMS export must load authorized canonical evidence'); return wims; }
const config = {url:'https://example.test', key:'public-key', token:'user-token'};
function record(job_id, receipts = [], extra = {}) {
  return {job_id, receipts, conflicts:[], unconfirmed:[], warnings:[], ...extra};
}
function response(body, status = 200, headers = {}) {
  return {ok:status >= 200 && status < 300, status, json:async()=>body,
    headers:{get:name=>headers[name.toLowerCase()] ?? null}};
}
function receipt(extra = {}) {
  return {id:'receipt-a', job_id:'WO-A', status:'completed', task:'install',
    account_no:'FILED-ACCOUNT',job_account_no:'FILED-ACCOUNT',account_verification:'matches_job',
    work_account:'Filed customer billing',jo_number:'JO-FILED',subscriber:'Filed Subscriber',photos_count:12,
    tech_user:'original-tech-uuid', declared_by:'Original Technician', team_code:'OLD CREW',
    completed_at:'2026-10-12T03:04:05Z', created_at:'2026-10-12T03:00:00Z',
    kit_used:{conn:2, patch:1}, materials_used:{foc:321, clip5:8},
    material_catalog:{foc:{name:'FOC',consume_unit:'m'},clip5:{name:'Clip 5mm',consume_unit:'pc'}},
    cpe:[{serial:'MODEM-001',category:'modem'},{serial:'IPTV-01',category:'iptv'},
      {serial:'IPTV-02',category:'iptv'},{serial:'IPTV-03',category:'iptv'}],
    foc_reel_no:'R-OLD', foc_start_m:900, foc_end_m:700, foc2_reel_no:'R-2', foc2_end_m:1879,
    pulled:[{serial:'PULLED-01', note:'Replacement scratched unit'}], kit_remarks:'Extra connector recorded',
    superseded_at:null, ...extra};
}

test('loads canonical ids in bounded batches and preserves every returned job', async()=>{
  const jobs = Array.from({length:205},(_,i)=>({id:'WO-'+i,job_order_no:'SHARED'}));
  jobs.push(jobs[0]);
  const requests=[];
  const map = await api().load(jobs,{...config,fetch:async(url,options)=>{
    assert.equal(url,'https://example.test/rest/v1/rpc/validation_wims_export');
    assert.equal(options.headers['Content-Profile'],'qa');
    assert.equal(options.headers.Authorization,'Bearer user-token');
    const {p_job_ids}=JSON.parse(options.body); requests.push(p_job_ids);
    return response(p_job_ids.map(id=>record(id)));
  }});
  assert.deepEqual(requests.map(r=>r.length),[100,100,5]);
  assert.equal(Object.keys(map).length,205);
  assert.equal(map['WO-204'].job_id,'WO-204');
});

test('missing authorized job response aborts export instead of calling it undeclared',async()=>{
  await assert.rejects(api().load([{id:'WO-A'},{id:'WO-B'}],{...config,fetch:async()=>response([record('WO-A')])}),/incomplete|missing/i);
});

test('unknown canonical response and duplicate response abort export',async()=>{
  for (const body of [[record('ALIAS')],[record('WO-A'),record('WO-A')]]) {
    await assert.rejects(api().load([{id:'WO-A'}],{...config,fetch:async()=>response(body)}),/unexpected|duplicate/i);
  }
});

test('server-side authorization or missing RPC errors abort the export',async()=>{
  for (const status of [401,403,404,500]) {
    await assert.rejects(api().load([{id:'WO-A'}],{...config,fetch:async()=>response({message:'Export dependency unavailable'},status)}),/unavailable|failed|denied/i);
  }
});

test('paged partial and malformed evidence cannot masquerade as success',async()=>{
  for (const r of [response([record('WO-A')],206,{'content-range':'0-0/2'}),
    response([record('WO-A')],200,{'content-range':'0-0/2'}),
    response([record('WO-A',[],{conflicts:null})]),response({data:[record('WO-A')]}),
    response([record('WO-A',[{...receipt(),job_id:'WO-OTHER'}])])]) {
    await assert.rejects(api().load([{id:'WO-A'}],{...config,fetch:async()=>r}),/partial|incomplete|malformed|canonical/i);
  }
});

test('unconfirmed aliases stay unconfirmed and never become installed quantities',()=>{
  api();
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[],{unconfirmed:[{kind:'unmapped_receipt',count:2,reason:'reused JO; canonical identity unknown'}]})});
  assert.match(cols['WIMS STATUS'],/UNCONFIRMED/i);
  assert.equal(cols['WIMS MATERIALS'],'');
  assert.equal(cols['WIMS RECEIPT ID'],'');
  assert.match(cols['WIMS UNCONFIRMED EVIDENCE'],/reused JO/);
});

test('same-row columns include original declarer all serials units and recorded FOC readings',()=>{
  api();
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[receipt()])});
  assert.equal(cols['WIMS STATUS'],'DECLARED');
  assert.match(cols['WIMS DECLARED BY / TEAM'],/Original Technician.*original-tech-uuid.*OLD CREW/);
  assert.match(cols['WIMS IPTV SERIALS'],/IPTV-01.*IPTV-02.*IPTV-03/);
  assert.match(cols['WIMS MODEM SERIALS'],/MODEM-001/);
  assert.match(cols['WIMS KIT'],/conn: 2 pc/);
  assert.match(cols['WIMS MATERIALS'],/Clip 5mm \[clip5\]: 8 pc/);
  assert.match(cols['WIMS FOC'],/recorded usage: 321 m/);
  assert.match(cols['WIMS FOC'],/R-OLD.*start: 900.*end: 700.*R-2.*end: 1879/);
  assert.match(cols['WIMS PULLED DEVICES'],/PULLED-01.*Replacement scratched unit/);
  assert.match(cols['WIMS REMARKS'],/Extra connector recorded/);
  assert.match(cols['WIMS DECLARED ACCOUNT'],/FILED-ACCOUNT/);
  assert.match(cols['WIMS WORK ACCOUNT'],/Filed customer billing/);
  assert.match(cols['WIMS DECLARED JO / TICKET'],/JO-FILED/);
  assert.match(cols['WIMS DECLARED SUBSCRIBER'],/Filed Subscriber/);
  assert.match(cols['WIMS DECLARED PHOTO COUNT'],/12/);
  assert.ok(Object.keys(cols).every(k=>k.startsWith('WIMS ')));
});

test('server-verified canonical account mismatch remains assigned but visibly requires review',()=>{
  api();
  const r=receipt({account_verification:'mismatch',job_account_no:'OTHER-JOB-ACCOUNT'});
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[r])});
  assert.match(cols['WIMS STATUS'],/ACCOUNT MISMATCH.*REVIEW/);
  assert.match(cols['WIMS DECLARED ACCOUNT'],/FILED-ACCOUNT/);
  assert.equal(cols['WIMS RECEIPT ID'],'receipt-a');
});

test('superseded receipts remain visible without doubling active usage',()=>{
  api();
  const old=receipt({id:'historical-a',superseded_at:'2026-10-12T04:00:00Z',superseded_note:'warehouse corrected',materials_used:{foc:900}});
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[old,receipt()])});
  assert.equal(cols['WIMS STATUS'],'DECLARED; 1 HISTORICAL');
  assert.doesNotMatch(cols['WIMS MATERIALS'],/900/);
  assert.match(cols['WIMS HISTORICAL RECEIPTS'],/historical-a.*900 m.*warehouse corrected/);
});

test('multiple active declarations are listed separately and prominently flagged',()=>{
  api();
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[receipt(),receipt({id:'receipt-b',materials_used:{foc:100}})])});
  assert.match(cols['WIMS STATUS'],/MULTIPLE ACTIVE RECEIPTS.*REVIEW/);
  assert.match(cols['WIMS MATERIALS'],/receipt-a.*321 m/);
  assert.match(cols['WIMS MATERIALS'],/receipt-b.*100 m/);
  assert.doesNotMatch(cols['WIMS MATERIALS'],/421/);
});

test('changed payload conflicts remain visible without treating attempted usage as consumed',()=>{
  api();
  const conflict={id:'conflict-a',job_id:'WO-A',reason:'changed_payload',status:'open',
    tech_user:'attempt-tech',team_code:'NEW CREW',created_at:'2026-10-12T05:00:00Z',
    args:{p_modem_serial:'ATTEMPT-M',p_iptv_serials:['ATTEMPT-I1','ATTEMPT-I2'],p_materials:{foc:999},p_pulled_note:'Changed declaration'}};
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[receipt()],{conflicts:[conflict]})});
  assert.match(cols['WIMS STATUS'],/1 CONFLICT.*REVIEW/);
  assert.match(cols['WIMS CONFLICTS'],/conflict-a.*changed_payload.*ATTEMPT-I1.*ATTEMPT-I2.*999/);
  assert.doesNotMatch(cols['WIMS MATERIALS'],/999/);
});

test('missing job evidence cannot produce successful no-declaration columns',()=>{
  api(); assert.throws(()=>wims.columnsFor('WO-MISSING',{}),/missing|not loaded/i);
});

test('missing serial enrichment and duplicate receipt payloads fail before a misleading export',async()=>{
  api();
  for(const rows of [[receipt({cpe:null})],[receipt(),receipt()],[receipt({account_verification:undefined})]]){
    await assert.rejects(wims.load([{id:'WO-A'}],{...config,fetch:async()=>response([record('WO-A',rows)])}),/malformed|duplicate/i);
  }
});

test('Excel cell overflow aborts instead of truncating historical or conflict evidence',()=>{
  api();
  const map={'WO-A':record('WO-A',[receipt({kit_remarks:'x'.repeat(32768)})])};
  assert.throws(()=>wims.columnsFor('WO-A',map),/Excel.*cell.*limit|too long/i);
});

test('zero quantities and absent enrichment are visible without guessed identities or measurements',()=>{
  api();
  const r=receipt({declared_by:null,team_code:null,kit_used:{conn:0},material_catalog:{},materials_used:{foc:0,unknown:4},
    foc_start_m:0,foc_end_m:0,foc2_reel_no:null,foc2_end_m:null});
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[r],{warnings:['Profile enrichment unavailable']})});
  assert.match(cols['WIMS DECLARED BY / TEAM'],/original-tech-uuid/);
  assert.match(cols['WIMS KIT'],/conn: 0 pc/);
  assert.match(cols['WIMS MATERIALS'],/unknown: 4 \[unit unrecorded\]/);
  assert.match(cols['WIMS FOC'],/recorded usage: 0 m/);
  assert.match(cols['WIMS WARNINGS'],/Profile enrichment unavailable/);
});

test('arbitrary kit keys use recorded catalog units and never guess pieces for unknown materials',()=>{
  api();
  const r=receipt({kit_used:{etape:1,unknown_kit:4,sar:1},
    material_catalog:{etape:{name:'Electrical Tape',consume_unit:'m'}}});
  const cols=wims.columnsFor('WO-A',{'WO-A':record('WO-A',[r])});
  assert.match(cols['WIMS KIT'],/Electrical Tape \[etape\]: 1 m/);
  assert.match(cols['WIMS KIT'],/unknown_kit: 4 \[unit unrecorded\]/);
  assert.match(cols['WIMS KIT'],/sar: 1 pc/);
});

test('browser script exposes the same API without CommonJS',()=>{
  assert.ok(existsSync(new URL('./qa-wims-export.js',import.meta.url)),'browser export module exists');
  const context={}; vm.runInNewContext(readFileSync(new URL('./qa-wims-export.js',import.meta.url),'utf8'),context);
  assert.equal(typeof context.QaWimsExport.load,'function');
  assert.equal(typeof context.QaWimsExport.columnsFor,'function');
});
