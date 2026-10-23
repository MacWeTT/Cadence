-- Circles (redesign): each person's own look for a circle (a colour, and pinned to the top), and reactions.
--
-- 1. circle_members gets `color` and `pinned`. They belong to the person: a friend's colour for the same circle is
--    theirs, and nothing here changes what anyone sees of anyone else. `my_circles` lists pinned circles first.
-- 2. Reactions: one of four emoji on a friend's day (their own today, or the six days before it), seen by the whole
--    circle like a reaction in a group chat. They are written only by `react`, read only through `circle_overview`,
--    and follow the same switches as cheers (a person who turned cheers off, or paused sharing, gets none).
--    The older `cheers` stay as they are; the screens no longer use them.
-- 3. circle_overview carries the caller's colour and pin for the circle, and each member's reactions. The trigger that
--    cleans up after a member leaves also removes their reactions.

alter table public.circle_members
  add column color text not null default 'moss' check (color in ('moss', 'clay', 'ochre', 'rose', 'plum', 'teal', 'sky', 'slate')),
  add column pinned boolean not null default false;

create function public.set_circle_look(p_circle uuid, p_color text, p_pinned boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_color is null or p_color not in ('moss', 'clay', 'ochre', 'rose', 'plum', 'teal', 'sky', 'slate') then
    raise exception 'invalid_color';
  end if;

  update public.circle_members set color = p_color, pinned = coalesce(p_pinned, pinned)
  where circle_id = p_circle and user_id = v_uid;
  if not found then
    raise exception 'not_a_member';
  end if;
end $$;

drop function public.my_circles();
create function public.my_circles()
returns table (id uuid, name text, is_owner boolean, member_count integer, color text, pinned boolean)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.name,
    c.owner_id = (select auth.uid()),
    (select count(*)::int from public.circle_members x where x.circle_id = c.id),
    m.color,
    m.pinned
  from public.circles c
  join public.circle_members m on m.circle_id = c.id and m.user_id = (select auth.uid())
  order by m.pinned desc, c.created_at, c.id
$$;

create table public.reactions (
  circle_id uuid not null references public.circles (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  for_date date not null,
  emoji text not null check (emoji in ('👏', '🔥', '💪', '❤️')),
  created_at timestamptz not null default now(),
  primary key (circle_id, from_user, to_user, for_date, emoji),
  check (from_user <> to_user)
);
create index reactions_to_user_idx on public.reactions (circle_id, to_user, for_date);

-- Row-level security with no policy at all: nobody reads or writes the table directly.
alter table public.reactions enable row level security;

create function public.react(p_circle uuid, p_to uuid, p_for date, p_emoji text, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_allow boolean;
  v_paused boolean;
  v_today date;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not public.is_circle_member(p_circle) then
    raise exception 'not_a_member';
  end if;
  if p_to = v_uid then
    raise exception 'cannot_react_self';
  end if;
  if p_emoji is null or p_emoji not in ('👏', '🔥', '💪', '❤️') then
    raise exception 'invalid_emoji';
  end if;

  -- Taking a reaction back is always allowed.
  if not p_on then
    delete from public.reactions
    where circle_id = p_circle and from_user = v_uid and to_user = p_to and for_date = p_for and emoji = p_emoji;
    return;
  end if;

  select m.allow_cheers, p.circles_paused, (now() at time zone p.timezone)::date into v_allow, v_paused, v_today
  from public.circle_members m join public.profiles p on p.user_id = m.user_id
  where m.circle_id = p_circle and m.user_id = p_to;
  if not found then
    raise exception 'not_a_member';
  end if;
  if not v_allow or v_paused then
    raise exception 'cheers_off';
  end if;
  if p_for is null or p_for > v_today or p_for < v_today - 6 then
    raise exception 'react_date';
  end if;

  insert into public.reactions (circle_id, from_user, to_user, for_date, emoji)
  values (p_circle, v_uid, p_to, p_for, p_emoji)
  on conflict do nothing;
end $$;

create or replace function public.circle_overview(p_circle uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not public.is_circle_member(p_circle) then
    raise exception 'not_a_member';
  end if;

  with m as (
    select cm.user_id, cm.joined_at, cm.in_week, cm.allow_cheers,
           p.display_name, p.tag, p.avatar_kind, p.avatar_value, p.avatar_color, p.avatar_url,
           p.circles_paused as paused, p.week_starts_on,
           (now() at time zone p.timezone)::date as today,
           (now() at time zone p.timezone)::date - case
             when p.week_starts_on = 7 then extract(isodow from (now() at time zone p.timezone)::date)::int % 7
             else extract(isodow from (now() at time zone p.timezone)::date)::int - 1
           end as week_start
    from public.circle_members cm join public.profiles p on p.user_id = cm.user_id
    where cm.circle_id = p_circle
  ),
  -- what the caller may see of each other member's habits, at the level that applies to the caller
  vis as (
    select h.id as habit_id, h.user_id, h.name, h.icon, h.created_at, h.start_date,
           coalesce(case when h.user_id = v_uid then null else o.level end, s.level) as level,
           case when h.user_id <> v_uid and o.level is not null then o.label else s.label end as label,
           m.today, m.week_start
    from public.habits h
    join m on m.user_id = h.user_id and not m.paused
    left join public.habit_shares s on s.habit_id = h.id and s.circle_id = p_circle
    left join public.habit_share_overrides o on o.habit_id = h.id and o.circle_id = p_circle and o.viewer_id = v_uid
    where h.archived_at is null
      and coalesce(case when h.user_id = v_uid then null else o.level end, s.level) is not null
      and coalesce(case when h.user_id = v_uid then null else o.level end, s.level) <> 'hidden'
  ),
  ticks as (
    select count(*) as n
    from public.habit_completions c
    join public.habits h on h.id = c.habit_id and h.archived_at is null
    join public.habit_shares s on s.habit_id = h.id and s.circle_id = p_circle
      and s.level in ('done_today', 'streaks', 'everything')
    join m on m.user_id = h.user_id and m.in_week and not m.paused
    where c.completion_date between m.week_start and m.today
  )
  select jsonb_build_object(
    'circle', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'is_owner', c.owner_id = v_uid,
      'week_ticks', (select n from ticks),
      'color', (select x.color from public.circle_members x where x.circle_id = c.id and x.user_id = v_uid),
      'pinned', (select x.pinned from public.circle_members x where x.circle_id = c.id and x.user_id = v_uid)
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', m.user_id,
          'tag', m.tag,
          'display_name', m.display_name,
          'is_you', m.user_id = v_uid,
          'is_owner', m.user_id = c.owner_id,
          'paused', m.paused and m.user_id <> v_uid,
          'today', m.today,
          'week_starts_on', m.week_starts_on,
          'allow_cheers', m.allow_cheers,
          'in_week', m.in_week,
          'avatar_kind', case when m.avatar_kind = 'photo' then 'initial' else m.avatar_kind end,
          'avatar_value', m.avatar_value,
          'avatar_color', m.avatar_color,
          'avatar_url', case when m.avatar_kind = 'google' then m.avatar_url end,
          'showed_up_week', exists (
            select 1 from vis v join public.habit_completions c on c.habit_id = v.habit_id
            where v.user_id = m.user_id and c.completion_date between v.week_start and v.today
          ),
          'habits', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'name', case when v.label = 'name' then v.name end,
                'icon', case when v.label in ('name', 'emoji') then v.icon end,
                'level', v.level,
                'done', exists (
                  select 1 from public.habit_completions c where c.habit_id = v.habit_id and c.completion_date = v.today
                )
              ) || case when v.level in ('streaks', 'everything') then jsonb_build_object(
                'data', jsonb_build_object(
                  'start_date', v.start_date,
                  'schedules', coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'kind', hs.kind, 'times_per_week', hs.times_per_week,
                        'weekdays', to_jsonb(hs.weekdays), 'effective_from', hs.effective_from
                      ) order by hs.effective_from
                    ) from public.habit_schedules hs where hs.habit_id = v.habit_id
                  ), '[]'::jsonb),
                  'pauses', coalesce((
                    select jsonb_agg(
                      jsonb_build_object('from', ap.archived_on, 'to', ap.restored_on) order by ap.archived_on
                    ) from public.habit_archive_periods ap where ap.habit_id = v.habit_id
                  ), '[]'::jsonb),
                  'completions', coalesce((
                    select jsonb_agg(c.completion_date order by c.completion_date)
                    from public.habit_completions c where c.habit_id = v.habit_id
                  ), '[]'::jsonb)
                )
              ) else '{}'::jsonb end order by v.created_at, v.habit_id
            )
            from vis v where v.user_id = m.user_id and v.level <> 'showed_up'
          ), '[]'::jsonb),
          'cheers_today', case when m.user_id = v_uid then coalesce((
            select jsonb_agg(jsonb_build_object('user_id', ch.from_user, 'tag', pf.tag) order by ch.created_at)
            from public.cheers ch join public.profiles pf on pf.user_id = ch.from_user
            where ch.circle_id = p_circle and ch.to_user = v_uid and ch.for_date = m.today
          ), '[]'::jsonb) end,
          'cheered_by_you', case when m.user_id <> v_uid then exists (
            select 1 from public.cheers ch
            where ch.circle_id = p_circle and ch.from_user = v_uid and ch.to_user = m.user_id and ch.for_date = m.today
          ) end,
          'reactions', case when m.paused and m.user_id <> v_uid then '[]'::jsonb else coalesce((
            select jsonb_agg(
              jsonb_build_object('user_id', r.from_user, 'tag', pf.tag, 'date', r.for_date, 'emoji', r.emoji)
              order by r.for_date, r.created_at
            )
            from public.reactions r join public.profiles pf on pf.user_id = r.from_user
            where r.circle_id = p_circle and r.to_user = m.user_id and r.for_date between m.today - 6 and m.today
          ), '[]'::jsonb) end
        ) order by m.joined_at, m.user_id
      ) from m
    ), '[]'::jsonb)
  ) into v_result
  from public.circles c where c.id = p_circle;

  return v_result;
end $$;

create or replace function public.circle_member_removed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.habit_shares s using public.habits h
  where s.circle_id = old.circle_id and s.habit_id = h.id and h.user_id = old.user_id;

  delete from public.habit_share_overrides o
  where o.circle_id = old.circle_id
    and (o.viewer_id = old.user_id
      or exists (select 1 from public.habits h where h.id = o.habit_id and h.user_id = old.user_id));

  delete from public.cheers where circle_id = old.circle_id and (from_user = old.user_id or to_user = old.user_id);
  delete from public.reactions where circle_id = old.circle_id and (from_user = old.user_id or to_user = old.user_id);

  update public.circles c
  set owner_id = (
    select m.user_id from public.circle_members m where m.circle_id = c.id order by m.joined_at, m.user_id limit 1
  )
  where c.id = old.circle_id and (c.owner_id is null or c.owner_id = old.user_id);

  delete from public.circles c
  where c.id = old.circle_id and not exists (select 1 from public.circle_members m where m.circle_id = c.id);

  return old;
end $$;

revoke execute on function public.set_circle_look(uuid, text, boolean) from public, anon;
revoke execute on function public.react(uuid, uuid, date, text, boolean) from public, anon;
revoke execute on function public.my_circles() from public, anon;
revoke execute on function public.circle_overview(uuid) from public, anon;
revoke execute on function public.circle_member_removed() from public, anon, authenticated;

grant execute on function public.set_circle_look(uuid, text, boolean) to authenticated;
grant execute on function public.react(uuid, uuid, date, text, boolean) to authenticated;
grant execute on function public.my_circles() to authenticated;
grant execute on function public.circle_overview(uuid) to authenticated;
