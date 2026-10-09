begin;
select plan(51);

-- Alice (A) and Bob (B). Bob's data is inserted directly, as the table owner.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.dev');

insert into public.habits (id, user_id, name, icon, color, start_date, archived_at) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Run', '🏃', 'clay', '2026-10-01', now());
insert into public.habit_schedules (habit_id, kind, effective_from) values
  ('10000000-0000-0000-0000-0000000000b1', 'daily', '2026-10-01');
insert into public.habit_completions (habit_id, completion_date) values
  ('10000000-0000-0000-0000-0000000000b1', '2026-10-01');
insert into public.habit_archive_periods (habit_id, archived_on) values
  ('10000000-0000-0000-0000-0000000000b1', '2026-10-05');

-- Act as Alice.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

-- create_habit: atomic habit + first schedule.
select lives_ok($$select public.create_habit('Read', 'Before bed', '📖', 'moss', '2026-10-01', 'daily', null)$$, 'create_habit works');
select is((select count(*) from public.habits where name = 'Read')::int, 1, 'the habit exists');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.kind = 'daily' and s.effective_from = '2026-10-01')::int, 1, 'with its first schedule from the start date');
select throws_ok($$select public.create_habit('Bad', null, '📖', 'moss', '2026-10-01', 'fixed_days', null)$$, '23514', null, 'an invalid schedule kind is rejected');
select is((select count(*) from public.habits where name = 'Bad')::int, 0, 'and leaves no half-created habit');
select throws_ok($$select public.create_habit('Bad', null, '📖', 'moss', '2026-10-01', 'weekly_count', 7::smallint)$$, '23514', null, '7 per week is rejected');
select is((select count(*) from public.habits where name = 'Bad')::int, 0, 'and leaves no half-created habit');

-- archive_habit / restore_habit maintain the pause periods.
select lives_ok($$select public.archive_habit((select id from public.habits where name = 'Read'), '2026-10-05')$$, 'archive works');
select isnt((select archived_at from public.habits where name = 'Read'), null, 'archived_at is set');
select is((select count(*) from public.habit_archive_periods p join public.habits h on h.id = p.habit_id where h.name = 'Read' and p.restored_on is null)::int, 1, 'one open period');
select throws_ok($$select public.archive_habit((select id from public.habits where name = 'Read'), '2026-10-06')$$, 'P0001', null, 'archiving twice fails');
select lives_ok($$select public.restore_habit((select id from public.habits where name = 'Read'), '2026-10-07')$$, 'restore works');
select is((select archived_at from public.habits where name = 'Read'), null, 'archived_at is cleared');
select is((select restored_on from public.habit_archive_periods p join public.habits h on h.id = p.habit_id where h.name = 'Read' and p.archived_on = '2026-10-05'), '2026-10-07'::date, 'the period is closed');
select throws_ok($$select public.restore_habit((select id from public.habits where name = 'Read'), '2026-10-08')$$, 'P0001', null, 'restoring twice fails');
select lives_ok($$select public.archive_habit((select id from public.habits where name = 'Read'), '2026-10-08'); select public.restore_habit((select id from public.habits where name = 'Read'), '2026-10-08')$$, 'archive and restore on the same day work');
select is((select count(*) from public.habit_archive_periods p join public.habits h on h.id = p.habit_id where h.name = 'Read' and p.archived_on = p.restored_on)::int, 1, 'giving a zero-length period');
select lives_ok($$select public.archive_habit((select id from public.habits where name = 'Read'), '2026-10-09'); select public.restore_habit((select id from public.habits where name = 'Read'), '2026-10-08')$$, 'restoring with an earlier date does not break');
select is((select restored_on from public.habit_archive_periods p join public.habits h on h.id = p.habit_id where h.name = 'Read' and p.archived_on = '2026-10-09'), '2026-10-09'::date, 'the restore date is clamped to the archive date');

-- apply_schedule_change.
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'upsert', 'weekly_count', 3::smallint, '2026-10-12', '2026-10-09')$$, 'upsert a pending schedule');
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'upsert', 'weekly_count', 4::smallint, '2026-10-12', '2026-10-09')$$, 'a second upsert for the same date works');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.effective_from > '2026-10-09')::int, 1, 'and leaves one pending row');
select is((select times_per_week from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.effective_from = '2026-10-12'), 4::smallint, 'with the latest value');
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'upsert', 'weekly_count', 2::smallint, '2026-10-11', '2026-10-09')$$, 'an upsert for a different date works');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.effective_from > '2026-10-09')::int, 1, 'and still leaves one pending row');
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'delete_pending', null, null, null, '2026-10-09')$$, 'delete_pending works');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read')::int, 1, 'leaving only the current schedule');
select throws_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'replace_all', 'weekly_count', 7::smallint, '2026-10-01', '2026-10-09')$$, '23514', null, 'an invalid replace_all fails');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.kind = 'daily')::int, 1, 'and keeps the old schedule (atomic)');
select lives_ok($$select public.apply_schedule_change((select id from public.habits where name = 'Read'), 'replace_all', 'weekly_count', 3::smallint, '2026-10-01', '2026-10-09')$$, 'replace_all works');
select is((select count(*) from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Read' and s.kind = 'weekly_count' and s.effective_from = '2026-10-01')::int, 1, 'leaving exactly one row');

-- Alice cannot touch Bob's habit through the functions or the tables.
select throws_ok($$select public.archive_habit('10000000-0000-0000-0000-0000000000b1', '2026-10-09')$$, 'P0001', null, 'cannot archive Bob''s habit');
select throws_ok($$select public.restore_habit('10000000-0000-0000-0000-0000000000b1', '2026-10-09')$$, 'P0001', null, 'cannot restore Bob''s habit');
select throws_ok($$select public.apply_schedule_change('10000000-0000-0000-0000-0000000000b1', 'replace_all', 'daily', null, '2026-10-01', '2026-10-09')$$, 'P0001', null, 'cannot change Bob''s schedule');
select is((select count(*) from public.habit_archive_periods where habit_id = '10000000-0000-0000-0000-0000000000b1')::int, 0, 'cannot see Bob''s archive periods');
select is_empty($$update public.habit_schedules set kind = 'daily' where habit_id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'cannot update Bob''s schedule');
select is_empty($$delete from public.habit_schedules where habit_id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'cannot delete Bob''s schedule');
select is_empty($$delete from public.habits where id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'cannot delete Bob''s habit');
select is_empty($$update public.profiles set timezone = 'Asia/Kolkata' where user_id = '00000000-0000-0000-0000-0000000000b1' returning 1$$, 'cannot update Bob''s profile');
select is_empty($$update public.habit_archive_periods set restored_on = '2026-10-09' where habit_id = '10000000-0000-0000-0000-0000000000b1' returning 1$$, 'cannot update Bob''s archive period');

-- Alice cannot re-point her own rows at Bob's habit (with check on update).
select throws_ok($$update public.habit_schedules set habit_id = '10000000-0000-0000-0000-0000000000b1' where habit_id = (select id from public.habits where name = 'Read')$$, '42501', null, 'cannot move her schedule to Bob''s habit');
select lives_ok($$insert into public.habit_completions (habit_id, completion_date) values ((select id from public.habits where name = 'Read'), '2026-10-02')$$, 'Alice can tick her own habit');
select throws_ok($$update public.habit_completions set habit_id = '10000000-0000-0000-0000-0000000000b1' where habit_id = (select id from public.habits where name = 'Read')$$, '42501', null, 'cannot move her completion to Bob''s habit');
select throws_ok($$update public.habit_archive_periods set habit_id = '10000000-0000-0000-0000-0000000000b1' where habit_id = (select id from public.habits where name = 'Read')$$, '42501', null, 'cannot move her archive period to Bob''s habit');

-- The anon role sees nothing and cannot create habits.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*) from public.habits)::int, 0, 'anon sees no habits');
select is((select count(*) from public.habit_schedules)::int, 0, 'anon sees no schedules');
select is((select count(*) from public.habit_completions)::int, 0, 'anon sees no completions');
select is((select count(*) from public.habit_archive_periods)::int, 0, 'anon sees no archive periods');
select is((select count(*) from public.profiles)::int, 0, 'anon sees no profiles');
select throws_ok($$select public.create_habit('Anon', null, '📖', 'moss', '2026-10-01', 'daily', null)$$, '42501', null, 'anon cannot call create_habit');

-- Deleting a habit removes its archive periods.
reset role;
delete from public.habits where id = '10000000-0000-0000-0000-0000000000b1';
select is((select count(*) from public.habit_archive_periods where habit_id = '10000000-0000-0000-0000-0000000000b1')::int, 0, 'deleting a habit removes its archive periods');

select * from finish();
rollback;
