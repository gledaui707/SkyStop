begin;
alter table public.airports enable row level security;
alter table public.activities enable row level security;
alter table public.itinerary_templates enable row level security;
alter table public.template_items enable row level security;
alter table public.layovers enable row level security;
alter table public.plan_items enable row level security;
revoke all on public.airports, public.activities, public.itinerary_templates, public.template_items, public.layovers, public.plan_items from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.airports, public.activities, public.itinerary_templates, public.template_items to anon, authenticated;
grant select on public.layovers, public.plan_items to authenticated;
create policy catalogue_read on public.airports for select to anon, authenticated using (true);
create policy catalogue_read on public.activities for select to anon, authenticated using (true);
create policy catalogue_read on public.itinerary_templates for select to anon, authenticated using (true);
create policy catalogue_read on public.template_items for select to anon, authenticated using (true);
create policy owner_read on public.layovers for select to authenticated using (owner_id = (select auth.uid()));
create policy owner_read on public.plan_items for select to authenticated using (
 exists (select 1 from public.layovers l where l.id = layover_id and l.owner_id = (select auth.uid()))
);
-- Writes only through this narrowly scoped transaction. No public write policy.
create function public.save_plan(
 p_id uuid, p_expected_revision integer, p_airport_id text,
 p_arrival_at timestamptz, p_departure_at timestamptz,
 p_buffer_minutes integer, p_activity_ids uuid[]
) returns public.layovers
language plpgsql security definer set search_path = '' as $$
declare
 v_owner uuid := auth.uid();
 v_plan public.layovers;
 v_count integer;
begin
 if v_owner is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
 if p_id is null or p_expected_revision is null or p_expected_revision < 0
    or p_airport_id is null or p_arrival_at is null or p_departure_at is null
    or p_buffer_minutes is null or p_activity_ids is null then
   raise exception 'INVALID_INPUT' using errcode = '22023';
 end if;
 if cardinality(p_activity_ids) > 20 or array_position(p_activity_ids, null) is not null
    or cardinality(p_activity_ids) <> (select count(distinct x) from unnest(p_activity_ids) x) then
   raise exception 'INVALID_ACTIVITIES' using errcode = '22023';
 end if;
 select count(*) into v_count from public.activities
 where id = any(p_activity_ids) and airport_id = p_airport_id;
 if v_count <> cardinality(p_activity_ids) then
   raise exception 'INVALID_ACTIVITIES' using errcode = '22023';
 end if;
 if p_expected_revision = 0 then
   insert into public.layovers(id, owner_id, airport_id, arrival_at, departure_at, buffer_minutes)
   values(p_id, v_owner, p_airport_id, p_arrival_at, p_departure_at, p_buffer_minutes)
   on conflict(id) do nothing returning * into v_plan;
   if not found then raise exception 'PLAN_CONFLICT' using errcode = '40001'; end if;
 else
   select * into v_plan from public.layovers where id = p_id and owner_id = v_owner for update;
   if not found then raise exception 'PLAN_UNAVAILABLE' using errcode = '42501'; end if;
   if v_plan.revision <> p_expected_revision then
     raise exception 'PLAN_CONFLICT' using errcode = '40001';
   end if;
   -- Airport is immutable after creation; starting another airport creates a new plan.
   if v_plan.airport_id <> p_airport_id then raise exception 'AIRPORT_CHANGED' using errcode = '22023'; end if;
   update public.layovers set arrival_at=p_arrival_at, departure_at=p_departure_at,
     buffer_minutes=p_buffer_minutes, revision=revision+1, updated_at=now()
   where id=p_id returning * into v_plan;
 end if;
 delete from public.plan_items where layover_id=p_id;
 insert into public.plan_items(layover_id, airport_id, activity_id, position, duration_minutes)
 select p_id, p_airport_id, a.id, x.ord::integer, a.duration_minutes
 from unnest(p_activity_ids) with ordinality x(id, ord)
 join public.activities a on a.id=x.id;
 return v_plan;
end;
$$;
revoke all on function public.save_plan(uuid,integer,text,timestamptz,timestamptz,integer,uuid[]) from public, anon;
grant execute on function public.save_plan(uuid,integer,text,timestamptz,timestamptz,integer,uuid[]) to authenticated;
commit;
