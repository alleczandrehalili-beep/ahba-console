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
  return {load, columnsFor};
});
