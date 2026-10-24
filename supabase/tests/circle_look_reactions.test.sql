begin;
select plan(36);

-- A starts a circle, B joins, C stays outside. Everyone's timezone is the default (UTC).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev');

select is((select count(*)::int from unnest(array['public.set_circle_look(uuid, text, boolean)', 'public.react(uuid, uuid, date, text, boolean)']) s where has_function_privilege('anon', s, 'execute')), 0, 'a signed-out visitor can neither style a circle nor react');
select is((select count(*)::int from unnest(array['public.set_circle_look(uuid, text, boolean)', 'public.react(uuid, uuid, date, text, boolean)']) s where has_function_privilege('authenticated', s, 'execute')), 2, 'a signed-in person can do both');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c1', public.create_circle('Study group')::text, true);
select set_config('t.tok', public.create_invite(current_setting('t.c1')::uuid), true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));

-- the look of a circle is each person's own
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select color from public.my_circles()), 'moss', 'a circle starts with the first colour');
select is((select pinned from public.my_circles()), false, 'and is not pinned');
select lives_ok($$select public.set_circle_look(current_setting('t.c1')::uuid, 'sky', true)$$, 'a member can colour and pin a circle');
select is((select color from public.my_circles()), 'sky', 'the colour is kept');
select is((select pinned from public.my_circles()), true, 'and so is the pin');
select is((public.circle_overview(current_setting('t.c1')::uuid) -> 'circle' ->> 'color'), 'sky', 'the circle page carries the colour');
select is((public.circle_overview(current_setting('t.c1')::uuid) -> 'circle' ->> 'pinned')::boolean, true, 'and the pin');
select throws_ok($$select public.set_circle_look(current_setting('t.c1')::uuid, 'neon', false)$$, 'P0001', 'invalid_color', 'only the app''s colours are accepted');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select color from public.my_circles()), 'moss', 'a friend''s colour for the same circle is their own');
select is((select pinned from public.my_circles()), false, 'and so is their pin');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$select public.set_circle_look(current_setting('t.c1')::uuid, 'sky', true)$$, 'P0001', 'not_a_member', 'someone outside cannot style it');

-- pinned circles list first
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c2', public.create_circle('Second')::text, true);
select is((select name from public.my_circles() limit 1), 'Study group', 'the pinned circle is listed first');

-- your own entry shows your own habits as the circle sees them, so you can see your day and its reactions
reset role;
insert into public.habits (id, user_id, name, icon, color, start_date)
values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', 'x', 'moss', '2026-01-01');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'done_today', 'name');
select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'hidden', 'generic');
select is((select jsonb_array_length(e -> 'habits') from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'is_you' = 'true'), 1, 'your own entry carries your shared habit');
select is((select e -> 'habits' -> 0 ->> 'name' from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'is_you' = 'true'), 'Read', 'as the circle sees it');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select jsonb_array_length(e -> 'habits') from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), 0, 'a person hidden from by an override still sees nothing');
select is((select count(*)::int from public.habit_shares), 0, 'and a friend still cannot read the share table');

-- reactions: for a friend's day, any of four emoji, seen by the circle
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select lives_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '🔥', true)$$, 'a member can react to a friend''s day');
select lives_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '🔥', true)$$, 'reacting twice is quietly the same reaction');
select set_config('t.a', (select e::text from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), true);
select is(jsonb_array_length(current_setting('t.a')::jsonb -> 'reactions'), 1, 'one reaction is on the friend''s day, and the circle sees it');
select is((current_setting('t.a')::jsonb -> 'reactions' -> 0 ->> 'emoji'), '🔥', 'it says which emoji');

select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', (now() at time zone 'UTC')::date, '🔥', true)$$, 'P0001', 'cannot_react_self', 'you cannot react to yourself');
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '😈', true)$$, 'P0001', 'invalid_emoji', 'only the four emoji are allowed');
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', ((now() at time zone 'UTC')::date - 7), '🔥', true)$$, 'P0001', 'react_date', 'a day more than a week back is closed');
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', ((now() at time zone 'UTC')::date + 1), '🔥', true)$$, 'P0001', 'react_date', 'and so is a day that has not come');
select lives_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', ((now() at time zone 'UTC')::date - 6), '👏', true)$$, 'the last week is open');

select is((select count(*)::int from public.reactions), 0, 'nobody reads the table directly, only through the circle');
select throws_ok($$insert into public.reactions (circle_id, from_user, to_user, for_date, emoji) values (current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '❤️')$$, '42501', null, 'and nobody writes it directly');

select lives_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '🔥', false)$$, 'a reaction can be taken back');
select is((select jsonb_array_length(e -> 'reactions') from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), 1, 'taking it back removes only that one');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '🔥', true)$$, 'P0001', 'not_a_member', 'someone outside cannot react');

-- the person's own choices: cheers off, and a pause
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_circle_prefs(current_setting('t.c1')::uuid, true, false);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '❤️', true)$$, 'P0001', 'cheers_off', 'a friend who turned cheers off gets no reactions');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_circle_prefs(current_setting('t.c1')::uuid, true, true);
update public.profiles set circles_paused = true where user_id = '00000000-0000-0000-0000-0000000000a1';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$select public.react(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date, '❤️', true)$$, 'P0001', 'cheers_off', 'a friend who paused sharing gets no reactions');
select is((select jsonb_array_length(e -> 'reactions') from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), 0, 'and their reactions are not shown while they are paused');

-- leaving takes your reactions with you
select public.leave_circle(current_setting('t.c1')::uuid);
reset role;
select is((select count(*)::int from public.reactions where from_user = '00000000-0000-0000-0000-0000000000b2'), 0, 'someone who leaves a circle takes their reactions away');

select * from finish();
rollback;
