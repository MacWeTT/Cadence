-- Cadence initial schema: profiles, habits, effective-dated schedules, completions. See the design spec, section 4.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  week_starts_on smallint not null default 1 check (week_starts_on in (1, 7)),
  created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  icon text not null,
  color text not null,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index habits_user_id_idx on public.habits (user_id);

create table public.habit_schedules (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  kind text not null,
  times_per_week smallint,
  effective_from date not null,
  unique (habit_id, effective_from),
  check (
    (kind = 'daily' and times_per_week is null)
    or (kind = 'weekly_count' and times_per_week between 1 and 6)
  )
);

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completion_date)
);

-- Keep habits.updated_at current.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger habits_set_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

-- Every new sign-in gets a profile, filled from Google's metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: each user sees and changes only their own rows.
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.habit_completions enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own habits" on public.habits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own habit schedules" on public.habit_schedules for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));

create policy "own habit completions" on public.habit_completions for all to authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  with check (exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())));
