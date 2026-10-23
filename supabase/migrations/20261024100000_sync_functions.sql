-- The desktop app keeps its own copy of a person's data and stays in step with the account (see the desktop spec,
-- "Staying in step"). These functions write one record by its id, so a record the app made offline keeps the same id on
-- both sides. They run as the caller (security invoker): row-level security applies to everything they touch, and another
-- person's record looks missing. All are safe to repeat.

-- Writes one habit with its schedules and pauses (the habit's ticks go through set_completion). When the account's copy
-- was changed after p_habit.updatedAt the account's copy wins and nothing is written: the newest edit wins.
create function public.sync_put_habit(p_habit jsonb) returns void
language plpgsql set search_path = '' as $$
declare
  v_id uuid := (p_habit ->> 'id')::uuid;
  v_at timestamptz := (p_habit ->> 'updatedAt')::timestamptz;
  v_current timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;

  select updated_at into v_current from public.habits where id = v_id;
  if v_current is not null and v_current > v_at then
    return;
  end if;

  insert into public.habits (id, user_id, name, description, icon, color, start_date, links, created_at, archived_at)
  values (
    v_id,
    (select auth.uid()),
    p_habit ->> 'name',
    nullif(btrim(coalesce(p_habit ->> 'description', '')), ''),
    p_habit ->> 'icon',
    p_habit ->> 'color',
    (p_habit ->> 'startDate')::date,
    coalesce(array(select jsonb_array_elements_text(coalesce(p_habit -> 'links', '[]'::jsonb))), '{}'),
    coalesce((p_habit ->> 'createdAt')::timestamptz, now()),
    (p_habit ->> 'archivedAt')::timestamptz
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    color = excluded.color,
    start_date = excluded.start_date,
    links = excluded.links,
    archived_at = excluded.archived_at;

  delete from public.habit_schedules where habit_id = v_id;
  insert into public.habit_schedules (habit_id, kind, times_per_week, weekdays, effective_from)
  select
    v_id,
    s ->> 'kind',
    (s ->> 'timesPerWeek')::smallint,
    case when jsonb_typeof(s -> 'weekdays') = 'array'
      then array(select (d)::smallint from jsonb_array_elements_text(s -> 'weekdays') as d)
    end,
    (s ->> 'effectiveFrom')::date
  from jsonb_array_elements(coalesce(p_habit -> 'schedules', '[]'::jsonb)) as s;

  delete from public.habit_archive_periods where habit_id = v_id;
  insert into public.habit_archive_periods (habit_id, archived_on, restored_on)
  select v_id, (p ->> 'archivedOn')::date, (p ->> 'restoredOn')::date
  from jsonb_array_elements(coalesce(p_habit -> 'pauses', '[]'::jsonb)) as p;
end $$;

-- Deletes a habit and everything under it. A habit that is already gone is not an error.
create function public.sync_delete_habit(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  delete from public.habits where id = p_id;
end $$;

-- Writes one finished focus session by its id (a session still running is never sent).
create function public.sync_put_focus(p_session jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  if p_session ->> 'endedAt' is null then
    raise exception 'session_running';
  end if;

  insert into public.focus_sessions
    (id, user_id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, paused_seconds, focus_seconds, sound_id)
  values (
    (p_session ->> 'id')::uuid,
    (select auth.uid()),
    (p_session ->> 'habitId')::uuid,
    (p_session ->> 'startedAt')::timestamptz,
    (p_session ->> 'endedAt')::timestamptz,
    p_session ->> 'mode',
    case when jsonb_typeof(p_session -> 'plan') = 'object' then p_session -> 'plan' end,
    coalesce((p_session ->> 'skippedSeconds')::int, 0),
    coalesce((p_session ->> 'pausedSeconds')::int, 0),
    (p_session ->> 'focusSeconds')::int,
    p_session ->> 'soundId'
  )
  on conflict (id) do update set
    started_at = excluded.started_at,
    ended_at = excluded.ended_at,
    mode = excluded.mode,
    plan = excluded.plan,
    skipped_seconds = excluded.skipped_seconds,
    paused_seconds = excluded.paused_seconds,
    focus_seconds = excluded.focus_seconds,
    sound_id = excluded.sound_id;
end $$;

-- Removes one finished focus session. A running one is left alone.
create function public.sync_delete_focus(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in';
  end if;
  delete from public.focus_sessions where id = p_id and ended_at is not null;
end $$;

revoke execute on function public.sync_put_habit(jsonb) from public, anon;
revoke execute on function public.sync_delete_habit(uuid) from public, anon;
revoke execute on function public.sync_put_focus(jsonb) from public, anon;
revoke execute on function public.sync_delete_focus(uuid) from public, anon;
grant execute on function public.sync_put_habit(jsonb) to authenticated;
grant execute on function public.sync_delete_habit(uuid) to authenticated;
grant execute on function public.sync_put_focus(jsonb) to authenticated;
grant execute on function public.sync_delete_focus(uuid) to authenticated;
