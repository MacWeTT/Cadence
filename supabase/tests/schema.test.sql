begin;
select plan(22);

-- Two users. The trigger on auth.users must create their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev', '{"full_name":"Alice","avatar_url":"https://example.com/a.png"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.dev', '{}');

select is((select display_name from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'Alice', 'profile takes the name from sign-in metadata');
select is((select avatar_url from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'https://example.com/a.png', 'profile takes the avatar from sign-in metadata');
select is((select timezone from public.profiles where user_id = '00000000-0000-0000-0000-0000000000b1'), 'UTC', 'timezone defaults to UTC');
select is((select week_starts_on from public.profiles where user_id = '00000000-0000-0000-0000-0000000000b1')::int, 1, 'week starts on Monday by default');

-- One habit each, with a schedule and a completion.
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Run', '🏃', 'clay', '2026-10-01');
insert into public.habit_schedules (habit_id, kind, effective_from) values
  ('10000000-0000-0000-0000-0000000000a1', 'daily', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', 'daily', '2026-10-01');
insert into public.habit_completions (habit_id, completion_date) values
  ('10000000-0000-0000-0000-0000000000a1', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', '2026-10-01');

-- Constraints (run as the table owner, against B's habit).
select throws_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000b1', '2026-10-01')$$, '23505', null, 'a second completion for the same habit and date is rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from) values ('10000000-0000-0000-0000-0000000000b1', 'weekly_count', 7, '2026-10-05')$$, '23514', null, '7 per week is rejected (that is daily)');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from) values ('10000000-0000-0000-0000-0000000000b1', 'weekly_count', 0, '2026-10-05')$$, '23514', null, '0 per week is rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from) values ('10000000-0000-0000-0000-0000000000b1', 'daily', 3, '2026-10-05')$$, '23514', null, 'a daily schedule cannot carry times_per_week');
select lives_ok($$insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from) values ('10000000-0000-0000-0000-0000000000b1', 'weekly_count', 3, '2026-10-05')$$, '3 per week is accepted');
select throws_ok($$insert into public.habits (user_id, name, icon, color, start_date) values ('00000000-0000-0000-0000-0000000000b1', '   ', 'x', 'moss', '2026-10-01')$$, '23514', null, 'a blank habit name is rejected');
select throws_ok($$update public.profiles set week_starts_on = 3 where user_id = '00000000-0000-0000-0000-0000000000b1'$$, '23514', null, 'week_starts_on must be 1 or 7');

-- Row-level security: act as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

select is((select count(*) from public.habits)::int, 1, 'Alice sees only her own habit');
select is((select count(*) from public.habit_schedules)::int, 1, 'Alice sees only her own schedules');
select is((select count(*) from public.habit_completions)::int, 1, 'Alice sees only her own completions');
select is((select count(*) from public.profiles)::int, 1, 'Alice sees only her own profile');
select is_empty($$update public.habits set name = 'hacked' where id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'Alice cannot update Bob''s habit');
select is_empty($$delete from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'Alice cannot delete Bob''s completion');
select throws_ok($$insert into public.habits (user_id, name, icon, color, start_date) values ('00000000-0000-0000-0000-0000000000b1', 'Sneaky', 'x', 'moss', '2026-10-01')$$, '42501', null, 'Alice cannot create a habit for Bob');
select throws_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000b1', '2026-10-02')$$, '42501', null, 'Alice cannot tick Bob''s habit');
select lives_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a1', '2026-10-02')$$, 'Alice can tick her own habit');

-- Cascade: deleting a habit removes its schedules and completions.
reset role;
delete from public.habits where id = '10000000-0000-0000-0000-0000000000b1';
select is((select count(*) from public.habit_schedules where habit_id = '10000000-0000-0000-0000-0000000000b1')::int, 0, 'deleting a habit removes its schedules');
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000b1')::int, 0, 'deleting a habit removes its completions');

select * from finish();
rollback;
