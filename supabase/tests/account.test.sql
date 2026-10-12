begin;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Old habit', '📖', 'moss', '2026-09-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'Bob habit', '🏃', 'clay', '2026-09-01');
insert into public.contact_messages (user_id, anonymous, name, email, message) values
  ('00000000-0000-0000-0000-0000000000a1', false, 'Alice', 'a@test.dev', 'named note'),
  (null, true, null, null, 'anonymous note');

-- as person A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- replace_my_data: replaces everything, keeps the order, returns the counts
select is(
  public.replace_my_data($json$
    {"habits": [
      {"name": "Read", "description": "Ten pages", "icon": "📖", "color": "moss", "startDate": "2026-09-01",
       "createdAt": "2026-09-01T08:00:00Z", "links": ["https://example.com/a"],
       "schedules": [{"kind": "daily", "timesPerWeek": null, "weekdays": null, "effectiveFrom": "2026-09-01"}],
       "ticks": ["2026-09-01", "2026-09-02", "2026-09-03"],
       "pauses": [], "archivedAt": null,
       "focusSessions": [{"startedAt": "2026-09-02T07:00:00Z", "endedAt": "2026-09-02T07:25:00Z", "mode": "free", "plan": null, "skippedSeconds": 0, "focusSeconds": 1500}]},
      {"name": "Run", "description": null, "icon": "🏃", "color": "clay", "startDate": "2026-09-01",
       "createdAt": "2026-09-01T09:00:00Z", "links": [],
       "schedules": [{"kind": "weekdays", "timesPerWeek": null, "weekdays": [1, 3, 5], "effectiveFrom": "2026-09-01"}],
       "ticks": ["2026-09-02"],
       "pauses": [{"archivedOn": "2026-09-10", "restoredOn": null}], "archivedAt": "2026-09-10T10:00:00Z",
       "focusSessions": []}
    ]}
  $json$),
  '{"habits": 2, "ticks": 4, "focusSessions": 1}'::jsonb,
  'the file is restored and the counts come back'
);
select is((select count(*)::int from public.habits), 2, 'only the file''s habits remain for the person');
select is((select count(*)::int from public.habits where name = 'Old habit'), 0, 'the old habit is gone');
select is((select string_agg(name, ',' order by created_at) from public.habits), 'Read,Run', 'habits keep their order');
select is((select links from public.habits where name = 'Read'), array['https://example.com/a'], 'links come back');
select is((select weekdays from public.habit_schedules s join public.habits h on h.id = s.habit_id where h.name = 'Run'), array[1, 3, 5]::smallint[], 'a fixed-days schedule comes back');
select is((select count(*)::int from public.habit_completions), 4, 'the check-ins come back');
select is((select focus_seconds from public.focus_sessions), 1500, 'the focus session comes back');
select ok((select archived_at is not null from public.habits where name = 'Run'), 'an archived habit stays archived');
select is((select count(*)::int from public.habit_archive_periods where restored_on is null), 1, 'its open pause comes back');

-- atomic: a bad row leaves the old data as it was
select throws_ok(
  $json$select public.replace_my_data('{"habits": [{"name": "X", "icon": "x", "color": "moss", "startDate": "2026-09-05",
    "schedules": [{"kind": "daily", "effectiveFrom": "2026-09-05"}], "ticks": ["2026-09-01"], "pauses": [], "focusSessions": []}]}'::jsonb)$json$,
  'P0001', 'before_start', 'a check-in before the start is refused'
);
select is((select count(*)::int from public.habits), 2, 'a refused import changes nothing');
select throws_ok(
  $json$select public.replace_my_data('{"habits": [{"name": "X", "icon": "x", "color": "moss", "startDate": "2026-09-05",
    "schedules": [{"kind": "daily", "effectiveFrom": "2026-09-05"}], "ticks": ["2999-01-01"], "pauses": [], "focusSessions": []}]}'::jsonb)$json$,
  'P0001', 'date_in_future', 'a check-in after today is refused'
);
select is((select count(*)::int from public.habit_completions), 4, 'and the old check-ins are still there');

-- an empty file empties the account
select is(public.replace_my_data('{"habits": []}'::jsonb), '{"habits": 0, "ticks": 0, "focusSessions": 0}'::jsonb, 'an empty backup empties the account');

reset role;
select is((select count(*)::int from public.habits where user_id = '00000000-0000-0000-0000-0000000000b2'), 1, 'another person''s habits are untouched');

-- signed out: refused
set local role anon;
select throws_ok($$select public.replace_my_data('{"habits": []}'::jsonb)$$, '42501', null, 'signed out people cannot import');
reset role;

-- delete_my_account, as person A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.delete_my_account()$$, 'a person can delete their account');
reset role;
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000a1'), 0, 'the sign-in is gone');
select is(
  (select count(*)::int from public.contact_messages where message = 'named note' or (message = 'anonymous note')),
  1, 'the named contact message is gone and the anonymous one stays'
);

select * from finish();
rollback;
