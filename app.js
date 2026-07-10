/* © 2026 AHBA Development — Proprietary & confidential. Unauthorized copying, reuse, or distribution is prohibited. */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const money = n => `₱${Number(n).toLocaleString('en-PH')}`;
// HTML-escape values interpolated into innerHTML — stops markup-break / stored XSS from field-entered data.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// On-demand loaders for heavy libraries (xlsx ≈ 900KB, jszip) so they stay OFF the initial render path.
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=()=>rej(new Error('load failed: '+src)); document.head.appendChild(s); }); }
let _xlsxP, _jszipP;
function ensureXLSX(){ return window.XLSX ? Promise.resolve() : (_xlsxP||(_xlsxP=loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'))); }
function ensureJSZip(){ return window.JSZip ? Promise.resolve() : (_jszipP||(_jszipP=loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'))); }

const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  route:'<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M6 16V9a4 4 0 0 1 4-4h5"/>',users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  clipboard:'<path d="M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/>',wallet:'<path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 13h4"/>',chevron:'<path d="m9 18 6-6-6-6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m20 6-11 11-5-5"/>',truck:'<path d="M10 17h4V5H2v12h3M14 9h4l4 4v4h-3M8 17a3 3 0 1 1-6 0M22 17a3 3 0 1 1-6 0"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',expand:'<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',close:'<path d="m18 6-12 12M6 6l12 12"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',spark:'<path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3ZM5 16l-.8 2.2L2 19l2.2.8L5 22l.8-2.2L8 19l-2.2-.8L5 16Z"/>',pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',wrench:'<path d="M14.7 6.3a4 4 0 0 0-5-5L7 4l3 3 2.7-2.7a4 4 0 0 0 2 5L5 19l-2 2 2 2 2-2 9.7-9.7a4 4 0 0 0 5-5L19 9l-3-3 2.7-2.7Z"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};
function injectIcons(){ $$('[data-icon]').forEach(el=>{const name=el.dataset.icon;el.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.info}</svg>`}) }

const names=Array.from({length:20},(_,i)=>`AHBA_SLI${String(i+1).padStart(3,'0')}`);
const areas=['Quezon City','Manila','Makati','Pasig','Taguig','Caloocan','Parañaque','Mandaluyong','San Juan','Marikina'];
const statuses=['on-site','en-route','on-site','available','en-route','on-site','en-route','available','on-site','en-route','on-site','offline','en-route','on-site','available','en-route','on-site','offline','available','en-route'];
const colors=['#1a9d79','#4086e8','#9a6edb','#ee8564','#16a0ad','#e3a23c'];
// Teams are loaded PURELY from the DB (org-scoped by RLS) via syncTeamsFromDb — no hardcoded seed,
// so each org sees only its own field teams (subcon never sees GC's teams, and vice-versa).
let teams=[];

// Supabase (read-only here) for the Accounts panel
const SUPA_URL='https://avjzkfxgzeyxtihkofed.supabase.co';
const SUPA_KEY='sb_publishable_2JM51zp2r5GUICznc6Nz4Q_B4UFS1da';
// Authorization token for REST calls: logged-in dashboard user's JWT (falls back to public key pre-login).
// Once RLS is locked to authenticated-only, all data calls must carry this user token.
window.__ahbaTok = window.__ahbaTok || null;
function dashTok(){ return window.__ahbaTok || SUPA_KEY; }
// ---- App version stamp + auto "new version" nudge (kills stale-cache confusion after deploy) ----
const APP_VERSION='2026-07-10.1';
function _stampVersion(){ try{ const el=document.getElementById('appVerStamp'); if(el) el.textContent='v'+APP_VERSION; }catch(e){} }
function _showVerNudge(){
  if(document.getElementById('verNudge')) return;
  const b=document.createElement('div');
  b.id='verNudge';
  b.textContent='🔄 Bagong bersyon ng console — i-tap para i-refresh';
  b.style.cssText='position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#0d3b34;color:#fff;font:600 12px Manrope,sans-serif;padding:9px 16px;border-radius:0 0 12px 12px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.28)';
  b.onclick=()=>location.reload();
  document.body.appendChild(b);
}
async function checkAppVersion(){
  try{
    const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok) return;
    const j=await r.json();
    const dep=j&&j.version;
    if(dep && dep!==APP_VERSION) _showVerNudge();
  }catch(e){}
}
// ---- Reliability & Scale: superadmin health widget (read-only) ----
const HEALTH_THRESHOLDS = {
  dbAmber: 0.70, dbRed: 0.90,      // fraction of db_size_cap_bytes
  connAmber: 0.80, connRed: 0.95,  // fraction of max_connections
  longAmber: 1, longRed: 3         // long-running query count
};
let _healthTimer = null;
async function fetchSystemHealth(){
  try{
    const r = await fetch(`${SUPA_URL}/rest/v1/rpc/system_health`, {
      method:'POST',
      headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+dashTok(), 'Content-Type':'application/json' },
      body:'{}'
    });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}
function _healthStatus(h){
  // returns {level:'green'|'amber'|'red', msgs:[...]}
  const msgs=[]; let level='green';
  const bump=l=>{ if(l==='red') level='red'; else if(l==='amber'&&level!=='red') level='amber'; };
  const cap=Number(h.db_size_cap_bytes)||8589934592;
  const dbFrac=Number(h.db_size_bytes)/cap;
  if(dbFrac>=HEALTH_THRESHOLDS.dbRed){ bump('red'); msgs.push('Database is near its size limit.'); }
  else if(dbFrac>=HEALTH_THRESHOLDS.dbAmber){ bump('amber'); msgs.push('Database size is growing — monitor capacity.'); }
  const maxc=Number(h.max_connections)||0, conn=Number(h.connections)||0;
  const cFrac=maxc? conn/maxc : 0;
  if(cFrac>=HEALTH_THRESHOLDS.connRed){ bump('red'); msgs.push('Connections near the limit.'); }
  else if(cFrac>=HEALTH_THRESHOLDS.connAmber){ bump('amber'); msgs.push('Connection usage is high.'); }
  const lr=Number(h.long_running)||0;
  if(lr>=HEALTH_THRESHOLDS.longRed){ bump('red'); msgs.push(lr+' slow queries running (>30s).'); }
  else if(lr>=HEALTH_THRESHOLDS.longAmber){ bump('amber'); msgs.push(lr+' slow query running (>30s).'); }
  return {level, msgs};
}
async function renderHealthWidget(){
  const box=document.getElementById('healthWidget');
  if(!box) return;
  const u=window.dashUser;
  if(!(u&&u.is_super)){ box.style.display='none'; return; }
  box.style.display='';
  const dot=document.getElementById('healthDot');
  const sum=document.getElementById('healthSummary');
  const ban=document.getElementById('healthBanner');
  const h=await fetchSystemHealth();
  if(!h || h.ok===false){
    if(dot) dot.style.background='#9aa6a2';
    if(sum) sum.textContent='health unavailable';
    if(ban) ban.style.display='none';
    return;
  }
  const st=_healthStatus(h);
  const colors={green:'#11825f',amber:'#c98a00',red:'#c0392b'};
  if(dot) dot.style.background=colors[st.level];
  const dbGB=(Number(h.db_size_bytes)/1073741824).toFixed(2);
  const capGB=(Number(h.db_size_cap_bytes)/1073741824).toFixed(0);
  if(sum) sum.textContent=`DB ${dbGB}/${capGB} GB · ${h.connections}/${h.max_connections} conn · ${h.long_running} slow`;
  if(ban){
    if(st.level==='green'||!st.msgs.length){ ban.style.display='none'; }
    else{
      ban.style.display='';
      ban.textContent=st.msgs.join(' ');
      ban.style.background = st.level==='red' ? '#fdecea' : '#fff6e0';
      ban.style.color = colors[st.level];
    }
  }
}
function startHealthWidget(){
  if(_healthTimer){ clearInterval(_healthTimer); _healthTimer=null; }
  const u=window.dashUser;
  if(!(u&&u.is_super)) return;
  renderHealthWidget();
  _healthTimer=setInterval(()=>{ if(document.getElementById('overviewPage')?.classList.contains('active')) renderHealthWidget(); }, 60000);
  const rb=document.getElementById('healthRefresh'); if(rb) rb.onclick=renderHealthWidget;
}

// Data comes PURELY from the DB (org-scoped by RLS) — no hardcoded/demo seed and no cross-user
// localStorage cache, so a subcontractor never sees GC (or any other org's) jobs/expenses/activity.
let jobs=[];
let expenses=[];
const activity=[];

// UI state
let mapFilter='all';
let notifReadAt=Number(localStorage.getItem('ahba_notif_read')||0);

function save(){localStorage.setItem('fieldflow_jobs',JSON.stringify(jobs));localStorage.setItem('fieldflow_expenses',JSON.stringify(expenses))}
function statusLabel(s){ if(!s)return '—'; if(s==='negative')return 'Incomplete'; return s.split('-').map(x=>x?(x[0].toUpperCase()+x.slice(1)):'').join(' ')}
function todayTotal(){return expenses.reduce((a,b)=>a+Number(b.amount),0)}
function showToast(msg){$('#toast span').textContent=msg;$('#toast').classList.add('show');clearTimeout(showToast._t);showToast._t=setTimeout(()=>$('#toast').classList.remove('show'),2600)}
// Fire a phone push (Web Push) to a team or audience via the send-push Edge Function
function pushNotify(payload){ try{ fetch(`${SUPA_URL}/functions/v1/send-push`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()},body:JSON.stringify(payload)}).catch(()=>{}); }catch(e){} }

function dayStr(d){return new Date(d).toLocaleDateString('en-CA',{timeZone:TZ});}
// Canonical Manila calendar-day a job was FINISHED. Uses the authoritative completion/negative
// timestamp, falling back to updated_at only for older rows that predate those columns.
// All "completed/cancelled/negative today" buckets must go through this — never raw updated_at.
function finishedDay(j){ return dayStr(j.status==='completed' ? (j.completed_at||j.updatedAt) : j.status==='negative' ? (j.negative_at||j.updatedAt) : j.updatedAt); }
function timeAgo(ts){ if(!ts)return''; const s=(Date.now()-new Date(ts))/1000; if(s<60)return Math.max(1,Math.round(s))+'s'; if(s<3600)return Math.round(s/60)+'m'; if(s<86400)return Math.round(s/3600)+'h'; return Math.round(s/86400)+'d'; }
function renderLiveActivity(){
  const el=$('#activityList'); if(!el)return;
  const map={completed:['check','','Job completed'],'en-route':['truck','blue','Team en route'],'on-site':['pin','','Arrived on site'],'in-progress':['wrench','blue','Work in progress'],negative:['info','coral','Marked negative'],assigned:['truck','blue','Dispatched'],cancelled:['info','coral','Cancelled'],for_validation:['clipboard','','For validation'],pending:['info','','For dispatch'],rejected:['info','coral','Rejected']};
  const items=jobs.filter(j=>j.updatedAt).slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,8);
  if(!items.length){ el.innerHTML='<div style="padding:24px;text-align:center;color:#9aa6a2;font-size:11px">No field activity yet.</div>'; return; }
  el.innerHTML=items.map(j=>{ const m=map[j.status]||['info','','Updated']; const who=j.team?`<b>${j.team}</b> · `:''; return `<div class="activity-item" data-detail="${j.id}" style="cursor:pointer"><span class="activity-icon ${m[1]}" data-icon="${m[0]}"></span><div class="activity-copy"><strong>${m[2]}</strong><p>${who}${j.subscriber||j.id}</p></div><time>${timeAgo(j.updatedAt)}</time></div>`; }).join('');
  injectIcons();
  $$('#activityList [data-detail]').forEach(r=>r.onclick=()=>openJobDetail(r.dataset.detail));
}
function renderOverview(){
  const today=manilaToday();
  const isToday=d=>d && dayStr(d)===today;
  const loadToday=d=>!d||String(d).slice(0,10)===today;
  // Jobs completed today (resets to 0 each new day)
  const doneJobs=jobs.filter(j=>j.status==='completed' && finishedDay(j)===today);
  const todaySet=jobs.filter(j=> (['completed','cancelled'].includes(j.status)? finishedDay(j)===today : loadToday(j.load_date)) );
  if($('#completedCount')) $('#completedCount').textContent=doneJobs.length;
  if($('#completedTarget')) $('#completedTarget').textContent=Math.max(todaySet.length,doneJobs.length);
  if($('#completedFoot')) $('#completedFoot').textContent=`${doneJobs.length} done`;
  // Teams on the road = online (timed-in) teams only
  const online=Object.entries(shiftByTeam).filter(([k,s])=>s.online);
  if($('#activeTeamCount')) $('#activeTeamCount').textContent=online.length;
  if($('#availableTeamText')) $('#availableTeamText').textContent=`${online.length} online now`;
  if($('#teamAvatars')) $('#teamAvatars').innerHTML=online.slice(0,6).map(([k])=>{const t=teams.find(x=>x.code===k);return `<span style="background:#18a57b">${t?t.short:k.slice(-3)}</span>`}).join('');
  // Avg completion time today (encode → completion, same-day)
  // Avg completion time per JO = dispatch (scheduled_at) → completed_at, for field-team completions today.
  // (created_at is the sales-encode time — often days earlier — so it's a fallback only.)
  const mins=[]; doneJobs.forEach(j=>{ if(!j.team) return; const start=j.scheduled_at||j.created_at, done=j.completed_at||j.updatedAt; if(start&&done){ const d=(new Date(done)-new Date(start))/60000; if(d>0&&d<24*60) mins.push(d); } });
  if(mins.length){ const avg=Math.round(mins.reduce((a,b)=>a+b,0)/mins.length); if($('#avgTime'))$('#avgTime').textContent=`${Math.floor(avg/60)}h ${String(avg%60).padStart(2,'0')}m`; if($('#avgSub'))$('#avgSub').textContent=`avg per JO · ${mins.length} completed today`; }
  else { if($('#avgTime'))$('#avgTime').textContent='—'; if($('#avgSub'))$('#avgSub').textContent='no completed jobs yet today'; }
  // 7-day completed mini-bars (real)
  const bars=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const ds=dayStr(d); bars.push(jobs.filter(j=>j.status==='completed'&&finishedDay(j)===ds).length); }
  const mx=Math.max(...bars,1); if($('#completionBars')) $('#completionBars').innerHTML=bars.map(n=>`<span style="height:${6+Math.round(n/mx*34)}px"></span>`).join('');
  renderTeamLocations();
  renderLiveActivity();
  renderNotifPop();
  injectIcons();
  renderExpenses();renderJobs();
}
// ---------- Live GPS map (Leaflet) ----------
const AREA_COORDS={'Quezon City':[14.676,121.043],'Manila':[14.599,120.984],'Makati':[14.554,121.024],'Pasig':[14.576,121.085],'Taguig':[14.520,121.053],'Caloocan':[14.651,120.972],'Parañaque':[14.479,121.019],'Mandaluyong':[14.577,121.037],'San Juan':[14.601,121.030],'Marikina':[14.650,121.102]};
function areaCoord(a){if(!a)return null;if(AREA_COORDS[a])return AREA_COORDS[a];const k=Object.keys(AREA_COORDS).find(x=>x.toLowerCase()===String(a).toLowerCase());return k?AREA_COORDS[k]:null;}
const SUB_FIELDS=['dispatch_status','driver','tech1','mapping_team','mapping_remarks','dispatched_remarks','ibass_acct_no','job_order_no','vas_no','play_type','special_note','ref_no','new_ref','primary_no','other_contact_no','first_name','middle_name','last_name','house_no','street_name','village','district','brgy','city','in_charge','source_of_sales','referral_name','deleted_at','deleted_by','load_type','current_plan','ticket_no'];
const safeName=s=>(s||'subscriber').replace(/[\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim()||'subscriber';
let leafMap=null, teamMarkers={}, techIndex={}, trackLayer=null;
function haversineKm(a,b,c,d){const R=6371,toR=x=>x*Math.PI/180;const dLat=toR(c-a),dLng=toR(d-b);const s=Math.sin(dLat/2)**2+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function isOnline(loc){return loc && loc.location_at && (Date.now()-new Date(loc.location_at))<15*60*1000}

// ---- Live team shifts (account + crew) read from today's attendance ----
let shiftByTeam={};   // { AHBA_SLI001: {account,driver,tech1,tech2,online,time_in} }
async function loadTeamShifts(){
  const today=manilaToday();
  const yd=new Date(); yd.setDate(yd.getDate()-1); const yest=yd.toLocaleDateString('en-CA',{timeZone:TZ});
  try{
    // Include yesterday too, so a team that timed in before midnight (and is still open) stays ONLINE.
    const r=await fetch(`${SUPA_URL}/rest/v1/attendance?select=username,work_date,time_in,time_out,work_account,crew_driver,crew_tech1,crew_tech2,deployed_verified,verified_by,verified_at&or=(work_date.eq.${today},work_date.eq.${yest})&order=time_in.desc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    const m={};
    // Rows are newest-first. A team is ONLINE if ANY of its rows is still open (time_in && no time_out),
    // not just the latest — avoids showing an actually-logged-in team as offline.
    rows.forEach(a=>{
      const open=!!(a.time_in&&!a.time_out);
      const cur=m[a.username];
      if(!cur){
        m[a.username]={account:a.work_account||'',driver:a.crew_driver||'',tech1:a.crew_tech1||'',tech2:a.crew_tech2||'',online:open,time_in:a.time_in,verified:a.deployed_verified===true,verified_by:a.verified_by||'',verified_at:a.verified_at||''};
      } else if(open && !cur.online){
        // Found an open shift on an older row → upgrade to ONLINE, prefer its account/crew.
        cur.online=true; cur.time_in=a.time_in;
        cur.account=a.work_account||cur.account; cur.driver=a.crew_driver||cur.driver; cur.tech1=a.crew_tech1||cur.tech1; cur.tech2=a.crew_tech2||cur.tech2;
        if(a.deployed_verified===true){ cur.verified=true; cur.verified_by=a.verified_by||cur.verified_by; cur.verified_at=a.verified_at||cur.verified_at; }
      }
    });
    shiftByTeam=m;
  }catch(e){}
}
function teamCrew(code){const s=shiftByTeam[code]||{};return [s.driver,s.tech1,s.tech2].filter(Boolean).join(', ');}
// A team "moved" a load today → real deployment (not just a login test)
function teamHasActivity(code){
  const today=manilaToday();
  return jobs.some(j=>{
    if(j.team!==code) return false;
    if(!['en-route','on-site','in-progress','completed','negative'].includes(j.status)) return false;
    const d=j.load_date?String(j.load_date).slice(0,10):(j.updatedAt?new Date(j.updatedAt).toLocaleDateString('en-CA',{timeZone:TZ}):'');
    return !d || d===today;
  });
}
function teamCounted(code){const s=shiftByTeam[code]||{};return s.verified===true||teamHasActivity(code);}
// Dispatcher confirms (or unconfirms) that a signed-in team is really deployed
async function verifyTeamDeployed(code,val){
  const date=manilaToday();
  const who=currentOperator(), now=new Date().toISOString();
  const payload=val?{deployed_verified:true,verified_by:who,verified_at:now}:{deployed_verified:false,verified_by:null,verified_at:null};
  try{
    await fetch(`${SUPA_URL}/rest/v1/attendance?username=eq.${code}&work_date=eq.${date}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});
    await loadTeamShifts();
    renderTeams($('#teamSearch')?.value||'');
    if($('#expensesPage')?.classList.contains('active')) renderExpenses();
    if($('#teamDetailModal')?.open) openTeamDetail(code);
    showToast(val?`${code} verified as deployed`:`${code} verification removed`);
  }catch(e){ showToast('Could not update verification'); }
}

// ---- Live real-time clock (Manila / Philippine Standard Time) ----
function updateShiftClock(){
  const now=new Date();
  const t=$('#clockTime'); if(t)t.textContent=now.toLocaleTimeString('en-PH',{timeZone:TZ,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true});
  const d=$('#clockDate'); if(d)d.textContent=now.toLocaleDateString('en-PH',{timeZone:TZ,weekday:'long',month:'short',day:'numeric'})+' · PHT';
}
function initMap(){
  if(leafMap||typeof L==='undefined'||!document.getElementById('leafletMap'))return;
  leafMap=L.map('leafletMap',{zoomControl:true,attributionControl:false}).setView([14.5995,120.9842],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(leafMap);
  leafMap.on('click',()=>clearTeamTrack());   // tap empty map to clear a shown route
  setTimeout(()=>leafMap.invalidateSize(),200);
}
async function fetchTechLocations(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/technicians?select=username,area,lat,lng,location_at`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    techIndex={}; rows.forEach(t=>{techIndex[t.username]=t}); return rows;
  }catch(e){return Object.values(techIndex)}
}
async function renderTeamLocations(){
  initMap(); if(!leafMap)return;
  const rows=await fetchTechLocations();
  const today=manilaToday();
  const seen={};
  rows.forEach(t=>{
    if(t.lat==null||t.lng==null)return;
    // map shows TODAY's positions only — auto-clears at the start of each new day
    if(!t.location_at || new Date(t.location_at).toLocaleDateString('en-CA',{timeZone:TZ})!==today) return;
    if(!isOnline(t)) return;                       // STANDBY: show ONLINE (green) pins only
    seen[t.username]=1;
    const color='#18a57b';
    const popup=`<b>${t.username}</b><br>${t.area||''}<br>${t.location_at?'Updated '+fmtWhen(t.location_at):'—'}<br><span style="color:#178262;font-weight:700">Tap pin → show route history</span>`;
    if(teamMarkers[t.username]){
      teamMarkers[t.username].setLatLng([t.lat,t.lng]).setStyle({fillColor:color,color:color}).bindPopup(popup);
    }else{
      teamMarkers[t.username]=L.circleMarker([t.lat,t.lng],{radius:9,weight:2,color,fillColor:color,fillOpacity:.9}).addTo(leafMap).bindPopup(popup);
    }
    teamMarkers[t.username].off('click').on('click',e=>{ if(window.L&&L.DomEvent)L.DomEvent.stopPropagation(e); showTeamTrackOnMap(t.username); });
  });
  // remove markers no longer shown
  Object.keys(teamMarkers).forEach(u=>{if(!seen[u]){leafMap.removeLayer(teamMarkers[u]);delete teamMarkers[u]}});
  const withGps=rows.filter(t=>t.lat!=null).length;
  const onlineN=rows.filter(isOnline).length;
  const at=$('#availableTeamText'); if(at) at.textContent=`${onlineN} online · tap a pin for route`;
  populateMapHistTeams();   // keep the team-history dropdown in sync with the map
}
// Remove any route currently drawn on the map.
function clearTeamTrack(){ if(trackLayer&&leafMap){ try{ leafMap.removeLayer(trackLayer); }catch(e){} } trackLayer=null; }
// Populate the map's route-history team dropdown from all field accounts.
function populateMapHistTeams(){
  const sel=$('#mapHistTeam'); if(!sel) return;
  const cur=sel.value;
  // Build from the field-team list already loaded on the map (reliable — no separate fetch/lock).
  let list=(teams||[]).filter(t=>t&&t.code).map(t=>({code:t.code,name:t.name||t.code,area:t.area}));
  if(!list.length) list=Object.values(techIndex||{}).map(t=>({code:t.username,name:t.username,area:t.area}));
  // de-dup + sort by code
  const seen={}; list=list.filter(t=>t.code&&!seen[t.code]&&(seen[t.code]=1));
  list.sort((a,b)=>String(a.code).localeCompare(String(b.code)));
  const opts=list.map(t=>`<option value="${t.code}">${t.name}${t.area?(' · '+t.area):''}</option>`).join('');
  sel.innerHTML='<option value="">🧭 Pumili ng team — travel history…</option>'+opts;
  if(cur) sel.value=cur;
  const d=$('#mapHistDate'); if(d&&!d.value) d.value=manilaToday();
}
// Snap a raw GPS trace to the actual road network (OSRM map-matching).
// Returns [[lat,lng],...] following the real roads, or null if unavailable
// (caller falls back to a direct line). Free public service, best-effort.
async function roadSnap(latlngs){
  try{
    if(!latlngs || latlngs.length<2) return null;
    let pts=latlngs;
    if(pts.length>95){ const step=Math.ceil(pts.length/95); pts=pts.filter((_,i)=>i%step===0 || i===latlngs.length-1); }
    if(pts.length<2) return null;
    const coords=pts.map(p=>`${(+p[1]).toFixed(6)},${(+p[0]).toFixed(6)}`).join(';');
    const url=`https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&tidy=true&gaps=ignore`;
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),8000);
    const r=await fetch(url,{signal:ctrl.signal}); clearTimeout(to);
    if(!r.ok) return null;
    const j=await r.json();
    if(j.code!=='Ok' || !Array.isArray(j.matchings) || !j.matchings.length) return null;
    const out=[];
    j.matchings.forEach(m=>{ const g=m&&m.geometry&&m.geometry.coordinates; if(Array.isArray(g)) g.forEach(c=>out.push([c[1],c[0]])); });
    return out.length>1?out:null;
  }catch(e){ return null; }
}
// Draw a team's location trail for a given date as a road-following line + numbered stops.
// Works for ANY team and ANY date (including offline teams / past days).
async function showTeamTrackOnMap(code, date){
  if(!leafMap) return;
  clearTeamTrack();
  date = date || manilaToday();
  let pts=[];
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/location_history?select=lat,lng,area,reason,created_at&username=eq.${encodeURIComponent(code)}&work_date=eq.${date}&order=created_at.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    pts=(r.ok?await r.json():[]).filter(p=>p.lat!=null&&p.lng!=null);
  }catch(e){}
  // append the latest known position as the "NOW" stop — only when viewing TODAY
  const cur=techIndex[code];
  if(date===manilaToday() && cur&&cur.lat!=null&&cur.lng!=null){
    const last=pts[pts.length-1];
    if(!last || Math.abs(+last.lat-+cur.lat)>1e-6 || Math.abs(+last.lng-+cur.lng)>1e-6)
      pts.push({lat:cur.lat,lng:cur.lng,area:cur.area,reason:'current',created_at:cur.location_at});
  }
  if(!pts.length){ showToast(`No location history for ${code} on ${date}`); return; }
  const isToday=date===manilaToday();
  const latlngs=pts.map(p=>[+p.lat,+p.lng]);
  const grp=L.layerGroup();
  let drawn=latlngs, snapped=false;
  if(latlngs.length>1){
    const road=await roadSnap(latlngs);
    if(road && road.length>1){                                                         // real roads travelled
      drawn=road; snapped=true;
      L.polyline(road,{color:'#0e6b50',weight:5,opacity:.9}).addTo(grp);
      L.polyline(road,{color:'#7fe0b8',weight:2,opacity:.9}).addTo(grp);                // subtle inner highlight
    } else {
      L.polyline(latlngs,{color:'#0e6b50',weight:3,opacity:.7,dashArray:'6,7'}).addTo(grp);  // fallback: direct line
    }
  }
  pts.forEach((p,i)=>{
    const isLast=i===pts.length-1;
    const label=(isLast&&isToday)?'NOW':String(i+1);
    const fill=(isLast&&isToday)?'#18a57b':'#f5c518', txt=(isLast&&isToday)?'#fff':'#3a2c08';
    const icon=L.divIcon({className:'trk-pin',html:`<div style="background:${fill};color:${txt};border:2px solid #fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font:800 9px Manrope;box-shadow:0 2px 6px rgba(0,0,0,.35)">${label}</div>`,iconSize:[22,22],iconAnchor:[11,11]});
    const time=p.created_at?fmtTime(p.created_at):'—';
    const place=p.area||`${(+p.lat).toFixed(4)}, ${(+p.lng).toFixed(4)}`;
    const why=(p.reason&&p.reason!=='current'&&p.reason!=='auto')?(' · '+p.reason):'';
    L.marker([+p.lat,+p.lng],{icon}).bindPopup(`<b>${code}</b> · stop ${label}<br>${place}<br>${time}${why}`).addTo(grp);
  });
  grp.addTo(leafMap); trackLayer=grp;
  try{ leafMap.fitBounds(L.latLngBounds(drawn).pad(0.25)); }catch(e){}
  showToast(`Route: ${code} · ${date} — ${pts.length} stop${pts.length===1?'':'s'}${snapped?' · snapped to roads':' · direct line'} (tap empty map to clear)`);
}
function renderJobs(){
  const hist=!!dashHist, SRC=hist?dashHist:jobs;
  const today=hist?dashViewDate:manilaToday();
  const isToday=d=>d && new Date(d).toLocaleDateString('en-CA',{timeZone:TZ})===today;
  const loadToday=d=>!d || String(d).slice(0,10)===today;   // working set for the day
  if(!hist){
    maybePromptRollover();
    const pending=jobs.filter(j=>j.status==='pending');
    const _td=manilaToday();
    if($('#pendingBadge')) $('#pendingBadge').textContent=pending.filter(j=>!j.load_date||String(j.load_date).slice(0,10)===_td).length;
    if($('#queueBody')) $('#queueBody').innerHTML=pending.slice(0,4).map(j=>`<tr><td><strong>${j.id}</strong><span>${j.priority}</span></td><td><strong>${esc(j.subscriber)}</strong></td><td>${j.type}</td><td>${esc(j.area)}</td><td><span class="status pending">${j.wait}</span></td><td><button class="assign-btn" data-assign="${j.id}">Assign</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-cell">No jobs waiting for dispatch.</td></tr>';
    if($('#workOrderBody')) $('#workOrderBody').innerHTML=jobs.map(j=>`<tr data-type="${(j.type||'').toLowerCase()}" data-status="${j.status}" data-text="${(j.id+' '+j.subscriber+' '+j.area).toLowerCase().replace(/"/g,'')}"><td><strong>${j.id}</strong><span>${j.priority}</span></td><td><strong>${esc(j.subscriber)}</strong><span>${esc(j.plan)}</span></td><td>${j.type}</td><td>${esc(j.area)}</td><td>${j.team||'—'}</td><td><span class="status ${j.status}">${statusLabel(j.status)}</span></td><td>${j.schedule}</td></tr>`).join('');
  }
  const stages=[['pending','For Dispatch'],['assigned','Acknowledged'],['en-route','Travel'],['on-site,in-progress','On Site'],['negative','Incomplete'],['completed','Completed'],['cancelled','Cancelled']];
  $('#dispatchBoard').innerHTML=stages.map(([keys,label])=>{
    let list;
    if(hist){ list=SRC.filter(j=>keys.split(',').includes(j.status)); }              // snapshot = that day's EOD set
    else if(keys==='negative'){ list=jobs.filter(j=>j.status==='negative'); }
    else if(keys==='completed'||keys==='cancelled'){ list=jobs.filter(j=>keys.split(',').includes(j.status)&&finishedDay(j)===today); }
    else { list=jobs.filter(j=>keys.split(',').includes(j.status)&&loadToday(j.load_date)); }
    list=list.filter(tlPassOrg);   // org scope applies to the loads board too
    if(keys==='pending'){ list=list.slice().sort((a,b)=>(b.dispatch_count||0)-(a.dispatch_count||0)); }
    // In a PREVIOUS-DATE view, allow carrying that day's Incomplete loads to today's For Dispatch.
    const carryBtn=(hist && keys==='negative' && list.length)?`<button class="assign-btn" data-carryneg="1" style="width:100%;margin:0 0 8px;background:#fff4e1;border-color:#f0d9a8;color:#a4690f">↩ Carry all to For Dispatch (today)</button>`:'';
    return `<div class="board-column" data-drop="${keys}"><div class="column-head"><strong>${label}</strong><span>${list.length}</span></div>${carryBtn}${list.map(jobCard).join('')||'<div class="job-card empty"><p>No jobs in this stage.</p></div>'}</div>`;
  }).join('');
  const encDate=j=> j.created_at ? new Date(j.created_at).toLocaleDateString('en-CA',{timeZone:TZ}) : '';
  const todayLoads=(hist ? [...new Map(SRC.map(j=>[j.id,j])).values()]
                         : [...new Map(jobs.filter(j=>encDate(j)===today).map(j=>[j.id,j])).values()]).filter(tlPassOrg);
  const cntBy=s=>todayLoads.filter(j=>j.status===s).length;
  const stats=[
    ['Total Turn-Ins', todayLoads.length, '#4285f4'],
    ['Incomplete',     cntBy('negative'),  '#c2503a'],
    ['Cancelled',      cntBy('cancelled'), '#7a8088'],
    ['Completed',      cntBy('completed'), '#11825f']
  ];
  $('#dispatchStats').innerHTML=stats.map(([l,n,c])=>`<div class="small-stat" style="border-left:4px solid ${c}"><span>${l}</span><strong style="color:${c}">${n}</strong></div>`).join('');
  if(!hist){ bindAssignButtons(); wireDispatchDnD(); applyJobTableFilter(); maybeCaptureSnapshot();
    if(!renderJobs._backfilled && window.dashUser && jobs.length){ renderJobs._backfilled=true; backfillSnapshots('2026-06-22'); } }
  else { $$('#dispatchBoard .job-card[data-detail]').forEach(c=>c.onclick=e=>{ if(e.target.closest('button'))return; openJobDetail(c.dataset.detail); });
    $$('#dispatchBoard [data-carryneg]').forEach(b=>b.onclick=()=>carryNegativesToDispatch((dashHist||[]).filter(j=>j.status==='negative').map(j=>j.id))); }
  applyDispatchSearch();
}
// Carry a previous day's Incomplete (negative) loads into TODAY's For Dispatch. They keep their
// original created_at, so they are NOT counted as new Turn-Ins (turn-ins = encoded today).
async function carryNegativesToDispatch(ids){
  ids=(ids||[]).filter(Boolean);
  if(!ids.length){ showToast('No incomplete loads to carry.'); return; }
  if(!confirm(`Carry ${ids.length} incomplete load(s) to today's For Dispatch?\n\nThey will go to the current For Dispatch (1st Load) but will NOT be counted as new Turn-ins.`)) return;
  const today=manilaToday(); let n=0;
  for(const id of ids){
    const j=jobs.find(x=>x.id===id);
    if(!j || j.status!=='negative') continue;     // only still-incomplete loads
    j.status='pending'; j.team=null; j.scheduled_at=null; j.load_date=today; j.priority='1st Load';
    j.history=appendHistory(j.history, `Carried to For Dispatch from ${dashViewDate||'previous day'} (not a new turn-in)`);
    if(window.AHBASync) window.AHBASync(j);
    n++;
  }
  // Jump back to today's live view so the carried loads are visible in For Dispatch.
  const dEl=$('#tlDate'); if(dEl) dEl.value=today; dashHist=null; dashViewDate=null;
  const note=$('#dashHistNote'); if(note) note.style.display='none';
  save(); renderJobs(); if($('#timelinePage')?.classList.contains('active')) renderTimeline();
  showToast(`${n} incomplete load(s) carried to For Dispatch (not counted as turn-in)`);
}
function applyDispatchSearch(){
  const q=($('#dispatchSearch')?.value||'').toLowerCase().trim();
  $$('#dispatchBoard .board-column').forEach(col=>{
    let shown=0;
    col.querySelectorAll('.job-card[data-detail]').forEach(c=>{ const hit=!q||(c.dataset.name||'').includes(q); c.style.display=hit?'':'none'; if(hit)shown++; });
    const empty=col.querySelector('.job-card.empty'); if(empty) empty.style.display=q?'none':'';
    // show a "no match" hint when searching and nothing matched in this column
    let hint=col.querySelector('.search-empty');
    if(q && !shown){ if(!hint){ hint=document.createElement('div'); hint.className='job-card empty search-empty'; hint.innerHTML='<p>No match</p>'; col.appendChild(hint); } hint.style.display=''; }
    else if(hint){ hint.style.display='none'; }
  });
}
function appendHistory(h,line){const t=new Date().toLocaleString('en-PH',{timeZone:TZ,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});return ((h||'')+`\n[${t}] ${line}`).trim();}
// A negative job is released back to dispatch at 5:00 AM (Manila) the NEXT day.
function negReleased(negAt){
  if(!negAt) return false;
  const md=new Date(negAt).toLocaleDateString('en-CA',{timeZone:TZ});
  const release=new Date(`${md}T05:00:00+08:00`); release.setDate(release.getDate()+1);
  return Date.now()>=release.getTime();
}
// Any dispatcher (dispatch-board access OR superadmin) is asked whether to return
// yesterday's leftover Incomplete loads to "For Dispatch".
function hasDispatchAccess(u){ return !!(u && (u.is_super || (Array.isArray(u.allowed_pages)&&u.allowed_pages.includes('dispatch')))); }
let rolloverChecking=false;
// Automatic rollover of Incomplete loads to For Dispatch has been DISABLED by request.
// Leftover/Incomplete loads stay where they are; dispatchers can still return a load
// to For Dispatch manually (unassign / ↩ For Dispatch).
const ROLLOVER_ENABLED=false;
// End-of-day rollover: auto-detect leftover loads, then PROMPT the dispatcher for confirmation.
function maybePromptRollover(){
  if(!ROLLOVER_ENABLED) return;
  const u=window.dashUser; if(!u || rolloverChecking) return;
  if(!hasDispatchAccess(u)) return;
  const today=manilaToday();
  const key='ahba_rollover_'+u.username;
  if(localStorage.getItem(key)===today) return;            // already decided today
  const cands=jobs.filter(j=> (j.status==='negative' && negReleased(j.negative_at)) ||
                              (j.status==='pending' && j.load_date && String(j.load_date).slice(0,10)<today));
  if(!cands.length) return;                                 // nothing to ask yet
  rolloverChecking=true;
  const incs=cands.filter(j=>j.status==='negative').length;
  const ok=confirm(`${cands.length} leftover loads from the previous day (${incs} Incomplete).\n\nReturn these to "For Dispatch" (1st Load priority)?\n\nOK = Return   ·   Cancel = Leave for now`);
  localStorage.setItem(key,today);                          // asked once today
  rolloverChecking=false;
  if(!ok){ showToast('Left the incomplete loads for now.'); return; }
  cands.forEach(j=>{
    if(j.status==='negative'){ j.status='pending'; j.team=null; j.priority='1st Load'; j.load_date=today; j.history=appendHistory(j.history,`Returned to For Dispatch (1st Load) by ${u.display_name||u.username}`); }
    else { j.priority='1st Load'; j.load_date=today; j.history=appendHistory(j.history,`Carried to For Dispatch (1st Load) by ${u.display_name||u.username}`); }
    if(window.AHBASync) window.AHBASync(j);
  });
  showToast(`${cands.length} load(s) returned to For Dispatch.`);
  if(typeof renderOverview==='function') renderOverview();
}
function unassignJob(jobId){
  const j=jobs.find(x=>x.id===jobId); if(!j||!['assigned','en-route','negative'].includes(j.status))return;
  const wasNeg=j.status==='negative';
  j.status='pending'; j.team=null; j.scheduled_at=null; j.load_date=manilaToday(); if(wasNeg) j.priority='1st Load';
  j.history=appendHistory(j.history, wasNeg?'Manually returned → For Dispatch (1st Load)':'Moved back to For Dispatch');
  save(); showToast(`${jobId} → For Dispatch${wasNeg?' (High priority)':''}`);
  if(window.AHBASync) window.AHBASync(j);
  if(dashHist){ exitHistToToday(); } else { renderJobs(); if($('#timelinePage')?.classList.contains('active'))renderTimeline(); }
}
function openJobDetail(jobId){
  const j=findJob(jobId)||{};
  $('#jdTitle').textContent=`${j.id} · ${j.subscriber||''}`;
  $('#jdSub').textContent=`${statusLabel(j.status||'—')}${j.team?' · '+j.team:''}${j.dispatch_count?' · ⟳ ×'+j.dispatch_count:''}`;
  const F=(l,v)=>`<div><b>${l}</b>${v||'—'}</div>`;
  $('#jdInfo').innerHTML=[
    F('Load type',j.load_type||'SLI'),F('Sales Agent',j.created_by?agentLabel(j.created_by):'—'),
    F('Subscriber',j.subscriber),F('Primary no.',j.primary_no),F('Other contact',j.other_contact_no),
    F('J.O. Number',j.job_order_no),F('IBASS acct',j.ibass_acct_no),F('Plan / 1P-2P',[j.plan,j.play_type].filter(Boolean).join(' · ')),
    F('Current plan',j.current_plan),F('Ticket No.',j.ticket_no),
    F('Address',j.address),F('District',j.district?('District '+j.district):''),F('Barangay',j.brgy),F('City',j.city||j.area),
    F('Team',j.team),F('Status',statusLabel(j.status||'')),F('Priority',j.priority),
    F('Source / Referral',[j.source_of_sales,j.referral_name].filter(Boolean).join(' · ')),
    F('Account',j.work_account||(j.team&&shiftByTeam[j.team]?shiftByTeam[j.team].account:'')),
    F('Crew (Driver / T1 / T2)',[j.crew_driver||(j.team&&shiftByTeam[j.team]?shiftByTeam[j.team].driver:''),j.crew_tech1||(j.team&&shiftByTeam[j.team]?shiftByTeam[j.team].tech1:''),j.crew_tech2||(j.team&&shiftByTeam[j.team]?shiftByTeam[j.team].tech2:'')].filter(Boolean).join(' · ')),
    F('Payment',[j.payment_mode, j.payment_amount!=null?('₱'+j.payment_amount):null, j.ar_no?('AR '+j.ar_no):null].filter(Boolean).join(' · ')),
    F('Schedule',j.schedule),F('Negative remark',j.negative_remark)
  ].join('');
  $('#jdHistory').textContent=j.history||'No history yet.';
  // Technician uploaded photos — para ma-validate kung tama ang status na in-update
  const pg=$('#jdPhotos');
  if(pg){
    pg.innerHTML='<div class="none" style="padding:18px">Loading photos…</div>';
    fetchPhotosFor([jobId]).then(m=>{
      const list=m[jobId]||[];
      pg.innerHTML=list.length?list.map((p,i)=>`<a href="${photoBase(p.path)}" target="_blank" rel="noopener" title="${p.label||('Photo '+(i+1))} — open full size" style="position:relative"><img src="${photoBase(p.path)}" alt="${p.label||('photo '+(i+1))}" loading="lazy"><span style="position:absolute;left:0;right:0;bottom:0;background:rgba(8,44,40,.78);color:#fff;font-size:7.5px;font-weight:700;padding:3px 4px;line-height:1.2">${p.label||('#'+(i+1))}</span></a>`).join(''):'<div class="none" style="padding:18px;color:#c2503a">⚠ The technician has not uploaded any photos yet.</div>';
    }).catch(()=>{ pg.innerHTML='<div class="none" style="padding:18px;color:#c2503a">Could not load photos.</div>'; });
  }
  if($('#jdPriority')){ $('#jdPriority').value=j.priority||'Normal'; $('#jdPriority').onchange=()=>updatePriority(jobId,$('#jdPriority').value); }
  $('#jdStatus').value='';
  $('#jdApply').onclick=()=>{const c=$('#jdStatus').value; if(!c){showToast('Select a status to apply');return;} applyStatusUpdate(jobId,c);};
  if($('#jdDelete')) $('#jdDelete').onclick=()=>deleteJobOrder(jobId);
  openModal($('#jobDetailModal'));
}
// Soft-delete a job order: hide it from all views but keep the record (with a history entry)
// for audit. Console users only.
function deleteJobOrder(jobId){
  const j=findJob(jobId); if(!j) return;
  const u=window.dashUser||{}; const who=u.display_name||u.username||'Console';
  if(!confirm(`Delete job order ${jobId} (${j.subscriber||''})?\n\nIt will be hidden from the Dispatch Board and Timeline. The history stays in the records.\n\nOK = Delete   ·   Cancel = Keep`)) return;
  j.history=appendHistory(j.history,`🗑 Deleted by ${who} (status was: ${statusLabel(j.status||'')})`);
  j.deleted_at=new Date().toISOString(); j.deleted_by=who;
  if(window.AHBASync) window.AHBASync(j);            // persist the soft-delete + history to cloud
  jobs=jobs.filter(x=>x.id!==jobId);                  // remove from the in-memory working set now
  save(); closeModals();
  renderJobs(); if($('#timelinePage')?.classList.contains('active')) renderTimeline(); renderOverview();
  if($('#validationPage')?.classList.contains('active')) renderValidation&&renderValidation();
  showToast(`${jobId} deleted (recorded in history)`);
}
function updatePriority(jobId,p){
  const j=findJob(jobId); if(!j||!p||j.priority===p)return;
  j.priority=p; j.history=appendHistory(j.history,`Priority → ${p} (by Dispatcher)`);
  save(); renderJobs(); if($('#historyPage')?.classList.contains('active'))renderHistory(); showToast(`${jobId} priority → ${p}`);
  if(window.AHBASync) window.AHBASync(j);
}
function applyStatusUpdate(jobId,choice){
  const j=findJob(jobId); if(!j)return;
  if(choice==='completed'){ j.status='completed'; j.completed_at=new Date().toISOString(); }
  else if(choice==='cancelled') j.status='cancelled';
  else if(choice==='incomplete'){ j.status='negative'; j.negative_at=new Date().toISOString(); }  // stays in the Incomplete bar (keeps its team)
  else { j.status='pending'; j.team=null; j.scheduled_at=null; j.load_date=manilaToday(); }  // re-dispatch → CURRENT For Dispatch (today)
  const label={completed:'Completed',incomplete:'Incomplete',redispatch:'Re-dispatch → For Dispatch',cancelled:'Cancelled'}[choice];
  j.history=appendHistory(j.history, `Status → ${label} (by Dispatcher)`);
  j.updatedAt=new Date().toISOString();
  save(); closeModals(); if($('#historyPage')?.classList.contains('active'))renderHistory(); showToast(`${jobId}: ${label}`);
  if(window.AHBASync) window.AHBASync(j);
  // If moved to For Dispatch while viewing a PAST date, jump to today's live view so it shows up.
  if(choice!=='completed'&&choice!=='incomplete'&&choice!=='cancelled'&&dashHist){ exitHistToToday(); } else { renderJobs(); if($('#timelinePage')?.classList.contains('active'))renderTimeline(); }
}
// Leave the previous-date (read-only) view and return to today's live Dashboard.
function exitHistToToday(){
  dashHist=null; dashViewDate=null;
  const dEl=$('#tlDate'); if(dEl) dEl.value=manilaToday();
  const note=$('#dashHistNote'); if(note) note.style.display='none';
  renderJobs(); if($('#timelinePage')?.classList.contains('active')) renderTimeline();
}
function wireDispatchDnD(){
  $$('#dispatchBoard .job-card[data-detail]').forEach(c=>c.onclick=e=>{ if(e.target.closest('button'))return; openJobDetail(c.dataset.detail); });
  $$('#dispatchBoard [data-unassign]').forEach(b=>b.onclick=()=>unassignJob(b.dataset.unassign));
  $$('#dispatchBoard [data-jobid]').forEach(card=>{
    card.ondragstart=e=>{e.dataTransfer.setData('text/plain',card.dataset.jobid);e.dataTransfer.effectAllowed='move';card.style.opacity='.45'};
    card.ondragend=()=>{card.style.opacity=''};
  });
  $$('#dispatchBoard [data-drop="pending"]').forEach(col=>{
    col.ondragover=e=>{e.preventDefault();col.classList.add('drop-hover')};
    col.ondragleave=()=>col.classList.remove('drop-hover');
    col.ondrop=e=>{e.preventDefault();col.classList.remove('drop-hover');const id=e.dataTransfer.getData('text/plain');if(id)unassignJob(id)};
  });
}
function jobCard(j){
  const canBounce=['assigned','en-route','negative'].includes(j.status);
  const drag=canBounce?` draggable="true" data-jobid="${j.id}"`:'';
  const prio=j.priority?`<span class="priority" style="${j.priority!=='1st Load'?'color:#687974;background:#f1f3f1':''}">${j.priority}</span>`:'';
  const dc=j.dispatch_count||0;
  const dcBadge=dc>0?`<span class="redispatch dc${Math.min(dc,5)}" title="Dispatched ${dc}x">⟳ ×${dc}</span>`:'';
  const enc=j.created_at?fmtWhen(j.created_at):(j.load_date?String(j.load_date).slice(0,10):'—');
  const action=j.status==='pending'
    ? `<button class="assign-btn" data-assign="${j.id}" style="margin-top:8px;width:100%">Assign team</button>`
    : canBounce
      ? `<button class="assign-btn" data-unassign="${j.id}" title="Return to For Dispatch" style="margin-top:8px;width:100%">${j.status==='negative'?'↩ For Dispatch (1st Load)':'↩ For Dispatch'}</button>`
      : '';
  const s=j.team?(shiftByTeam[j.team]||{}):{};
  const acct=j.work_account||s.account;
  const crew=[j.crew_driver||s.driver, j.crew_tech1||s.tech1, j.crew_tech2||s.tech2].filter(Boolean).join(', ');
  const acctLine=acct?`<span>🚐 ${acct}</span>`:'';
  const crewLine=crew?`<span>👤 ${crew}</span>`:'';
  return `<article class="job-card compact" data-detail="${j.id}" data-name="${(j.subscriber||'').toLowerCase().replace(/"/g,'')}"${drag}>
    <div class="job-top"><span class="job-id">${j.id}</span><span style="display:flex;gap:5px;align-items:center">${dcBadge}${prio}</span></div>
    <h3>${esc(j.subscriber||'—')}</h3>
    <div class="jc-meta">
      <span><span class="status ${j.status}">${statusLabel(j.status)}</span></span>
      <span>👥 ${j.team||'Unassigned'}</span>
      ${acctLine}${crewLine}
      <span>🕒 ${enc}</span>
    </div>${action}</article>`;
}
function renderTeams(filter=''){
  $('#teamGrid').innerHTML=teams.filter(t=>(t.name+t.area+t.code).toLowerCase().includes(filter.toLowerCase())).map(t=>{
    const s=shiftByTeam[t.code]||{};
    const online=!!s.online;
    const crew=teamCrew(t.code);
    const todayJobs=jobs.filter(j=>j.team===t.code).length;
    const cardStyle=online?'style="cursor:pointer;background:#e9f9f0;border:1px solid #a8e6c9"':'style="cursor:pointer"';
    const vchip=teamCounted(t.code)?' <span class="status completed">✓ Deployed</span>':(online?' <span class="status pending">Pending</span>':'');
    const badge=(online?'<span class="status en-route">● Online</span>':'<span class="status offline">Offline</span>')+vchip;
    const acctLine=online&&s.account?`<div class="team-info"><span>Account<strong>${s.account}</strong></span><span>Crew<strong>${crew||'—'}</strong></span></div>`:'';
    return `<article class="team-card" data-team="${t.code}" ${cardStyle}><div class="team-card-head"><span class="team-avatar" style="background:${online?'#18a57b':t.color}">${t.short}</span><div><h3>${t.name}</h3><p>${online?'On shift':'Not signed in'} · ${t.area}</p></div></div>${badge}<div class="load-row"><span>Today’s load</span><b>${todayJobs} jobs</b></div><div class="load-bar"><span style="width:${Math.min(todayJobs/5*100,100)}%"></span></div>${acctLine}</article>`;
  }).join('')||'<div class="empty-row">No teams match your search.</div>';
  $$('#teamGrid [data-team]').forEach(c=>c.onclick=()=>openTeamDetail(c.dataset.team));
}
function openTeamDetail(code){
  const t=teams.find(x=>x.code===code)||{code}; const s=shiftByTeam[code]||{};
  const online=!!s.online;
  const teamJobs=jobs.filter(j=>j.team===code);
  const F=(l,v)=>`<div><b>${l}</b>${v||'—'}</div>`;
  $('#tdTitle').textContent=code;
  $('#tdSub').textContent=online?('On shift since '+(s.time_in?fmtWhen(s.time_in):'—')):'Not signed in today';
  $('#tdInfo').innerHTML=[
    F('Status',online?'Online (on shift)':'Offline'),
    F('Account in use',s.account),
    F('Driver',s.driver),
    F('Technician 1',s.tech1),
    F('Technician 2',s.tech2),
    F('Jobs today',teamJobs.length+''),
    F('Active now',teamJobs.filter(j=>['assigned','en-route','on-site','in-progress'].includes(j.status)).map(j=>j.id).join(', ')),
    F('Completed today',teamJobs.filter(j=>j.status==='completed').length+''),
    F('Load activity',teamHasActivity(code)?'Has updated a load ✓':'No load update yet'),
    F('Dispatcher verification',s.verified?'Verified deployed ✓':'Not verified'),
    F('Verified by',s.verified?(s.verified_by||'—'):'—'),
    F('Verified at',s.verified&&s.verified_at?fmtWhen(s.verified_at):'—'),
    F('Counted in expenses',teamCounted(code)?'Yes':'Not yet')
  ].join('');
  const vb=$('#tdVerify');
  if(vb){
    const signedIn=!!shiftByTeam[code];
    vb.style.display=signedIn?'':'none';
    vb.textContent=s.verified?'✓ Verified — tap to remove':'Verify as deployed';
    vb.onclick=()=>verifyTeamDeployed(code,!s.verified);
  }
  const locEl=$('#tdLocEdit');
  if(locEl){
    const dOpt=cur=>[1,2,3,4,5,6].map(d=>`<option value="${d}" ${String(cur)===String(d)?'selected':''}>District ${d}</option>`).join('');
    const pick=(cur,arr)=>arr.map(x=>`<option ${cur===x?'selected':''}>${x}</option>`).join('');
    const fld=(id,label,opts)=>`<label class="field" style="margin:0"><span>${label}</span><select id="${id}">${opts}</select></label>`;
    locEl.innerHTML=`<div class="form-grid" style="padding:0;grid-template-columns:1fr 1fr;gap:10px">
      ${fld('tdLocCity','City','<option selected>Quezon City</option>')}
      ${fld('tdLocDistrict','District','<option value="">—</option>'+dOpt(t.loc_district))}
      ${fld('tdLocTeam','Team','<option value="">—</option>'+pick(t.loc_team,['SLI','SLR','OSP']))}
      ${fld('tdLocUnit','Type','<option value="">—</option>'+pick(t.loc_unit,['SDU','MDU']))}
    </div><button type="button" class="primary-btn" id="tdLocSave" style="width:auto;padding:0 18px;margin-top:8px;height:36px">Save location</button>`;
    const cityEl=$('#tdLocCity'); if(cityEl) cityEl.disabled=true;   // Quezon City only
    const sv=$('#tdLocSave'); if(sv) sv.onclick=()=>saveTeamLocation(code);
  }
  loadTeamTrack(code); loadTeamChat(code); loadTeamGate(code);
  const sb=$('#tdChatSend'), inp=$('#tdChatInput');
  if(sb){ sb.onclick=()=>sendTeamChat(code); }
  if(inp){ inp.value=''; inp.onkeydown=e=>{ if(e.key==='Enter') sendTeamChat(code); }; }
  openModal($('#teamDetailModal'));
}
async function loadTeamGate(code){
  const el=$('#tdGate'); if(!el)return; el.innerHTML='Loading…';
  const date=manilaToday();
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/gate_logs?select=*&team=eq.${encodeURIComponent(code)}&work_date=eq.${date}&order=checked_at.desc&limit=1`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const g=(r.ok?await r.json():[])[0];
    if(!g){ el.innerHTML='<span style="color:#b97a16">⏳ Not yet validated by Security today.</span>'; return; }
    const crew=[g.crew_driver,g.crew_tech1,g.crew_tech2].filter(Boolean).join(', ');
    el.innerHTML=`<div style="display:grid;gap:3px">
      <div><b style="color:#11825f">✓ Gate-out validated</b> · ${fmtWhen(g.checked_at)}</div>
      <div>🚐 Plate: <b>${g.plate_no||'—'}</b> · Odometer: <b>${g.odometer!=null?g.odometer+' km':'—'}</b></div>
      <div>👤 Crew: ${crew||'—'} ${g.crew_ok?'<span class="status completed" style="font-size:7px">crew OK</span>':'<span class="status pending" style="font-size:7px">discrepancy</span>'}</div>
      ${g.crew_remarks?`<div style="color:#c2503a">Remarks: ${g.crew_remarks}</div>`:''}
      <div style="color:#9aa6a2">Validated by ${g.security_user||'Security'}</div>
    </div>`;
  }catch(e){ el.innerHTML='<span style="color:#c2503a">Could not load gate-out.</span>'; }
}
async function loadTeamTrack(code){
  const el=$('#tdTrack'); if(!el)return; el.innerHTML='Loading…';
  const date=manilaToday();
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/location_history?select=lat,lng,area,reason,created_at&username=eq.${encodeURIComponent(code)}&work_date=eq.${date}&order=created_at.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    if(!rows.length){ el.innerHTML='<span style="color:#9aa6a2">No location trail recorded today.</span>'; return; }
    el.innerHTML=rows.map(p=>{
      const t=fmtTime(p.created_at); const place=p.area||(p.lat!=null?`${(+p.lat).toFixed(4)}, ${(+p.lng).toFixed(4)}`:'—');
      const r2=(p.reason||'auto').replace('status:','• ');
      const maps=p.lat!=null?` · <a href="https://maps.google.com/?q=${p.lat},${p.lng}" target="_blank" rel="noopener" style="color:#178262">map</a>`:'';
      return `<div style="border-bottom:1px dashed #eef1ed;padding:5px 0"><b>${t}</b> — ${place} <span style="color:#9aa6a2">${r2}</span>${maps}</div>`;
    }).join('');
  }catch(e){ el.innerHTML='<span style="color:#c2503a">Could not load travel history.</span>'; }
}
async function loadTeamChat(code){
  const el=$('#tdChat'); if(!el)return; el.innerHTML='Loading…';
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/team_messages?select=*&team=eq.${encodeURIComponent(code)}&order=created_at.asc&limit=200`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    el.innerHTML=rows.length?rows.map(m=>{
      const disp=m.role==='dispatch';
      return `<div style="align-self:${disp?'flex-end':'flex-start'};max-width:82%"><div style="background:${disp?'#18a57b':'#fff'};color:${disp?'#fff':'#26352f'};border:1px solid ${disp?'#18a57b':'#e3e8e2'};padding:7px 10px;border-radius:11px;font-size:12px">${(m.body||'').replace(/</g,'&lt;')}</div><div style="font-size:8px;color:#9aa6a2;margin-top:2px;text-align:${disp?'right':'left'}">${disp?(m.sender||'Dispatcher'):(m.sender||code)} · ${fmtWhen(m.created_at)}</div></div>`;
    }).join(''):'<span style="color:#9aa6a2;font-size:11px">No messages yet. Send an instruction to this team.</span>';
    el.scrollTop=el.scrollHeight;
  }catch(e){ el.innerHTML='<span style="color:#c2503a">Could not load messages.</span>'; }
}
async function sendTeamChat(code){
  const inp=$('#tdChatInput'); const v=(inp.value||'').trim(); if(!v)return; inp.value='';
  const who=(window.dashUser&&(window.dashUser.display_name||window.dashUser.username))||'Dispatcher';
  try{
    await fetch(`${SUPA_URL}/rest/v1/team_messages`,{method:'POST',headers:DH(),body:JSON.stringify({team:code,sender:who,role:'dispatch',body:v})});
    pushNotify({team:code,title:'Message from Dispatch',body:v});
    loadTeamChat(code);
  }catch(e){ showToast('Send failed'); }
}
const PER_HEAD=955;       // bawat driver / technician na naka-declare sa Start shift
const GAS_PER_TEAM=400;   // gasolina kada na-deploy na team
const CONSOLE_COST=1415;  // per dashboard user who logged in today
async function renderExpenses(){
  const dEl=$('#expDate'); if(dEl&&!dEl.value){dEl.value=manilaToday();dEl.onchange=renderExpenses;}
  const date=dEl&&dEl.value?dEl.value:manilaToday(), H={apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()};
  let cloudExp=[], att=[];
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/expenses?select=*&work_date=eq.${date}&order=created_at.desc`,{headers:H}); cloudExp=r.ok?await r.json():[]; }catch(e){}
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/attendance?select=username,crew_driver,crew_tech1,crew_tech2,time_in&work_date=eq.${date}&order=time_in.desc`,{headers:H}); att=r.ok?await r.json():[]; }catch(e){}
  // Dashboard (console) users who logged in today × ₱1,415
  let dashUsers=[]; try{ const r=await fetch(`${SUPA_URL}/rest/v1/dashboard_users?select=username,last_login`,{headers:H}); dashUsers=r.ok?await r.json():[]; }catch(e){}
  const consoleUsers=dashUsers.filter(u=>u.last_login && new Date(u.last_login).toLocaleDateString('en-CA',{timeZone:TZ})===date).length;
  const consoleCost=consoleUsers*CONSOLE_COST;
  // one shift row per team; cost from the crew they declared at Start shift
  const byTeam={}; att.forEach(a=>{ if(/^AHBA_SLI/i.test(a.username)&&!byTeam[a.username]) byTeam[a.username]=a; });
  let heads=0, deployedTeams=0, loggedInTeams=0, pendingTeams=0;
  Object.values(byTeam).forEach(a=>{
    loggedInTeams++;
    const c=[a.crew_driver,a.crew_tech1,a.crew_tech2].filter(Boolean).length;
    const counted = (a.deployed_verified===true) || teamHasActivity(a.username);   // moved a load OR dispatcher-verified
    if(counted && c>0){ heads+=c; deployedTeams++; } else { pendingTeams++; }
  });
  const manpowerCost=heads*PER_HEAD;
  const gasCost=deployedTeams*GAS_PER_TEAM;
  const deployCost=manpowerCost+gasCost;
  const submitted=cloudExp.reduce((a,b)=>a+Number(b.amount||0),0);
  const total=deployCost+consoleCost+submitted, BUDGET=50000, pct=Math.round(total/BUDGET*100);
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  set('#todayExpense',money(total)); set('#budgetPercent',`${pct}% of ${money(BUDGET)}`); set('#donutTotal',`₱${(total/1000).toFixed(1)}k`);
  if($('#budgetBar'))$('#budgetBar').style.width=`${Math.min(pct,100)}%`;

  const cats=['Deployment','Console','Permit','Gas','Parking','Violation','Other'];
  const cols=['#082c28','#6a5acd','#18a57b','#ff765f','#e9a93d','#4285f4','#b0bab7'];
  const values=cats.map(c=> c==='Deployment'? deployCost : c==='Console'? consoleCost : cloudExp.filter(e=>e.category===c).reduce((a,b)=>a+Number(b.amount||0),0));
  const sum=values.reduce((a,b)=>a+b,0)||1; let acc=0;
  const stops=values.map((v,i)=>{const s=acc;acc+=v/sum*100;return `${cols[i]} ${s}% ${acc}%`}).join(',');
  if($('#expenseDonut'))$('#expenseDonut').style.background=`conic-gradient(${stops})`;
  if($('#expenseLegend'))$('#expenseLegend').innerHTML=cats.map((c,i)=>`<div class="legend-row"><i style="background:${cols[i]}"></i><span>${c}</span><b>${money(values[i])}</b></div>`).join('');
  if($('#categoryList'))$('#categoryList').innerHTML=cats.map((c,i)=>`<div class="category-row"><div class="category-top"><span>${c}</span><b>${money(values[i])}</b></div><div class="category-bar"><span style="width:${values[i]/Math.max(...values,1)*100}%;background:${cols[i]}"></span></div></div>`).join('');
  if($('#expenseBody')){
    const manpowerRow=`<tr><td>—</td><td><strong>${deployedTeams} teams · ${heads} crew</strong></td><td>Deployment</td><td>Manpower — ${heads} declared crew × ₱${PER_HEAD.toLocaleString('en-PH')} (driver/technician)</td><td>—</td><td><strong>${money(manpowerCost)}</strong></td><td><span class="status completed">Auto</span></td></tr>`;
    const gasRow=`<tr><td>—</td><td><strong>${deployedTeams} teams deployed</strong></td><td>Gas</td><td>Gasoline — ${deployedTeams} deployed teams × ₱${GAS_PER_TEAM.toLocaleString('en-PH')}</td><td>—</td><td><strong>${money(gasCost)}</strong></td><td><span class="status completed">Auto</span></td></tr>`;
    const consoleRow=`<tr><td>—</td><td><strong>${consoleUsers} console login(s)</strong></td><td>Console</td><td>Dashboard access — ${consoleUsers} user(s) logged in today × ₱${CONSOLE_COST.toLocaleString('en-PH')}</td><td>—</td><td><strong>${money(consoleCost)}</strong></td><td><span class="status completed">Auto</span></td></tr>`;
    const pendingRow=pendingTeams?`<tr style="opacity:.7"><td>—</td><td><strong>${pendingTeams} team(s)</strong></td><td>Deployment</td><td>Logged in but not yet counted — no load activity / awaiting dispatcher verification</td><td>—</td><td><strong>${money(0)}</strong></td><td><span class="status pending">Pending</span></td></tr>`:'';
    const expRows=cloudExp.map(e=>`<tr><td>${e.created_at?fmtTime(e.created_at):''}</td><td><strong>${esc(e.team||'—')}</strong></td><td>${esc(e.category||'')}</td><td>${esc(e.description||'')}</td><td>${e.job_id||'—'}</td><td><strong>${money(e.amount)}</strong></td><td><span class="status ${e.status==='Approved'?'completed':'pending'}">${e.status||'Pending'}</span></td></tr>`).join('');
    $('#expenseBody').innerHTML=manpowerRow+gasRow+consoleRow+pendingRow+expRows;
  }
  if($('#expenseSummary'))$('#expenseSummary').innerHTML=[
    ['Today’s total',money(total)],['Manpower (crew × ₱955)',money(manpowerCost)],['Gasoline (teams × ₱400)',money(gasCost)],['Console (users × ₱1,415)',money(consoleCost)]
  ].map(([l,v])=>`<div class="small-stat"><span>${l}</span><strong>${v}</strong></div>`).join('');
  const week=[14200,19800,17650,22100,15800,20400,total],days=['Thu','Fri','Sat','Sun','Mon','Tue','Today'];
  if($('#weeklyChart'))$('#weeklyChart').innerHTML=week.map((v,i)=>`<div class="bar-col ${i===6?'today':''}"><span style="height:${v/Math.max(...week,1)*100}%" title="${money(v)}"></span><b>${days[i]}</b></div>`).join('');
}
function bindAssignButtons(){$$('[data-assign]').forEach(b=>b.onclick=()=>openAssign(b.dataset.assign))}

// Work-order table filtering (search text + active chip combined)
function applyJobTableFilter(){
  const chip=$('#jobFilters .active'), f=chip?chip.dataset.filter:'all';
  const q=($('#jobSearch')?.value||'').toLowerCase().trim();
  let shown=0;
  $$('#workOrderBody tr').forEach(r=>{
    const matchesChip = f==='all' || (f==='pending'?r.dataset.status==='pending':r.dataset.type===f);
    const matchesText = !q || r.dataset.text.includes(q);
    const show=matchesChip&&matchesText;
    r.style.display=show?'':'none';
    if(show) shown++;
  });
  const empty=$('#workOrderEmpty'); if(empty) empty.hidden=shown!==0;
}

// ---------- Dispatch Timeline (Gantt: teams × hours, drag-to-schedule, live status) ----------
const TL_START=8, TL_END=21;                 // 8 AM – 9 PM
const TL_HOURS=TL_END-TL_START;              // 13 hourly columns
const TL_DEFMIN=90;                          // default Job Order duration: 1 hr 30 mins
const tlDayStr=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:TZ});
// Historical End-of-Day view: when a PAST date is picked on the Dashboard, both the Teams
// timeline and the Dispatch Board render from that day's saved snapshot (read-only).
let dashHist=null;       // null = live (today); else = array of snapshot job objects
let dashViewDate=null;   // the selected past date string (YYYY-MM-DD)
async function onDashDateChange(){
  const dEl=$('#tlDate'); const date=dEl?dEl.value:manilaToday();
  if(!date||date===manilaToday()){ dashHist=null; dashViewDate=null; }
  else {
    try{ const r=await fetch(`${SUPA_URL}/rest/v1/daily_snapshots?work_date=eq.${encodeURIComponent(date)}&select=*`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
      const rows=r.ok?await r.json():[]; const snap=rows[0];
      dashHist=(snap&&snap.data&&Array.isArray(snap.data.jobs))?snap.data.jobs:[]; dashViewDate=date;
    }catch(e){ dashHist=[]; dashViewDate=date; }
  }
  const note=$('#dashHistNote');
  if(note){ if(dashHist){ note.style.display=''; note.textContent=`📅 Viewing END-OF-DAY snapshot for ${dashViewDate} (read-only). Select today for the live view.`; } else note.style.display='none'; }
  renderTimeline(); renderJobs();
}
function tlStatusColor(s){
  const m={pending:['#fff','#56655f','#d4dcd5'],assigned:['#eaf1ff','#0c447c','#b5d4f4'],acknowledged:['#eaf1ff','#0c447c','#b5d4f4'],
    'en-route':['#f0ebff','#5b3aa6','#cecbf6'],travel:['#f0ebff','#5b3aa6','#cecbf6'],'on-site':['#fff4cf','#7a5e0c','#fac775'],
    'in-progress':['#fff4cf','#7a5e0c','#fac775'],completed:['#e7f7ef','#0b5e44','#9fe1cb'],negative:['#fdecea','#a32d2d','#f7c1c1'],
    incomplete:['#fdecea','#a32d2d','#f7c1c1'],cancelled:['#f2f2f2','#6b6f6d','#d3d1c7']}[s]||['#eef1ed','#444','#ddd'];
  return {bg:m[0],fg:m[1],bd:m[2]};
}
function tlFmtHour(h){ const hh=Math.floor(h),mm=Math.round((h-hh)*60); const ap=hh<12?'AM':'PM'; const h12=((hh+11)%12)+1; return `${h12}:${String(mm).padStart(2,'0')} ${ap}`; }
// Dashboard sub-view: 'teams' = team timeline (monitor teams + their loads); 'loads' = dispatch board (monitor loads).
function setDashView(view){
  const teams=$('#dashTeamsView'), loads=$('#dashLoadsView');
  const showLoads=view==='loads';
  if(teams) teams.hidden=showLoads; if(loads) loads.hidden=!showLoads;
  $$('#dashViewTabs [data-dashview]').forEach(b=>b.classList.toggle('active',b.dataset.dashview===view));
  if(showLoads) renderJobs(); else renderTimeline();
}
// Status-bar filter: click a status chip to show ONLY that status on the Gantt; '' = Total (show all).
let tlStatusFilter='';
function setTlStatusFilter(b){ tlStatusFilter=(tlStatusFilter===b)?'':b; renderTimeline(); }
// Dashboard filters (For Dispatch + Teams Timeline): Load Type · District · Barangay.
// Org scope (who ENCODED the load, via org_id). Reused by every Dashboard surface so the
// picker scopes the whole view, not just the For-Dispatch backlog.
//   ""            → AHBA + MSA-SLI (all)
//   gcOrgId       → AHBA (GC only)
//   "__subcons__" → all subcontractor-encoded loads
//   <orgId>       → one subcontractor
function tlPassOrg(j){
  const og=($('#tlfOrg')&&$('#tlfOrg').value)||'';
  if(!og) return true;
  if(og==='__subcons__') return !!(j.org_id && j.org_id!==gcOrgId);
  return String(j.org_id||'')===og;
}
function tlPassFilter(j){
  if(!tlPassOrg(j)) return false;   // org scope (backlog also honors Type/District/Brgy below)
  const ty=($('#tlfType')&&$('#tlfType').value)||'';
  const di=($('#tlfDistrict')&&$('#tlfDistrict').value)||'';
  const br=($('#tlfBrgy')&&$('#tlfBrgy').value)||'';
  if(ty && (j.load_type||'SLI')!==ty) return false;
  if(di && String(j.district||'')!==di) return false;
  if(br && (j.brgy||'')!==br) return false;
  return true;
}
// Org directory + which one is the GC. Loaded once after login; RLS returns only the orgs the user sees.
let orgById={}, gcOrgId='';
async function loadOrgMap(){
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/orgs?select=id,code,name&order=code.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    (r.ok?await r.json():[]).forEach(o=>{ orgById[o.id]={code:o.code,name:o.name}; if(o.code==='AHBA') gcOrgId=o.id; });
  }catch(e){}
  try{ tlBuildOrgFilter(); }catch(e){}
}
// GC-only "For Dispatch" org picker — shown ONLY when the user can SEE >1 org (i.e. the GC dispatcher).
// Options: "AHBA + MSA-SLI" (all) · "AHBA" (GC only) · "MSA - SLI" (all subcons only) · each subcon by name.
function tlBuildOrgFilter(){
  const sel=$('#tlfOrg'); if(!sel) return;
  const ids=Object.keys(orgById);
  if(ids.length<2){ sel.style.display='none'; sel.value=''; return; }
  const cur=sel.value;
  const subs=ids.filter(id=>id!==gcOrgId).sort((a,b)=>String(orgById[a].name||'').localeCompare(String(orgById[b].name||'')));
  let opts='<option value="">AHBA + MSA-SLI</option>';
  if(gcOrgId) opts+=`<option value="${gcOrgId}">AHBA</option>`;
  if(subs.length) opts+='<option value="__subcons__">MSA - SLI</option>';
  opts+=subs.map(id=>`<option value="${id}">${esc(orgById[id].name||orgById[id].code)}</option>`).join('');
  sel.innerHTML=opts;
  const valid=['','__subcons__',gcOrgId].concat(subs);
  sel.value=valid.includes(cur)?cur:'';
  sel.style.display='';
}
function tlBuildFilterOptions(pool){
  const dsel=$('#tlfDistrict'), bsel=$('#tlfBrgy');
  if(dsel){ const cur=dsel.value; const ds=[...new Set(pool.map(j=>String(j.district||'')).filter(Boolean))].sort();
    dsel.innerHTML='<option value="">All districts</option>'+ds.map(d=>`<option ${d===cur?'selected':''}>${d}</option>`).join(''); if(!ds.includes(cur)) dsel.value=''; }
  if(bsel){ const cur=bsel.value; const di=dsel?dsel.value:''; const bs=[...new Set(pool.filter(j=>!di||String(j.district||'')===di).map(j=>(j.brgy||'')).filter(Boolean))].sort();
    bsel.innerHTML='<option value="">All barangays</option>'+bs.map(b=>`<option ${b===cur?'selected':''}>${(b||'').replace(/</g,'&lt;')}</option>`).join(''); if(!bs.includes(cur)) bsel.value=''; }
}
function renderTimeline(){
  const dEl=$('#tlDate'); if(dEl){ if(!dEl.value) dEl.value=manilaToday(); dEl.onchange=onDashDateChange; }
  const date=dEl?dEl.value:manilaToday();
  const hist=!!dashHist, SRC=hist?dashHist:jobs;
  // Same dynamics as the Dispatch Board: For Dispatch = today's WORKING SET (load_date today
  // or none). Leftover loads from previous days only appear here AFTER the dispatcher/superadmin
  // confirms the end-of-day rollover — which we prompt for here too.
  if(!hist) maybePromptRollover();
  const loadToday=d=>!d || String(d).slice(0,10)===(hist?date:manilaToday());
  // Pull online status + newly-created technicians, then re-render (live only).
  if(!hist) Promise.all([loadTeamShifts().catch(()=>{}),syncTeamsFromDb().catch(()=>0),loadAgentNames().catch(()=>{})]).then(([,added])=>{ const sig=JSON.stringify(shiftByTeam)+JSON.stringify(agentNames); if(added||sig!==renderTimeline._sig){ renderTimeline._sig=sig; renderTimeline(); } });
  // Build filter dropdowns (Load Type · District · Brgy) from the day's loads, then filter the view.
  const tlDayStr2=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:TZ});
  const inDayPool=SRC.filter(j=>{ const st=(j.status||'').toLowerCase();
    if(st==='pending'&&!j.scheduled_at) return loadToday(j.load_date);
    if(j.team){ if(hist) return true; if(j.scheduled_at&&tlDayStr2(j.scheduled_at)===date) return true; if(date!==manilaToday()) return false; if(st==='completed'||st==='cancelled') return finishedDay(j)===manilaToday(); return loadToday(j.load_date); }
    return false; });
  tlBuildFilterOptions(inDayPool);
  // NOTE: the org picker is built ONCE by loadOrgMap() after login — NOT on every render.
  // Rebuilding it here clobbered the user's selection (it snapped back to "AHBA + MSA-SLI"
  // whenever the 15s auto-refresh re-rendered the timeline mid-interaction).
  // Backlog: ALL for-dispatch loads in the day's working set, not yet placed on the timeline —
  // PRIORITIZED by how many times dispatched (most-redispatched first), then High priority, then JO id.
  const prio=p=>p==='High'?0:p==='Low'?2:1;
  const backlog=SRC.filter(j=>j.status==='pending' && !j.scheduled_at && loadToday(j.load_date) && tlPassFilter(j))
    .sort((a,b)=>(b.dispatch_count||0)-(a.dispatch_count||0)||prio(a.priority)-prio(b.priority)||String(a.id).localeCompare(String(b.id)));
  const bl=$('#tlBacklog');
  // Status-bar filter: when a non-"For Dispatch" status is selected, hide the backlog (it IS For Dispatch).
  const showBacklog = !tlStatusFilter || tlStatusFilter==='fordispatch';
  if(bl){
    bl.innerHTML=(showBacklog&&backlog.length)?backlog.map(j=>{const dc=Number(j.dispatch_count)||0;const dcb=`<span class="redispatch dc${dc===0?'0':Math.min(dc,5)}" style="font-size:8px;padding:1px 5px;flex:none" title="${dc===0?'Not yet dispatched':'Dispatched '+dc+'x'}">⟳${dc}x</span>`;const sub=(j.subscriber||'(no name)').replace(/</g,'&lt;').slice(0,22);const jo=(j.job_order_no||'No J.O. #').replace(/</g,'&lt;').slice(0,18);const by=tlBy(j).replace(/</g,'&lt;').slice(0,34);return `<span class="tl-chip" draggable="true" data-tljob="${j.id}" data-tlsearch="${tlSearchText(j)}"><div class="tl-chip-body"><b class="tl-chip-sub">${sub}</b><span class="tl-chip-jo">J.O. ${jo}</span><span class="tl-chip-by">Agent: ${by}</span></div>${dcb}</span>`;}).join(''):`<span style="color:#9aa6a2;font-size:11px">${showBacklog?'No waiting unscheduled load.':'(For Dispatch hidden — '+tlStatusFilter+' selected)'}</span>`;
  }
  // Clicksoft-style status history feed
  renderTimelineHistory();
  // Daily productivity snapshot panel (only refresh when viewing today, to avoid re-fetching past days)
  if(!$('#tlProdDate')||!$('#tlProdDate').value||$('#tlProdDate').value===manilaToday()) renderProductivityHistory();
  // Collect EXACTLY the loads shown on the timeline so the status banner always matches
  // what's displayed (backlog + every team's blocks, incl. completed-today by the team).
  const shownJobs=backlog.slice();
  const hourHdr=Array.from({length:TL_HOURS}).map((_,i)=>{ const h=TL_START+i; const ap=h<12?'AM':'PM'; const h12=((h+11)%12)+1; return `<div class="tl-h">${h12} ${ap}</div>`; }).join('');
  let html=`<div class="tl-headrow"><div class="tl-team-h">Team</div><div class="tl-axis">${hourHdr}</div></div>`;
  teams.forEach(t=>{
    const s=shiftByTeam[t.code]||{};
    const dot=s.online?'#18a57b':'#b0bab7';
    // Full daily view per team — ALL statuses (Acknowledged, Travel, On-Site, Incomplete,
    // Completed, Cancelled), so the Timeline mirrors the Dispatch Board exactly and can replace it.
    const isTodayUpd=d=>d && tlDayStr(d)===manilaToday();
    const dayJobs=SRC.filter(j=>{
      if(j.team!==t.code) return false;
      // NOTE: the Load Type / District / Brgy filter applies to the For Dispatch backlog ONLY —
      // the team Gantt rows always show the full assigned set (they don't move when filtering).
      if(hist) return true;                                                     // snapshot = that day's EOD set
      const st=(j.status||'').toLowerCase();
      if(j.scheduled_at && tlDayStr(j.scheduled_at)===date) return true;        // scheduled for this day
      if(date!==manilaToday()) return false;                                    // past/future days: scheduled only
      if(st==='completed'||st==='cancelled') return finishedDay(j)===manilaToday();    // finished today
      return loadToday(j.load_date);                                            // active / incomplete working set
    }).filter(tlPassOrg);   // org scope applies to team rows too (org only — not Type/District/Brgy)
    // When a specific org is selected, hide team rows that have no matching load (clean scoped view).
    const ogActive=!!(($('#tlfOrg')||{}).value);
    if(ogActive && !dayJobs.length) return;
    shownJobs.push(...dayJobs);   // full set for the status-bar counts
    // Status-bar filter: 'fordispatch' shows no team blocks; another status shows only that bucket.
    const drawJobs = !tlStatusFilter ? dayJobs : (tlStatusFilter==='fordispatch' ? [] : dayJobs.filter(j=>tlBucket(j.status)===tlStatusFilter));
    const laid=tlLayoutTeamJobs(drawJobs,date);
    const blocks=laid.map(({j,startMin,durMin,bumped})=>{
      const hh=startMin/60; const endMin=startMin+durMin;
      let left=((hh-TL_START)/TL_HOURS)*100; let w=((durMin/60)/TL_HOURS)*100;
      if(left+w<=0||left>=100) return '';
      if(left<0){ w+=left; left=0; } if(left+w>100) w=100-left; if(w<3.2) w=3.2;
      const c=tlStatusColor(j.status);
      const win=`${tlFmtHour(startMin/60)}–${tlFmtHour(endMin/60)}`;
      const mark=bumped?'↪ ':'';
      return `<div class="tl-block${bumped?' tl-bumped':''}" draggable="true" data-tlblock="${j.id}" data-tlsearch="${tlSearchText(j)}" style="left:${left}%;width:${w}%;background:${c.bg};color:${c.fg};border:1px solid ${c.bd}" title="${mark}${j.id} · ${(j.subscriber||'').replace(/"/g,'&quot;')} · ${statusLabel(j.status)} · ${win} · Agent: ${tlBy(j).replace(/"/g,'&quot;')}${bumped?' (auto-moved after previous job ran long)':''}">${mark}${String(j.id).replace('WO-','')}<small>${(j.subscriber||'').replace(/</g,'&lt;').slice(0,16)}</small></div>`;
    }).join('');
    // Assigned account + designated driver / technician for this team's current shift
    const acct=s.account||t.account||'';
    const drv=s.driver||'', t1=s.tech1||'', t2=s.tech2||'';
    const esc=v=>String(v).replace(/</g,'&lt;');
    const acctLine=acct?`<span class="tl-acct">${esc(acct)}</span>`:'';
    const crew=[drv?`D: ${esc(drv)}`:'',[t1,t2].filter(Boolean).map(esc).join(', ')?`T: ${[t1,t2].filter(Boolean).map(esc).join(', ')}`:''].filter(Boolean).join(' · ');
    const crewLine=crew?`<span class="tl-crew">${crew}</span>`:(acct?'':'<span class="tl-crew" style="color:#b6c0bc">— not signed in —</span>');
    const loadCount=(tlStatusFilter?drawJobs.length:dayJobs.length);
    const cntBadge=loadCount?`<span class="tl-team-cnt" title="${loadCount} load(s) for this team">${loadCount}</span>`:'';
    html+=`<div class="tl-row"><div class="tl-team"><div class="tl-team-name"><span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;margin-right:6px;flex:none"></span>${t.code}${cntBadge}</div>${acctLine}${crewLine}</div><div class="tl-track" data-tlteam="${t.code}">${blocks}</div></div>`;
  });
  const g=$('#tlGrid'); if(g){ g.innerHTML=html; injectIcons(); if(hist){ $$('#tlGrid [data-tlblock]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); openJobDetail(b.dataset.tlblock); }); } else { wireTimelineDnD(date); } }
  // Status tally banner — full day's counts (stable), clickable to filter the Gantt by status.
  renderTimelineCounts(inDayPool.filter(tlPassOrg));   // counts + Excel export follow the org scope
  // Search box: highlight matching job orders (backlog + scheduled blocks)
  const sb=$('#tlSearch'); if(sb && !sb._wired){ sb._wired=true; sb.oninput=tlApplySearch; }
  tlApplySearch();
}
// Per-hour cascade layout for one team's jobs on a day. A Job Order eats time based on
// the team's actual update (start → completion / "now" if still running). If a JO runs
// long, the queued ones after it auto-move later so they never overlap.
// Default planned duration = 1 hr 30 mins (TL_DEFMIN).
function tlMinOfDay(ts){ if(!ts) return null; const d=new Date(ts); if(isNaN(d)) return null; return d.getHours()*60+d.getMinutes(); }
function tlLayoutTeamJobs(dayJobs,date){
  const isToday=date===manilaToday();
  const now=new Date(); const nowMin=now.getHours()*60+now.getMinutes();
  const keyOf=j=> j.scheduled_at?new Date(j.scheduled_at).getTime() : (j.updatedAt?new Date(j.updatedAt).getTime():0);
  const sorted=dayJobs.slice().sort((a,b)=>keyOf(a)-keyOf(b));
  const out=[]; let prevEnd=null;
  sorted.forEach(j=>{
    const planned=tlMinOfDay(j.scheduled_at);
    const stx=(j.status||'').toLowerCase();
    // Anchor: scheduled time if set; else finished loads sit at their update/completion time;
    // active loads with no preferred time start near "now" then queue up.
    let anchor=planned;
    if(anchor==null && (stx==='completed'||stx==='cancelled'||stx==='negative')){
      anchor=tlMinOfDay(j.completed_at); if(anchor==null && tlDayStr(j.updatedAt)===date) anchor=tlMinOfDay(j.updatedAt);
    }
    let startMin=anchor!=null?anchor:(isToday?Math.min(Math.max(nowMin,TL_START*60),(TL_END-1)*60):TL_START*60);
    let bumped=false;
    if(prevEnd!=null && startMin<prevEnd){ startMin=prevEnd; bumped=true; } // cascade after previous
    const st=(j.status||'').toLowerCase();
    // Work duration = the planned/estimated time per Job Order (default 1h30m). Kept UNIFORM and
    // capped so blocks stay clean and the per-team count is easy to read (no day-spanning bars).
    let dur=Number(j.est_minutes)||TL_DEFMIN;
    // For a COMPLETED load with a recorded completion time, use the real work time IF reasonable.
    if(st==='completed' && j.completed_at){
      const cm=tlMinOfDay(j.completed_at);
      if(cm!=null && cm>startMin) dur=cm-startMin;
    }
    dur=Math.max(30, Math.min(dur, 180));                    // 30 min floor · 3 h cap → clean layout
    out.push({j,startMin,durMin:dur,bumped});
    prevEnd=startMin+dur;
  });
  return out;
}
// Status tally banner — counts every load into the 7 dispatch buckets, colour-coded.
function tlBucket(s){
  s=(s||'').toLowerCase();
  if(s==='pending'||s==='unassigned'||s==='') return 'fordispatch';
  if(s==='assigned'||s==='acknowledged') return 'acknowledged';
  if(s==='en-route'||s==='travel') return 'travel';
  if(s==='on-site'||s==='in-progress') return 'onsite';
  if(s==='negative'||s==='incomplete') return 'incomplete';
  if(s==='completed') return 'completed';
  if(s==='offline'||s==='cancelled') return 'cancelled';
  return 'fordispatch';
}
function renderTimelineCounts(list){
  const el=$('#tlCounts'); if(!el) return;
  const defs=[
    ['fordispatch','For Dispatch','#fff','#56655f','#d4dcd5'],
    ['acknowledged','Acknowledged','#eaf1ff','#3473d8','#cfe0ff'],
    ['travel','Travel','#f0ebff','#7959c7','#ddd2f7'],
    ['onsite','On-site','#fff4cf','#9a7b12','#f0e2a6'],
    ['incomplete','Incomplete','#fdecea','#c2503a','#f6cfc8'],
    ['completed','Completed','#e7f7ef','#11825f','#c4ecd9'],
    ['cancelled','Cancelled','#f2f2f2','#87928f','#dcdfdd']
  ];
  // Count EXACTLY the loads currently shown on the timeline (passed in), de-duped by id —
  // so the banner always matches the teams' actual statuses (incl. completed-today).
  const todayLoads=[...new Map((list||[]).map(j=>[j.id,j])).values()];
  tlCountLoads=todayLoads;   // stored for the Excel export button (respects the active org/type/district filters)
  const cnt={}; defs.forEach(d=>cnt[d[0]]=0);
  todayLoads.forEach(j=>{ cnt[tlBucket(j.status)]++; });
  const total=todayLoads.length;
  el.innerHTML=defs.map(([k,label,bg,fg,bd])=>
    `<span class="tl-count${tlStatusFilter===k?' tl-count-on':''}" data-tlstatus="${k}" style="background:${bg};color:${fg};border:1px solid ${bd};cursor:pointer"><b>${cnt[k]}</b>${label}</span>`
  ).join('')+`<span class="tl-count tl-count-total${tlStatusFilter===''?' tl-count-on':''}" data-tlstatus="" style="cursor:pointer"><b>${total}</b>Total</span>`;
  $$('#tlCounts [data-tlstatus]').forEach(c=>c.onclick=()=>setTlStatusFilter(c.dataset.tlstatus));
}
// Export the loads reflected in the status counts (all statuses, respecting org/type/district filters) to Excel.
let tlCountLoads=[];
async function exportDispatchXlsx(){
  const rows=tlCountLoads||[];
  if(!rows.length){ showToast('No loads to export'); return; }
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  const stLabel={fordispatch:'For Dispatch',acknowledged:'Acknowledged',travel:'Travel',onsite:'On-site',incomplete:'Incomplete',completed:'Completed',cancelled:'Cancelled'};
  const orgName=id=>{ const o=orgById[id]; return o?(o.code==='AHBA'?'AHBA (GC)':o.code):''; };
  const out=rows.map(j=>({
    'JO NUMBER': j.job_order_no||'',
    'SUBSCRIBER': j.subscriber||'',
    'STATUS': stLabel[tlBucket(j.status)]||j.status||'',
    'TECH REMARKS': j.negative_remark||'',
    'TEAM': j.team||'',
    'AGENT': tlBy(j)||'',
    'ORG': orgName(j.org_id),
    'DISTRICT': j.district?('District '+j.district):'',
    'BARANGAY': j.brgy||'',
    'PRIORITY': j.priority||'',
    'PLAN': j.plan||'',
    'ADDRESS': j.address||j.area||'',
    'AMOUNT TO COLLECT': (j.amount_to_collect!=null?j.amount_to_collect:''),
    'JO DATE': j.load_date||'',
    'WO ID': j.id
  }));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), 'Dispatch');
  const date=($('#tlDate')&&$('#tlDate').value)||manilaToday();
  XLSX.writeFile(wb, `AHBA_dispatch_${date}.xlsx`);
  showToast(`Exported ${out.length} load(s) to Excel`);
}
// Clicksoft-style monitoring: a feed of today's loads with their full status progression.
function renderTimelineHistory(){
  const el=$('#tlHistory'); if(!el) return;
  const today=manilaToday();
  const encToday=j=>{ const t=j.created_at?new Date(j.created_at).toLocaleDateString('en-CA',{timeZone:TZ}):''; return t===today; };
  const loads=jobs.filter(encToday)
    .sort((a,b)=>new Date(b.updatedAt||b.created_at||0)-new Date(a.updatedAt||a.created_at||0));
  if(!loads.length){ el.innerHTML='<div class="empty-row">No loads encoded today yet.</div>'; return; }
  el.innerHTML=loads.map(j=>{
    const cls=(j.status||'pending'); const lbl=statusLabel(j.status||'pending');
    const lines=(j.history||'').split('\n').map(s=>s.trim()).filter(Boolean);
    const log=lines.length?lines.map(l=>{ const m=l.match(/^\[(.+?)\]\s*(.*)$/);
      return m?`<div class="tl-hist-line"><span class="tl-hist-time">${m[1].replace(/</g,'&lt;')}</span><span>${m[2].replace(/</g,'&lt;')}</span></div>`
              :`<div class="tl-hist-line"><span class="tl-hist-time"></span><span>${l.replace(/</g,'&lt;')}</span></div>`;
    }).join(''):'<div class="tl-hist-line"><span class="tl-hist-time"></span><span style="color:#9aa6a2">No status updates yet.</span></div>';
    const jo=(j.job_order_no||'—').replace(/</g,'&lt;'); const sub=(j.subscriber||'(no name)').replace(/</g,'&lt;');
    const dc=Number(j.dispatch_count)||0;
    return `<div class="tl-hist-item" data-tlhist="${j.id}" data-tlsearch="${tlSearchText(j)}">`
      +`<div class="tl-hist-head"><b>${sub}</b><span class="tl-hist-jo">J.O. ${jo}</span><span class="status ${cls}">${lbl}</span>${j.team?`<span class="tl-hist-team">${j.team.replace(/</g,'&lt;')}</span>`:''}${dc>0?`<span class="redispatch dc${Math.min(dc,5)}" style="font-size:8px;padding:1px 5px">⟳${dc}</span>`:''}</div>`
      +`<div class="tl-chip-by" style="margin:3px 0 0">Agent: ${tlBy(j).replace(/</g,'&lt;')}</div>`
      +`<div class="tl-hist-log">${log}</div></div>`;
  }).join('');
  $$('#tlHistory [data-tlhist]').forEach(it=>it.onclick=()=>openJobDetail(it.dataset.tlhist));
  const tg=$('#tlHistToggle'); if(tg&&!tg._wired){ tg._wired=true; tg.onclick=()=>{ const h=$('#tlHistory'); const hidden=h.style.display==='none'; h.style.display=hidden?'':'none'; tg.textContent=hidden?'Hide':'Show'; }; }
}
// ---------- Daily productivity snapshots (capture today, backtrack past days) ----------
function buildDailyMetrics(dateArg){
  const today=dateArg||manilaToday();
  const enc=j=> j.created_at?new Date(j.created_at).toLocaleDateString('en-CA',{timeZone:TZ}):'';
  const loadToday=d=>!d||String(d).slice(0,10)===today;
  const isTodayUpd=d=>d&&new Date(d).toLocaleDateString('en-CA',{timeZone:TZ})===today;
  const set=jobs.filter(j=>{ const st=(j.status||'').toLowerCase();
    if(st==='completed'||st==='cancelled') return finishedDay(j)===today;
    if(st==='negative') return loadToday(j.load_date)||finishedDay(j)===today;
    return loadToday(j.load_date); });
  const counts={fordispatch:0,acknowledged:0,travel:0,onsite:0,incomplete:0,completed:0,cancelled:0};
  set.forEach(j=>{ counts[tlBucket(j.status)]++; });
  const turnins=[...new Set(jobs.filter(j=>enc(j)===today).map(j=>j.id))].length;
  const tm={};
  set.forEach(j=>{ if(!j.team) return; const t=tm[j.team]=tm[j.team]||{code:j.team,total:0,completed:0,incomplete:0}; t.total++; const b=tlBucket(j.status); if(b==='completed')t.completed++; if(b==='incomplete')t.incomplete++; });
  const teamsArr=Object.values(tm).sort((a,b)=>b.completed-a.completed||a.code.localeCompare(b.code));
  // Store FULL job objects (minus heavy history) so the End-of-Day state can re-render BOTH
  // the Teams timeline and the Dispatch Board for any past date.
  const list=set.map(j=>{ const c=Object.assign({},j); delete c.history; return c; });
  return {counts,turnins,teams:teamsArr,jobs:list};
}
let _lastSnap=0;
function maybeCaptureSnapshot(){ if(!window.dashUser) return; const now=Date.now(); if(now-_lastSnap<180000) return; _lastSnap=now; captureDailySnapshot(); }
async function captureDailySnapshot(){
  if(!window.dashUser) return;
  try{
    const body={work_date:manilaToday(),captured_at:new Date().toISOString(),data:buildDailyMetrics()};
    await fetch(`${SUPA_URL}/rest/v1/daily_snapshots?on_conflict=work_date`,{method:'POST',headers:{...DH(),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(body)});
  }catch(e){}
}
// Best-effort BACKFILL of past daily snapshots from current jobs (for days not captured live,
// e.g. before this feature was deployed). Reconstructed from current statuses — terminal loads
// (Completed/Cancelled) are accurate; loads changed since are approximate. Flagged reconstructed.
async function backfillSnapshots(fromDate){
  if(!window.dashUser || !jobs.length) return;
  const today=manilaToday();
  let have=new Set();
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/daily_snapshots?select=work_date`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); if(r.ok)(await r.json()).forEach(x=>have.add(String(x.work_date).slice(0,10))); }catch(e){}
  const dts=[]; let d=new Date(fromDate+'T00:00:00+08:00'); const end=new Date(today+'T00:00:00+08:00');
  while(d<end){ dts.push(d.toLocaleDateString('en-CA',{timeZone:TZ})); d.setDate(d.getDate()+1); }
  for(const ds of dts){
    if(have.has(ds)) continue;
    const data=buildDailyMetrics(ds); if(!data.jobs.length) continue;
    data.reconstructed=true;
    try{ await fetch(`${SUPA_URL}/rest/v1/daily_snapshots?on_conflict=work_date`,{method:'POST',headers:{...DH(),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({work_date:ds,captured_at:new Date().toISOString(),data})}); }catch(e){}
  }
}
async function renderProductivityHistory(){
  const panel=$('#tlProd'); if(!panel) return;
  const dEl=$('#tlProdDate'); if(dEl&&!dEl.value){ dEl.value=manilaToday(); }
  if(dEl&&!dEl._wired){ dEl._wired=true; dEl.onchange=renderProductivityHistory; }
  const date=dEl?dEl.value:manilaToday();
  panel.innerHTML='<div class="empty-row">Loading…</div>';
  let snap=null, live=(date===manilaToday());
  if(live){ snap={captured_at:new Date().toISOString(),data:buildDailyMetrics()}; captureDailySnapshot(); }
  else { try{ const r=await fetch(`${SUPA_URL}/rest/v1/daily_snapshots?work_date=eq.${date}&select=*`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); const rows=r.ok?await r.json():[]; snap=rows[0]||null; }catch(e){} }
  if(!snap){ panel.innerHTML=`<div class="empty-row">No saved productivity for ${date}. (Saving starts from this day onward.)</div>`; return; }
  const d=snap.data||{}, c=d.counts||{};
  const defs=[['Total Turn-Ins',d.turnins||0,'#102925','#fff'],['For Dispatch',c.fordispatch||0,'#fff','#56655f'],['Acknowledged',c.acknowledged||0,'#eaf1ff','#3473d8'],['Travel',c.travel||0,'#f0ebff','#7959c7'],['On-site',c.onsite||0,'#fff4cf','#9a7b12'],['Incomplete',c.incomplete||0,'#fdecea','#c2503a'],['Completed',c.completed||0,'#e7f7ef','#11825f'],['Cancelled',c.cancelled||0,'#f2f2f2','#87928f']];
  const chips=defs.map(([l,n,bg,fg])=>`<span class="tl-count" style="background:${bg};color:${fg};border:1px solid rgba(0,0,0,.08)"><b>${n}</b>${l}</span>`).join('');
  const teamRows=(d.teams||[]).map(t=>`<tr><td><strong>${(t.code||'').replace(/</g,'&lt;')}</strong></td><td>${t.total||0}</td><td style="color:#11825f;font-weight:700">${t.completed||0}</td><td style="color:#c2503a;font-weight:700">${t.incomplete||0}</td></tr>`).join('')||'<tr><td colspan="4" class="empty-cell">No team activity recorded.</td></tr>';
  panel.innerHTML=`<div class="tl-counts" style="border:0;background:transparent;padding:0 0 10px">${chips}</div>`
    +`<div style="font-size:9px;color:#9aa6a2;margin:0 0 8px">${live?'Live (today, auto-saving)':'Saved snapshot'} · captured ${snap.captured_at?fmtWhen(snap.captured_at):'—'}</div>`
    +`<div class="table-wrap"><table><thead><tr><th>Team</th><th>Total loads</th><th>Completed</th><th>Incomplete</th></tr></thead><tbody>${teamRows}</tbody></table></div>`;
  injectIcons();
}
// Build a lowercase searchable string per job (JO #, subscriber, team, area, address, JO number)
function tlSearchText(j){
  return [j.id,j.subscriber,j.team,j.area,j.city,j.address,j.job_order_no,j.primary_no,j.created_by,j.source_of_sales,j.referral_name]
    .filter(Boolean).join(' ').toLowerCase().replace(/"/g,'&quot;');
}
// "By:" = the Sales Agent (account · agent name), same as the Validation page. (No source of sales.)
function tlBy(j){ return agentLabel(j.created_by)||'—'; }
// Highlight matches and dim the rest; clears when the box is empty
function tlApplySearch(){
  const sb=$('#tlSearch'); const q=(sb?sb.value:'').trim().toLowerCase();
  const all=$$('#tlBacklog [data-tlsearch], #tlGrid [data-tlsearch], #tlHistory [data-tlsearch]');
  let firstHit=null;
  all.forEach(el=>{
    el.classList.remove('tl-hit','tl-dim');
    if(!q) return;
    const hit=(el.dataset.tlsearch||'').includes(q);
    el.classList.add(hit?'tl-hit':'tl-dim');
    if(hit&&!firstHit) firstHit=el;
  });
  if(q&&firstHit){ try{ firstHit.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'}); }catch(_){} }
  tlSearchOtherDays(q,!!firstHit);
}
// ---- Cross-date JO search --------------------------------------------------
// The Dashboard only renders the selected day, so the search box also scans the
// FULL jobs list; matches that live on a different working day are offered in a
// dropdown — click one to jump the Dashboard to that date and open the JO.
function tlJobDay(j){
  const day=d=>{ try{ return new Date(d).toLocaleDateString('en-CA',{timeZone:TZ}); }catch(_){ return ''; } };
  if(j.scheduled_at) return day(j.scheduled_at);
  if(j.load_date) return String(j.load_date).slice(0,10);
  if(j.updatedAt) return day(j.updatedAt);
  if(j.created_at) return day(j.created_at);
  return '';
}
function tlSearchOtherDays(q,hasLocalHit){
  const sb=$('#tlSearch'); if(!sb) return;
  const box=sb.closest('.search-box')||sb.parentElement;
  let drop=box.querySelector('.tl-search-drop');
  if(!q||q.length<2){ if(drop) drop.remove(); return; }
  // Close when clicking anywhere outside the search box (wired once).
  if(!tlSearchOtherDays._wired){ tlSearchOtherDays._wired=true;
    document.addEventListener('click',e=>{ if(!e.target.closest('.search-box')) $$('.tl-search-drop').forEach(d=>d.remove()); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') $$('.tl-search-drop').forEach(d=>d.remove()); });
  }
  const sel=($('#tlDate')&&$('#tlDate').value)||manilaToday();
  const hits=jobs.filter(j=>tlSearchText(j).includes(q)&&tlJobDay(j)!==sel)
    .sort((a,b)=>tlJobDay(b).localeCompare(tlJobDay(a)));           // nearest day first
  if(!hits.length){ if(drop) drop.remove();
    if(!hasLocalHit){ if(!drop){ drop=document.createElement('div'); drop.className='tl-search-drop'; box.appendChild(drop); }
      drop.innerHTML='<div class="tl-sd-empty">No match on this or any other day.</div>'; }
    return; }
  if(!drop){ drop=document.createElement('div'); drop.className='tl-search-drop'; box.appendChild(drop); }
  const esc=v=>String(v==null?'':v).replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const fmtD=d=>{ try{ return new Date(d+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'}); }catch(_){ return d; } };
  drop.innerHTML=`<div class="tl-sd-head">${hits.length>8?'8 of '+hits.length:hits.length} found on other days · click to view</div>`
    +hits.slice(0,8).map(j=>{ const d=tlJobDay(j);
      return `<button type="button" class="tl-sd-item" data-sdjob="${esc(j.id)}" data-sdday="${esc(d)}">`
        +`<b>${esc((j.subscriber||'(no name)').slice(0,28))}</b>`
        +`<span>J.O. ${esc(j.job_order_no||'—')} · ${esc(statusLabel(j.status||'pending'))}${j.team?' · '+esc(j.team):''}</span>`
        +`<small>📅 ${esc(fmtD(d))}</small></button>`; }).join('');
  drop.querySelectorAll('[data-sdjob]').forEach(b=>{
    b.onclick=async()=>{
      const id=b.dataset.sdjob, day=b.dataset.sdday;
      const dEl=$('#tlDate'); if(dEl&&day&&dEl.value!==day){ dEl.value=day; try{ await onDashDateChange(); }catch(_){} }
      const d2=box.querySelector('.tl-search-drop'); if(d2) d2.remove();
      openJobDetail(id);
    };
  });
}
// Return a scheduled load to For Dispatch (unassign) — mirrors the Dispatch Board's
// ↩ For Dispatch bounce. Negative/incomplete loads come back as 1st Load priority.
function tlReturnToDispatch(jobId){
  const j=jobs.find(x=>x.id===jobId); if(!j) return;
  if(j.status==='pending' && !j.scheduled_at) return;      // already in For Dispatch
  const wasNeg=j.status==='negative';
  j.status='pending'; j.team=null; j.scheduled_at=null; j.load_date=manilaToday(); if(wasNeg) j.priority='1st Load';
  j.history=appendHistory(j.history, wasNeg?'Returned → For Dispatch (1st Load)':'Returned → For Dispatch');
  save(); if(window.AHBASync) window.AHBASync(j); renderTimeline(); renderJobs();
  showToast(`${jobId} → For Dispatch${wasNeg?' (1st Load)':''}`);
}
let tlDragId=null;
function wireTimelineDnD(date){
  $$('#tlBacklog [data-tljob]').forEach(c=>{ c.ondragstart=e=>{ tlDragId=c.dataset.tljob; try{e.dataTransfer.setData('text/plain',tlDragId);}catch(_){} }; c.onclick=()=>openJobDetail(c.dataset.tljob); c.title='Drag to a team to schedule · click for full details'; });
  $$('#tlGrid [data-tlblock]').forEach(b=>{
    b.ondragstart=e=>{ tlDragId=b.dataset.tlblock; e.stopPropagation(); try{e.dataTransfer.setData('text/plain',tlDragId);}catch(_){} };
    b.onclick=e=>{ e.stopPropagation(); openJobDetail(b.dataset.tlblock); };
  });
  $$('#tlGrid .tl-track').forEach(tr=>{
    tr.ondragover=e=>{ e.preventDefault(); tr.classList.add('tl-over'); };
    tr.ondragleave=()=>tr.classList.remove('tl-over');
    tr.ondrop=e=>{ e.preventDefault(); tr.classList.remove('tl-over'); const team=tr.dataset.tlteam; const r=tr.getBoundingClientRect(); const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)); let hour=TL_START+x*TL_HOURS; hour=Math.round(hour*2)/2; const id=tlDragId||(e.dataTransfer&&e.dataTransfer.getData('text/plain')); tlDragId=null; if(id) tlPickTime(id,team,date,hour); };
  });
  // Drag a scheduled block back onto the For Dispatch area to UNASSIGN (↩ return to dispatch),
  // same as dragging a card to the For Dispatch column on the Dispatch Board.
  const bl=$('#tlBacklog');
  if(bl){
    bl.ondragover=e=>{ e.preventDefault(); bl.classList.add('tl-over'); };
    bl.ondragleave=()=>bl.classList.remove('tl-over');
    bl.ondrop=e=>{ e.preventDefault(); bl.classList.remove('tl-over'); const id=tlDragId||(e.dataTransfer&&e.dataTransfer.getData('text/plain')); tlDragId=null; if(id) tlReturnToDispatch(id); };
  }
}
// Let the dispatcher choose the PREFERRED arrival time (+ duration) when dropping a load
// onto a technician, instead of snapping to wherever the mouse landed.
function tlPickTime(jobId, team, date, defHour){
  const j=jobs.find(x=>x.id===jobId); if(!j) return;
  let m=document.getElementById('tlTimeModal');
  if(!m){
    m=document.createElement('dialog'); m.id='tlTimeModal'; m.className='modal small-modal';
    m.innerHTML='<div class="modal-head"><div><h2>Set preferred schedule</h2><p id="tlTimeSub"></p></div><button class="icon-btn" data-x>✕</button></div>'
      +'<div class="form-grid"><label class="field full"><span>Preferred time (technician arrival)</span><input type="time" id="tlTimeInput" step="900" min="08:00" max="21:00"></label>'
      +'<label class="field full"><span>Estimated duration</span><select id="tlTimeDur"><option value="30">30 minutes</option><option value="60">1 hour</option><option value="90" selected>1.5 hours</option><option value="120">2 hours</option><option value="180">3 hours</option><option value="240">4 hours</option></select></label></div>'
      +'<div class="modal-actions"><button class="secondary-btn" data-x>Cancel</button><button class="primary-btn" id="tlTimeOk">Schedule</button></div>';
    document.body.appendChild(m);
    m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>closeModals());
  }
  const hh=Math.max(TL_START,Math.min(TL_END-0.5,defHour||TL_START));
  const H=Math.floor(hh), M=Math.round((hh-H)*60/15)*15;
  m.querySelector('#tlTimeInput').value=String(H).padStart(2,'0')+':'+String(M%60).padStart(2,'0');
  m.querySelector('#tlTimeDur').value=String(j.est_minutes||TL_DEFMIN);
  m.querySelector('#tlTimeSub').textContent=jobId+' · '+(j.subscriber||'').slice(0,28)+' → '+team;
  m.querySelector('#tlTimeOk').onclick=()=>{
    const v=m.querySelector('#tlTimeInput').value; if(!v){ showToast('Select a time'); return; }
    const p=v.split(':').map(Number); const hour=p[0]+(p[1]||0)/60;
    const est=parseInt(m.querySelector('#tlTimeDur').value,10)||60;
    closeModals(); tlSchedule(jobId,team,date,hour,est);
  };
  openModal(m);
}
async function tlSchedule(jobId, team, date, hour, est){
  const j=jobs.find(x=>x.id===jobId); if(!j) return;
  const hh=Math.floor(hour), mm=Math.round((hour-hh)*60);
  const iso=new Date(`${date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00+08:00`).toISOString();
  if(j.team!==team){
    // Assigning to a (new) team needs a unique J.O. Number, same rule as the dispatch board.
    let jo=j.job_order_no;
    if(!jo){ jo=(prompt(`J.O. Number for ${jobId} (required to dispatch):`,'')||'').trim(); if(!jo){ showToast('JO Number required to assign'); return; } if(await joTaken(jo,jobId)){ showToast('JO Number already used by another job order'); return; } j.job_order_no=jo; }
    j.team=team; if(j.status==='pending') j.status='assigned'; j.load_date=manilaToday(); j.dispatch_count=(j.dispatch_count||0)+1;
    j.history=appendHistory(j.history,`Scheduled to ${team} @ ${tlFmtHour(hour)} (#${j.dispatch_count})`);
    pushNotify&&pushNotify({team,title:'New load assigned',body:(j.subscriber||jobId)});
  } else {
    j.history=appendHistory(j.history,`Rescheduled @ ${tlFmtHour(hour)}`);
  }
  j.scheduled_at=iso; j.est_minutes=est||j.est_minutes||TL_DEFMIN;
  save(); if(window.AHBASync) window.AHBASync(j); renderTimeline(); renderJobs();
  showToast(`${jobId} → ${team} @ ${tlFmtHour(hour)}`);
}
// Merge technician accounts from the DB into the team list so NEWLY-created technicians
// (made in Access Control) appear everywhere: dispatch assign, Field Teams, dropdowns, monitoring.
async function syncTeamsFromDb(){
  let rows=[]; try{ rows=await fetchTechnicians(); }catch(e){}
  if(!rows||!rows.length) return 0;
  const byCode=new Map(teams.map(t=>[String(t.code).toUpperCase(),t]));
  let changed=0;
  rows.forEach(r=>{
    if((r.role||'technician')!=='technician') return;      // field technicians only (Sales/Security excluded here)
    const code=String(r.username||'').toUpperCase(); if(!code) return;
    const loc={loc_city:r.loc_city||'',loc_district:r.loc_district||'',loc_team:r.loc_team||'',loc_unit:r.loc_unit||''};
    const existing=byCode.get(code);
    if(existing){ Object.assign(existing,loc); if(r.area) existing.area=r.area; changed++; return; }  // merge DB location onto existing team
    const i=teams.length;
    const nt={id:i+1,name:code,code,short:((code.replace(/[^0-9]/g,'').slice(-3))||String(i+1)).padStart(3,'0'),
      status:'offline',area:r.area||'',jobs:0,completed:0,rating:'—',
      x:8+((i*37)%84),y:12+((i*29)%72),color:colors[i%colors.length],members:2};
    Object.assign(nt,loc);
    teams.push(nt); byCode.set(code,nt); changed++;
  });
  if(changed) buildTeamDropdowns();
  return changed;
}
function buildTeamDropdowns(){
  if($('#expenseTeam')) $('#expenseTeam').innerHTML=teams.map(t=>`<option>${t.name}</option>`).join('');
  if($('#orderTeam')) $('#orderTeam').innerHTML='<option value="">— Unassigned —</option>'+teams.map(t=>`<option>${t.name}</option>`).join('');
}
async function openAssign(jobId){
  const job=jobs.find(j=>j.id===jobId); if(!job){showToast('Job no longer available');return;} $('#assignJobLabel').textContent=`${job.id} · ${job.subscriber} · ${job.area}`;$('#assignModal').dataset.job=jobId;
  const joEl=$('#assignJONum'); if(joEl){ joEl.value=job.job_order_no||''; joEl.readOnly=!!job.job_order_no; joEl.style.background=job.job_order_no?'#f1f3f1':''; if($('#joLock'))$('#joLock').textContent=job.job_order_no?'(locked)':''; }
  const remEl=$('#assignRemarks'); if(remEl) remEl.value=job.dispatched_remarks||'';
  openModal($('#assignModal'));
  $('#assignmentList').innerHTML='<div class="empty-row">Loading online teams…</div>';
  await Promise.all([fetchTechLocations(), loadTeamShifts(), syncTeamsFromDb()]);
  const dest=areaCoord(job.area);
  const enrich=t=>{ const loc=techIndex[t.code]; let dist=null; if(loc&&loc.lat!=null&&loc.lng!=null&&dest)dist=haversineKm(loc.lat,loc.lng,dest[0],dest[1]); const s=shiftByTeam[t.code]||{}; return {t,loc,dist,online:!!s.online,shift:s}; };
  const all=teams.map(enrich);
  const online=all.filter(e=>e.online).sort((a,b)=>(a.dist==null?1e9:a.dist)-(b.dist==null?1e9:b.dist));
  const offline=all.filter(e=>!e.online);
  const item=(e,best)=>{ const t=e.t,s=e.shift; const crew=[s.driver,s.tech1,s.tech2].filter(Boolean).join(', '); const acct=s.account?` · ${s.account}`:''; const distTxt=e.dist!=null?`${e.dist.toFixed(1)} km away`:(e.loc&&e.loc.area?e.loc.area:'no GPS'); const sub=e.online?`Online${acct}${crew?' · '+crew:''} · ${distTxt}`:`Offline · last seen ${e.loc&&e.loc.location_at?fmtWhen(e.loc.location_at):'—'}`; return `<div class="assignment-item ${best?'recommended':''}"><span class="team-avatar" style="background:${e.online?'#18a57b':t.color}">${t.short}</span><div><strong>${t.name}${best?'<span class="recommend">NEAREST</span>':e.online?'<span class="recommend">ONLINE</span>':''}</strong><p>${sub}</p></div><button class="assign-btn" data-team="${t.code}">Assign</button></div>`; };
  let html='';
  if(online.length){ html+=`<div class="form-sec" style="margin:4px 0 6px">Online now · ${online.length} team(s)</div>`+online.map((e,i)=>item(e,i===0&&e.dist!=null)).join(''); }
  else { html+='<div class="empty-row">No online (timed-in) team right now. You can still assign from the list below.</div>'; }
  if(offline.length){ html+=`<div class="form-sec" style="margin:14px 0 6px;color:#8a9894">Offline / not signed in</div>`+offline.map(e=>item(e,false)).join(''); }
  $('#assignmentList').innerHTML=html;
  $$('#assignmentList [data-team]').forEach(b=>b.onclick=()=>assignTeam(jobId,b.dataset.team));
}
// Job Order numbers must be unique — checks the WHOLE jobs table (incl. completed/history)
async function joTaken(jo,exceptId){
  jo=(jo||'').trim(); if(!jo) return false;
  try{
    // Soft-deleted job orders DON'T reserve the J.O. Number — a new one can reuse it.
    const r=await fetch(`${SUPA_URL}/rest/v1/jobs?select=id&deleted_at=is.null&job_order_no=eq.${encodeURIComponent(jo)}`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    if(!r.ok) return false;
    const rows=await r.json();
    return rows.some(x=>String(x.id)!==String(exceptId));
  }catch(e){ return false; }
}
async function assignTeam(jobId,team){const j=jobs.find(x=>x.id===jobId); if(!j){showToast('Job no longer available');return;} const joVal=(($('#assignJONum')&&$('#assignJONum').value)||'').trim();const joFinal=j.job_order_no||joVal;if(!joFinal){showToast('Enter the J.O. Number first');$('#assignJONum')&&$('#assignJONum').focus();return;}if(!j.job_order_no&&joVal&&await joTaken(joVal,jobId)){showToast('JO Number already used by another job order');$('#assignJONum')&&$('#assignJONum').focus();return;}if(!j.job_order_no)j.job_order_no=joVal;const rem=(($('#assignRemarks')&&$('#assignRemarks').value)||'').trim();if(rem)j.dispatched_remarks=rem;j.team=team;j.status='assigned';j.load_date=manilaToday();j.dispatch_count=(j.dispatch_count||0)+1;if(!j.scheduled_at){let h=new Date().getHours();if(h<TL_START)h=TL_START;if(h>TL_END-1)h=TL_END-1;j.scheduled_at=new Date(`${manilaToday()}T${String(h).padStart(2,'0')}:00:00+08:00`).toISOString();j.est_minutes=j.est_minutes||TL_DEFMIN;}j.history=appendHistory(j.history,`Dispatched to ${team} (#${j.dispatch_count})${j.job_order_no?' · JO '+j.job_order_no:''}`);save();closeModals();renderJobs();if($('#timelinePage')?.classList.contains('active'))renderTimeline();showToast(`${team} assigned to ${jobId}`);if(window.AHBASync)window.AHBASync(j);pushNotify({team,title:'New load assigned',body:(j.subscriber||jobId)})}
function openModal(modal){$('#modalBackdrop').classList.add('show');modal.showModal()}
function closeModals(){$$('dialog[open]').forEach(d=>d.close());$('#modalBackdrop').classList.remove('show')}

// Sidebar (mobile)
function openSidebar(){$('#sidebar').classList.add('open');const s=$('#sidebarScrim');if(s)s.hidden=false}
function closeSidebar(){$('#sidebar').classList.remove('open');const s=$('#sidebarScrim');if(s)s.hidden=true}

// Popovers
function closePopovers(){
  const np=$('#notifPop'); if(np){np.hidden=true;$('#notifBtn').setAttribute('aria-expanded','false')}
  const rm=$('#roleMenu'); if(rm){rm.hidden=true;$('#roleSwitcher').setAttribute('aria-expanded','false')}
}
function toggleNotif(){
  const np=$('#notifPop'),btn=$('#notifBtn');const open=np.hidden;
  closePopovers();
  if(open){np.hidden=false;btn.setAttribute('aria-expanded','true')}
}
// Build LIVE notifications from real data: urgent alerts (travel>45m, idle>30m) first,
// then recent job-status events. Times are accurate (relative to now).
function buildNotifs(){
  const out=[], now=Date.now();
  try{ jobs.forEach(j=>{ if(j.status==='en-route'&&j.updatedAt){ const mins=(now-new Date(j.updatedAt).getTime())/60000; if(mins>=45) out.push({icon:'truck',tone:'coral',title:'⏱️ Travel over 45 min',text:`${j.team?'<b>'+j.team+'</b> · ':''}${j.subscriber||j.id} (${Math.floor(mins)}m)`,ts:j.updatedAt,pri:0}); } }); }catch(e){}
  try{ Object.entries(shiftByTeam).forEach(([code,s])=>{ if(!/^AHBA_SLI/i.test(code))return; if(!s.online||teamHasActiveLoad(code))return; let last=s.time_in?new Date(s.time_in).getTime():0; jobs.forEach(j=>{ if(j.team===code&&j.updatedAt){const t=new Date(j.updatedAt).getTime(); if(t>last)last=t;} }); if(last){ const mins=(now-last)/60000; if(mins>=30) out.push({icon:'info',tone:'coral',title:'🚨 Team idle — no load',text:`<b>${code}</b> (${Math.floor(mins)}m idle)`,ts:new Date(last).toISOString(),pri:0}); } }); }catch(e){}
  const map={completed:['check','','Job completed'],'en-route':['truck','blue','Team en route'],'on-site':['pin','','Arrived on site'],'in-progress':['wrench','blue','Work in progress'],negative:['info','coral','Marked incomplete'],assigned:['truck','blue','Dispatched'],cancelled:['info','coral','Job cancelled'],for_validation:['clipboard','','New order for validation'],pending:['info','','For dispatch'],rejected:['info','coral','Order rejected']};
  jobs.filter(j=>j.updatedAt).slice().sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,12).forEach(j=>{ const m=map[j.status]||['info','','Updated']; out.push({icon:m[0],tone:m[1],title:m[2],text:`${j.team?'<b>'+j.team+'</b> · ':''}${j.subscriber||j.id}`,ts:j.updatedAt,pri:1}); });
  out.sort((a,b)=>(a.pri-b.pri)||(new Date(b.ts)-new Date(a.ts)));
  return out.slice(0,16);
}
function renderNotifPop(){
  const el=$('#notifPopList'); if(!el) return;
  const list=buildNotifs();
  el.innerHTML=list.length?list.map(a=>`<div class="notif-item"><span class="activity-icon ${a.tone}" data-icon="${a.icon}"></span><div><strong>${a.title}</strong><p>${a.text}</p></div><time>${timeAgo(a.ts)}</time></div>`).join(''):'<div style="padding:20px;text-align:center;color:#9aa6a2;font-size:11px">No notifications yet.</div>';
  injectIcons();
  // red dot lights up when there's anything newer than the last "mark all read"
  const newest=list.reduce((mx,a)=>Math.max(mx,new Date(a.ts).getTime()||0),0);
  const dot=$('#notifDot'); if(dot) dot.style.display=(list.length && newest>notifReadAt)?'':'none';
}

function switchPage(page){$$('.page').forEach(p=>p.classList.remove('active'));$(`#${page}Page`).classList.add('active');$$('.nav-item').forEach(n=>{const on=n.dataset.page===page;n.classList.toggle('active',on);on?n.setAttribute('aria-current','page'):n.removeAttribute('aria-current')});const labels={overview:'Good morning, Allec',dispatch:'Dispatch operations',teams:'Field team monitoring',workorders:'Subscriber work orders',expenses:'Expense monitoring',attendance:'Attendance · Time records',completed:'QA Validation',validation:'Validator · New job orders',history:'Billing Validation',remittance:'Remittance · Daily collection',access:'Access Control',subcon:'Subcontractors',timeline:'Dashboard'};$('#pageTitle').textContent=labels[page]||'';if(page==='overview'){const u=window.dashUser;const nm=u?String(u.display_name||u.username).split(/\s+/)[0]:'there';$('#pageTitle').textContent='Good Day, '+nm;}if(page==='timeline'){renderTimeline();renderJobs();}if(page==='attendance')renderAttendance();if(page==='completed')renderCompleted();if(page==='validation')renderValidation();if(page==='history')renderHistory();if(page==='remittance')renderRemittance();if(page==='access')renderAccess();if(page==='subcon')renderSubcon();applyViewOnlyLock(page);if(window.dashUser&&!window.dashUser.is_super&&Array.isArray(window.dashUser.allowed_pages)&&window.dashUser.allowed_pages.includes(page)&&!dashCanEdit(page)){const _t=$('#pageTitle');if(_t)_t.textContent+=' · 👁 View only';}closeSidebar();scrollTo(0,0)}

// ---------- Validator (sales-agent job orders awaiting approval) ----------
let valJobs=[], valDocs={};
async function refreshValBadge(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/jobs?select=id&status=eq.for_validation`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const n=r.ok?(await r.json()).length:0; const b=$('#valBadge');
    if(b){ b.textContent=n; b.style.display=n?'':'none'; }
  }catch(e){}
}
async function renderValidation(){
  const body=$('#validationBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="7" class="empty-cell">Loading…</td></tr>`;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/jobs?status=eq.for_validation&select=*&order=updated_at.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    valJobs=r.ok?await r.json():[];
  }catch(e){valJobs=[]}
  valDocs=await fetchDocsFor(valJobs.map(j=>j.id));
  await loadAgentNames();
  $('#valPending').textContent=valJobs.length;
  $('#valAgents').textContent=new Set(valJobs.map(j=>j.created_by).filter(Boolean)).size||'—';
  // approved/rejected today
  try{
    const today=manilaToday();
    const r2=await fetch(`${SUPA_URL}/rest/v1/jobs?select=status,validated_at,updated_at&or=(status.eq.pending,status.eq.rejected)`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r2.ok?await r2.json():[];
    $('#valApproved').textContent=rows.filter(x=>x.status==='pending'&&x.validated_at&&new Date(x.validated_at).toLocaleDateString('en-CA',{timeZone:TZ})===today).length;
    $('#valRejected').textContent=rows.filter(x=>x.status==='rejected'&&x.updated_at&&new Date(x.updated_at).toLocaleDateString('en-CA',{timeZone:TZ})===today).length;
  }catch(e){}
  if(!valJobs.length){body.innerHTML=`<tr><td colspan="7" class="empty-cell">No job orders awaiting validation.</td></tr>`;refreshValBadge();return}
  body.innerHTML=valJobs.map(j=>{
    const docs=valDocs[j.id]||[];
    return `<tr><td><strong>${j.id}</strong>${j.ref_no?`<span style="font-size:8px;color:#9aa6a2">Ref: ${esc(j.ref_no)}</span>`:''}</td><td>${agentLabel(j.created_by)}</td><td><strong>${esc(j.subscriber||'—')}</strong></td><td>${esc(j.primary_no||'—')}</td><td>${esc(j.area||j.city||'—')}</td><td>${fmtWhen(j.updated_at)}</td><td><button class="assign-btn" data-review="${j.id}">Review (${docs.length} docs)</button></td></tr>`;
  }).join('');
  $$('#validationBody [data-review]').forEach(b=>b.onclick=()=>openValidate(b.dataset.review));
  refreshValBadge();
}
async function fetchDocsFor(ids){
  if(!ids.length)return{};
  try{
    const q=ids.map(encodeURIComponent).join(',');
    const r=await fetch(`${SUPA_URL}/rest/v1/job_docs?select=job_id,category,path&job_id=in.(${q})`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[]; const m={}; rows.forEach(x=>{(m[x.job_id]=m[x.job_id]||[]).push(x)}); return m;
  }catch(e){return{}}
}
function openValidate(jobId){
  const j=valJobs.find(x=>x.id===jobId)||{}; const docs=valDocs[jobId]||[];
  $('#valTitle').textContent=`${jobId} · ${j.subscriber||''}`;
  $('#valSub').textContent=`Submitted by ${agentLabel(j.created_by)} · ${fmtWhen(j.updated_at)}`;
  const F=(label,val)=>`<div><b>${label}</b>${val||'—'}</div>`;
  $('#valInfo').innerHTML=[
    F('Subscriber',j.subscriber),F('Primary no.',j.primary_no),F('Other contact',j.other_contact_no),
    F('Plan',j.plan),F('Add-on',j.add_on),F('Reference no.',j.ref_no),F('1P/2P',j.play_type),F('Add-ons (2P)',j.addon_count),F('VAS no.',j.vas_no),
    F('Unit type',j.dwelling_type),F('Installation fee',j.install_fee_type),F('Amount to collect',j.amount_to_collect!=null?money(j.amount_to_collect):''),
    F('Source of sales',j.source_of_sales),F('Referral',j.referral_name),F('Address',j.address),
    F('District',j.district?('District '+j.district):''),F('Barangay',j.brgy),F('City',j.city||j.area),F('Special note',j.special_note)
  ].join('');
  $('#valJONum').value=j.job_order_no||''; $('#valIbas').value=j.ibass_acct_no||'';
  // 2-PLAY: show one VAS Number field per add-on (required to validate)
  const is2P=(j.play_type==='2-PLAY'); const vcnt=is2P?(Number(j.addon_count)||1):0;
  const vw=$('#valVasWrap'); if(vw) vw.style.display=is2P?'':'none';
  const ex=String(j.vas_no||'').split(',').map(s=>s.trim());
  if($('#valVasInputs')) $('#valVasInputs').innerHTML=is2P?Array.from({length:vcnt}).map((_,i)=>`<label class="field"><span>VAS Number ${i+1} *</span><input class="valVas" value="${(ex[i]||'').replace(/"/g,'&quot;')}"></label>`).join(''):'';
  const cats=[['id','Valid ID'],['billing','Proof of Billing'],['premise','Subscriber Premise']];
  $('#valDocs').innerHTML=cats.map(([c,label])=>{
    const list=docs.filter(d=>d.category===c);
    const imgs=list.length?`<div class="photo-grid" style="max-height:none;padding:0">${list.map(d=>`<a class="ph" href="${photoBase(d.path)}" target="_blank" rel="noopener"><img src="${photoBase(d.path)}" alt="${label}" loading="lazy"></a>`).join('')}</div>`:'<div class="none" style="padding:12px;color:#c2503a;font-size:12px">⚠ No photo submitted</div>';
    return `<div class="doc-sec"><h4>${label} (${list.length})</h4>${imgs}</div>`;
  }).join('');
  $$('#valDocs .ph').forEach(a=>a.onclick=e=>{e.preventDefault();window.open(a.href,'_blank','noopener,noreferrer');});
  $('#valReason').value='';
  $('#valApprove').onclick=()=>decideValidation(jobId,true);
  $('#valReject').onclick=()=>decideValidation(jobId,false);
  // View-only (subcontractor): show the JO detail + status, but hide the validate/reject controls.
  const canVal=dashCanEdit('validation');
  ['#valApprove','#valReject'].forEach(s=>{ const b=$(s); if(b) b.style.display=canVal?'':'none'; });
  ['#valJONum','#valIbas','#valReason'].forEach(s=>{ const e=$(s); if(e) e.readOnly=!canVal; });
  $$('#valVasInputs .valVas').forEach(e=>e.readOnly=!canVal);
  openModal($('#valModal'));
}
async function decideValidation(jobId,approve){
  if(!dashCanEdit('validation')){ showToast('Validation is GC-only'); return; }
  const j=valJobs.find(x=>x.id===jobId)||{};
  let body;
  if(approve){
    const jo=($('#valJONum').value||'').trim(), ibas=($('#valIbas').value||'').trim();
    if(!jo){ showToast('Enter the JO Number before validating'); $('#valJONum').focus(); return; }
    if(!ibas){ showToast('Enter the IBAS Number before validating'); $('#valIbas').focus(); return; }
    if(await joTaken(jo,jobId)){ showToast('JO Number already used by another job order'); $('#valJONum').focus(); return; }
    // Intake approval assigns JO/IBAS + records approval time, but does NOT mark QA-validated.
    // QA validation (proof-photo review on the QA Validation page) is a separate, manual step.
    body={status:'pending', validated_at:new Date().toISOString(), updated_at:new Date().toISOString(), load_date:manilaToday(), job_order_no:jo, ibass_acct_no:ibas};
    if(j.play_type==='2-PLAY'){
      const vs=$$('.valVas').map(i=>i.value.trim());
      if(!vs.length||vs.some(x=>!x)){ showToast('Enter all VAS Number(s) — required for 2-PLAY'); return; }
      body.vas_no=vs.join(', ');
    }
  } else {
    body={status:'rejected', updated_at:new Date().toISOString(), special_note:(($('#valReason').value||'').trim()?('REJECTED: '+$('#valReason').value.trim()):'REJECTED')};
  }
  try{
    await fetch(`${SUPA_URL}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});
    closeModals(); showToast(approve?`${jobId} approved → sent to dispatch`:`${jobId} rejected`); renderValidation();
  }catch(e){showToast('Action failed: '+e.message)}
}

// ---------- Accounts (technician login accounts) ----------
async function fetchTechnicians(){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/technicians?select=*&order=username.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    return r.ok?await r.json():[];
  }catch(e){return[]}
}
let agentNames={};
async function loadAgentNames(){ try{ const ts=await fetchTechnicians(); agentNames={}; ts.forEach(t=>agentNames[t.username]=t.display_name||''); }catch(e){} return agentNames; }
const agentLabel=u=>u?(u+(agentNames[u]?(' · '+agentNames[u]):'')):'—';
const TZ='Asia/Manila';
const manilaToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:TZ});
function fmtWhen(s){if(!s)return'—';return new Date(s).toLocaleString('en-PH',{timeZone:TZ,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}
function fmtTime(s){if(!s)return'—';return new Date(s).toLocaleTimeString('en-PH',{timeZone:TZ,hour:'numeric',minute:'2-digit'})}
function fmtDur(inTs,outTs){if(!inTs)return'—';const end=outTs?new Date(outTs):new Date();let mins=Math.max(0,Math.round((end-new Date(inTs))/60000));const h=Math.floor(mins/60),m=mins%60;return `${h}h ${String(m).padStart(2,'0')}m`}
async function renderAccounts(){
  const body=$('#accountsBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="6" class="empty-cell">Loading accounts…</td></tr>`;
  let rows=await fetchTechnicians();
  if(!rows.length){
    // fall back to the 20 known accounts if the table isn't set up yet
    rows=teams.map(t=>({username:t.name,email:`${t.name.toLowerCase()}@ahbafield.app`,area:t.area,must_change:true,last_login:null,password_changed_at:null,role:'technician'}));
  }
  const lim=accessIsDispatcherOnly();
  if(lim) rows=rows.filter(r=>(r.role||'technician')==='technician');   // dispatchers: technicians only
  $('#accountTotal').textContent=rows.length;
  $('#accountActive').textContent=rows.filter(r=>!r.must_change).length;
  $('#accountPending').textContent=rows.filter(r=>r.must_change).length;
  $('#accountSignedIn').textContent=rows.filter(r=>r.last_login).length;
  body.innerHTML=rows.map(r=>{
    const status=r.must_change?'<span class="status pending">Needs setup</span>':'<span class="status completed">Active</span>';
    const acts=lim
      ? `<div class="row-actions"><button class="assign-btn" data-reset="${r.username}" data-email="${r.email||''}">Reset PW</button></div>`
      : `<div class="row-actions"><button class="assign-btn" data-reset="${r.username}" data-email="${r.email||''}">Reset PW</button><button class="assign-btn" data-areatech="${r.username}" data-area="${(r.area||'').replace(/"/g,'&quot;')}">Area</button><button class="assign-btn" data-renametech="${r.username}">Rename</button><button class="assign-btn" style="color:#c2503a;border-color:#f0c3ba" data-deltech="${r.username}">Delete</button></div>`;
    return `<tr><td><strong>${esc(r.username)}</strong></td><td>${esc(r.email||'—')}</td><td>${esc(r.area||'—')}</td><td>${status}</td><td>${fmtWhen(r.last_login)}</td><td>${r.must_change?'<span style="color:#9aa6a2">default</span>':fmtWhen(r.password_changed_at)}</td><td>${acts}</td></tr>`;
  }).join('');
  $$('#accountsBody [data-reset]').forEach(b=>b.onclick=()=>openReset(b.dataset.reset,b.dataset.email));
  $$('#accountsBody [data-renametech]').forEach(b=>b.onclick=()=>renameTechUser(b.dataset.renametech));
  $$('#accountsBody [data-deltech]').forEach(b=>b.onclick=()=>deleteTechUser(b.dataset.deltech));
  $$('#accountsBody [data-areatech]').forEach(b=>b.onclick=()=>editTechArea(b.dataset.areatech, b.dataset.area));
}
// Edit the area of a MOBILE/field account (technicians.area) — allowed for console users via RLS.
// Field team location — structured edit (City QC only · District 1-6 · Team SLI/SLR/OSP · Type SDU/MDU). Any console user.
async function saveTeamLocation(code){
  const city='Quezon City';
  const district=$('#tdLocDistrict')?.value||'';
  const team=$('#tdLocTeam')?.value||'';
  const unit=$('#tdLocUnit')?.value||'';
  const area=[city, district?('District '+district):'', team, unit].filter(Boolean).join(' · ');
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/technicians?username=eq.${encodeURIComponent(code)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({loc_city:city,loc_district:district||null,loc_team:team||null,loc_unit:unit||null,area,updated_at:new Date().toISOString()})});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,140);}catch(e){} throw new Error('HTTP '+r.status+(d?' — '+d:'')); }
    const t=teams.find(x=>x.code===code); if(t){ t.loc_city=city; t.loc_district=district; t.loc_team=team; t.loc_unit=unit; t.area=area; }
    showToast(code+' location updated');
    renderTeams($('#teamSearch')?.value||'');
    openTeamDetail(code);   // refresh the modal with saved values
  }catch(e){ showToast('Location update failed: '+e.message); }
}
async function editTechArea(username, current){
  const a=prompt(`Area for ${username}:`, current||'');
  if(a===null) return;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/technicians?username=eq.${encodeURIComponent(username)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({area:a.trim(),updated_at:new Date().toISOString()})});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,120);}catch(e){} throw new Error('HTTP '+r.status+(d?' — '+d:'')); }
    showToast(`${username} area updated`);
    renderAccounts();
  }catch(e){ showToast('Area update failed: '+e.message); }
}
// Superadmin: rename a MOBILE/field account (username == team code; cascades to records).
async function renameTechUser(username){
  let nu=(prompt(`New username for mobile account "${username}" (e.g. AHBA_SLI021):`,username)||'').trim().toUpperCase();
  if(!nu||nu===username) return;
  if(!/^[A-Z0-9._-]{3,}$/.test(nu)){ showToast('Username: 3+ chars, letters/numbers/._- only (no spaces).'); return; }
  if(!confirm(`Rename "${username}" → "${nu}"?\nNew login: ${nu.toLowerCase()}@ahbafield.app\nRecords (jobs, attendance, expenses, etc.) will follow the new code.`)) return;
  if(!await confirmActorPassword()) return;
  try{
    await callAdminFn({action:'rename',target:'tech',username,new_username:nu});
    showToast(`${username} → ${nu}. New login: ${nu.toLowerCase()}@ahbafield.app`);
    renderAccounts();
  }catch(e){ showToast('Rename failed: '+e.message); }
}
// Superadmin: permanently delete a MOBILE/field account (login + profile).
async function deleteTechUser(username){
  if(!confirm(`Permanently DELETE mobile account "${username}"?\nTheir login and profile will be removed. Old records will remain in history. This cannot be undone.`)) return;
  if(!await confirmActorPassword()) return;
  try{
    await callAdminFn({action:'delete',target:'tech',username});
    showToast(`${username} deleted.`);
    renderAccounts();
  }catch(e){ showToast('Delete failed: '+e.message); }
}
function openReset(username,email){
  $('#resetUser').textContent=username;
  $('#resetEmail').textContent=email||`${username.toLowerCase()}@ahbafield.app`;
  if($('#resetNewPw'))$('#resetNewPw').value='';
  openModal($('#resetModal'));
}
async function resetNow(){
  const username=$('#resetUser').textContent.trim();
  const np=($('#resetNewPw').value||'').trim();
  if(np.length<8){showToast('Temporary password must be at least 8 characters');return}
  if(!await confirmActorPassword()) return;
  const btn=$('#resetNow'); btn.disabled=true; btn.textContent='Resetting…';
  try{
    await callAdminFn({action:'reset',target:'tech',username,new_password:np});
    closeModals(); showToast(`${username} reset (by you). They must set a new password on next login.`);
    if($('#accessPage')?.classList.contains('active')) renderAccounts();
  }catch(e){
    const m=/Failed to fetch|NetworkError/i.test(e.message)?'Reset service not reachable — is the admin-reset function deployed?':e.message;
    showToast('Reset failed: '+m);
  }
  btn.disabled=false; btn.textContent='Reset now';
}

// ---------- Attendance (time-in / time-out) ----------
async function fetchAttendance(date){
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/attendance?select=*&work_date=eq.${date}&order=time_in.desc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    return r.ok?await r.json():[];
  }catch(e){return[]}
}
async function renderAttendance(){
  const body=$('#attendanceBody'); if(!body)return;
  // Always (re)wire the date change so BOTH the daily log and the security gate-out log
  // follow the selected date. (Previously onchange was wired only when the field was empty,
  // so after a refresh — when the date already had a value — changing it did nothing.)
  const dateEl=$('#attDate'); if(dateEl){ if(!dateEl.value) dateEl.value=manilaToday(); dateEl.onchange=renderAttendance; }
  const date=dateEl?dateEl.value:manilaToday();
  body.innerHTML=`<tr><td colspan="6" class="empty-cell">Loading…</td></tr>`;
  const rows=await fetchAttendance(date);
  const open=rows.filter(r=>!r.time_out).length, closed=rows.filter(r=>r.time_out).length;
  let totalMin=0; rows.forEach(r=>{if(r.time_in){const end=r.time_out?new Date(r.time_out):new Date();totalMin+=Math.max(0,(end-new Date(r.time_in))/60000)}});
  $('#attIn').textContent=open; $('#attOut').textContent=closed; $('#attTotal').textContent=rows.length;
  $('#attHours').textContent=`${Math.floor(totalMin/60)}h ${String(Math.round(totalMin%60)).padStart(2,'0')}m`;
  if(!rows.length){body.innerHTML=`<tr><td colspan="6" class="empty-cell">No time records for this day.</td></tr>`;return}
  body.innerHTML=rows.map(r=>{
    const status=r.time_out?'<span class="status completed">Timed out</span>':'<span class="status en-route">Timed in</span>';
    const acctFree=(!r.time_out && r.work_account)
      ? ` <span style="color:#647571">· ${r.work_account}</span> <button class="assign-btn" data-freeacct="${(r.work_account||'').replace(/"/g,'&quot;')}" style="margin-left:6px;color:#a4690f;border-color:#f0d9a8">Free account</button>`
      : '';
    const signOff=(!r.time_out && window.dashUser && window.dashUser.is_super)
      ? ` <button class="assign-btn" data-signoff="${(r.username||'').replace(/"/g,'&quot;')}" style="margin-left:6px;color:#c2503a;border-color:#f0c4b9">Sign off</button>`
      : '';
    return `<tr><td><strong>${esc(r.username)}</strong></td><td>${r.work_date}</td><td>${fmtTime(r.time_in)}</td><td>${r.time_out?fmtTime(r.time_out):'—'}</td><td>${fmtDur(r.time_in,r.time_out)}</td><td>${status}${acctFree}${signOff}</td></tr>`;
  }).join('');
  $$('#attendanceBody [data-freeacct]').forEach(b=>b.onclick=()=>freeWorkAccount(b.dataset.freeacct));
  $$('#attendanceBody [data-signoff]').forEach(b=>b.onclick=()=>forceSignOff(b.dataset.signoff));
  // Locked work accounts panel — all accounts currently held by a timed-in team
  const locked=[...new Set(rows.filter(r=>!r.time_out && r.work_account).map(r=>r.work_account))];
  const lp=$('#lockedAcctsPanel'), lc=$('#lockedAccts');
  if(lp&&lc){
    if(locked.length){
      lp.style.display='';
      lc.innerHTML=locked.map(acc=>{ const who=rows.find(r=>!r.time_out&&r.work_account===acc); return `<span style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:7px 10px;font-size:11px"><b>${acc}</b><span style="color:#8a9894">${who?who.username:''}</span><button class="assign-btn" data-freeacct="${acc.replace(/"/g,'&quot;')}" style="color:#a4690f;border-color:#f0d9a8">Free</button></span>`; }).join('');
      $$('#lockedAccts [data-freeacct]').forEach(b=>b.onclick=()=>freeWorkAccount(b.dataset.freeacct));
    } else { lp.style.display='none'; lc.innerHTML=''; }
  }
  attRows=rows;            // keep for export
  renderGateLog(date);
}
// Release a locked work account (clear it from all open attendance rows today) so another team can use it.
async function freeWorkAccount(account){
  if(!account) return;
  if(!confirm(`Free work account "${account}"?\nIt will be released for another team to use. The current user is NOT timed out — only their account selection is cleared.`)) return;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/attendance?work_account=eq.${encodeURIComponent(account)}&time_out=is.null`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({work_account:null})});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,120);}catch(e){} throw new Error('HTTP '+r.status+(d?' — '+d:'')); }
    showToast(`Account "${account}" freed — pwede nang gamitin ng iba.`);
    renderAttendance();
  }catch(e){ showToast('Free failed: '+e.message); }
}
// Superadmin: force sign-off a technician who is still timed in (e.g. forgot to sign off).
// Sets time-out NOW and frees their work account; the day's attendance record is closed.
async function forceSignOff(username){
  if(!(window.dashUser&&window.dashUser.is_super)){ showToast('Superadmin only'); return; }
  if(!username) return;
  if(!confirm(`Force sign-off ${username}?\n\nIto ay magta-time-out sa kanila NGAYON at magfi-free ng account nila. Gamitin kung nakalimutang mag-sign off ang technician.`)) return;
  if(!await confirmActorPassword()) return;
  try{
    const now=new Date().toISOString();
    const r=await fetch(`${SUPA_URL}/rest/v1/attendance?username=eq.${encodeURIComponent(username)}&time_out=is.null`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({time_out:now, work_account:null})});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,120);}catch(e){} throw new Error('HTTP '+r.status+(d?' — '+d:'')); }
    showToast(`${username} signed off (by Superadmin) — account freed.`);
    renderAttendance();
  }catch(e){ showToast('Sign-off failed: '+e.message); }
}
// ---- Security gate-out / vehicle log (on the Attendance page) ----
let attRows=[], gateRows=[];
async function renderGateLog(date){
  const body=$('#gateBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="9" class="empty-cell">Loading…</td></tr>`;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/gate_logs?select=*&work_date=eq.${date}&order=checked_at.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    gateRows=r.ok?await r.json():[];
  }catch(e){ gateRows=[]; }
  const ok=gateRows.filter(g=>g.crew_ok).length, disc=gateRows.length-ok;
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  set('#gateCount',gateRows.length); set('#gateOk',ok); set('#gateDisc',disc);
  set('#gateFirst', gateRows.length?fmtTime(gateRows[0].checked_at):'—');
  if(!gateRows.length){ body.innerHTML=`<tr><td colspan="9" class="empty-cell">No gate-out records for this day.</td></tr>`; return; }
  body.innerHTML=gateRows.map(g=>{
    const crew=[g.crew_tech1,g.crew_tech2].filter(Boolean).join(', ');
    const isIn=(g.gate_type==='incoming');
    const typeBadge=isIn?'<span class="status assigned">IN</span>':'<span class="status completed">OUT</span>';
    const okb=isIn?'—':(g.crew_ok?'<span class="status completed">OK</span>':`<span class="status pending">Diff</span>`);
    const rem=isIn?(g.vehicle_remarks||''):(g.crew_remarks||'');
    const odoFuel=`${g.odometer!=null?g.odometer:'—'}${g.fuel_level?(' · '+g.fuel_level):''}`;
    return `<tr><td><strong>${fmtTime(g.checked_at)}</strong> ${typeBadge}</td><td><strong>${g.team||'—'}</strong></td><td>${esc(g.account||'—')}</td><td><strong>${esc(g.plate_no||'—')}</strong></td><td>${odoFuel}</td><td>${esc(g.crew_driver||'—')}</td><td>${esc(crew||'—')}</td><td>${okb}${rem?` <span style="color:#c2503a;font-size:9px">${esc(rem)}</span>`:''}</td><td>${esc(g.security_user||'—')}</td></tr>`;
  }).join('');
}
// All exported VALUES are forced UPPERCASE (keys/headers unchanged); numbers/blanks untouched.
function upperRows(rows){ return (rows||[]).map(r=>{ const o={}; for(const k in r){ const v=r[k]; o[k]=(typeof v==='string')?v.toUpperCase():v; } return o; }); }
async function exportAttendance(){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  if(!attRows.length){showToast('Nothing to export');return}
  const date=$('#attDate')?.value||manilaToday();
  const rows=attRows.map(r=>({'TECHNICIAN':r.username,'DATE':r.work_date,'TIME IN':r.time_in?fmtWhen(r.time_in):'','TIME OUT':r.time_out?fmtWhen(r.time_out):'','HOURS':fmtDur(r.time_in,r.time_out),'STATUS':r.time_out?'Timed out':'Timed in','ACCOUNT':r.work_account||'','DRIVER':r.crew_driver||'','TECH 1':r.crew_tech1||'','TECH 2':r.crew_tech2||''}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(upperRows(rows)),'Attendance');
  const out=XLSX.write(wb,{type:'array',bookType:'xlsx'}); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/octet-stream'})); a.download=`AHBA_attendance_${date}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),9000);
  showToast('Attendance exported');
}
async function exportGateLog(){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  if(!gateRows.length){showToast('No vehicle log to export');return}
  const date=$('#attDate')?.value||manilaToday();
  const rows=gateRows.map(g=>({'TIME':fmtWhen(g.checked_at),'TYPE':(g.gate_type==='incoming'?'INCOMING':'OUTGOING'),'TEAM':g.team||'','ACCOUNT':g.account||'','PLATE NO.':g.plate_no||'','ODOMETER (KM)':(g.odometer!=null?g.odometer:''),'FUEL':g.fuel_level||'','DRIVER':g.crew_driver||'','TECH 1':g.crew_tech1||'','TECH 2':g.crew_tech2||'','CREW OK':(g.gate_type==='incoming'?'':(g.crew_ok?'YES':'NO')),'CREW REMARKS':g.crew_remarks||'','VEHICLE REMARKS':g.vehicle_remarks||'','VALIDATED BY':g.security_user||'','DATE':g.work_date||date}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(upperRows(rows)),'Vehicle log');
  const out=XLSX.write(wb,{type:'array',bookType:'xlsx'}); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/octet-stream'})); a.download=`AHBA_vehicle_log_${date}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),9000);
  showToast('Vehicle log exported');
}

// ---------- Completed jobs · proof photos · validation · export ----------
const photoBase = p => `${SUPA_URL}/storage/v1/object/public/job-photos/${p}`;
let compJobs=[], compPhotos={};
async function fetchCompleted(date){
  // Filter the day on the SERVER (Manila range) so we never hit the 1000-row cap and any
  // past date loads. Prefer completed_at (fixed at completion); fall back to updated_at for
  // older rows that have no completed_at yet — works regardless of backfill/deploy order.
  const s=(date+'T00:00:00+08:00').replace('+','%2B'), e=(date+'T23:59:59.999+08:00').replace('+','%2B');
  const or=`or=(and(completed_at.gte.${s},completed_at.lte.${e}),and(completed_at.is.null,updated_at.gte.${s},updated_at.lte.${e}))`;
  try{
    const q=`status=eq.completed&${or}&select=*&order=updated_at.desc&limit=2000`;
    const r=await fetch(`${SUPA_URL}/rest/v1/jobs?${q}`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    if(!r.ok){ try{ fetchCompleted._err='HTTP '+r.status+' — '+(await r.text()).slice(0,140); }catch(_){ fetchCompleted._err='HTTP '+r.status; } return []; }
    fetchCompleted._err=''; return await r.json();
  }catch(e2){ fetchCompleted._err=String(e2&&e2.message||e2); return[]; }
}
async function fetchPhotosFor(ids){
  if(!ids.length)return{};
  try{
    const q=ids.map(encodeURIComponent).join(',');
    const r=await fetch(`${SUPA_URL}/rest/v1/job_photos?select=job_id,path,label&job_id=in.(${q})`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[]; const m={}; rows.forEach(x=>{(m[x.job_id]=m[x.job_id]||[]).push({path:x.path,label:x.label||''})}); return m;
  }catch(e){return{}}
}
async function renderCompleted(){
  const dEl=$('#compDate'); if(dEl&&!dEl.value){dEl.value=manilaToday();dEl.onchange=renderCompleted;}
  const _cb=$('#clearBtn'); if(_cb) _cb.style.display=dashCanEdit('completed')?'':'none';   // Clear photos = GC-only
  const date=dEl?dEl.value:manilaToday();
  const body=$('#completedBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="7" class="empty-cell">Loading…</td></tr>`;
  compJobs=await fetchCompleted(date);
  compPhotos=await fetchPhotosFor(compJobs.map(j=>j.id));
  const totalPhotos=Object.values(compPhotos).reduce((a,b)=>a+b.length,0);
  const val=compJobs.filter(j=>j.validated).length;
  $('#compTotal').textContent=compJobs.length;
  $('#compValidated').textContent=val;
  $('#compPending').textContent=compJobs.length-val;
  $('#compPhotos').textContent=totalPhotos;
  if(!compJobs.length){body.innerHTML=`<tr><td colspan="7" class="empty-cell">No completed jobs for this day.</td></tr>`;return}
  body.innerHTML=compJobs.map(j=>{
    const n=(compPhotos[j.id]||[]).length;
    const vb=j.validated
      ? `<span class="vbadge yes">Validated</span><div style="font-size:8px;color:#8a9894;margin-top:2px">${j.validated_by?('by '+esc(j.validated_by)):''}${j.validated_at?((j.validated_by?' · ':'')+fmtWhen(j.validated_at)):''}</div>`
      : '<span class="vbadge no">Pending</span>';
    return `<tr><td><strong>${j.id}</strong></td><td>${j.team||'—'}</td><td><strong>${esc(j.subscriber||'—')}</strong></td><td>${esc(j.area||'—')}</td><td>${fmtWhen(j.updated_at)}</td><td><button class="assign-btn" data-gallery="${j.id}">${n} photo${n===1?'':'s'} · View</button></td><td>${vb}${(j.validated||!dashCanEdit('completed'))?'':` <button class="assign-btn" data-validate="${j.id}">Validate</button>`}</td></tr>`;
  }).join('');
  $$('#completedBody [data-gallery]').forEach(b=>b.onclick=()=>openGallery(b.dataset.gallery));
  $$('#completedBody [data-validate]').forEach(b=>b.onclick=()=>validateJob(b.dataset.validate));
}
function openGallery(jobId){
  const j=compJobs.find(x=>x.id===jobId)||{}; const paths=compPhotos[jobId]||[];
  $('#photoTitle').textContent=`${jobId} · ${j.subscriber||''}`;
  $('#photoSub').textContent=`${j.team||''} · ${j.area||''}${j.primary_no?' · '+j.primary_no:''}${j.job_order_no?' · JO '+j.job_order_no:''} · ${paths.length} photo${paths.length===1?'':'s'}`;
  $('#photoGrid').innerHTML=paths.length?paths.map((p,i)=>`<a class="ph" href="${photoBase(p.path)}" target="_blank" rel="noopener" title="${(p.label||('Photo '+(i+1)))} — open in new window" style="position:relative"><img src="${photoBase(p.path)}" alt="${p.label||('proof '+(i+1))}" loading="lazy"><span style="position:absolute;left:0;right:0;bottom:0;background:rgba(8,44,40,.78);color:#fff;font-size:7.5px;font-weight:700;padding:3px 4px;line-height:1.2">${p.label||('#'+(i+1))}</span></a>`).join(''):'<div class="none">No photos uploaded for this job.</div>';
  $$('#photoGrid .ph').forEach(a=>a.onclick=e=>{e.preventDefault();window.open(a.href,'_blank','noopener,noreferrer');});
  const vb=$('#validateBtn'); vb.style.display=(j.validated||!dashCanEdit('completed'))?'none':''; vb.onclick=()=>{validateJob(jobId);closeModals();};
  openModal($('#photoModal'));
}
async function validateJob(jobId){
  if(!dashCanEdit('completed')){ showToast('QA validation is GC-only'); return; }
  const who=(window.dashUser&&(window.dashUser.display_name||window.dashUser.username))||'Console';
  const now=new Date().toISOString();
  try{
    await fetch(`${SUPA_URL}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({validated:true,validated_at:now,validated_by:who})});
    const cj=compJobs.find(x=>x.id===jobId); if(cj){ cj.validated=true; cj.validated_at=now; cj.validated_by=who; }
    showToast(`${jobId} validated (by ${who})`); renderCompleted();
  }catch(e){showToast('Could not validate')}
}
async function exportZip(){
  try{ await ensureXLSX(); await ensureJSZip(); }catch(_){ showToast('Export libraries failed to load'); return; }
  if(!compJobs.length){showToast('Nothing to export for this day');return}
  const date=$('#compDate').value||manilaToday();
  showToast('Building archive (Excel + photos)…');
  await loadAgentNames();
  const zip=new JSZip();

  // --- Excel with all subscriber info (matches the NEW LOADS layout) ---
  const rows=compJobs.map(j=>({
    'DATE': j.load_date||(j.updated_at?dayStr(j.updated_at):''),
    'DISPATCH STATUS': j.dispatch_status||'',
    'TEAM ASSIGNED': j.team||'',
    'DRIVER': j.driver||'',
    'TECH1': j.tech1||'',
    'MAPPING TEAM': j.mapping_team||'',
    'MAPPING REMARKS': j.mapping_remarks||'',
    'DISPATCHED REMARKS': j.dispatched_remarks||'',
    'IBASS ACCT NO.': j.ibass_acct_no||'',
    'JOB ORDER NO.': j.job_order_no||'',
    'VAS NO': j.vas_no||'',
    '1P OR 2P': j.play_type||'',
    'SPECIAL NOTE': j.special_note||'',
    'REF NO.': j.ref_no||'',
    'NEW REF #': j.new_ref||'',
    'PRIMARY NO.': j.primary_no||'',
    'OTHER CONTACT NO.': j.other_contact_no||'',
    'FIRST NAME': j.first_name||'',
    'MIDDLE NAME': j.middle_name||'',
    'LAST NAME': j.last_name||'',
    'HOUSE NO.': j.house_no||'',
    'STREET NAME': j.street_name||'',
    'VILLAGE / SUBDIVISION': j.village||'',
    'BRGY': j.brgy||'',
    'CITY': j.city||j.area||'',
    'SALES AGENT': agentLabel(j.created_by),
    'IN-CHARGE': j.in_charge||'',
    'SOURCE OF SALES': j.source_of_sales||'',
    'REFERRAL NAME': j.referral_name||'',
    'PLAN': j.plan||'',
    'PRIORITY': j.priority||'',
    'ACCOUNT': j.work_account||'',
    'DRIVER (CREW)': j.crew_driver||'',
    'TECH 1 (CREW)': j.crew_tech1||'',
    'TECH 2 (CREW)': j.crew_tech2||'',
    'MODE OF PAYMENT': j.payment_mode||'',
    'AMOUNT': (j.payment_amount!=null?j.payment_amount:''),
    'AR NO.': j.ar_no||'',
    'COMPLETED AT': j.updated_at?fmtWhen(j.updated_at):'',
    'VALIDATED': j.validated?'YES':'NO',
    'PHOTOS': (compPhotos[j.id]||[]).length,
    'WO ID': j.id
  }));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(upperRows(rows)), 'Completed');
  zip.file(`AHBA_completed_${date}.xlsx`, XLSX.write(wb,{type:'array',bookType:'xlsx'}));

  // --- Photos: one folder per subscriber, files named with the subscriber name ---
  const photosRoot=zip.folder('photos'); const used={};
  for(const j of compJobs){
    const paths=compPhotos[j.id]||[]; if(!paths.length)continue;
    let name=safeName(j.subscriber || [j.first_name,j.last_name].filter(Boolean).join(' '));
    if(used[name]){ used[name]++; name=`${name} (${used[name]})`; } else used[name]=1;
    const folder=photosRoot.folder(`${name} - ${j.id}`);
    const lblUsed={};
    for(let i=0;i<paths.length;i++){
      const p=paths[i]; const lbl=safeName(p.label||('Photo '+(i+1)));
      lblUsed[lbl]=(lblUsed[lbl]||0)+1; const suffix=lblUsed[lbl]>1?` (${lblUsed[lbl]})`:'';
      try{ const blob=await (await fetch(photoBase(p.path))).blob(); folder.file(`${name} - ${lbl}${suffix}.jpg`, blob); }
      catch(e){ console.warn('zip fetch',e.message); }
    }
  }

  const out=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(out); a.download=`AHBA_completed_${date}.zip`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),15000);
  showToast('Archive downloaded (Excel + photos)');
}
async function clearCloud(){
  if(!dashCanEdit('completed')){ showToast('Clearing QA photos is GC-only'); return; }
  const date=$('#compDate').value||manilaToday();
  if(!compJobs.length){showToast('Nothing to clear for this day');return}
  const allPaths=compJobs.flatMap(j=>(compPhotos[j.id]||[]).map(p=>p.path));
  if(!allPaths.length){showToast('No photos to clear');return}
  if(!confirm(`Delete ${allPaths.length} photo(s) from the cloud for ${date}?\n\nDownload the ZIP archive FIRST. Job records are kept — only the images are removed. This cannot be undone.`))return;
  showToast('Clearing photos from cloud…');
  try{
    for(let i=0;i<allPaths.length;i+=100){
      await fetch(`${SUPA_URL}/storage/v1/object/job-photos`,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json'},body:JSON.stringify({prefixes:allPaths.slice(i,i+100)})});
    }
    const q=compJobs.map(j=>encodeURIComponent(j.id)).join(',');
    await fetch(`${SUPA_URL}/rest/v1/job_photos?job_id=in.(${q})`,{method:'DELETE',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),Prefer:'return=minimal'}});
    showToast('Cloud photos cleared'); renderCompleted();
  }catch(e){showToast('Clear failed: '+e.message)}
}

// ---------- Load History (weekly archive of all loads) ----------
function jobToRow(j,nPhotos){
  return {
    'DATE': j.load_date||(j.updated_at?dayStr(j.updated_at):''),
    'DISPATCH STATUS': j.dispatch_status||'',
    'STATUS': statusLabel(j.status||''),
    'TEAM ASSIGNED': j.team||'',
    'DRIVER': j.driver||'', 'TECH1': j.tech1||'', 'MAPPING TEAM': j.mapping_team||'',
    'MAPPING REMARKS': j.mapping_remarks||'', 'DISPATCHED REMARKS': j.dispatched_remarks||'',
    'IBASS ACCT NO.': j.ibass_acct_no||'', 'JOB ORDER NO.': j.job_order_no||'', 'VAS NO': j.vas_no||'',
    '1P OR 2P': j.play_type||'', 'SPECIAL NOTE': j.special_note||'', 'REF NO.': j.ref_no||'', 'NEW REF #': j.new_ref||'',
    'PRIMARY NO.': j.primary_no||'', 'OTHER CONTACT NO.': j.other_contact_no||'',
    'FIRST NAME': j.first_name||'', 'MIDDLE NAME': j.middle_name||'', 'LAST NAME': j.last_name||'',
    'HOUSE NO.': j.house_no||'', 'STREET NAME': j.street_name||'', 'VILLAGE / SUBDIVISION': j.village||'',
    'BRGY': j.brgy||'', 'CITY': j.city||j.area||'',
    'SALES AGENT': agentLabel(j.created_by), 'IN-CHARGE': j.in_charge||'', 'SOURCE OF SALES': j.source_of_sales||'', 'REFERRAL NAME': j.referral_name||'',
    'PLAN': j.plan||'', 'PRIORITY': j.priority||'', 'DISPATCH COUNT': j.dispatch_count||0,
    'ACCOUNT': j.work_account||'', 'DRIVER (CREW)': j.crew_driver||'', 'TECH 1 (CREW)': j.crew_tech1||'', 'TECH 2 (CREW)': j.crew_tech2||'',
    'MODE OF PAYMENT': j.payment_mode||'', 'AMOUNT': (j.payment_amount!=null?j.payment_amount:''), 'AR NO.': j.ar_no||'',
    'NEGATIVE REMARK': j.negative_remark||'', 'LAST UPDATE': j.updated_at?fmtWhen(j.updated_at):'',
    'VALIDATED': j.validated?'YES':'NO', 'WO ID': j.id
  };
}
function findJob(id){ return jobs.find(x=>x.id===id)||histJobs.find(x=>x.id===id)||(Array.isArray(histDeleted)?histDeleted.find(x=>x.id===id):null)||compJobs.find(x=>x.id===id)||valJobs.find(x=>x.id===id)||(Array.isArray(dashHist)?dashHist.find(x=>x.id===id):null)||null; }
let histJobs=[], histDeleted=[];
async function renderHistory(){
  const fromEl=$('#histFrom'), toEl=$('#histTo'), body=$('#historyBody'); if(!body)return;
  if(toEl&&!toEl.value) toEl.value=manilaToday();
  if(fromEl&&!fromEl.value){ const d=new Date(); d.setDate(d.getDate()-6); fromEl.value=d.toLocaleDateString('en-CA',{timeZone:TZ}); }
  if(fromEl)fromEl.onchange=renderHistory; if(toEl)toEl.onchange=renderHistory;
  const from=fromEl.value, to=toEl.value;
  body.innerHTML=`<tr><td colspan="8" class="empty-cell">Loading…</td></tr>`;
  await loadAgentNames();
  let all=[]; try{ const r=await fetch(`${SUPA_URL}/rest/v1/jobs?select=*&order=updated_at.desc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); all=r.ok?await r.json():[]; }catch(e){}
  const dayOf=j=> j.load_date?String(j.load_date).slice(0,10) : (j.updated_at?new Date(j.updated_at).toLocaleDateString('en-CA',{timeZone:TZ}):'');
  const isSuper=!!(window.dashUser&&window.dashUser.is_super);
  const inRange=all.filter(j=>{const d=dayOf(j);return d&&d>=from&&d<=to;});
  histJobs=inRange.filter(j=>!j.deleted_at);                  // live set → stats, export, normal table
  histDeleted=isSuper ? inRange.filter(j=>j.deleted_at) : []; // soft-deleted set → Superadmin only
  $('#histTotal').textContent=histJobs.length;
  $('#histCompleted').textContent=histJobs.filter(j=>j.status==='completed').length;
  $('#histNegative').textContent=histJobs.filter(j=>j.negative_remark).length;
  $('#histCancelled').textContent=histJobs.filter(j=>j.status==='cancelled').length;
  // Team filter from the loads in range (preserve current pick).
  const teamSel=$('#histfTeam');
  if(teamSel){ const cur=teamSel.value; const teams=[...new Set(histJobs.concat(histDeleted).map(j=>j.team).filter(Boolean))].sort();
    teamSel.innerHTML='<option value="">All teams</option>'+teams.map(t=>`<option value="${t}">${t}</option>`).join('');
    if(teams.includes(cur)) teamSel.value=cur; }
  // Superadmin-only "🗑 Deleted" status option (soft-deleted loads still viewable here).
  const stSel=$('#histfStatus');
  if(stSel){
    let delOpt=stSel.querySelector('option[value="deleted"]');
    if(isSuper){ if(!delOpt){ delOpt=document.createElement('option'); delOpt.value='deleted'; stSel.appendChild(delOpt); } delOpt.textContent=`🗑 Deleted (${histDeleted.length})`; }
    else if(delOpt){ if(stSel.value==='deleted') stSel.value=''; delOpt.remove(); }
    if(!stSel.dataset.wired){ stSel.dataset.wired='1'; stSel.onchange=renderHistoryRows; if(teamSel) teamSel.onchange=renderHistoryRows; }
  }
  renderHistoryRows();
}
// Render the weekly-load-log table from histJobs, applying the Status + Team filters.
function renderHistoryRows(){
  const body=$('#historyBody'); if(!body) return;
  const st=($('#histfStatus')&&$('#histfStatus').value)||'', tm=($('#histfTeam')&&$('#histfTeam').value)||'';
  const dayOf=j=> j.load_date?String(j.load_date).slice(0,10) : (j.updated_at?new Date(j.updated_at).toLocaleDateString('en-CA',{timeZone:TZ}):'');
  let rows;
  if(st==='deleted'){ rows=(histDeleted||[]); }                 // Superadmin: the soft-deleted loads
  else { rows=(histJobs||[]); if(st) rows=rows.filter(j=>(j.status||'')===st); }
  if(tm) rows=rows.filter(j=>(j.team||'')===tm);
  if(!rows.length){ body.innerHTML=`<tr><td colspan="8" class="empty-cell">No loads match the filter.</td></tr>`; return; }
  body.innerHTML=rows.map(j=>{
    const del=!!j.deleted_at;
    const stCell=del?`<span class="status cancelled" title="Deleted by ${esc(j.deleted_by||'—')}">🗑 Deleted</span>`:`<span class="status ${j.status}">${statusLabel(j.status||'')}</span>`;
    return `<tr data-detail="${j.id}" style="cursor:pointer${del?';opacity:.65':''}"><td>${dayOf(j)}</td><td><strong>${j.id}</strong></td><td>${j.job_order_no||'—'}</td><td><strong>${esc(j.subscriber||'—')}</strong></td><td>${j.team||'—'}</td><td>${stCell}</td><td>⟳ ${j.dispatch_count||0}</td><td>${esc(j.area||j.city||'—')}</td></tr>`;
  }).join('');
  $$('#historyBody [data-detail]').forEach(r=>r.onclick=()=>openJobDetail(r.dataset.detail));
}
async function exportHistoryExcel(){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  if(!histJobs.length){showToast('Nothing to export for this range');return}
  await loadAgentNames();
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(upperRows(histJobs.map(j=>jobToRow(j)))), 'Load History');
  const out=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/octet-stream'})); a.download=`AHBA_load_history_${$('#histFrom').value}_to_${$('#histTo').value}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),10000);
  showToast('Load history exported (Excel)');
}

// ---------- Remittance (daily team collections) ----------
let remJobs=[];
function currentOperator(){ const u=window.dashUser; const nm=u?(u.display_name||u.username):'Allec Zandre A. Halili'; const rl=u?(u.is_super?'Superadmin':(u.role_label||'')):''; return nm+(rl?(' ('+rl+')'):''); }
async function renderRemittance(){
  const dEl=$('#remDate'); if(dEl&&!dEl.value){dEl.value=manilaToday();dEl.onchange=renderRemittance;}
  const date=dEl?dEl.value:manilaToday();
  const body=$('#remittanceBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="9" class="empty-cell">Loading…</td></tr>`;
  const all=await fetchCompleted(date);
  // only loads with a declared collection (amount or payment mode)
  remJobs=all.filter(j=>(j.payment_amount!=null&&Number(j.payment_amount)>0)||j.payment_mode);
  const sb=$('#remSearch'); if(sb&&!sb._wired){ sb._wired=true; sb.oninput=remDraw; }
  remRefresh();
}
function remRefresh(){
  const sum=k=>remJobs.reduce((a,b)=>a+(k(b)||0),0);
  const totalCol=sum(j=>Number(j.payment_amount)||0);
  const recAmt=sum(j=>j.remittance_received?(Number(j.payment_amount)||0):0);
  const gcash=sum(j=>j.payment_mode==='Gcash'?(Number(j.payment_amount)||0):0);
  const cash=sum(j=>j.payment_mode==='Cash Remittance'?(Number(j.payment_amount)||0):0);
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  set('#remTotal',money(totalCol)); set('#remReceived',money(recAmt)); set('#remPending',money(totalCol-recAmt)); set('#remCount',remJobs.length+'');
  set('#remGcash',money(gcash)); set('#remCash',money(cash));
  remDraw();
}
function remDraw(){
  const body=$('#remittanceBody'); if(!body)return;
  const q=($('#remSearch')?.value||'').toLowerCase().trim();
  const list=remJobs.filter(j=>!q || (j.subscriber||'').toLowerCase().includes(q) || String(j.job_order_no||'').toLowerCase().includes(q) || String(j.id||'').toLowerCase().includes(q));
  if(!list.length){const err=fetchCompleted._err?` · ⚠ ${fetchCompleted._err}`:'';body.innerHTML=`<tr><td colspan="9" class="empty-cell">${remJobs.length?'No match for "'+q+'".':'No collections declared for this day.'+err}</td></tr>`;return}
  body.innerHTML=list.map(j=>{
    const amt=j.payment_amount!=null?money(j.payment_amount):'—';
    const recd=j.remittance_received
      ? `<span class="status completed">✓ Received</span><div style="font-size:8px;color:#8a9894;margin-top:2px">${j.remittance_received_by||''}${j.remittance_received_at?' · '+fmtWhen(j.remittance_received_at):''}</div>`
      : `<button class="assign-btn" data-received="${j.id}">Mark received</button>`;
    // Editable mode of payment (corrects technician mistakes; logged in history)
    const modeSel=`<select class="rem-mode" data-mode="${j.id}" style="font-size:9px;padding:3px 5px;border:1px solid #dfe5df;border-radius:7px"><option ${j.payment_mode==='Gcash'?'selected':''}>Gcash</option><option ${j.payment_mode==='Cash Remittance'?'selected':''}>Cash Remittance</option></select>`;
    return `<tr><td><strong>${j.id}</strong></td><td>${j.job_order_no||'—'}</td><td><strong>${j.team||'—'}</strong></td><td>${esc(j.work_account||'—')}</td><td>${esc(j.subscriber||'—')}</td><td>${modeSel}</td><td><strong>${amt}</strong></td><td>${esc(j.ar_no||'—')}</td><td>${recd}</td></tr>`;
  }).join('');
  $$('#remittanceBody [data-received]').forEach(b=>b.onclick=()=>markReceived(b.dataset.received));
  $$('#remittanceBody [data-mode]').forEach(s=>s.onchange=()=>editPaymentMode(s.dataset.mode, s.value));
}
async function editPaymentMode(jobId, mode){
  const j=remJobs.find(x=>x.id===jobId); if(!j||j.payment_mode===mode) return;
  const who=currentOperator(), now=new Date().toISOString(), prev=j.payment_mode||'—';
  const hist=appendHistory(j.history, `Mode of payment corrected: ${prev} → ${mode} (by ${who})`);
  try{
    await fetch(`${SUPA_URL}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({payment_mode:mode,history:hist,updated_at:now})});
    j.payment_mode=mode; j.history=hist; remRefresh(); showToast(`${jobId}: mode → ${mode}`);
  }catch(e){ showToast('Update failed: '+(e.message||e)); }
}
async function markReceived(jobId){
  const j=remJobs.find(x=>x.id===jobId); if(!j)return;
  const who=currentOperator(), now=new Date().toISOString();
  const hist=appendHistory(j.history, `Remittance received (${j.payment_mode||''} ${j.payment_amount!=null?money(j.payment_amount):''}${j.ar_no?' · AR '+j.ar_no:''}) by ${who}`);
  try{
    await fetch(`${SUPA_URL}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}`,{method:'PATCH',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({remittance_received:true,remittance_received_by:who,remittance_received_at:now,history:hist,updated_at:now})});
    j.remittance_received=true; j.remittance_received_by=who; j.remittance_received_at=now; j.history=hist;
    renderRemittance(); showToast(`${jobId}: remittance received`);
  }catch(e){ showToast('Could not mark received'); }
}
async function exportRemittance(){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  if(!remJobs.length){showToast('Nothing to export for this day');return}
  const rows=remJobs.map(j=>({
    'DATE': $('#remDate').value, 'WO ID': j.id, 'JOB ORDER NO.': j.job_order_no||'', 'TEAM': j.team||'',
    'ACCOUNT': j.work_account||'', 'DRIVER': j.crew_driver||'', 'SUBSCRIBER': j.subscriber||'',
    'MODE OF PAYMENT': j.payment_mode||'', 'AMOUNT': (j.payment_amount!=null?j.payment_amount:''), 'AR NO.': j.ar_no||'',
    'RECEIVED': j.remittance_received?'YES':'NO', 'RECEIVED BY': j.remittance_received_by||'', 'RECEIVED AT': j.remittance_received_at?fmtWhen(j.remittance_received_at):''
  }));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(upperRows(rows)), 'Remittance');
  const out=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/octet-stream'})); a.download=`AHBA_remittance_${$('#remDate').value}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),10000);
  showToast('Remittance exported (Excel)');
}

// ---------- Add Job Order (console intake → Validator, mirrors sales agent) ----------
let ordDocs={id:[],billing:[],premise:[]};
// Plan dropdowns for the console New work order form (match the mobile sales app)
const ORD_PLANS_SDU=['PLAN 999 - 100MBPS','PLAN 1500 - 300MBPS','PLAN 1699 - 600MBPS / 400MBPS (VICE VERSA)','PLAN 2000 - 500MBPS','PLAN 2500 - 2500MBPS','PLAN 3000 - 700MBPS / 1GBPS (VICE VERSA)','PLAN 3500 - 1GBPS'];
const ORD_PLANS_MDU=['PLAN 999 - 100MBPS','PLAN 1399 - 200MBPS','PLAN 1500 - 300MBPS','PLAN 2000 - 500MBPS'];
const ORD_PLANS_MDU_DOCSIS=['SKY FIBER 999 - 100MBPS','SKY FIBER 1399 - 200MBPS','SKY FIBER 1500 - 300MBPS','SKY FIBER 2000 - 500MBPS'];
const ORD_ADDONS=['SKY TV 99','SKY TV 299','SKY TV 499'];
// Quezon City barangays grouped by legislative district (1–6). Source: PSA / Wikipedia.
const QC_BRGYS={
"1":["Alicia","Bagong Pag-asa","Bahay Toro","Balingasa","Bungad","Damar","Damayan","Del Monte","Katipunan","Lourdes","Maharlika","Manresa","Mariblo","Masambong","N.S. Amoranto","Nayong Kanluran","Paang Bundok","Pag-ibig sa Nayon","Paltok","Paraiso","Phil-Am","Project 6","Ramon Magsaysay","Saint Peter","Salvacion","San Antonio","San Isidro Labrador","San Jose","Santa Cruz","Santa Teresita","Sto. Cristo","Santo Domingo","Siena","Talayan","Vasra","Veterans Village","West Triangle"],
"2":["Bagong Silangan","Batasan Hills","Commonwealth","Holy Spirit","Payatas"],
"3":["Amihan","Bagumbayan","Bagumbuhay","Bayanihan","Blue Ridge A","Blue Ridge B","Camp Aguinaldo","Claro (Quirino 3-B)","Dioquino Zobel","Duyan-duyan","E. Rodriguez","East Kamias","Escopa I","Escopa II","Escopa III","Escopa IV","Libis","Loyola Heights","Mangga","Marilag","Masagana","Matandang Balara","Milagrosa","Pansol","Quirino 2-A","Quirino 2-B","Quirino 2-C","Quirino 3-A","St. Ignatius","San Roque","Silangan","Socorro","Tagumpay","Ugong Norte","Villa Maria Clara","West Kamias","White Plains"],
"4":["Bagong Lipunan ng Crame","Botocan","Central","Damayang Lagi","Don Manuel","Doña Aurora","Doña Imelda","Doña Josefa","Horseshoe","Immaculate Concepcion","Kalusugan","Kamuning","Kaunlaran","Kristong Hari","Krus na Ligas","Laging Handa","Malaya","Mariana","Obrero","Old Capitol Site","Paligsahan","Pinagkaisahan","Pinyahan","Roxas","Sacred Heart","San Isidro Galas","San Martin de Porres","San Vicente","Santol","Sikatuna Village","South Triangle","Santo Niño","Tatalon","Teacher's Village East","Teacher's Village West","U.P. Campus","U.P. Village","Valencia"],
"5":["Bagbag","Capri","Fairview","Gulod","Greater Lagro","Kaligayahan","Nagkaisang Nayon","North Fairview","Novaliches Proper","Pasong Putik Proper","San Agustin","San Bartolome","Sta. Lucia","Sta. Monica"],
"6":["Apolonio Samson","Baesa","Balon Bato","Culiat","New Era","Pasong Tamo","Sangandaan","Sauyo","Talipapa","Tandang Sora","Unang Sigaw"]
};
function populateOrdBrgys(dist){
  const sel=$('#ord_brgy'); if(!sel) return; const cur=sel.value;
  const list=QC_BRGYS[String(dist)]||[];
  sel.innerHTML=list.length?'<option value="">— Select barangay —</option>'+list.map(b=>`<option>${b}</option>`).join(''):'<option value="">— Select district first —</option>';
  if(list.includes(cur)) sel.value=cur;
}
function ordPopulatePlans(){
  const dw=($('#ord_dwelling')&&$('#ord_dwelling').value)||'SDU';
  const list=dw==='MDU DOCSIS'?ORD_PLANS_MDU_DOCSIS:(dw==='MDU'?ORD_PLANS_MDU:ORD_PLANS_SDU);
  const sel=$('#ord_plan'); if(sel){ const cur=sel.value; sel.innerHTML='<option value="">— Select plan —</option>'+list.map(p=>`<option>${p}</option>`).join(''); sel.value=list.includes(cur)?cur:''; }
  const ad=$('#ord_addon'); if(ad && !ad.options.length){ ad.innerHTML='<option value="">— None —</option>'+ORD_ADDONS.map(a=>`<option>${a}</option>`).join(''); }
}
function ordToggleAddonCount(){ const on=($('#ord_play')&&$('#ord_play').value)==='2-PLAY'; const w=$('#ord_addon_count_wrap'); if(w) w.style.display=on?'':'none'; if(!on&&$('#ord_addon_count')) $('#ord_addon_count').value=''; }
// New Job Order has 3 types: SLI (full + docs), Migration (current/new plan, amount, ref · no docs),
// SLR (ticket no. only · no service, no docs). Subscriber + Address are shared by all.
function setOrderType(t){
  t=t||'SLI';
  const form=$('#orderForm'); if(form) form.dataset.ordtype=t;
  $$('#ordTypeTabs [data-ordtype]').forEach(b=>b.classList.toggle('active',b.dataset.ordtype===t));
  const show=(id,on)=>{const el=$('#'+id); if(el) el.style.display=on?'':'none';};
  show('ordSecService', t==='SLI');
  show('ordSecMigration', t==='Migration');
  show('ordSecSlr', t==='SLR');
  show('ordSecDocs', t==='SLI');
  const btn=$('#orderSubmit'); if(btn) btn.textContent=(t==='SLI')?'Submit for validation':'Dispatch Load';
}
let _sbc=null;
function sbc(){ if(typeof dashAuth!=='undefined' && dashAuth) return dashAuth; /* authenticated client */ if(!_sbc && window.supabase?.createClient) _sbc=window.supabase.createClient(SUPA_URL,SUPA_KEY); return _sbc; }
function compressImage(file,maxDim=1000,targetKB=90){
  return new Promise(resolve=>{
    if(!file || !(file.type||'').startsWith('image/')){ resolve(file); return; }
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=async()=>{
      let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
      let scale=Math.min(1,maxDim/Math.max(w,h)); w=Math.round(w*scale); h=Math.round(h*scale);
      const draw=(ww,hh)=>{const c=document.createElement('canvas');c.width=ww;c.height=hh;c.getContext('2d').drawImage(img,0,0,ww,hh);return c;};
      let cv=draw(w,h);
      const toBlob=(c,q)=>new Promise(r=>c.toBlob(b=>r(b),'image/jpeg',q));
      let q=0.5, blob=await toBlob(cv,q);
      while(blob && blob.size>targetKB*1024 && q>0.3){ q=Math.round((q-0.05)*100)/100; blob=await toBlob(cv,q); }
      if(blob && blob.size>targetKB*1024 && Math.max(w,h)>720){ w=Math.round(w*0.75); h=Math.round(h*0.75); cv=draw(w,h); blob=await toBlob(cv,0.4); }
      URL.revokeObjectURL(url); resolve(blob||file);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); resolve(file); };
    img.src=url;
  });
}
async function submitOrder(e){
  e.preventDefault();
  const f=Object.fromEntries(new FormData($('#orderForm')));
  const err=m=>{const el=$('#orderErr'); if(el)el.textContent=m||'';};
  err('');
  const t=v=>(v||'').trim();
  const ordType=($('#orderForm').dataset.ordtype)||'SLI';   // SLI · Migration · SLR
  const fn=t(f.first_name), ln=t(f.last_name), dist=t(f.district), brgy=t(f.brgy), city=t(f.city)||'QUEZON CITY', pno=t(f.primary_no), ono=t(f.other_contact_no);
  if(!fn||!ln||!pno||!dist||!brgy){ err('Please fill: first & last name, primary no., district, and barangay.'); return; }
  if(!/^\d{11}$/.test(pno)){ err('Primary no. must be exactly 11 digits (numbers only).'); return; }
  if(ono && !/^\d{11}$/.test(ono)){ err('Other contact no. must be 11 digits (numbers only).'); return; }
  if(ordType==='SLI'){
    if(f.play_type==='2-PLAY' && !t(f.addon_count)){ err('For 2-PLAY, select how many add-ons are included.'); return; }
    if(!ordDocs.id.length){ err('A Valid ID photo is required.'); return; }
  }
  if(ordType==='SLR' && !t(f.ticket_no)){ err('Ticket No. is required for SLR Loads.'); return; }
  const client=sbc(); if(!client){ err('Cloud client still loading — try again in a moment.'); return; }
  const btn=$('#orderSubmit'); btn.disabled=true; btn.textContent='Submitting…';
  const full=[fn,t(f.middle_name),ln].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  const addr=[t(f.house_no),t(f.street_name),t(f.village),brgy,'District '+dist,city].filter(Boolean).join(', ');
  const jobId='WO-'+new Date().getFullYear()+'-'+Date.now().toString().slice(-6);
  const svcType={SLI:'Installation',Migration:'Migration',SLR:'SLR'}[ordType];
  // SLI goes to the Validator first; Migration & SLR go straight to For Dispatch.
  const toValidate=(ordType==='SLI');
  const job={id:jobId,subscriber:full,service_type:svcType,area:city,address:addr,status:(toValidate?'for_validation':'pending'),wait_time:'Just now',priority:'Normal',schedule:manilaToday()+', 9:00 AM',team:null,created_by:'CONSOLE',load_type:ordType,load_date:(toValidate?null:manilaToday()),
    first_name:fn,middle_name:t(f.middle_name),last_name:ln,primary_no:pno,other_contact_no:ono,
    house_no:t(f.house_no),street_name:t(f.street_name),village:t(f.village),district:dist,brgy:brgy,city:city,
    updated_at:new Date().toISOString()};
  if(ordType==='SLI'){
    Object.assign(job,{plan:t(f.plan),ref_no:t(f.ref_no),play_type:f.play_type,source_of_sales:f.source_of_sales,referral_name:t(f.referral_name),
      dwelling_type:f.dwelling_type,install_fee_type:f.install_fee_type,
      amount_to_collect:(t(f.amount_to_collect)!==''?Number(t(f.amount_to_collect)):null),
      add_on:t(f.add_on),addon_count:(f.play_type==='2-PLAY'&&t(f.addon_count)!==''?Number(t(f.addon_count)):null),
      special_note:t(f.special_note)});
  } else if(ordType==='Migration'){
    Object.assign(job,{current_plan:t(f.current_plan),plan:t(f.mig_plan),ref_no:t(f.mig_ref),
      amount_to_collect:(t(f.mig_amount)!==''?Number(t(f.mig_amount)):null),special_note:t(f.mig_note)});
  } else { // SLR
    Object.assign(job,{ticket_no:t(f.ticket_no),special_note:t(f.slr_note)});
  }
  try{
    const {error}=await client.from('jobs').insert(job); if(error) throw error;
    if(ordType==='SLI') for(const cat of ['id','billing','premise']){
      for(let i=0;i<ordDocs[cat].length;i++){
        const blob=await compressImage(ordDocs[cat][i]);
        const path=`${jobId}/docs/${cat}_${Date.now()}_${i}.jpg`;
        const {error:e2}=await client.storage.from('job-photos').upload(path,blob,{contentType:'image/jpeg',upsert:false}); if(e2) throw e2;
        await client.from('job_docs').insert({job_id:jobId,category:cat,path});
      }
    }
    ordDocs={id:[],billing:[],premise:[]};
    $('#orderForm').reset(); $$('#orderModal [data-cnt]').forEach(b=>b.textContent='0 file(s)'); populateOrdBrgys(''); if($('#ord_city')) $('#ord_city').value='QUEZON CITY'; setOrderType('SLI');
    closeModals(); showToast(toValidate?'Job order submitted to the Validator':`${ordType} load dispatched → For Dispatch`);
    refreshValBadge(); if($('#validationPage')?.classList.contains('active')) renderValidation();
    if(!toValidate){ if(window.AHBACloud&&AHBACloud.getJobs){ try{ jobs=await AHBACloud.getJobs(); localStorage.setItem('fieldflow_jobs',JSON.stringify(jobs)); }catch(e){} } renderJobs(); if($('#timelinePage')?.classList.contains('active'))renderTimeline(); }
  }catch(e2){ err('Submit failed: '+(e2.message||e2)); }
  btn.disabled=false; btn.textContent=(($('#orderForm').dataset.ordtype)==='SLI'?'Submit for validation':'Dispatch Load');
}

// ---------- Dashboard login + role-based access ----------
const PAGE_KEYS=[['overview','Overview'],['validation','Validator'],['timeline','Dashboard'],['teams','Field Teams'],['workorders','Work Orders'],['expenses','Expenses'],['attendance','Attendance'],['completed','Completed'],['remittance','Remittance'],['history','Load History']];
let dashAuth=null; window.dashUser=null;
const dashEmailFor=u=>u.trim().toLowerCase()+'@ahbadash.app';
const DH=()=>({apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json'});
function dgErr(id,msg){const e=$(id); if(!e)return; e.textContent=msg||''; e.classList.toggle('show',!!msg);}
function startDashAuth(){
  if(!window.supabase?.createClient){ console.warn('supabase-js not loaded'); return; }
  dashAuth=window.supabase.createClient(SUPA_URL,SUPA_KEY);
  // keep the REST token + realtime auth in sync with the session (handles token refresh)
  dashAuth.auth.onAuthStateChange((_e,session)=>{ window.__ahbaTok = session?.access_token || null; setRealtimeAuth(window.__ahbaTok); });
  dashAuth.auth.getSession().then(({data})=>{
    window.__ahbaTok = data.session?.access_token || null;
    const _last=Number(localStorage.getItem('ahba_dash_active')||0);
    const _idle=_last>0 && (Date.now()-_last > 48*3600*1000);   // auto-logout after 48h of NOT opening the console
    if(data.session&&data.session.user&&!_idle){ _dashTouch(); onDashLogin(data.session.user.email); }
    else { if(data.session&&_idle){ try{ dashAuth.auth.signOut(); }catch(_){} } showDashGate('#dashGate'); }
  });
}
// Keep the console "last opened" timestamp fresh (auto-logout counts 48h of not opening; refresh/reopen stays logged in).
function _dashTouch(){ try{ localStorage.setItem('ahba_dash_active', String(Date.now())); }catch(_){} }
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) _dashTouch(); });
setInterval(_dashTouch, 5*60*1000);
// Apply the user token to realtime clients so live updates work under authenticated-only RLS
function setRealtimeAuth(tok){
  try{ if(window.AHBACloud&&AHBACloud.realtime) AHBACloud.realtime.realtime.setAuth(tok||SUPA_KEY); }catch(e){}
  try{ if(window.__cwClient) window.__cwClient.realtime.setAuth(tok||SUPA_KEY); }catch(e){}
}
function showDashGate(which){ ['#dashGate','#dashPwGate'].forEach(g=>{const el=$(g); if(el)el.style.display=(g===which)?'flex':'none';}); }
function hideDashGates(){ ['#dashGate','#dashPwGate'].forEach(g=>{const el=$(g); if(el)el.style.display='none';}); }
async function fetchDashUser(email){
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/dashboard_users?email=eq.${encodeURIComponent(email)}&select=*`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); const rows=r.ok?await r.json():[]; return rows[0]||null; }catch(e){ return null; }
}
async function onDashLogin(email){
  try{ const {data:s}=await dashAuth.auth.getSession(); window.__ahbaTok=s.session?.access_token||null; setRealtimeAuth(window.__ahbaTok); }catch(e){}
  const u=await fetchDashUser(email);
  if(!u){ dgErr('#dlErr','This account is not registered as a dashboard user.'); try{await dashAuth.auth.signOut();}catch(e){} showDashGate('#dashGate'); return; }
  window.dashUser=u;
  fetch(`${SUPA_URL}/rest/v1/dashboard_users?username=eq.${encodeURIComponent(u.username)}`,{method:'PATCH',headers:DH(),body:JSON.stringify({last_login:new Date().toISOString()})}).catch(()=>{});
  if(u.must_change){ showDashGate('#dashPwGate'); return; }
  hideDashGates(); applyAccess(u); loadOrgMap();   // load orgs AFTER auth so the GC org filter can populate
}
// Can the logged-in user EDIT this page? Superadmin = always; others need the page in edit_pages.
function dashCanEdit(page){ const u=window.dashUser; if(!u) return false; if(u.is_super) return true; return Array.isArray(u.edit_pages)&&u.edit_pages.includes(page); }
// View-only lock: if the user can view but not edit the active page, disable its action controls.
function applyViewOnlyLock(page){
  const u=window.dashUser; const sec=$(`#${page}Page`); if(!sec) return;
  const viewOnly = !!(u && !u.is_super && Array.isArray(u.allowed_pages) && u.allowed_pages.includes(page) && !dashCanEdit(page));
  sec.classList.toggle('view-only', viewOnly);
}
function applyAccess(u){
  let allowed = u.is_super ? PAGE_KEYS.map(p=>p[0]) : (Array.isArray(u.allowed_pages)?u.allowed_pages.slice():[]);
  // Dispatch Board is now inside the Dashboard — old 'dispatch' access grants the Dashboard.
  if(allowed.includes('dispatch') && !allowed.includes('timeline')) allowed.push('timeline');
  // Access Control: Superadmin sees the full panel; dispatchers see a limited view (reset technician PW only).
  $$('.nav-item').forEach(n=>{ const pg=n.dataset.page; if(pg==='access'){ n.style.display=(u.is_super||hasDispatchAccess(u))?'':'none'; } else if(pg==='subcon'){ n.style.display=u.is_super?'':'none'; } else { n.style.display=allowed.includes(pg)?'':'none'; } });
  $$('[data-action="new-order"]').forEach(b=>b.style.display=(u.is_super||allowed.includes('workorders'))?'':'none');
  // Hide the Overview expenses widgets from users without Expenses access (e.g. subcontractor console).
  const canExp=(u.is_super||allowed.includes('expenses'));
  $$('[data-go="expenses"], .expense-panel').forEach(el=>{ if(el) el.style.display=canExp?'':'none'; });
  const nameEl=$('.user-card strong'); if(nameEl) nameEl.textContent=u.display_name||u.username;
  const rl=$('#roleLabel'); if(rl) rl.textContent=u.is_super?'Superadmin':(u.role_label||'Dashboard user');
  const av=$('.user-card .avatar'); if(av) av.textContent=(u.display_name||u.username).split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
  const clr=$('#clearLoadsBtn'); if(clr) clr.style.display = hasDispatchAccess(u) ? 'inline-flex' : 'none';
  let first=(allowed[0]||'overview'); if(first==='dispatch')first='timeline';
  switchPage(first);
  renderAnnounceBar();
  startHealthWidget();
}
// Any dispatcher (dispatch access OR superadmin): wipe ALL loads/job orders from the board.
async function deleteAllLoads(){
  const u=window.dashUser;
  if(!hasDispatchAccess(u)){ showToast('No access to clear loads'); return; }
  if(!confirm('⚠️ This will clear ALL active loads/job orders from the dispatch board.\n\nThey are SOFT-deleted — hidden from everyone, but kept in the records and still viewable by the Superadmin (Billing Validation → 🗑 Deleted). Continue?')) return;
  const t=(prompt('To confirm, type: DELETE ALL')||'').trim();
  if(t!=='DELETE ALL'){ showToast('Cancelled — the confirmation did not match.'); return; }
  if(!await confirmActorPassword()) return;   // extra safety vs. accidental clears
  showToast('Clearing all loads…');
  try{
    const who=(window.dashUser&&(window.dashUser.display_name||window.dashUser.username))||'Console';
    const H={apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'};
    // Soft-delete the active loads only. Photos + docs are kept (the rows remain, so nothing orphans).
    const r=await fetch(`${SUPA_URL}/rest/v1/jobs?deleted_at=is.null`,{method:'PATCH',headers:H,body:JSON.stringify({deleted_at:new Date().toISOString(), deleted_by:who})});
    if(!r.ok){ throw new Error('HTTP '+r.status+' '+(await r.text()).slice(0,120)); }
    jobs=[]; try{ localStorage.setItem('fieldflow_jobs','[]'); }catch(e){}
    renderJobs(); renderOverview(); showToast('✓ All loads cleared (kept for Superadmin).');
  }catch(e){ showToast('Clear failed: '+e.message); }
}
function dashLogout(){ if(dashAuth) dashAuth.auth.signOut().catch(()=>{}); window.dashUser=null; closePopovers&&closePopovers(); showDashGate('#dashGate'); }
// Access Control page (superadmin)
let accessUsers=[];
// Dispatchers (non-super with dispatch access) get a limited Access Control: reset technician PW only.
function accessIsDispatcherOnly(){ const u=window.dashUser; return !!(u && !u.is_super && hasDispatchAccess(u)); }

// ================= SUBCONTRACTORS · multi-tenant provisioning (superadmin) =================
// Subcon console users get all operational pages EXCEPT Validator (QA is GC-only) + Access/Subcon.
const SUBCON_CONSOLE_PAGES=['overview','validation','timeline','teams','workorders','attendance','completed','remittance','history'];
// Editable pages for a subcontractor console user. Validator ('validation') + QA Validation ('completed')
// are VIEW-ONLY — subcon can see the status of their JOs, but only GC validates/approves/rejects.
const SUBCON_CONSOLE_EDIT=SUBCON_CONSOLE_PAGES.filter(p=>p!=='completed'&&p!=='validation');
let subOrgs=[], subSelId=null, subSelCode='', subSelName='';
async function scFetch(path){ try{ const r=await fetch(`${SUPA_URL}/rest/v1/${path}`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); return r.ok?await r.json():[]; }catch(e){ return []; } }
function scWrite(path,method,body){ return fetch(`${SUPA_URL}/rest/v1/${path}`,{method,headers:DH(),body:body?JSON.stringify(body):undefined}); }

async function renderSubcon(){
  const body=$('#scOrgBody'); if(!body) return;
  if(!(window.dashUser&&window.dashUser.is_super)){ body.innerHTML='<tr><td colspan="6" class="empty-row">Superadmin only.</td></tr>'; return; }
  const [orgs,dash,techs]=await Promise.all([
    scFetch('orgs?select=*&order=code.asc'),
    scFetch('dashboard_users?select=username,org_id'),
    scFetch('technicians?select=username,org_id')
  ]);
  subOrgs=orgs;
  const cnt=(arr,id)=>arr.filter(x=>x.org_id===id).length;
  body.innerHTML=orgs.map(o=>{
    const isGC=o.code==='AHBA';
    const status=o.active?'<span class="status en-route">● Active</span>':'<span class="status offline">Suspended</span>';
    const acts=isGC?'<span style="color:#8a9894">Your org</span>'
      :`<button class="assign-btn" data-scmanage="${o.id}">Manage</button> <button class="assign-btn" data-sctoggle="${o.id}">${o.active?'Suspend':'Activate'}</button>`;
    return `<tr data-scrow="${o.id}"${isGC?'':' style="cursor:pointer"'}><td><strong>${esc(o.code)}</strong></td><td>${esc(o.name)}${isGC?' <span style="color:#11825f">(GC)</span>':''}</td><td>${status}</td><td>${cnt(dash,o.id)}</td><td>${cnt(techs,o.id)}</td><td><div class="row-actions">${acts}</div></td></tr>`;
  }).join('')||'<tr><td colspan="6" class="empty-row">No subcontractors yet. Add one above.</td></tr>';
  $$('#scOrgBody [data-scmanage]').forEach(b=>b.onclick=e=>{e.stopPropagation();selectSubOrg(b.dataset.scmanage);});
  $$('#scOrgBody [data-sctoggle]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleOrgActive(b.dataset.sctoggle);});
  $$('#scOrgBody [data-scrow]').forEach(r=>r.onclick=()=>{ const o=subOrgs.find(x=>x.id===r.dataset.scrow); if(o&&o.code!=='AHBA') selectSubOrg(r.dataset.scrow); });
  injectIcons();
  if(subSelId && subOrgs.some(o=>o.id===subSelId)) renderSubAccounts();
}

async function createOrg(){
  const code=($('#scCode').value||'').trim().toUpperCase(), name=($('#scName').value||'').trim();
  if(!/^[A-Z0-9_-]{2,16}$/.test(code)){ showToast('Code: 2–16 chars, letters/numbers/_- only'); return; }
  if(!name){ showToast('Enter a name'); return; }
  if(code==='AHBA'){ showToast('AHBA is reserved for your GC org'); return; }
  const btn=$('#scAddOrg'); btn.disabled=true; btn.textContent='Adding…';
  try{
    const r=await scWrite('orgs','POST',{code,name});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,140);}catch(e){} throw new Error(String(d).includes('duplicate')?'code already exists':(d||('HTTP '+r.status))); }
    $('#scCode').value=''; $('#scName').value='';
    showToast(`Subcontractor ${code} added`);
    renderSubcon();
  }catch(e){ showToast('Add failed: '+e.message); }
  finally{ btn.disabled=false; btn.textContent='Add subcontractor'; }
}

async function toggleOrgActive(id){
  const o=subOrgs.find(x=>x.id===id); if(!o) return;
  if(!confirm(`${o.active?'Suspend':'Activate'} ${o.code}?`)) return;
  try{ const r=await scWrite(`orgs?id=eq.${id}`,'PATCH',{active:!o.active}); if(!r.ok) throw new Error('HTTP '+r.status); renderSubcon(); }
  catch(e){ showToast('Update failed: '+e.message); }
}

function selectSubOrg(id){
  const o=subOrgs.find(x=>x.id===id); if(!o) return;
  subSelId=id; subSelCode=o.code; subSelName=o.name;
  $('#scSelName').textContent=`${o.code} · ${o.name}`;
  $('#scManage').style.display='';
  renderSubAccounts();
  $('#scManage').scrollIntoView({behavior:'smooth',block:'start'});
}

async function renderSubAccounts(){
  if(!subSelId) return;
  const [dash,techs,was]=await Promise.all([
    scFetch(`dashboard_users?select=*&org_id=eq.${subSelId}&order=username.asc`),
    scFetch(`technicians?select=*&org_id=eq.${subSelId}&order=username.asc`),
    scFetch(`work_accounts?select=*&org_id=eq.${subSelId}&order=name.asc`)
  ]);
  const roleLbl={technician:'Technician',sales_agent:'Sales agent',security:'Security'};
  const rows=[
    ...dash.map(u=>({u:u.username,type:'Console',role:(u.is_super?'Superadmin':(u.role_label||'Console user')),status:u.must_change?'Needs PW setup':'Active',target:'dash'})),
    ...techs.map(t=>({u:t.username,type:'Mobile',role:(roleLbl[t.role]||t.role||'Technician')+(t.area?(' · '+t.area):''),status:t.must_change?'Needs PW setup':'Active',target:'tech'}))
  ];
  const ab=$('#scAcctBody');
  ab.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${esc(r.u)}</strong></td><td>${r.type}</td><td>${esc(r.role)}</td><td>${esc(r.status)}</td><td><div class="row-actions"><button class="assign-btn" data-screset="${esc(r.u)}" data-sctarget="${r.target}">Reset PW</button><button class="assign-btn" data-scdel="${esc(r.u)}" data-sctarget="${r.target}">Remove</button></div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-row">No accounts yet.</td></tr>';
  $$('#scAcctBody [data-screset]').forEach(b=>b.onclick=()=>scResetAccount(b.dataset.screset,b.dataset.sctarget));
  $$('#scAcctBody [data-scdel]').forEach(b=>b.onclick=()=>scDeleteAccount(b.dataset.scdel,b.dataset.sctarget));
  const wb=$('#scWaBody');
  wb.innerHTML=was.length?was.map(w=>{
    const on=!!w.shared;
    const shareBtn=`<button class="assign-btn" data-scwashare="${w.id}" data-scwaval="${on?'0':'1'}" style="${on?'background:#e7f7ef;border-color:#c4ecd9;color:#11825f':''}">${on?'✓ Shared':'Make shared'}</button>`;
    return `<tr><td><strong>${esc(w.name)}</strong></td><td>${w.active?'Active':'Off'}</td><td>${on?'<span style="color:#11825f;font-weight:700">Multi-device</span>':'<span style="color:#8a9894">Exclusive</span>'}</td><td><div class="row-actions">${shareBtn}<button class="assign-btn" data-scwadel="${w.id}">Remove</button></div></td></tr>`;
  }).join(''):'<tr><td colspan="4" class="empty-row">No work accounts yet.</td></tr>';
  $$('#scWaBody [data-scwadel]').forEach(b=>b.onclick=()=>removeWorkAccount(b.dataset.scwadel));
  $$('#scWaBody [data-scwashare]').forEach(b=>b.onclick=()=>toggleWorkAccountShared(b.dataset.scwashare, b.dataset.scwaval==='1'));
}
// Toggle whether a work account can be used by multiple devices at once (shared) or stays exclusive.
async function toggleWorkAccountShared(id, val){
  try{ const r=await scWrite(`work_accounts?id=eq.${id}`,'PATCH',{shared:val}); if(!r.ok) throw new Error('HTTP '+r.status);
    showToast(val?'Work account is now shared (multi-device)':'Work account set to exclusive'); renderSubAccounts();
  }catch(e){ showToast('Could not update sharing'); }
}

async function scCreateConsole(){
  if(!subSelId){ showToast('Select a subcontractor first'); return; }
  const u=($('#scCuUser').value||'').trim().toUpperCase(), nm=($('#scCuName').value||'').trim(), pw=($('#scCuPass').value||'').trim();
  if(!u){ showToast('Enter a username'); return; }
  if(pw.length<8){ showToast('Temp password must be at least 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  const btn=$('#scCuCreate'); btn.disabled=true; btn.textContent='Creating…';
  try{
    await callAdminFn({action:'create',target:'dash',username:u,new_password:pw,display_name:nm||u,role_label:'Subcontractor console',is_super:false,allowed_pages:SUBCON_CONSOLE_PAGES,edit_pages:SUBCON_CONSOLE_EDIT,org_id:subSelId});
    ['#scCuUser','#scCuName','#scCuPass'].forEach(id=>{const e=$(id);if(e)e.value='';});
    showToast(`${u} created for ${subSelCode}. Temp password must be changed on first login.`);
    renderSubAccounts(); renderSubcon();
  }catch(e){ showToast('Create failed: '+e.message); }
  finally{ btn.disabled=false; btn.textContent='Create console user'; }
}

async function scCreateMobile(){
  if(!subSelId){ showToast('Select a subcontractor first'); return; }
  const u=($('#scCfUser').value||'').trim().toUpperCase(), role=$('#scCfRole').value, area=($('#scCfArea').value||'').trim(), pw=($('#scCfPass').value||'').trim();
  if(!u){ showToast('Enter a username'); return; }
  if(pw.length<8){ showToast('Temp password must be at least 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  const btn=$('#scCfCreate'); btn.disabled=true; btn.textContent='Creating…';
  try{
    await callAdminFn({action:'create',target:'tech',username:u,new_password:pw,role,area,org_id:subSelId});
    ['#scCfUser','#scCfArea','#scCfPass'].forEach(id=>{const e=$(id);if(e)e.value='';});
    showToast(`${u} (${role}) created for ${subSelCode}.`);
    renderSubAccounts(); renderSubcon();
  }catch(e){ showToast('Create failed: '+e.message); }
  finally{ btn.disabled=false; btn.textContent='Create mobile account'; }
}

async function scResetAccount(username,target){
  const np=prompt(`New temp password for ${username} (min 8):`,''); if(np===null) return;
  if(String(np).length<8){ showToast('Min 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  try{ await callAdminFn({action:'reset',target,username,new_password:np}); showToast(`${username} password reset`); }
  catch(e){ showToast('Reset failed: '+e.message); }
}

async function scDeleteAccount(username,target){
  if(!confirm(`Remove account ${username}? This deletes their login.`)) return;
  if(!await confirmActorPassword()) return;
  try{ await callAdminFn({action:'delete',target,username}); showToast(`${username} removed`); renderSubAccounts(); renderSubcon(); }
  catch(e){ showToast('Remove failed: '+e.message); }
}

async function addWorkAccount(){
  if(!subSelId){ showToast('Select a subcontractor first'); return; }
  const name=($('#scWaName').value||'').trim().toLowerCase();
  if(!name){ showToast('Enter a work account name'); return; }
  try{
    const r=await scWrite('work_accounts','POST',{org_id:subSelId,name});
    if(!r.ok){ let d=''; try{d=(await r.text()).slice(0,120);}catch(e){} throw new Error(String(d).includes('duplicate')?'already exists':(d||('HTTP '+r.status))); }
    $('#scWaName').value=''; renderSubAccounts();
  }catch(e){ showToast('Add failed: '+e.message); }
}

async function removeWorkAccount(id){
  if(!confirm('Remove this work account?')) return;
  try{ const r=await scWrite(`work_accounts?id=eq.${id}`,'DELETE'); if(!r.ok) throw new Error('HTTP '+r.status); renderSubAccounts(); }
  catch(e){ showToast('Remove failed: '+e.message); }
}
function applyAccessScope(){
  const lim=accessIsDispatcherOnly();
  ['acCreateDash','acCreateField','acDashUsers'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display=lim?'none':''; });
  const isSuper=!!(window.dashUser&&window.dashUser.is_super);
  const al=document.getElementById('acAuditLog'); if(al) al.style.display=isSuper?'':'none';   // reset history: superadmin only
  const sub=document.querySelector('#accessPage .page-toolbar p');
  if(sub) sub.textContent=lim?'Reset technician passwords only. Other account-management functions are available to Superadmin.':'Create users, assign roles/access, and reset passwords. Only Superadmin can access this.';
}
async function renderAccess(){
  applyAccessScope();
  // Dispatcher view: skip the dashboard-user matrix; show technicians (reset PW only).
  if(accessIsDispatcherOnly()){ renderAccounts(); return; }
  const wrap=$('#accessWrap'); if(!wrap)return;
  wrap.innerHTML='Loading…';
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/dashboard_users?select=*&order=is_super.desc,username.asc`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); accessUsers=r.ok?await r.json():[]; }catch(e){accessUsers=[];}
  const head=`<tr><th>User</th><th>Role</th>${PAGE_KEYS.map(p=>`<th class="perm">${p[1]}</th>`).join('')}<th>Actions</th></tr>`;
  const rows=accessUsers.map(u=>{
    if(u.is_super) return `<tr><td><strong>${u.display_name||u.username}</strong><span>${u.username}</span></td><td>Superadmin</td><td colspan="${PAGE_KEYS.length}" style="text-align:center;color:#11825f">Full access (all sections)</td><td><div class="row-actions"><button class="assign-btn" data-renamedash="${u.username}">Rename</button><button class="assign-btn" data-resetdash="${u.username}">Reset PW</button></div></td></tr>`;
    const allowed=Array.isArray(u.allowed_pages)?u.allowed_pages:[];
    const editp=Array.isArray(u.edit_pages)?u.edit_pages:[];
    const cells=PAGE_KEYS.map(p=>{const k=p[0];const lvl=editp.includes(k)?'edit':(allowed.includes(k)?'view':'');
      return `<td class="perm"><select class="perm-sel" data-u="${u.username}" data-pg="${k}"><option value=""${lvl===''?' selected':''}>—</option><option value="view"${lvl==='view'?' selected':''}>View</option><option value="edit"${lvl==='edit'?' selected':''}>Edit</option></select></td>`;}).join('');
    const canDel = (window.dashUser&&window.dashUser.is_super) && u.username!==(window.dashUser&&window.dashUser.username);
    const delBtn = canDel ? `<button class="assign-btn" style="color:#c2503a;border-color:#f0c3ba" data-deldash="${u.username}">Delete</button>` : '';
    return `<tr><td><strong>${u.display_name||u.username}</strong><span>${u.username}</span></td><td>${u.role_label||''}</td>${cells}<td><div class="row-actions"><button class="assign-btn" data-saveaccess="${u.username}">Save</button><button class="assign-btn" data-renamedash="${u.username}">Rename</button><button class="assign-btn" data-resetdash="${u.username}">Reset PW</button>${delBtn}</div></td></tr>`;
  }).join('');
  wrap.innerHTML=`<table><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  $$('#accessWrap [data-saveaccess]').forEach(b=>b.onclick=()=>saveAccess(b.dataset.saveaccess));
  $$('#accessWrap [data-resetdash]').forEach(b=>b.onclick=()=>resetDashUser(b.dataset.resetdash));
  $$('#accessWrap [data-renamedash]').forEach(b=>b.onclick=()=>renameDashUser(b.dataset.renamedash));
  $$('#accessWrap [data-deldash]').forEach(b=>b.onclick=()=>deleteDashUser(b.dataset.deldash));
  renderAccounts();   // field/mobile accounts list now lives inside Access Control
  renderGcWorkAccounts();   // GC's own work-account pool manager (superadmin only)
  if(window.dashUser&&window.dashUser.is_super){ const ar=$('#auditRefresh'); if(ar) ar.onclick=renderAuditLog; renderAuditLog(); }
}
// ---- Work-account manager (Access Control tab) — ALL orgs; superadmin assigns each account to GC or a subcon. ----
async function renderGcWorkAccounts(){
  const panel=$('#acGcWa'), body=$('#gcWaBody');
  if(!panel||!body) return;
  const isSuper=!!(window.dashUser&&window.dashUser.is_super);
  panel.style.display=isSuper?'':'none';
  if(!isSuper) return;
  if(!gcOrgId || !Object.keys(orgById).length){ body.innerHTML='<tr><td colspan="5" class="empty-row">Loading organizations…</td></tr>'; return; }
  // Superadmin (platform admin) sees every org's work accounts — assign each to GC or a specific subcon.
  const was=await scFetch(`work_accounts?select=*&order=name.asc`);
  // Org dropdown options: GC first, then subcons A→Z.
  const oids=Object.keys(orgById).sort((a,b)=> a===gcOrgId?-1 : b===gcOrgId?1 : String(orgById[a].name||orgById[a].code||'').localeCompare(String(orgById[b].name||orgById[b].code||'')));
  const orgLabel=oid=>{ const o=orgById[oid]||{}; return oid===gcOrgId?'AHBA (GC)':(o.name||o.code||oid); };
  body.innerHTML=was.length?was.map(w=>{
    const active=w.active!==false, shared=!!w.shared;
    const orgOpts=oids.map(oid=>`<option value="${oid}" ${String(w.org_id)===String(oid)?'selected':''}>${esc(orgLabel(oid))}</option>`).join('');
    const orgSel=`<select class="perm-sel" data-gcwaorg="${w.id}" style="padding:5px 8px;max-width:180px">${orgOpts}</select>`;
    const actBtn=`<button class="assign-btn" data-gcwaact="${w.id}" data-gcwaval="${active?'0':'1'}" style="${active?'background:#e7f7ef;border-color:#c4ecd9;color:#11825f':'color:#a4690f;border-color:#f0d9a8'}">${active?'Active':'Off'}</button>`;
    const shareBtn=`<button class="assign-btn" data-gcwashare="${w.id}" data-gcwaval="${shared?'0':'1'}" style="${shared?'background:#e7f7ef;border-color:#c4ecd9;color:#11825f':''}">${shared?'✓ Shared':'Make shared'}</button>`;
    const shareTag=shared?' <span style="color:#11825f;font-weight:700;font-size:10px">Multi-device</span>':'';
    return `<tr><td><strong>${esc(w.name)}</strong></td><td>${orgSel}</td><td>${actBtn}</td><td>${shareBtn}${shareTag}</td><td><div class="row-actions"><button class="assign-btn" data-gcwaren="${w.id}" data-gcwaname="${esc(w.name)}">Rename</button><button class="assign-btn" style="color:#c2503a;border-color:#f0c3ba" data-gcwadel="${w.id}">Remove</button></div></td></tr>`;
  }).join(''):'<tr><td colspan="5" class="empty-row">No work accounts yet. Add one below.</td></tr>';
  $$('#gcWaBody [data-gcwaorg]').forEach(s=>s.onchange=()=>gcSetWorkAccount(s.dataset.gcwaorg,{org_id:s.value}));
  $$('#gcWaBody [data-gcwaact]').forEach(b=>b.onclick=()=>gcSetWorkAccount(b.dataset.gcwaact,{active:b.dataset.gcwaval==='1'}));
  $$('#gcWaBody [data-gcwashare]').forEach(b=>b.onclick=()=>gcSetWorkAccount(b.dataset.gcwashare,{shared:b.dataset.gcwaval==='1'}));
  $$('#gcWaBody [data-gcwaren]').forEach(b=>b.onclick=()=>gcRenameWorkAccount(b.dataset.gcwaren,b.dataset.gcwaname));
  $$('#gcWaBody [data-gcwadel]').forEach(b=>b.onclick=()=>gcRemoveWorkAccount(b.dataset.gcwadel));
}
async function gcAddWorkAccount(){
  if(!(window.dashUser&&window.dashUser.is_super)){ showToast('Superadmin only'); return; }
  if(!gcOrgId){ showToast('Organization not loaded yet — try again in a moment'); return; }
  const el=$('#gcWaName'), name=((el&&el.value)||'').trim();
  if(!name){ showToast('Enter a work account name'); return; }
  try{ const r=await scWrite('work_accounts','POST',{org_id:gcOrgId,name,active:true,shared:false}); if(!r.ok) throw new Error('HTTP '+r.status);
    if(el) el.value=''; showToast('Work account added'); renderGcWorkAccounts();
  }catch(e){ showToast('Could not add work account'); }
}
async function gcSetWorkAccount(id,patch){
  try{ const r=await scWrite(`work_accounts?id=eq.${id}`,'PATCH',patch); if(!r.ok) throw new Error('HTTP '+r.status);
    showToast('Work account updated'); renderGcWorkAccounts();
  }catch(e){ showToast('Update failed'); }
}
function gcRenameWorkAccount(id,cur){
  const name=((prompt('Rename work account:',cur||'')||'').trim());
  if(!name || name===cur) return;
  gcSetWorkAccount(id,{name});
}
async function gcRemoveWorkAccount(id){
  if(!confirm('Remove this work account from the GC pool?\n\nIt disappears from the mobile shift picker. Attendance history is KEPT (it stores the account name as text — nothing is lost).')) return;
  try{ const r=await scWrite(`work_accounts?id=eq.${id}`,'DELETE'); if(!r.ok) throw new Error('HTTP '+r.status); showToast('Work account removed'); renderGcWorkAccounts(); }
  catch(e){ showToast('Remove failed'); }
}
// Superadmin-only: account-action history (reset / create / rename / delete) from audit_log, for monitoring.
async function renderAuditLog(){
  const body=$('#auditBody'); if(!body)return;
  body.innerHTML=`<tr><td colspan="5" class="empty-cell">Loading…</td></tr>`;
  let rows=[];
  try{ const r=await fetch(`${SUPA_URL}/rest/v1/audit_log?select=*&order=at.desc&limit=200`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}}); rows=r.ok?await r.json():[]; }catch(e){}
  const acct=rows.filter(x=>['technicians','dashboard_users'].includes(x.table_name));
  if(!acct.length){ body.innerHTML=`<tr><td colspan="5" class="empty-cell">No account actions logged yet.</td></tr>`; return; }
  const typeLabel=t=> t==='technicians'?'Mobile / Field':(t==='dashboard_users'?'Console':t);
  const actBadge=a=>{ const c=a==='delete'?'negative':(a==='reset'?'assigned':'completed'); return `<span class="status ${c}">${esc(String(a||'').toUpperCase())}</span>`; };
  body.innerHTML=acct.map(x=>`<tr><td>${fmtWhen(x.at)}</td><td><strong>${esc(x.actor||'—')}</strong></td><td>${actBadge(x.action)}</td><td>${esc(x.row_id||'—')}</td><td>${typeLabel(x.table_name)}</td></tr>`).join('');
}
async function saveAccess(username){
  const sels=$$(`#accessWrap select[data-u="${username}"]`);
  const pages=[], editPages=[];
  sels.forEach(s=>{ const v=s.value; if(v==='view'||v==='edit') pages.push(s.dataset.pg); if(v==='edit') editPages.push(s.dataset.pg); });
  try{
    await fetch(`${SUPA_URL}/rest/v1/dashboard_users?username=eq.${encodeURIComponent(username)}`,{method:'PATCH',headers:DH(),body:JSON.stringify({allowed_pages:pages,edit_pages:editPages,updated_at:new Date().toISOString()})});
    showToast(`${username}: access updated (View/Edit saved)`);
  }catch(e){ showToast('Could not save access'); }
}
// ---- Secure admin actions via the admin-reset Edge Function ----
// Re-confirm the acting user's OWN password before a sensitive action (replaces the shared admin secret).
async function confirmActorPassword(){
  const u=window.dashUser; if(!u||typeof dashAuth==='undefined'||!dashAuth){ showToast('Not signed in'); return false; }
  const p=prompt('Enter YOUR password to confirm this action:'); if(p===null) return false;
  if(!p){ showToast('Password required'); return false; }
  try{ const {error}=await dashAuth.auth.signInWithPassword({email:dashEmailFor(u.username),password:p}); if(error){ showToast('Wrong password — cancelled'); return false; } return true; }
  catch(e){ showToast('Could not verify password'); return false; }
}
async function callAdminFn(payload){
  const r=await fetch(`${SUPA_URL}/functions/v1/admin-reset`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()},body:JSON.stringify(payload)});
  let out={}; try{out=await r.json()}catch(e){}
  if(!r.ok||out.error) throw new Error(out.error||('HTTP '+r.status));
  return out;
}
async function createDashUser(){
  const u=($('#cuUser').value||'').trim().toUpperCase(), nm=($('#cuName').value||'').trim(), rl=($('#cuRole').value||'').trim(), pw=($('#cuPass').value||'').trim(), sup=$('#cuSuper').checked;
  if(!u){ showToast('Enter a username'); return; }
  if(pw.length<8){ showToast('Temp password must be at least 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  const btn=$('#cuCreate'); btn.disabled=true; btn.textContent='Creating…';
  try{
    await callAdminFn({action:'create',target:'dash',username:u,new_password:pw,display_name:nm||u,role_label:rl||'Dashboard user',is_super:sup,allowed_pages:sup?PAGE_KEYS.map(p=>p[0]):['overview']});
    showToast(`${u} created. They must change the temp password on first login.`);
    ['#cuUser','#cuName','#cuRole','#cuPass'].forEach(id=>{const e=$(id);if(e)e.value='';}); $('#cuSuper').checked=false;
    renderAccess();
  }catch(e){ showToast('Create failed: '+e.message); }
  btn.disabled=false; btn.textContent='Create user';
}
// Superadmin: create a MOBILE/field account (technician / sales agent / security)
async function createFieldUser(){
  const u=($('#cfUser').value||'').trim().toUpperCase(), role=($('#cfRole').value||'technician'), area=($('#cfArea').value||'').trim(), pw=($('#cfPass').value||'').trim();
  if(!u){ showToast('Enter a username'); return; }
  if(pw.length<8){ showToast('Temp password must be at least 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  const btn=$('#cfCreate'); btn.disabled=true; btn.textContent='Creating…';
  try{
    await callAdminFn({action:'create',target:'tech',username:u,new_password:pw,role,area});
    showToast(`${u} (${role}) created. Login: ${u.toLowerCase()}@ahbafield.app — must change temp password on first login.`);
    ['#cfUser','#cfArea','#cfPass'].forEach(id=>{const e=$(id);if(e)e.value='';});
  }catch(e){ showToast('Create failed: '+e.message); }
  btn.disabled=false; btn.textContent='Create field account';
}
async function resetDashUser(username){
  const pw=(prompt(`New temporary password for ${username} (min 8 chars):`,'Ahba@2026')||'').trim();
  if(pw.length<8){ showToast('Password must be at least 8 characters'); return; }
  if(!await confirmActorPassword()) return;
  try{
    await callAdminFn({action:'reset',target:'dash',username,new_password:pw});
    showToast(`${username} password reset (by you). They must change it on next login.`);
  }catch(e){ showToast('Reset failed: '+e.message); }
}
async function renameDashUser(username){
  let nu=(prompt(`New username for ${username} (letters/numbers, no spaces):`,username)||'').trim().toUpperCase();
  if(!nu||nu===username) return;
  if(!/^[A-Z0-9._-]{3,}$/.test(nu)){ showToast('Username: 3+ chars, letters/numbers/._- only (no spaces).'); return; }
  if(!await confirmActorPassword()) return;
  try{
    await callAdminFn({action:'rename',target:'dash',username,new_username:nu});
    showToast(`${username} → ${nu}. New login email: ${nu.toLowerCase()}@ahbadash.app`);
    renderAccess();
  }catch(e){ showToast('Rename failed: '+e.message); }
}
async function changeMyDisplayName(){
  const u=window.dashUser; if(!u){ return; }
  const nm=(prompt('Your display name:', u.display_name||u.username)||'').trim();
  if(!nm||nm===u.display_name) return;
  try{
    await fetch(`${SUPA_URL}/rest/v1/dashboard_users?username=eq.${encodeURIComponent(u.username)}`,{method:'PATCH',headers:DH(),body:JSON.stringify({display_name:nm,updated_at:new Date().toISOString()})});
    u.display_name=nm;
    const nameEl=$('.user-card strong'); if(nameEl) nameEl.textContent=nm;
    const av=$('.user-card .avatar'); if(av) av.textContent=nm.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    showToast('Display name updated');
  }catch(e){ showToast('Could not update display name'); }
}
// Self-service: a console user changes THEIR OWN username (no admin secret;
// authorized by their session token in the Edge Function).
async function changeMyUsername(){
  const u=window.dashUser; if(!u){ return; }
  let nu=(prompt('Your NEW username (3+ chars, letters/numbers/._- , no spaces):', u.username)||'').trim().toUpperCase();
  if(!nu||nu===u.username) return;
  if(!/^[A-Z0-9._-]{3,}$/.test(nu)){ showToast('Username: 3+ chars, letters/numbers/._- only (no spaces).'); return; }
  if(!confirm(`Change your username to "${nu}"?\nFrom now on you'll sign in with "${nu}". You'll be signed out to log in again.`)) return;
  try{
    await callAdminFn({action:'rename_self',target:'dash',new_username:nu});
    showToast(`Username changed to ${nu}. Please sign in again.`);
    setTimeout(()=>{ try{ dashAuth&&dashAuth.auth.signOut(); }catch(e){} location.reload(); }, 1600);
  }catch(e){ showToast('Change failed: '+e.message); }
}
// Superadmin: permanently delete a dashboard user (login + profile).
async function deleteDashUser(username){
  if(username===(window.dashUser&&window.dashUser.username)){ showToast('You cannot delete your own account.'); return; }
  if(!confirm(`Permanently DELETE user "${username}"?\nThis removes their login and dashboard access. This cannot be undone.`)) return;
  if(!await confirmActorPassword()) return;
  try{
    await callAdminFn({action:'delete',target:'dash',username});
    showToast(`${username} deleted.`);
    renderAccess();
  }catch(e){ showToast('Delete failed: '+e.message); }
}
// (Superadmin self-recovery removed — superadmin password is renewed in Supabase.)

// ---------- Messenger-style team chat widget + global notifications ----------
// cwCur: {kind:'team',code} for a broadcast team thread | {kind:'dm',a,b,team} for a private DM
let cwCur=null, cwUnread={}, cwChan=null;
function myCwCode(){ return 'C:'+((window.dashUser&&window.dashUser.username)||''); }
function codeDisplay(code){ if(!code) return ''; if(code.startsWith('T:')) return 'Team '+code.slice(2); if(code.startsWith('C:')) return code.slice(2); return code; }
function msgThreadKey(m){ return m.dm_a ? ('dm:'+m.dm_a+'|'+m.dm_b) : ('team:'+m.team); }
function curThreadKeyDash(){ if(!cwCur) return ''; return cwCur.kind==='dm' ? ('dm:'+cwCur.a+'|'+cwCur.b) : ('team:'+cwCur.code); }
function setDcInputEnabled(on){ const i=$('#dcInput'),s=$('#dcSend'),p=$('#dcPhotoBtn'); if(i){ i.disabled=!on; i.placeholder=on?'Type a message…':'Monitoring only — read-only'; } if(s) s.disabled=!on; if(p) p.disabled=!on; }
let cwPhotoFile=null;   // pending chat image (console)
function setCwPhoto(file){ cwPhotoFile=file||null; const n=$('#dcPhotoName'); if(n) n.textContent=cwPhotoFile?('📎 '+(cwPhotoFile.name||'photo')):''; }
function playBeepDash(){ try{ const C=window.AudioContext||window.webkitAudioContext; if(!C)return; const ctx=playBeepDash._c||(playBeepDash._c=new C()); if(ctx.state==='suspended')ctx.resume(); const o=ctx.createOscillator(),g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(880,ctx.currentTime); o.frequency.setValueAtTime(1170,ctx.currentTime+0.12); o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.3,ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.35); o.start(); o.stop(ctx.currentTime+0.36);}catch(e){} }
// ---- Team-monitoring alert sounds (travel overdue / idle team) ----
function dashCtx(){ const C=window.AudioContext||window.webkitAudioContext; if(!C)return null; const ctx=dashCtx._c||(dashCtx._c=new C()); if(ctx.state==='suspended')ctx.resume(); return ctx; }
function dashTone(freq,start,dur,gain,type){ const ctx=dashCtx(); if(!ctx)return; const o=ctx.createOscillator(),g=ctx.createGain(); o.type=type||'sine'; o.frequency.value=freq; o.connect(g); g.connect(ctx.destination); const t=ctx.currentTime+start; g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gain||0.35,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.start(t); o.stop(t+dur+0.02); }
// Travel over 45 min: urgent repeating two-tone
function playAlertTravel(){ [0,0.42].forEach(off=>{ dashTone(988,off,0.18,0.4,'square'); dashTone(1319,off+0.18,0.22,0.42,'square'); }); }
// Idle team 30 min, no load: LOUD but SHORT single sharp beep
function playAlertIdle(){ dashTone(1175,0,0.22,0.6,'square'); }
// Monitor online teams and alert all console users when thresholds are crossed.
let alertTravel={}, alertIdle={};
const ALERT_RE=10*60*1000;   // re-remind every 10 min while still overdue
function teamHasActiveLoad(code){ return jobs.some(j=>j.team===code && ['assigned','en-route','on-site','in-progress'].includes(j.status)); }
async function monitorTeams(){
  try{
    if(!window.dashUser) return;
    await loadTeamShifts();
    const now=Date.now(); const travelMsgs=[], idleMsgs=[];
    // 1) A job stuck in travel (en-route) for 45+ min
    jobs.forEach(j=>{
      if(j.status!=='en-route'||!j.updatedAt){ if(j&&j.id) delete alertTravel[j.id]; return; }
      const mins=(now-new Date(j.updatedAt).getTime())/60000;
      if(mins>=45){ if(now-(alertTravel[j.id]||0)>ALERT_RE){ alertTravel[j.id]=now; travelMsgs.push((j.team||'Team')+' · '+(j.subscriber||j.id)+' — '+Math.floor(mins)+'m'); } }
      else delete alertTravel[j.id];
    });
    // 2) An online team idle 30+ min with no current load
    Object.entries(shiftByTeam).forEach(([code,s])=>{
      if(!/^AHBA_SLI/i.test(code)){ delete alertIdle[code]; return; }   // field technician teams only (skip Sales/Security)
      if(!s.online || teamHasActiveLoad(code)){ delete alertIdle[code]; return; }
      let lastAct = s.time_in ? new Date(s.time_in).getTime() : 0;
      jobs.forEach(j=>{ if(j.team===code && j.updatedAt){ const t=new Date(j.updatedAt).getTime(); if(t>lastAct) lastAct=t; } });
      if(!lastAct) return;
      const mins=(now-lastAct)/60000;
      if(mins>=30){ if(now-(alertIdle[code]||0)>ALERT_RE){ alertIdle[code]=now; idleMsgs.push(code+' — '+Math.floor(mins)+'m'); } }
      else delete alertIdle[code];
    });
    if(travelMsgs.length){ playAlertTravel(); showToast('⏱️ Travel over 45 min: '+travelMsgs.join(' · ')); try{ if('Notification'in window&&Notification.permission==='granted') new Notification('⏱️ Team travel over 45 min',{body:travelMsgs.join('\n'),icon:'favicon.png'}); }catch(e){} }
    if(idleMsgs.length){ playAlertIdle(); showToast('🚨 Idle 30 min (no load): '+idleMsgs.join(' · ')); try{ if('Notification'in window&&Notification.permission==='granted') new Notification('🚨 Team idle 30 min — no load',{body:idleMsgs.join('\n'),icon:'favicon.png'}); }catch(e){} }
  }catch(e){}
}
function dcTotalUnread(){ return Object.values(cwUnread).reduce((a,b)=>a+(b||0),0); }
function updateDcBadge(){ const t=dcTotalUnread(); const b=$('#dashChatBadge'); if(b){ b.textContent=t; b.classList.toggle('hidden',t<=0); } }
function chatWidgetOpen(){ const w=$('#dashChatWidget'); return w && w.style.display!=='none'; }
function openChatWidget(){ try{ if('Notification'in window&&Notification.permission==='default')Notification.requestPermission(); }catch(e){} const w=$('#dashChatWidget'); w.classList.remove('min'); w.style.display='flex'; positionChatToFab(); showCwTeams(); }
// Open the chat panel anchored to the (draggable) chat icon's current position.
function positionChatToFab(){
  const fab=$('#dashChatFab'), w=$('#dashChatWidget'); if(!fab||!w) return;
  const ww=w.offsetWidth||330, wh=w.offsetHeight||460, m=8, gap=12, r=fab.getBoundingClientRect();
  let left=Math.max(m, Math.min(window.innerWidth-ww-m, r.right-ww));   // align widget's right edge to the icon
  let top=r.top-wh-gap;                                                  // prefer opening ABOVE the icon
  if(top<m) top=r.bottom+gap;                                            // not enough room above → open below
  top=Math.max(m, Math.min(window.innerHeight-wh-m, top));
  w.style.left=left+'px'; w.style.top=top+'px'; w.style.right='auto'; w.style.bottom='auto';
}
function closeChatWidget(){ const w=$('#dashChatWidget'); w.style.display='none'; w.classList.remove('min'); }
function minimizeChat(){ $('#dashChatWidget').classList.add('min'); }
// Make the floating chat icon draggable so it never blocks on-screen info (position is saved).
function enableFabDrag(){
  const fab=$('#dashChatFab'); if(!fab) return;
  function clamp(){ const m=6,w=fab.offsetWidth,h=fab.offsetHeight; const r=fab.getBoundingClientRect(); let nx=Math.max(m,Math.min(window.innerWidth-w-m,r.left)), ny=Math.max(m,Math.min(window.innerHeight-h-m,r.top)); fab.style.left=nx+'px'; fab.style.top=ny+'px'; fab.style.right='auto'; fab.style.bottom='auto'; }
  try{ const p=JSON.parse(localStorage.getItem('ahba_fab_pos')||'null'); if(p&&p.left!=null){ fab.style.left=p.left+'px'; fab.style.top=p.top+'px'; fab.style.right='auto'; fab.style.bottom='auto'; clamp(); } }catch(e){}
  let dragging=false,moved=false,sx=0,sy=0,ox=0,oy=0;
  fab.addEventListener('pointerdown',e=>{ dragging=true; moved=false; sx=e.clientX; sy=e.clientY; const r=fab.getBoundingClientRect(); ox=r.left; oy=r.top; try{fab.setPointerCapture(e.pointerId);}catch(_){} });
  fab.addEventListener('pointermove',e=>{ if(!dragging)return; const dx=e.clientX-sx,dy=e.clientY-sy; if(Math.abs(dx)+Math.abs(dy)>4) moved=true; const m=6,w=fab.offsetWidth,h=fab.offsetHeight; let nx=Math.max(m,Math.min(window.innerWidth-w-m,ox+dx)), ny=Math.max(m,Math.min(window.innerHeight-h-m,oy+dy)); fab.style.left=nx+'px'; fab.style.top=ny+'px'; fab.style.right='auto'; fab.style.bottom='auto'; });
  fab.addEventListener('pointerup',e=>{ if(!dragging)return; dragging=false; if(moved){ fab._dragged=true; setTimeout(()=>{fab._dragged=false;},60); const r=fab.getBoundingClientRect(); localStorage.setItem('ahba_fab_pos',JSON.stringify({left:Math.round(r.left),top:Math.round(r.top)})); } });
  window.addEventListener('resize',clamp);
}
async function showCwTeams(){
  cwCur=null; $('#dcThread').classList.add('hidden'); $('#dcTeams').classList.remove('hidden'); $('#dcBack').classList.add('hidden');
  $('#dcTitle').textContent='Messages'; if($('#dcHeadAv'))$('#dcHeadAv').textContent='💬'; if($('#dcSub'))$('#dcSub').textContent='Team threads + direct messages';
  const el=$('#dcTeams'); el.innerHTML='<div style="padding:20px;text-align:center;color:#9aa6a2;font-size:12px">Loading…</div>';
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/team_messages?select=team,sender,body,role,dm_a,dm_b,created_at&order=created_at.desc&limit=600`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    const last={}; const order=[];
    rows.forEach(m=>{ const k=msgThreadKey(m); if(!last[k]){ last[k]=m; order.push(k); } });
    showCwTeams._last=last;
    if(!order.length){ el.innerHTML='<div style="padding:24px;text-align:center;color:#9aa6a2;font-size:12px">No conversations yet.<br>Open a team in Field Teams to start, or assign a load.</div>'; return; }
    const me=myCwCode();
    el.innerHTML=order.map(k=>{
      const m=last[k]; const u=cwUnread[k]||0; const isDm=!!m.dm_a;
      let title, av, lock='';
      if(isDm){
        lock='🔒 '; av='🔒';
        const peer=(m.dm_a===me)?m.dm_b:(m.dm_b===me?m.dm_a:null);
        const mobileName=(m.role==='team'&&m.sender)?m.sender:null;
        title = peer ? (peer.startsWith('T:')?(mobileName||codeDisplay(peer)):codeDisplay(peer))
                     : (codeDisplay(m.dm_a)+' ↔ '+codeDisplay(m.dm_b));
      } else {
        av=(m.team||'').slice(-3);
        title=(m.role==='team'&&m.sender)?m.sender:(teamCrew(m.team)||m.team);
      }
      const sub=(m.role==='dispatch'?( (m.sender||'You')+': '):((m.sender? m.sender+': ':'')))+(m.body||(m.image_path?'📷 Photo':''));
      return `<div class="dc-team" data-k="${k}"><div class="dc-av">${av}</div><div class="dc-tmeta"><strong>${lock}${(title||'').replace(/</g,'&lt;')}${u?`<span class="dc-ucount">${u}</span>`:''}</strong><p>${(sub||'').replace(/</g,'&lt;').slice(0,46)}</p></div><time>${timeAgo(m.created_at)}</time></div>`;
    }).join('');
    $$('#dcTeams [data-k]').forEach(d=>d.onclick=()=>openCwByKey(d.dataset.k));
  }catch(e){ el.innerHTML='<div style="padding:20px;color:#c2503a;font-size:12px">Could not load.</div>'; }
}
function openCwByKey(k){
  const m=(showCwTeams._last||{})[k]||{};
  if(k.indexOf('team:')===0) return openCwThread(k.slice(5));
  const [a,b]=k.slice(3).split('|');
  openCwDm(a,b,m.team||'');
}
function dcThreadShell(title,av,sub){
  $('#dcTeams').classList.add('hidden'); $('#dcThread').classList.remove('hidden'); $('#dcBack').classList.remove('hidden');
  $('#dcTitle').textContent=title; if($('#dcHeadAv'))$('#dcHeadAv').textContent=av; if($('#dcSub'))$('#dcSub').textContent=sub;
  $('#dcMsgs').innerHTML='<div style="color:#9aa6a2;font-size:11px;text-align:center;padding:14px">Loading…</div>';
}
async function openCwThread(code){
  cwCur={kind:'team',code}; cwUnread['team:'+code]=0; updateDcBadge();
  dcThreadShell(code, code.slice(-3), (teamCrew(code)||'Field team')); setDcInputEnabled(true);
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/team_messages?select=*&team=eq.${encodeURIComponent(code)}&dm_a=is.null&order=created_at.asc&limit=200`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    renderCwMsgs(r.ok?await r.json():[]);
  }catch(e){ $('#dcMsgs').innerHTML='<div style="color:#c2503a;font-size:11px;padding:14px">Could not load.</div>'; }
}
async function openCwDm(a,b,team){
  cwCur={kind:'dm',a,b,team}; cwUnread['dm:'+a+'|'+b]=0; updateDcBadge();
  const me=myCwCode(); const peer=(a===me)?b:(b===me?a:null); const iAmPart=(a===me||b===me);
  const title='🔒 '+(peer?codeDisplay(peer):(codeDisplay(a)+' ↔ '+codeDisplay(b)));
  dcThreadShell(title, '🔒', iAmPart?'Private direct message':'Monitoring (read-only)'); setDcInputEnabled(iAmPart);
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/team_messages?select=*&dm_a=eq.${encodeURIComponent(a)}&dm_b=eq.${encodeURIComponent(b)}&order=created_at.asc&limit=200`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    renderCwMsgs(r.ok?await r.json():[]);
  }catch(e){ $('#dcMsgs').innerHTML='<div style="color:#c2503a;font-size:11px;padding:14px">Could not load.</div>'; }
}
function renderCwMsgs(rows){
  const el=$('#dcMsgs'); el.innerHTML=rows.length?rows.map(m=>{const d=m.role==='dispatch'; const who=(m.sender||(d?'Console':(m.team||''))); const roleTag=(d&&m.sender_role)?` · ${String(m.sender_role).replace(/</g,'&lt;')}`:''; const img=m.image_path?`<a href="${photoBase(m.image_path)}" target="_blank" rel="noopener"><img src="${photoBase(m.image_path)}" alt="photo" style="max-width:200px;max-height:200px;border-radius:9px;display:block;margin:2px 0"></a>`:''; const txt=(m.body||'').trim()?`<div>${(m.body||'').replace(/</g,'&lt;')}</div>`:''; return `<div class="dc-msg ${d?'me':'them'}">${img}${txt}<span>${who.replace(/</g,'&lt;')}${roleTag} · ${fmtWhen(m.created_at)}</span></div>`;}).join(''):'<div style="color:#9aa6a2;font-size:11px;text-align:center;padding:14px">No messages yet.</div>'; el.scrollTop=el.scrollHeight;
}
async function sendCw(){
  const inp=$('#dcInput'); const v=(inp.value||'').trim(); if((!v && !cwPhotoFile)||!cwCur)return;
  const who=(window.dashUser&&(window.dashUser.display_name||window.dashUser.username))||'Dispatcher';
  const myRoleLabel=(window.dashUser&&window.dashUser.is_super)?'Superadmin':((window.dashUser&&window.dashUser.role_label)||'Console');
  const row={sender:who, sender_role:myRoleLabel, role:'dispatch', body:v};
  if(cwCur.kind==='dm'){
    const me=myCwCode(); if(cwCur.a!==me && cwCur.b!==me){ showToast('Monitoring only — you are not part of this DM.'); return; }
    row.dm_a=cwCur.a; row.dm_b=cwCur.b;
    row.team=cwCur.team||(cwCur.a.startsWith('T:')?cwCur.a.slice(2):(cwCur.b.startsWith('T:')?cwCur.b.slice(2):cwCur.a));
  } else { row.team=cwCur.code; }
  // Upload the attached photo (if any) to the public job-photos bucket under chat/.
  if(cwPhotoFile){
    const btn=$('#dcSend'); if(btn){ btn.disabled=true; btn.textContent='…'; }
    try{ const blob=await compressImage(cwPhotoFile,1200,140); const client=sbc();
      const path=`chat/${Date.now()}_${Math.random().toString(36).slice(2,7)}.jpg`;
      const {error:e2}=await client.storage.from('job-photos').upload(path,blob,{contentType:'image/jpeg',upsert:false});
      if(!e2) row.image_path=path; else showToast('Photo upload failed');
    }catch(e){ showToast('Photo upload failed'); }
    if(btn){ btn.disabled=false; btn.textContent='Send'; }
  }
  inp.value=''; setCwPhoto(null); const pf=$('#dcPhoto'); if(pf) pf.value='';
  try{ await fetch(`${SUPA_URL}/rest/v1/team_messages`,{method:'POST',headers:DH(),body:JSON.stringify(row)}); pushNotify({team:row.team,title:'Message from '+who,body:(v||'📷 Photo')}); if(cwCur.kind==='dm') openCwDm(cwCur.a,cwCur.b,cwCur.team); else openCwThread(cwCur.code); }catch(e){ showToast('Send failed'); }
}
function startDashChat(){
  if(cwChan||!window.supabase?.createClient) return;
  const cl=window.supabase.createClient(SUPA_URL,SUPA_KEY);
  window.__cwClient=cl; try{ cl.realtime.setAuth(window.__ahbaTok||SUPA_KEY); }catch(e){}
  // RLS delivers only messages this console user may read (all broadcasts + their
  // DMs; superadmin gets everything). Route each to the right thread.
  cwChan=cl.channel('dash-team-chat').on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages'},p=>{
    const m=p.new; if(!m) return;
    const k=msgThreadKey(m);
    const widgetOpen=chatWidgetOpen();
    const onThis = widgetOpen && curThreadKeyDash()===k;
    if(onThis){ if(cwCur.kind==='dm') openCwDm(cwCur.a,cwCur.b,cwCur.team); else openCwThread(cwCur.code); }
    if(m.role==='team'){   // incoming from a mobile user (field/sales) -> notify
      playBeepDash();
      if(!onThis){ cwUnread[k]=(cwUnread[k]||0)+1; updateDcBadge(); if(widgetOpen) showCwTeams(); }
      const nm=(m.sender||m.team||'Message')+(m.dm_a?' (DM)':'');
      const prev=(m.body||(m.image_path?'📷 Photo':''));
      showToast('💬 '+nm+': '+prev.slice(0,40));
      try{ if('Notification'in window&&Notification.permission==='granted') new Notification('💬 '+nm,{body:prev,icon:'favicon.png'}); }catch(e){}
    } else if(!onThis && widgetOpen){ showCwTeams(); }
  }).subscribe();
}

// ---------- Announcements (broadcast to mobile) ----------
function openAnnounce(){
  loadAnnRecent();
  const sup=!!(window.dashUser&&window.dashUser.is_super);
  const pw=$('#annPhotoWrap'); if(pw) pw.style.display=sup?'':'none';   // recognition photo: superadmin only
  const cw=$('#annCaptionWrap'); if(cw) cw.style.display=sup?'':'none';
  if($('#annPhoto')) $('#annPhoto').value=''; if($('#annCaption')) $('#annCaption').value='';
  openModal($('#announceModal'));
}
async function loadAnnRecent(){
  const el=$('#annRecent'); if(!el)return; el.innerHTML='Loading…';
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/announcements?select=*&order=created_at.desc&limit=20`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const rows=r.ok?await r.json():[];
    el.innerHTML=rows.length?rows.map(a=>`<div style="border-bottom:1px dashed #eef1ed;padding:6px 0"><b>${(a.title||'Announcement')}</b> <span class="status ${a.audience==='sales'?'assigned':a.audience==='technician'?'en-route':'completed'}" style="font-size:7px">${a.audience||'all'}</span><div style="color:#586965;margin:2px 0;white-space:pre-wrap">${(a.body||'').replace(/</g,'&lt;')}</div><div style="color:#9aa6a2;font-size:9px">${fmtWhen(a.created_at)}${a.created_super?' · 🛡️ Superadmin':''} ${canRemoveAnn(a)?`<button class="assign-btn" data-delann="${a.id}" style="margin-left:6px">Delete</button>`:''}</div></div>`).join(''):'<span style="color:#9aa6a2">No announcements yet.</span>';
    $$('#annRecent [data-delann]').forEach(b=>b.onclick=()=>delAnnounce(b.dataset.delann));
  }catch(e){ el.innerHTML='<span style="color:#c2503a">Could not load.</span>'; }
}
async function postAnnounce(){
  const audience=$('#annAudience').value, title=($('#annTitle').value||'').trim(), body=($('#annBody').value||'').trim();
  if(!body){ showToast('Type a message'); return; }
  const who=(window.dashUser&&(window.dashUser.display_name||window.dashUser.username))||'Dispatcher';
  const btn=$('#annPost'); btn.disabled=true; btn.textContent='Posting…';
  try{
    let photo_path=null;
    const pf=$('#annPhoto'); const file=pf&&pf.files&&pf.files[0];
    if(file && window.dashUser&&window.dashUser.is_super){
      try{ const blob=await compressImage(file,1200,140); const client=sbc(); const path=`announce/${Date.now()}_${Math.random().toString(36).slice(2,7)}.jpg`;
        const {error:e2}=await client.storage.from('job-photos').upload(path,blob,{contentType:'image/jpeg',upsert:false}); if(!e2) photo_path=path; }catch(e){}
    }
    const created_super=!!(window.dashUser&&window.dashUser.is_super);
    const photo_caption=photo_path?(($('#annCaption')&&$('#annCaption').value||'').trim()||null):null;
    await fetch(`${SUPA_URL}/rest/v1/announcements`,{method:'POST',headers:DH(),body:JSON.stringify({audience,title,body,created_by:who,photo_path,photo_caption,created_super})});
    pushNotify({audience,title:'📢 '+(title||'Announcement'),body});
    $('#annTitle').value=''; $('#annBody').value=''; if($('#annPhoto'))$('#annPhoto').value=''; if($('#annCaption'))$('#annCaption').value=''; showToast('Announcement posted'); loadAnnRecent(); renderAnnounceBar();
  }catch(e){ showToast('Post failed'); }
  btn.disabled=false; btn.textContent='Post announcement';
}
async function delAnnounce(id){
  if(!confirm('Delete this announcement?'))return;
  try{ await fetch(`${SUPA_URL}/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:DH()}); loadAnnRecent(); renderAnnounceBar(); }catch(e){ showToast('Delete failed'); }
}
// Who may remove an announcement: superadmin (any) · Admin (only non-superadmin posts)
function canRemoveAnn(a){
  const u=window.dashUser; if(!u) return false;
  if(u.is_super) return true;
  const role=String(u.role_label||'').toLowerCase();
  if(role.includes('admin') && !a.created_super) return true;
  // Anyone (incl. a subcontractor console user) may remove an announcement THEY posted.
  const me=String(u.display_name||u.username||'').toLowerCase();
  if(me && String(a.created_by||'').toLowerCase()===me && !a.created_super) return true;
  return false;
}
// Fixed announcement bar on the console (mirrors the mobile bar). Stays until removed.
async function renderAnnounceBar(){
  const bar=$('#annBar'); if(!bar) return;
  try{
    const r=await fetch(`${SUPA_URL}/rest/v1/announcements?select=*&order=created_at.desc&limit=1`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()}});
    const a=(r.ok?await r.json():[])[0];
    if(!a){ bar.classList.add('hidden'); bar.innerHTML=''; return; }
    const esc=s=>(s||'').replace(/</g,'&lt;'); const rec=!!a.photo_path;
    const img=rec?`<img src="${photoBase(a.photo_path)}" alt="" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:2px solid #fff;flex:none">`:'';
    const rm=canRemoveAnn(a)?`<button id="annBarRm" data-id="${a.id}" style="flex:none;border:0;background:rgba(255,255,255,.2);color:inherit;border-radius:8px;padding:6px 11px;font-weight:700;font-size:11px;cursor:pointer">✕ Remove</button>`:'';
    bar.style.cssText='display:flex;gap:13px;align-items:center;padding:10px 30px;'+(rec?'background:linear-gradient(135deg,#f6c453,#e9952f);color:#3a2600':'background:#0e3531;color:#eaf5f1');
    bar.innerHTML=`${img}<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:9px;letter-spacing:.06em;opacity:.85">${rec?'🏆 RECOGNITION':'📢 ANNOUNCEMENT'} · ${esc(a.audience||'all').toUpperCase()}</div><div style="font-weight:800;font-size:13px">${esc(a.title||'Announcement')}</div><div style="font-size:11px;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.body||'')}</div></div>${rm}`;
    bar.classList.remove('hidden');
    const b=$('#annBarRm'); if(b) b.onclick=()=>removeAnnounce(b.dataset.id);
  }catch(e){ bar.classList.add('hidden'); }
}
async function removeAnnounce(id){
  if(!confirm('Remove this announcement? It will disappear from everyone’s bar. This is permanent.')) return;
  try{ await fetch(`${SUPA_URL}/rest/v1/announcements?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:DH()}); showToast('Announcement removed'); renderAnnounceBar(); }
  catch(e){ showToast('Remove failed'); }
}

// ---------- Import work orders from Excel → For Dispatch ----------
const IMPORT_HMAP={};
[['firstname','first_name'],['middlename','middle_name'],['lastname','last_name'],
 ['subscriber','subscriber'],['pangalan','subscriber'],['name','subscriber'],['subscribername','subscriber'],['fullname','subscriber'],
 ['primaryno','primary_no'],['primarycontactno','primary_no'],['contactno','primary_no'],['contactnumber','primary_no'],['contact','primary_no'],['mobile','primary_no'],['mobileno','primary_no'],['cellno','primary_no'],
 ['othercontactno','other_contact_no'],['othercontact','other_contact_no'],['secondaryno','other_contact_no'],['alternateno','other_contact_no'],
 ['houseno','house_no'],['housenumber','house_no'],
 ['streetname','street_name'],['street','street_name'],
 ['villagesubdivision','village'],['village','village'],['subdivision','village'],
 ['brgy','brgy'],['barangay','brgy'],
 ['city','city'],['citymunicipality','city'],['municipality','city'],
 ['ibassacctno','ibass_acct_no'],['ibasacctno','ibass_acct_no'],['ibassaccount','ibass_acct_no'],['ibasaccount','ibass_acct_no'],['ibassaccountno','ibass_acct_no'],['ibasaccountno','ibass_acct_no'],['ibasacct','ibass_acct_no'],['ibassacct','ibass_acct_no'],['acctno','ibass_acct_no'],['accountno','ibass_acct_no'],['account','ibass_acct_no'],
 ['joborderno','job_order_no'],['jobordernumber','job_order_no'],['jono','job_order_no'],['jonumber','job_order_no'],['jo','job_order_no'],
 ['vasno','vas_no'],['vas','vas_no'],
 ['1por2p','play_type'],['playtype','play_type'],['play','play_type'],['1p2p','play_type'],
 ['plan','plan'],['planrefno','plan'],['planreference','plan'],
 ['refno','ref_no'],['reference','ref_no'],['referenceno','ref_no'],
 ['newref','new_ref'],['newreference','new_ref'],['newrefno','new_ref'],
 ['servicetype','type'],['service','type'],['type','type'],
 ['priority','priority'],['loadpriority','priority'],
 ['dispatchstatus','dispatch_status'],
 ['driver','driver'],
 ['tech1','tech1'],['technician1','tech1'],['technician','tech1'],
 ['mappingteam','mapping_team'],['mappingremarks','mapping_remarks'],
 ['dispatchedremarks','dispatched_remarks'],['dispatchremarks','dispatched_remarks'],
 ['incharge','in_charge'],
 ['sourceofsales','source_of_sales'],['source','source_of_sales'],
 ['referralname','referral_name'],['referral','referral_name'],
 ['specialnote','special_note'],['note','special_note'],['remarks','special_note'],
 ['teamassigned','team'],['team','team'],
 ['date','load_date'],['preferreddate','load_date'],['loaddate','load_date']
].forEach(([k,v])=>IMPORT_HMAP[k]=v);
const normHdr=h=>String(h||'').toLowerCase().replace(/[^a-z0-9]/g,'');
async function downloadImportTemplate(){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  const headers=['Date','IBAS ACCT NO','1P or 2P','REF NO','PLAN','PRIMARY NO','SECONDARY NO','FIRST NAME','MIDDLE NAME','LAST NAME','HOUSE NO','STREET NAME','VILLAGE/SUBDIVISION','BARANGAY','CITY','SOURCE OF SALES','REFERRAL NAME'];
  const ws=XLSX.utils.aoa_to_sheet([headers]); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'NEW LOADS');
  const out=XLSX.write(wb,{type:'array',bookType:'xlsx'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/octet-stream'})); a.download='AHBA_import_template.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),8000);
  showToast('Template downloaded — fill it in, then Import Excel');
}
// Finds the sheet + header row that best matches our known columns (handles title rows / extra sheets)
function parseWorkbook(wb){
  let best={score:-1};
  wb.SheetNames.forEach(sn=>{
    const aoa=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:''});
    for(let h=0;h<Math.min(aoa.length,15);h++){
      const hdr=aoa[h]||[]; let score=0; hdr.forEach(c=>{ if(IMPORT_HMAP[normHdr(c)]) score++; });
      if(score>best.score) best={score,sheet:sn,headerRow:h,aoa};
    }
  });
  if(!best.aoa||best.score<2) return {rows:[],headers:(best.aoa&&best.aoa[0])||[],score:best.score};
  const hdr=best.aoa[best.headerRow]; const rows=[];
  for(let i=best.headerRow+1;i<best.aoa.length;i++){
    const r=best.aoa[i]; if(!r||!r.some(c=>String(c).trim()!=='')) continue;
    const obj={}; hdr.forEach((h,ci)=>{ obj[h]= r[ci]!==undefined? r[ci] : ''; });
    rows.push(obj);
  }
  return {rows,headers:hdr,score:best.score,sheet:best.sheet};
}
async function handleImportFile(file){
  try{ await ensureXLSX(); }catch(_){ showToast('Excel library failed to load'); return; }
  const reader=new FileReader();
  reader.onload=e=>{
    let parsed;
    try{ const wb=XLSX.read(e.target.result,{type:'array'}); parsed=parseWorkbook(wb); }
    catch(err){ showToast('Could not read file: '+err.message); return; }
    if(!parsed.rows.length){
      const seen=(parsed.headers||[]).filter(Boolean).join(', ').slice(0,300);
      alert('No matching column found.\n\nHeaders detected: '+(seen||'(none)')+'\n\nUse the "Template" button for the correct format, or make sure there is a column like FIRST NAME / SUBSCRIBER / PRIMARY NO. / JOB ORDER NO.');
      return;
    }
    if(!confirm(`Sheet "${parsed.sheet}" · ${parsed.rows.length} row(s) detected.\n\nImport as new job orders straight to For Dispatch?`)) return;
    importJobsFromRows(parsed.rows);
  };
  reader.readAsArrayBuffer(file);
}
async function importJobsFromRows(rows){
  const today=manilaToday(), now=new Date().toISOString();
  const out=[];
  rows.forEach((row,idx)=>{
    const g={}; Object.keys(row).forEach(k=>{ const f=IMPORT_HMAP[normHdr(k)]; if(f && row[k]!==''&&row[k]!=null) g[f]=String(row[k]).trim(); });
    const full=g.subscriber||[g.first_name,g.middle_name,g.last_name].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    if(!full && !g.primary_no && !g.job_order_no) return; // skip blank lines
    const addr=[g.house_no,g.street_name,g.village,g.brgy,g.city].filter(Boolean).join(', ');
    const id='WO-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6)+String(idx);
    const o={ id, subscriber:full||'Subscriber', service_type:g.type||'Installation', plan:g.plan||'', area:g.city||g.brgy||'', address:addr,
      status:'pending', wait_time:'Imported', priority:g.priority||'1st Load', schedule:'Today', team:g.team||null, load_date:today, created_by:'IMPORT', created_at:now, updated_at:now,
      first_name:g.first_name,middle_name:g.middle_name,last_name:g.last_name,primary_no:g.primary_no,other_contact_no:g.other_contact_no,
      house_no:g.house_no,street_name:g.street_name,village:g.village,brgy:g.brgy,city:g.city,
      ibass_acct_no:g.ibass_acct_no,job_order_no:g.job_order_no,vas_no:g.vas_no,play_type:g.play_type,ref_no:g.ref_no,new_ref:g.new_ref,
      dispatch_status:g.dispatch_status,driver:g.driver,tech1:g.tech1,mapping_team:g.mapping_team,mapping_remarks:g.mapping_remarks,dispatched_remarks:g.dispatched_remarks,
      in_charge:g.in_charge,source_of_sales:g.source_of_sales,referral_name:g.referral_name,special_note:g.special_note };
    // keep identical keys across all rows (PostgREST bulk insert requires it); blanks → null
    Object.keys(o).forEach(k=>{ if(o[k]===undefined||o[k]==='') o[k]=null; });
    out.push(o);
  });
  const skipped=rows.length-out.length;
  if(!out.length){ alert('No valid rows were imported.\n\nMake sure FIRST NAME/SUBSCRIBER, PRIMARY NO., or JOB ORDER NO. is filled in for each row.'); return; }
  showToast(`Importing ${out.length} job order(s)…`);
  try{
    for(let i=0;i<out.length;i+=100){
      const r=await fetch(`${SUPA_URL}/rest/v1/jobs`,{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(out.slice(i,i+100))});
      if(!r.ok){ const t=await r.text(); throw new Error(t.slice(0,200)); }
    }
    // refresh from cloud so the new jobs appear on the board
    if(window.AHBACloud&&AHBACloud.getJobs){ try{ jobs=await AHBACloud.getJobs(); localStorage.setItem('fieldflow_jobs',JSON.stringify(jobs)); }catch(e){} }
    switchPage('timeline'); renderOverview();
    alert(`✅ Imported ${out.length} job order(s) → For Dispatch.`+(skipped?`\n${skipped} blank/invalid row(s) skipped.`:''));
  }catch(e){ alert('Import failed: '+(e.message||e)); }
}

function init(){
  _stampVersion(); checkAppVersion(); setInterval(checkAppVersion, 5*60*1000);   // version stamp + auto refresh-nudge
  injectIcons();const d=new Date();$('#todayLabel').textContent=d.toLocaleDateString('en-PH',{timeZone:TZ,weekday:'short',month:'short',day:'numeric'});$$('input[type=date]').forEach(i=>i.value=manilaToday());
  buildTeamDropdowns();
  renderOverview();renderTeams();renderNotifPop();
  // Pull newly-created technician accounts into the team list (assign, Field Teams, dropdowns)
  syncTeamsFromDb().then(a=>{ if(a){ renderTeams($('#teamSearch')?.value||''); } });

  // Live team shifts (account + crew, online status) — load now, then refresh every 20s
  const refreshShifts=()=>Promise.all([loadTeamShifts(), syncTeamsFromDb()]).then(()=>{ renderTeams($('#teamSearch')?.value||''); if($('#timelinePage')?.classList.contains('active')){ renderTimeline(); renderJobs(); } if($('#overviewPage')?.classList.contains('active')) renderOverview(); });
  refreshShifts(); setInterval(refreshShifts, 20000);

  // Metric cards → clickable shortcuts
  $$('[data-go]').forEach(b=>b.onclick=()=>switchPage(b.dataset.go));
  $('#dispatchSearch')?.addEventListener('input',applyDispatchSearch);

  // Live shift clock (updates every second)
  updateShiftClock(); setInterval(updateShiftClock, 1000);

  $$('.nav-item').forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
  $$('[data-page-link]').forEach(b=>b.onclick=()=>switchPage(b.dataset.pageLink));
  // Dashboard sub-view toggle: Teams (timeline) | Loads (dispatch board)
  $$('#dashViewTabs [data-dashview]').forEach(b=>b.onclick=()=>setDashView(b.dataset.dashview));
  // Dashboard filters (Load Type · District · Brgy) → re-render the timeline
  $$('#tlFilters select').forEach(s=>s.onchange=()=>renderTimeline());
  $('#tlfClear')?.addEventListener('click',()=>{ ['tlfOrg','tlfType','tlfDistrict','tlfBrgy'].forEach(id=>{const e=$('#'+id); if(e)e.value='';}); renderTimeline(); });
  $('#tlExportBtn')?.addEventListener('click',exportDispatchXlsx);
  loadOrgMap();
  $$('[data-action="new-order"]').forEach(b=>b.onclick=()=>{ openModal($('#orderModal')); setOrderType('SLI'); ordPopulatePlans(); ordToggleAddonCount(); populateOrdBrgys(($('#ord_district')||{}).value||''); });
  $$('#ordTypeTabs [data-ordtype]').forEach(b=>b.onclick=()=>setOrderType(b.dataset.ordtype));
  $('#ord_dwelling')?.addEventListener('change',ordPopulatePlans);
  $('#ord_district')?.addEventListener('change',e=>populateOrdBrgys(e.target.value));
  $('#ord_play')?.addEventListener('change',ordToggleAddonCount);
  $$('[data-action="add-expense"]').forEach(b=>b.onclick=()=>openModal($('#expenseModal')));
  $$('.close-modal').forEach(b=>b.onclick=closeModals);
  $('#modalBackdrop').onclick=closeModals;

  // Sidebar (mobile)
  $('#menuBtn').onclick=openSidebar;
  $('#sidebarCloseBtn')?.addEventListener('click',closeSidebar);
  $('#sidebarScrim')?.addEventListener('click',closeSidebar);

  // Notification popover
  $('#notifBtn').onclick=e=>{e.stopPropagation();toggleNotif()};
  $('#notifPop').onclick=e=>e.stopPropagation();
  $('#notifClear').onclick=()=>{notifReadAt=Date.now();localStorage.setItem('ahba_notif_read',String(notifReadAt));renderNotifPop();closePopovers();showToast('All notifications marked as read')};

  // Role switcher
  $('#roleSwitcher').onclick=e=>{e.stopPropagation();const rm=$('#roleMenu'),open=rm.hidden;closePopovers();if(open){rm.hidden=false;$('#roleSwitcher').setAttribute('aria-expanded','true')}};
  $('#roleMenu').onclick=e=>e.stopPropagation();
  $$('#roleMenu [data-role]').forEach(b=>b.onclick=()=>{$('#roleLabel').textContent=b.dataset.role;closePopovers();showToast(`Viewing as ${b.dataset.role}`)});

  // Dismiss popovers on outside click / Escape
  document.addEventListener('click',closePopovers);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePopovers();closeSidebar()}});

  // Map controls
  $$('.map-actions [data-seg]').forEach(b=>b.onclick=()=>{$$('.map-actions [data-seg]').forEach(x=>x.classList.remove('active'));b.classList.add('active');mapFilter=b.dataset.seg;renderTeamLocations()});
  $('#mapExpandBtn')?.addEventListener('click',()=>{$('.map-panel').classList.toggle('expanded');setTimeout(()=>{if(leafMap)leafMap.invalidateSize()},250)});
  // Route history: pick any team + date (works for offline teams / past days)
  populateMapHistTeams();
  const mapHist=()=>{ const c=$('#mapHistTeam')?.value; const d=$('#mapHistDate')?.value||manilaToday(); if(c) showTeamTrackOnMap(c,d); else clearTeamTrack(); };
  $('#mapHistTeam')?.addEventListener('focus',()=>{ if(($('#mapHistTeam')?.options.length||0)<=1) populateMapHistTeams(); });
  $('#mapHistTeam')?.addEventListener('change',mapHist);
  $('#mapHistDate')?.addEventListener('change',()=>{ if($('#mapHistTeam')?.value) mapHist(); });
  $('#mapHistClear')?.addEventListener('click',()=>{ clearTeamTrack(); const s=$('#mapHistTeam'); if(s)s.value=''; });
  setInterval(()=>{ if($('#overviewPage')?.classList.contains('active')) renderTeamLocations(); }, 30000);
  // Proactive team-monitoring alerts (travel >45m, idle >30m) for ALL console users
  setTimeout(monitorTeams, 9000); setInterval(monitorTeams, 60000);
  setInterval(renderAnnounceBar, 60000);
  $('#clearLoadsBtn')?.addEventListener('click',deleteAllLoads);

  // Forms
  $('#orderForm').onsubmit=submitOrder;
  $$('#orderModal [data-doc]').forEach(inp=>inp.onchange=()=>{ const cat=inp.dataset.doc; ordDocs[cat]=[...inp.files]; const b=$(`#orderModal [data-cnt="${cat}"]`); if(b)b.textContent=`${ordDocs[cat].length} file(s)`; });
  $$('#orderModal input[inputmode="numeric"]').forEach(el=>el.oninput=()=>{el.value=el.value.replace(/\D/g,'').slice(0,11)});
  $('#expenseForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
    fetch(`${SUPA_URL}/rest/v1/expenses`,{method:'POST',headers:{apikey:SUPA_KEY,Authorization:'Bearer '+dashTok(),'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({team:f.team,category:f.category,description:f.description,amount:Number(f.amount),job_id:f.workOrder||null,status:'Pending',work_date:manilaToday()})}).then(()=>setTimeout(renderExpenses,400)).catch(()=>{});
    e.target.reset();closeModals();showToast('Expense recorded for approval')};

  // Search + filters
  $('#teamSearch').oninput=e=>renderTeams(e.target.value);
  $('#jobSearch').oninput=applyJobTableFilter;
  $$('#jobFilters button').forEach(b=>b.onclick=()=>{$$('#jobFilters button').forEach(x=>x.classList.remove('active'));b.classList.add('active');applyJobTableFilter()});

  $('#autoAssignBtn').onclick=()=>{const pending=jobs.find(j=>j.status==='pending');pending?openAssign(pending.id):showToast('No unassigned jobs in the queue')};
  $('#announceBtn')?.addEventListener('click',openAnnounce);
  $('#annPost')?.addEventListener('click',postAnnounce);
  $('#dashChatFab')?.addEventListener('click',()=>{ const f=$('#dashChatFab'); if(f&&f._dragged) return; chatWidgetOpen()?closeChatWidget():openChatWidget(); });
  enableFabDrag();
  window.addEventListener('resize',()=>{ if(chatWidgetOpen()) positionChatToFab(); });
  document.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{ const inp=$('#'+b.dataset.eye); if(!inp)return; const reveal=inp.type==='password'; inp.type=reveal?'text':'password'; b.textContent=reveal?'Hide':'Show'; });
  $('#dcClose')?.addEventListener('click',e=>{e.stopPropagation();closeChatWidget();});
  $('#dcMin')?.addEventListener('click',e=>{e.stopPropagation();minimizeChat();});
  $('#dcBack')?.addEventListener('click',e=>{e.stopPropagation();showCwTeams();});
  $('#dcHead')?.addEventListener('click',()=>{ const w=$('#dashChatWidget'); if(w.classList.contains('min')) w.classList.remove('min'); });
  $('#dcSend')?.addEventListener('click',sendCw);
  $('#dcInput')?.addEventListener('keydown',e=>{ if(e.key==='Enter') sendCw(); });
  $('#dcPhotoBtn')?.addEventListener('click',()=>$('#dcPhoto')?.click());
  $('#dcPhoto')?.addEventListener('change',e=>{ setCwPhoto(e.target.files&&e.target.files[0]); });
  startDashChat();
  $('#importTemplateBtn')?.addEventListener('click',downloadImportTemplate);
  $('#importXlsxBtn')?.addEventListener('click',()=>$('#importXlsxInput').click());
  $('#importXlsxInput')?.addEventListener('change',e=>{ if(e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value=''; });

  // Completed view: export + clear
  $('#exportBtn')?.addEventListener('click',exportZip);
  $('#clearBtn')?.addEventListener('click',clearCloud);
  $('#histExport')?.addEventListener('click',exportHistoryExcel);
  $('#remExport')?.addEventListener('click',exportRemittance);
  $('#attExport')?.addEventListener('click',exportAttendance);
  $('#gateExport')?.addEventListener('click',exportGateLog);

  // Validator badge (count of pending sales-agent submissions)
  refreshValBadge(); setInterval(refreshValBadge,30000);

  // Superadmin password reset
  $('#resetNow')?.addEventListener('click',resetNow);

  // ---- Dashboard login + access wiring ----
  $('#dashLoginForm')?.addEventListener('submit',async e=>{
    e.preventDefault(); dgErr('#dlErr','');
    const u=$('#dlUser').value.trim(), p=$('#dlPass').value; if(!u||!p)return;
    const btn=$('#dlBtn'); btn.disabled=true; btn.textContent='Signing in…';
    const {data,error}=await dashAuth.auth.signInWithPassword({email:dashEmailFor(u),password:p});
    btn.disabled=false; btn.textContent='Sign in';
    if(error){ dgErr('#dlErr',/invalid/i.test(error.message||'')?'Wrong username or password.':(error.message||'Sign-in failed.')); return; }
    _dashTouch();
    onDashLogin(data.user.email);
  });
  $('#dashPwForm')?.addEventListener('submit',async e=>{
    e.preventDefault(); dgErr('#dpwErr','');
    const a=$('#dpw1').value, b=$('#dpw2').value;
    if(a.length<8){ dgErr('#dpwErr','Password must be at least 8 characters.'); return; }
    if(a!==b){ dgErr('#dpwErr','Passwords do not match.'); return; }
    const btn=$('#dpwBtn'); btn.disabled=true; btn.textContent='Saving…';
    const {error}=await dashAuth.auth.updateUser({password:a});
    btn.disabled=false; btn.textContent='Save password';
    if(error){ dgErr('#dpwErr',error.message); return; }
    if(window.dashUser){ fetch(`${SUPA_URL}/rest/v1/dashboard_users?username=eq.${encodeURIComponent(window.dashUser.username)}`,{method:'PATCH',headers:DH(),body:JSON.stringify({must_change:false,password_changed_at:new Date().toISOString()})}).catch(()=>{}); window.dashUser.must_change=false; hideDashGates(); applyAccess(window.dashUser); }
  });
  $('#dashLogoutBtn')?.addEventListener('click',dashLogout);
  $('#dashChangePw')?.addEventListener('click',()=>{ closePopovers&&closePopovers(); showDashGate('#dashPwGate'); });
  $('#dashChangeName')?.addEventListener('click',()=>{ closePopovers&&closePopovers(); changeMyDisplayName(); });
  $('#dashChangeUser')?.addEventListener('click',()=>{ closePopovers&&closePopovers(); changeMyUsername(); });
  $('#cuCreate')?.addEventListener('click',createDashUser);
  $('#cfCreate')?.addEventListener('click',createFieldUser);
  // Subcontractors panel
  $('#scAddOrg')?.addEventListener('click',createOrg);
  $('#scRefresh')?.addEventListener('click',renderSubcon);
  $('#scCuCreate')?.addEventListener('click',scCreateConsole);
  $('#scCfCreate')?.addEventListener('click',scCreateMobile);
  $('#scWaAdd')?.addEventListener('click',addWorkAccount);
  $('#gcWaAdd')?.addEventListener('click',gcAddWorkAccount);
  startDashAuth();
}
// One confirm for ALL date pickers — changing any date asks to confirm; on confirm it switches, on cancel it reverts.
document.addEventListener('focus', function(e){ const el=e.target; if(el&&el.tagName==='INPUT'&&el.type==='date'&&!el.dataset.noconfirm) el.dataset.cur=el.value||''; }, true);
document.addEventListener('change', function(e){
  const el=e.target;
  if(!el || el.tagName!=='INPUT' || el.type!=='date' || el.dataset.noconfirm) return;
  if(el.dataset.skipconfirm==='1'){ el.dataset.skipconfirm=''; return; }
  const cur=el.dataset.cur||'', picked=el.value||'';
  if(picked===cur) return;
  e.stopImmediatePropagation();
  if(confirm('Change date to '+(picked||'—')+'?')){ el.dataset.cur=picked; el.dataset.skipconfirm='1'; el.dispatchEvent(new Event('change',{bubbles:true})); }
  else { el.value=cur; }
}, true);
document.addEventListener('DOMContentLoaded',init);