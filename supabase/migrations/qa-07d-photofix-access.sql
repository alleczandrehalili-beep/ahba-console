-- qa-07d-photofix-access.sql — ADDITIVE, on top of the LIVE qa-07b (console release 2026-10-13.2). Owner decisions 2026-10-13:
--   1. "isama na lang sa access role": photo correction is an explicit Access Control entry "QA Photo Fix" (page key 'photofix').
--      Edit = may replace a JO proof photo and open its history; View = history only. Granted per user by the superadmin.
--      (The live qa-07b gated on a 'dispatch' PAGE key that the console never issues, so nobody but a superadmin could replace.)
--   2. "GC org lang ang pwede": enabled for the GC organization only; other organizations pending. The enabled org codes live in
--      qa.settings key 'photo_correction_orgs' (comma-separated; absent = 'AHBA'), so opening another org later is a settings row.
-- Replaces two functions in place (same signatures, same grants): qa.photo_actor_authority and qa.photo_correction_history.
-- prepare / commit keep calling the authority with 'dispatch' (= a correction → photofix Edit); validate_photo_evidence keeps
-- 'completed' (QA validation unchanged). No table, trigger, policy or data change. Safe to re-run.
set lock_timeout = '2s';

create or replace function qa.photo_actor_authority(p_actor_id uuid,p_job_id text,p_page text) returns jsonb
language plpgsql stable security definer set search_path = qa, public, pg_temp as $$
declare v_email text; d public.dashboard_users; u public.user_orgs; j public.jobs; v_count integer;
begin
  if p_actor_id is null then raise exception using errcode='42501',message='DISPATCH_AUTH_REQUIRED: authenticated identity required'; end if;
  select email into v_email from auth.users where id=p_actor_id;
  select * into u from public.user_orgs where user_id=p_actor_id;
  if v_email is null or u.user_id is null or u.org_id is null then raise exception using errcode='42501',message='DISPATCH_ORG_REQUIRED: explicit user organization required'; end if;
  select count(*) into v_count from public.dashboard_users where lower(email)=lower(v_email) and org_id=u.org_id;
  if v_count<>1 then raise exception using errcode='42501',message='DISPATCH_IDENTITY_AMBIGUOUS: one dashboard identity in the user organization is required'; end if;
  select * into d from public.dashboard_users where lower(email)=lower(v_email) and org_id=u.org_id;
  -- Access Control entry "QA Photo Fix" (page key 'photofix'):
  --   p_page 'dispatch'  = a correction  → needs photofix View + Edit
  --   p_page 'photofix'  = history       → needs photofix View (or Edit)
  --   any other page (e.g. 'completed' for QA validation) = that page's View + Edit, unchanged
  if not coalesce(d.is_super,false) and not (
       case when p_page='dispatch' then coalesce(d.allowed_pages,'[]'::jsonb) @> '["photofix"]'::jsonb and coalesce(d.edit_pages,'[]'::jsonb) @> '["photofix"]'::jsonb
            when p_page='photofix' then coalesce(d.allowed_pages,'[]'::jsonb) @> '["photofix"]'::jsonb
            else coalesce(d.allowed_pages,'[]'::jsonb) @> jsonb_build_array(p_page) and coalesce(d.edit_pages,'[]'::jsonb) @> jsonb_build_array(p_page) end) then
    raise exception using errcode='42501',message='DISPATCH_EDIT_REQUIRED: the Access Control entry "QA Photo Fix" is required (Edit to replace a photo, View to open its history)';
  end if;
  -- GC organization only (photo correction AND its history); QA validation ('completed') keeps its existing scope. Platform admins pass.
  if p_page in ('dispatch','photofix') and not coalesce(u.is_platform_admin,false) and not exists (
       select 1 from public.orgs o where o.id=u.org_id
          and upper(btrim(o.code)) = any (select upper(btrim(x)) from unnest(string_to_array(coalesce((select value from qa.settings where key='photo_correction_orgs'),'AHBA'),',')) x)) then
    raise exception using errcode='42501',message='DISPATCH_GC_ONLY: photo correction is enabled for the GC organization only (pending for other organizations)';
  end if;
  select * into j from public.jobs where id=p_job_id and deleted_at is null;
  if j.id is null then raise exception using errcode='22023',message='JOB_NOT_FOUND: live job required'; end if;
  if j.org_id is null or not coalesce(coalesce(u.is_platform_admin,false) or j.org_id=u.org_id or j.assigned_org_id=u.org_id
      or (p_page='completed' and exists(select 1 from public.orgs where id=u.org_id and code='AHBA')),false) then
    raise exception using errcode='42501',message='DISPATCH_ORG_MISMATCH: only the job owning or assigned organization can write';
  end if;
  return jsonb_build_object('actor_id',p_actor_id,'actor_label',d.username,'actor_org_id',u.org_id,'org_id',j.org_id);
end $$;
revoke all on function qa.photo_actor_authority(uuid,text,text) from public,anon,authenticated;

-- History: the "QA Photo Fix" entry with View (or Edit). No longer inferred from dispatch / Completed edit.
create or replace function qa.photo_correction_history(p_job_id text,p_photo_id bigint default null) returns jsonb
language plpgsql stable security definer set search_path = qa, public, pg_temp as $$
declare v_authority jsonb;
begin
  v_authority := qa.photo_actor_authority(auth.uid(),p_job_id,'photofix');
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'operation_id',r.operation_id,'job_id',r.job_id,'photo_id',r.photo_id::text,'actor_id',r.actor_id,'actor_label',r.actor_label,'reason',r.reason,'corrected_at',r.corrected_at,'old_path',r.old_path,'new_path',r.new_path,'old_archive_path',r.old_archive_path,'new_archive_path',r.new_archive_path) order by r.corrected_at desc,r.id desc)
    from qa.photo_revisions r where r.job_id=p_job_id and (p_photo_id is null or r.photo_id=p_photo_id)),'[]'::jsonb);
end $$;
revoke all on function qa.photo_correction_history(text,bigint) from public,anon;
grant execute on function qa.photo_correction_history(text,bigint) to authenticated;

-- verification (read-only): both rows should say OK
select 'qa-07d: authority mentions photofix' as check_, case when pg_get_functiondef('qa.photo_actor_authority(uuid,text,text)'::regprocedure) like '%photofix%' then 'OK' else 'FAIL' end as result
union all select 'qa-07d: history gated by photofix', case when pg_get_functiondef('qa.photo_correction_history(text,bigint)'::regprocedure) like '%''photofix''%' then 'OK' else 'FAIL' end;
