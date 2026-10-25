-- M2: read-only client access. Server mutation RPCs belong to M3.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create function private.valid_inspection_answers(value jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(value) <> 'object' then false else
    not exists (
      select 1 from jsonb_each(value) entry
      where entry.key not in ('walls','floors','kitchen','water','bathroom','leaks','electrical','alarm')
        or entry.value not in ('"pass"'::jsonb, '"fail"'::jsonb, '"na"'::jsonb)
    ) end;
$$;
revoke all on function private.valid_inspection_answers(jsonb) from public;
grant execute on function private.valid_inspection_answers(jsonb) to service_role;

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  property text not null check (length(btrim(property)) between 1 and 160),
  address text not null check (length(btrim(address)) between 1 and 300),
  kind text not null check (kind in ('Routine condition inspection', 'Move-in inspection', 'Move-out inspection')),
  due_on date,
  created_at timestamptz not null default now()
);

create table public.inspection_assignments (
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (inspection_id, user_id)
);
create index inspection_assignments_user_id_idx on public.inspection_assignments(user_id, inspection_id);
create index inspections_due_on_idx on public.inspections(due_on, id);

create table public.inspection_records (
  inspection_id uuid primary key references public.inspections(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb check (private.valid_inspection_answers(answers)),
  notes text not null default '' check (length(notes) <= 5000),
  status text not null default 'draft' check (status in ('draft','completed')),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint completion_consistent check (
    (status = 'draft' and completed_at is null) or
    (status = 'completed' and completed_at is not null and
      answers ?& array['walls','floors','kitchen','water','bathroom','leaks','electrical','alarm'])
  )
);

-- Owned by the migration owner, not by an application user. The fixed search
-- path and explicit references prevent name-shadowing. No recursive RLS lookup.
create function private.is_inspection_assignee(target_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.inspection_assignments
    where inspection_id = target_id and user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_inspection_assignee(uuid) from public;
grant execute on function private.is_inspection_assignee(uuid) to authenticated;

alter table public.inspections enable row level security;
alter table public.inspection_assignments enable row level security;
alter table public.inspection_records enable row level security;
alter table public.inspections force row level security;
alter table public.inspection_assignments force row level security;
alter table public.inspection_records force row level security;

create policy inspections_read_assigned on public.inspections for select to authenticated
using ((select private.is_inspection_assignee(id)));
create policy assignments_read_self on public.inspection_assignments for select to authenticated
using (user_id = (select auth.uid()));
create policy records_read_assigned on public.inspection_records for select to authenticated
using ((select private.is_inspection_assignee(inspection_id)));

revoke all on public.inspections, public.inspection_assignments, public.inspection_records from public, anon, authenticated;
grant select on public.inspections, public.inspection_assignments, public.inspection_records to authenticated;
grant all on public.inspections, public.inspection_assignments, public.inspection_records to service_role;
