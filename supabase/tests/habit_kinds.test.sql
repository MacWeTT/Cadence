begin;
select plan(13);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01');

-- The schedule rules, as the table owner.
select lives_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', array[1,3,5]::smallint[], '2026-10-01')$$, 'one to six weekdays are accepted');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', array[]::smallint[], '2026-10-05')$$, '23514', null, 'no days are rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', array[1,2,3,4,5,6,7]::smallint[], '2026-10-05')$$, '23514', null, 'all seven days are rejected (that is daily)');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', array[1,1]::smallint[], '2026-10-05')$$, '23514', null, 'a repeated day is rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', array[0,2]::smallint[], '2026-10-05')$$, '23514', null, 'a day outside 1 to 7 is rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'weekdays', '2026-10-05')$$, '23514', null, 'weekdays without days is rejected');
select throws_ok($$insert into public.habit_schedules (habit_id, kind, weekdays, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'daily', array[1]::smallint[], '2026-10-05')$$, '23514', null, 'days on a daily schedule are rejected');
select lives_ok($$insert into public.habit_schedules (habit_id, kind, effective_from) values ('10000000-0000-0000-0000-0000000000a1', 'optional', '2026-10-12')$$, 'an optional schedule needs nothing else');

-- The functions, as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

select lives_ok($$select public.create_habit('Gym', null, '🏋️', 'clay', '2026-10-01', 'weekdays', null, array[1,3,5]::smallint[])$$, 'create_habit takes weekdays');
select is((select weekdays from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Gym'), array[1,3,5]::smallint[], 'and stores them');
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Gym'), 'upsert', 'weekdays', null, array[2,4]::smallint[], '2026-10-12', '2026-10-09')$$, 'a weekday change can be scheduled');
select is((select weekdays from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Gym' and s.effective_from = '2026-10-12'), array[2,4]::smallint[], 'with its new days');
select lives_ok($$select public.create_habit('Old', null, '📖', 'moss', '2026-10-01', 'daily', null)$$, 'the previous create_habit still works, for the app version still running during a deploy');

select * from finish();
rollback;
