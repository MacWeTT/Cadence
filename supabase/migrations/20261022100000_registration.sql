-- Registration (1.0): a first Google or GitHub sign-in ends on a register screen (tag and password). Additive.

-- `registered_at` is empty until the person has been through the register screen (or made the account with an email,
-- which asks for the same things). `password_set` says whether the account has a password to sign in with.
alter table public.profiles
  add column registered_at timestamptz,
  add column password_set boolean not null default false;

-- Everyone who already has an account is registered: nobody is sent to the new screen. The ones who have an email
-- identity already have a password; the others (Google only) are told on their profile, and nowhere else.
update public.profiles set registered_at = now();

update public.profiles p set password_set = true
where exists (select 1 from auth.identities i where i.user_id = p.user_id and i.provider = 'email');
