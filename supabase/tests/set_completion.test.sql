begin;
select plan(22);

-- Alice (A) and Bob (B), one habit each, both starting 2026-10-01. "Today" is 2026-10-09.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Run', '🏃', 'clay', '2026-10-01');
insert into public.habit_schedules (habit_id, kind, effective_from) values
  ('10000000-0000-0000-0000-0000000000a1', 'daily', '2026-10-01'),
  ('10000000-0000-0000-0000-0000000000b1', 'daily', '2026-10-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

-- Ticking and unticking are idempotent.
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-05', true, '2026-10-09')$$, 'a tick works');
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000a1' and completion_date = '2026-10-05')::int, 1, 'and creates one row');
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-05', true, '2026-10-09')$$, 'ticking again is fine');
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000a1' and completion_date = '2026-10-05')::int, 1, 'and still one row');
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-05', false, '2026-10-09')$$, 'an untick works');
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000a1' and completion_date = '2026-10-05')::int, 0, 'and removes the row');
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-05', false, '2026-10-09')$$, 'unticking again is fine');

-- The day rules.
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-09', true, '2026-10-09')$$, 'today can be ticked');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-10', true, '2026-10-09')$$, 'P0001', 'date_in_future', 'a future day is refused');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-09-30', true, '2026-10-09')$$, 'P0001', 'before_start', 'a day before the start date is refused');
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-01', true, '2026-10-09')$$, 'the start date itself can be ticked');

-- Archived habits cannot be ticked or unticked; restoring keeps earlier ticks.
select lives_ok($$select public.archive_habit('10000000-0000-0000-0000-0000000000a1', '2026-10-09')$$, 'archive');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-08', true, '2026-10-09')$$, 'P0001', 'habit_archived', 'an archived habit cannot be ticked');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-09', false, '2026-10-09')$$, 'P0001', 'habit_archived', 'or unticked');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-20', true, '2026-10-09')$$, 'P0001', 'habit_archived', 'the archived check comes before the date checks');
select lives_ok($$select public.restore_habit('10000000-0000-0000-0000-0000000000a1', '2026-10-09')$$, 'restore');
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000a1')::int, 2, 'the earlier ticks are still there');
select lives_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-08', true, '2026-10-09')$$, 'ticking works again after the restore');

-- Other people's and missing habits.
select throws_ok($$select public.set_completion('99999999-9999-9999-9999-999999999999', '2026-10-05', true, '2026-10-09')$$, 'P0001', 'habit_not_found', 'a missing habit is refused');
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000b1', '2026-10-05', true, '2026-10-09')$$, 'P0001', 'habit_not_found', 'Bob''s habit looks missing to Alice');

-- The anon role cannot call it.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select public.set_completion('10000000-0000-0000-0000-0000000000a1', '2026-10-05', true, '2026-10-09')$$, '42501', null, 'anon cannot call set_completion');

-- Bob's habit gained nothing from any of this.
reset role;
select is((select count(*) from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000b1')::int, 0, 'Bob has no completions');

select * from finish();
rollback;
