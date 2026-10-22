-- Circles (slice 3): what the screens need that the first migration left out. Additive.
--
-- 1. The list of a person's circles, with how many people are in each. A member cannot read other members' rows
--    (that is the point of the security model), so the count has to come from a function.
-- 2. circle_overview now marks which member started the circle, so the circle page can say so and show the owner's
--    controls to the right person. It is the same function as before with one more field per member.

create function public.my_circles()
returns table (id uuid, name text, is_owner boolean, member_count integer)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.name,
    c.owner_id = (select auth.uid()),
    (select count(*)::int from public.circle_members x where x.circle_id = c.id)
  from public.circles c
  join public.circle_members m on m.circle_id = c.id and m.user_id = (select auth.uid())
  order by c.created_at, c.id
$$;

revoke execute on function public.my_circles() from public, anon;
grant execute on function public.my_circles() to authenticated;

-- The circle as the caller may see it. Per member: who they are, whether they showed up this week, and the habits they
-- share with the caller at Done today or higher (name and emoji only as far as the label allows). It never says what
-- was missed, never returns a habit id, and returns nothing for a member who has paused sharing. "Today" and "this
-- week" are the member's own, in their own timezone and week start. A habit shared at Streaks or Everything also carries
-- `data`: its start date, schedule rows, archive pauses and tick dates, which are the inputs of the domain's streak and
-- heatmap functions, so the friend's app computes them with the same rules as the owner's (docs/rules.md). That means
-- the API returns the same at Streaks as at Everything; the level decides what the app shows. Nothing below Streaks
-- ever carries dates. shortcut: every tick date is returned, not a window; limit it if a habit's history grows large.
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
           coalesce(o.level, s.level) as level,
           case when o.level is not null then o.label else s.label end as label,
           m.today, m.week_start
    from public.habits h
    join m on m.user_id = h.user_id and not m.paused
    left join public.habit_shares s on s.habit_id = h.id and s.circle_id = p_circle
    left join public.habit_share_overrides o on o.habit_id = h.id and o.circle_id = p_circle and o.viewer_id = v_uid
    where h.archived_at is null
      and h.user_id <> v_uid
      and coalesce(o.level, s.level) is not null
      and coalesce(o.level, s.level) <> 'hidden'
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
      'week_ticks', (select n from ticks)
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
          ) end
        ) order by m.joined_at, m.user_id
      ) from m
    ), '[]'::jsonb)
  ) into v_result
  from public.circles c where c.id = p_circle;

  return v_result;
end $$;

-- Replacing a function keeps its grants, but they are stated again so this file stands on its own.
revoke execute on function public.circle_overview(uuid) from public, anon;
grant execute on function public.circle_overview(uuid) to authenticated;
