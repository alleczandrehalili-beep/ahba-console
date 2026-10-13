-- Disposable rehearsal only. Run on the deployed legacy WIMS schema and qa-07a.
-- Every seed and permission change rolls back. No live invocation is needed.
begin;
do $$ begin
  if to_regprocedure('qa.validation_wims_export(text[])') is null then
    raise exception 'TEST FAIL: authorized WIMS export endpoint is missing';
  end if;
end $$;

insert into public.orgs(id,code) values
  ('70000000-0000-0000-0000-000000000001','WIMS-TEST-A'),
  ('70000000-0000-0000-0000-000000000002','WIMS-TEST-B') on conflict(id) do nothing;
insert into auth.users(id,email) values
  ('70000000-0000-0000-0000-000000000011','wims-export-a@example.test'),
  ('70000000-0000-0000-0000-000000000012','wims-export-b@example.test'),
  ('70000000-0000-0000-0000-000000000013','wims-export-denied@example.test') on conflict(id) do nothing;
insert into public.user_orgs(user_id,org_id,is_platform_admin,gc_all_loads) values
  ('70000000-0000-0000-0000-000000000011','70000000-0000-0000-0000-000000000001',false,false),
  ('70000000-0000-0000-0000-000000000012','70000000-0000-0000-0000-000000000002',false,false),
  ('70000000-0000-0000-0000-000000000013','70000000-0000-0000-0000-000000000001',false,false) on conflict(user_id) do nothing;
insert into public.dashboard_users(username,email,org_id,allowed_pages,is_super) values
  ('WIMS-EXPORT-A','wims-export-a@example.test','70000000-0000-0000-0000-000000000001','["completed"]',false),
  ('WIMS-EXPORT-B','wims-export-b@example.test','70000000-0000-0000-0000-000000000002','["qaaudit"]',false),
  ('WIMS-EXPORT-DENIED','wims-export-denied@example.test','70000000-0000-0000-0000-000000000001','["overview"]',false);
insert into public.jobs(id,org_id,status,job_order_no,ibass_acct_no,team) values
  ('WIMS-EXPORT-JOB-A','70000000-0000-0000-0000-000000000001','completed','WIMS-SHARED-ALIAS','ACCT-A','CURRENT CREW'),
  ('WIMS-EXPORT-JOB-B','70000000-0000-0000-0000-000000000002','completed','WIMS-OTHER-ALIAS','ACCT-B','OTHER CREW'),
  ('WIMS-EXPORT-UNOWNED',null,'completed','WIMS-UNOWNED-ALIAS','ACCT-X','UNKNOWN CREW');
insert into wims.teams(id,code,category) values ('70000000-0000-0000-0000-000000000021','ORIGINAL CREW','subcon');
insert into wims.profiles(user_id,team_id,display_name,role) values
  ('70000000-0000-0000-0000-000000000011','70000000-0000-0000-0000-000000000021','Original declarer','technician');
insert into public.jobs(id,org_id,status,job_order_no,ibass_acct_no,deleted_at) values
 ('LEGACY-REUSED-1','70000000-0000-0000-0000-000000000001','completed','REUSED','SAME-ACCT','2026-10-01'),
 ('LEGACY-REUSED-2','70000000-0000-0000-0000-000000000001','completed','REUSED','SAME-ACCT',null);
insert into wims.installs(id,jo_number,account_no,team_id,tech_user,status,completed_at,kit_used,materials_used) values
 ('70000000-0000-0000-0000-000000000031','WIMS-SHARED-ALIAS','ACCT-A','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000011','completed','2026-10-12','{"conn":2}','{"foc":321}'),
 ('70000000-0000-0000-0000-000000000032','WIMS-SHARED-ALIAS','WRONG-ACCT','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000011','completed','2026-10-11','{}','{"foc":999}'),
 ('70000000-0000-0000-0000-000000000033','REUSED','SAME-ACCT','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000011','completed','2026-10-10','{}','{"foc":888}');
insert into wims.cpe(id,serial,category,model,status,owner_team_id,install_id) values
 ('70000000-0000-0000-0000-000000000041','MODEM-TEST','modem','Test','installed','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000031'),
 ('70000000-0000-0000-0000-000000000042','IPTV-TEST-1','iptv','Test','installed','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000031'),
 ('70000000-0000-0000-0000-000000000043','IPTV-TEST-2','iptv','Test','installed','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000031');
insert into wims.pulled_cpe(serial,jo_number,team_id,install_id,note) values ('PULLED-TEST','WIMS-SHARED-ALIAS','70000000-0000-0000-0000-000000000021','70000000-0000-0000-0000-000000000031','Retained note');
create temporary table wims_export_before as
select (select jsonb_agg(to_jsonb(x) order by x.id) from wims.installs x) as installs,
       (select jsonb_agg(to_jsonb(x) order by x.id) from wims.cpe x) as cpe,
       (select jsonb_agg(to_jsonb(x) order by x.id) from wims.materials x) as materials,
       (select jsonb_agg(to_jsonb(x) order by x.id) from wims.material_stock x) as material_stock,
       (select jsonb_agg(to_jsonb(x) order by x.id) from wims.material_movements x) as material_movements,
       (select jsonb_agg(to_jsonb(x) order by x.id) from wims.movements x) as movements;
select set_config('request.jwt.claims','{"sub":"70000000-0000-0000-0000-000000000011","email":"wims-export-a@example.test","role":"authenticated"}',true);
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$ declare r record; begin
 select * into strict r from qa.validation_wims_export(array['WIMS-EXPORT-JOB-A']);
 if jsonb_array_length(r.receipts)<>1 or r.receipts->0->>'job_id'<>'WIMS-EXPORT-JOB-A' or r.receipts->0->>'identity_source'<>'unique-jo-account' then raise exception 'TEST FAIL: unique legacy receipt mapping'; end if;
 if r.receipts->0->>'declared_by'<>'Original declarer' or r.receipts->0->>'team_code'<>'ORIGINAL CREW' then raise exception 'TEST FAIL: immutable filed identity'; end if;
 if jsonb_array_length(r.receipts->0->'cpe')<>3 or r.receipts->0->'pulled'->0->>'note'<>'Retained note' or r.receipts->0->'materials_used'<>'{"foc":321}'::jsonb then raise exception 'TEST FAIL: serials usage pulled evidence'; end if;
 if r.unconfirmed::text like '%999%' or r.unconfirmed::text like '%WRONG-ACCT%' or jsonb_array_length(r.unconfirmed)=0 then raise exception 'TEST FAIL: unknown customer payload leaked or hidden'; end if;
 select * into strict r from qa.validation_wims_export(array['LEGACY-REUSED-2']);
 if r.receipts<>'[]'::jsonb or jsonb_array_length(r.unconfirmed)=0 then raise exception 'TEST FAIL: deleted generation ambiguity guessed'; end if;
 begin perform * from qa.validation_wims_export(array['WIMS-EXPORT-JOB-A','WIMS-EXPORT-JOB-B']); raise exception 'TEST FAIL: cross org'; exception when insufficient_privilege then null; end;
 begin perform * from qa.validation_wims_export(array['NOT-A-CANONICAL-JOB']); raise exception 'TEST FAIL: missing canonical job'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- The qaaudit read page also permits its own organization's jobs with no declarations.
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000012',true);
set local role authenticated;
do $$ declare r record; begin
  select * into strict r from qa.validation_wims_export(array['WIMS-EXPORT-JOB-B']);
  if r.job_id <> 'WIMS-EXPORT-JOB-B' or r.receipts <> '[]'::jsonb then raise exception 'TEST FAIL: same-org qaaudit reader rejected or false receipts assigned'; end if;
end $$;
reset role;

-- Forging a claim does not override the membership stored for auth.uid().
select set_config('request.jwt.claims','{"sub":"70000000-0000-0000-0000-000000000011","email":"wims-export-b@example.test","role":"authenticated","app_metadata":{"org_id":"70000000-0000-0000-0000-000000000002","is_platform_admin":true}}',true);
select set_config('request.jwt.claim.email','wims-export-b@example.test',true);
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$ begin
  begin
    perform * from qa.validation_wims_export(array['WIMS-EXPORT-JOB-B']);
    raise exception 'TEST FAIL: user-settable claims escalated export privileges';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- A console super flag grants pages, but is not an organization membership override.
update public.dashboard_users set is_super=true where username='WIMS-EXPORT-A';
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$ begin
  begin
    perform * from qa.validation_wims_export(array['WIMS-EXPORT-JOB-B']);
    raise exception 'TEST FAIL: dashboard super flag bypassed database organization scope';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.dashboard_users set is_super=false where username='WIMS-EXPORT-A';

select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000013',true);
set local role authenticated;
do $$ begin
  begin
    perform * from qa.validation_wims_export(array['WIMS-EXPORT-JOB-A']);
    raise exception 'TEST FAIL: missing completed/qaaudit read permission accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Existing database-authorized all-loads membership permits cross-org read.
update public.user_orgs set gc_all_loads=true where user_id='70000000-0000-0000-0000-000000000011';
select set_config('request.jwt.claim.sub','70000000-0000-0000-0000-000000000011',true);
set local role authenticated;
do $$ declare n integer; begin
  select count(*) into n from qa.validation_wims_export(array['WIMS-EXPORT-JOB-A','WIMS-EXPORT-JOB-B']);
  if n <> 2 then raise exception 'TEST FAIL: database-authorized cross-org export incomplete'; end if;
end $$;
reset role;

do $$ declare b record; begin
  select * into b from wims_export_before;
  if b.installs is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.installs x)
     or b.cpe is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.cpe x)
     or b.materials is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.materials x)
     or b.material_stock is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.material_stock x)
     or b.material_movements is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.material_movements x)
     or b.movements is distinct from (select jsonb_agg(to_jsonb(x) order by x.id) from wims.movements x) then
    raise exception 'TEST FAIL: export mutated WIMS stock or receipts';
  end if;
  if has_function_privilege('anon','qa.validation_wims_export(text[])','execute') then raise exception 'TEST FAIL: anonymous export allowed'; end if;
end $$;
select 'PASS: unique legacy JO/account identity, deleted-generation ambiguity, original declarer, all serials, membership scope, complete authorization, dependency failure, no stock mutations' as wims_export_test;
rollback;
