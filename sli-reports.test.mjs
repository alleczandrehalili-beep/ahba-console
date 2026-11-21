import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('./console-sli-reports.js');
const row=(date,team,status,jo,extra={})=>({'DATE':date,'DISPATCH STATUS':'','STATUS':status,'TEAM ASSIGNED':team,'JOB ORDER NO.':jo,'DISPATCH COUNT':0,'AMOUNT':'','TEAM REMARKS':'',...extra});
const sample=[
  row('2026-10-02','AHBA_SLI001','COMPLETED','R1'),row('2026-10-02','AHBA_SLI001','INCOMPLETE','R2'),
  row('2026-10-03','AHBA_SLI001','COMPLETED','R3'),row('2026-10-03','AHBA_SLI002','COMPLETED','R4'),
  row('2026-10-03','AHBA_SLI002','CANCELLED','R5'),row('2026-10-04','AHBA_SLR004','COMPLETED','R6'),
  row('2026-10-04','','',''),row('2026-10-04','J2_SLI01','COMPLETED','R7'),
  row('2026-10-05','AHBA_SLI003','COMPLETED','R8',{'TEAM REMARKS':'LINE1\nLINE2 & <x>'}),
];
test('stats keep only AHBA_SLI teams and count statuses',()=>{
  const {headers,body}=R.normalize(sample); const T=R.stats(headers,body);
  assert.deepEqual(Object.keys(T).sort(),['AHBA_SLI001','AHBA_SLI002','AHBA_SLI003']);
  assert.deepEqual(T.AHBA_SLI001,{a:3,c:2,i:1,x:0,o:0}); assert.equal(T.AHBA_SLI002.x,1);
});
test('rankings: volume tie-break = rate then assigned; rating tie-break = completed',()=>{
  const T={AHBA_SLI001:{a:4,c:3,i:1,x:0,o:0},AHBA_SLI002:{a:3,c:3,i:0,x:0,o:0},AHBA_SLI003:{a:2,c:1,i:1,x:0,o:0},AHBA_SLI004:{a:4,c:2,i:2,x:0,o:0}};
  const k=R.rankings(T);
  assert.deepEqual(k.vol.map(x=>x.team),['AHBA_SLI002','AHBA_SLI001','AHBA_SLI004','AHBA_SLI003']);
  assert.deepEqual(k.rat.map(x=>x.team),['AHBA_SLI002','AHBA_SLI001','AHBA_SLI004','AHBA_SLI003']);
  assert.equal(k.A,13); assert.equal(k.C,9); assert.equal(k.I,4);
});
test('xlsx parts: one pivot per SLI team, cache has every row, special chars encoded',()=>{
  const {headers,body}=R.normalize(sample); const {parts,teams,sheetNames}=R.buildXlsxParts(headers,body);
  assert.equal(teams.length,3); assert.equal(sheetNames.at(-1),'Load History');
  assert.equal(Object.keys(parts).filter(k=>/pivotTables\/pivotTable\d+\.xml$/.test(k)).length,3);
  const rec=parts['xl/pivotCache/pivotCacheRecords1.xml'];
  assert.equal((rec.match(/<r>/g)||[]).length,sample.length);
  assert.ok(rec.includes('LINE1_x000a_LINE2 &amp; &lt;x&gt;'));
  const p1=parts['xl/pivotTables/pivotTable1.xml'];
  assert.ok(p1.includes('axis="axisPage"')&&p1.includes('name="PivotTable1"')&&p1.includes('subtotal="count"'));
  assert.ok(parts['xl/workbook.xml'].includes('<pivotCaches>'));
  assert.ok(parts['xl/worksheets/sheet1.xml'].includes('Grand Total'));
});
test('xlsx requires AHBA_SLI rows',()=>{
  const {headers,body}=R.normalize([row('2026-10-04','J2_SLI01','COMPLETED','R7')]);
  assert.throws(()=>R.buildXlsxParts(headers,body),/No AHBA_SLI/);
});
test('month helpers',()=>{
  assert.deepEqual(R.monthList('2026-07','2026-11'),['2026-07','2026-08','2026-09','2026-10','2026-11']);
  assert.equal(R.lastDay('2026-02'),28); assert.equal(R.colName(45),'AT');
});
