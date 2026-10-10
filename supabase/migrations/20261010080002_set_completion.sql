-- Ticking a habit for a day. All tick rules live here; the server action only translates the error messages.
-- Security invoker, so row-level security applies: another user's habit looks missing.

create function public.set_completion(p_habit_id uuid, p_date date, p_done boolean, p_today date) returns void
language plpgsql set search_path = '' as $$
declare
  v_start date;
  v_archived timestamptz;
begin
  select start_date, archived_at into v_start, v_archived from public.habits where id = p_habit_id;
  if not found then
    raise exception 'habit_not_found';
  end if;
  if v_archived is not null then
    raise exception 'habit_archived';
  end if;
  if p_date > p_today then
    raise exception 'date_in_future';
  end if;
  if p_date < v_start then
    raise exception 'before_start';
  end if;

  if p_done then
    insert into public.habit_completions (habit_id, completion_date)
    values (p_habit_id, p_date)
    on conflict (habit_id, completion_date) do nothing;
  else
    delete from public.habit_completions where habit_id = p_habit_id and completion_date = p_date;
  end if;
end $$;

revoke execute on function public.set_completion(uuid, date, boolean, date) from public, anon;
grant execute on function public.set_completion(uuid, date, boolean, date) to authenticated;
