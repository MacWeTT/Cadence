begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.dev');

-- The table owner can read everything (the dashboard does the same); nobody else can.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

select lives_ok($$insert into public.contact_messages (message, anonymous) values ('Love the app', true)$$, 'a signed-in user can send an anonymous message');
select lives_ok($$insert into public.contact_messages (message, anonymous, user_id, name, email) values ('A bug', false, '00000000-0000-0000-0000-0000000000a1', 'Alice', 'a@test.dev')$$, 'and one that carries their identity');
select lives_ok($$insert into public.contact_messages (message, anonymous, user_id) values ('No reply address', false, '00000000-0000-0000-0000-0000000000a1')$$, 'a name and an email are optional');

select throws_ok($$insert into public.contact_messages (message, anonymous, user_id, name, email) values ('Pretend', false, '00000000-0000-0000-0000-0000000000b1', 'Bob', 'b@test.dev')$$, '42501', null, 'a message cannot be sent in someone else''s name');
select throws_ok($$insert into public.contact_messages (message, anonymous, user_id) values ('Leaky', true, '00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'an anonymous message cannot carry the sender''s account');
select throws_ok($$insert into public.contact_messages (message, anonymous, name) values ('Leaky', true, 'Alice')$$, '42501', null, 'nor a name');
select throws_ok($$insert into public.contact_messages (message, anonymous, email) values ('Leaky', true, 'a@test.dev')$$, '42501', null, 'nor an email');
select throws_ok($$insert into public.contact_messages (message, anonymous) values ('   ', true)$$, '23514', null, 'a blank message is rejected');
select throws_ok($$insert into public.contact_messages (message, anonymous) values (repeat('x', 2001), true)$$, '23514', null, 'a message over 2000 characters is rejected');

select is((select count(*) from public.contact_messages)::int, 0, 'the sender cannot read messages back, not even their own');

-- Signed out: nothing.
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

select throws_ok($$insert into public.contact_messages (message, anonymous) values ('Spam', true)$$, '42501', null, 'a signed-out visitor cannot send');
select is((select count(*) from public.contact_messages)::int, 0, 'and cannot read');

-- What was stored.
reset role;
select is((select count(*) from public.contact_messages where message in ('Love the app', 'A bug', 'No reply address'))::int, 3, 'three messages were stored');
select is((select count(*) from public.contact_messages where message = 'Love the app' and anonymous and user_id is null and name is null and email is null)::int, 1, 'the anonymous one has no identity at all');

select * from finish();
rollback;
