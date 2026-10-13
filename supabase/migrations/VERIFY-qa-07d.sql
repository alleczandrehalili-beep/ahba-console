-- VERIFY-qa-07d.sql — read-only. After qa-07d every row should say OK. One chunk; reads catalogs only.
select 'qa-07d: authority gated by the "QA Photo Fix" entry (photofix)' as check_,
       case when pg_get_functiondef('qa.photo_actor_authority(uuid,text,text)'::regprocedure) like '%photofix%' then 'OK' else 'FAIL' end as result
union all select 'qa-07d: GC-only gate (qa.settings photo_correction_orgs, default AHBA)',
       case when pg_get_functiondef('qa.photo_actor_authority(uuid,text,text)'::regprocedure) like '%photo_correction_orgs%' then 'OK' else 'FAIL' end
union all select 'qa-07d: history needs photofix View', case when pg_get_functiondef('qa.photo_correction_history(text,bigint)'::regprocedure) like '%''photofix''%' then 'OK' else 'FAIL' end
union all select 'qa-07d: QA validation unchanged (completed)', case when pg_get_functiondef('qa.validate_photo_evidence(text,jsonb)'::regprocedure) like '%''completed''%' then 'OK' else 'FAIL' end
union all select 'qa-07d: grants unchanged (history callable by authenticated; authority not)',
       case when has_function_privilege('authenticated','qa.photo_correction_history(text,bigint)','execute') and not has_function_privilege('authenticated','qa.photo_actor_authority(uuid,text,text)','execute') then 'OK' else 'FAIL' end
union all select 'INFO enabled orgs (absent = AHBA)', coalesce((select value from qa.settings where key='photo_correction_orgs'),'(absent → AHBA)')
union all select 'INFO users with "QA Photo Fix" Edit', (select count(*)::text from public.dashboard_users where coalesce(edit_pages,'[]'::jsonb) @> '["photofix"]')
union all select 'INFO users with "QA Photo Fix" View only', (select count(*)::text from public.dashboard_users where coalesce(allowed_pages,'[]'::jsonb) @> '["photofix"]' and not coalesce(edit_pages,'[]'::jsonb) @> '["photofix"]');
