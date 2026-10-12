-- The profile page (0.8): the avatar and the focus sound on the account, up to six custom sounds, and two private
-- storage buckets for the files. Additive.

alter table public.profiles
  add column avatar_kind text not null default 'google'
    constraint profiles_avatar_kind_check check (avatar_kind in ('google', 'character', 'emoji', 'photo')),
  add column avatar_value text,
  add column avatar_color text
    constraint profiles_avatar_color_check check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  -- a built-in sound name, or the id of one of the person's own custom sounds (ownership is checked by the app)
  add column sound_id text not null default 'bell'
    constraint profiles_sound_id_check check (
      sound_id in ('bell', 'marimba', 'wood', 'beep', 'rising', 'silent')
      or sound_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
  add column sound_volume real not null default 0.6
    constraint profiles_sound_volume_check check (sound_volume between 0 and 1),
  add constraint profiles_avatar_value_check check (avatar_kind = 'google' or avatar_value is not null);

create table public.custom_sounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 40),
  path text not null,
  duration_ms int not null check (duration_ms between 1 and 5000),
  created_at timestamptz not null default now()
);
create index custom_sounds_user on public.custom_sounds (user_id, created_at);

alter table public.custom_sounds enable row level security;

create policy "own custom sounds" on public.custom_sounds for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- At most six per person. The lock keeps two uploads at the same moment from both getting in.
create function public.check_custom_sound_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  if (select count(*) from public.custom_sounds where user_id = new.user_id) >= 6 then
    raise exception 'sound_limit';
  end if;
  return new;
end $$;

create trigger custom_sounds_limit before insert on public.custom_sounds
  for each row execute function public.check_custom_sound_limit();

-- Removing the sound in use puts the Bell back.
create function public.reset_removed_sound() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set sound_id = 'bell' where user_id = old.user_id and sound_id = old.id::text;
  return old;
end $$;

revoke execute on function public.reset_removed_sound() from public, anon, authenticated;

create trigger custom_sounds_reset after delete on public.custom_sounds
  for each row execute function public.reset_removed_sound();

-- Private buckets: a person reads and writes only inside their own folder ({user id}/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('sounds', 'sounds', false, 512000, array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg'])
on conflict (id) do nothing;

create policy "own avatar files" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "own sound files" on storage.objects for all to authenticated
  using (bucket_id = 'sounds' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'sounds' and (storage.foldername(name))[1] = (select auth.uid())::text);
