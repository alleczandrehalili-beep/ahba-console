/* Read-only WIMS evidence for the existing Completed worksheet. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  root.QaWimsExport=api;
})(typeof globalThis!=='undefined'?globalThis:this, function(){
  'use strict';
  const fields=['STATUS','RECEIPT ID','DECLARED BY / TEAM','FILED AT','TASK','DECLARED ACCOUNT','DECLARED SUBSCRIBER',
    'DECLARED JO / TICKET','WORK ACCOUNT','DECLARED PHOTO COUNT','MODEM SERIALS','IPTV SERIALS',
    'KIT','MATERIALS','FOC','PULLED DEVICES','REMARKS','HISTORICAL RECEIPTS','CONFLICTS','UNCONFIRMED EVIDENCE','WARNINGS'];
  const present=value=>value!==undefined && value!==null && value!=='';
  const text=value=>present(value)?String(value):'';
  const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  const join=values=>values.filter(present).map(text).join(' | ');

  function validate(row, id){
    if(!object(row)||row.job_id!==id||!['receipts','conflicts','unconfirmed','warnings'].every(k=>Array.isArray(row[k])))
      throw new Error('WIMS export malformed or incomplete evidence for '+id);
    const receiptIds=new Set();
    for(const r of row.receipts){
      if(!object(r)||!present(r.id)||r.job_id!==id||!object(r.kit_used)||!object(r.materials_used)
          ||!Array.isArray(r.cpe)||!Array.isArray(r.pulled)||!object(r.material_catalog)
          ||!['matches_job','mismatch','unconfirmed'].includes(r.account_verification)
          ||!Object.prototype.hasOwnProperty.call(r,'job_account_no'))
        throw new Error('WIMS export malformed canonical receipt for '+id);
      if(receiptIds.has(r.id)) throw new Error('WIMS export duplicate receipt payload for '+id);
      receiptIds.add(r.id);
    }
    for(const r of row.conflicts){
      if(!object(r)||r.job_id!==id||!present(r.id)) throw new Error('WIMS export malformed canonical conflict for '+id);
    }
  }

  async function load(jobs, options){
    if(!Array.isArray(jobs)) throw new Error('WIMS export requires canonical jobs');
    const ids=[];
    for(const job of jobs){
      if(!job || typeof job.id!=='string' || !job.id.trim()) throw new Error('WIMS export missing canonical job id');
      if(!ids.includes(job.id)) ids.push(job.id);
    }
    const map=Object.create(null);
    if(!ids.length) return map;
    if(!options || !options.url || !options.key || !options.token) throw new Error('WIMS export authorization is unavailable');
    const request=options.fetch || (typeof fetch==='function'?fetch:null);
    if(!request) throw new Error('WIMS export request service is unavailable');
    for(let offset=0;offset<ids.length;offset+=100){
      const batch=ids.slice(offset,offset+100);
      const response=await request(options.url.replace(/\/+$/,'')+'/rest/v1/rpc/validation_wims_export',{
        method:'POST',headers:{apikey:options.key,Authorization:'Bearer '+options.token,
          'Content-Type':'application/json','Content-Profile':'qa','Accept-Profile':'qa',Prefer:'count=exact'},
        body:JSON.stringify({p_job_ids:batch})
      });
      if(!response || !response.ok){
        let detail=''; try { const error=await response.json(); detail=text(error.message || error.error); } catch(_){}
        throw new Error('WIMS export failed'+(response?' ('+response.status+')':'')+(detail?': '+detail:''));
      }
      if(response.status===206) throw new Error('WIMS export partial response; archive was not created');
      const range=response.headers && response.headers.get('content-range');
      if(range){
        const match=/^(\d+)-(\d+)\/(\d+|\*)$/.exec(range);
        if(!match || +match[1]!==0 || match[3]==='*' || +match[2]+1!==batch.length || +match[3]!==batch.length)
          throw new Error('WIMS export incomplete response range; archive was not created');
      }
      const rows=await response.json();
      if(!Array.isArray(rows)) throw new Error('WIMS export malformed response; archive was not created');
      const seen=new Set();
      for(const row of rows){
        if(!object(row) || !batch.includes(row.job_id)) throw new Error('WIMS export unexpected canonical job response');
        if(seen.has(row.job_id)) throw new Error('WIMS export duplicate canonical job response');
        validate(row,row.job_id); seen.add(row.job_id); map[row.job_id]=row;
      }
      if(seen.size!==batch.length) throw new Error('WIMS export incomplete: missing authorized job evidence; archive was not created');
    }
    return map;
  }

  function quantities(values, catalog, kit){
    return Object.keys(values || {}).sort().map(key=>{
      const metadata=(catalog || {})[key] || {};
      const label=metadata.name && metadata.name!==key?metadata.name+' ['+key+']':key;
      const standardKit=kit && ['conn','patch','tbox','sar','saf','f17','f19','f20'].includes(key);
      const unit=metadata.consume_unit || metadata.uom || (standardKit?'pc':(key==='foc'?'m':'[unit unrecorded]'));
      return label+': '+(object(values[key])?JSON.stringify(values[key]):text(values[key]))+' '+unit;
    }).join('; ');
  }
  function identity(r){
    return join([r.declared_by, r.tech_user?'user '+r.tech_user:'', r.team_code?'team '+r.team_code:(r.team_id?'team id '+r.team_id:'')]);
  }
  function serials(r, category){
    const values=(Array.isArray(r.cpe)?r.cpe:[]).filter(c=>c.category===category).map(c=>c.serial);
    if(present(r[category+'_serial'])) values.push(r[category+'_serial']);
    if(Array.isArray(r[category+'_serials'])) values.push(...r[category+'_serials']);
    return [...new Set(values.filter(present).map(text))].sort().join(', ');
  }
  function foc(r){
    const values=[];
    if(present(r.materials_used.foc)) values.push('recorded usage: '+text(r.materials_used.foc)+' m');
    if([r.foc_reel_no,r.foc_start_m,r.foc_end_m].some(present))
      values.push(join([r.foc_reel_no?'reel '+r.foc_reel_no:'reel unrecorded',present(r.foc_start_m)?'start: '+r.foc_start_m+' m':'',present(r.foc_end_m)?'end: '+r.foc_end_m+' m':'']));
    if([r.foc2_reel_no,r.foc2_end_m].some(present))
      values.push(join([r.foc2_reel_no?'second reel '+r.foc2_reel_no:'second reel unrecorded',present(r.foc2_end_m)?'end: '+r.foc2_end_m+' m':'']));
    return values.join('; ');
  }
  function pulled(r){
    return (Array.isArray(r.pulled)?r.pulled:[]).map(p=>join([p.serial,p.note,p.status])).join('; ');
  }
  function summary(r){
    return join(['receipt '+r.id,r.status,'filed '+text(r.completed_at || r.created_at),identity(r),r.task || 'task unrecorded',
      r.account_no?'declared account '+r.account_no:'',r.jo_number?'declared JO/ticket '+r.jo_number:'',r.subscriber,
      r.work_account?'work account '+r.work_account:'',present(r.photos_count)?'declared photos '+r.photos_count:'',
      r.account_verification==='mismatch'?'ACCOUNT MISMATCH - REVIEW':'',
      serials(r,'modem')?'modem '+serials(r,'modem'):'',serials(r,'iptv')?'IPTV '+serials(r,'iptv'):'',
      quantities(r.kit_used,{...r.material_catalog,...r.kit_catalog},true),quantities(r.materials_used,r.material_catalog,false),foc(r),pulled(r),
      r.kit_remarks,r.remarks,r.superseded_at?'superseded '+r.superseded_at:'',r.superseded_note]);
  }
  function columnsFor(jobId, map){
    if(!map || !Object.prototype.hasOwnProperty.call(map,jobId)) throw new Error('WIMS export missing job evidence: '+jobId);
    const row=map[jobId]; validate(row,jobId);
    const active=row.receipts.filter(r=>!r.superseded_at);
    const historical=row.receipts.filter(r=>r.superseded_at);
    const cols=Object.fromEntries(fields.map(name=>['WIMS '+name,'']));
    let status=active.length>1?'MULTIPLE ACTIVE RECEIPTS - REVIEW':active.length===1?(active[0].status==='completed'?'DECLARED':'OPEN RECEIPT - REVIEW'):
      row.unconfirmed.length?'UNCONFIRMED - REVIEW':historical.length?'HISTORICAL ONLY - REVIEW':'NO CANONICAL DECLARATION';
    if(historical.length) status+='; '+historical.length+' HISTORICAL';
    if(row.conflicts.length) status+='; '+row.conflicts.length+' CONFLICT'+(row.conflicts.length===1?'':'S')+' - REVIEW';
    if(active.length && row.unconfirmed.length) status+='; UNCONFIRMED EVIDENCE - REVIEW';
    if(active.some(r=>r.account_verification==='mismatch')) status+='; ACCOUNT MISMATCH - REVIEW';
    cols['WIMS STATUS']=status;
    const lines=fn=>active.map(r=>'receipt '+r.id+': '+fn(r)).filter(line=>!line.endsWith(': ')).join('\n');
    cols['WIMS RECEIPT ID']=active.map(r=>text(r.id)).join('\n');
    cols['WIMS DECLARED BY / TEAM']=lines(identity);
    cols['WIMS FILED AT']=lines(r=>text(r.completed_at || r.created_at));
    cols['WIMS TASK']=lines(r=>r.task || 'task unrecorded');
    cols['WIMS DECLARED ACCOUNT']=lines(r=>text(r.account_no));
    cols['WIMS DECLARED SUBSCRIBER']=lines(r=>text(r.subscriber));
    cols['WIMS DECLARED JO / TICKET']=lines(r=>text(r.jo_number));
    cols['WIMS WORK ACCOUNT']=lines(r=>text(r.work_account));
    cols['WIMS DECLARED PHOTO COUNT']=lines(r=>text(r.photos_count));
    cols['WIMS MODEM SERIALS']=lines(r=>serials(r,'modem'));
    cols['WIMS IPTV SERIALS']=lines(r=>serials(r,'iptv'));
    cols['WIMS KIT']=lines(r=>quantities(r.kit_used,{...r.material_catalog,...r.kit_catalog},true));
    cols['WIMS MATERIALS']=lines(r=>quantities(r.materials_used,r.material_catalog,false));
    cols['WIMS FOC']=lines(foc);
    cols['WIMS PULLED DEVICES']=lines(pulled);
    cols['WIMS REMARKS']=lines(r=>join([r.kit_remarks,r.remarks,r.note]));
    cols['WIMS HISTORICAL RECEIPTS']=historical.map(summary).join('\n');
    cols['WIMS CONFLICTS']=row.conflicts.map(c=>join(['conflict '+c.id,c.status,c.reason,c.created_at,identity(c),c.note,
      c.args?'attempted payload (not counted as consumption): '+JSON.stringify(c.args):''])).join('\n');
    cols['WIMS UNCONFIRMED EVIDENCE']=row.unconfirmed.map(u=>typeof u==='string'?u:join([u.kind,u.reason,
      present(u.count)?u.count+' row(s)':'',u.note,u.resolved_at?'resolved '+u.resolved_at:'',u.resolution])).join('\n');
    cols['WIMS WARNINGS']=row.warnings.map(w=>typeof w==='string'?w:JSON.stringify(w)).join('\n');
    for(const [name,value] of Object.entries(cols)){
      if(value.length>32767) throw new Error('WIMS export exceeds the Excel cell limit for '+name+' on '+jobId+'; evidence cannot be truncated');
    }
    return cols;
  }
  // Operational usage columns are separate from the retained receipt/audit details.
  const kitNames={conn:'CONNECTOR',patch:'PATCH CORD',tbox:'TERMINAL BOX',sar:'SAR FORM',saf:'SAF FORM'};
  const materialNames={foc:'FOC',clip5:'CLIP 5MM',clip7:'CLIP 7MM',tie:'CABLE TIE',dtape:'DOUBLE-SIDED TAPE',etape:'ELECTRICAL TAPE',
    patchupc:'PATCH CORD UPC',jumper10:'JUMPER 10M',jumper20:'JUMPER 20M',jumper30:'JUMPER 30M',jumper40:'JUMPER 40M',
    clipa:'CLIP A',clipb:'CLIP B',f17:'F-17 CLAMP',f19:'F-19 BRACKET',f20:'F-20 HOOK',...kitNames};
  const defaultUnits={foc:'m',clip5:'pc',clip7:'pc',tie:'pc',dtape:'yd',etape:'m',patchupc:'pc',jumper10:'pc',jumper20:'pc',jumper30:'pc',jumper40:'pc',clipa:'pc',clipb:'pc',f17:'pc',f19:'pc',f20:'pc',conn:'pc',patch:'pc',tbox:'pc',sar:'pc',saf:'pc'};
  const auditFields=['WIMS RECEIPT ID','WIMS HISTORICAL RECEIPTS','WIMS CONFLICTS','WIMS UNCONFIRMED EVIDENCE','WIMS WARNINGS'];
  const isAuditColumn=name=>auditFields.includes(name);
  function quantity(value){
    if(!present(value))return '';
    if(typeof value==='number' && Number.isFinite(value))return value;
    if(typeof value==='string' && value.trim() && Number.isFinite(Number(value)) && Math.abs(Number(value))<=Number.MAX_SAFE_INTEGER)return Number(value);
    throw new Error('WIMS usage contains an unreadable quantity; export stopped instead of guessing.');
  }
  function usageColumnsFor(jobId,map){
    const audit=columnsFor(jobId,map),row=map[jobId];
    const active=row.receipts.filter(r=>!r.superseded_at),filed=active.filter(r=>r.status==='completed');
    // One row per JO: duplicate declarations never duplicate its payment or get summed.
    const values=fn=>{
      if(!filed.length)return '';
      if(filed.length===1)return fn(filed[0]);
      return filed.map((r,i)=>{const v=fn(r);return present(v)?'D'+(i+1)+': '+v:'';}).filter(Boolean).join(' | ');
    };
    let status=active.length>1?'MULTIPLE DECLARATIONS - REVIEW':filed.length?'DECLARED':active.length?'OPEN DECLARATION - REVIEW':
      row.unconfirmed.length?'UNCONFIRMED - REVIEW':row.receipts.length?'HISTORICAL ONLY - REVIEW':'NO DECLARATION';
    if(row.conflicts.length)status+='; CONFLICT - REVIEW';
    if(filed.some(r=>r.account_verification==='mismatch'))status+='; ACCOUNT MISMATCH - REVIEW';
    if(filed.length && row.unconfirmed.length)status+='; UNCONFIRMED EVIDENCE - REVIEW';
    const cols={
      'WIMS STATUS':status,
      'WIMS TEAM':values(r=>r.team_code||''),
      'WIMS DECLARED BY':values(r=>r.declared_by||''),
      'WIMS TASK':values(r=>r.task||''),
      'WIMS MODEM SERIAL NO.':values(r=>serials(r,'modem')),
      'WIMS IPTV SERIAL NO.':values(r=>serials(r,'iptv')),
      'WIMS REEL 1 NO.':values(r=>text(r.foc_reel_no)),
      'WIMS REEL 1 START (M)':values(r=>quantity(r.foc_start_m)),
      'WIMS REEL 1 END (M)':values(r=>quantity(r.foc_end_m)),
      'WIMS REEL 2 NO.':values(r=>text(r.foc2_reel_no)),
      'WIMS REEL 2 END (M)':values(r=>quantity(r.foc2_end_m)),
      'WIMS FOC USED (M)':values(r=>quantity(r.materials_used.foc))
    };
    for(const [key,name] of Object.entries(kitNames))cols['WIMS KIT '+name+' (PC)']=values(r=>quantity(r.kit_used[key]));
    // Include every material/kit key, including newly configured materials, across this export.
    const descriptors=new Map();
    const add=(key,metadata,kit=false)=>{
      if(key==='foc')return;
      const unit=(metadata?.consume_unit||metadata?.uom||defaultUnits[key]||'UNIT UNRECORDED').toUpperCase();
      const name=materialNames[key]||((metadata?.name||key)+' ['+key+']').toUpperCase();
      const heading='WIMS '+(kit?'KIT ':kitNames[key]?'BUFFER ':'')+name+(kit?'':' USED')+' ('+unit+')';
      // Kit buffer columns are deliberately separate: kit totals may include their excess.
      const label=kitNames[key]&&!kit?'WIMS BUFFER '+name+' ('+unit+')':heading;
      descriptors.set(label,{key,unit,kit});
    };
    for(const key of Object.keys(materialNames))if(key!=='foc')add(key,null);
    for(const evidence of Object.values(map))for(const r of evidence.receipts){
      for(const key of Object.keys(r.materials_used))add(key,r.material_catalog[key]);
      for(const key of Object.keys(r.kit_used))if(!kitNames[key])add(key,{...r.material_catalog,...r.kit_catalog}[key],true);
    }
    for(const [heading,d] of descriptors){
      cols[heading]=values(r=>{
        const metadata=d.kit?({...r.material_catalog,...r.kit_catalog}[d.key]||{}):(r.material_catalog[d.key]||{});
        const actualUnit=(metadata.consume_unit||metadata.uom||defaultUnits[d.key]||'UNIT UNRECORDED').toUpperCase();
        if(actualUnit!==d.unit)return '';
        return quantity((d.kit?r.kit_used:r.materials_used)[d.key]);
      });
    }
    cols['WIMS PULLED SERIAL NO.']=values(r=>r.pulled.map(p=>p.serial).filter(present).join(', '));
    cols['WIMS USAGE REMARKS']=values(r=>join([r.kit_remarks,r.remarks,r.note]));
    const notes=[];
    if(filed.some(r=>Object.keys(kitNames).some(k=>Number(r.materials_used[k])>0 && Object.hasOwn(r.kit_used,k))))notes.push('Kit quantities include their buffer excess; do not add kit and buffer columns.');
    if(active.length>1)notes.push('D1/D2 values are separate declarations in saved order; quantities are not combined.');
    if(row.unconfirmed.length)notes.push('Job/customer match requires review; unconfirmed usage is withheld.');
    if(row.conflicts.length)notes.push('Conflicting attempts require review and are not counted as actual usage.');
    if(filed.some(r=>r.account_verification==='mismatch'))notes.push('Declared customer account differs from this JO; review the receipt identity.');
    notes.push(...row.warnings.filter(w=>typeof w==='string'&&!/^(Quantities and FOC readings|Extra kit pieces|Legacy receipts are displayed)/.test(w)));
    cols['WIMS REVIEW NOTE']=notes.join(' ');
    // Retain full audit evidence at the far right, hidden in the default worksheet view.
    for(const name of auditFields)cols[name]=audit[name];
    for(const [name,value] of Object.entries(cols))if(typeof value==='string' && value.length>32767)throw new Error('WIMS export exceeds the Excel cell limit for '+name+' on '+jobId);
    return cols;
  }
  function worksheetLayout(rows){
    const headers=[...new Set(rows.flatMap(row=>Object.keys(row)))];
    const columns=headers.map(name=>{
      if(isAuditColumn(name))return {hidden:true,wch:28};
      const longest=Math.max(name.length,...rows.map(r=>text(r[name]).length));
      const usageQuantity=name.startsWith('WIMS ') && /\((?:M|PC|YD|IN|UNIT UNRECORDED)\)$/.test(name);
      return {wch:usageQuantity?18:Math.max(14,Math.min(65,longest+3))};
    });
    return {columns,autoFilter:true};
  }

  function styleWorksheet(ws,rows,headers){
    const columnName=i=>{let result='';for(i++;i;i=Math.floor((i-1)/26))result=String.fromCharCode(65+(i-1)%26)+result;return result;};
    ws['!rows']=[{hpt:Math.max(44,...headers.filter(name=>!isAuditColumn(name)).map(name=>Math.ceil(name.length/Math.max(12,(ws['!cols']?.[headers.indexOf(name)]?.wch||20)-3))*12+12))}];
    headers.forEach((name,col)=>{
      const cell=ws[columnName(col)+'1'];
      if(cell)cell.s={font:{bold:true,color:{rgb:'FFFFFF'},sz:10},fill:{fgColor:{rgb:name.startsWith('WIMS ')?'166534':col<4?'174469':'475569'}},alignment:{wrapText:true,vertical:'center'},border:{bottom:{style:'thin',color:{rgb:'CBD5E1'}}}};
    });
    rows.forEach((row,i)=>{
      let lines=1;
      headers.forEach((name,col)=>{
        const cell=ws[columnName(col)+(i+2)];
        if(!cell)return;
        cell.s={font:{sz:10},alignment:{wrapText:true,vertical:'top'},fill:{fgColor:{rgb:i%2?'F3F7FA':'FFFFFF'}}};
        if(name.startsWith('WIMS ') && !isAuditColumn(name) && typeof row[name]==='number')cell.z=Number.isInteger(row[name])?'0':'0.########';
        if(!isAuditColumn(name)){
          const width=ws['!cols']?.[col]?.wch||20;
          lines=Math.max(lines,...text(row[name]).split('\n').map(t=>Math.ceil(t.length/Math.max(1,width-2))));
        }
      });
      ws['!rows'][i+1]={hpt:Math.max(24,lines*15+8)};
    });
    return ws;
  }
  return {load, columnsFor, usageColumnsFor, isAuditColumn, worksheetLayout, styleWorksheet};
});
