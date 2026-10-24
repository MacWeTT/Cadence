-- Circles: changing how much of a habit a circle sees no longer changes how the habit is named to it.
--
-- `set_share` used to take 'name' as the default style, and an update wrote it back, so picking "emoji only" and then
-- changing the level quietly reset it to the name. The style is now optional: left out, a new share is shown by name
-- and an existing one keeps what it has; given, it is set. (The habit dialog changes levels without a style.)

create or replace function public.set_share(p_habit uuid, p_circle uuid, p_level text, p_label text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_level is null or p_level not in ('hidden', 'showed_up', 'done_today', 'streaks', 'everything') then
    raise exception 'invalid_level';
  end if;
  if p_label is not null and p_label not in ('name', 'emoji', 'generic') then
    raise exception 'invalid_label';
  end if;
  if not exists (select 1 from public.habits where id = p_habit and user_id = v_uid) then
    raise exception 'not_your_habit';
  end if;
  if not public.is_circle_member(p_circle) then
    raise exception 'not_a_member';
  end if;

  if p_level = 'hidden' then
    delete from public.habit_shares where habit_id = p_habit and circle_id = p_circle;
    return;
  end if;

  insert into public.habit_shares (habit_id, circle_id, level, label)
  values (p_habit, p_circle, p_level, coalesce(p_label, 'name'))
  on conflict (habit_id, circle_id) do update set level = excluded.level,
    label = coalesce(p_label, public.habit_shares.label),
    shows_misses = case when excluded.level = 'everything' then public.habit_shares.shows_misses else false end;
end $$;

revoke execute on function public.set_share(uuid, uuid, text, text) from public, anon;
grant execute on function public.set_share(uuid, uuid, text, text) to authenticated;
