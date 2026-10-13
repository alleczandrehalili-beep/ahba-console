set lock_timeout='2s';
set statement_timeout='120s';
begin;
-- Additive, read-only endpoint for the existing QA Validation Completed worksheet.
-- Rehearse against disposable PostgreSQL before owner deployment. Compatible with deployed legacy WIMS.
-- No table updates, stock/ledger helpers, declaration adoption or alias binding.
create schema if not exists qa;
create or replace function qa.validation_wims_export(p_job_ids text[])
returns table(job_id text, receipts jsonb, conflicts jsonb, unconfirmed jsonb, warnings jsonb)
language plpgsql stable security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_platform boolean;
  v_all_loads boolean;
  v_gc boolean;
  v_dashboard_count integer;
  v_can_read boolean;
  v_ids text[];
  v_job record;
  v_receipt record;
  v_receipts jsonb;
  v_conflicts jsonb;
  v_unconfirmed jsonb;
  v_warnings jsonb;
  v_profile text;
  v_account_check text;
  v_team text;
  v_cpe jsonb;
  v_pulled jsonb;
  v_catalog jsonb;
  v_aliases text[];
  v_count integer;
  v_dep record;
  v_matches integer;
  v_candidate text;
  v_unmapped integer;
  v_identity text;
begin
  -- Trust the identity's database membership, never editable UI data or org/admin JWT claims.
  if v_uid is null then raise exception using errcode='42501', message='WIMS_EXPORT_DENIED: authenticated console identity required'; end if;
  if to_regclass('public.user_orgs') is null or to_regclass('public.dashboard_users') is null then
    raise exception using errcode='42P01', message='WIMS_EXPORT_DEPENDENCY_MISSING: console membership tables';
  end if;
  select u.org_id, coalesce(u.is_platform_admin,false), coalesce(u.gc_all_loads,false)
    into v_org, v_platform, v_all_loads from public.user_orgs u where u.user_id=v_uid;
  if v_org is null then raise exception using errcode='42501', message='WIMS_EXPORT_DENIED: database organization membership required'; end if;
  select count(*), bool_or(coalesce(d.is_super,false) or
           (jsonb_typeof(d.allowed_pages)='array' and (d.allowed_pages ? 'completed' or d.allowed_pages ? 'qaaudit')))
    into v_dashboard_count, v_can_read
    from public.dashboard_users d join auth.users a on lower(a.email)=lower(d.email)
   where a.id=v_uid and d.org_id=v_org;
  if v_dashboard_count<>1 or not coalesce(v_can_read,false) then
    raise exception using errcode='42501', message='WIMS_EXPORT_DENIED: same-organization console completed/qaaudit read permission required';
  end if;
  select exists(select 1 from public.orgs o where o.id=v_org and o.code='AHBA') into v_gc;

  if p_job_ids is null or cardinality(p_job_ids)=0 or cardinality(p_job_ids)>100
     or exists(select 1 from unnest(p_job_ids) x where x is null or btrim(x)='') then
    raise exception using errcode='22023', message='WIMS_EXPORT_INVALID_IDS: supply 1 to 100 canonical job ids';
  end if;
  select array_agg(distinct x order by x) into v_ids from unnest(p_job_ids) x;
  -- Authorize the ENTIRE request before any WIMS evidence is read. Missing/forbidden ids are identical.
  if exists (
    select 1 from unnest(v_ids) requested(id)
    left join public.jobs j on j.id=requested.id
    where j.id is null or j.deleted_at is not null
       or not coalesce((coalesce(v_platform,false) or coalesce(v_all_loads,false) or coalesce(v_gc,false)
               or j.org_id=v_org or j.assigned_org_id=v_org),false)
  ) then
    raise exception using errcode='42501', message='WIMS_EXPORT_DENIED: requested canonical jobs unavailable in console read scope';
  end if;

  -- Core dependencies must exist. Missing data is never reported as "no declaration".
  for v_dep in select * from (values
    ('wims.installs',array['id','status','task','completed_at','created_at',
       'tech_user','team_id','modem_cpe_id','iptv_cpe_id','kit_used','materials_used','kit_remarks',
       'foc_reel_no','foc_start_m','foc_end_m','foc2_reel_no','foc2_end_m',
       'account_no','subscriber','jo_number','work_account','photos_count']),
    ('wims.cpe',array['id','install_id','serial','category']),
    ('wims.pulled_cpe',array['install_id','serial']),
    ('wims.teams',array['id','code']),
    ('wims.materials',array['key','name','consume_unit'])
  ) as required(relation_name,column_names)
  loop
    if to_regclass(v_dep.relation_name) is null then
      raise exception using errcode='42P01', message='WIMS_EXPORT_DEPENDENCY_MISSING: '||v_dep.relation_name;
    end if;
    if exists(select 1 from unnest(v_dep.column_names) c where not exists(
      select 1 from pg_attribute a where a.attrelid=to_regclass(v_dep.relation_name) and a.attname=c and not a.attisdropped)) then
      raise exception using errcode='42703', message='WIMS_EXPORT_DEPENDENCY_MISSING: required canonical columns in '||v_dep.relation_name;
    end if;
  end loop;
  select coalesce(jsonb_object_agg(m.key,jsonb_build_object('name',to_jsonb(m)->>'name',
         'consume_unit',to_jsonb(m)->>'consume_unit','issue_unit',to_jsonb(m)->>'issue_unit')), '{}'::jsonb)
    into v_catalog from wims.materials m;

  for v_job in select j.id, to_jsonb(j) as data from public.jobs j where j.id=any(v_ids) order by j.id
  loop
    v_receipts := '[]'::jsonb;
    v_unmapped := 0;
    select array_agg(distinct x) into v_aliases
      from unnest(array[upper(btrim(v_job.id)),upper(btrim(v_job.data->>'job_order_no')),upper(btrim(v_job.data->>'ticket_no'))]) x
     where nullif(x,'') is not null;

    v_unconfirmed := '[]'::jsonb;
    v_warnings := jsonb_build_array('Quantities and FOC readings are filed values. Material labels and units are current reference metadata. No inventory totals are inferred.',
      'Extra kit pieces may appear in both kit and material quantities. Do not add these fields together as total consumption.',
      'Legacy receipts are displayed only when JO/ticket plus nonblank customer account uniquely identify one retained job generation, including deleted jobs. Export does not bind or modify receipts.');
    if to_regclass('wims.profiles') is null then
      v_warnings := v_warnings || jsonb_build_array('Profile enrichment unavailable; immutable receipt tech_user identifies the original declarer.');
    end if;
    for v_receipt in
      select i.id, to_jsonb(i) as data from wims.installs i
       where to_jsonb(i)->>'job_id'=v_job.id or (nullif(to_jsonb(i)->>'job_id','') is null and upper(btrim(i.jo_number))=any(v_aliases))
       order by nullif(to_jsonb(i)->>'completed_at','')::timestamptz desc nulls last, i.id
    loop
      v_identity := 'stored-job-id';
      if nullif(v_receipt.data->>'job_id','') is null then
        select count(*), min(j.id) into v_matches,v_candidate from public.jobs j
         where upper(btrim(v_receipt.data->>'jo_number')) in
            (upper(btrim(j.id)),upper(btrim(j.job_order_no)),upper(btrim(j.ticket_no)))
           and nullif(btrim(v_receipt.data->>'account_no'),'') is not null
           and nullif(btrim(j.ibass_acct_no),'') is not null
           and upper(btrim(j.ibass_acct_no))=upper(btrim(v_receipt.data->>'account_no'));
        if v_matches<>1 or v_candidate is distinct from v_job.id then
          v_unmapped := v_unmapped+1;
          continue;
        end if;
        v_identity := 'unique-jo-account';
      end if;
      if jsonb_typeof(v_receipt.data->'kit_used') is distinct from 'object' or jsonb_typeof(v_receipt.data->'materials_used') is distinct from 'object' then
        v_warnings := v_warnings || jsonb_build_array('Receipt '||v_receipt.id||': kit/material quantities unrecorded or malformed; empty output is not proof of zero usage.');
      end if;
      v_profile := null;
      if to_regclass('wims.profiles') is not null then
        execute 'select to_jsonb(p)->>''display_name'' from wims.profiles p where to_jsonb(p)->>''user_id''=$1'
          into v_profile using v_receipt.data->>'tech_user';
      end if;
      select to_jsonb(t)->>'code' into v_team from wims.teams t where t.id::text=v_receipt.data->>'team_id';
      select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'serial',c.serial,'category',c.category,
                   'model',to_jsonb(c)->>'model') order by c.category,c.serial), '[]'::jsonb)
        into v_cpe from wims.cpe c
       where c.install_id=v_receipt.id or c.id::text in(v_receipt.data->>'modem_cpe_id',v_receipt.data->>'iptv_cpe_id');
      select coalesce(jsonb_agg(to_jsonb(p) order by p.serial),'[]'::jsonb)
        into v_pulled from wims.pulled_cpe p where p.install_id=v_receipt.id;
      v_account_check := case
        when nullif(btrim(v_receipt.data->>'account_no'),'') is null
          or nullif(btrim(v_job.data->>'ibass_acct_no'),'') is null then 'unconfirmed'
        when upper(btrim(v_receipt.data->>'account_no'))=upper(btrim(v_job.data->>'ibass_acct_no')) then 'matches_job'
        else 'mismatch' end;
      if v_account_check='mismatch' then
        v_warnings := v_warnings || jsonb_build_array('ACCOUNT MISMATCH - REVIEW: receipt '||v_receipt.id||
          ' filed account '||(v_receipt.data->>'account_no')||' differs from canonical job account '||
          (v_job.data->>'ibass_acct_no')||'. The saved receipt job identity is unchanged; mapping requires review.');
      elsif v_account_check='unconfirmed' then
        v_warnings := v_warnings || jsonb_build_array('Receipt '||v_receipt.id||
          ': customer account match cannot be confirmed because the receipt or canonical job account is unrecorded.');
      end if;
      v_receipts := v_receipts || jsonb_build_array(v_receipt.data || jsonb_build_object(
        'job_id',v_job.id,'source_job_id',v_receipt.data->>'job_id','identity_source',v_identity,
        'kit_used',case when jsonb_typeof(v_receipt.data->'kit_used')='object' then v_receipt.data->'kit_used' else '{}'::jsonb end,'materials_used',case when jsonb_typeof(v_receipt.data->'materials_used')='object' then v_receipt.data->'materials_used' else '{}'::jsonb end,
        'declared_by',v_profile,'team_code',v_team,'cpe',v_cpe,'pulled',v_pulled,'material_catalog',v_catalog,
        'job_account_no',v_job.data->>'ibass_acct_no','account_verification',v_account_check));
      if nullif(v_receipt.data->>'superseded_at','') is not null then
        v_warnings := v_warnings || jsonb_build_array('Historical receipt '||v_receipt.id||': some earlier serials may be unavailable after warehouse reassignment. Listed serials are retained evidence.');
      end if;
    end loop;
    v_conflicts := '[]'::jsonb;
    if to_regclass('wims.declaration_conflicts') is not null then
      execute 'select coalesce(jsonb_agg(to_jsonb(c) order by to_jsonb(c)->>''created_at''),''[]''::jsonb) from wims.declaration_conflicts c where to_jsonb(c)->>''job_id''=$1'
        into v_conflicts using v_job.id;
    end if;
    if to_regclass('wims.install_reconciliation') is not null then
      execute 'select coalesce(jsonb_agg(jsonb_build_object(''kind'',''canonical_reconciliation'',''reason'',to_jsonb(r)->>''reason'',''note'',to_jsonb(r)->>''note'')),''[]''::jsonb) from wims.install_reconciliation r where to_jsonb(r)->>''job_id''=$1'
        into v_unconfirmed using v_job.id;
    end if;
    if v_unmapped>0 then
      v_unconfirmed := v_unconfirmed || jsonb_build_array(jsonb_build_object('kind','unconfirmed_legacy_receipt','count',v_unmapped,
        'reason','JO/ticket and customer account do not uniquely identify this job generation. Receipt payload withheld; warehouse review required.'));
    end if;
    job_id := v_job.id; receipts := v_receipts; conflicts := v_conflicts;
    unconfirmed := v_unconfirmed; warnings := v_warnings;
    return next;
  end loop;
end;
$$;
revoke all on function qa.validation_wims_export(text[]) from public, anon, authenticated;
grant usage on schema qa to authenticated;
grant execute on function qa.validation_wims_export(text[]) to authenticated;
comment on function qa.validation_wims_export(text[]) is
  'Read-only canonical WIMS evidence for authorized QA Validation/QA Audit console exports; no alias adoption, stock mutation or partial authorization.';

notify pgrst,'reload schema';
commit;
