-- Habit management: archive periods ("pauses") and transactional functions. See the milestone 3 design spec.

create table public.habit_archive_periods (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  archived_on date not null,
  restored_on date,
  check (restored_on is null or restored_on >= archived_on)
);
create index habit_archive_periods_habit_id_idx on public.habit_archive_periods (habit_id);
-- At most one open (not yet restored) period per habit.
create unique index habit_archive_periods_one_open on public.habit_archive_periods (habit_id) where restored_on is null;

alter table public.habit_archive_periods enable row level security;

create policy "own archive periods" on public.habit_archive_periods for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));

-- All functions run as the caller (security invoker), so row-level security applies to everything they touch.

create function public.create_habit(
  p_name text, p_description text, p_icon text, p_color text,
  p_start_date date, p_kind text, p_times_per_week smallint
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
  insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from)
  values (v_id, p_kind, p_times_per_week, p_start_date);
  return v_id;
end $$;

create function public.archive_habit(p_habit_id uuid, p_on date) returns void
language plpgsql set search_path = '' as $$
begin
  update public.habits set archived_at = now() where id = p_habit_id and archived_at is null;
  if not found then
    raise exception 'habit not found or already archived';
  end if;
  insert into public.habit_archive_periods (habit_id, archived_on) values (p_habit_id, p_on);
end $$;

create function public.restore_habit(p_habit_id uuid, p_on date) returns void
language plpgsql set search_path = '' as $$
begin
  update public.habits set archived_at = null where id = p_habit_id and archived_at is not null;
  if not found then
    raise exception 'habit not found or not archived';
  end if;
  update public.habit_archive_periods
    set restored_on = greatest(p_on, archived_on)
    where habit_id = p_habit_id and restored_on is null;
end $$;

-- p_action: 'replace_all' (one row only), 'upsert' (replace pending rows with one at p_effective_from), 'delete_pending'.
create function public.apply_schedule_change(
  p_habit_id uuid, p_action text, p_kind text, p_times_per_week smallint,
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
    insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from)
    values (p_habit_id, p_kind, p_times_per_week, p_effective_from);
  elsif p_action = 'upsert' then
    delete from public.habit_schedules
      where habit_id = p_habit_id and effective_from > p_today and effective_from <> p_effective_from;
    insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from)
    values (p_habit_id, p_kind, p_times_per_week, p_effective_from)
    on conflict (habit_id, effective_from)
    do update set kind = excluded.kind, times_per_week = excluded.times_per_week;
  elsif p_action = 'delete_pending' then
    delete from public.habit_schedules where habit_id = p_habit_id and effective_from > p_today;
  else
    raise exception 'unknown schedule action: %', p_action;
  end if;
end $$;

revoke execute on function public.create_habit(text, text, text, text, date, text, smallint) from public, anon;
revoke execute on function public.archive_habit(uuid, date) from public, anon;
revoke execute on function public.restore_habit(uuid, date) from public, anon;
revoke execute on function public.apply_schedule_change(uuid, text, text, smallint, date, date) from public, anon;
grant execute on function public.create_habit(text, text, text, text, date, text, smallint) to authenticated;
grant execute on function public.archive_habit(uuid, date) to authenticated;
grant execute on function public.restore_habit(uuid, date) to authenticated;
grant execute on function public.apply_schedule_change(uuid, text, text, smallint, date, date) to authenticated;
