begin;
select plan(5);

-- Alice (A) has one habit that started 2026-10-01 and one archived habit. Direct writes, bypassing set_completion.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date, archived_at) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01', null),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'Old', '📖', 'clay', '2026-10-01', now());

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

select lives_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a1', '2026-10-02')$$, 'a past day after the start is fine');
select throws_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a1', '2999-01-01')$$, 'P0001', 'date_in_future', 'a future day is refused even without set_completion');
select throws_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a1', '2026-09-30')$$, 'P0001', 'before_start', 'a day before the start is refused');
select throws_ok($$insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a2', '2026-10-02')$$, 'P0001', 'habit_archived', 'an archived habit is refused');
select throws_ok($$update public.habit_completions set completion_date = '2999-01-01' where habit_id = '10000000-0000-0000-0000-0000000000a1'$$, 'P0001', 'date_in_future', 'moving a tick to the future is refused');

select * from finish();
rollback;
