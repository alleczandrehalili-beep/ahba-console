import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const wims=createRequire(import.meta.url)('./qa-wims-export.js');
const receipt={id:'internal-receipt-uuid',job_id:'JO1',status:'completed',declared_by:'Ana Technician',team_code:'TEAM 1',account_verification:'matches_job',job_account_no:'A1',task:'install',
 kit_used:{conn:3,patch:1,tbox:1,sar:1,saf:1},materials_used:{conn:1,foc:128,clip5:10,dtape:0.25,tie:10},
 foc_reel_no:'Reel-MixedCase-01',foc_start_m:985,foc_end_m:857,foc2_reel_no:null,foc2_end_m:null,
 material_catalog:{conn:{name:'Fast connector',consume_unit:'pc'},foc:{name:'Drop fiber',consume_unit:'m'},clip5:{name:'Cable clip 5mm',consume_unit:'pc'},dtape:{name:'Double-sided tape',consume_unit:'yd'},tie:{name:'Cable tie',consume_unit:'pc'}},
 cpe:[{serial:'ModemCase001',category:'modem'},{serial:'IptvA',category:'iptv'},{serial:'IptvB',category:'iptv'}],pulled:[],completed_at:'2026-10-13T01:00:00Z'};
const map=(rs=[receipt],extra={})=>({JO1:{job_id:'JO1',receipts:rs,conflicts:[],unconfirmed:[],warnings:['Quantities and FOC readings are filed values. Material labels and units are current reference metadata. No inventory totals are inferred.'],...extra}});
test('usage report shows actual serial/reel values and numeric usage directly, without receipt prefixes',()=>{
 const c=wims.usageColumnsFor('JO1',map());
 assert.equal(c['MODEM SERIAL NO.'],'ModemCase001');assert.equal(c['IPTV SERIAL NO.'],'IptvA, IptvB');
 assert.equal(c['REEL 1 NO.'],'Reel-MixedCase-01');assert.equal(c['REEL 1 START (M)'],985);assert.equal(c['REEL 1 END (M)'],857);
 assert.equal(c['FOC USED (M)'],128);assert.equal(c['CLIP 5MM USED (PC)'],10);assert.equal(c['DOUBLE-SIDED TAPE USED (YD)'],0.25);
 const visible=Object.entries(c).filter(([k])=>!wims.isAuditColumn(k));assert.ok(visible.every(([,v])=>!String(v).includes('internal-receipt-uuid')));
 assert.equal(Object.hasOwn(c,'WIMS REVIEW NOTE'),false);
});
test('kit quantity includes mirrored buffer excess; report never adds it again',()=>{
 const c=wims.usageColumnsFor('JO1',map());assert.equal(c['KIT CONNECTOR (PC)'],3);assert.equal(c['BUFFER CONNECTOR (PC)'],1);
 assert.ok(!Object.keys(c).some(k=>k==='WIMS TOTAL CONNECTOR (PC)'));
});
test('missing values are blank, explicit zero is numeric zero, and second-reel readings remain separate',()=>{
 const r={...receipt,materials_used:{foc:0,clip5:0},foc_start_m:0,foc_end_m:0,foc2_reel_no:'R2',foc2_end_m:135};
 const c=wims.usageColumnsFor('JO1',map([r]));assert.equal(c['FOC USED (M)'],0);assert.equal(c['CLIP 5MM USED (PC)'],0);
 assert.equal(c['CLIP 7MM USED (PC)'],'');assert.equal(c['REEL 2 NO.'],'R2');assert.equal(c['REEL 2 END (M)'],135);
});
test('unconfirmed and open receipts are not turned into actual usage',()=>{
 for(const m of [map([],{unconfirmed:[{reason:'Reused JO identity requires review'}]}),map([{...receipt,status:'draft'}])]){
  const c=wims.usageColumnsFor('JO1',m);assert.match(c['WIMS STATUS'],/REVIEW/);assert.equal(c['FOC USED (M)'],'');assert.equal(c['MODEM SERIAL NO.'],'');
 }
});
test('multiple declarations stay on one JO row with separate values, never summed',()=>{
 const c=wims.usageColumnsFor('JO1',map([receipt,{...receipt,id:'second-receipt',materials_used:{foc:100}}]));
 assert.match(c['WIMS STATUS'],/REVIEW/);assert.equal(c['FOC USED (M)'],'D1: 128 | D2: 100');assert.notEqual(c['FOC USED (M)'],228);
});
test('other recorded material keys gain a column with the actual catalog unit',()=>{
 const r={...receipt,materials_used:{new_material:2},material_catalog:{new_material:{name:'New drop accessory',consume_unit:'pc'}}};
 const c=wims.usageColumnsFor('JO1',map([r]));assert.equal(c['NEW DROP ACCESSORY [NEW_MATERIAL] USED (PC)'],2);
});
test('worksheet hides technical audit columns and sizes usage columns to show headings and identifiers',()=>{
 const c=wims.usageColumnsFor('JO1',map());const layout=wims.worksheetLayout([{'WO ID':'JO1',...c}]);const keys=Object.keys({'WO ID':'JO1',...c});
 assert.equal(layout.columns[keys.indexOf('WIMS RECEIPT ID')].hidden,true);
 assert.equal(layout.columns[keys.indexOf('MODEM SERIAL NO.')].hidden,undefined);
 assert.ok(layout.columns[keys.indexOf('MODEM SERIAL NO.')].wch>=24);assert.ok(layout.autoFilter);
});

test('requested pulled serial remarks and review-note columns are completely absent from extraction',()=>{
 const c=wims.usageColumnsFor('JO1',map());
 for(const key of ['WIMS PULLED SERIAL NO.','WIMS USAGE REMARKS','WIMS REVIEW NOTE','PULLED SERIAL NO.','USAGE REMARKS','REVIEW NOTE'])assert.equal(Object.hasOwn(c,key),false);
});
test('material column headings omit WIMS and preserve exact quantities, units and formatting',()=>{
 const c=wims.usageColumnsFor('JO1',map());assert.equal(c['FOC USED (M)'],128);assert.equal(c['KIT CONNECTOR (PC)'],3);assert.equal(c['BUFFER CONNECTOR (PC)'],1);assert.equal(c['CLIP 5MM USED (PC)'],10);assert.equal(c['DOUBLE-SIDED TAPE USED (YD)'],0.25);
 assert.ok(!Object.keys(c).some(k=>/^WIMS (KIT |BUFFER |FOC USED|CLIP .*USED|DOUBLE-SIDED TAPE)/.test(k)));
 const rows=[{'WO ID':'JO1',...c}],keys=Object.keys(rows[0]),layout=wims.worksheetLayout(rows);
 assert.equal(layout.columns[keys.indexOf('CLIP 5MM USED (PC)')].wch,18);
 const ws={B1:{v:'CLIP 5MM USED (PC)'},B2:{v:10},'!cols':[{}, {wch:18}]};
 wims.styleWorksheet(ws,[{'WO ID':'JO1','CLIP 5MM USED (PC)':10}],['WO ID','CLIP 5MM USED (PC)']);
 assert.equal(ws.B1.s.fill.fgColor.rgb,'166534');assert.equal(ws.B2.z,'0');
});
