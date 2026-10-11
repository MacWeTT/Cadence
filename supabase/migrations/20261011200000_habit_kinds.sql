-- Fixed-weekday and optional schedules (0.5). Additive: the old functions stay, so the previous version of the app keeps
-- working while a new one is deployed; a later migration drops them.

alter table public.habit_schedules add column weekdays smallint[];

-- A check constraint cannot hold a subquery, so "all different" lives in a function.
create function public.all_different(p_values smallint[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p_values) = (select count(distinct v) from unnest(p_values) as v)
$$;

alter table public.habit_schedules drop constraint habit_schedules_check;
alter table public.habit_schedules add constraint habit_schedules_kind_check check (
  (kind in ('daily', 'optional') and times_per_week is null and weekdays is null)
  or (kind = 'weekly_count' and times_per_week between 1 and 6 and weekdays is null)
  or (
    kind = 'weekdays' and times_per_week is null and weekdays is not null
    -- one to six different days, 1 = Monday ... 7 = Sunday (all seven is just daily)
    and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(weekdays) between 1 and 6
    and public.all_different(weekdays)
  )
);

create function public.create_habit(
  p_name text, p_description text, p_icon text, p_color text,
  p_start_date date, p_kind text, p_times_per_week smallint, p_weekdays smallint[]
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  insert into public.habits (user_id, name, description, icon, color, start_date)
  values ((select auth.uid()), p_name, nullif(btrim(p_description), ''), p_icon, p_color, p_start_date)
  returning id into v_id;
  insert into public.habit_schedules (habit_id, kind, times_per_week, weekdays, effective_from)
  values (v_id, p_kind, p_times_per_week, p_weekdays, p_start_date);
  return v_id;
end $$;

create function public.apply_schedule_change(
  p_habit_id uuid, p_action text, p_kind text, p_times_per_week smallint, p_weekdays smallint[],
  p_effective_from date, p_today date
) returns void
language plpgsql set search_path = '' as $$
begin
  perform 1 from public.habits where id = p_habit_id;
  if not found then
    raise exception 'habit not found';
  end if;

  if p_action = 'replace_all' then
    delete from public.habit_schedules where habit_id = p_habit_id;
    insert into public.habit_schedules (habit_id, kind, times_per_week, weekdays, effective_from)
    values (p_habit_id, p_kind, p_times_per_week, p_weekdays, p_effective_from);
  elsif p_action = 'upsert' then
    delete from public.habit_schedules
      where habit_id = p_habit_id and effective_from > p_today and effective_from <> p_effective_from;
    insert into public.habit_schedules (habit_id, kind, times_per_week, weekdays, effective_from)
    values (p_habit_id, p_kind, p_times_per_week, p_weekdays, p_effective_from)
    on conflict (habit_id, effective_from)
    do update set kind = excluded.kind, times_per_week = excluded.times_per_week, weekdays = excluded.weekdays;
  elsif p_action = 'delete_pending' then
    delete from public.habit_schedules where habit_id = p_habit_id and effective_from > p_today;
  else
    raise exception 'unknown schedule action: %', p_action;
  end if;
end $$;

revoke execute on function public.create_habit(text, text, text, text, date, text, smallint, smallint[]) from public, anon;
revoke execute on function public.apply_schedule_change(uuid, text, text, smallint, smallint[], date, date) from public, anon;
grant execute on function public.create_habit(text, text, text, text, date, text, smallint, smallint[]) to authenticated;
grant execute on function public.apply_schedule_change(uuid, text, text, smallint, smallint[], date, date) to authenticated;
