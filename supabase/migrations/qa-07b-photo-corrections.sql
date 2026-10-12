set lock_timeout='2s';
set statement_timeout='120s';
-- Uses the deployed legacy QA return lifecycle; qa-06 is not required.
-- Apply before exposing qa-replace-photo. No WIMS tables or RPCs are changed.
-- Intentional stale-evidence/business conflicts use PT409 (HTTP 409), never the
-- engine's retryable serialization_failure code 40001; older PostgREST retries it.
begin;

create table if not exists qa.photo_correction_operations (
  operation_id uuid primary key,
  job_id text not null,
  photo_id bigint not null,
  actor_id uuid not null,
  actor_label text not null,
  actor_org_id uuid not null,
  org_id uuid not null,
  expected_path text not null,
  expected_returned_at timestamptz,
  reason text not null check (length(btrim(reason)) between 1 and 2000),
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp')),
  file_size bigint not null check (file_size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  original_archive_path text not null unique,
  replacement_archive_path text not null unique,
  replacement_path text not null unique,
  created_at timestamptz not null default clock_timestamp(),
  committed_at timestamptz,
  result jsonb,
  check ((committed_at is null) = (result is null))
);
create table if not exists qa.photo_revisions (
  id bigint generated always as identity primary key,
  operation_id uuid not null unique references qa.photo_correction_operations(operation_id),
  job_id text not null,
  photo_id bigint not null,
  org_id uuid not null,
  actor_id uuid not null,
  actor_label text not null,
  actor_org_id uuid not null,
  reason text not null,
  corrected_at timestamptz not null,
  old_path text not null,
  new_path text not null,
  old_archive_path text not null,
  new_archive_path text not null,
  old_photo jsonb not null,
  new_photo jsonb not null,
  old_validation jsonb not null,
  expected_returned_at timestamptz,
  new_returned_at timestamptz,
  sha256 text not null
);
create index if not exists photo_revisions_job_idx on qa.photo_revisions(job_id,corrected_at desc,id desc);
-- Only the service-only commit function's owner can create this short-lived context.
-- Caller-settable PostgreSQL configuration flags cannot authorize photo row mutations.
create table if not exists qa.photo_correction_context (
  backend_pid integer not null,
  transaction_id bigint not null,
  operation_id uuid not null references qa.photo_correction_operations(operation_id),
  primary key(backend_pid,transaction_id)
);
alter table qa.photo_correction_operations enable row level security;
alter table qa.photo_revisions enable row level security;
alter table qa.photo_correction_context enable row level security;
revoke all on qa.photo_correction_operations,qa.photo_revisions from public,anon,authenticated;
revoke all on qa.photo_correction_context from public,anon,authenticated,service_role;
revoke all on sequence qa.photo_revisions_id_seq from public,anon,authenticated;

create or replace function qa.photo_revision_immutable() returns trigger
language plpgsql security definer set search_path = qa, public, pg_temp as $$
begin raise exception using errcode='42501',message='PHOTO_HISTORY_IMMUTABLE: photo revisions cannot be changed or deleted'; end $$;
drop trigger if exists trg_photo_revision_immutable on qa.photo_revisions;
create trigger trg_photo_revision_immutable before update or delete on qa.photo_revisions for each row execute function qa.photo_revision_immutable();
revoke all on function qa.photo_revision_immutable() from public,anon,authenticated;

create or replace function qa.corrected_photo_row_guard() returns trigger
language plpgsql security definer set search_path = qa, public, pg_temp as $$
declare o qa.photo_correction_operations; v_corrected boolean;
begin
  v_corrected := old.path like 'qa-corrections/%' or exists(select 1 from qa.photo_revisions where photo_id=old.id);
  if tg_op='DELETE' then
    -- A deliberate parent DELETE/cascade remains possible; archives and revisions persist.
    if not v_corrected or not exists(select 1 from public.jobs where id=old.job_id) then return old; end if;
    raise exception using errcode='42501',message='PHOTO_CORRECTED_EVIDENCE_PROTECTED: corrected evidence cannot be deleted from a live job';
  end if;
  if not v_corrected and new.path not like 'qa-corrections/%' then return new; end if;
  select x.* into o from qa.photo_correction_context c join qa.photo_correction_operations x on x.operation_id=c.operation_id
    where c.backend_pid=pg_backend_pid() and c.transaction_id=txid_current();
  if o.operation_id is null or o.committed_at is not null or o.photo_id is distinct from old.id or o.job_id is distinct from old.job_id
     or o.expected_path is distinct from old.path or o.replacement_path is distinct from new.path
     or (to_jsonb(new)-array['path','created_at']) is distinct from (to_jsonb(old)-array['path','created_at']) then
    raise exception using errcode='42501',message='PHOTO_CORRECTED_EVIDENCE_PROTECTED: use the authorized selected-photo correction service';
  end if;
  return new;
end $$;
drop trigger if exists trg_corrected_photo_row_guard on public.job_photos;
create trigger trg_corrected_photo_row_guard before update or delete on public.job_photos for each row execute function qa.corrected_photo_row_guard();
revoke all on function qa.corrected_photo_row_guard() from public,anon,authenticated,service_role;

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

create or replace function qa.prepare_photo_correction(
  p_job_id text,p_photo_id bigint,p_expected_path text,p_expected_returned_at timestamptz,
  p_reason text,p_operation_id uuid,p_content_type text,p_size bigint,p_sha256 text
) returns jsonb language plpgsql volatile security definer set search_path = qa, public, pg_temp as $$
declare j public.jobs; p public.job_photos; o qa.photo_correction_operations; v_actor jsonb; v_reason text := regexp_replace(coalesce(p_reason,''),'^[[:space:]]+|[[:space:]]+$','','g'); v_prefix text; v_ext text;
begin
  if p_operation_id is null or p_photo_id is null or p_expected_path is null or v_reason='' or length(v_reason)>2000 then
    raise exception using errcode='22023',message='REASON_REQUIRED: exact photo and correction reason required';
  end if;
  if p_content_type is null or p_content_type not in ('image/jpeg','image/png','image/webp') or p_size is null or p_size not between 1 and 10485760 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='INVALID_PHOTO: verified JPEG PNG or WebP up to 10 MB required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('qa-photo:'||p_operation_id::text,0));
  select * into j from public.jobs where id=p_job_id and deleted_at is null for update;
  v_actor := qa.photo_actor_authority(auth.uid(),p_job_id,'dispatch');
  select * into o from qa.photo_correction_operations where operation_id=p_operation_id for update;
  if o.operation_id is not null then
    if o.actor_id is distinct from auth.uid() or o.job_id is distinct from p_job_id or o.photo_id is distinct from p_photo_id
       or o.expected_path is distinct from p_expected_path or o.expected_returned_at is distinct from p_expected_returned_at
       or o.reason is distinct from v_reason or o.content_type is distinct from p_content_type or o.file_size is distinct from p_size or o.sha256 is distinct from p_sha256 then
      raise exception using errcode='PT409',message='CORRECTION_OPERATION_MISMATCH: operation id already belongs to different correction evidence';
    end if;
    if o.committed_at is not null then return jsonb_build_object('operation_id',o.operation_id,'status','committed','result',o.result); end if;
  end if;
  select * into p from public.job_photos where id=p_photo_id and job_id=p_job_id for update;
  if p.id is null or (p.org_id is not null and p.org_id is distinct from j.org_id and p.org_id is distinct from j.assigned_org_id) then
    raise exception using errcode='22023',message='PHOTO_JOB_MISMATCH: selected photo must belong to this job and its organization';
  end if;
  if p.path is distinct from p_expected_path then raise exception using errcode='PT409',message='PHOTO_PATH_MISMATCH: photo changed since this gallery was opened'; end if;
  if j.qa_returned_at is distinct from p_expected_returned_at then raise exception using errcode='PT409',message='RETURN_TOKEN_MISMATCH: QA return changed; refresh the gallery'; end if;
  if o.operation_id is null then
    v_ext := case p_content_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end;
    v_prefix := j.org_id::text||'/'||p_operation_id::text;
    insert into qa.photo_correction_operations(operation_id,job_id,photo_id,actor_id,actor_label,actor_org_id,org_id,expected_path,expected_returned_at,reason,content_type,file_size,sha256,original_archive_path,replacement_archive_path,replacement_path)
    values(p_operation_id,p_job_id,p_photo_id,auth.uid(),v_actor->>'actor_label',(v_actor->>'actor_org_id')::uuid,j.org_id,p.path,p_expected_returned_at,v_reason,p_content_type,p_size,p_sha256,v_prefix||'/original',v_prefix||'/replacement.'||v_ext,'qa-corrections/'||v_prefix||'/replacement.'||v_ext)
    returning * into o;
  end if;
  return jsonb_build_object('operation_id',o.operation_id,'status','pending','old_path',o.expected_path,'original_archive_path',o.original_archive_path,'replacement_archive_path',o.replacement_archive_path,'replacement_path',o.replacement_path);
end $$;
revoke all on function qa.prepare_photo_correction(text,bigint,text,timestamptz,text,uuid,text,bigint,text) from public,anon;
grant execute on function qa.prepare_photo_correction(text,bigint,text,timestamptz,text,uuid,text,bigint,text) to authenticated;

create or replace function qa.commit_photo_correction(p_operation_id uuid,p_actor_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = qa, public, pg_temp as $$
declare o qa.photo_correction_operations; j public.jobs; p public.job_photos; v_old jsonb; v_old_validation jsonb; v_actor jsonb;
  v_time timestamptz; v_job_before jsonb; v_revision_id bigint; v_result jsonb; v_return_flag text := coalesce(current_setting('qa.return_rpc',true),'');
begin
  perform pg_advisory_xact_lock(hashtextextended('qa-photo:'||p_operation_id::text,0));
  -- Same job/photo/operation lock ordering as prepare, including multiple concurrent operations.
  select * into o from qa.photo_correction_operations where operation_id=p_operation_id;
  if o.operation_id is null then raise exception using errcode='22023',message='CORRECTION_NOT_PLANNED: prepare this operation first'; end if;
  select * into j from public.jobs where id=o.job_id and deleted_at is null for update;
  v_actor := qa.photo_actor_authority(p_actor_id,o.job_id,'dispatch');
  if o.actor_id is distinct from p_actor_id or o.actor_org_id is distinct from (v_actor->>'actor_org_id')::uuid then
    raise exception using errcode='42501',message='DISPATCH_ACTOR_MISMATCH: verified actor must own the prepared operation';
  end if;
  select * into o from qa.photo_correction_operations where operation_id=p_operation_id for update;
  if o.committed_at is not null then return o.result; end if;
  select * into p from public.job_photos where id=o.photo_id and job_id=o.job_id for update;
  if p.id is null or (p.org_id is not null and p.org_id is distinct from j.org_id and p.org_id is distinct from j.assigned_org_id) then raise exception using errcode='22023',message='PHOTO_JOB_MISMATCH: selected photo no longer belongs to this job'; end if;
  if p.path is distinct from o.expected_path then raise exception using errcode='PT409',message='PHOTO_PATH_MISMATCH: selected photo changed before commit'; end if;
  if j.qa_returned_at is distinct from o.expected_returned_at then raise exception using errcode='PT409',message='RETURN_TOKEN_MISMATCH: current QA return changed before commit'; end if;
  if not exists(select 1 from storage.objects where bucket_id='qa-photo-history' and name=o.original_archive_path and coalesce((metadata->>'size')::bigint,0)>0)
     or not exists(select 1 from storage.objects where bucket_id='qa-photo-history' and name=o.replacement_archive_path and (metadata->>'size')::bigint=o.file_size and metadata->>'mimetype'=o.content_type)
     or not exists(select 1 from storage.objects where bucket_id='job-photos' and name=o.replacement_path and (metadata->>'size')::bigint=o.file_size and metadata->>'mimetype'=o.content_type) then
    raise exception using errcode='22023',message='ARCHIVE_NOT_READY: protected original and both replacement objects must exist before commit';
  end if;
  v_time := clock_timestamp();
  v_old := to_jsonb(p);
  v_old_validation := jsonb_build_object('validated',j.validated,'validated_at',j.validated_at,'validated_by',j.validated_by);
  v_job_before := to_jsonb(j)-array['validated','validated_at','validated_by','updated_at','history'];
  insert into qa.photo_correction_context(backend_pid,transaction_id,operation_id) values(pg_backend_pid(),txid_current(),o.operation_id);
  update public.job_photos set path=o.replacement_path,created_at=v_time where id=o.photo_id returning * into p;
  delete from qa.photo_correction_context where backend_pid=pg_backend_pid() and transaction_id=txid_current() and operation_id=o.operation_id;
  -- Do not mention status in UPDATE: the deployed legacy completion trigger closes returns.
  -- Correcting one image resets validation only; all return and business fields stay unchanged.
  update public.jobs set validated=false,validated_at=null,validated_by=null,updated_at=v_time,
    history=btrim(coalesce(history,'')||E'\n['||to_char(v_time at time zone 'Asia/Manila','YYYY-MM-DD HH24:MI:SS')||'] Photo #'||o.photo_id::text||' corrected by '||o.actor_label||' — '||o.reason||'; QA validation reset',E' \n\r\t')
    where id=o.job_id returning * into j;
  if (to_jsonb(j)-array['validated','validated_at','validated_by','updated_at','history']) is distinct from v_job_before then
    raise exception using errcode='PT409',message='PHOTO_BUSINESS_STATE_CHANGED: existing job trigger changed business state; correction rolled back';
  end if;
  insert into qa.photo_revisions(operation_id,job_id,photo_id,org_id,actor_id,actor_label,actor_org_id,reason,corrected_at,old_path,new_path,old_archive_path,new_archive_path,old_photo,new_photo,old_validation,expected_returned_at,new_returned_at,sha256)
    values(o.operation_id,o.job_id,o.photo_id,o.org_id,o.actor_id,o.actor_label,o.actor_org_id,o.reason,v_time,o.expected_path,o.replacement_path,o.original_archive_path,o.replacement_archive_path,v_old,to_jsonb(p),v_old_validation,o.expected_returned_at,j.qa_returned_at,o.sha256)
    returning id into v_revision_id;
  v_result := jsonb_build_object('operation_id',o.operation_id,'revision_id',v_revision_id,'photo_id',o.photo_id::text,'path',p.path,'returned_at',j.qa_returned_at,'validated',j.validated,'job',to_jsonb(j));
  update qa.photo_correction_operations set committed_at=v_time,result=v_result where operation_id=o.operation_id;
  return v_result;
exception when others then
  delete from qa.photo_correction_context where backend_pid=pg_backend_pid() and transaction_id=txid_current() and operation_id=p_operation_id;
  perform set_config('qa.return_rpc',v_return_flag,true);
  raise;
end $$;
revoke all on function qa.commit_photo_correction(uuid,uuid) from public,anon,authenticated;
grant execute on function qa.commit_photo_correction(uuid,uuid) to service_role;

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

-- Older browser versions can still PATCH ordinary jobs. Once a correction has replaced
-- evidence, validation must go through the exact-gallery comparison RPC below.
create or replace function qa.jobs_corrected_evidence_validation_guard() returns trigger
language plpgsql security definer set search_path = qa, public, pg_temp as $$
begin
  if new.validated is true and (old.validated is distinct from new.validated or old.validated_at is distinct from new.validated_at or old.validated_by is distinct from new.validated_by)
     and exists(select 1 from qa.photo_revisions where job_id=new.id)
     and coalesce(current_setting('qa.photo_validation_rpc',true),'')<>'1' then
    raise exception using errcode='42501',message='PHOTO_EVIDENCE_REFRESH_REQUIRED: corrected evidence must be validated from the current gallery';
  end if;
  return new;
end $$;
drop trigger if exists trg_jobs_corrected_evidence_validation on public.jobs;
create trigger trg_jobs_corrected_evidence_validation before update on public.jobs for each row execute function qa.jobs_corrected_evidence_validation_guard();
revoke all on function qa.jobs_corrected_evidence_validation_guard() from public,anon,authenticated;

create or replace function qa.validate_photo_evidence(p_job_id text,p_expected_photos jsonb) returns public.jobs
language plpgsql volatile security definer set search_path = qa, public, pg_temp as $$
declare j public.jobs; v_actor jsonb; v_actual jsonb; v_expected jsonb; v_time timestamptz := clock_timestamp(); v_flag text := coalesce(current_setting('qa.photo_validation_rpc',true),'');
begin
  select * into j from public.jobs where id=p_job_id and deleted_at is null for update;
  v_actor := qa.photo_actor_authority(auth.uid(),p_job_id,'completed');
  if j.status is distinct from 'completed' then raise exception using errcode='22023',message='PHOTO_JOB_NOT_COMPLETED: completed job required for QA validation'; end if;
  if p_expected_photos is null or jsonb_typeof(p_expected_photos)<>'array' then raise exception using errcode='22023',message='PHOTO_GALLERY_REQUIRED: current evidence gallery required'; end if;
  if jsonb_array_length(p_expected_photos)=0 and exists(select 1 from qa.photo_revisions where job_id=p_job_id) then
    raise exception using errcode='22023',message='PHOTO_GALLERY_REQUIRED: corrected evidence requires its current gallery';
  end if;
  -- Serialize with prepare/commit by locking the job first and its selected photos second.
  perform 1 from public.job_photos where job_id=p_job_id order by id for share;
  select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'path',path) order by id),'[]'::jsonb) into v_actual from public.job_photos where job_id=p_job_id;
  begin
    select coalesce(jsonb_agg(jsonb_build_object('id',(value->>'id')::bigint::text,'path',value->>'path') order by (value->>'id')::bigint),'[]'::jsonb) into v_expected from jsonb_array_elements(p_expected_photos);
  exception when invalid_text_representation or numeric_value_out_of_range then raise exception using errcode='22023',message='INVALID_PHOTO_GALLERY: invalid photo identifier'; end;
  if v_actual is distinct from v_expected then raise exception using errcode='PT409',message='PHOTO_EVIDENCE_CHANGED: evidence changed since gallery opened; refresh before validating'; end if;
  if j.qa_returned_at is not null and j.qa_return_resolved_at is null then
    raise exception using errcode='PT409',message='PHOTO_RETURN_OPEN: finish the existing return review before QA validation';
  end if;
  perform set_config('qa.photo_validation_rpc','1',true);
  update public.jobs set validated=true,validated_at=v_time,validated_by=v_actor->>'actor_label',updated_at=v_time where id=p_job_id returning * into j;
  perform set_config('qa.photo_validation_rpc',v_flag,true);
  return j;
exception when others then perform set_config('qa.photo_validation_rpc',v_flag,true); raise;
end $$;
revoke all on function qa.validate_photo_evidence(text,jsonb) from public,anon;
grant execute on function qa.validate_photo_evidence(text,jsonb) to authenticated;

-- Restrictive policies remain effective even if older deployments have permissive
-- bucket-wide authenticated policies. Only service-role transport can touch archives.
insert into storage.buckets(id,name,public) values('qa-photo-history','qa-photo-history',false)
on conflict(id) do update set public=false;
-- Storage is a Supabase-managed table. Verify existing RLS; do not ALTER its ownership/settings.
do $$ begin
  if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) then
    raise exception 'PHOTO_STORAGE_RLS_REQUIRED: Storage row security must already be enabled';
  end if;
end $$;
drop policy if exists qa_photo_history_private on storage.objects;
create policy qa_photo_history_private on storage.objects as restrictive for all to anon,authenticated
  using(bucket_id<>'qa-photo-history') with check(bucket_id<>'qa-photo-history');
drop policy if exists qa_photo_active_server_insert on storage.objects;
create policy qa_photo_active_server_insert on storage.objects as restrictive for insert to anon,authenticated
  with check(bucket_id<>'job-photos' or name not like 'qa-corrections/%');
drop policy if exists qa_photo_active_server_update on storage.objects;
create policy qa_photo_active_server_update on storage.objects as restrictive for update to anon,authenticated
  using(bucket_id<>'job-photos' or name not like 'qa-corrections/%') with check(bucket_id<>'job-photos' or name not like 'qa-corrections/%');
drop policy if exists qa_photo_active_server_delete on storage.objects;
create policy qa_photo_active_server_delete on storage.objects as restrictive for delete to anon,authenticated
  using(bucket_id<>'job-photos' or name not like 'qa-corrections/%');

notify pgrst,'reload schema';
commit;
