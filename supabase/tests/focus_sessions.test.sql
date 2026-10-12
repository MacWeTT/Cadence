begin;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'Write', '✍️', 'moss', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'Run', '🏃', 'moss', '2026-10-01');

-- constraints (as the table owner, before row-level security is in play)
select lives_ok($$insert into public.focus_sessions (user_id, habit_id, mode, ended_at, focus_seconds) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', now(), 600)$$, 'a finished free session is accepted');
select lives_ok($$insert into public.focus_sessions (user_id, habit_id, mode, plan, ended_at, focus_seconds) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'pomodoro', '{"focusMin":25,"breakMin":5,"longBreakMin":15,"rounds":4}', now(), 1500)$$, 'a finished pomodoro session is accepted');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode, plan) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', '{"focusMin":25,"breakMin":5,"longBreakMin":15,"rounds":4}')$$, '23514', null, 'a free session with a plan is rejected');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'pomodoro')$$, '23514', null, 'a pomodoro session without a plan is rejected');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode, plan) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'pomodoro', '{"focusMin":181,"breakMin":5,"longBreakMin":15,"rounds":4}')$$, '23514', null, 'a plan outside the limits is rejected');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode, focus_seconds, ended_at) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', -1, now())$$, '23514', null, 'negative focus seconds are rejected');

-- the sound chosen for a session: nothing (the default), a built-in sound, or one of the person's own sounds
select lives_ok($$insert into public.focus_sessions (user_id, habit_id, mode, ended_at, focus_seconds, sound_id) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', now(), 600, 'marimba')$$, 'a built-in sound is accepted');
select lives_ok($$insert into public.focus_sessions (user_id, habit_id, mode, ended_at, focus_seconds, sound_id) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', now(), 600, '3f2b6c3e-1a2b-4c5d-8e9f-0a1b2c3d4e5f')$$, 'a custom sound id is accepted');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode, ended_at, focus_seconds, sound_id) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free', now(), 600, 'airhorn')$$, '23514', null, 'an unknown sound is rejected');
delete from public.focus_sessions where sound_id is not null;

-- one running session per person
insert into public.focus_sessions (user_id, habit_id, mode) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a1', 'free');
select throws_ok($$insert into public.focus_sessions (user_id, habit_id, mode) values ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a2', 'free')$$, '23505', null, 'a second running session is rejected');
select lives_ok($$insert into public.focus_sessions (user_id, habit_id, mode) values ('00000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b1', 'free')$$, 'another person can run their own');

-- row-level security, as person A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from public.focus_sessions), 3, 'a person sees only their own sessions');
select throws_ok($$insert into public.focus_sessions (habit_id, mode, ended_at, focus_seconds) values ('10000000-0000-0000-0000-0000000000b1', 'free', now(), 100)$$, '42501', null, 'a session on someone else''s habit is rejected');
select isnt(public.server_now(), null, 'the database clock can be read');

reset role;

-- cascade
delete from public.habits where id = '10000000-0000-0000-0000-0000000000a1';
select is((select count(*)::int from public.focus_sessions where habit_id = '10000000-0000-0000-0000-0000000000a1'), 0, 'deleting a habit removes its sessions');

select * from finish();
rollback;
