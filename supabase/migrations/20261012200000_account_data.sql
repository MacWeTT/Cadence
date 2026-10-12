-- The Account tab (0.8): import a backup, and delete the account. Additive.

-- Replaces the caller's habits and history with a backup, all or nothing. It runs as the caller (security invoker), so
-- row-level security and the tick rules apply to every row. Habit and row ids are always new. The caller's own settings
-- (name, timezone, week start, avatar, accent, sound) are not touched.
-- The backup's shape is documented in src/lib/backup.ts; the app checks it first, this is the last word.
create function public.replace_my_data(p_backup jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_habit jsonb;
  v_id uuid;
  v_habits int := 0;
  v_ticks int := 0;
  v_focus int := 0;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;
  if jsonb_typeof(p_backup -> 'habits') is distinct from 'array' then
    raise exception 'invalid_backup';
  end if;

  delete from public.habits where user_id = v_uid;

  for v_habit in select value from jsonb_array_elements(p_backup -> 'habits') loop
    insert into public.habits (user_id, name, description, icon, color, start_date, links, created_at)
    values (
      v_uid,
      v_habit ->> 'name',
      nullif(btrim(coalesce(v_habit ->> 'description', '')), ''),
      v_habit ->> 'icon',
      v_habit ->> 'color',
      (v_habit ->> 'startDate')::date,
      coalesce(array(select jsonb_array_elements_text(coalesce(v_habit -> 'links', '[]'::jsonb))), '{}'),
      coalesce((v_habit ->> 'createdAt')::timestamptz, now())
    )
    returning id into v_id;
    v_habits := v_habits + 1;

    insert into public.habit_schedules (habit_id, kind, times_per_week, weekdays, effective_from)
    select
      v_id,
      s ->> 'kind',
      (s ->> 'timesPerWeek')::smallint,
      case when jsonb_typeof(s -> 'weekdays') = 'array'
        then array(select (d)::smallint from jsonb_array_elements_text(s -> 'weekdays') as d)
      end,
      (s ->> 'effectiveFrom')::date
    from jsonb_array_elements(coalesce(v_habit -> 'schedules', '[]'::jsonb)) as s;

    insert into public.habit_completions (habit_id, completion_date)
    select v_id, (t)::date from jsonb_array_elements_text(coalesce(v_habit -> 'ticks', '[]'::jsonb)) as t;
    get diagnostics v_count = row_count;
    v_ticks := v_ticks + v_count;

    insert into public.focus_sessions (user_id, habit_id, started_at, ended_at, mode, plan, skipped_seconds, focus_seconds)
    select
      v_uid,
      v_id,
      (f ->> 'startedAt')::timestamptz,
      (f ->> 'endedAt')::timestamptz,
      f ->> 'mode',
      case when jsonb_typeof(f -> 'plan') = 'object' then f -> 'plan' end,
      coalesce((f ->> 'skippedSeconds')::int, 0),
      (f ->> 'focusSeconds')::int
    from jsonb_array_elements(coalesce(v_habit -> 'focusSessions', '[]'::jsonb)) as f;
    get diagnostics v_count = row_count;
    v_focus := v_focus + v_count;

    -- Archived last: the tick rules refuse a tick on an archived habit.
    insert into public.habit_archive_periods (habit_id, archived_on, restored_on)
    select v_id, (p ->> 'archivedOn')::date, (p ->> 'restoredOn')::date
    from jsonb_array_elements(coalesce(v_habit -> 'pauses', '[]'::jsonb)) as p;

    if v_habit ->> 'archivedAt' is not null then
      update public.habits set archived_at = (v_habit ->> 'archivedAt')::timestamptz where id = v_id;
    end if;
  end loop;

  return jsonb_build_object('habits', v_habits, 'ticks', v_ticks, 'focusSessions', v_focus);
end $$;

revoke execute on function public.replace_my_data(jsonb) from public, anon;
grant execute on function public.replace_my_data(jsonb) to authenticated;

-- Deletes the caller's account and everything under it. Security definer, because only the database owner may delete
-- from auth.users; done here so the web app needs no service key. The foreign keys cascade to the profile, habits,
-- schedules, ticks, pauses, focus sessions and custom sounds. Named contact messages (they hold a name and an email)
-- are deleted; anonymous ones are not linked to anyone and stay. Uploaded files are not covered by the cascade: the app
-- removes them first.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  delete from public.contact_messages where user_id = v_uid and not anonymous;
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
