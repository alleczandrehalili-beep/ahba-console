import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('./app.js',import.meta.url),'utf8');
const a=src.indexOf('function taSlrAgg('), b=src.indexOf('function taPaintSlr(');
assert.ok(a>0&&b>a);
const ctx={taIsAhba:t=>/^AHBA/i.test(t),SLR_OPEN:['assigned','pending','en-route','on-site','in-progress']};
vm.createContext(ctx); vm.runInContext(src.slice(a,b),ctx);
test('SLR aggregation: statuses, active days, resolution hours (Manila days)',()=>{
  const T=(team,status,c,d)=>({team,status,created_at:c,completed_at:d});
  const rows=ctx.taSlrAgg('2026-11',[
    T('AHBA_SLR001','completed','2026-11-01T01:00:00Z','2026-11-01T03:00:00Z'),
    T('AHBA_SLR001','completed','2026-11-02T01:00:00Z','2026-11-02T02:00:00Z'),
    T('AHBA_SLR001','negative','2026-11-02T04:00:00Z',null),
    T('AHBA_SLR001','in-progress','2026-11-03T04:00:00Z',null),
    T('AHBA_SLR001','cancelled','2026-11-03T05:00:00Z',null),
    T('J2_SLR01','completed','2026-11-03T05:00:00Z','2026-11-03T05:30:00Z'),
    T(null,'completed','2026-11-03T05:00:00Z',null)]);
  const r=rows.find(x=>x.team==='AHBA_SLR001');
  assert.equal(rows.length,2);
  assert.deepEqual([r.tickets,r.completed,r.open,r.closed,r.days],[5,2,1,2,3]);
  assert.equal(r.res_hours,1.5); assert.equal(r.group,'AHBA');
  assert.equal(rows.find(x=>x.team==='J2_SLR01').group,'SUBCON');
});
