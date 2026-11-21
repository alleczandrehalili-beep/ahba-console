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
  const isoDay = d => new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  let AG=null, agBusy=false, agErr='', agSort='jos', agView='day', agAgent='';
  let agTo = isoDay(new Date());
  let agFrom = isoDay(new Date(Date.now()-29*864e5));
  const agRangeLabel = () => `${agFrom} to ${agTo}`;
  const agSpanDays = () => Math.max(1, Math.round((Date.parse(agTo+'T23:59:59')-Date.parse(agFrom+'T00:00:00'))/864e5));
  const AG_DONE=new Set(['completed']);
  const AG_DEAD=new Set(['cancelled','negative','rejected']);

  async function fetchAgents(){
    agBusy=true; agErr=''; paint();
    try{
      const from=agFrom+'T00:00:00', to=agTo+'T23:59:59';
      const sel='created_by,encoded_by,brgy,district,status,load_type,created_at,source_of_sales,referral_name';
      const H={apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()};
      const rows=[];
      for(let off=0; off<40000; off+=1000){
        const url=`${SUPA_URL}/rest/v1/jobs?select=${sel}&deleted_at=is.null`
                + `&created_at=gte.${encodeURIComponent(from)}&created_at=lte.${encodeURIComponent(to)}`
                + `&order=created_at.desc&limit=1000&offset=${off}`;
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

  const dayKey = iso => String(iso||'').slice(0,10);
  const ST_LABEL = {for_validation:'For validation',pending:'For dispatch',assigned:'Assigned',
    'en-route':'En route','on-site':'On site','in-progress':'In progress',completed:'Completed',
    negative:'Incomplete',cancelled:'Cancelled',rejected:'Rejected'};

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
    /* day by day: every encode date in the window, split by status */
    const byD={}, stSeen={};
    AG.forEach(j=>{
      const d=dayKey(j.created_at); if(!d) return;
      const st=(j.status||'').toLowerCase()||'(none)';
      stSeen[st]=1;
      const e=byD[d]||(byD[d]={d,jos:0,done:0,dead:0,st:{},agents:{}});
      e.jos++; e.st[st]=(e.st[st]||0)+1;
      if(AG_DONE.has(st)) e.done++; else if(AG_DEAD.has(st)) e.dead++;
      const u=(j.created_by||'').trim(); if(u) e.agents[u]=1;
    });
    const days=Object.values(byD).sort((a,b)=>b.d.localeCompare(a.d));
    const statuses=Object.keys(stSeen).sort((a,b)=>
      AG.filter(j=>(j.status||'').toLowerCase()===b).length - AG.filter(j=>(j.status||'').toLowerCase()===a).length);

    /* referrals: source of sales, and the named referrer inside it */
    const bySrc={}, byRef={};
    AG.forEach(j=>{
      const st=(j.status||'').toLowerCase();
      const src=(j.source_of_sales||'').trim()||'(not stated)';
      const e=bySrc[src]||(bySrc[src]={k:src,jos:0,done:0,refs:{},agents:{}});
      e.jos++; if(AG_DONE.has(st)) e.done++;
      const u=(j.created_by||'').trim(); if(u) e.agents[u]=1;
      const rn=(j.referral_name||'').trim();
      if(rn){
        e.refs[rn]=(e.refs[rn]||0)+1;
        const r=byRef[rn]||(byRef[rn]={k:rn,src,jos:0,done:0,brgys:{},agents:{}});
        r.jos++; if(AG_DONE.has(st)) r.done++;
        const b=normB(j.brgy); if(b) r.brgys[b]=1;
        if(u) r.agents[u]=1;
      }
    });
    const sources=Object.values(bySrc).map(e=>Object.assign(e,{nref:Object.keys(e.refs).length,
      na:Object.keys(e.agents).length, rate:e.jos?e.done/e.jos*100:0})).sort((a,b)=>b.jos-a.jos);
    const referrers=Object.values(byRef).map(r=>Object.assign(r,{nb:Object.keys(r.brgys).length,
      na:Object.keys(r.agents).length, rate:r.jos?r.done/r.jos*100:0})).sort((a,b)=>b.jos-a.jos);

    return {agents, byB, days, statuses, sources, referrers};
  }

  const agPicker = (btn) => `<div class="sat-ctl">
      <span class="lbl">From</span><input type="date" id="agFrom" value="${agFrom}" max="${agTo}">
      <span class="lbl">To</span><input type="date" id="agTo" value="${agTo}" min="${agFrom}">
      <button class="sat-btn" id="agGo">${btn}</button>
      <span class="sat-faint sat-xs">${[[7,'7d'],[30,'30d'],[90,'90d'],[365,'1y']].map(([d,l])=>
        `<button class="sat-quick" data-qd="${d}">${l}</button>`).join('')}</span>
    </div>`;

  function viewAG(){
    if(agBusy) return `<div class="sat-card"><h3>Sales personnel</h3><p class="sat-cap">Reading job orders…</p></div>`;
    if(agErr) return `<div class="sat-card"><h3>Sales personnel</h3>
      <div class="sat-box warn"><b>Could not read job orders.</b> ${esc(agErr)}</div>
      ${agPicker('Try again')}</div>`;
    if(!AG) return `<div class="sat-card"><h3>Sales personnel</h3>
      <p class="sat-cap">Who encoded which job order, and where. This reads <span class="mono">public.jobs</span> live,
        so it is fetched on request rather than on page load — a slim projection over the dates you pick. The export
        then pulls the full job-order detail for the same dates, in a second request, so the page itself stays cheap.</p>
      ${agPicker('Load sales record')}</div>`;

    /* Zero rows is not the same as zero activity. RLS returns an empty array to a
       caller it will not answer — an expired session reads exactly like a month
       with no sales, and the blind-spot table would then accuse every barangay
       in Quezon City of being unworked. Say what actually happened instead. */
    if(!AG.length) return `<div class="sat-card"><h3>Sales personnel — ${agRangeLabel()}</h3>
      <div class="sat-box warn"><b>No job orders came back.</b> That is either a genuinely empty range or a session
      that is no longer authorised — the two look identical from here, so nothing is inferred from it.
      Widen the dates, or sign in again if this is unexpected.</div>
      ${agPicker('Reload')}</div>`;

    const RL=agRoll();
    const {agents, byB, days, statuses, sources, referrers}=RL;
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

    const head = `
    <div class="sat-card">
      <h3>Sales personnel — ${agRangeLabel()}</h3>
      <p class="sat-cap">Every job order encoded between those dates, grouped by who encoded it. Console and import
        rows are kept separate from field agents rather than folded in, because they are not the same kind of record.</p>
      ${agPicker('Reload')}
      <div class="sat-ctl"><button class="sat-btn" id="agXl">⤓ Export Excel — full JO detail</button>
        <span class="sat-faint sat-xs">${agSpanDays()} days · fetches the complete job-order record for these dates</span></div>
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
      <div class="sat-tabs" style="margin:12px 0 0">
        ${[['day','Day by day'],['agent','Per agent'],['ref','Referrals'],['cov','Areas covered']]
          .map(([k,l])=>`<button class="sat-tab ${agView===k?'on':''}" data-agv="${k}">${l}</button>`).join('')}
      </div>
    </div>`;

    /* ---- day by day: every encode date, split by status ---- */
    const vDay = () => `<div class="sat-card">
      <h3>Day by day — job orders encoded</h3>
      <p class="sat-cap">By the date the job order was encoded, with the status each one is in <b>today</b> — not the
        status it had on that day. A recent day therefore looks unfinished because it is, not because it went badly.</p>
      <div class="sat-scroll"><table class="sat-tbl"><thead><tr><th>Date</th><th>Encoded</th>
        ${statuses.map(st=>`<th>${esc(ST_LABEL[st]||st)}</th>`).join('')}<th>Completion %</th><th>Agents</th></tr></thead><tbody>
        ${days.map(d=>`<tr><td class="mono">${esc(d.d)} <span class="sat-faint sat-xs">${new Date(d.d+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})}</span></td>
          <td class="num"><b>${n0(d.jos)}</b></td>
          ${statuses.map(st=>`<td class="num ${AG_DONE.has(st)?'sat-ok':AG_DEAD.has(st)?'sat-no':''}">${d.st[st]?n0(d.st[st]):'<span class="sat-faint">·</span>'}</td>`).join('')}
          <td class="num">${d.jos?n1(d.done/d.jos*100):0}%</td>
          <td class="num">${Object.keys(d.agents).length}</td></tr>`).join('')}
      </tbody><tfoot><tr><td><b>Total</b></td><td class="num"><b>${n0(days.reduce((x,d)=>x+d.jos,0))}</b></td>
        ${statuses.map(st=>`<td class="num"><b>${n0(days.reduce((x,d)=>x+(d.st[st]||0),0))}</b></td>`).join('')}
        <td class="num"><b>${tot.jos?n1(tot.done/tot.jos*100):0}%</b></td><td class="num">—</td></tr></tfoot></table></div>
      <p class="sat-cap" style="margin-top:8px">${days.length} days with activity in the window.
        Busiest: <b>${esc(days.slice().sort((a,b)=>b.jos-a.jos)[0].d)}</b> with
        ${n0(days.slice().sort((a,b)=>b.jos-a.jos)[0].jos)} encoded.
        Average <b>${n1(tot.jos/days.length)}</b> a day across days that had any.</p>
    </div>`;

    /* ---- referrals ---- */
    const vRef = () => {
      const named=referrers.length, unnamed=tot.jos-referrers.reduce((s,r)=>s+r.jos,0);
      return `<div class="sat-card">
        <h3>Source of sales</h3>
        <p class="sat-cap">Where the job order came from, as encoded on the form. <b>${n0(unnamed)}</b> of
          ${n0(tot.jos)} carry no named referrer.</p>
        <table class="sat-tbl"><thead><tr><th style="text-align:left">Source</th><th>Job orders</th><th>Completed</th>
          <th>Completion %</th><th>Named referrers</th><th>Agents</th></tr></thead><tbody>
          ${sources.map(e=>`<tr><td><b>${esc(e.k)}</b></td><td class="num">${n0(e.jos)}</td>
            <td class="num sat-ok">${n0(e.done)}</td><td class="num">${n1(e.rate)}%</td>
            <td class="num">${n0(e.nref)}</td><td class="num">${n0(e.na)}</td></tr>`).join('')}
        </tbody></table></div>
      ${named?`<div class="sat-card">
        <h3>Named referrers — ${named}</h3>
        <p class="sat-cap">Each person credited in <span class="mono">referral_name</span>, what they brought in, and
          which agent encoded it. This is the commission trail.</p>
        <div class="sat-scroll"><table class="sat-tbl"><thead><tr><th style="text-align:left">Referrer</th>
          <th style="text-align:left">Source</th><th>Job orders</th><th>Completed</th><th>Completion %</th>
          <th>Barangays</th><th style="text-align:left">Encoded by</th></tr></thead><tbody>
          ${referrers.slice(0,60).map(r=>`<tr><td><b>${esc(r.k)}</b></td><td class="sat-xs">${esc(r.src)}</td>
            <td class="num">${n0(r.jos)}</td><td class="num sat-ok">${n0(r.done)}</td>
            <td class="num">${n1(r.rate)}%</td><td class="num">${n0(r.nb)}</td>
            <td class="sat-xs">${Object.keys(r.agents).slice(0,3).map(esc).join(' · ')||'<span class="sat-faint">—</span>'}</td></tr>`).join('')}
        </tbody></table></div>
        ${referrers.length>60?`<p class="sat-cap" style="margin-top:7px">Showing the 60 busiest of ${referrers.length}. The export carries all of them.</p>`:''}
      </div>`:`<div class="sat-card"><div class="sat-box warn"><b>No job order in this window carries a named referrer.</b>
        <span class="mono">referral_name</span> is empty throughout, so there is no commission trail to report —
        either referrals are not being encoded, or they are going in under source of sales alone.</div></div>`}`;
    };

    /* ---- areas covered, per agent ---- */
    const vCov = () => {
      const list = agAgent ? agents.filter(a=>a.u===agAgent) : agents.slice().sort((a,b)=>b.nb-a.nb);
      return `<div class="sat-card">
        <h3>Areas covered</h3>
        <p class="sat-cap">Every barangay each agent encoded in, with that barangay's saturation beside it — so a wide
          reach into saturated ground reads differently from a narrow one into empty ground.</p>
        <div class="sat-ctl"><span class="lbl">Agent</span>
          <select id="agWho"><option value="">All agents</option>
            ${agents.slice().sort((a,b)=>b.jos-a.jos).map(a=>`<option value="${esc(a.u)}" ${agAgent===a.u?'selected':''}>${esc(a.u)} (${a.jos})</option>`).join('')}
          </select></div>
        ${list.map(a=>{
          const bl=Object.entries(a.brgys).sort((x,y)=>y[1]-x[1]);
          const gapReached=bl.reduce((s,[b])=>{const r=R.find(z=>z.c===b); return s+(r?r.gap:0);},0);
          return `<div class="sat-agent">
            <div class="sat-ah"><b>${esc(typeof agentLabel==='function'?agentLabel(a.u):a.u)}</b>
              ${a.console?'<span class="pill p-gry">console / import</span>':''}
              <s>${n0(a.jos)} JOs · ${n0(a.nb)} barangays · ${n0(a.nd)} districts · ${n1(a.rate)}% completed
                 · ${n0(gapReached)} of gap reached</s></div>
            <div class="sat-pills">${bl.map(([b,c])=>{const r=R.find(z=>z.c===b);
              return `<span class="pill ${r?satCls(r.sat):'p-gry'}">${esc(r?r.n:b)} <b>${c}</b>${r?` <s>${n1(r.sat)}%</s>`:''}</span>`;}).join(' ')}</div>
          </div>`;}).join('')}
      </div>`;
    };

    /* ---- per agent: the original monitoring view ---- */
    const vAgent = () => `
    ${blind.length?`<div class="sat-card">
      <h3>Barangays with opportunity and no sales activity — ${blind.length}</h3>
      <p class="sat-cap">These have a real gap to 10% and <b>not one job order</b> from anybody between ${agRangeLabel()}.
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

    return head + (agView==='day'?vDay() : agView==='ref'?vRef() : agView==='cov'?vCov() : vAgent());

  }

  /* The views run on a slim projection. The export is where the full record is
     wanted, so the detail is pulled in its own request over the same dates —
     the same columns the Work Orders export uses, plus the dates asked for. */
  const DETAIL_COLS = ['id','created_at','updated_at','status','load_type','service_type','dispatch_status',
    'dispatch_count','team','driver','tech1','crew_driver','crew_tech1','crew_tech2',
    'ibass_acct_no','job_order_no','vas_no','ref_no','new_ref','play_type','addon_count',
    'subscriber','first_name','middle_name','last_name','primary_no','other_contact_no','email',
    'house_no','street_name','village','brgy','district','city','address',
    'created_by','encoded_by','in_charge','source_of_sales','referral_name',
    'plan','current_plan','priority','work_account','payment_mode','payment_amount','ar_no',
    'validated','validated_at','load_date','scheduled_at','completed_at','negative_at','negative_remark',
    'special_note'].join(',');

  async function fetchDetail(){
    const from=agFrom+'T00:00:00', to=agTo+'T23:59:59';
    const H={apikey:SUPA_KEY,Authorization:'Bearer '+dashTok()};
    const rows=[];
    for(let off=0; off<60000; off+=1000){
      const url=`${SUPA_URL}/rest/v1/jobs?select=${DETAIL_COLS}&deleted_at=is.null`
              + `&created_at=gte.${encodeURIComponent(from)}&created_at=lte.${encodeURIComponent(to)}`
              + `&order=created_at.desc&limit=1000&offset=${off}`;
      const r=await fetch(url,{headers:H});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const page=await r.json();
      if(!page.length) break;
      rows.push.apply(rows,page);
      if(page.length<1000) break;
    }
    return rows;
  }
  const dOnly = v => v? String(v).slice(0,10) : '';
  const dTime = v => v? String(v).replace('T',' ').slice(0,16) : '';

  /* AHBA FieldSales — self-contained xlsx writer with a live Excel PivotTable.
     Developed and schema-tested here, then transplanted verbatim into
     console-sat.js. Deliberately does NOT touch console-sli-reports.js: that
     module's pivot writer is hard-wired to one measure, and this report needs
     two (loads encoded + loads completed).

     buildSalesWorkbook(spec) -> { 'path/in/zip': 'xml string', ... }

     spec = {
       sheets: [ {name, headers, rows, cols?, freeze?, filter?} ],   // data sheets
       pivot:  { name, source, rowFields:[...], data:[{field,subtotal?,name}] }
     }
     The pivot sheet is written first; `source` names one of `sheets` and is used
     whole as the pivot cache, so Excel's "Show Details" (double-click a value)
     drills through to the full job-order rows on a new sheet.
  */
  function buildSalesWorkbook(spec){
    const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
    const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
    const CT='application/vnd.openxmlformats-officedocument.spreadsheetml.';

    const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                          .replace(/"/g,'&quot;').replace(/\r/g,'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
    const colName=i=>{ let s='',n=i; for(;;){ s=String.fromCharCode(65+n%26)+s; n=Math.floor(n/26)-1; if(n<0) break; } return s; };

    const STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      +'<styleSheet xmlns="'+NS+'"><fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'
      +'<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>'
      +'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      +'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      +'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

    function cell(ref,v,bold){
      if(v===''||v===null||v===undefined) return '';
      const s=bold?' s="1"':'';
      if(typeof v==='number'&&isFinite(v)) return '<c r="'+ref+'"'+s+'><v>'+v+'</v></c>';
      return '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+esc(v)+'</t></is></c>';
    }
    /* headers + rows -> worksheet xml */
    function dataSheet(s){
      const H=s.headers, B=s.rows, last=colName(Math.max(H.length-1,0));
      let x='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="'+NS+'">';
      if(s.freeze!==false) x+='<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
      if(s.cols&&s.cols.length) x+='<cols>'+s.cols.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols>';
      x+='<sheetData><row r="1">'+H.map((h,i)=>cell(colName(i)+'1',h,true)).join('')+'</row>';
      B.forEach((r,ri)=>{
        const cs=H.map((_,ci)=>cell(colName(ci)+(ri+2),r[ci])).join('');
        if(cs) x+='<row r="'+(ri+2)+'">'+cs+'</row>';
      });
      x+='</sheetData>';
      if(s.filter!==false&&H.length) x+='<autoFilter ref="A1:'+last+(B.length+1)+'"/>';
      return x+'</worksheet>';
    }

    /* ---------- the pivot ---------- */
    const P=spec.pivot;
    const src=spec.sheets.find(s=>s.name===P.source);
    if(!src) throw new Error('pivot source sheet "'+P.source+'" not in the workbook');
    const H=src.headers, B=src.rows, NF=H.length, N=B.length;
    const rfI=P.rowFields.map(n=>{ const i=H.indexOf(n); if(i<0) throw new Error('pivot row field "'+n+'" not on '+P.source); return i; });
    const dfI=P.data.map(d=>{ const i=H.indexOf(d.field); if(i<0) throw new Error('pivot value field "'+d.field+'" not on '+P.source); return i; });

    /* shared items for the row fields, built in display order so an item's
       cache index is also its position in the pivot — no second mapping. */
    const SH={};
    rfI.forEach((i,k)=>{
      const seen=[...new Set(B.map(r=>r[i]===''||r[i]==null?'':String(r[i])))];
      seen.sort((a,b)=> k===0 ? b.localeCompare(a) : a.localeCompare(b));  // dates newest first
      SH[i]={list:seen, idx:new Map(seen.map((v,j)=>[v,j]))};
    });
    const key=(r,i)=>r[i]===''||r[i]==null?'':String(r[i]);

    /* cacheFields: shared strings for row fields, numeric ranges for numbers */
    const cacheFields=H.map((name,i)=>{
      if(SH[i]) return '<cacheField name="'+esc(name)+'" numFmtId="0"><sharedItems count="'+SH[i].list.length+'">'
        +SH[i].list.map(v=>'<s v="'+esc(v)+'"/>').join('')+'</sharedItems></cacheField>';
      const vs=B.map(r=>r[i]).filter(v=>typeof v==='number'&&isFinite(v));
      if(vs.length===N&&N){
        const ci=vs.every(Number.isInteger)?' containsInteger="1"':'';
        return '<cacheField name="'+esc(name)+'" numFmtId="0"><sharedItems containsSemiMixedTypes="0" containsString="0" containsNumber="1"'
          +ci+' minValue="'+Math.min.apply(null,vs)+'" maxValue="'+Math.max.apply(null,vs)+'"/></cacheField>';
      }
      if(vs.length){
        const ci=vs.every(Number.isInteger)?' containsInteger="1"':'';
        return '<cacheField name="'+esc(name)+'" numFmtId="0"><sharedItems containsMixedTypes="1" containsNumber="1"'
          +ci+' minValue="'+Math.min.apply(null,vs)+'" maxValue="'+Math.max.apply(null,vs)+'"/></cacheField>';
      }
      const lt=B.some(r=>String(r[i]==null?'':r[i]).length>255)?' longText="1"':'';
      return '<cacheField name="'+esc(name)+'" numFmtId="0"><sharedItems'+lt+'/></cacheField>';
    }).join('');

    const records=B.map(r=>'<r>'+H.map((_,i)=>{
      if(SH[i]) return '<x v="'+SH[i].idx.get(key(r,i))+'"/>';
      const v=r[i];
      if(v===''||v===null||v===undefined) return '<m/>';
      if(typeof v==='number'&&isFinite(v)) return '<n v="'+v+'"/>';
      return '<s v="'+esc(v)+'"/>';
    }).join('')+'</r>').join('');

    const srcLast=colName(Math.max(NF-1,0));
    const cacheDef='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      +'<pivotCacheDefinition xmlns="'+NS+'" xmlns:r="'+RNS+'" r:id="rId1" refreshedBy="AHBA FieldOps"'
      +' createdVersion="8" refreshedVersion="8" minRefreshableVersion="3" refreshOnLoad="1" recordCount="'+N+'">'
      +'<cacheSource type="worksheet"><worksheetSource ref="A1:'+srcLast+(N+1)+'" sheet="'+esc(P.source)+'"/></cacheSource>'
      +'<cacheFields count="'+NF+'">'+cacheFields+'</cacheFields></pivotCacheDefinition>';
    const cacheRecs='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      +'<pivotCacheRecords xmlns="'+NS+'" xmlns:r="'+RNS+'" count="'+N+'">'+records+'</pivotCacheRecords>';

    /* row items — tabular layout: every leaf row carries its full path, with a
       subtotal row after each group on every level except the innermost. */
    const tree=new Map();   // lvl0 -> Map(lvl1 -> Set(lvl2...))
    B.forEach(r=>{
      let m=tree;
      rfI.forEach((i,k)=>{
        const v=SH[i].idx.get(key(r,i));
        if(k===rfI.length-1){ (m.get(v)||m.set(v,true)); }
        else { if(!m.has(v)) m.set(v,new Map()); m=m.get(v); }
      });
    });
    const sortedKeys=m=>[...m.keys()].sort((a,b)=>a-b);
    const ri=[]; let prev=[];
    function emit(path,leaf){
      let r=0; while(r<prev.length&&r<path.length&&prev[r]===path[r]) r++;
      if(leaf&&r===path.length) r=path.length-1;          // identical path can't happen, but stay safe
      ri.push('<i'+(r?' r="'+r+'"':'')+'>'+path.slice(r).map(v=>'<x v="'+v+'"/>').join('')+'</i>');
      prev=path.slice();
    }
    function subtotal(path){
      let r=0; while(r<prev.length&&r<path.length&&prev[r]===path[r]) r++;
      if(r>=path.length) r=path.length-1;
      ri.push('<i t="default"'+(r?' r="'+r+'"':'')+'>'+path.slice(r).map(v=>'<x v="'+v+'"/>').join('')+'</i>');
      prev=path.slice();
    }
    const SUB=new Set(P.subtotal||[0]);   // which row-field levels carry a subtotal row
    function walk(m,path){
      sortedKeys(m).forEach(v=>{
        const p=path.concat([v]), kid=m.get(v);
        if(kid===true||p.length===rfI.length) emit(p,true);
        else { walk(kid,p); if(SUB.has(p.length-1)) subtotal(p); }
      });
    }
    walk(tree,[]);
    ri.push('<i t="grand"><x/></i>');

    const pivotFields=H.map((_,i)=>{
      const k=rfI.indexOf(i);
      if(k>=0){
        const sub=SUB.has(k)&&k<rfI.length-1;   // innermost field never subtotals
        return '<pivotField axis="axisRow" compact="0" outline="0" showAll="0"'+(sub?'':' defaultSubtotal="0"')
          +'><items count="'+(SH[i].list.length+(sub?1:0))+'">'
          +SH[i].list.map((_v,j)=>'<item x="'+j+'"/>').join('')+(sub?'<item t="default"/>':'')
          +'</items></pivotField>';
      }
      if(dfI.indexOf(i)>=0) return '<pivotField dataField="1" compact="0" showAll="0"/>';
      return '<pivotField compact="0" showAll="0"/>';
    }).join('');

    const nCols=rfI.length+P.data.length;
    const pivotTable='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      +'<pivotTableDefinition xmlns="'+NS+'" name="SalesRecord" cacheId="1" dataOnRows="0" applyNumberFormats="0"'
      +' applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0"'
      +' applyWidthHeightFormats="1" dataCaption="Values" updatedVersion="8" minRefreshableVersion="3"'
      +' useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0" compact="0" compactData="0"'
      +' outline="0" outlineData="0" multipleFieldFilters="0">'
      +'<location ref="A1:'+colName(nCols-1)+(1+ri.length)+'" firstHeaderRow="1" firstDataRow="1" firstDataCol="'+rfI.length+'"/>'
      +'<pivotFields count="'+NF+'">'+pivotFields+'</pivotFields>'
      +'<rowFields count="'+rfI.length+'">'+rfI.map(i=>'<field x="'+i+'"/>').join('')+'</rowFields>'
      +'<rowItems count="'+ri.length+'">'+ri.join('')+'</rowItems>'
      +'<colFields count="1"><field x="-2"/></colFields>'
      +'<colItems count="'+P.data.length+'">'
      +P.data.map((_d,k)=>k===0?'<i><x/></i>':'<i i="'+k+'"><x v="'+k+'"/></i>').join('')
      +'</colItems>'
      +'<dataFields count="'+P.data.length+'">'
      +P.data.map((d,k)=>'<dataField name="'+esc(d.name)+'" fld="'+dfI[k]+'"'
          +(d.subtotal&&d.subtotal!=='sum'?' subtotal="'+d.subtotal+'"':'')+' baseField="0" baseItem="0"/>').join('')
      +'</dataFields>'
      +'<pivotTableStyleInfo name="PivotStyleMedium9" showRowHeaders="1" showColHeaders="1" showRowStripes="0"'
      +' showColStripes="0" showLastColumn="1"/></pivotTableDefinition>';

    /* ---------- package ---------- */
    const rels=items=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="'+PKG+'">'
      +items.map(a=>'<Relationship Id="'+a[0]+'" Type="'+REL+a[1]+'" Target="'+a[2]+'"/>').join('')+'</Relationships>';

    const names=[P.name].concat(spec.sheets.map(s=>s.name));
    const F={};
    let ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      +'<Default Extension="xml" ContentType="application/xml"/>'
      +'<Override PartName="/xl/workbook.xml" ContentType="'+CT+'sheet.main+xml"/>'
      +'<Override PartName="/xl/styles.xml" ContentType="'+CT+'styles+xml"/>'
      +'<Override PartName="/xl/pivotCache/pivotCacheDefinition1.xml" ContentType="'+CT+'pivotCacheDefinition+xml"/>'
      +'<Override PartName="/xl/pivotCache/pivotCacheRecords1.xml" ContentType="'+CT+'pivotCacheRecords+xml"/>'
      +'<Override PartName="/xl/pivotTables/pivotTable1.xml" ContentType="'+CT+'pivotTable+xml"/>';

    /* sheet 1 is the pivot's home: Excel paints it from pivotTable1.xml */
    F['xl/worksheets/sheet1.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="'+NS+'">'
      +'<cols>'+P.rowFields.map((_n,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="24" customWidth="1"/>').join('')
      +P.data.map((_d,i)=>'<col min="'+(P.rowFields.length+i+1)+'" max="'+(P.rowFields.length+i+1)+'" width="17" customWidth="1"/>').join('')
      +'</cols><sheetData/></worksheet>';
    ct+='<Override PartName="/xl/worksheets/sheet1.xml" ContentType="'+CT+'worksheet+xml"/>';
    F['xl/worksheets/_rels/sheet1.xml.rels']=rels([['rId1','pivotTable','../pivotTables/pivotTable1.xml']]);

    spec.sheets.forEach((s,i)=>{
      F['xl/worksheets/sheet'+(i+2)+'.xml']=dataSheet(s);
      ct+='<Override PartName="/xl/worksheets/sheet'+(i+2)+'.xml" ContentType="'+CT+'worksheet+xml"/>';
    });

    F['[Content_Types].xml']=ct+'</Types>';
    F['_rels/.rels']=rels([['rId1','officeDocument','xl/workbook.xml']]);
    F['xl/styles.xml']=STYLES;
    F['xl/workbook.xml']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="'+NS+'" xmlns:r="'+RNS+'">'
      +'<bookViews><workbookView activeTab="0"/></bookViews><sheets>'
      +names.map((n,i)=>'<sheet name="'+esc(n)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')
      +'</sheets><calcPr calcId="191029"/><pivotCaches><pivotCache cacheId="1" r:id="rIdPC1"/></pivotCaches></workbook>';
    F['xl/_rels/workbook.xml.rels']=rels(
      names.map((_n,i)=>['rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml'])
        .concat([['rId'+(names.length+1),'styles','styles.xml'],
                 ['rIdPC1','pivotCacheDefinition','pivotCache/pivotCacheDefinition1.xml']]));
    F['xl/pivotTables/pivotTable1.xml']=pivotTable;
    F['xl/pivotTables/_rels/pivotTable1.xml.rels']=rels([['rId1','pivotCacheDefinition','../pivotCache/pivotCacheDefinition1.xml']]);
    F['xl/pivotCache/pivotCacheDefinition1.xml']=cacheDef;
    F['xl/pivotCache/pivotCacheRecords1.xml']=cacheRecs;
    F['xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels']=rels([['rId1','pivotCacheRecords','pivotCacheRecords1.xml']]);
    return F;
  }

  async function exportAG(){
    if(!AG) return;
    try{ await ensureJSZip(); }catch(_){ (window.showToast||alert)('Excel library failed to load'); return; }
    const btn=$('#agXl'); const lbl=btn?btn.textContent:''; if(btn){btn.disabled=true;btn.textContent='Pulling full detail…';}
    let DET=[];
    try{ DET=await fetchDetail(); }
    catch(e){ if(btn){btn.disabled=false;btn.textContent=lbl;}
      (window.showToast||alert)('Could not pull the job-order detail: '+(e.message||e)); return; }
    if(btn){btn.disabled=false;btn.textContent=lbl;}
    const {agents, byB}=agRoll();
    const touched=new Set(Object.keys(byB));
    const SHEETS=[];
    const tbl=(name,objs,opts)=>{
      const H=[],seen=new Set();
      objs.forEach(o=>Object.keys(o).forEach(k=>{ if(!seen.has(k)){seen.add(k);H.push(k);} }));
      return Object.assign({name,headers:H,rows:objs.map(o=>H.map(k=>o[k]===undefined?'':o[k]))},opts||{});
    };
    const pct=(n,d)=>d? +(n/d*100).toFixed(1) : 0;

    /* ---- Summary ----
       The same cut as the live pivot, pre-totalled, so the figures read
       straight off the sheet without Excel refreshing anything. The `Pivot`
       sheet beside it is a real Excel PivotTable over `Job orders`:
       double-click any value and Excel drops the job orders behind it onto a
       new sheet, in full. */
    const PV={};
    DET.forEach(j=>{
      const d=dOnly(j.created_at); if(!d) return;
      const u=(j.created_by||'').trim()||'(none)';
      const rf=(j.referral_name||'').trim()||'(no referral)';
      const k=d+'\u0000'+u+'\u0000'+rf;
      const e=PV[k]||(PV[k]={d,u,rf,enc:0,done:0});
      e.enc++; if(AG_DONE.has((j.status||'').toLowerCase())) e.done++;
    });
    const flat=Object.values(PV).sort((a,b)=>
      b.d.localeCompare(a.d) || a.u.localeCompare(b.u) || a.rf.localeCompare(b.rf));
    const PH=['DATE','SALES AGENT','REFERRAL AGENT','LOADS ENCODED','LOADS COMPLETED','COMPLETION %'];
    const srows=[];
    let gE=0,gC=0, dI=0;
    while(dI<flat.length){
      const day=flat[dI].d;
      const dayRows=flat.filter(r=>r.d===day);
      let dE=0,dC=0, first=true;
      [...new Set(dayRows.map(r=>r.u))].forEach(u=>{
        const ar=dayRows.filter(r=>r.u===u);
        let aE=0,aC=0;
        ar.forEach(r=>{
          srows.push([first?day:'', ar.indexOf(r)===0?u:'', r.rf, r.enc, r.done, pct(r.done,r.enc)]);
          first=false; aE+=r.enc; aC+=r.done;
        });
        if(ar.length>1) srows.push(['', u+' — total', '', aE, aC, pct(aC,aE)]);
        dE+=aE; dC+=aC;
      });
      srows.push([day+' — TOTAL','','',dE,dC,pct(dC,dE)]);
      srows.push([]);
      gE+=dE; gC+=dC;
      dI+=dayRows.length;
    }
    srows.push(['GRAND TOTAL','','',gE,gC,pct(gC,gE)]);
    SHEETS.push({name:'Summary', headers:PH, rows:srows, filter:false,
      cols:[17,26,28,15,16,14]});

    /* `Job orders` is the pivot's source range, so it carries the day stamp and
       the two 1/0 count columns the pivot sums. */
    SHEETS.push(tbl('Job orders', DET.map(j=>({
      'WO ID':j.id||'', 'JOB ORDER NO.':j.job_order_no||'', 'REF NO.':j.ref_no||'', 'NEW REF #':j.new_ref||'',
      'IBASS ACCT NO.':j.ibass_acct_no||'',
      'DATE ENCODED':dTime(j.created_at), 'DATE ENCODED (DAY)':dOnly(j.created_at)||'',
      'LOAD COUNT':1, 'COMPLETED COUNT':AG_DONE.has((j.status||'').toLowerCase())?1:0,
      'DATE VALIDATED':dTime(j.validated_at),
      'DATE DISPATCHED':dOnly(j.load_date)||dTime(j.scheduled_at),
      'DATE COMPLETED':dTime(j.completed_at), 'DATE INCOMPLETE':dTime(j.negative_at),
      'LAST UPDATED':dTime(j.updated_at),
      'STATUS':j.status||'', 'DISPATCH STATUS':j.dispatch_status||'', 'DISPATCH COUNT':j.dispatch_count||0,
      'LOAD TYPE':j.load_type||'SLI', 'SERVICE TYPE':j.service_type||'',
      'SUBSCRIBER':j.subscriber||'', 'FIRST NAME':j.first_name||'', 'MIDDLE NAME':j.middle_name||'',
      'LAST NAME':j.last_name||'',
      'PRIMARY NO.':j.primary_no||'', 'OTHER CONTACT NO.':j.other_contact_no||'', 'EMAIL':j.email||'',
      'HOUSE NO.':j.house_no||'', 'STREET NAME':j.street_name||'', 'VILLAGE / SUBDIVISION':j.village||'',
      'BRGY':j.brgy||'', 'DISTRICT':j.district||'', 'CITY':j.city||'', 'FULL ADDRESS':j.address||'',
      'SALES AGENT':j.created_by||'', 'ENCODED BY':j.encoded_by||'', 'IN-CHARGE':j.in_charge||'',
      'SOURCE OF SALES':j.source_of_sales||'', 'REFERRAL NAME':j.referral_name||'',
      'PLAN':j.plan||'', 'CURRENT PLAN':j.current_plan||'', '1P OR 2P':j.play_type||'',
      'ADD-ONS / CPE':j.addon_count==null?'':j.addon_count, 'VAS NO':j.vas_no||'',
      'TEAM ASSIGNED':j.team||'', 'DRIVER':j.driver||'', 'TECH 1':j.tech1||'',
      'DRIVER (CREW)':j.crew_driver||'', 'TECH 1 (CREW)':j.crew_tech1||'', 'TECH 2 (CREW)':j.crew_tech2||'',
      'PRIORITY':j.priority||'', 'ACCOUNT':j.work_account||'',
      'MODE OF PAYMENT':j.payment_mode||'', 'AMOUNT':j.payment_amount==null?'':j.payment_amount, 'AR NO.':j.ar_no||'',
      'VALIDATED':j.validated?'YES':'', 'INCOMPLETE REMARK':j.negative_remark||'', 'SPECIAL NOTE':j.special_note||''
    }))));

    SHEETS.push(tbl('Per agent', agents.slice().sort((a,b)=>b.jos-a.jos).map(a=>({
      'AGENT':a.u,'SOURCE':a.console?'console / import':'field agent','JOB ORDERS':a.jos,'COMPLETED':a.done,
      'COMPLETION %':+a.rate.toFixed(2),'IN FLIGHT':a.open,'CANCELLED / REJECTED':a.dead,
      'BARANGAYS':a.nb,'DISTRICTS':a.nd,
      'TOP BARANGAYS':a.top.map(([b,c])=>`${(R.find(r=>r.c===b)||{n:b}).n} (${c})`).join(', ')
    }))));
    SHEETS.push(tbl('Barangay coverage', ranked().map(r=>{
      const e=byB[r.c];
      return {'BARANGAY':r.n,'DISTRICT':r.d,'PORTS':r.p,'ACTIVE':r.a,'SATURATION %':+r.sat.toFixed(2),
        'GAP TO 10%':Math.round(r.gap),'JOB ORDERS':e?e.jos:0,'COMPLETED':e?e.done:0,
        'AGENTS WORKING IT':e?Object.keys(e.agents).length:0,
        'JO PER 100 GAP':r.gap>0?+((e?e.jos:0)/r.gap*100).toFixed(1):'',
        'NO ACTIVITY':e?'':'YES','WIN-BACK':r.w,'REACTIVATE':r.x,'MIGRATE':r.mig};
    })));
    const RL2=agRoll();
    SHEETS.push(tbl('Day by day', RL2.days.map(d=>{
      const o={'DATE':d.d,'WEEKDAY':new Date(d.d+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'long',timeZone:'UTC'}),
        'ENCODED':d.jos,'COMPLETED':d.done,'COMPLETION %':d.jos?+(d.done/d.jos*100).toFixed(2):0,
        'CANCELLED / REJECTED':d.dead,'AGENTS':Object.keys(d.agents).length};
      RL2.statuses.forEach(st=>{ o[(ST_LABEL[st]||st).toUpperCase()]=d.st[st]||0; });
      return o;
    })));
    SHEETS.push(tbl('Source of sales', RL2.sources.map(e=>({
      'SOURCE OF SALES':e.k,'JOB ORDERS':e.jos,'COMPLETED':e.done,'COMPLETION %':+e.rate.toFixed(2),
      'NAMED REFERRERS':e.nref,'AGENTS':e.na
    }))));
    if(RL2.referrers.length)
      SHEETS.push(tbl('Referrers', RL2.referrers.map(r=>({
        'REFERRER':r.k,'SOURCE':r.src,'JOB ORDERS':r.jos,'COMPLETED':r.done,'COMPLETION %':+r.rate.toFixed(2),
        'BARANGAYS':r.nb,'ENCODED BY':Object.keys(r.agents).join(', ')
      }))));
    const cov=[]; RL2.agents.forEach(a=>Object.entries(a.brgys)
      .sort((x,y)=>y[1]-x[1]).forEach(([b,c])=>{ const r=R.find(z=>z.c===b);
        cov.push({'AGENT':a.u,'SOURCE':a.console?'console / import':'field agent',
          'BARANGAY':r?r.n:b,'DISTRICT':r?r.d:'','JOB ORDERS':c,
          'BARANGAY SATURATION %':r?+r.sat.toFixed(2):'','BARANGAY GAP':r?Math.round(r.gap):''});}));
    SHEETS.push(tbl('Areas covered', cov));

    if(btn){btn.disabled=true;btn.textContent='Building the pivot…';}
    let parts;
    try{
      parts=buildSalesWorkbook({sheets:SHEETS, pivot:{
        name:'Pivot', source:'Job orders',
        rowFields:['DATE ENCODED (DAY)','SALES AGENT','REFERRAL NAME'],
        subtotal:[0],
        data:[{field:'LOAD COUNT',name:'Loads encoded'},
              {field:'COMPLETED COUNT',name:'Loads completed'}]
      }});
    }catch(e){
      if(btn){btn.disabled=false;btn.textContent=lbl;}
      (window.showToast||alert)('Could not build the pivot: '+(e.message||e)); return;
    }
    const zip=new JSZip();
    Object.keys(parts).forEach(k=>zip.file(k,parts[k]));
    let blob;
    try{ blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',
      mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }
    catch(e){ if(btn){btn.disabled=false;btn.textContent=lbl;}
      (window.showToast||alert)('Could not write the workbook: '+(e.message||e)); return; }
    if(btn){btn.disabled=false;btn.textContent=lbl;}
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=`AHBA_sales_record_${agFrom}_to_${agTo}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
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
      const f=$('#agFrom'); if(f) f.onchange=e=>{agFrom=e.target.value; if(agFrom>agTo) agTo=agFrom; paint();};
      const t2=$('#agTo');  if(t2) t2.onchange=e=>{agTo=e.target.value; if(agTo<agFrom) agFrom=agTo; paint();};
      $$('#satBody .sat-quick').forEach(b=>b.onclick=()=>{
        agTo=isoDay(new Date()); agFrom=isoDay(new Date(Date.now()-(+b.dataset.qd-1)*864e5)); fetchAgents();});
      const g=$('#agGo'); if(g) g.onclick=fetchAgents;
      const x=$('#agXl'); if(x) x.onclick=exportAG;
      $$('#satRoot .sat-tab[data-agv]').forEach(b=>b.onclick=()=>{agView=b.dataset.agv;paint();});
      $$('#agTbl th').forEach(th=>th.onclick=()=>{agSort=th.dataset.gk;paint();});
      const w=$('#agWho'); if(w) w.onchange=e=>{agAgent=e.target.value;paint();};
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
