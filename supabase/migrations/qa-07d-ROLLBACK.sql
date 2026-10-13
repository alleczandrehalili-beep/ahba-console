-- qa-07d-ROLLBACK.sql — restores the two functions exactly as the LIVE qa-07b (console release 2026-10-13.2, origin/main) defines them.
-- Use only if qa-07d must be undone; one chunk; no table/data change. After it, the console must be back on a build without the photofix gate (≤ .10).
set lock_timeout = '2s';
-- Identity and page permissions are read from trusted database records on every prepare,
-- commit, history, and validation call. GC viewing never authorizes dispatcher corrections.
-- Completed-page validation separately retains the existing trusted AHBA reviewer scope.
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
  if not coalesce(d.is_super,false) and not
    (coalesce(d.allowed_pages,'[]'::jsonb) @> jsonb_build_array(p_page) and coalesce(d.edit_pages,'[]'::jsonb) @> jsonb_build_array(p_page)) then
    raise exception using errcode='42501',message='DISPATCH_EDIT_REQUIRED: page view and edit authority required';
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

create or replace function qa.photo_correction_history(p_job_id text,p_photo_id bigint default null) returns jsonb
language plpgsql stable security definer set search_path = qa, public, pg_temp as $$
declare v_authority jsonb;
begin
  begin v_authority := qa.photo_actor_authority(auth.uid(),p_job_id,'dispatch');
  exception when insufficient_privilege then v_authority := qa.photo_actor_authority(auth.uid(),p_job_id,'completed'); end;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'operation_id',r.operation_id,'job_id',r.job_id,'photo_id',r.photo_id::text,'actor_id',r.actor_id,'actor_label',r.actor_label,'reason',r.reason,'corrected_at',r.corrected_at,'old_path',r.old_path,'new_path',r.new_path,'old_archive_path',r.old_archive_path,'new_archive_path',r.new_archive_path) order by r.corrected_at desc,r.id desc)
    from qa.photo_revisions r where r.job_id=p_job_id and (p_photo_id is null or r.photo_id=p_photo_id)),'[]'::jsonb);
end $$;
revoke all on function qa.photo_correction_history(text,bigint) from public,anon;
grant execute on function qa.photo_correction_history(text,bigint) to authenticated;
