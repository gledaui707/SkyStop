-- SkyStop: notification inbox (additive, re-runnable). One row per event for the signed-in guest:
-- simulated flight/gate changes, itinerary saves and applied fixes. Owner-only (RLS); duplicates are
-- prevented by a per-owner dedupe key; nothing existing is changed.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  layover_id uuid references public.layovers(id) on delete cascade,
  kind text not null check (kind in ('flight_time','gate','plan_saved','fix_applied')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 300),
  simulated boolean not null default false,
  dedupe_key text not null check (char_length(dedupe_key) between 1 and 200),
  read_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, dedupe_key)
);
create index if not exists notifications_owner_created on public.notifications(owner_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
drop policy if exists owner_all on public.notifications;
create policy owner_all on public.notifications for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid())
    and (layover_id is null or exists (select 1 from public.layovers l where l.id = layover_id and l.owner_id = (select auth.uid()))));
