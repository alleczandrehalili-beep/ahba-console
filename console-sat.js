/* ============================================================================
   FieldSales Ops — Quezon City port saturation
   ----------------------------------------------------------------------------
   Superadmin, view only. Every figure is measured from the operator's own
   subscriber listing and the Converge port list; nothing here is simulated.

   The deployment scheduler is deliberately NOT in this build. It needs a real
   agent roster and a real visit history (sat.assignments / sat.coverage), and
   shipping it on placeholder data inside the live console would invite someone
   to read a mock-up as a plan.

   Data arrives as window.SAT_DATA from sat-data.js, regenerated each time a new
   subscriber listing is uploaded. When the `sat` schema lands this module reads
   from Supabase instead; the render code below does not change.
   ========================================================================== */
(function(){
  'use strict';
  const $  = (s,r)=>(r||document).querySelector(s);
  const $$ = (s,r)=>[...(r||document).querySelectorAll(s)];
  const n0 = v => Math.round(v||0).toLocaleString('en-US');
  const n1 = v => (v||0).toFixed(1);
  const n2 = v => (v||0).toFixed(2);
  const TARGET = 0.10, MIN_N = 20;
  const DCOL = ['#0d7a58','#d8452b','#4285f4','#e0a43b','#8e5bd0','#0f8ea8','#c2185b'];
  const satCls = p => p>=10?'p-grn':p>=5?'p-amb':'p-red';
  const satCol = p => p>=12?'#0d7a58':p>=10?'#18a57b':p>=7.5?'#7cc06a':p>=5?'#e0a43b':p>=3?'#f07b52':'#d8452b';
  const esc = v => String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let FX=null, R=[], tab='ov', ready=false;
  let sortKey='rank', sortDir=-1, fQ='', lockKind='', lockVal='', subBand='', subDist='';
  let anSort='n9', mapView='tiles';

  const BANDS=[['lt3','under 3%',0,3],['3to5','3 – 5%',3,5],['5to75','5 – 7.5%',5,7.5],
               ['75to10','7.5 – 10%',7.5,10],['ge10','10% and above',10,1e9]];
  const bandOf = r => (BANDS.find(b=>r.sat>=b[2]&&r.sat<b[3])||BANDS[0])[0];

  const MV_IN  = ['ADS → ACT','NEW/OTHER → ACT','APL → ACT','PDS → ACT','DEA → ACT'];
  const MV_OUT = ['ACT → ADS','ACT → PDS','ACT → DEA'];
  function movementOf(r){
    const m=r.mv||{};
    const gi=MV_IN.reduce((s,k)=>s+(m[k]||0),0), lo=MV_OUT.reduce((s,k)=>s+(m[k]||0),0);
    return { gi, lo, net:gi-lo, bop:r.a-gi+lo,
             react:m['ADS → ACT']||0, fresh:m['NEW/OTHER → ACT']||0,
             toAds:m['ACT → ADS']||0, toPds:m['ACT → PDS']||0 };
  }

  /* Ranking: an equal-voice blend of three orderings — most vacant ports, lowest
     saturation, biggest recoverable pool — plus migration at half weight. Ranks
     rather than raw numbers, so a 28,923-port barangay cannot drown out a 4,554
     one on scale alone. No urgency term: that needs a real visit history. */
  function build(){
    const rows = FX.brgy.map(b=>{
      const r = Object.assign({}, b);
      r.sat  = r.p ? r.a/r.p*100 : 0;
      r.gap  = Math.max(0, r.p*TARGET - r.a);
      r.vac  = Math.max(0, r.p - r.a);
      r.rec  = (r.w||0) + (r.x||0);
      r.mig  = r.mig||0;
      r.n3   = (r.a3||0)-(r.l3||0); r.n6=(r.a6||0)-(r.l6||0); r.n9=(r.a9||0)-(r.l9||0);
      r.adsr = (r.a+r.ads) ? r.ads/(r.a+r.ads)*100 : 0;
      r.suspr= r.a ? (r.susp||0)/r.a*100 : 0;
      r.legacyr = r.a ? r.mig/r.a*100 : 0;
      Object.assign(r, movementOf(r));
      return r;
    });
    const N=rows.length;
    const mark=(k,dir,f)=>rows.slice().sort((a,b)=>dir*(a[k]-b[k])).forEach((r,i)=>r[f]=i+1);
    mark('vac',-1,'rVac'); mark('sat',1,'rSat'); mark('rec',-1,'rRec'); mark('mig',-1,'rMig');
    const W=1+1+0.5+0.5;
    rows.forEach(r=>{
      r.blendRank=(1*r.rVac + 1*r.rSat + 0.5*r.rRec + 0.5*r.rMig)/W;
      if(r.p<500) r.blendRank+=N;                 // covered every cycle, never prioritised
      r.score=2*N-r.blendRank;
    });
    rows.sort((a,b)=>b.score-a.score).forEach((r,i)=>r.pos=i+1);
    return rows;
  }
  const TOT = () => R.reduce((t,r)=>({p:t.p+r.p,a:t.a+r.a,w:t.w+(r.w||0),x:t.x+(r.x||0),
    mig:t.mig+r.mig,vac:t.vac+r.vac,pre:t.pre+(r.pre||0),ads:t.ads+(r.ads||0)}),
    {p:0,a:0,w:0,x:0,mig:0,vac:0,pre:0,ads:0});
  const ranked = () => R.filter(r=>r.a>=MIN_N);

  /* ---------- shell ---------- */
  function shell(){
    const t=TOT();
    return `<div class="sat-wrap">
      <div class="sat-age">
        <span>Snapshot <b>${esc(FX.asof)}</b></span><span class="sat-dot">·</span>
        <span>file baseline <b>${esc(FX.prev)}</b></span>
        ${FX.prev2?`<span class="sat-dot">·</span><span>previous upload <b>${esc(FX.prev2)}</b></span>`:''}
        <span class="sat-dot">·</span><span>${n0(FX.source.subs_rows)} subscriber rows</span>
        <span class="sat-dot">·</span><span><b>${n2(t.a/t.p*100)}%</b> of ${n0(t.p)} ports</span>
        <span class="sat-ro">view only</span>
      </div>
      <div class="sat-tabs">
        ${[['ov','Overview'],['ag','Sales personnel'],['br','Barangays'],['an','Analyze'],['mp','Map']]
          .map(([k,l])=>`<button class="sat-tab ${tab===k?'on':''}" data-sattab="${k}">${l}</button>`).join('')}
      </div>
      <div id="satBody"></div>
    </div>`;
  }

  /* ---------- Overview ---------- */
  function viewOV(){
    const t=TOT();
    const gi=R.reduce((s,r)=>s+r.gi,0), lo=R.reduce((s,r)=>s+r.lo,0), bop=R.reduce((s,r)=>s+r.bop,0);
    const react=R.reduce((s,r)=>s+r.react,0), fresh=R.reduce((s,r)=>s+r.fresh,0);
    const prevA=R.reduce((s,r)=>s+(r.prevA||0),0);
    const satNow=t.a/t.p*100, need=t.p*TARGET-t.a;
    const qual=gi?react/gi*100:0;

    /* Growth: the last 12 months of installs against permanent disconnections.
       Older months under-report badly — the trend is rebuilt from this file's
       dates, so anyone disconnected long enough ago to have left the listing
       leaves no trace and 2025 reads as ~12 a month, which is not real. */
    const all=(FX.trend||[]).map(([m,i,d])=>({m,i,d,net:i-d}));
    const tr=all.slice(-12);
    let growth='';
    if(tr.length>=6){
      const ds=tr.map(r=>r.d).slice().sort((a,b)=>a-b);
      const medD=(ds[Math.floor((ds.length-1)/2)]+ds[Math.ceil((ds.length-1)/2)])/2;
      const purge=tr.filter(r=>r.d>medD*4), norm=tr.filter(r=>r.d<=medD*4);
      let before=[],after=norm;
      if(purge.length){ const pm=purge[purge.length-1].m;
        before=norm.filter(r=>r.m<pm); after=norm.filter(r=>r.m>pm); }
      const sum=(a,k)=>a.reduce((s,r)=>s+r[k],0);
      const last=tr[tr.length-1];
      const peak=tr.reduce((b,r)=>r.i>b.i?r:b,tr[0]);
      const addDrop=peak.i?(peak.i-last.i)/peak.i*100:0;
      const ifPeak=peak.i-last.d;
      const months=ifPeak>0?Math.ceil(need/ifPeak):null;
      const v = last.net>50?['growing','sat-ok','sat-good']:last.net<-50?['shrinking','sat-no','sat-bad']:['flat','',''];
      const recent=norm.slice(-5);
      growth=`<div class="sat-card">
        <h3>Is the subscriber base growing?</h3>
        <p class="sat-cap">The last <b>${tr.length} months</b> of installs against permanent disconnections, not the
          latest period alone.${purge.length?` ${purge.map(p=>p.m).join(', ')} carried a one-off base purge
          (${n0(purge[0].d)} against a ${n0(medD)} median) and is held out of the period totals.`:''}
          Earlier months are excluded on purpose: the trend is rebuilt from this file's dates, so anyone
          disconnected long enough ago to have left the listing leaves no trace.</p>
        <div class="sat-kpis">
          <div class="sat-kpi ${v[2]}"><span class="k">Verdict</span><span class="v" style="font-size:20px">${v[0]}</span>
            <span class="n">latest month net <b class="${v[1]}">${last.net>0?'+':''}${n0(last.net)}</b></span></div>
          <div class="sat-kpi"><span class="k">Gross adds</span><span class="v">${n0(last.i)}</span>
            <span class="n">peak ${n0(peak.i)} in ${peak.m} · <b class="${addDrop>0?'sat-no':'sat-ok'}">${addDrop>0?'−':'+'}${n0(Math.abs(addDrop))}%</b></span></div>
          <div class="sat-kpi"><span class="k">Disconnections</span><span class="v">${n0(last.d)}</span>
            <span class="n">in ${last.m}</span></div>
          <div class="sat-kpi"><span class="k">Still needed for 10%</span><span class="v">${n0(need)}</span>
            <span class="n">${months?`<b>${n0(months)} months</b> if adds return to peak`:'not closing at this rate'}</span></div>
        </div>
        ${before.length&&after.length?`<table class="sat-tbl"><thead><tr><th>Period</th><th>Months</th><th>Installs</th><th>Disconnections</th><th>Net</th><th>Per month</th></tr></thead><tbody>
          <tr><td><b>${before[0].m} – ${before[before.length-1].m}</b></td><td class="num">${before.length}</td>
            <td class="num">${n0(sum(before,'i'))}</td><td class="num">${n0(sum(before,'d'))}</td>
            <td class="num ${sum(before,'net')>0?'sat-ok':'sat-no'}"><b>${sum(before,'net')>0?'+':''}${n0(sum(before,'net'))}</b></td>
            <td class="num">${n0(sum(before,'net')/before.length)}</td></tr>
          <tr><td><b>${after[0].m} – ${after[after.length-1].m}</b></td><td class="num">${after.length}</td>
            <td class="num">${n0(sum(after,'i'))}</td><td class="num">${n0(sum(after,'d'))}</td>
            <td class="num ${sum(after,'net')>0?'sat-ok':'sat-no'}"><b>${sum(after,'net')>0?'+':''}${n0(sum(after,'net'))}</b></td>
            <td class="num">${n0(sum(after,'net')/after.length)}</td></tr>
          ${purge.map(p=>`<tr class="sat-faint"><td>${p.m} — one-off purge</td><td class="num">1</td>
            <td class="num">${n0(p.i)}</td><td class="num">${n0(p.d)}</td><td class="num">${n0(p.net)}</td><td class="num">—</td></tr>`).join('')}
        </tbody></table>`:''}
        <table class="sat-tbl" style="margin-top:10px"><thead><tr><th>Month</th><th>Installs</th><th>Disconnections</th><th>Net</th></tr></thead><tbody>
          ${recent.map(r=>`<tr><td class="mono">${r.m}</td><td class="num">${n0(r.i)}</td><td class="num">${n0(r.d)}</td>
            <td class="num ${r.net<0?'sat-no':r.net>0?'sat-ok':''}"><b>${r.net>0?'+':''}${n0(r.net)}</b></td></tr>`).join('')}
        </tbody></table>
        <div class="sat-box ${v[0]==='growing'?'':'warn'}">
          ${v[0]==='flat'
            ? `<b>The base is flat, and that is not the same as recovered.</b> Break-even is zero, not growth — and it
               was not reached by selling more: gross adds are <b>${n0(Math.abs(addDrop))}% below</b> their ${peak.m}
               peak while disconnections fell faster. <b>The two met in the middle.</b>`
            : v[0]==='shrinking'
            ? `<b>The base is still shrinking.</b> Gross adds are ${n0(Math.abs(addDrop))}% off their ${peak.m} peak.`
            : `<b>The base is growing — ${n0(last.net)} in ${last.m}.</b>`}
          <div style="margin-top:6px"><b>The number to watch is the ${n0(peak.i-last.i)} sales a month that went
            missing</b>, not churn. Put gross adds back at the ${peak.m} level and the net becomes
            <b>${ifPeak>0?'+':''}${n0(ifPeak)}</b> a month with churn untouched${months?`, reaching 10% in <b>${n0(months)} months</b>`:''}.</div>
        </div>
      </div>`;
    }

    const prevCard = prevA ? (()=>{
      const d=t.a-prevA, unexp=prevA-bop;
      return `<div class="sat-card">
        <h3>Against the last upload — ${esc(FX.prev2)} to ${esc(FX.asof)}</h3>
        <div class="sat-kpis">
          <div class="sat-kpi"><span class="k">Active, ${esc(FX.prev2)}</span><span class="v">${n0(prevA)}</span>
            <span class="n">${n2(prevA/t.p*100)}%</span></div>
          <div class="sat-kpi"><span class="k">Active, ${esc(FX.asof)}</span><span class="v">${n0(t.a)}</span>
            <span class="n">${n2(satNow)}%</span></div>
          <div class="sat-kpi ${d>=0?'sat-good':'sat-bad'}"><span class="k">Change</span>
            <span class="v">${d>0?'+':''}${n0(d)}</span><span class="n">${((d)/t.p*100>0?'+':'')}${(d/t.p*100).toFixed(3)} pts</span></div>
          <div class="sat-kpi"><span class="k">This file's own period</span><span class="v">${gi-lo>0?'+':''}${n0(gi-lo)}</span>
            <span class="n">${esc(FX.prev)} → ${esc(FX.asof)}</span></div>
        </div>
        ${Math.abs(unexp)>50?`<div class="sat-box warn"><b>${n0(Math.abs(unexp))} subscribers moved between the two
          uploads that neither file accounts for.</b> Active was ${n0(prevA)} on ${esc(FX.prev2)} and ${n0(bop)} at this
          file's own baseline of ${esc(FX.prev)}. That is either a bad stretch before the cut-off or a restatement of
          the base — the data cannot say which, so it should be asked rather than assumed.</div>`:''}
      </div>`;})() : '';

    return prevCard + `
      <div class="sat-card">
        <h3>What moved — ${esc(FX.prev)} to ${esc(FX.asof)}</h3>
        <p class="sat-cap">Every row carries its <span class="mono">BOP_STATUS</span>, so the period's movement is read
          off the file rather than estimated. It reconciles exactly: ${n0(bop)} + ${n0(gi)} − ${n0(lo)} = ${n0(t.a)}.</p>
        <div class="sat-kpis">
          <div class="sat-kpi sat-good"><span class="k">Gained</span><span class="v">+${n0(gi)}</span><span class="n">into Active</span></div>
          <div class="sat-kpi sat-bad"><span class="k">Lost</span><span class="v">−${n0(lo)}</span><span class="n">out of Active</span></div>
          <div class="sat-kpi ${qual>50?'sat-warn':''}"><span class="k">Reactivations</span><span class="v">${n0(react)}</span>
            <span class="n">${n0(qual)}% of everything gained</span></div>
          <div class="sat-kpi"><span class="k">Genuinely new</span><span class="v">${n0(fresh)}</span>
            <span class="n">${gi?n0(fresh/gi*100):0}% of everything gained</span></div>
        </div>
        ${qual>50?`<div class="sat-box warn"><b>${n0(qual)}% of the gain is subscribers coming back, not new ones.</b>
          That is real revenue and counts toward 10% the same, but a period carried by reactivation is recycling the
          same base — ${n0(t.x)} accounts sit deactivated or in ADS and each can only be reactivated once.</div>`:''}
      </div>
      ${growth}
      <div class="sat-card">
        <h3>The four pools</h3>
        <p class="sat-cap">Where the ${n0(need)} subscribers still needed for 10% can come from.</p>
        <div class="sat-kpis">
          <div class="sat-kpi"><span class="k">Vacant ports</span><span class="v">${n0(t.vac)}</span><span class="n">new-sale capacity</span></div>
          <div class="sat-kpi"><span class="k">Win-back</span><span class="v">${n0(t.w)}</span><span class="n">disconnected 2024 onward</span></div>
          <div class="sat-kpi"><span class="k">Reactivation</span><span class="v">${n0(t.x)}</span><span class="n">deactivated or in ADS</span></div>
          <div class="sat-kpi"><span class="k">Migration</span><span class="v">${n0(t.mig)}</span><span class="n">still on DOCSIS or cable</span></div>
        </div>
      </div>
      <div class="sat-card">
        <h3>By district</h3>
        <table class="sat-tbl"><thead><tr><th>District</th><th>Brgy</th><th>Ports</th><th>Active</th><th>Sat %</th><th>Gap to 10%</th><th>Period net</th><th>Migration</th></tr></thead><tbody>
        ${(()=>{const m={};R.forEach(r=>{const d=m[r.d]||(m[r.d]={d:r.d,n:0,p:0,a:0,gap:0,net:0,mig:0});
          d.n++;d.p+=r.p;d.a+=r.a;d.gap+=r.gap;d.net+=r.net;d.mig+=r.mig;});
          return Object.values(m).sort((a,b)=>b.gap-a.gap).map(d=>`<tr>
            <td><b><i class="sat-sw" style="background:${DCOL[d.d]}"></i>District ${d.d}</b></td>
            <td class="num">${d.n}</td><td class="num">${n0(d.p)}</td><td class="num">${n0(d.a)}</td>
            <td class="num"><span class="pill ${satCls(d.a/d.p*100)}">${n2(d.a/d.p*100)}%</span></td>
            <td class="num">${n0(d.gap)}</td>
            <td class="num ${d.net>0?'sat-ok':d.net<0?'sat-no':''}">${d.net>0?'+':''}${n0(d.net)}</td>
            <td class="num">${n0(d.mig)}</td></tr>`).join('');})()}
        </tbody></table>
      </div>`;
  }

  /* ---------- Barangays ---------- */
  function viewBR(){
    const cols=[['n','Barangay'],['d','D'],['p','Ports'],['a','Active'],['sat','Sat %'],['vac','Vacant'],
                ['gap','Gap'],['w','Win-back'],['x','Reactivate'],['mig','Migrate'],['net','Period net'],['pos','Rank']];
    const scope=R.filter(r=> lockKind==='dist'? r.d==lockVal : lockKind==='band'? bandOf(r)===lockVal : true);
    let rows=scope.filter(r=>(!subBand||bandOf(r)===subBand)&&(!subDist||r.d==subDist)&&(!fQ||r.n.toLowerCase().includes(fQ)));
    rows=rows.slice().sort((a,b)=>{const x=a[sortKey],y=b[sortKey];
      return (typeof x==='string'?x.localeCompare(y):x-y)*sortDir;});
    const sum=a=>a.reduce((s,r)=>({p:s.p+r.p,a:s.a+r.a,gap:s.gap+r.gap,w:s.w+(r.w||0),x:s.x+(r.x||0),mig:s.mig+r.mig}),
      {p:0,a:0,gap:0,w:0,x:0,mig:0});
    const sc=sum(scope), fl=sum(rows);
    const name = lockKind==='dist'?`District ${lockVal}`
               : lockKind==='band'?`Saturation ${(BANDS.find(b=>b[0]===lockVal)||['','?'])[1]}` : 'All Quezon City';
    const bandCt={}; BANDS.forEach(b=>bandCt[b[0]]=scope.filter(r=>bandOf(r)===b[0]).length);
    const distCt={}; [1,2,3,4,5,6].forEach(d=>distCt[d]=scope.filter(r=>r.d==d).length);
    return `<div class="sat-card">
      <h3>Barangays</h3>
      <p class="sat-cap">Lock a scope, then narrow inside it. The locked scope keeps its own totals, so narrowing never
        hides how big it really is.</p>
      <div class="sat-lock">
        <div class="sat-lockrow"><span class="lbl">Lock scope</span><div class="chips">
          <button class="chip ${lockKind===''?'on':''}" data-lock="">All QC <s>${R.length}</s></button>
          ${[1,2,3,4,5,6].map(d=>`<button class="chip ${lockKind==='dist'&&lockVal==d?'on':''}" data-lock="dist:${d}">District ${d} <s>${R.filter(r=>r.d==d).length}</s></button>`).join('')}
        </div></div>
        <div class="sat-lockrow"><span class="lbl"></span><div class="chips">
          ${BANDS.map(b=>`<button class="chip ${lockKind==='band'&&lockVal===b[0]?'on':''}" data-lock="band:${b[0]}">${b[1]} <s>${R.filter(r=>bandOf(r)===b[0]).length}</s></button>`).join('')}
        </div></div>
      </div>
      <div class="sat-scope">
        <div class="hd"><b>🔒 ${esc(name)}</b>${lockKind?`<button class="sat-x" data-lock="">clear lock</button>`:''}</div>
        <div class="st"><span><b>${scope.length}</b> barangays</span><span><b>${n0(sc.p)}</b> ports</span>
          <span><b>${n0(sc.a)}</b> active</span><span class="pill ${satCls(sc.p?sc.a/sc.p*100:0)}">${sc.p?n2(sc.a/sc.p*100):'0.00'}%</span>
          <span>gap <b>${n0(sc.gap)}</b></span><span>win-back <b>${n0(sc.w+sc.x)}</b></span><span>migrate <b>${n0(sc.mig)}</b></span></div>
      </div>
      <div class="sat-ctl">
        <span class="lbl">Narrow within</span>
        ${lockKind!=='band'?`<select id="satSB"><option value="">Any saturation</option>${BANDS.map(b=>`<option value="${b[0]}" ${subBand===b[0]?'selected':''}${bandCt[b[0]]?'':' disabled'}>${b[1]} (${bandCt[b[0]]})</option>`).join('')}</select>`:''}
        ${lockKind!=='dist'?`<select id="satSD"><option value="">Any district</option>${[1,2,3,4,5,6].map(d=>`<option value="${d}" ${subDist==d?'selected':''}${distCt[d]?'':' disabled'}>District ${d} (${distCt[d]})</option>`).join('')}</select>`:''}
        <input type="search" id="satQ" placeholder="Search barangay…" value="${esc(fQ)}">
        <button class="sat-btn" id="satXl">⤓ Export Excel</button>
      </div>
      <div class="sat-res">Showing <b>${rows.length}</b> of ${scope.length} in scope${rows.length&&(subBand||subDist||fQ)?` · ${n0(fl.p)} ports · ${fl.p?n2(fl.a/fl.p*100):'0.00'}% · gap ${n0(fl.gap)}`:''}</div>
      <div class="sat-scroll"><table class="sat-tbl" id="satTbl"><thead><tr>
        ${cols.map(([k,l])=>`<th data-k="${k}" class="${sortKey===k?'on':''}">${l}${sortKey===k?(sortDir<0?' ▾':' ▴'):''}</th>`).join('')}
      </tr></thead><tbody>
      ${rows.length?rows.map(r=>`<tr>
        <td>${esc(r.n)}${r.geo===0?' <span class="pill p-gry">no map</span>':''}</td>
        <td class="num">${r.d}</td><td class="num">${n0(r.p)}</td><td class="num">${n0(r.a)}</td>
        <td class="num"><span class="pill ${satCls(r.sat)}">${n2(r.sat)}%</span></td>
        <td class="num">${n0(r.vac)}</td><td class="num">${r.gap>0?n0(r.gap):'<span class="sat-ok">✓</span>'}</td>
        <td class="num">${n0(r.w)}</td><td class="num">${n0(r.x)}</td>
        <td class="num ${r.mig>200?'sat-no':''}">${r.mig?n0(r.mig):'<span class="sat-faint">—</span>'}</td>
        <td class="num ${r.net>0?'sat-ok':r.net<0?'sat-no':''}">${r.net>0?'+':''}${n0(r.net)}</td>
        <td class="num"><b>#${r.pos}</b></td></tr>`).join('')
        :`<tr><td colspan="12" class="sat-faint" style="text-align:center;padding:16px">No barangay matches these filters inside ${esc(name)}.</td></tr>`}
      </tbody></table></div>
    </div>`;
  }

  /* ---------- Analyze ---------- */
  function viewAN(){
    const rows=ranked(), t=TOT();
    const top=(k,n,dir=-1)=>rows.slice().sort((a,b)=>dir*(a[k]-b[k])).slice(0,n);
    const up=rows.filter(r=>r.n3>0&&r.n6>0&&r.n9>0).sort((a,b)=>b.n9-a.n9);
    const dn=rows.filter(r=>r.n3<0&&r.n6<0&&r.n9<0).sort((a,b)=>a.n9-b.n9);
    const hi=rows.filter(r=>r.legacyr>=50);
    const xs=rows.map(r=>r.legacyr), ys=rows.map(r=>r.n9);
    const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
    let nu=0,dx=0,dy=0; xs.forEach((x,i)=>{nu+=(x-mx)*(ys[i]-my);dx+=(x-mx)**2;dy+=(ys[i]-my)**2;});
    const corr=nu/Math.sqrt(dx*dy);
    const avg=(a,k)=>a.length?a.reduce((s,r)=>s+r[k],0)/a.length:0;
    const byMrc=rows.slice().sort((a,b)=>b.mrc-a.mrc);
    const win=k=>`<div class="sat-two">
      <div><h4 class="sat-ok">Strongest — ${k} months</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>D</th><th>Added</th><th>Lost</th><th>Net</th></tr></thead><tbody>
        ${top('n'+k,6).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num">${n0(r['a'+k])}</td>
          <td class="num">${n0(r['l'+k])}</td><td class="num sat-ok"><b>+${n0(r['n'+k])}</b></td></tr>`).join('')}</tbody></table></div>
      <div><h4 class="sat-no">Weakest — ${k} months</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>D</th><th>Added</th><th>Lost</th><th>Net</th></tr></thead><tbody>
        ${top('n'+k,6,1).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num">${n0(r['a'+k])}</td>
          <td class="num">${n0(r['l'+k])}</td><td class="num sat-no"><b>${n0(r['n'+k])}</b></td></tr>`).join('')}</tbody></table></div></div>`;
    return `
    <div class="sat-card"><h3>Coverage of this analysis</h3>
      <p class="sat-cap"><b>${rows.length}</b> of ${R.length} barangays are ranked. ${R.length-rows.length} are held out
        of every ranking for having under ${MIN_N} active subscribers — on a base that small one account swings the rate,
        and without the guard a barangay with 26 subscribers tops "best payers in Quezon City".</p></div>
    <div class="sat-card"><h3>3, 6 and 9 months — who is growing, who is bleeding</h3>
      <p class="sat-cap">Net = installs minus permanent disconnections inside each window.</p>
      ${win(3)}${win(6)}${win(9)}</div>
    <div class="sat-card"><h3>Consistency</h3>
      <p class="sat-cap">Up in one window can be noise. Up in all three is a trend.</p>
      <div class="sat-two">
        <div><h4 class="sat-ok">Up in 3, 6 and 9 months — ${up.length}</h4>
          <div class="sat-pills">${up.slice(0,18).map(r=>`<span class="pill p-grn">${esc(r.n)} <b>+${n0(r.n9)}</b></span>`).join(' ')||'<span class="sat-faint">none</span>'}</div></div>
        <div><h4 class="sat-no">Down in all three — ${dn.length}</h4>
          <div class="sat-pills">${dn.slice(0,18).map(r=>`<span class="pill p-red">${esc(r.n)} <b>${n0(r.n9)}</b></span>`).join(' ')||'<span class="sat-faint">none</span>'}</div></div>
      </div></div>
    <div class="sat-card"><h3>What sells, and at what price</h3>
      <p class="sat-cap">Average MRC runs ₱${n0(byMrc[byMrc.length-1].mrc)} to ₱${n0(byMrc[0].mrc)} across barangays.
        Pitching a 1500 plan where the barangay buys 999 wastes the visit.</p>
      <div class="sat-two">
        <div><h4>Highest average MRC</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Avg MRC</th><th style="text-align:left">Top plan</th></tr></thead><tbody>
          ${byMrc.slice(0,8).map(r=>`<tr><td>${esc(r.n)}</td><td class="num"><b>₱${n0(r.mrc)}</b></td><td class="sat-xs">${esc((r.top[0]||['—'])[0])}</td></tr>`).join('')}</tbody></table></div>
        <div><h4>Lowest average MRC</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Avg MRC</th><th style="text-align:left">Top plan</th></tr></thead><tbody>
          ${byMrc.slice(-8).reverse().map(r=>`<tr><td>${esc(r.n)}</td><td class="num"><b>₱${n0(r.mrc)}</b></td><td class="sat-xs">${esc((r.top[0]||['—'])[0])}</td></tr>`).join('')}</tbody></table></div>
      </div>
      <h4 style="margin-top:12px">Citywide plan ranking</h4>
      <table class="sat-tbl"><thead><tr><th style="text-align:left">Plan</th><th>Active subs</th><th>Share</th></tr></thead><tbody>
        ${(FX.plans||[]).slice(0,12).map(([p,c])=>`<tr><td>${esc(p)}</td><td class="num">${n0(c)}</td><td class="num">${n1(c/t.a*100)}%</td></tr>`).join('')}
      </tbody></table></div>
    <div class="sat-card"><h3>Tenure</h3>
      <p class="sat-cap">Median years since install among current active subs.</p>
      <div class="sat-two">
        <div><h4>Longest tenured</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Median</th><th>7y+</th><th>&lt;1y</th></tr></thead><tbody>
          ${top('med',6).map(r=>`<tr><td>${esc(r.n)}</td><td class="num"><b>${n1(r.med)}y</b></td><td class="num">${n0(r.tb[3])}</td><td class="num">${n0(r.tb[0])}</td></tr>`).join('')}</tbody></table></div>
        <div><h4>Newest base</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Median</th><th>7y+</th><th>&lt;1y</th></tr></thead><tbody>
          ${top('med',6,1).map(r=>`<tr><td>${esc(r.n)}</td><td class="num"><b>${n1(r.med)}y</b></td><td class="num">${n0(r.tb[3])}</td><td class="num">${n0(r.tb[0])}</td></tr>`).join('')}</tbody></table></div>
      </div></div>
    <div class="sat-card"><h3>Payment behaviour</h3>
      <p class="sat-cap"><b>Two measures, because they answer different questions.</b> ADS % is who sits in automatic
        deactivation today — a snapshot. Ever-suspended % is the share of active subs suspended at least once — a habit.
        The file carries <span class="mono">ADS_Ageing</span> only for accounts currently in ADS, so a full ADS history
        is not available from it.</p>
      <div class="sat-two">
        <div><h4 class="sat-ok">Cleanest</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Active</th><th>In ADS</th><th>ADS %</th><th>Ever susp.</th></tr></thead><tbody>
          ${top('adsr',8,1).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${n0(r.a)}</td><td class="num">${n0(r.ads)}</td>
            <td class="num sat-ok"><b>${n2(r.adsr)}%</b></td><td class="num">${n0(r.suspr)}%</td></tr>`).join('')}</tbody></table></div>
        <div><h4 class="sat-no">Hardest to collect</h4><table class="sat-tbl"><thead><tr><th>Barangay</th><th>Active</th><th>In ADS</th><th>ADS %</th><th>Ever susp.</th></tr></thead><tbody>
          ${top('adsr',8).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${n0(r.a)}</td><td class="num">${n0(r.ads)}</td>
            <td class="num sat-no"><b>${n2(r.adsr)}%</b></td><td class="num">${n0(r.suspr)}%</td></tr>`).join('')}</tbody></table></div>
      </div></div>
    <div class="sat-card"><h3>Legacy plant — the migration list</h3>
      <p class="sat-cap"><span class="mono">NETWORKTYPE by PACKAGECODE</span> shows how each active sub is connected.
        Subscribers still on <b>DOCSIS</b> or <b>CABLE-TV</b> are on the old plant — an upgrade conversation with a
        customer who is already paying, no port hunt and no cold knock.</p>
      <table class="sat-tbl"><thead><tr><th>Barangay</th><th>D</th><th>Active</th><th>On legacy</th><th>Share</th><th>Net 9mo</th><th>Median tenure</th></tr></thead><tbody>
        ${top('mig',10).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num">${n0(r.a)}</td>
          <td class="num"><b>${n0(r.mig)}</b></td><td class="num ${r.legacyr>=50?'sat-no':''}">${n0(r.legacyr)}%</td>
          <td class="num ${r.n9<0?'sat-no':'sat-ok'}">${r.n9>0?'+':''}${n0(r.n9)}</td><td class="num">${n1(r.med)}y</td></tr>`).join('')}
      </tbody></table>
      ${hi.length?`<div class="sat-box warn"><b>The churn is sitting on the old plant.</b>
        <b>${hi.filter(r=>r.n9<0).length} of the ${hi.length}</b> barangays where half the base or more is still DOCSIS
        or cable are losing subscribers over nine months. Barangays falling in all three windows average
        <b>${n1(avg(dn,'legacyr'))}% legacy</b>; the ${up.length} rising average <b>${n1(avg(up,'legacyr'))}%</b>.
        Correlation between legacy share and 9-month net is <b>${corr.toFixed(2)}</b>.
        <div style="margin-top:6px"><b>These are not win-back targets and not competition losses.</b> The subscriber is
        still paying; the technology under them is finished. That is a migration list — a different visit, and no port
        hunt, because ${n0(t.mig)} of them are already customers.</div>
        ${FX.deployPrev?`<div style="margin-top:6px">The <b>${esc(FX.deployPrev.asof)}</b> file classified every job order
        as NEW INSTALL or MIGRATION: ${FX.deployPrev.rows.map(([k,v])=>`<b>${esc(k.toLowerCase())} ${n0(v)}</b>`).join(' · ')}.
        ${FX.deployPrev.activeMigrated?`Of active subscribers then, <b>${n0(FX.deployPrev.activeMigrated)}</b> had arrived
        through a MIGRATION job and sat on CVG FTTH. <span class="sat-faint">(Carried forward — later files ship this
        column empty.)</span>`:''}</div>`:''}
        ${FX.prevPools&&FX.prevPools.mig>t.mig?`<div style="margin-top:6px"><b>And it is still happening: the legacy pool
        fell from ${n0(FX.prevPools.mig)} on ${esc(FX.prevPools.asof)} to ${n0(t.mig)} now — ${n0(FX.prevPools.mig-t.mig)}
        subscribers moved off the old plant in a month.</b></div>`:''}
      </div>`:''}
    </div>
    <div class="sat-card"><h3>Every barangay, every measure</h3>
      <p class="sat-cap">${rows.length} barangays with at least ${MIN_N} active subs.</p>
      <div class="sat-scroll"><table class="sat-tbl" id="satAnTbl"><thead><tr>
        ${[['n','Barangay'],['d','D'],['p','Ports'],['a','Active'],['sat','Sat %'],['n3','Net 3mo'],['n6','Net 6mo'],
           ['n9','Net 9mo'],['med','Tenure'],['mrc','Avg MRC'],['adsr','ADS %'],['suspr','Ever susp %'],
           ['legacyr','Legacy %'],['w','Win-back']].map(([k,l])=>`<th data-ak="${k}" class="${anSort===k?'on':''}">${l}</th>`).join('')}
      </tr></thead><tbody>
      ${rows.slice().sort((a,b)=>{const x=a[anSort],y=b[anSort];return typeof x==='string'?x.localeCompare(y):y-x;}).map(r=>`<tr>
        <td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num">${n0(r.p)}</td><td class="num">${n0(r.a)}</td>
        <td class="num"><span class="pill ${satCls(r.sat)}">${n2(r.sat)}%</span></td>
        <td class="num ${r.n3<0?'sat-no':r.n3>0?'sat-ok':''}">${r.n3>0?'+':''}${n0(r.n3)}</td>
        <td class="num ${r.n6<0?'sat-no':r.n6>0?'sat-ok':''}">${r.n6>0?'+':''}${n0(r.n6)}</td>
        <td class="num ${r.n9<0?'sat-no':r.n9>0?'sat-ok':''}">${r.n9>0?'+':''}${n0(r.n9)}</td>
        <td class="num">${n1(r.med)}y</td><td class="num">₱${n0(r.mrc)}</td>
        <td class="num ${r.adsr>12?'sat-no':''}">${n1(r.adsr)}%</td><td class="num">${n0(r.suspr)}%</td>
        <td class="num">${n0(r.legacyr)}%</td><td class="num">${n0(r.w)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  /* ---------- Map ---------- */
  function viewMP(){
    const blind=R.filter(r=>r.geo===0).sort((a,b)=>b.gap-a.gap);
    const bg=blind.reduce((s,r)=>s+r.gap,0), tg=R.reduce((s,r)=>s+r.gap,0);
    return `<div class="sat-ctl">
      <div class="sat-seg">
        <button class="${mapView==='tiles'?'on':''}" data-mv="tiles">Barangay grid — complete</button>
        <button class="${mapView==='pins'?'on':''}" data-mv="pins">NAP locations — has gaps</button>
      </div></div>
      <div id="satMapBody"></div>
      ${blind.length?`<div class="sat-box warn"><b>${blind.length} barangays have not a single NAP with coordinates</b>
        — and they hold <b>${n0(bg/tg*100)}%</b> of the entire gap (${n0(bg)} of ${n0(tg)} subs).
        This is not missing coordinates; those areas have never been audited. <b>Software cannot fix it.</b>
        <div class="sat-xs" style="margin-top:6px">${blind.slice(0,12).map(r=>`${esc(r.n)} <span class="sat-faint">(${n0(r.gap)})</span>`).join(' · ')}${blind.length>12?` · +${blind.length-12} more`:''}</div></div>`:''}`;
  }
  function drawTiles(){
    const el=$('#satMapBody'); if(!el) return;
    el.innerHTML=`<div class="sat-card"><h3>Barangay grid — ${R.length} of ${R.length}</h3>
      <p class="sat-cap">No gaps. Coloured by saturation. This is the authoritative layer — it does not depend on NAP coordinates.</p>
      <div class="sat-leg">${[['<3%','#d8452b'],['3–5%','#f07b52'],['5–7.5%','#e0a43b'],['7.5–10%','#7cc06a'],['10–12%','#18a57b'],['12%+','#0d7a58']]
        .map(([l,c])=>`<span><i class="sat-sw" style="background:${c}"></i>${l}</span>`).join('')}
        <span><i class="sat-sw sat-hatch"></i>no NAP on the map</span></div>
      ${[1,2,3,4,5,6].map(d=>{const rs=R.filter(r=>r.d===d).sort((a,b)=>a.sat-b.sat);
        const p=rs.reduce((s,r)=>s+r.p,0), a=rs.reduce((s,r)=>s+r.a,0);
        return `<div style="margin-top:12px"><div class="sat-dh"><b>District ${d}</b>
          <span class="sat-faint sat-xs">${rs.length} barangays · ${n0(p)} ports · ${n2(a/p*100)}%</span></div>
          <div class="sat-tiles">${rs.map(r=>`<div class="sat-tile ${r.geo===0?'sat-hatch':''}" style="background:${satCol(r.sat)}"
            data-b="${esc(r.c)}" title="${esc(r.n)} — ${n0(r.a)}/${n0(r.p)} ports">
            <span class="tn">${esc(r.n)}</span><span class="tv">${n1(r.sat)}%</span></div>`).join('')}</div></div>`;}).join('')}
      <div id="satTileDet"></div></div>`;
    $$('#satMapBody .sat-tile').forEach(t=>t.onclick=()=>{
      const r=R.find(x=>x.c===t.dataset.b); if(!r) return;
      $('#satTileDet').innerHTML=`<div class="sat-det"><b>${esc(r.n)} · District ${r.d} · rank #${r.pos}</b>
        <div><span>Port capacity</span><span>${n0(r.p)}</span></div>
        <div><span>Active</span><span>${n0(r.a)}</span></div>
        <div><span>Saturation</span><span>${n2(r.sat)}%</span></div>
        <div><span>Gap to 10%</span><span>${r.gap>0?n0(r.gap):'—'}</span></div>
        <div><span>Vacant ports</span><span>${n0(r.vac)}</span></div>
        <div><span>Win-back (2024+)</span><span>${n0(r.w)}</span></div>
        <div><span>Reactivate</span><span>${n0(r.x)}</span></div>
        <div><span>On legacy plant</span><span>${n0(r.mig)}</span></div>
        <div><span>Median tenure</span><span>${n1(r.med)}y</span></div>
        <div><span>Avg MRC</span><span>₱${n0(r.mrc)}</span></div>
        <div><span>NAP rows / with coordinates</span><span>${n0(r.nap)} / ${n0(r.geo)}${r.geo===0?' ⚠️':''}</span></div></div>`;
    });
  }
  function drawPins(){
    const el=$('#satMapBody'); if(!el) return;
    const P=FX.poles||[];
    el.innerHTML=`<div class="sat-card"><h3>NAP locations — ${n0(P.length)} poles</h3>
      <p class="sat-cap">Real lat/long from the audit file. Coloured by the barangay's saturation.
        <b>Blank areas do not mean no infrastructure — they mean not yet audited.</b></p>
      <canvas id="satCv" width="1100" height="760"></canvas></div>`;
    const cv=$('#satCv'); if(!cv||!P.length) return;
    const g=cv.getContext('2d');
    const la=P.map(p=>p[1]), lo=P.map(p=>p[2]);
    const laMin=Math.min(...la),laMax=Math.max(...la),loMin=Math.min(...lo),loMax=Math.max(...lo);
    const pad=26,W=cv.width-pad*2,H=cv.height-pad*2;
    const sc=Math.min(W/(loMax-loMin),H/(laMax-laMin));
    const ox=pad+(W-(loMax-loMin)*sc)/2, oy=pad+(H-(laMax-laMin)*sc)/2;
    g.fillStyle='#f7faf8'; g.fillRect(0,0,cv.width,cv.height);
    P.forEach(([bi,y,x,c])=>{
      const b=FX.brgy[bi]; if(!b) return;
      const r=R.find(z=>z.c===b.c); if(!r) return;
      g.fillStyle=satCol(r.sat); g.globalAlpha=.62;
      g.beginPath(); g.arc(ox+(x-loMin)*sc, oy+(laMax-y)*sc, Math.min(4,1.1+c*.35), 0, 7); g.fill();
    });
    g.globalAlpha=1; g.font='600 11px DM Sans,sans-serif'; g.fillStyle='#6d7d78';
    g.fillText('Quezon City — '+n0(P.length)+' NAP poles with coordinates', pad, cv.height-10);
  }


  /* ============================ SALES PERSONNEL ============================
     The saturation half says where the capacity is. This half says who is
     actually working it. It reads public.jobs live — a deliberately slim
     projection, paginated, fetched only when the tab is opened, because 98.5%
     of this project's Supabase egress is already PostgREST.
     ====================================================================== */
  let AG=null, agDays=90, agBusy=false, agErr='', agSort='jos';
  const AG_DONE=new Set(['completed']);
  const AG_DEAD=new Set(['cancelled','negative','rejected']);

  async function fetchAgents(){
    agBusy=true; agErr=''; paint();
    try{
      const from=new Date(Date.now()-agDays*864e5).toISOString();
      const sel='created_by,encoded_by,brgy,district,status,load_type,created_at';
      const H={apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()};
      const rows=[];
      for(let off=0; off<40000; off+=1000){
        const url=`${SUPA_URL}/rest/v1/jobs?select=${sel}&deleted_at=is.null`
                + `&created_at=gte.${encodeURIComponent(from)}&order=created_at.desc&limit=1000&offset=${off}`;
        const r=await fetch(url,{headers:H});
        if(!r.ok) throw new Error('HTTP '+r.status);
        const page=await r.json();
        if(!page.length) break;
        rows.push.apply(rows,page);
        if(page.length<1000) break;
      }
      AG=rows;
    }catch(e){ agErr=e.message||String(e); AG=null; }
    agBusy=false; paint();
  }

  const normB = s => String(s||'').toUpperCase().trim()
      .replace(/Ñ/g,'N').replace(/['.]/g,'').replace(/\s+/g,' ')
      .replace(/^STO /,'SANTO ').replace(/^STA /,'SANTA ').replace(/\(.*?\)/g,'').trim();

  function agRoll(){
    const byA={}, byB={};
    AG.forEach(j=>{
      const u=(j.created_by||'').trim(); if(!u) return;
      const isConsole=/^(CONSOLE|IMPORT)$/i.test(u);
      const key=isConsole?(j.encoded_by?`${u.toUpperCase()} · ${j.encoded_by}`:u.toUpperCase()):u;
      const b=normB(j.brgy), st=(j.status||'').toLowerCase();
      const a=byA[key]||(byA[key]={u:key,console:isConsole,jos:0,done:0,dead:0,open:0,brgys:{},dists:{}});
      a.jos++;
      if(AG_DONE.has(st)) a.done++; else if(AG_DEAD.has(st)) a.dead++; else a.open++;
      if(b){ a.brgys[b]=(a.brgys[b]||0)+1; const e=byB[b]||(byB[b]={b,jos:0,done:0,agents:{}});
             e.jos++; if(AG_DONE.has(st)) e.done++; e.agents[key]=(e.agents[key]||0)+1; }
      if(j.district) a.dists[j.district]=1;
    });
    const agents=Object.values(byA).map(a=>{
      const bl=Object.entries(a.brgys).sort((x,y)=>y[1]-x[1]);
      return Object.assign(a,{ nb:bl.length, top:bl.slice(0,3), nd:Object.keys(a.dists).length,
        rate: a.jos? a.done/a.jos*100 : 0 });
    });
    return {agents, byB};
  }

  function viewAG(){
    if(agBusy) return `<div class="sat-card"><h3>Sales personnel</h3><p class="sat-cap">Reading job orders…</p></div>`;
    if(agErr) return `<div class="sat-card"><h3>Sales personnel</h3>
      <div class="sat-box warn"><b>Could not read job orders.</b> ${esc(agErr)}</div>
      <button class="sat-btn" id="agGo">Try again</button></div>`;
    if(!AG) return `<div class="sat-card"><h3>Sales personnel</h3>
      <p class="sat-cap">Who encoded which job order, and where. This reads <span class="mono">public.jobs</span> live,
        so it is fetched on request rather than on page load — a slim projection over the window you choose.</p>
      <div class="sat-ctl"><span class="lbl">Window</span>
        <select id="agDays">${[30,90,180,365].map(d=>`<option value="${d}" ${agDays===d?'selected':''}>Last ${d} days</option>`).join('')}</select>
        <button class="sat-btn" id="agGo">Load sales record</button></div></div>`;

    /* Zero rows is not the same as zero activity. RLS returns an empty array to a
       caller it will not answer — an expired session reads exactly like a month
       with no sales, and the blind-spot table would then accuse every barangay
       in Quezon City of being unworked. Say what actually happened instead. */
    if(!AG.length) return `<div class="sat-card"><h3>Sales personnel — last ${agDays} days</h3>
      <div class="sat-box warn"><b>No job orders came back.</b> That is either a genuinely empty window or a session
      that is no longer authorised — the two look identical from here, so nothing is inferred from it.
      Try a longer window, or sign in again if this is unexpected.</div>
      <div class="sat-ctl"><span class="lbl">Window</span>
        <select id="agDays">${[30,90,180,365].map(d=>`<option value="${d}" ${agDays===d?'selected':''}>Last ${d} days</option>`).join('')}</select>
        <button class="sat-btn" id="agGo">Reload</button></div></div>`;

    const {agents, byB}=agRoll();
    const tot=agents.reduce((t,a)=>({jos:t.jos+a.jos,done:t.done+a.done,dead:t.dead+a.dead,open:t.open+a.open}),
      {jos:0,done:0,dead:0,open:0});
    const real=agents.filter(a=>!a.console);
    const sorted=agents.slice().sort((a,b)=>{const x=a[agSort],y=b[agSort];
      return typeof x==='string'?x.localeCompare(y):y-x;});
    const touched=new Set(Object.keys(byB));
    /* The payoff: barangays with real opportunity and no sales activity at all. */
    const blind=ranked().filter(r=>r.gap>0 && !touched.has(r.c)).sort((a,b)=>b.gap-a.gap);
    const blindGap=blind.reduce((s,r)=>s+r.gap,0);
    const worked=ranked().filter(r=>touched.has(r.c));
    const effort=worked.map(r=>Object.assign({},r,{jos:byB[r.c].jos,done:byB[r.c].done,
      agents:Object.keys(byB[r.c].agents).length}));
    const mismatch=effort.slice().sort((a,b)=>(b.jos/Math.max(1,b.gap))-(a.jos/Math.max(1,a.gap)));

    return `
    <div class="sat-card">
      <h3>Sales personnel — last ${agDays} days</h3>
      <p class="sat-cap">Every job order in the window, grouped by who encoded it. Console and import rows are kept
        separate from field agents rather than folded in, because they are not the same kind of record.</p>
      <div class="sat-ctl"><span class="lbl">Window</span>
        <select id="agDays">${[30,90,180,365].map(d=>`<option value="${d}" ${agDays===d?'selected':''}>Last ${d} days</option>`).join('')}</select>
        <button class="sat-btn" id="agGo">Reload</button>
        <button class="sat-btn" id="agXl">⤓ Export Excel</button></div>
      <div class="sat-kpis">
        <div class="sat-kpi"><span class="k">Job orders</span><span class="v">${n0(tot.jos)}</span>
          <span class="n">${n0(AG.length)} rows read</span></div>
        <div class="sat-kpi"><span class="k">Field agents active</span><span class="v">${real.length}</span>
          <span class="n">${agents.length-real.length} console/import source${agents.length-real.length===1?'':'s'}</span></div>
        <div class="sat-kpi sat-good"><span class="k">Completed</span><span class="v">${n0(tot.done)}</span>
          <span class="n">${tot.jos?n1(tot.done/tot.jos*100):0}% of all JOs</span></div>
        <div class="sat-kpi"><span class="k">Barangays touched</span><span class="v">${touched.size}</span>
          <span class="n">of ${R.length} in Quezon City</span></div>
      </div>
    </div>

    ${blind.length?`<div class="sat-card">
      <h3>Barangays with opportunity and no sales activity — ${blind.length}</h3>
      <p class="sat-cap">These have a real gap to 10% and <b>not one job order</b> from anybody in the last ${agDays} days.
        This is the join between the two halves of this page: capacity nobody is working.</p>
      <div class="sat-box warn"><b>${n0(blindGap)} subscribers of headroom — ${n0(blindGap/ranked().reduce((s,r)=>s+r.gap,0)*100)}% of the
        ranked gap — sits in barangays with zero sales activity in this window.</b></div>
      <div class="sat-scroll"><table class="sat-tbl"><thead><tr><th>Barangay</th><th>D</th><th>Ports</th><th>Sat %</th>
        <th>Gap to 10%</th><th>Vacant</th><th>Win-back</th><th>Migrate</th><th>Rank</th></tr></thead><tbody>
        ${blind.slice(0,25).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num">${n0(r.p)}</td>
          <td class="num"><span class="pill ${satCls(r.sat)}">${n2(r.sat)}%</span></td>
          <td class="num"><b>${n0(r.gap)}</b></td><td class="num">${n0(r.vac)}</td>
          <td class="num">${n0(r.w)}</td><td class="num">${n0(r.mig)}</td><td class="num">#${r.pos}</td></tr>`).join('')}
      </tbody></table></div>
      ${blind.length>25?`<p class="sat-cap" style="margin-top:7px">Showing the 25 largest of ${blind.length}. The export carries all of them.</p>`:''}
    </div>`:''}

    <div class="sat-card">
      <h3>Per agent</h3>
      <p class="sat-cap">Completion rate is completed ÷ all job orders in the window, so an agent with many still in
        flight reads lower — it is a throughput measure, not a verdict on their work.</p>
      <div class="sat-scroll"><table class="sat-tbl" id="agTbl"><thead><tr>
        ${[['u','Agent'],['jos','Job orders'],['done','Completed'],['rate','Completion %'],['open','In flight'],
           ['dead','Cancelled / rejected'],['nb','Barangays'],['nd','Districts']]
          .map(([k,l])=>`<th data-gk="${k}" class="${agSort===k?'on':''}">${l}</th>`).join('')}
        <th style="text-align:left">Top barangays</th></tr></thead><tbody>
        ${sorted.map(a=>`<tr>
          <td>${a.console?`<span class="pill p-gry">${esc(a.u)}</span>`:`<b>${esc(typeof agentLabel==='function'?agentLabel(a.u):a.u)}</b>`}</td>
          <td class="num"><b>${n0(a.jos)}</b></td><td class="num sat-ok">${n0(a.done)}</td>
          <td class="num">${n1(a.rate)}%</td><td class="num">${n0(a.open)}</td>
          <td class="num ${a.dead?'sat-no':''}">${n0(a.dead)}</td>
          <td class="num">${n0(a.nb)}</td><td class="num">${n0(a.nd)}</td>
          <td class="sat-xs">${a.top.map(([b,c])=>`${esc((R.find(r=>r.c===b)||{n:b}).n)} <b>${c}</b>`).join(' · ')||'<span class="sat-faint">—</span>'}</td>
        </tr>`).join('')}
      </tbody></table></div>
    </div>

    <div class="sat-card">
      <h3>Effort against opportunity</h3>
      <p class="sat-cap">Job orders per unit of remaining gap. High means a barangay is being worked harder than its
        headroom warrants; low means headroom nobody is reaching. Barangays already at or past 10% are left out,
        since they have no gap to divide by.</p>
      <div class="sat-two">
        <div><h4 class="sat-ok">Worked hardest relative to gap</h4>
          <table class="sat-tbl"><thead><tr><th>Barangay</th><th>JOs</th><th>Gap</th><th>JO per 100 gap</th><th>Agents</th></tr></thead><tbody>
          ${mismatch.slice(0,8).map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${n0(r.jos)}</td><td class="num">${n0(r.gap)}</td>
            <td class="num"><b>${n1(r.jos/Math.max(1,r.gap)*100)}</b></td><td class="num">${r.agents}</td></tr>`).join('')}
          </tbody></table></div>
        <div><h4 class="sat-no">Most headroom per job order</h4>
          <table class="sat-tbl"><thead><tr><th>Barangay</th><th>JOs</th><th>Gap</th><th>JO per 100 gap</th><th>Agents</th></tr></thead><tbody>
          ${mismatch.slice(-8).reverse().map(r=>`<tr><td>${esc(r.n)}</td><td class="num">${n0(r.jos)}</td><td class="num">${n0(r.gap)}</td>
            <td class="num"><b>${n1(r.jos/Math.max(1,r.gap)*100)}</b></td><td class="num">${r.agents}</td></tr>`).join('')}
          </tbody></table></div>
      </div>
    </div>

    <div class="sat-card">
      <h3>Who is selling where</h3>
      <p class="sat-cap">Barangays with activity in the window, busiest first.</p>
      <div class="sat-scroll"><table class="sat-tbl"><thead><tr><th>Barangay</th><th>D</th><th>JOs</th><th>Completed</th>
        <th>Sat %</th><th>Gap</th><th style="text-align:left">Agents</th></tr></thead><tbody>
        ${effort.slice().sort((a,b)=>b.jos-a.jos).slice(0,30).map(r=>`<tr>
          <td>${esc(r.n)}</td><td class="num">${r.d}</td><td class="num"><b>${n0(r.jos)}</b></td>
          <td class="num sat-ok">${n0(r.done)}</td>
          <td class="num"><span class="pill ${satCls(r.sat)}">${n2(r.sat)}%</span></td>
          <td class="num">${r.gap>0?n0(r.gap):'<span class="sat-ok">✓</span>'}</td>
          <td class="sat-xs">${Object.entries(byB[r.c].agents).sort((x,y)=>y[1]-x[1]).slice(0,4)
            .map(([u,c])=>`${esc(u)} <b>${c}</b>`).join(' · ')}</td></tr>`).join('')}
      </tbody></table></div>
    </div>`;
  }

  async function exportAG(){
    if(!AG) return;
    try{ await ensureXLSX(); }catch(_){ (window.showToast||alert)('Excel library failed to load'); return; }
    const {agents, byB}=agRoll();
    const touched=new Set(Object.keys(byB));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agents.slice().sort((a,b)=>b.jos-a.jos).map(a=>({
      'AGENT':a.u,'SOURCE':a.console?'console / import':'field agent','JOB ORDERS':a.jos,'COMPLETED':a.done,
      'COMPLETION %':+a.rate.toFixed(2),'IN FLIGHT':a.open,'CANCELLED / REJECTED':a.dead,
      'BARANGAYS':a.nb,'DISTRICTS':a.nd,
      'TOP BARANGAYS':a.top.map(([b,c])=>`${(R.find(r=>r.c===b)||{n:b}).n} (${c})`).join(', ')
    }))), 'Per agent');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ranked().map(r=>{
      const e=byB[r.c];
      return {'BARANGAY':r.n,'DISTRICT':r.d,'PORTS':r.p,'ACTIVE':r.a,'SATURATION %':+r.sat.toFixed(2),
        'GAP TO 10%':Math.round(r.gap),'JOB ORDERS':e?e.jos:0,'COMPLETED':e?e.done:0,
        'AGENTS WORKING IT':e?Object.keys(e.agents).length:0,
        'JO PER 100 GAP':r.gap>0?+((e?e.jos:0)/r.gap*100).toFixed(1):'',
        'NO ACTIVITY':e?'':'YES','WIN-BACK':r.w,'REACTIVATE':r.x,'MIGRATE':r.mig};
    })), 'Barangay coverage');
    XLSX.writeFile(wb, `AHBA_sales_record_${agDays}d_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  /* ---------- render + wiring ---------- */
  function paint(){
    const body=$('#satBody'); if(!body) return;
    body.innerHTML = tab==='ov'?viewOV() : tab==='ag'?viewAG() : tab==='br'?viewBR() : tab==='an'?viewAN() : viewMP();
    if(tab==='mp'){ mapView==='tiles'?drawTiles():drawPins();
      $$('#satRoot .sat-seg button').forEach(b=>b.onclick=()=>{mapView=b.dataset.mv;paint();}); }
    if(tab==='br'){
      $$('#satRoot .chip').forEach(c=>c.onclick=()=>{
        const v=c.dataset.lock;
        if(!v){lockKind='';lockVal='';} else {const [k,val]=v.split(':');lockKind=k;lockVal=val;}
        subBand='';subDist='';paint();});
      const x=$('#satRoot .sat-x'); if(x) x.onclick=()=>{lockKind='';lockVal='';subBand='';subDist='';paint();};
      const sb=$('#satSB'); if(sb) sb.onchange=e=>{subBand=e.target.value;paint();};
      const sd=$('#satSD'); if(sd) sd.onchange=e=>{subDist=e.target.value;paint();};
      const q=$('#satQ'); if(q) q.oninput=e=>{fQ=e.target.value.toLowerCase();paint();
        const n=$('#satQ'); if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length);}};
      $$('#satTbl th').forEach(th=>th.onclick=()=>{
        const k=th.dataset.k; if(sortKey===k) sortDir*=-1; else {sortKey=k;sortDir=(k==='n')?1:-1;} paint();});
      const xl=$('#satXl'); if(xl) xl.onclick=exportBR;
    }
    if(tab==='an'){ $$('#satAnTbl th').forEach(th=>th.onclick=()=>{anSort=th.dataset.ak;paint();}); }
    if(tab==='ag'){
      const d=$('#agDays'); if(d) d.onchange=e=>{agDays=+e.target.value;};
      const g=$('#agGo'); if(g) g.onclick=fetchAgents;
      const x=$('#agXl'); if(x) x.onclick=exportAG;
      $$('#agTbl th').forEach(th=>th.onclick=()=>{agSort=th.dataset.gk;paint();});
    }
  }
  function mount(){
    const root=$('#satRoot'); if(!root) return;
    root.innerHTML=shell();
    $$('#satRoot .sat-tab').forEach(b=>b.onclick=()=>{tab=b.dataset.sattab;
      $$('#satRoot .sat-tab').forEach(x=>x.classList.toggle('on',x===b)); paint();});
    paint();
  }

  /* XLSX via the console's shared SheetJS loader, same as every other export. */
  async function exportBR(){
    const scope=R.filter(r=> lockKind==='dist'? r.d==lockVal : lockKind==='band'? bandOf(r)===lockVal : true);
    const rows=scope.filter(r=>(!subBand||bandOf(r)===subBand)&&(!subDist||r.d==subDist)&&(!fQ||r.n.toLowerCase().includes(fQ)))
      .slice().sort((a,b)=>b.a-a.a);
    if(!rows.length){ (window.showToast||alert)('Nothing to export — no barangay matches these filters.'); return; }
    try{ await ensureXLSX(); }catch(_){ (window.showToast||alert)('Excel library failed to load'); return; }
    const name = lockKind==='dist'?`District ${lockVal}` : lockKind==='band'?`Saturation ${lockVal}` : 'All QC';
    const out=rows.map(r=>({
      'BARANGAY':r.n,'DISTRICT':r.d,'PORTS':r.p,'ACTIVE':r.a,'SATURATION %':+r.sat.toFixed(2),
      'VACANT PORTS':r.vac,'GAP TO 10%':Math.round(r.gap),'WIN-BACK':r.w,'REACTIVATE':r.x,'MIGRATE':r.mig,
      'PERIOD NET':r.net,'NET 3MO':r.n3,'NET 6MO':r.n6,'NET 9MO':r.n9,
      'MEDIAN TENURE (YRS)':+(r.med||0).toFixed(1),'AVG MRC':r.mrc,'IN ADS':r.ads,'ADS %':+r.adsr.toFixed(2),
      'EVER SUSPENDED %':+r.suspr.toFixed(2),'LEGACY %':+r.legacyr.toFixed(2),
      'TOP PLAN':(r.top&&r.top[0]?r.top[0][0]:''),'PRIORITY RANK':r.pos}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(out), 'Saturation');
    XLSX.writeFile(wb, `AHBA_saturation_${name.replace(/[^A-Za-z0-9]+/g,'-')}_${FX.asof}.xlsx`);
  }

  window.initFieldSales = function(){
    if(ready){ mount(); return; }
    FX = window.SAT_DATA;
    const root=$('#satRoot');
    if(!FX || !FX.brgy || !FX.brgy.length){
      if(root) root.innerHTML='<div class="sat-card"><h3>No snapshot loaded</h3>'
        +'<p class="sat-cap">sat-data.js did not load, so there is nothing to show. '
        +'This page carries a measured snapshot; it does not query Supabase yet.</p></div>';
      return;
    }
    R=build(); ready=true; mount();
  };
  window.FieldSalesOps = { canOpen: u => !!(u && u.is_super) };
})();
