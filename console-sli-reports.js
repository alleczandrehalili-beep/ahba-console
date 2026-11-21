/* One-click GC SLI monthly reports (Field Teams tab, superadmin): per month an Excel workbook
   (one real PivotTable sheet per AHBA_SLI team + Load History) and the Dual Ranking PDF.
   Pure builders live here (testable in Node); the UI + downloads are in open(). */
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.SliReports=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(){
  'use strict';
  const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG='http://schemas.openxmlformats.org/package/2006/relationships';
  const REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
  const isSli=t=>/^AHBA_SLI/i.test(String(t||''));

  // ---------- helpers ----------
  const colName=n=>{ let s=''; n++; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; };
  // attribute / text escape; newline/CR/tab use Excel's _xHHHH_ form (what Excel writes in the pivot cache)
  const strip=v=>String(v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
  const escAttr=v=>strip(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'_x000a_').replace(/\r/g,'_x000d_').replace(/\t/g,'_x0009_');
  const escText=v=>strip(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cmpStr=(a,b)=>{ const ua=a.toUpperCase(), ub=b.toUpperCase(); return ua<ub?-1:ua>ub?1:(a<b?-1:a>b?1:0); };
  const monthKey=d=>String(d||'').slice(0,7);
  const monthLabel=ym=>{ const [y,m]=ym.split('-'); return MONTH_NAMES[+m-1]+' '+y; };
  const lastDay=ym=>{ const [y,m]=ym.split('-').map(Number); return new Date(Date.UTC(y,m,0)).getUTCDate(); };
  const monthList=(from,to)=>{ const out=[]; let [y,m]=from.split('-').map(Number); const [ty,tm]=to.split('-').map(Number);
    while(y<ty||(y===ty&&m<=tm)){ out.push(y+'-'+String(m).padStart(2,'0')); m++; if(m>12){m=1;y++;} if(out.length>=12)break; } return out; };

  // rows: array of objects (jobToRow→upperRows). Returns {headers, body} with every cell normalized
  // like Excel's own export: text everywhere, except DISPATCH COUNT / AMOUNT which stay numeric.
  function normalize(rows){
    const headers=rows.length?Object.keys(rows[0]):[];
    const body=rows.map(r=>headers.map(h=>{
      const v=r[h];
      if(h==='DISPATCH COUNT') return (v===null||v===undefined||v==='')?0:Math.trunc(Number(v))||0;
      if(h==='AMOUNT') return (typeof v==='number'&&isFinite(v))?v:(v!==''&&v!==null&&v!==undefined&&isFinite(Number(v))?Number(v):'');
      return (v===null||v===undefined)?'':String(v);
    }));
    body.sort((a,b)=>cmpStr(a[0],b[0]));   // DATE ascending (stable)
    return {headers,body};
  }

  // ---------- stats / ranking (SLI teams only) ----------
  function stats(headers,body){
    const iT=headers.indexOf('TEAM ASSIGNED'), iS=headers.indexOf('STATUS');
    const T={};
    body.forEach(r=>{
      const t=r[iT]; if(!isSli(t)) return;
      const e=T[t]||(T[t]={a:0,c:0,i:0,x:0,o:0}); e.a++;
      const s=String(r[iS]||'').toUpperCase();
      if(s==='COMPLETED')e.c++; else if(s==='INCOMPLETE')e.i++; else if(s==='CANCELLED')e.x++; else e.o++;
    });
    return T;
  }
  function rankings(T){
    const L=Object.keys(T).map(t=>({team:t,c:T[t].c,a:T[t].a,r:T[t].c/T[t].a}));
    const vol=L.slice().sort((x,y)=>(y.c-x.c)||(y.r-x.r)||(y.a-x.a)||cmpStr(x.team,y.team));
    const rat=L.slice().sort((x,y)=>(y.r-x.r)||(y.c-x.c)||(y.a-x.a)||cmpStr(x.team,y.team));
    const A=L.reduce((s,x)=>s+x.a,0), C=L.reduce((s,x)=>s+x.c,0);
    const I=Object.values(T).reduce((s,x)=>s+x.i,0), O=Object.values(T).reduce((s,x)=>s+x.x+x.o,0);
    return {vol,rat,teams:L.length,A,C,I,O};
  }

  // ---------- Excel parts (xlsx = zip of these strings) ----------
  const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="12"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="12"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  function cellXml(ref,v,style){
    if(v===''||v===null||v===undefined) return '';
    const s=style?` s="${style}"`:'';
    if(typeof v==='number') return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escText(v)}</t></is></c>`;
  }
  function sheetXml(rowsOfCells,opts){
    // rowsOfCells: array (row index 0..) of arrays of {v,s}|null
    const o=opts||{};
    let x=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="${NS}">`;
    if(o.freezeRow) x+=`<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    if(o.cols) x+='<cols>'+o.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')+'</cols>';
    x+='<sheetData>';
    rowsOfCells.forEach((cells,ri)=>{
      if(!cells) return;
      const cs=cells.map((c,ci)=>c?cellXml(colName(ci)+(ri+1),c.v,c.s):'').join('');
      if(cs) x+=`<row r="${ri+1}">${cs}</row>`;
    });
    x+='</sheetData>';
    if(o.autoFilter) x+=`<autoFilter ref="${o.autoFilter}"/>`;
    return x+'</worksheet>';
  }

  function buildXlsxParts(headers,body,opts){
    const O=Object.assign({teamTest:isSli,teamField:'TEAM ASSIGNED',countField:'JOB ORDER NO.',dataSheet:'Load History',emptyMsg:'No AHBA_SLI teams in this month'},opts||{});
    const NF=headers.length, N=body.length;
    const iD=headers.indexOf('DATE'), iS=headers.indexOf('STATUS'), iT=headers.indexOf(O.teamField), iJ=headers.indexOf(O.countField);
    if([iD,iS,iT,iJ].some(i=>i<0)) throw new Error(O.dataSheet+' columns missing');
    const teams=[...new Set(body.map(r=>r[iT]).filter(O.teamTest))].sort(cmpStr);
    if(!teams.length) throw new Error(O.emptyMsg);
    // shared items (first appearance) + display order (sorted)
    const sh={}, disp={}, pos={};
    [iD,iS,iT].forEach(i=>{ const m=new Map(); body.forEach(r=>{ if(!m.has(r[i])) m.set(r[i],m.size); }); sh[i]=m;
      disp[i]=[...m.keys()].sort(cmpStr); pos[i]=new Map(disp[i].map((l,k)=>[l,k])); });
    const lastCol=colName(NF-1);
    // --- static pivot sheets
    const meta=[], sheets=[];
    teams.forEach(t=>{
      const tr=body.filter(r=>r[iT]===t);
      const sts=[...new Set(tr.map(r=>r[iS]))].sort(cmpStr);
      const cnt={}; tr.forEach(r=>{ const d=r[iD]; (cnt[d]||(cnt[d]={}))[r[iS]]=((cnt[d]||{})[r[iS]]||0)+1; });
      const dates=Object.keys(cnt).sort(cmpStr), lab=s=>s===''?'(blank)':s;
      const R=[]; R[0]=[{v:O.teamField,s:1},{v:t}];
      R[2]=[{v:'Count of '+O.countField},{v:'Column Labels'}];
      R[3]=[{v:'Row Labels',s:1},...sts.map(s=>({v:lab(s),s:1})),{v:'Grand Total',s:1}];
      const tot={}; let r0=4;
      dates.forEach(d=>{ const row=[{v:d,s:2}]; let n=0;
        sts.forEach(s=>{ const v=cnt[d][s]; if(v){ row.push({v}); tot[s]=(tot[s]||0)+v; n+=v; } else row.push(null); });
        row.push({v:n}); R[r0++]=row; });
      const last=[{v:'Grand Total',s:3}]; let g=0;
      sts.forEach(s=>{ last.push(tot[s]?{v:tot[s],s:1}:null); g+=tot[s]||0; }); last.push({v:g,s:1}); R[r0]=last;
      const gt=1+sts.length, endCol=colName(gt);
      sheets.push(sheetXml(R,{cols:[22.2,15.5,...sts.map(()=>12)]}));
      meta.push({team:t,ref:`A3:${endCol}${r0+1}`,dates,sts});
    });
    // --- Load History sheet
    const LH=[headers.map(h=>({v:h,s:1}))].concat(body.map(r=>r.map(v=>({v}))));
    sheets.push(sheetXml(LH,{freezeRow:true,autoFilter:`A1:${lastCol}${N+1}`}));
    const sheetNames=teams.concat([O.dataSheet]);
    // --- pivot cache
    const cf=headers.map((name,i)=>{
      if(sh[i]) return `<cacheField name="${escAttr(name)}" numFmtId="0"><sharedItems count="${sh[i].size}">${[...sh[i].keys()].map(x=>`<s v="${escAttr(x)}"/>`).join('')}</sharedItems></cacheField>`;
      if(name==='DISPATCH COUNT'){ const vs=body.map(r=>r[i]); return `<cacheField name="${name}" numFmtId="0"><sharedItems containsSemiMixedTypes="0" containsString="0" containsNumber="1" containsInteger="1" minValue="${Math.min(...vs)}" maxValue="${Math.max(...vs)}"/></cacheField>`; }
      if(name==='AMOUNT'){ const vs=body.map(r=>r[i]).filter(v=>typeof v==='number');
        if(vs.length){ const ci=vs.every(Number.isInteger)?' containsInteger="1"':''; return `<cacheField name="AMOUNT" numFmtId="0"><sharedItems containsMixedTypes="1" containsNumber="1"${ci} minValue="${Math.min(...vs)}" maxValue="${Math.max(...vs)}"/></cacheField>`; }
        return '<cacheField name="AMOUNT" numFmtId="0"><sharedItems/></cacheField>'; }
      const lt=body.some(r=>String(r[i]).length>255)?' longText="1"':'';
      return `<cacheField name="${escAttr(name)}" numFmtId="0"><sharedItems${lt}/></cacheField>`;
    }).join('');
    const cdef=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<pivotCacheDefinition xmlns="${NS}" xmlns:r="${RNS}" r:id="rId1" refreshedBy="AHBA FieldOps" refreshedDate="46340.6" createdVersion="8" refreshedVersion="8" minRefreshableVersion="3" refreshOnLoad="1" recordCount="${N}"><cacheSource type="worksheet"><worksheetSource ref="A1:${lastCol}${N+1}" sheet="${escAttr(O.dataSheet)}"/></cacheSource><cacheFields count="${NF}">${cf}</cacheFields></pivotCacheDefinition>`;
    const recs=body.map(r=>'<r>'+r.map((v,i)=>sh[i]?`<x v="${sh[i].get(v)}"/>`:(typeof v==='number'?`<n v="${v}"/>`:`<s v="${escAttr(v)}"/>`)).join('')+'</r>').join('');
    const crec=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<pivotCacheRecords xmlns="${NS}" xmlns:r="${RNS}" count="${N}">${recs}</pivotCacheRecords>`;
    // --- pivot tables
    const ptable=(k,m)=>{
      const pf=headers.map((_,i)=>{
        if(i===iD) return `<pivotField axis="axisRow" showAll="0"><items count="${disp[i].length+1}">${disp[i].map(l=>`<item x="${sh[i].get(l)}"/>`).join('')}<item t="default"/></items></pivotField>`;
        if(i===iS) return `<pivotField axis="axisCol" showAll="0"><items count="${disp[i].length+1}">${disp[i].map(l=>`<item x="${sh[i].get(l)}"/>`).join('')}<item t="default"/></items></pivotField>`;
        if(i===iT) return `<pivotField axis="axisPage" multipleItemSelectionAllowed="1" showAll="0"><items count="${disp[i].length+1}">${disp[i].map(l=>l===m.team?`<item x="${sh[i].get(l)}"/>`:`<item h="1" x="${sh[i].get(l)}"/>`).join('')}<item t="default"/></items></pivotField>`;
        if(i===iJ) return '<pivotField dataField="1" showAll="0"/>';
        return '<pivotField showAll="0"/>'; }).join('');
      const ri=m.dates.map(d=>{const p=pos[iD].get(d);return p>0?`<i><x v="${p}"/></i>`:'<i><x/></i>';}).join('');
      const ci=m.sts.map(s=>{const p=pos[iS].get(s);return p>0?`<i><x v="${p}"/></i>`:'<i><x/></i>';}).join('');
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<pivotTableDefinition xmlns="${NS}" name="PivotTable${k}" cacheId="1" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Values" updatedVersion="8" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0" outline="1" outlineData="1" multipleFieldFilters="0"><location ref="${m.ref}" firstHeaderRow="1" firstDataRow="2" firstDataCol="1" rowPageCount="1" colPageCount="1"/><pivotFields count="${NF}">${pf}</pivotFields><rowFields count="1"><field x="${iD}"/></rowFields><rowItems count="${m.dates.length+1}">${ri}<i t="grand"><x/></i></rowItems><colFields count="1"><field x="${iS}"/></colFields><colItems count="${m.sts.length+1}">${ci}<i t="grand"><x/></i></colItems><pageFields count="1"><pageField fld="${iT}" hier="-1"/></pageFields><dataFields count="1"><dataField name="Count of ${escAttr(O.countField)}" fld="${iJ}" subtotal="count" baseField="0" baseItem="0"/></dataFields><pivotTableStyleInfo name="PivotStyleMedium4" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>`;
    };
    const rels=items=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${PKG}">`+items.map(([id,t,g])=>`<Relationship Id="${id}" Type="${REL}${t}" Target="${g}"/>`).join('')+'</Relationships>';
    const F={};
    const S=sheetNames.length;
    let ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/pivotCache/pivotCacheDefinition1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml"/><Override PartName="/xl/pivotCache/pivotCacheRecords1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml"/>`;
    sheets.forEach((x,i)=>{ F[`xl/worksheets/sheet${i+1}.xml`]=x; ct+=`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`; });
    meta.forEach((m,i)=>{ const k=i+1;
      F[`xl/pivotTables/pivotTable${k}.xml`]=ptable(k,m);
      F[`xl/pivotTables/_rels/pivotTable${k}.xml.rels`]=rels([['rId1','pivotCacheDefinition','../pivotCache/pivotCacheDefinition1.xml']]);
      F[`xl/worksheets/_rels/sheet${k}.xml.rels`]=rels([['rId1','pivotTable',`../pivotTables/pivotTable${k}.xml`]]);
      ct+=`<Override PartName="/xl/pivotTables/pivotTable${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml"/>`; });
    F['[Content_Types].xml']=ct+'</Types>';
    F['_rels/.rels']=rels([['rId1','officeDocument','xl/workbook.xml']]);
    F['xl/styles.xml']=STYLES;
    F['xl/workbook.xml']=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${NS}" xmlns:r="${RNS}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheetNames.map((n,i)=>`<sheet name="${escAttr(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><calcPr calcId="191029"/><pivotCaches><pivotCache cacheId="1" r:id="rIdPC1"/></pivotCaches></workbook>`;
    F['xl/_rels/workbook.xml.rels']=rels(sheetNames.map((_,i)=>[`rId${i+1}`,'worksheet',`worksheets/sheet${i+1}.xml`]).concat([[`rId${S+1}`,'styles','styles.xml'],['rIdPC1','pivotCacheDefinition','pivotCache/pivotCacheDefinition1.xml']]));
    F['xl/pivotCache/pivotCacheDefinition1.xml']=cdef;
    F['xl/pivotCache/pivotCacheRecords1.xml']=crec;
    F['xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels']=rels([['rId1','pivotCacheRecords','pivotCacheRecords1.xml']]);
    return {parts:F,teams,sheetNames};
  }

  // ---------- PDF (jsPDF, Helvetica, same look as the issued Dual Ranking report) ----------
  const NAVY=[24,62,86], TEAL=[8,127,131], GRAY=[86,109,122], ZEB=[236,244,246];
  const pc=x=>(x*100).toFixed(1)+'%';
  const fmt=n=>Number(n).toLocaleString('en-US');
  function buildPdf(jsPDF,rk,period,monthKeyLabel,partialNote){
    const doc=new jsPDF({unit:'pt',format:'a4',compress:true});
    const X=48, W=460, TOP=60;
    let y=TOP, page=1;
    const footer=()=>{ doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text('AHBA DEVELOPMENT  |  GC SLI NEW INSTALL ONLY',42,842-25+6); doc.text('Page '+page,527.9,842-25+6); };
    const newPage=()=>{ footer(); doc.addPage(); page++; y=TOP; };
    const title=t=>{ doc.setFont('helvetica','bold'); doc.setFontSize(19); doc.setTextColor(...NAVY); doc.text(t,X,y+17); y+=24+6; };
    const sec=t=>{ doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(...TEAL); doc.text(t,X,y+12); y+=17+6; };
    // segs: [[text,bold]...]; word-wrapped paragraph
    const para=(segs,size,lead,after)=>{
      const words=[]; segs.forEach(([t,b])=>String(t).split(/(\s+)/).forEach(w=>{ if(w!=='') words.push([w,b]); }));
      const lines=[[]]; let wcur=0;
      words.forEach(([w,b])=>{ doc.setFont('helvetica',b?'bold':'normal'); doc.setFontSize(size); const ww=doc.getTextWidth(w);
        if(/^\s+$/.test(w)){ if(lines[lines.length-1].length) { lines[lines.length-1].push([w,b,ww]); wcur+=ww; } return; }
        if(wcur+ww>W && lines[lines.length-1].length){ lines.push([]); wcur=0; }
        lines[lines.length-1].push([w,b,ww]); wcur+=ww; });
      doc.setTextColor(0,0,0);
      lines.forEach((ln,li)=>{ let x=X; while(ln.length&&/^\s+$/.test(ln[ln.length-1][0])) ln.pop();
        const runs=[]; ln.forEach(([w,b,ww])=>{ const l=runs[runs.length-1]; if(l&&l.b===b){ l.t+=w; l.w+=ww; } else runs.push({t:w,b,w:ww}); });
        runs.forEach(r=>{ doc.setFont('helvetica',r.b?'bold':'normal'); doc.setFontSize(size); doc.text(r.t,x,y+size+li*lead-1); x+=r.w; }); });
      y+=lines.length*lead+(after||0);
    };
    const table=(head,rowsT,cw)=>{
      const hH=25, rH=24.8; let x=X;
      doc.setFillColor(...NAVY); doc.rect(X,y,W,hH,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(255,255,255);
      x=X; head.forEach((h,i)=>{ doc.text(h,x+8,y+hH/2+2.8); x+=cw[i]; });
      let ry=y+hH;
      rowsT.forEach((r,ri)=>{ if(ri%2===1){ doc.setFillColor(...ZEB); doc.rect(X,ry,W,rH,'F'); }
        doc.setFont('helvetica','normal'); doc.setFontSize(8.2); doc.setTextColor(0,0,0);
        x=X; r.forEach((c,i)=>{ doc.text(String(c),x+8,ry+rH/2+2.9); x+=cw[i]; }); ry+=rH; });
      if(rowsT.length===1){ doc.setDrawColor(...TEAL); doc.setLineWidth(1); doc.line(X,ry,X+W,ry); }
      y=ry;
    };
    const v1=rk.vol[0], r1=rk.rat[0];
    title('AHBA DEVELOPMENT | GC NEW INSTALL');
    para([[period+' | AHBA_SLI teams only | Management performance review',false]],8.9,13,8);
    para([['Scope:',true],[' Only AHBA (GC) New Install team codes starting with AHBA_SLI. Subcontractors, SLR, other jobs and unassigned records are excluded.',false]],8.9,13,26);
    sec('Executive overview');
    table(['GC Teams','Assigned SLI Jobs','Completed Jobs','Completion Rate'],[[rk.teams,fmt(rk.A),fmt(rk.C),pc(rk.C/rk.A)]],[115,120,120,105]);
    y+=10;
    para([['Highest volume:',true],[` ${v1.team} with ${v1.c} completed out of ${v1.a} assigned. `,false],['Highest rating:',true],[` ${r1.team} with ${pc(r1.r)} completion (${r1.c}/${r1.a}).`,false]],8.9,13,6);
    para([['These are different awards. Volume rewards completed output; rating measures the share of assigned jobs completed. Neither is a customer satisfaction or audited QA score.',false]],7.2,10,6);
    if(partialNote) para([[partialNote,false]],7.2,10,0);
    newPage();
    title('PART 1 | HIGHEST VOLUME');
    para([['Ranked by ',false],['completed New Install work orders',true],[' (highest to lowest). Tie-breaker: higher completion rate, then higher assigned count.',false]],8.9,13,8);
    table(['Rank','AHBA GC Team','Completed','Assigned','Completion Rate'],rk.vol.map((t,i)=>[i+1,t.team,t.c,t.a,pc(t.r)]),[45,145,95,85,90]);
    y+=6; para([['Use this ranking to recognize total installation output. Workdays, crew size, area coverage, and job difficulty should be reviewed before using it for incentives.',false]],7.2,10,0);
    newPage();
    title('PART 2 | HIGHEST RATING');
    para([['Ranked by ',false],['completion rate',true],[' = completed / assigned SLI work orders (highest to lowest). Tie-breaker: higher completed count, then higher assigned count.',false]],8.9,13,8);
    table(['Rank','AHBA GC Team','Completion Rate','Completed','Assigned'],rk.rat.map((t,i)=>[i+1,t.team,pc(t.r),t.c,t.a]),[45,145,95,85,90]);
    y+=6; para([['Small work volumes can make percentages less stable. Review incomplete-job reasons (facility limitations, subscriber rescheduling, and cancellations) before attributing them to the team.',false]],7.2,10,0);
    newPage();
    title('OPERATIONS | MANAGEMENT REVIEW'); y+=4;
    sec('Monthly GC SLI results');
    table(['Month','Assigned','Completed','Incomplete','Completion'],[[monthKeyLabel,fmt(rk.A),fmt(rk.C),fmt(rk.I),pc(rk.C/rk.A)]],[90,90,90,90,100]);
    y+=4; para([[`Incomplete = status INCOMPLETE. Cancelled/other statuses: ${fmt(rk.O)} job(s).`+(partialNote?' '+partialNote:''),false]],7.2,10,14);
    sec('Recommendations');
    [['Check true quality:','Compare completed jobs with validated work orders, activation logs, installation evidence, and repeat repair rates.'],
     ['Review fair workload:','Compare completed jobs per actual field day, crew headcount, and geographic complexity before giving productivity incentives.'],
     ['Exclude external blockers:','Review FULL NAP, customer rescheduling, and facility constraints separately from technician-attributable issues.'],
     ['Keep two separate awards:','Highest Volume and Highest Completion Rate (Highest Rating) should remain distinct.'],
     ['Data limitation:','The data has no independent customer satisfaction score; "Rating" in this report means completion percentage only.']]
      .forEach(([a,b])=>para([[a,true],[' '+b,false]],8.9,13,6));
    footer();
    return doc.output('arraybuffer');
  }

  // ---------- data fetch (same query the Billing Validation / Load History export uses) ----------
  async function fetchJobs(ctx,from,to){
    const fs=(from+'T00:00:00+08:00').replace('+','%2B'), es=(to+'T23:59:59.999+08:00').replace('+','%2B');
    const rangeQ=`or=(and(load_date.gte.${from},load_date.lte.${to}),and(load_date.is.null,updated_at.gte.${fs},updated_at.lte.${es}))`;
    let all=[];
    for(let off=0;off<60000;off+=1000){
      const r=await fetch(`${ctx.url}/rest/v1/jobs?select=*&${rangeQ}&order=id.asc&limit=1000&offset=${off}`,{headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.token()}});
      if(!r.ok) throw new Error('Jobs fetch failed (HTTP '+r.status+')');
      const page=await r.json(); all=all.concat(page); if(page.length<1000) break;
    }
    const dayOf=j=>j.load_date?String(j.load_date).slice(0,10):(j.updated_at?new Date(j.updated_at).toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}):'');
    return all.filter(j=>{ const d=dayOf(j); return d&&d>=from&&d<=to&&!j.deleted_at; });
  }

  // ---------- SLR tickets (jobs with load_type SLR-TICKET), by created date (Manila) ----------
  const SLR_HEADERS=['DATE','TICKET NO','TICKET ID','TEAM','STATUS','SUBSCRIBER','IBAS ACCOUNT','CONTACT','ADDRESS','SERVICE DONE','CREATED','COMPLETED'];
  const isSlr=t=>/^AHBA_SLR/i.test(String(t||''));
  async function fetchSlr(ctx,from,to){
    const fs=(from+'T00:00:00+08:00').replace('+','%2B'), es=(to+'T23:59:59.999+08:00').replace('+','%2B');
    let all=[];
    for(let off=0;off<30000;off+=1000){
      const r=await fetch(`${ctx.url}/rest/v1/jobs?select=*&load_type=eq.SLR-TICKET&deleted_at=is.null&created_at=gte.${fs}&created_at=lte.${es}&order=id.asc&limit=1000&offset=${off}`,{headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.token()}});
      if(!r.ok) throw new Error('SLR tickets fetch failed (HTTP '+r.status+')');
      const page=await r.json(); all=all.concat(page); if(page.length<1000) break;
    }
    return all;
  }
  const slrRows=(ctx,tickets)=>ctx.upperRows(tickets.map(t=>({
    'DATE':t.created_at?new Date(t.created_at).toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}):'',
    'TICKET NO':t.ticket_no||'','TICKET ID':t.id,'TEAM':t.team||'','STATUS':ctx.statusLabel(t.status||''),
    'SUBSCRIBER':t.subscriber||'','IBAS ACCOUNT':t.ibass_acct_no||'','CONTACT':t.primary_no||'','ADDRESS':t.address||'',
    'SERVICE DONE':t.service_remarks||'','CREATED':ctx.slrFmt(t.created_at),'COMPLETED':t.completed_at?ctx.slrFmt(t.completed_at):''})));
  const SLR_OPTS={teamTest:isSlr,teamField:'TEAM',countField:'TICKET NO',dataSheet:'SLR Tickets',emptyMsg:'No AHBA_SLR teams in this month'};

  const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.async=true; s.onload=res; s.onerror=()=>rej(new Error('load failed: '+src)); document.head.appendChild(s); });
  let _pdfP=null;
  const ensureJsPdf=()=>window.jspdf?Promise.resolve():(_pdfP||(_pdfP=loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')));

  async function generate(ctx,from,to,wantXlsx,wantPdf,progress,wantSlr){
    if(from>to){ const t=from; from=to; to=t; }
    const months=monthList(from,to);
    const today=ctx.manilaToday(), curM=today.slice(0,7);
    const rangeFrom=months[0]+'-01';
    const lastM=months[months.length-1];
    const rangeTo=lastM===curM?today:lastM+'-'+String(lastDay(lastM)).padStart(2,'0');
    progress('Loading libraries…');
    await Promise.all([ctx.ensureJSZip(),wantPdf?ensureJsPdf():Promise.resolve()]);
    progress('Fetching loads from FieldOps…');
    await ctx.loadAgentNames();
    const jobs=await fetchJobs(ctx,rangeFrom,rangeTo);
    const rowsAll=ctx.upperRows(jobs.map(j=>ctx.jobToRow(j)));
    const zip=new JSZip(); const summary=[];
    for(const m of months){
      const rows=rowsAll.filter(r=>monthKey(r['DATE'])===m);
      if(!rows.length){ summary.push(`${monthLabel(m)}: no loads`); continue; }
      const {headers,body}=normalize(rows);
      const T=stats(headers,body);
      if(!Object.keys(T).length){ summary.push(`${monthLabel(m)}: no AHBA_SLI jobs`); continue; }
      const rk=rankings(T);
      const partial=m===curM;
      const [yy,mm]=m.split('-'); const mName=MONTH_NAMES[+mm-1];
      const day=today.slice(8,10).replace(/^0/,'');
      const period=partial?`${mName} 1-${day}, ${yy}`:`${mName} 1-${lastDay(m)}, ${yy}`;
      const note=partial?`Partial month: ${period} only. Some jobs are still open, so completion is not comparable with full months.`:'';
      if(wantXlsx){
        progress(`Building Excel — ${mName} ${yy}…`);
        const {parts}=buildXlsxParts(headers,body);
        const x=new JSZip(); Object.keys(parts).forEach(k=>x.file(k,parts[k]));
        const buf=await x.generateAsync({type:'uint8array',compression:'DEFLATE'});
        zip.file(`Excel/AHBA_TEAM PERFORMANCE_SLI_${mName.toUpperCase()}${partial?' 1-'+day:''} ${yy}.xlsx`,buf);
      }
      if(wantPdf){
        progress(`Building PDF — ${mName} ${yy}…`);
        const pdf=buildPdf(window.jspdf.jsPDF,rk,period,partial?`${m} (1-${day})`:m,note);
        zip.file(`PDF/AHBA_${mName}_${yy}_AHBA_GC_SLI_Dual_Ranking_Report.pdf`,pdf);
      }
      summary.push(`${mName} ${yy}: ${rk.teams} teams · ${fmt(rk.A)} assigned · ${fmt(rk.C)} completed (${pc(rk.C/rk.A)})`);
    }
    if(wantSlr){
      progress('Fetching SLR tickets…');
      const sRows=slrRows(ctx,await fetchSlr(ctx,rangeFrom,rangeTo));
      for(const m of months){
        const [yy,mm]=m.split('-'); const mName=MONTH_NAMES[+mm-1];
        const rows=sRows.filter(r=>monthKey(r['DATE'])===m);
        if(!rows.length){ summary.push(`SLR ${mName} ${yy}: no tickets`); continue; }
        const {headers,body}=normalize(rows);
        let parts; try{ parts=buildXlsxParts(headers,body,SLR_OPTS).parts; }catch(e){ summary.push(`SLR ${mName} ${yy}: no AHBA_SLR team tickets`); continue; }
        progress(`Building SLR Excel — ${mName} ${yy}…`);
        const x=new JSZip(); Object.keys(parts).forEach(k=>x.file(k,parts[k]));
        const buf=await x.generateAsync({type:'uint8array',compression:'DEFLATE'});
        const partial=m===curM, day=today.slice(8,10).replace(/^0/,'');
        zip.file(`SLR/AHBA_SLR_TICKETS_${mName.toUpperCase()}${partial?' 1-'+day:''} ${yy}.xlsx`,buf);
        const stI=headers.indexOf('STATUS'); const by={}; body.forEach(r=>{ by[r[stI]]=(by[r[stI]]||0)+1; });
        summary.push(`SLR ${mName} ${yy}: ${fmt(body.length)} tickets · `+Object.keys(by).sort().map(k=>`${k.toLowerCase()} ${by[k]}`).join(', '));
      }
    }
    if(!Object.keys(zip.files).length) throw new Error('Nothing to export for this range');
    progress('Zipping…');
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    return {blob,name:`AHBA_GC_SLI_Reports_${months[0]}_to_${lastM}.zip`,summary};
  }

  // ---------- UI ----------
  function open(ctx){
    let ov=document.getElementById('sliRepOv'); if(ov) ov.remove();
    ov=document.createElement('div'); ov.id='sliRepOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(8,30,26,.55);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px';
    const mNow=ctx.manilaToday().slice(0,7);
    const inp='border:1px solid #dfe5df;border-radius:9px;padding:8px 10px;font-size:12px';
    ov.innerHTML=`<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:20px 22px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><h3 style="margin:0;font-size:16px">📑 GC SLI Reports</h3><p style="margin:3px 0 0;font-size:10px;color:#8a9894">One click · per month: Team Performance Excel (PivotTable per AHBA_SLI team + Load History), the Dual Ranking PDF and the SLR Tickets Excel (PivotTable per AHBA_SLR team + tickets). Superadmin only.</p></div>
        <button class="secondary-btn" id="sliRepClose" style="height:32px">✕</button>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;align-items:center">
        <label style="font-size:10px;color:#8a9894">From <input type="month" id="sliRepFrom" value="2026-07" max="${mNow}" style="${inp}"></label>
        <label style="font-size:10px;color:#8a9894">To <input type="month" id="sliRepTo" value="${mNow}" max="${mNow}" style="${inp}"></label>
      </div>
      <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:#33433f">
        <label><input type="checkbox" id="sliRepX" checked> Excel (PivotTables)</label>
        <label><input type="checkbox" id="sliRepP" checked> PDF (Dual Ranking)</label>
        <label><input type="checkbox" id="sliRepS" checked> SLR Tickets (Excel)</label>
      </div>
      <p style="font-size:10px;color:#8a9894;margin:10px 0 0">Max 12 months. The current month covers day 1 up to today. Everything downloads as one ZIP (Excel/, PDF/ and SLR/ folders). The Excel refreshes its PivotTables when opened — click <b>Enable Editing</b> if Excel shows Protected View.</p>
      <div style="display:flex;gap:8px;align-items:center;margin-top:14px"><button class="primary-btn" id="sliRepGo" style="height:38px">Generate reports</button><span id="sliRepMsg" style="font-size:11px;color:#5a6a66"></span></div>
      <ul id="sliRepOut" style="margin:12px 0 0;padding-left:18px;font-size:11px;color:#33433f"></ul>
    </div>`;
    document.body.appendChild(ov);
    const $=id=>document.getElementById(id);
    ov.onclick=e=>{ if(e.target===ov) ov.remove(); };
    $('sliRepClose').onclick=()=>ov.remove();
    $('sliRepGo').onclick=async()=>{
      const btn=$('sliRepGo'), msg=$('sliRepMsg'), out=$('sliRepOut');
      const wx=$('sliRepX').checked, wp=$('sliRepP').checked, ws=$('sliRepS').checked;
      if(!wx&&!wp&&!ws){ msg.textContent='Pick at least one report.'; return; }
      btn.disabled=true; out.innerHTML='';
      try{
        const r=await generate(ctx,$('sliRepFrom').value||'2026-07',$('sliRepTo').value||mNow,wx,wp,t=>{ msg.textContent=t; },ws);
        out.innerHTML=r.summary.map(s=>`<li>${s.replace(/</g,'&lt;')}</li>`).join('');
        const a=document.createElement('a'); a.href=URL.createObjectURL(r.blob); a.download=r.name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=>URL.revokeObjectURL(a.href),20000);
        msg.textContent='✅ Done — '+r.name; if(ctx.showToast) ctx.showToast('Reports downloaded');
      }catch(e){ msg.textContent='❌ '+e.message; }
      btn.disabled=false;
    };
  }

  return {open,generate,normalize,stats,rankings,buildXlsxParts,buildPdf,colName,escAttr,monthList,monthLabel,lastDay};
});
