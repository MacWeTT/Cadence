begin;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'Bob habit', '🏃', 'clay', '2026-09-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

-- a habit made offline keeps its id, with its schedules and pauses
select lives_ok($$select public.sync_put_habit($json$
  {"id": "10000000-0000-0000-0000-0000000000a1", "name": "Read", "description": "  ", "icon": "📖", "color": "moss",
   "startDate": "2026-09-01", "createdAt": "2026-09-01T08:00:00Z", "updatedAt": "2026-09-01T08:00:00Z",
   "links": ["https://example.com/a"], "archivedAt": null,
   "schedules": [{"kind": "weekdays", "timesPerWeek": null, "weekdays": [1, 3], "effectiveFrom": "2026-09-01"}],
   "pauses": [{"archivedOn": "2026-09-10", "restoredOn": "2026-09-12"}]}
$json$)$$, 'a habit is written by its id');
select is((select name from public.habits where id = '10000000-0000-0000-0000-0000000000a1'), 'Read', 'it has the id it was sent with');
select is((select weekdays from public.habit_schedules where habit_id = '10000000-0000-0000-0000-0000000000a1'), array[1, 3]::smallint[], 'its schedule came with it');
select is((select count(*)::int from public.habit_archive_periods where habit_id = '10000000-0000-0000-0000-0000000000a1'), 1, 'and its pause');
select is((select description from public.habits where id = '10000000-0000-0000-0000-0000000000a1'), null, 'a blank description is none');

-- the same call again with a newer time changes it, and its children are replaced, not added to
select lives_ok($$select public.sync_put_habit($json$
  {"id": "10000000-0000-0000-0000-0000000000a1", "name": "Read more", "icon": "📖", "color": "moss",
   "startDate": "2026-09-01", "updatedAt": "2999-01-01T00:00:00Z", "links": [], "archivedAt": null,
   "schedules": [{"kind": "daily", "timesPerWeek": null, "weekdays": null, "effectiveFrom": "2026-09-01"}], "pauses": []}
$json$)$$, 'a newer edit is applied');
select is((select name from public.habits where id = '10000000-0000-0000-0000-0000000000a1'), 'Read more', 'the habit changed');
select is((select count(*)::int from public.habit_schedules where habit_id = '10000000-0000-0000-0000-0000000000a1'), 1, 'one schedule, not two');

-- an edit older than the account's copy does not overwrite it
select lives_ok($$select public.sync_put_habit($json$
  {"id": "10000000-0000-0000-0000-0000000000a1", "name": "Stale", "icon": "📖", "color": "moss",
   "startDate": "2026-09-01", "updatedAt": "2020-01-01T00:00:00Z", "links": [], "archivedAt": null, "schedules": [], "pauses": []}
$json$)$$, 'an older edit is accepted without error');
select is((select name from public.habits where id = '10000000-0000-0000-0000-0000000000a1'), 'Read more', 'but the newer copy stays');

-- a finished focus session by id, and removing it
select lives_ok($$select public.sync_put_focus($json$
  {"id": "20000000-0000-0000-0000-0000000000a1", "habitId": "10000000-0000-0000-0000-0000000000a1",
   "startedAt": "2026-09-02T07:00:00Z", "endedAt": "2026-09-02T07:25:00Z", "mode": "free", "plan": null,
   "skippedSeconds": 0, "pausedSeconds": 0, "focusSeconds": 1500, "soundId": null}
$json$)$$, 'a finished session is written by its id');
select throws_ok($$select public.sync_put_focus('{"id": "20000000-0000-0000-0000-0000000000a2", "habitId": "10000000-0000-0000-0000-0000000000a1", "startedAt": "2026-09-02T07:00:00Z", "endedAt": null, "mode": "free"}'::jsonb)$$, 'P0001', 'session_running', 'a running session is refused');

-- deleting
select lives_ok($$select public.sync_delete_habit('10000000-0000-0000-0000-0000000000a1'); select public.sync_delete_habit('10000000-0000-0000-0000-0000000000a1')$$, 'a habit is deleted, and deleting it again is fine');
select is((select count(*)::int from public.focus_sessions), 0, 'its sessions went with it');

select * from finish();
rollback;
