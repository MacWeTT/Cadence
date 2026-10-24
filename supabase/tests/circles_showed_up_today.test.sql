begin;
select plan(9);

-- A is you. B showed up today, C shared a habit but has not ticked it, D shares with nobody you share a circle with.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.dev');

insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mine', 'x', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'B', 'x', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c3', 'C', 'x', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d4', 'D', 'x', 'moss', '2026-01-01');
insert into public.habit_completions (habit_id, completion_date) values
  ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000b1', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000d1', (now() at time zone 'UTC')::date);

select set_config('t.tag_a', (select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), true);
select set_config('t.tag_b', (select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000b2'), true);

select is((select count(*)::int from unnest(array['public.circles_showed_up_today()']) s where has_function_privilege('anon', s, 'execute')), 0, 'a signed-out visitor cannot ask who showed up');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c1', public.create_circle('Study group')::text, true);
select set_config('t.tok', public.create_invite(current_setting('t.c1')::uuid), true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));
select public.set_share('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, 'showed_up');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));
select public.set_share('10000000-0000-0000-0000-0000000000c1', current_setting('t.c1')::uuid, 'done_today');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}', true);
select set_config('t.c2', public.create_circle('Elsewhere')::text, true);
select public.set_share('10000000-0000-0000-0000-0000000000d1', current_setting('t.c2')::uuid, 'everything');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 1, 'only the friend who ticked a shared habit today is listed');
select is((select tag from public.circles_showed_up_today()), current_setting('t.tag_b'), 'that is B, by their tag');
select is((select count(*)::int from public.circles_showed_up_today() where tag = current_setting('t.tag_a')), 0, 'you are never listed');

-- B takes the habit back from A alone
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.set_share_override('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', 'hidden');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 0, 'a friend who hid the habit from you is not listed');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.set_share_override('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', 'inherit');

-- B pauses sharing
update public.profiles set circles_paused = true where user_id = '00000000-0000-0000-0000-0000000000b2';
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 0, 'a friend who paused sharing is not listed');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
update public.profiles set circles_paused = false where user_id = '00000000-0000-0000-0000-0000000000b2';

-- the same friend in two circles is one line, not two
select set_config('t.c3', public.create_circle('Second group')::text, true);
select set_config('t.tok3', public.create_invite(current_setting('t.c3')::uuid), true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok3'));
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.set_share('10000000-0000-0000-0000-0000000000b1', current_setting('t.c3')::uuid, 'streaks');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 1, 'a friend you share two circles with is listed once');

-- yesterday does not count
reset role;
update public.habit_completions set completion_date = completion_date - 1 where habit_id = '10000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 0, 'a tick from yesterday does not count as today');

-- an archived habit does not count
reset role;
update public.habit_completions set completion_date = completion_date + 1 where habit_id = '10000000-0000-0000-0000-0000000000b1';
update public.habits set archived_at = now() where id = '10000000-0000-0000-0000-0000000000b1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.circles_showed_up_today()), 0, 'an archived habit does not count');

select * from finish();
rollback;
