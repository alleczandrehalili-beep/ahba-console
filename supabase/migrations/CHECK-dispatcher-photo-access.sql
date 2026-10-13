-- CHECK-dispatcher-photo-access.sql — READ-ONLY. Who will be able to "Replace this photo" and open "History" once qa-07d is live (console 2026-10-13.11)
-- (the Access Control entry "QA Photo Fix" = page key 'photofix': Edit replaces, View opens history — granted per user by the
-- superadmin in Access Control), and whether the server's identity checks will let them through:
--   qa.photo_actor_authority requires (1) a public.user_orgs row with an org for the user, (2) exactly ONE dashboard_users row
--   with that email inside that org, (3) 'photofix' in allowed_pages (+ edit_pages to replace) (superadmins pass). Rows that say
--   NO-ORG / AMBIGUOUS need an Access Control / org fix BEFORE the rollout; nothing here changes data. Usernames only, no emails.
select d.username,
       coalesce(d.is_super, false) as super,
       (coalesce(d.allowed_pages,'[]'::jsonb) @> '["photofix"]' and coalesce(d.edit_pages,'[]'::jsonb) @> '["photofix"]') as can_replace,   -- "QA Photo Fix" = Edit
       (coalesce(d.allowed_pages,'[]'::jsonb) @> '["photofix"]') as can_history,                                                             -- "QA Photo Fix" = View or Edit
       coalesce(d.allowed_pages,'[]'::jsonb) as allowed_pages, coalesce(d.edit_pages,'[]'::jsonb) as edit_pages,
       case when u.user_id is null then 'NO-ORG (user_orgs row missing)' when u.org_id is null then 'NO-ORG (org_id null)' else o.code end as org,
       case when (select count(*) from public.dashboard_users x where lower(x.email) = lower(d.email) and x.org_id = u.org_id) = 1 then 'ok' else 'AMBIGUOUS / org mismatch' end as identity
  from public.dashboard_users d
  left join auth.users au on lower(au.email) = lower(d.email)
  left join public.user_orgs u on u.user_id = au.id
  left join public.orgs o on o.id = u.org_id
 where coalesce(d.is_super, false) or coalesce(d.allowed_pages,'[]'::jsonb) @> '["photofix"]' or coalesce(d.allowed_pages,'[]'::jsonb) @> '["dispatch"]' or coalesce(d.edit_pages,'[]'::jsonb) @> '["completed"]'
 order by can_replace desc, d.username;
