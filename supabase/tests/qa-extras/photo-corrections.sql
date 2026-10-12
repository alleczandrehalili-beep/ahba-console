-- Disposable PostgreSQL integration tests. Run on legacy QA backend after qa-07b (no qa-06); all fixtures roll back.
begin;
create or replace function pg_temp.photo_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'photo correction assertion failed: %', label; end if; end $$;
select pg_temp.photo_assert(to_regprocedure('qa.prepare_photo_correction(text,bigint,text,timestamptz,text,uuid,text,bigint,text)') is not null, 'prepare RPC exists');
select pg_temp.photo_assert(to_regprocedure('qa.commit_photo_correction(uuid,uuid)') is not null, 'commit RPC exists');
select pg_temp.photo_assert(to_regprocedure('qa.validate_photo_evidence(text,jsonb)') is not null, 'validation evidence RPC exists');
select pg_temp.photo_assert(not has_function_privilege('authenticated','qa.commit_photo_correction(uuid,uuid)','EXECUTE'), 'authenticated cannot commit');
select pg_temp.photo_assert(not has_function_privilege('anon','qa.commit_photo_correction(uuid,uuid)','EXECUTE'), 'anonymous cannot commit');
select pg_temp.photo_assert(has_function_privilege('service_role','qa.commit_photo_correction(uuid,uuid)','EXECUTE'), 'service can commit');
insert into public.orgs(id,code,name) values ('71000000-0000-4000-8000-000000000001','PC1','Photo corrections A'),('71000000-0000-4000-8000-000000000002','PC2','Photo corrections B');
insert into public.orgs(id,code,name) select '71000000-0000-4000-8000-000000000003','AHBA','Photo validation GC' where not exists(select 1 from public.orgs where code='AHBA');
insert into auth.users(id,email) values ('72000000-0000-4000-8000-000000000001','photo.dispatch@example.test'),('72000000-0000-4000-8000-000000000002','photo.viewer@example.test'),('72000000-0000-4000-8000-000000000003','photo.other@example.test'),('72000000-0000-4000-8000-000000000004','photo.gc@example.test');
insert into public.user_orgs(user_id,org_id,is_platform_admin) values
('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001',false),
('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001',false),
('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002',false);
insert into public.user_orgs(user_id,org_id,is_platform_admin) select '72000000-0000-4000-8000-000000000004',id,false from public.orgs where code='AHBA';
insert into public.dashboard_users(username,email,org_id,allowed_pages,edit_pages,is_super) values
('photo-dispatch','photo.dispatch@example.test','71000000-0000-4000-8000-000000000001','["dispatch","completed"]','["dispatch","completed"]',false),
('photo-viewer','photo.viewer@example.test','71000000-0000-4000-8000-000000000001','["dispatch"]','[]',false),
('photo-other','photo.other@example.test','71000000-0000-4000-8000-000000000002','["dispatch"]','["dispatch"]',false);
insert into public.dashboard_users(username,email,org_id,allowed_pages,edit_pages,is_super) select 'photo-gc','photo.gc@example.test',id,'["dispatch","completed"]'::jsonb,'["dispatch","completed"]'::jsonb,false from public.orgs where code='AHBA';
insert into public.jobs(id,subscriber,service_type,status,team,org_id,assigned_org_id,completed_at,validated,validated_at,validated_by,payment_amount,payment_mode,ar_no,remittance_received,history) values
('PC-VALIDATED','Photo validation','SLI','completed','Photo Team','71000000-0000-4000-8000-000000000001',null,'2026-09-01T02:00:00Z',true,'2026-09-02T02:00:00Z','Old QA',500,'Cash','AR-PC',true,'Original history'),
('PC-RETURNED','Photo return','SLI','completed','Photo Team','71000000-0000-4000-8000-000000000001',null,'2026-09-01T02:00:00Z',false,null,null,500,'Cash','AR-PC',true,'Original history'),
('PC-OTHER','Photo other','SLI','completed','Photo Team','71000000-0000-4000-8000-000000000002',null,'2026-09-01T02:00:00Z',false,null,null,500,'Cash','AR-PC',true,'Original history'),
('PC-ASSIGNED','Photo assigned','SLI','completed','Photo Team','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','2026-09-01T02:00:00Z',false,null,null,500,'Cash','AR-PC',true,'Original history'),
('PC-EMPTY','Ordinary no-photo legacy job','SLI','completed',null,'71000000-0000-4000-8000-000000000001',null,'2026-09-01T02:00:00Z',false,null,null,500,'Cash','AR-PC',true,'Original history');
update public.jobs set status='in-progress',qa_returned_at='2026-10-01T01:00:00Z',qa_returned_by='Reviewer',qa_return_remarks='Replace one router image',qa_return_resolved_at=null,qa_status='FOR QA CHECK' where id='PC-RETURNED';
insert into public.job_photos(job_id,path,org_id,label) values ('PC-VALIDATED','pc/validated.jpg','71000000-0000-4000-8000-000000000001','Router'),('PC-RETURNED','pc/returned.jpg','71000000-0000-4000-8000-000000000001','Router'),('PC-OTHER','pc/other.jpg','71000000-0000-4000-8000-000000000002','Router'),('PC-ASSIGNED','pc/assigned.jpg','71000000-0000-4000-8000-000000000002','Router');
create temp table photo_before as select id,to_jsonb(j)-array['validated','validated_at','validated_by','updated_at','history'] as protected from public.jobs j where id in ('PC-VALIDATED','PC-RETURNED');
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000001","email":"photo.dispatch@example.test","role":"authenticated","org_id":"71000000-0000-4000-8000-000000000001"}',true);
select qa.validate_photo_evidence('PC-EMPTY','[]'::jsonb);
select pg_temp.photo_assert((select validated from public.jobs where id='PC-EMPTY'),'ordinary no-photo validation continuity');
update public.jobs set validated=false where id='PC-EMPTY';
update public.jobs set validated=true where id='PC-EMPTY';
select pg_temp.photo_assert((select validated from public.jobs where id='PC-EMPTY'),'ordinary older-console direct validation still allowed');
select set_config('request.jwt.claims',jsonb_build_object('sub','72000000-0000-4000-8000-000000000004','email','photo.gc@example.test','role','authenticated','app_metadata',jsonb_build_object('org_id',(select id from public.orgs where code='AHBA')))::text,true);
select qa.validate_photo_evidence('PC-OTHER',(select jsonb_agg(jsonb_build_object('id',id::text,'path',path)) from public.job_photos where job_id='PC-OTHER'));
select pg_temp.photo_assert((select validated and validated_by='photo-gc' from public.jobs where id='PC-OTHER'),'trusted GC completed editor keeps cross-organization QA validation');
do $$ begin
  begin perform qa.prepare_photo_correction('PC-OTHER',(select id from public.job_photos where job_id='PC-OTHER'),'pc/other.jpg',null,'GC viewing does not grant correction write','73000000-0000-4000-8000-000000000010','image/png',12,repeat('a',64)); raise exception 'expected GC cross-org correction denial'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000001","email":"photo.dispatch@example.test","role":"authenticated","org_id":"71000000-0000-4000-8000-000000000001"}',true);
do $$ declare pid bigint := (select id from public.job_photos where job_id='PC-VALIDATED'); v jsonb; begin
  begin perform qa.prepare_photo_correction('PC-VALIDATED',pid,'stale/path',null,'Fix','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64)); raise exception 'expected stale path failure'; exception when sqlstate 'PT409' then null; end;
  begin perform qa.prepare_photo_correction('PC-VALIDATED',pid,'pc/validated.jpg',null,' ','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64)); raise exception 'expected reason failure'; exception when sqlstate '22023' then null; end;
  begin perform qa.prepare_photo_correction('PC-VALIDATED',pid,'pc/validated.jpg',null,E'\n\t','73000000-0000-4000-8000-000000000009','image/png',12,repeat('a',64)); raise exception 'expected whitespace-only reason failure'; exception when sqlstate '22023' then null; end;
  begin perform qa.prepare_photo_correction('PC-OTHER',pid,'pc/validated.jpg',null,'Fix','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64)); raise exception 'expected cross org failure'; exception when insufficient_privilege then null; end;
  begin perform qa.prepare_photo_correction('PC-VALIDATED',(select id from public.job_photos where job_id='PC-OTHER'),'pc/other.jpg',null,'Fix','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64)); raise exception 'expected wrong photo job failure'; exception when sqlstate '22023' then null; end;
  v := qa.prepare_photo_correction('PC-VALIDATED',pid,'pc/validated.jpg',null,'Wrong original image','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64));
  perform pg_temp.photo_assert(v->>'old_path'='pc/validated.jpg','preflight derives old path from selected row');
  perform pg_temp.photo_assert((select path from public.job_photos where id=pid)='pc/validated.jpg','planning does not replace active evidence');
  perform pg_temp.photo_assert((select validated from public.jobs where id='PC-VALIDATED'),'planning leaves validation unchanged');
end $$;
-- Authorization is re-read at commit, not inherited from a successful upload plan.
update public.dashboard_users set edit_pages='[]' where username='photo-dispatch';
do $$ begin
  begin perform qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001'); raise exception 'expected revoked dispatch permission failure'; exception when insufficient_privilege then null; end;
end $$;
update public.dashboard_users set edit_pages='["dispatch","completed"]' where username='photo-dispatch';
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000002","email":"photo.viewer@example.test","role":"authenticated","org_id":"71000000-0000-4000-8000-000000000001"}',true);
do $$ begin
  begin perform qa.prepare_photo_correction('PC-VALIDATED',(select id from public.job_photos where job_id='PC-VALIDATED'),'pc/validated.jpg',null,'Fix','73000000-0000-4000-8000-000000000002','image/png',12,repeat('a',64)); raise exception 'expected view only failure'; exception when insufficient_privilege then null; end;
  begin perform qa.photo_correction_history('PC-VALIDATED',null); raise exception 'expected view only history failure'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"72000000-0000-4000-8000-000000000001","email":"photo.dispatch@example.test","role":"authenticated","org_id":"71000000-0000-4000-8000-000000000001"}',true);
do $$ begin
  begin perform qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001'); raise exception 'expected absent storage failure'; exception when sqlstate '22023' then null; end;
end $$;
-- Transport creates these objects; SQL checks names, bucket, replacement size/type before mutation.
insert into storage.objects(bucket_id,name,metadata)
select 'qa-photo-history',original_archive_path,'{"size":4,"mimetype":"image/jpeg"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000001'
union all select 'qa-photo-history',replacement_archive_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000001'
union all select 'job-photos',replacement_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000001';
do $$ declare v jsonb; pid bigint := (select id from public.job_photos where job_id='PC-VALIDATED'); begin
  begin perform qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000003'); raise exception 'expected actor failure'; exception when insufficient_privilege then null; end;
  v := qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001');
  perform pg_temp.photo_assert((select path from public.job_photos where id=pid)=v->>'path','same selected id now references new image');
  perform pg_temp.photo_assert((select not validated and validated_at is null and validated_by is null from public.jobs where id='PC-VALIDATED'),'validated job returns to Pending QA');
  perform pg_temp.photo_assert((select to_jsonb(j)-array['validated','validated_at','validated_by','updated_at','history']=b.protected from public.jobs j join photo_before b using(id) where j.id='PC-VALIDATED'),'financial completion WIMS and unrelated fields unchanged');
  perform pg_temp.photo_assert(qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001')=v,'commit replay returns exact saved result');
  perform pg_temp.photo_assert((select count(*)=1 from qa.photo_revisions where operation_id='73000000-0000-4000-8000-000000000001'),'retry produces one immutable revision');
  perform pg_temp.photo_assert((select actor_id='72000000-0000-4000-8000-000000000001' and reason='Wrong original image' and corrected_at is not null and old_path='pc/validated.jpg' from qa.photo_revisions where operation_id='73000000-0000-4000-8000-000000000001'),'actor reason time original saved');
  begin update qa.photo_revisions set reason='tampered'; raise exception 'expected immutable history failure'; exception when insufficient_privilege then null; end;
  begin delete from qa.photo_revisions; raise exception 'expected immutable delete failure'; exception when insufficient_privilege then null; end;
  begin delete from public.job_photos where id=pid; raise exception 'expected corrected evidence delete failure'; exception when insufficient_privilege then null; end;
  begin update public.job_photos set path='pc/stale-overwrite.jpg' where id=pid; raise exception 'expected corrected evidence overwrite failure'; exception when insufficient_privilege then null; end;
  update public.job_photos set label='Ordinary photo remains editable' where job_id='PC-OTHER';
  perform pg_temp.photo_assert((select label='Ordinary photo remains editable' from public.job_photos where job_id='PC-OTHER'),'ordinary technician photo mutations remain allowed');
  begin update public.jobs set validated=true,validated_by='Stale QA',validated_at=clock_timestamp() where id='PC-VALIDATED'; raise exception 'expected stale direct validation failure'; exception when insufficient_privilege then null; end;
  begin perform qa.validate_photo_evidence('PC-VALIDATED',jsonb_build_array(jsonb_build_object('id',pid::text,'path','pc/validated.jpg'))); raise exception 'expected stale validation gallery failure'; exception when sqlstate 'PT409' then null; end;
  perform qa.validate_photo_evidence('PC-VALIDATED',jsonb_build_array(jsonb_build_object('id',pid::text,'path',v->>'path')));
  perform pg_temp.photo_assert((select validated and validated_by='photo-dispatch' from public.jobs where id='PC-VALIDATED'),'current gallery validates through scoped RPC');
  perform pg_temp.photo_assert(coalesce(current_setting('qa.photo_validation_rpc',true),'')<>'1','validation bypass not left available to caller');
  perform pg_temp.photo_assert(qa.prepare_photo_correction('PC-VALIDATED',pid,'pc/validated.jpg',null,'Wrong original image','73000000-0000-4000-8000-000000000001','image/png',12,repeat('a',64))->>'status'='committed','lost-response preflight replay bypasses old path CAS');
  begin perform qa.prepare_photo_correction('PC-VALIDATED',pid,'pc/validated.jpg',null,'Wrong original image','73000000-0000-4000-8000-000000000001','image/png',12,repeat('b',64)); raise exception 'expected different-file replay failure'; exception when sqlstate 'PT409' then null; end;
end $$;
select qa.prepare_photo_correction('PC-VALIDATED',(select id from public.job_photos where job_id='PC-VALIDATED'),(select path from public.job_photos where job_id='PC-VALIDATED'),null,'Second authorized correction','73000000-0000-4000-8000-000000000005','image/png',12,repeat('c',64));
insert into storage.objects(bucket_id,name,metadata)
select 'qa-photo-history',original_archive_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000005'
union all select 'qa-photo-history',replacement_archive_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000005'
union all select 'job-photos',replacement_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000005';
select qa.commit_photo_correction('73000000-0000-4000-8000-000000000005','72000000-0000-4000-8000-000000000001');
select pg_temp.photo_assert((select count(*)=2 from qa.photo_revisions where job_id='PC-VALIDATED'),'a later authorized correction can replace the guarded selected row');
select qa.prepare_photo_correction('PC-RETURNED',(select id from public.job_photos where job_id='PC-RETURNED'),'pc/returned.jpg','2026-10-01T01:00:00Z','Dispatcher corrected returned photo','73000000-0000-4000-8000-000000000003','image/png',12,repeat('a',64));
insert into storage.objects(bucket_id,name,metadata)
select 'qa-photo-history',original_archive_path,'{"size":4,"mimetype":"image/jpeg"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000003'
union all select 'qa-photo-history',replacement_archive_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000003'
union all select 'job-photos',replacement_path,'{"size":12,"mimetype":"image/png"}'::jsonb from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000003';
do $$ declare v jsonb; begin
  v := qa.commit_photo_correction('73000000-0000-4000-8000-000000000003','72000000-0000-4000-8000-000000000001');
  perform pg_temp.photo_assert((select qa_returned_at='2026-10-01T01:00:00Z' and qa_return_resolved_at is null and qa_status='FOR QA CHECK' and status='in-progress' from public.jobs where id='PC-RETURNED'),'legacy return status and token remain unchanged and reviewer-open');
  perform pg_temp.photo_assert((select to_jsonb(j)-array['validated','validated_at','validated_by','updated_at','history']=b.protected from public.jobs j join photo_before b using(id) where j.id='PC-RETURNED'),'returned correction preserves completed_at financial fields and original return remarks');
  perform pg_temp.photo_assert(coalesce(current_setting('qa.return_rpc',true),'')<>'1','correction does not leave return-freeze bypass for caller');
  begin perform qa.validate_photo_evidence('PC-RETURNED',(select jsonb_agg(jsonb_build_object('id',id::text,'path',path)) from public.job_photos where job_id='PC-RETURNED')); raise exception 'expected open returned job validation refusal'; exception when sqlstate '22023' then null; end;
  begin perform qa.prepare_photo_correction('PC-RETURNED',(select id from public.job_photos where job_id='PC-RETURNED'),v->>'path','2026-10-01T00:00:00Z','Stale return correction','73000000-0000-4000-8000-000000000099','image/png',12,repeat('f',64)); raise exception 'expected stale return token failure'; exception when sqlstate 'PT409' then null; end;
end $$;
-- Assigned-org write scope works, while GC view-only scope does not.
select qa.prepare_photo_correction('PC-ASSIGNED',(select id from public.job_photos where job_id='PC-ASSIGNED'),'pc/assigned.jpg',null,'Assigned dispatcher correction','73000000-0000-4000-8000-000000000004','image/png',12,repeat('a',64));
select pg_temp.photo_assert((select count(*)=1 from qa.photo_correction_operations where operation_id='73000000-0000-4000-8000-000000000004'),'assigned organization may prepare exact job correction');
select pg_temp.photo_assert(jsonb_array_length(qa.photo_correction_history('PC-VALIDATED',null))=2,'authorized history lists retained revisions');
select pg_temp.photo_assert((select not public from storage.buckets where id='qa-photo-history'),'archive bucket is private');
select pg_temp.photo_assert((select count(*)=6 from storage.objects where bucket_id='qa-photo-history'),'old and new evidence stay retained');
-- Even an older permissive storage policy cannot expose or mutate the archive/managed prefix.
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
create policy photo_test_permissive on storage.objects for all to authenticated using(true) with check(true);
set local role authenticated;
select pg_temp.photo_assert((select count(*)=0 from storage.objects where bucket_id='qa-photo-history'),'authenticated cannot read private archive directly');
do $$ begin
  begin insert into storage.objects(bucket_id,name,metadata) values('qa-photo-history','attempted-overwrite','{"size":1}'); raise exception 'expected private archive insert failure'; exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name,metadata) values('job-photos','qa-corrections/attempted-overwrite','{"size":1}'); raise exception 'expected managed active insert failure'; exception when insufficient_privilege then null; end;
  begin perform qa.commit_photo_correction('73000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001'); raise exception 'expected authenticated commit execution failure'; exception when insufficient_privilege then null; end;
end $$;
delete from storage.objects where bucket_id='qa-photo-history' or (bucket_id='job-photos' and name like 'qa-corrections/%');
reset role;
select pg_temp.photo_assert((select count(*)=6 from storage.objects where bucket_id='qa-photo-history'),'stale authenticated storage deletion cannot destroy original archive');
select pg_temp.photo_assert((select count(*)=3 from storage.objects where bucket_id='job-photos' and name like 'qa-corrections/%'),'stale authenticated storage deletion cannot destroy managed replacement');
-- The completion trigger created synthetic QA audit references for this fixture.
-- Respect the production FK rather than weakening it to exercise the deliberate cascade.
delete from qa.audit_log where audit_id in(select id from qa.audits where job_id='PC-VALIDATED');
delete from qa.audits where job_id='PC-VALIDATED';
delete from public.jobs where id='PC-VALIDATED';
delete from public.job_photos where job_id='PC-VALIDATED';
select pg_temp.photo_assert((select count(*)=0 from public.job_photos where job_id='PC-VALIDATED'),'deliberate parent deletion permits corrected photo cascade');
select pg_temp.photo_assert((select count(*)=2 from qa.photo_revisions where job_id='PC-VALIDATED'),'parent deletion retains immutable photo revisions');
select pg_temp.photo_assert((select count(*)=6 from storage.objects where bucket_id='qa-photo-history'),'parent deletion retains protected original archive');
rollback;
