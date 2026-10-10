-- The tick rules must hold for every write, not only for set_completion: the table is writable by its owner through
-- the API, and set_completion's p_today comes from the caller. This trigger is the backstop, using the profile's own
-- timezone for "today". It raises the same messages as set_completion.
-- A habit that row-level security hides is left alone here, so the policy still answers with its usual 42501.

create function public.check_completion_rules() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_start date;
  v_archived timestamptz;
  v_tz text;
begin
  select h.start_date, h.archived_at, p.timezone into v_start, v_archived, v_tz
  from public.habits h join public.profiles p on p.user_id = h.user_id
  where h.id = new.habit_id;
  if not found then
    return new;
  end if;
  if v_archived is not null then
    raise exception 'habit_archived';
  end if;
  if new.completion_date > (now() at time zone v_tz)::date then
    raise exception 'date_in_future';
  end if;
  if new.completion_date < v_start then
    raise exception 'before_start';
  end if;
  return new;
end $$;

create trigger habit_completions_check_rules before insert or update of habit_id, completion_date
  on public.habit_completions for each row execute function public.check_completion_rules();
