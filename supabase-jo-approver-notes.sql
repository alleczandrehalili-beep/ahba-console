-- =============================================================
-- GC approver remarks on APPROVED job orders — GC CONSOLE ONLY.
--
-- Purpose: give the validator/dispatcher (GC console) a private note per
-- JO so they can remember remarks on orders they approved (e.g. an encoder
-- declared something wrong). MUST NOT be visible to technicians, sales, or
-- subcontractor console users.
--
-- Hard isolation via a SEPARATE table + RLS (not a jobs column), so:
--   * mobile (technicians/sales) never fetch it — it is not in any mobile query;
--   * subcon console users literally cannot read it — RLS denies their token;
--   * only GC console users (in dashboard_users, super OR org=AHBA) can read/write.
-- Safe to re-run.
-- =============================================================

-- Who is a GC CONSOLE user? Must be a dashboard (console) account — so an
-- AHBA-owned *technician* (who may share the AHBA org) is still excluded,
-- because technicians are NOT in dashboard_users. GC = super, or AHBA org.
create or replace function public.is_gc_console()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select (du.is_super or o.code = 'AHBA')
    from public.dashboard_users du
    left join public.orgs o on o.id = du.org_id
    where lower(du.email) = lower(public.jwt_email())
    limit 1
  ), false)
$$;
alter function public.is_gc_console() owner to postgres;

create table if not exists public.jo_approver_notes (
  job_id     text primary key references public.jobs(id) on delete cascade,
  note       text        not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.jo_approver_notes enable row level security;

-- Only GC console users may read or write. Everyone else (subcon console,
-- technicians, sales, anon) is denied at the row level.
drop policy if exists jo_approver_notes_gc_all on public.jo_approver_notes;
create policy jo_approver_notes_gc_all on public.jo_approver_notes
  for all
  to authenticated
  using (public.is_gc_console())
  with check (public.is_gc_console());

grant select, insert, update, delete on public.jo_approver_notes to authenticated;

notify pgrst, 'reload schema';

-- quick check (run as the postgres role in SQL editor → bypasses RLS)
select 'jo_approver_notes ready' as status;
