-- Signing in by tag (1.0). Additive.
-- Supabase signs in with an email, and an anonymous caller must never be able to read an email from a tag. So the
-- database checks the password itself and hands the email back only when it matches. Failures are counted per tag
-- (five in 15 minutes lock it for the rest of that time), because this function must not be a way round Supabase's
-- own limits on password guesses. Unknown tags are counted the same way, so a lockout does not say whether a tag exists.

create table public.login_failures (
  tag text not null,
  at timestamptz not null default now()
);

create index login_failures_tag on public.login_failures (tag, at);

alter table public.login_failures enable row level security;
revoke all on public.login_failures from anon, authenticated;

create function public.login_email(p_tag text, p_password text)
returns table (email text, locked boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_tag text := lower(btrim(p_tag));
  v_email text;
  v_hash text;
begin
  delete from public.login_failures f where f.at < now() - interval '1 day';

  if (select count(*) from public.login_failures f where f.tag = v_tag and f.at > now() - interval '15 minutes') >= 5 then
    return query select null::text, true;
    return;
  end if;

  select u.email::text, u.encrypted_password into v_email, v_hash
  from public.profiles p join auth.users u on u.id = p.user_id
  where lower(p.tag) = v_tag;

  -- an unknown tag does the same work as a wrong password, so the time does not tell them apart
  if v_hash is null then
    v_hash := extensions.crypt('placeholder', extensions.gen_salt('bf'));
    v_email := null;
  end if;

  if extensions.crypt(p_password, v_hash) = v_hash and v_email is not null then
    delete from public.login_failures f where f.tag = v_tag;
    return query select v_email, false;
    return;
  end if;

  insert into public.login_failures (tag) values (v_tag);
  return query select null::text, false;
end $$;

revoke all on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;

-- Is a tag free to take? For the create-account form, before the account exists. It answers only yes or no.
create function public.tag_available(p_tag text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.valid_tag(lower(btrim(p_tag)))
    and not exists (select 1 from public.profiles where lower(tag) = lower(btrim(p_tag)))
$$;

revoke all on function public.tag_available(text) from public;
grant execute on function public.tag_available(text) to anon, authenticated;
