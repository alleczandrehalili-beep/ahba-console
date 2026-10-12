-- Owner-confirmed official team names: SLI017 -> SLR004, SLI018 -> SLR005.
-- Identity display metadata only. Existing accounts, UUIDs, team membership and stock stay intact.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
create table if not exists qa.team_name_changes (
  change_key text not null,
  user_id uuid not null,
  old_display_name text,
  new_display_name text not null,
  changed_at timestamptz not null default now(),
  primary key(change_key,user_id)
);
alter table qa.team_name_changes enable row level security;
revoke all on qa.team_name_changes from public,anon,authenticated;
do $migration$
declare
  r record;
  v_before jsonb;
  v_after jsonb;
  v_count integer;
begin
  -- Only rename the matching authenticated SLR accounts already in the official WIMS teams.
  -- Verify both bindings; a changed account/team mapping must abort the complete transaction.
  select count(*) into v_count from wims.profiles p
    join wims.teams t on t.id=p.team_id join auth.users a on a.id=p.user_id
    join (values ('AHBA_SLI017','AHBA_SLR004'),('AHBA_SLI018','AHBA_SLR005')) m(old_name,new_name)
      on t.code=m.new_name and upper(split_part(a.email,'@',1))=m.new_name
    where upper(coalesce(p.display_name,'')) in (m.old_name,m.new_name)
      and upper(coalesce(p.username,''))=m.new_name;
  if v_count<>2 then raise exception 'Official SLR bindings changed; no names were updated'; end if;
  for r in select p.user_id,p.display_name,m.new_name from wims.profiles p
    join wims.teams t on t.id=p.team_id join auth.users a on a.id=p.user_id
    join (values ('AHBA_SLI017','AHBA_SLR004'),('AHBA_SLI018','AHBA_SLR005')) m(old_name,new_name)
      on t.code=m.new_name and upper(split_part(a.email,'@',1))=m.new_name
    where upper(coalesce(p.display_name,''))=m.old_name
      and upper(coalesce(p.username,''))=m.new_name
  loop
    select to_jsonb(p) into v_before from wims.profiles p where p.user_id=r.user_id for update;
    insert into qa.team_name_changes(change_key,user_id,old_display_name,new_display_name)
      values('official-slr-2026-10-13',r.user_id,r.display_name,r.new_name) on conflict do nothing;
    update wims.profiles set display_name=r.new_name where user_id=r.user_id and display_name=r.display_name;
    select to_jsonb(p) into v_after from wims.profiles p where p.user_id=r.user_id;
    if (v_before-'display_name') is distinct from (v_after-'display_name')
       or v_after->>'display_name' is distinct from r.new_name then
      raise exception 'SLR rename changed fields beyond the display name';
    end if;
  end loop;
end $migration$;
commit;
