-- Circles: remove the cheers. Reactions replaced them in the screens, so the table and `send_cheer` were left unused.
--
-- Two functions still touched the table, so they are replaced first: `circle_overview` no longer carries who cheered
-- you or whether you cheered (the screens stopped reading those), and the clean-up that runs when someone leaves no
-- longer deletes cheers. Then the function and the table go (its policy and index go with it). The `allow_cheers`
-- column stays: it is the switch for reactions now ("let friends react to me").

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

  with pairstate as (
    -- Closer is on only for a pair of two people who have both turned it on
    select c.kind = 'pair'
      and (select count(*) from public.circle_members x where x.circle_id = c.id) = 2
      and not exists (select 1 from public.circle_members x where x.circle_id = c.id and not x.closer) as active
    from public.circles c where c.id = p_circle
  ),
  m as (
    select cm.user_id, cm.joined_at, cm.in_week, cm.allow_cheers, cm.closer,
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
           -- off days may be shown only to the partner, with Closer on for both, for a habit the owner ticked at Everything
           (h.user_id <> v_uid and coalesce(s.shows_misses, false) and (select active from pairstate)
             and coalesce(case when h.user_id = v_uid then null else o.level end, s.level) = 'everything') as shows_misses,
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
      'kind', c.kind,
      'closer_active', (select active from pairstate),
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
          'closer', m.closer,
          'showed_up_days', case when c.kind = 'pair' then coalesce((
            select jsonb_agg(d.day order by d.day) from (
              select distinct k.completion_date as day
              from vis v join public.habit_completions k on k.habit_id = v.habit_id
              where v.user_id = m.user_id and k.completion_date between m.today - 6 and m.today
            ) d
          ), '[]'::jsonb) else '[]'::jsonb end,
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
                'shows_misses', v.shows_misses,
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

  delete from public.reactions where circle_id = old.circle_id and (from_user = old.user_id or to_user = old.user_id);

  -- a pair is two people: when one goes, the pair goes (what each shared there is removed with it)
  delete from public.circles c where c.id = old.circle_id and c.kind = 'pair';

  update public.circles c
  set owner_id = (
    select m.user_id from public.circle_members m where m.circle_id = c.id order by m.joined_at, m.user_id limit 1
  )
  where c.id = old.circle_id and (c.owner_id is null or c.owner_id = old.user_id);

  delete from public.circles c
  where c.id = old.circle_id and not exists (select 1 from public.circle_members m where m.circle_id = c.id);

  return old;
end $$;

drop function public.send_cheer(uuid, uuid, date);
drop table public.cheers;

revoke execute on function public.circle_overview(uuid) from public, anon;
revoke execute on function public.circle_member_removed() from public, anon, authenticated;
grant execute on function public.circle_overview(uuid) to authenticated;
