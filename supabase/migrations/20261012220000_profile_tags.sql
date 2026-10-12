-- Tags (0.9): every account has a tag, @name, unique whatever the case. Additive.
-- The default is the GitHub username for a GitHub account, otherwise the part of the email before the @.

-- 3 to 30 lowercase letters, digits and underscores, and not a reserved word (the app checks the same rules first).
create function public.valid_tag(p_tag text) returns boolean
language sql immutable set search_path = '' as $$
  select p_tag ~ '^[a-z0-9_]{3,30}$'
    and p_tag <> all (array['admin', 'cadence', 'support', 'help', 'me', 'root', 'system', 'staff', 'official', 'null', 'undefined'])
$$;

alter table public.profiles add column tag text;

-- A free tag from a starting point: dots and dashes become underscores, anything else not allowed is dropped, a short result
-- is padded, and a taken, reserved or too long one gets a number (name_2, name_3, ...) that still fits in thirty characters.
create function public.free_tag(p_base text) returns text
language plpgsql set search_path = '' as $$
declare
  v_base text := regexp_replace(lower(coalesce(p_base, '')), '[.-]', '_', 'g');
  v_n int := 1;
  v_suffix text;
  v_candidate text;
begin
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if length(v_base) < 3 then
    v_base := 'user' || v_base;
  end if;

  loop
    v_suffix := case when v_n = 1 then '' else '_' || v_n end;
    v_candidate := left(v_base, 30 - length(v_suffix)) || v_suffix;
    exit when public.valid_tag(v_candidate) and not exists (select 1 from public.profiles where tag = v_candidate);
    v_n := v_n + 1;
  end loop;

  return v_candidate;
end $$;

revoke execute on function public.free_tag(text) from public, anon, authenticated;

-- Everyone who already has an account gets a tag, oldest first, one at a time so none clash.
do $$
declare
  r record;
begin
  for r in
    select p.user_id, u.email, u.raw_user_meta_data
    from public.profiles p join auth.users u on u.id = p.user_id
    order by p.created_at, p.user_id
  loop
    update public.profiles
      set tag = public.free_tag(
        coalesce(
          nullif(r.raw_user_meta_data ->> 'user_name', ''),
          nullif(r.raw_user_meta_data ->> 'preferred_username', ''),
          split_part(coalesce(r.email, ''), '@', 1)
        )
      )
      where user_id = r.user_id;
  end loop;
end $$;

alter table public.profiles alter column tag set not null;
alter table public.profiles add constraint profiles_tag_check check (public.valid_tag(tag));
create unique index profiles_tag_key on public.profiles (lower(tag));

-- New accounts get a tag too. The lock keeps two sign-ups at the same moment from choosing the same one.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('profile tags'));

  insert into public.profiles (user_id, display_name, avatar_url, tag)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    public.free_tag(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'user_name', ''),
        nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
        split_part(coalesce(new.email, ''), '@', 1)
      )
    )
  );
  return new;
end $$;
