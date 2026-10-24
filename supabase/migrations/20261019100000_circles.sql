-- Circles (slice 1): the database for sharing habits with friends. Additive. Design: docs/superpowers/specs/2026-10-12-circles-design.md.
--
-- The rule that holds all of it together: other people never read habits, ticks, schedules or profiles directly. A
-- member sees another member only through circle_overview(), which returns the fields a share level allows and nothing
-- more. Every change to a Circles table goes through a function below; the tables have a select policy for the rows a
-- person owns or belongs to, and no insert, update or delete policy, so a direct write is refused.

-- Pausing sharing (one switch): while on, nobody sees anything, and the settings are kept.
alter table public.profiles add column circles_paused boolean not null default false;

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  -- null only while an owner's account is being deleted; circle_member_removed() hands the circle to the next member
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  -- does this person's week count towards the circle's week, and can friends cheer them
  in_week boolean not null default true,
  allow_cheers boolean not null default true,
  primary key (circle_id, user_id)
);
create index circle_members_user_id_idx on public.circle_members (user_id);

-- An invite is a random token; only its hash is stored, so a copy of the table opens no circle.
create table public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index circle_invites_circle_id_idx on public.circle_invites (circle_id);

-- How much of a habit a circle sees. No row means Hidden, so 'hidden' is never stored here.
create table public.habit_shares (
  habit_id uuid not null references public.habits (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  level text not null check (level in ('showed_up', 'done_today', 'streaks', 'everything')),
  label text not null default 'name' check (label in ('name', 'emoji', 'generic')),
  primary key (habit_id, circle_id)
);
create index habit_shares_circle_id_idx on public.habit_shares (circle_id);

-- One person's level for a habit, in place of the circle's. 'hidden' is stored here: it hides a habit from one person.
create table public.habit_share_overrides (
  habit_id uuid not null references public.habits (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  viewer_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('hidden', 'showed_up', 'done_today', 'streaks', 'everything')),
  label text not null default 'generic' check (label in ('name', 'emoji', 'generic')),
  primary key (habit_id, circle_id, viewer_id)
);
create index habit_share_overrides_circle_id_idx on public.habit_share_overrides (circle_id);

-- A cheer is for one person's day (their own today), one per sender per day.
create table public.cheers (
  circle_id uuid not null references public.circles (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  for_date date not null,
  created_at timestamptz not null default now(),
  primary key (circle_id, from_user, to_user, for_date),
  check (from_user <> to_user)
);
create index cheers_to_user_idx on public.cheers (to_user, for_date);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;
alter table public.habit_shares enable row level security;
alter table public.habit_share_overrides enable row level security;
alter table public.cheers enable row level security;

-- Is the caller in this circle? A function, because a policy on circle_members that read circle_members would recurse.
create function public.is_circle_member(p_circle uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.circle_members m where m.circle_id = p_circle and m.user_id = (select auth.uid())
  )
$$;
revoke execute on function public.is_circle_member(uuid) from public, anon;
grant execute on function public.is_circle_member(uuid) to authenticated;

-- Read-only policies. There are no insert, update or delete policies on purpose: the functions below do the writing.
create policy "my circles" on public.circles for select to authenticated
  using (public.is_circle_member(id));
create policy "my memberships" on public.circle_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "my shares" on public.habit_shares for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
create policy "my overrides" on public.habit_share_overrides for select to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
create policy "my cheers" on public.cheers for select to authenticated
  using (to_user = (select auth.uid()) or from_user = (select auth.uid()));
-- circle_invites has no policy at all: nobody reads it directly, not even the owner.

-- At most 8 people in a circle and 10 circles per person. The locks make two people joining at once safe.
create function public.circle_members_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('circle ' || new.circle_id::text));
  perform pg_advisory_xact_lock(hashtext('circle person ' || new.user_id::text));

  if (select count(*) from public.circle_members where circle_id = new.circle_id) >= 8 then
    raise exception 'circle_full';
  end if;
  if (select count(*) from public.circle_members where user_id = new.user_id) >= 10 then
    raise exception 'too_many_circles';
  end if;

  return new;
end $$;

create trigger circle_members_limits before insert on public.circle_members
  for each row execute function public.circle_members_limits();

-- Whenever someone stops being a member (leaving, being removed, a circle closing, an account deleted) what they shared
-- there goes with them, the circle passes to the earliest remaining member if it was theirs, and an empty circle is closed.
create function public.circle_member_removed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.habit_shares s using public.habits h
  where s.circle_id = old.circle_id and s.habit_id = h.id and h.user_id = old.user_id;

  delete from public.habit_share_overrides o
  where o.circle_id = old.circle_id
    and (o.viewer_id = old.user_id
      or exists (select 1 from public.habits h where h.id = o.habit_id and h.user_id = old.user_id));

  delete from public.cheers where circle_id = old.circle_id and (from_user = old.user_id or to_user = old.user_id);

  update public.circles c
  set owner_id = (
    select m.user_id from public.circle_members m where m.circle_id = c.id order by m.joined_at, m.user_id limit 1
  )
  where c.id = old.circle_id and (c.owner_id is null or c.owner_id = old.user_id);

  delete from public.circles c
  where c.id = old.circle_id and not exists (select 1 from public.circle_members m where m.circle_id = c.id);

  return old;
end $$;

create trigger circle_member_removed after delete on public.circle_members
  for each row execute function public.circle_member_removed();

-- Functions. Each checks who is asking, then does one thing. Errors are short codes the app translates.

create function public.create_circle(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if length(v_name) < 1 or length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;

  insert into public.circles (name, owner_id) values (v_name, v_uid) returning id into v_id;
  insert into public.circle_members (circle_id, user_id) values (v_id, v_uid);

  return v_id;
end $$;

-- Makes a new invite and cancels the old ones. The token is returned once and never stored.
create function public.create_invite(p_circle uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.circles where id = p_circle and owner_id = v_uid) then
    raise exception 'not_owner';
  end if;

  update public.circle_invites set revoked = true where circle_id = p_circle and not revoked;
  insert into public.circle_invites (circle_id, token_hash, expires_at)
  values (p_circle, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '7 days');

  return v_token;
end $$;

-- What an invite opens, for the "Join this circle?" screen: its name, and who is in it.
create function public.circle_invite_preview(p_token text) returns jsonb
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
      'full', (select count(*) from public.circle_members m where m.circle_id = c.id) >= 8,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object('tag', p.tag, 'display_name', p.display_name) order by m.joined_at, m.user_id)
        from public.circle_members m join public.profiles p on p.user_id = m.user_id
        where m.circle_id = c.id
      ), '[]'::jsonb)
    )
    from public.circles c where c.id = v_circle
  );
end $$;

create function public.join_circle(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_circle uuid;
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  select i.circle_id into v_circle from public.circle_invites i
  where i.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
    and not i.revoked and i.expires_at > now();
  if v_circle is null then
    raise exception 'invite_invalid';
  end if;
  if exists (select 1 from public.circle_members where circle_id = v_circle and user_id = v_uid) then
    raise exception 'already_member';
  end if;

  insert into public.circle_members (circle_id, user_id) values (v_circle, v_uid);

  return v_circle;
end $$;

create function public.leave_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  delete from public.circle_members where circle_id = p_circle and user_id = v_uid;
  if not found then
    raise exception 'not_a_member';
  end if;
end $$;

create function public.remove_member(p_circle uuid, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.circles where id = p_circle and owner_id = v_uid) then
    raise exception 'not_owner';
  end if;
  if p_user = v_uid then
    raise exception 'use_leave';
  end if;

  delete from public.circle_members where circle_id = p_circle and user_id = p_user;
  if not found then
    raise exception 'not_a_member';
  end if;
end $$;

create function public.delete_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.circles where id = p_circle and owner_id = v_uid) then
    raise exception 'not_owner';
  end if;

  delete from public.circles where id = p_circle;
end $$;

-- Sets how much of one of the caller's habits a circle sees. 'hidden' takes the share back.
create function public.set_share(p_habit uuid, p_circle uuid, p_level text, p_label text default 'name') returns void
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
  on conflict (habit_id, circle_id) do update set level = excluded.level, label = excluded.label;
end $$;

-- One person's level for a habit, in place of the circle's. 'inherit' removes it.
create function public.set_share_override(
  p_habit uuid, p_circle uuid, p_viewer uuid, p_level text, p_label text default 'generic'
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_level is null or p_level not in ('inherit', 'hidden', 'showed_up', 'done_today', 'streaks', 'everything') then
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
  if p_viewer = v_uid then
    raise exception 'invalid_viewer';
  end if;
  if not exists (select 1 from public.circle_members where circle_id = p_circle and user_id = p_viewer) then
    raise exception 'viewer_not_member';
  end if;

  if p_level = 'inherit' then
    delete from public.habit_share_overrides where habit_id = p_habit and circle_id = p_circle and viewer_id = p_viewer;
    return;
  end if;

  insert into public.habit_share_overrides (habit_id, circle_id, viewer_id, level, label)
  values (p_habit, p_circle, p_viewer, p_level, p_label)
  on conflict (habit_id, circle_id, viewer_id) do update set level = excluded.level, label = excluded.label;
end $$;

create function public.set_circle_prefs(p_circle uuid, p_in_week boolean, p_allow_cheers boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_signed_in';
  end if;

  update public.circle_members set in_week = coalesce(p_in_week, in_week), allow_cheers = coalesce(p_allow_cheers, allow_cheers)
  where circle_id = p_circle and user_id = v_uid;
  if not found then
    raise exception 'not_a_member';
  end if;
end $$;

-- A cheer for a friend's day. It is for their own today, and quietly the same cheer if sent twice.
create function public.send_cheer(p_circle uuid, p_to uuid, p_for date) returns void
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
    raise exception 'cannot_cheer_self';
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
  if p_for is distinct from v_today then
    raise exception 'cheer_date';
  end if;

  insert into public.cheers (circle_id, from_user, to_user, for_date)
  values (p_circle, v_uid, p_to, p_for)
  on conflict do nothing;
end $$;

-- The circle as the caller may see it. Per member: who they are, whether they showed up this week, and the habits they
-- share with the caller at Done today or higher (name and emoji only as far as the label allows). It never says what
-- was missed, never returns a habit id, and returns nothing for a member who has paused sharing. "Today" and "this
-- week" are the member's own, in their own timezone and week start. A habit shared at Streaks or Everything also carries
-- `data`: its start date, schedule rows, archive pauses and tick dates, which are the inputs of the domain's streak and
-- heatmap functions, so the friend's app computes them with the same rules as the owner's (docs/rules.md). That means
-- the API returns the same at Streaks as at Everything; the level decides what the app shows. Nothing below Streaks
-- ever carries dates. shortcut: every tick date is returned, not a window; limit it if a habit's history grows large.
create function public.circle_overview(p_circle uuid) returns jsonb
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

-- Only signed-in people run these; a signed-out visitor runs none.
revoke execute on function public.create_circle(text) from public, anon;
revoke execute on function public.create_invite(uuid) from public, anon;
revoke execute on function public.circle_invite_preview(text) from public, anon;
revoke execute on function public.join_circle(text) from public, anon;
revoke execute on function public.leave_circle(uuid) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.delete_circle(uuid) from public, anon;
revoke execute on function public.set_share(uuid, uuid, text, text) from public, anon;
revoke execute on function public.set_share_override(uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.set_circle_prefs(uuid, boolean, boolean) from public, anon;
revoke execute on function public.send_cheer(uuid, uuid, date) from public, anon;
revoke execute on function public.circle_overview(uuid) from public, anon;
revoke execute on function public.circle_members_limits() from public, anon, authenticated;
revoke execute on function public.circle_member_removed() from public, anon, authenticated;

grant execute on function public.create_circle(text) to authenticated;
grant execute on function public.create_invite(uuid) to authenticated;
grant execute on function public.circle_invite_preview(text) to authenticated;
grant execute on function public.join_circle(text) to authenticated;
grant execute on function public.leave_circle(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.delete_circle(uuid) to authenticated;
grant execute on function public.set_share(uuid, uuid, text, text) to authenticated;
grant execute on function public.set_share_override(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.set_circle_prefs(uuid, boolean, boolean) to authenticated;
grant execute on function public.send_cheer(uuid, uuid, date) to authenticated;
grant execute on function public.circle_overview(uuid) to authenticated;
