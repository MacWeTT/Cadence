-- Messages sent from the contact form. They are only ever read in the Supabase dashboard (or with the service key):
-- there is no select policy, so the app itself, and the sender, cannot read them back.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  message text not null check (length(btrim(message)) > 0 and length(message) <= 2000),
  anonymous boolean not null default false,
  -- Only for a message that is not anonymous: who sent it, and where to answer.
  user_id uuid references auth.users (id) on delete set null,
  name text check (length(name) <= 80),
  email text check (length(email) <= 254)
);

alter table public.contact_messages enable row level security;

-- A signed-in user can send, as themselves or with nothing attached. An anonymous message carries no account, name or email.
create policy "send a contact message" on public.contact_messages
  for insert to authenticated
  with check (
    (anonymous and user_id is null and name is null and email is null)
    or (not anonymous and user_id = (select auth.uid()))
  );
