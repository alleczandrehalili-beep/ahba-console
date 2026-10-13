import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const report=createRequire(import.meta.url)('./qa-wims-export.js');
const src=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8');
const exportBody=src.slice(src.indexOf('let qaArchiveBusy=false;'),src.indexOf('async function clearCloud(){'));
function context(fail=false){
 const books=[], downloads=[], toasts=[], files=[];
 const fixture={J1:{'WIMS STATUS':'FILED','WIMS RECEIPT ID':'receipt-1','WIMS MATERIALS':'clip5: 2 pcs','MODEM SERIAL NO.':'ModemCase001','REEL 1 NO.':'ReelCase001','FOC USED (M)':128},J2:{'WIMS STATUS':'UNDER REVIEW','WIMS RECEIPT ID':'','WIMS MATERIALS':''}};
 class Zip {constructor(prefix=''){this.prefix=prefix;}file(name,data){files.push({name,path:this.prefix+name,data});return this;} folder(name){return new Zip(this.prefix+name+'/');}async generateAsync(){return new Blob(['zip']);}}
 const ctx={Blob,AbortController,console,Promise,setTimeout:()=>0,URL:{createObjectURL:()=> 'blob:export',revokeObjectURL(){}},
  ensureXLSX:async()=>{},ensureXLSXStyle:async()=>{},ensureJSZip:async()=>{},loadAgentNames:async()=>{},
  compJobs:[{id:'J1',job_order_no:'REUSED',subscriber:'One',team:'AHBA_SLI017',payment_amount:250},{id:'J2',job_order_no:'REUSED',subscriber:'Two',team:'AHBA_SLI018',payment_amount:400}],compPhotos:{J1:[],J2:[]},
  SUPA_URL:'https://fixture.invalid',SUPA_KEY:'public-fixture-key',dashTok:()=> 'fixture-user-token',
  QaWimsExport:{async load(){if(fail)throw new Error('WIMS retrieval failed');return fixture;},usageColumnsFor:(id,m)=>m[id],officialTeamCode:report.officialTeamCode,isAuditColumn:report.isAuditColumn,worksheetLayout:report.worksheetLayout,styleWorksheet:report.styleWorksheet},
  showToast:m=>toasts.push(m),manilaToday:()=> '2026-10-13',dayStr:x=>x,fmtWhen:x=>x,agentLabel:x=>x||'',upperRows:r=>r,safeName:x=>x,
  $:()=>({value:'2026-10-13'}),JSZip:Zip,
  XLSX:{utils:{book_new:()=>({sheets:[]}),json_to_sheet:(r,opts)=>({rows:r,headers:opts.header,'!ref':'A1:AZ3'}),book_append_sheet:(wb,sheet,name)=>{wb.sheets.push({name,rows:sheet.rows,headers:sheet.headers,columns:sheet['!cols'],filter:sheet['!autofilter']});},},write:wb=>{books.push(wb);return new Uint8Array([1]);}},
  document:{body:{appendChild(){}},createElement:()=>({click(){downloads.push(true);},remove(){}})}
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(exportBody,ctx);return{ctx,books,downloads,toasts,files};
}
test('QA archive has one Completed sheet with each canonical JO WIMS beside unchanged JO/payment columns',async()=>{
 const {ctx,books}=context();await ctx.exportZip();
 assert.equal(books.length,1);assert.equal(books[0].sheets.length,1);assert.equal(books[0].sheets[0].name,'Completed');
 const rows=books[0].sheets[0].rows;
 assert.equal(rows[0]['WO ID'],'J1');assert.equal(rows[0]['AMOUNT'],250);assert.equal(rows[0]['WIMS RECEIPT ID'],'receipt-1');assert.equal(rows[0]['WIMS MATERIALS'],'clip5: 2 pcs');
 assert.equal(rows[1]['WO ID'],'J2');assert.equal(rows[1]['AMOUNT'],400);assert.equal(rows[1]['WIMS STATUS'],'UNDER REVIEW');assert.equal(rows[1]['WIMS RECEIPT ID'],'');
});
test('WIMS retrieval failure prevents a misleading successful archive and leaves selected jobs intact',async()=>{
 const {ctx,books,downloads,toasts}=context(true);await ctx.exportZip();
 assert.equal(books.length,0);assert.equal(downloads.length,0);assert.equal(ctx.compJobs.length,2);assert.ok(toasts.some(x=>/WIMS|retriev|export/i.test(x)));
});

test('QA photo archive preserves the accepted replacement PNG and WebP formats',async()=>{
 const {ctx,files}=context();ctx.compPhotos={J1:[{id:'7',path:'replacement.png',label:'Router'}],J2:[{id:'8',path:'replacement.webp',label:'Router'}]};
 ctx.photoBase=p=>p;ctx.fetch=async path=>({ok:true,blob:async()=>new Blob(['original bytes'],{type:path.endsWith('.png')?'image/png':'image/webp'})});ctx.reqOk=async r=>{if(!r.ok)throw new Error('Photo download failed');};
 await ctx.exportZip();const photos=files.filter(f=>f.data instanceof Blob);
 assert.deepEqual(photos.map(p=>p.name),['One - Router.png','Two - Router.webp']);assert.equal(await photos[0].data.text(),'original bytes');
});

test('an unavailable photo stops archive download instead of including an error body as proof',async()=>{
 const {ctx,downloads,toasts}=context();ctx.compPhotos={J1:[{id:'7',path:'missing.png',label:'Router'}],J2:[]};ctx.photoBase=p=>p;
 ctx.fetch=async()=>({ok:false,blob:async()=>new Blob(['not found'],{type:'text/html'})});ctx.reqOk=async r=>{if(!r.ok)throw new Error('Photo unavailable');};
 await ctx.exportZip();assert.equal(downloads.length,0);assert.ok(toasts.some(t=>/photo|archive/i.test(t)));assert.equal(ctx.compJobs.length,2);
});

test('a gallery cache invalidated after a saved correction cannot produce a zero-photo archive',async()=>{
 const {ctx,books,downloads,toasts}=context();delete ctx.compPhotos.J1;await ctx.exportZip();
 assert.equal(downloads.length,0);assert.equal(books.length,0);assert.ok(toasts.some(t=>/reload|current photos/i.test(t)));
});

test('photo fetch preserves exact stable photo id and label for one-photo correction',async()=>{
 const start=src.indexOf('async function fetchPhotosFor(ids){'),end=src.indexOf('async function renderCompleted(){',start);
 const ctx={SUPA_URL:'https://fixture.invalid',SUPA_KEY:'k',dashTok:()=> 't',reqOk:async r=>{if(!r.ok)throw new Error('Load failed');},fetch:async()=>({ok:true,json:async()=>[{id:'9007199254740993',job_id:'J1',path:'original.jpg',label:'Modem',created_at:'2026-10-12T01:00:00Z',team:'TEAM'}]})};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);const result=await ctx.fetchPhotosFor(['J1']);
 assert.equal(result.J1[0].id,'9007199254740993');assert.equal(result.J1[0].path,'original.jpg');assert.equal(result.J1[0].label,'Modem');
});

test('selected-photo gallery escapes evidence text and shows correction controls only for a "QA Photo Fix" editor on the GC console',()=>{
 const start=src.indexOf('function qaPhotoText('),end=src.indexOf('async function renderCompleted(){',start);
 const nodes=new Map();const container={innerHTML:'',querySelectorAll:()=>[]};
 const ctx={window:{dashUser:{allowed_pages:['photofix'],edit_pages:['photofix']}},isGcConsole:()=>true,QaPhotoCorrections:{canReplace:u=>u.edit_pages.includes('photofix')},photoBase:p=>'https://fixture.invalid/'+p,document:{},$(){},showToast(){},openModal(){},URL,console};
 ctx.dashUser=ctx.window.dashUser;ctx.window=ctx;vm.createContext(ctx);if(start>=0)vm.runInContext(src.slice(start,end),ctx);
 ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'<script>bad</script> "photo"'}]);
 assert.ok(container.innerHTML.includes('Replace this photo'));assert.ok(!container.innerHTML.includes('<script>'));assert.ok(container.innerHTML.includes('&lt;script&gt;'));
 ctx.window.dashUser.edit_pages=[];ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'Router'}]);assert.ok(!container.innerHTML.includes('Replace this photo'));
});

test('ordinary legacy empty-photo QA validation still reaches the authorized server',async()=>{
 const start=src.indexOf('async function validateJob(jobId){'),end=src.indexOf('async function exportZip(){',start),requests=[];
 const job={id:'LEGACY',validated:false},ctx={window:{dashUser:{username:'QA',display_name:'QA'}},dashCanEdit:()=>true,compPhotos:{LEGACY:[]},compJobs:[job],Date,encodeURIComponent,SUPA_URL:'https://fixture.invalid',SUPA_KEY:'key',dashTok:()=> 'token',showToast(){},renderCompleted(){},reqOk:async r=>{assert.equal(r.ok,true);},fetch:async(url,options)=>{requests.push({url,body:JSON.parse(options.body)});return{ok:true};}};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.validateJob('LEGACY');
 assert.equal(requests.length,1);assert.ok(requests[0].url.endsWith('/rpc/validate_photo_evidence'));assert.deepEqual(requests[0].body,{p_job_id:'LEGACY',p_expected_photos:[]});assert.equal(job.validated,true);
});

test('QA photo cleanup preserves corrected evidence and deletes only selected ordinary photo identities',async()=>{
 const start=src.indexOf('async function clearCloud(){'),end=src.indexOf('\n}',start)+2,requests=[],toasts=[];
 const ctx={qaArchiveBusy:false,dashCanEdit:()=>true,$:()=>({value:'2026-10-13'}),manilaToday:()=> '2026-10-13',compJobs:[{id:'J1'}],compPhotos:{J1:[{id:'7',path:'qa-corrections/org/op/replacement.jpg'},{id:'8',path:'ordinary.jpg'}]},confirm:()=>true,showToast:m=>toasts.push(m),renderCompleted(){},SUPA_URL:'https://fixture.invalid',SUPA_KEY:'key',dashTok:()=> 'token',encodeURIComponent,reqOk:async r=>{assert.equal(r.ok,true);},fetch:async(url,options)=>{requests.push({url,body:options.body&&JSON.parse(options.body)});return{ok:true};}};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.clearCloud();
 assert.deepEqual(requests[0].body.prefixes,['ordinary.jpg']);
 const deletion=decodeURIComponent(requests[1].url);assert.ok(deletion.includes('id.eq.8'));assert.ok(deletion.includes('ordinary.jpg'));assert.ok(!deletion.includes('id.eq.7'));assert.ok(toasts.some(x=>/retained|kept/i.test(x)));
});

test('a "QA Photo Fix" View-only user can inspect photo history without replacement rights',()=>{
 const start=src.indexOf('function qaPhotoText('),end=src.indexOf('async function renderCompleted(){',start),container={innerHTML:'',querySelectorAll:()=>[]};
 const ctx={dashUser:{allowed_pages:['photofix'],edit_pages:[]},isGcConsole:()=>true,QaPhotoCorrections:{canReplace:()=>false,canViewHistory:()=>true},photoBase:p=>'https://fixture.invalid/'+p,document:{},$(){},showToast(){},openModal(){},URL,console};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'Router'}]);
 assert.ok(container.innerHTML.includes('History'));assert.ok(!container.innerHTML.includes('Replace this photo'));
 ctx.QaPhotoCorrections.canViewHistory=()=>false;ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'Router'}]);assert.ok(!container.innerHTML.includes('History'));
});

test('reopening QA gallery reloads current evidence and never offers stale photos after a load failure',async()=>{
 const start=src.indexOf('async function openGallery(jobId){'),end=src.indexOf('async function validateJob(jobId){',start),nodes=new Map(),painted=[],toasts=[];
 for(const id of ['photoTitle','photoSub','photoGrid','validateBtn','photoModal'])nodes.set('#'+id,{textContent:'',innerHTML:'',style:{},open:false});
 let fail=true,requests=0;
 const ctx={compJobs:[{id:'J1',subscriber:'One',validated:false}],compPhotos:{J1:[{id:'7',path:'old.jpg'}]},$:id=>nodes.get(id),$$:()=>[],dashCanEdit:()=>true,renderQaPhotoTiles:(node,job,rows)=>{painted.push(rows.map(p=>p.path));node.innerHTML=rows.map(p=>p.path).join();},openModal:node=>node.open=true,closeModals(){},validateJob(){},showToast:m=>toasts.push(m),fetchPhotosFor:async()=>{requests++;if(fail)throw new Error('Offline');return{J1:[{id:'7',path:'new.jpg'}]};}};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.openGallery('J1');
 assert.equal(requests,1);assert.ok(!nodes.get('#photoGrid').innerHTML.includes('old.jpg'));assert.equal(nodes.get('#validateBtn').style.display,'none');assert.equal(painted.length,0);
 fail=false;await ctx.openGallery('J1');assert.equal(requests,2);assert.deepEqual(painted,[['new.jpg']]);assert.equal(ctx.compPhotos.J1[0].path,'new.jpg');assert.equal(nodes.get('#validateBtn').style.display,'');
});

test('usage workbook keeps complete subscriber/JO information before WIMS with unchanged values',async()=>{
 const {ctx,books}=context();await ctx.exportZip();const s=books[0].sheets[0];
 assert.deepEqual(Array.from(s.headers.slice(0,4)),['DATE','DISPATCH STATUS','TEAM ASSIGNED','DRIVER']);
 const firstWims=s.headers.findIndex(h=>h.startsWith('WIMS '));assert.ok(firstWims>0);
 assert.ok(s.headers.slice(0,firstWims).every(h=>!h.startsWith('WIMS ')));
 assert.ok(s.headers.slice(firstWims).every(h=>report.isUsageColumn(h)));
 for(const h of ['FIRST NAME','MIDDLE NAME','LAST NAME','IBASS ACCT NO.','JOB ORDER NO.','PRIMARY NO.','OTHER CONTACT NO.','HOUSE NO.','STREET NAME','VILLAGE / SUBDIVISION','BRGY','CITY','PLAN','ACCOUNT','MODE OF PAYMENT','AMOUNT','WO ID'])assert.ok(s.headers.indexOf(h)>=0 && s.headers.indexOf(h)<firstWims,h+' must precede WIMS');
 assert.equal(s.rows[0]['MODEM SERIAL NO.'],'ModemCase001');assert.equal(s.rows[0]['REEL 1 NO.'],'ReelCase001');assert.equal(s.rows[0]['FOC USED (M)'],128);
 assert.equal(s.columns[s.headers.indexOf('WIMS RECEIPT ID')].hidden,true);assert.ok(s.filter.ref);
 assert.equal(s.rows.length,2);assert.equal(s.rows[0]['AMOUNT'],250);assert.equal(s.rows[0]['TEAM ASSIGNED'],'AHBA_SLR004');assert.equal(s.rows[1]['TEAM ASSIGNED'],'AHBA_SLR005');
});


test('archive downloads photos concurrently with a six-request cap and preserves all bytes',async()=>{
 const {ctx,files,toasts}=context();ctx.compPhotos.J1=Array.from({length:24},(_,i)=>({id:String(i+1),path:'photo-'+i+'.jpg',label:'Router'}));
 let active=0,peak=0;ctx.photoBase=p=>p;ctx.reqOk=async r=>{assert.equal(r.ok,true);};
 ctx.fetch=async url=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,10));active--;return {ok:true,blob:async()=>new Blob([url],{type:'image/jpeg'})};};
 await ctx.exportZip();assert.equal(peak,6);assert.equal(active,0);
 const photos=files.filter(f=>f.data instanceof Blob);assert.equal(photos.length,24);
 for(let i=0;i<24;i++){const name='One - Router'+(i?' ('+(i+1)+')':'')+'.jpg';assert.equal(await photos.find(p=>p.name===name).data.text(),'photo-'+i+'.jpg');}
 assert.ok(toasts.some(t=>/24.*24/.test(t)));
});
test('repeated export click does not create duplicate archives or parallel export runs',async()=>{
 const {ctx,downloads}=context();ctx.compPhotos.J1=[{id:'1',path:'one.jpg',label:'One'}];ctx.photoBase=p=>p;ctx.reqOk=async()=>{};
 ctx.fetch=async()=>{await new Promise(r=>setTimeout(r,20));return{ok:true,blob:async()=>new Blob(['proof'],{type:'image/jpeg'})};};
 await Promise.all([ctx.exportZip(),ctx.exportZip()]);assert.equal(downloads.length,1);
 // Completion clears the guard for the next intentional archive.
 await ctx.exportZip();assert.equal(downloads.length,2);
});
test('archive failure cancels remaining photo work, downloads no partial ZIP and can retry',async()=>{
 const {ctx,downloads}=context();ctx.compPhotos.J1=Array.from({length:20},(_,i)=>({id:String(i+1),path:'photo-'+i+'.jpg'}));ctx.photoBase=p=>p;
 let requests=0;ctx.reqOk=async r=>{if(!r.ok)throw new Error('Photo unavailable');};
 ctx.fetch=async url=>{requests++;await new Promise(r=>setTimeout(r,5));return {ok:!url.includes('photo-0.'),blob:async()=>new Blob(['proof'],{type:'image/jpeg'})};};
 await ctx.exportZip();assert.equal(downloads.length,0);assert.ok(requests<=6);
 ctx.fetch=async()=>({ok:true,blob:async()=>new Blob(['proof'],{type:'image/jpeg'})});await ctx.exportZip();assert.equal(downloads.length,1);
});

test('photo clearing is blocked while the archive is still downloading its evidence',async()=>{
 const start=src.indexOf('async function clearCloud(){'),end=src.indexOf('\n}',start)+2,toasts=[];
 const ctx={qaArchiveBusy:true,dashCanEdit:()=>true,$:()=>({value:'2026-10-13'}),compJobs:[{id:'J1'}],compPhotos:{J1:[{id:'8',path:'original.jpg'}]},confirm:()=>{throw new Error('must not prompt for deletion during export');},showToast:t=>toasts.push(t)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);await ctx.clearCloud();assert.ok(toasts.some(x=>/ZIP|archive|download/i.test(x)));
});

test('duplicate photo labels and an existing numbered label cannot overwrite an archive file',async()=>{
 const {ctx,files}=context();ctx.compPhotos.J1=['Router','Router (2)','Router'].map((label,i)=>({id:String(i+1),path:'photo-'+i+'.jpg',label}));ctx.photoBase=p=>p;ctx.reqOk=async()=>{};
 ctx.fetch=async path=>({ok:true,blob:async()=>new Blob([path],{type:'image/jpeg'})});await ctx.exportZip();
 const photos=files.filter(f=>f.data instanceof Blob);assert.equal(new Set(photos.map(p=>p.name)).size,3);
});


test('archive groups New Install first and sorts subscribers by structured last name without changing selected jobs',async()=>{
 const {ctx,books,files}=context();
 ctx.compJobs=[{id:'SLRT-3',first_name:'Amy',last_name:'Abad'},{id:'WO-2',first_name:'Ben',last_name:'Zulu'},{id:'WO-1',first_name:'Zoe',middle_name:'M',last_name:'De la Cruz'},{id:'SLRT-4',first_name:'Ben',last_name:'Zulu'}];
 ctx.compPhotos=Object.fromEntries(ctx.compJobs.map(j=>[j.id,[{path:j.id+'.png',label:'Router'}]]));
 ctx.QaWimsExport.load=async()=>({});ctx.QaWimsExport.usageColumnsFor=()=>({'WIMS STATUS':'NOT DECLARED'});
 ctx.photoBase=p=>p;ctx.reqOk=async()=>{};
 ctx.fetch=async path=>{await new Promise(r=>setTimeout(r,path==='WO-1.png'?20:1));return{ok:true,blob:async()=>new Blob([path],{type:'image/png'})};};
 const before=JSON.stringify(ctx.compJobs);await ctx.exportZip();
 assert.deepEqual(Array.from(books[0].sheets[0].rows,r=>r['WO ID']),['WO-1','WO-2','SLRT-3','SLRT-4']);assert.equal(JSON.stringify(ctx.compJobs),before);
 const photos=files.filter(f=>f.data instanceof Blob);
 assert.deepEqual(photos.map(f=>f.path),[
  'photos/New Install/De la Cruz, Zoe M (New Install)/De la Cruz, Zoe M - Router.png',
  'photos/New Install/Zulu, Ben (New Install)/Zulu, Ben - Router.png',
  'photos/Service Repair/Abad, Amy (Service Repair)/Abad, Amy - Router.png',
  'photos/Service Repair/Zulu, Ben (Service Repair)/Zulu, Ben - Router.png']);
 assert.deepEqual(await Promise.all(photos.map(f=>f.data.text())),['WO-1.png','WO-2.png','SLRT-3.png','SLRT-4.png']);
});
test('same subscriber and job type retain separate folders, including literal numbered subscriber names',async()=>{
 const {ctx,files}=context();ctx.compJobs=[{id:'WO-1',first_name:'Ana',last_name:'Reyes'},{id:'WO-2',first_name:'Ana',last_name:'Reyes'},{id:'WO-3',subscriber:'Reyes, Ana (2)'}];
 ctx.compPhotos=Object.fromEntries(ctx.compJobs.map(j=>[j.id,[{path:j.id+'.jpg',label:'Proof'}]]));ctx.QaWimsExport.load=async()=>({});ctx.QaWimsExport.usageColumnsFor=()=>({'WIMS STATUS':'NOT DECLARED'});
 ctx.photoBase=p=>p;ctx.reqOk=async()=>{};ctx.fetch=async path=>({ok:true,blob:async()=>new Blob([path],{type:'image/jpeg'})});
 await ctx.exportZip();const photos=files.filter(f=>f.data instanceof Blob);assert.equal(photos.length,3);assert.equal(new Set(photos.map(f=>f.path)).size,3);
 assert.ok(photos.every(f=>/\(New Install\)/.test(f.path)&&!f.path.includes('WO-')));assert.ok(photos.every(f=>f.path.startsWith('photos/New Install/Reyes,')));
});

test('GC-only (owner 2026-10-13): a non-GC console offers neither Replace nor History even with "QA Photo Fix" Edit',()=>{
 const start=src.indexOf('function qaPhotoText('),end=src.indexOf('async function renderCompleted(){',start),container={innerHTML:'',querySelectorAll:()=>[]};
 const ctx={window:{dashUser:{allowed_pages:['photofix'],edit_pages:['photofix']}},isGcConsole:()=>false,QaPhotoCorrections:{canReplace:()=>true,canViewHistory:()=>true},photoBase:p=>'https://fixture.invalid/'+p,document:{},$(){},showToast(){},openModal(){},URL,console};
 ctx.dashUser=ctx.window.dashUser;ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'Router'}]);
 assert.ok(!container.innerHTML.includes('Replace this photo')&&!container.innerHTML.includes('History'),'no correction controls outside the GC console');
 ctx.isGcConsole=()=>true;ctx.renderQaPhotoTiles(container,{id:'J1'},[{id:'7',path:'proof.jpg',label:'Router'}]);
 assert.ok(container.innerHTML.includes('Replace this photo')&&container.innerHTML.includes('History'),'GC console keeps both');
});
