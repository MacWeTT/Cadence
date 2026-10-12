-- Focus sessions (0.7): a timer per habit, free or pomodoro. Additive.

-- The database clock is the only clock: the app reads it to count down and to close a session.
create function public.server_now() returns timestamptz
language sql stable set search_path = '' as $$
  select now()
$$;

-- A check constraint cannot hold a subquery, so the plan limits live in a function (same limits as src/domain/focus.ts).
create function public.valid_focus_plan(p_plan jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(
    jsonb_typeof(p_plan) = 'object'
    and (select count(*) from jsonb_object_keys(p_plan)) = 4
    and jsonb_typeof(p_plan -> 'focusMin') = 'number' and (p_plan ->> 'focusMin') ~ '^[0-9]+$'
    and jsonb_typeof(p_plan -> 'breakMin') = 'number' and (p_plan ->> 'breakMin') ~ '^[0-9]+$'
    and jsonb_typeof(p_plan -> 'longBreakMin') = 'number' and (p_plan ->> 'longBreakMin') ~ '^[0-9]+$'
    and jsonb_typeof(p_plan -> 'rounds') = 'number' and (p_plan ->> 'rounds') ~ '^[0-9]+$'
    and (p_plan ->> 'focusMin')::int between 1 and 180
    and (p_plan ->> 'breakMin')::int between 1 and 60
    and (p_plan ->> 'longBreakMin')::int between 1 and 60
    and (p_plan ->> 'rounds')::int between 1 and 12,
    false
  )
$$;

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  mode text not null check (mode in ('free', 'pomodoro')),
  plan jsonb,
  skipped_seconds int not null default 0 check (skipped_seconds >= 0),
  focus_seconds int check (focus_seconds >= 0),
  constraint focus_sessions_plan_matches_mode check (
    (mode = 'free' and plan is null and skipped_seconds = 0)
    or (mode = 'pomodoro' and public.valid_focus_plan(plan))
  ),
  constraint focus_sessions_ended_after_start check (ended_at is null or ended_at >= started_at)
);

-- One running session per person.
create unique index focus_sessions_one_running on public.focus_sessions (user_id) where ended_at is null;
create index focus_sessions_habit on public.focus_sessions (habit_id, started_at desc);
create index focus_sessions_user_started on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

create policy "own focus sessions" on public.focus_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
