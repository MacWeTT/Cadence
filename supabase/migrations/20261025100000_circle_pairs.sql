-- Circles (partners): a pair is a circle of two, with a Closer mode that both people turn on and a per-habit choice
-- to show off days. See docs/superpowers/specs/2026-10-23-circles-partners-design.md.
--
-- 1. circles.kind ('group' or 'pair'). A pair holds two people and ends when one of them goes.
-- 2. circle_members.closer: one switch per person. Closer is active only when both are on, and either person turning it
--    off ends it for both.
-- 3. habit_shares.shows_misses: the owner's choice, for a habit shared at Everything in a pair. circle_overview says a
--    habit `shows_misses` only when the circle is a pair, Closer is active, the owner ticked it, and the level for the
--    viewer is Everything. The overview still carries no field about what was missed: the screens work that out, and
--    only when this flag is true.
-- 4. The list says which circles are pairs and names the partner; an invite says what it is for.

alter table public.circles
  add column kind text not null default 'group' check (kind in ('group', 'pair'));
alter table public.circle_members
  add column closer boolean not null default false;
alter table public.habit_shares
  add column shows_misses boolean not null default false;

create function public.create_pair() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  insert into public.circles (name, owner_id, kind) values ('Partners', v_uid, 'pair') returning id into v_id;
  insert into public.circle_members (circle_id, user_id) values (v_id, v_uid);

  return v_id;
end $$;

-- At most 8 people in a group, 2 in a pair, and 10 circles per person. The locks make two people joining at once safe.
create or replace function public.circle_members_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_max integer := case when (select c.kind from public.circles c where c.id = new.circle_id) = 'pair' then 2 else 8 end;
begin
  perform pg_advisory_xact_lock(hashtext('circle ' || new.circle_id::text));
  perform pg_advisory_xact_lock(hashtext('circle person ' || new.user_id::text));

  if (select count(*) from public.circle_members where circle_id = new.circle_id) >= v_max then
    raise exception 'circle_full';
  end if;
  if (select count(*) from public.circle_members where user_id = new.user_id) >= 10 then
    raise exception 'too_many_circles';
  end if;

  return new;
end $$;

create function public.set_closer(p_circle uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not public.is_circle_member(p_circle) then
    raise exception 'not_a_member';
  end if;
  if (select c.kind from public.circles c where c.id = p_circle) <> 'pair' then
    raise exception 'not_a_pair';
  end if;

  update public.circle_members set closer = coalesce(p_on, false) where circle_id = p_circle and user_id = v_uid;
end $$;

create function public.set_share_misses(p_habit uuid, p_circle uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.habits where id = p_habit and user_id = v_uid) then
    raise exception 'not_your_habit';
  end if;
  if not public.is_circle_member(p_circle) then
    raise exception 'not_a_member';
  end if;
  if (select c.kind from public.circles c where c.id = p_circle) <> 'pair' then
    raise exception 'not_a_pair';
  end if;
  if not exists (select 1 from public.habit_shares where habit_id = p_habit and circle_id = p_circle and level = 'everything') then
    raise exception 'level_not_everything';
  end if;

  update public.habit_shares set shows_misses = coalesce(p_on, false) where habit_id = p_habit and circle_id = p_circle;
end $$;

create or replace function public.set_share(p_habit uuid, p_circle uuid, p_level text, p_label text default 'name') returns void
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
  if p_label is null or p_label not in ('name', 'emoji', 'generic') then
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
  values (p_habit, p_circle, p_level, p_label)
  on conflict (habit_id, circle_id) do update set level = excluded.level, label = excluded.label,
    shows_misses = case when excluded.level = 'everything' then public.habit_shares.shows_misses else false end;
end $$;

drop function public.my_circles();
create function public.my_circles()
returns table (
  id uuid, name text, is_owner boolean, member_count integer, color text, pinned boolean,
  kind text, partner_name text, partner_tag text
)
language sql stable security definer set search_path = '' as $$
  select
    c.id,
    c.name,
    c.owner_id = (select auth.uid()),
    (select count(*)::int from public.circle_members x where x.circle_id = c.id),
    m.color,
    m.pinned,
    c.kind,
    partner.display_name,
    partner.tag
  from public.circles c
  join public.circle_members m on m.circle_id = c.id and m.user_id = (select auth.uid())
  left join lateral (
    select p.display_name, p.tag
    from public.circle_members x join public.profiles p on p.user_id = x.user_id
    where x.circle_id = c.id and x.user_id <> (select auth.uid()) and c.kind = 'pair'
    limit 1
  ) partner on true
  order by m.pinned desc, c.created_at, c.id
$$;

create or replace function public.circle_invite_preview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_circle uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not_signed_in';
  end if;

  select i.circle_id into v_circle from public.circle_invites i
  where i.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    and not i.revoked and i.expires_at > now();
  if v_circle is null then
    raise exception 'invite_invalid';
  end if;

  return (
    select jsonb_build_object(
      'name', c.name,
      'kind', c.kind,
      'full', (select count(*) from public.circle_members m where m.circle_id = c.id) >= case when c.kind = 'pair' then 2 else 8 end,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object('tag', p.tag, 'display_name', p.display_name) order by m.joined_at, m.user_id)
        from public.circle_members m join public.profiles p on p.user_id = m.user_id
        where m.circle_id = c.id
      ), '[]'::jsonb)
    )
    from public.circles c where c.id = v_circle
  );
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

revoke execute on function public.create_pair() from public, anon;
revoke execute on function public.set_closer(uuid, boolean) from public, anon;
revoke execute on function public.set_share_misses(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_share(uuid, uuid, text, text) from public, anon;
revoke execute on function public.my_circles() from public, anon;
revoke execute on function public.circle_invite_preview(text) from public, anon;
revoke execute on function public.circle_overview(uuid) from public, anon;
revoke execute on function public.circle_members_limits() from public, anon, authenticated;
revoke execute on function public.circle_member_removed() from public, anon, authenticated;

grant execute on function public.create_pair() to authenticated;
grant execute on function public.set_closer(uuid, boolean) to authenticated;
grant execute on function public.set_share_misses(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_share(uuid, uuid, text, text) to authenticated;
grant execute on function public.my_circles() to authenticated;
grant execute on function public.circle_invite_preview(text) to authenticated;
grant execute on function public.circle_overview(uuid) to authenticated;
