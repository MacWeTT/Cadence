begin;
select plan(118);

-- People: A owns the circle, B joins, C stays outside. D1 to D6 fill the seats. Habits: A has six, B has one.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev'),
  ('00000000-0000-0000-0000-0000000000d1', 'd1@test.dev'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@test.dev'),
  ('00000000-0000-0000-0000-0000000000d3', 'd3@test.dev'),
  ('00000000-0000-0000-0000-0000000000d4', 'd4@test.dev'),
  ('00000000-0000-0000-0000-0000000000d5', 'd5@test.dev'),
  ('00000000-0000-0000-0000-0000000000d6', 'd6@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'Write', '✍️', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1', 'Walk', '🚶', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a1', 'Stretch', '🧘', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a1', 'Old', '📦', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a1', 'Spare', '🧩', 'moss', '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'Run', '🏃', 'moss', '2026-01-01');
update public.habits set archived_at = now() where id = '10000000-0000-0000-0000-0000000000a5';

-- structure
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('circles', 'circle_members', 'circle_invites', 'habit_shares', 'habit_share_overrides', 'cheers') and c.relrowsecurity), 6, 'row-level security is on for every Circles table');
select is((select count(*)::int from unnest(array['public.circle_overview(uuid)', 'public.create_circle(text)', 'public.create_invite(uuid)', 'public.circle_invite_preview(text)', 'public.join_circle(text)', 'public.leave_circle(uuid)', 'public.remove_member(uuid,uuid)', 'public.delete_circle(uuid)', 'public.set_share(uuid,uuid,text,text)', 'public.set_share_override(uuid,uuid,uuid,text,text)', 'public.set_circle_prefs(uuid,boolean,boolean)', 'public.send_cheer(uuid,uuid,date)']) s where has_function_privilege('anon', s, 'execute')), 0, 'a signed-out visitor can run none of the Circles functions');
select is((select count(*)::int from unnest(array['public.circle_overview(uuid)', 'public.create_circle(text)', 'public.create_invite(uuid)', 'public.circle_invite_preview(text)', 'public.join_circle(text)', 'public.leave_circle(uuid)', 'public.remove_member(uuid,uuid)', 'public.delete_circle(uuid)', 'public.set_share(uuid,uuid,text,text)', 'public.set_share_override(uuid,uuid,uuid,text,text)', 'public.set_circle_prefs(uuid,boolean,boolean)', 'public.send_cheer(uuid,uuid,date)']) s where has_function_privilege('authenticated', s, 'execute')), 12, 'a signed-in person can run all of them');

-- creating a circle, as A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok($$select set_config('t.c1', public.create_circle('Study group')::text, true)$$, 'a person can create a circle');
select is((select count(*)::int from public.circles), 1, 'a person sees the circles they are in');
select is((select count(*)::int from public.circle_members where circle_id = current_setting('t.c1')::uuid), 1, 'the creator is its first member');
select throws_ok($$select public.create_circle('   ')$$, 'P0001', 'invalid_name', 'a circle needs a name');
select throws_ok($$select public.create_circle(repeat('x', 61))$$, 'P0001', 'invalid_name', 'a circle name has a limit');
select throws_ok($$insert into public.circles (name, owner_id) values ('Sneaky', '00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'a circle cannot be made by writing the table');

-- someone outside a circle, as B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

select is((select count(*)::int from public.circles), 0, 'someone outside a circle cannot see it');
select throws_ok($$select public.create_invite(current_setting('t.c1')::uuid)$$, 'P0001', 'not_owner', 'only the owner can invite');
select throws_ok($$select public.circle_overview(current_setting('t.c1')::uuid)$$, 'P0001', 'not_a_member', 'someone outside a circle cannot look into it');

-- invites, as A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok($$select set_config('t.tok1', public.create_invite(current_setting('t.c1')::uuid), true)$$, 'the owner can make an invite');
select is(length(current_setting('t.tok1')), 64, 'an invite is an unguessable 64-character token');

reset role;
select is((select count(*)::int from public.circle_invites where token_hash = current_setting('t.tok1')), 0, 'the token itself is not stored, only its hash');
set local role authenticated;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);

select is((public.circle_invite_preview(current_setting('t.tok1')))->>'name', 'Study group', 'an invite shows the circle it opens');
select throws_ok($$select public.circle_invite_preview('nope')$$, 'P0001', 'invite_invalid', 'a made-up token opens nothing');
select lives_ok($$select public.join_circle(current_setting('t.tok1'))$$, 'a person can join with an invite');
select is((select count(*)::int from public.circles), 1, 'a member sees the circle');
select throws_ok($$select public.join_circle(current_setting('t.tok1'))$$, 'P0001', 'already_member', 'joining twice is refused');

-- the members cannot be edited by writing the tables
select throws_ok($$insert into public.circle_members (circle_id, user_id) values (current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000c3')$$, '42501', null, 'a membership cannot be made by writing the table');
update public.circle_members set in_week = false where user_id = '00000000-0000-0000-0000-0000000000b2';
select is((select count(*)::int from public.circle_members where in_week = false), 0, 'a membership cannot be edited by writing the table');
delete from public.circle_members where user_id = '00000000-0000-0000-0000-0000000000b2';
select is((select count(*)::int from public.circle_members where user_id = '00000000-0000-0000-0000-0000000000b2'), 1, 'a membership cannot be deleted by writing the table');
select throws_ok($$insert into public.cheers (circle_id, from_user, to_user, for_date) values (current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', current_date)$$, '42501', null, 'a cheer cannot be made by writing the table');
select throws_ok($$insert into public.habit_shares (habit_id, circle_id, level) values ('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, 'done_today')$$, '42501', null, 'a share cannot be made by writing the table');

-- invites expire and are replaced
reset role;
update public.circle_invites set expires_at = now() - interval '1 minute';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

select throws_ok($$select public.join_circle(current_setting('t.tok1'))$$, 'P0001', 'invite_invalid', 'an expired invite opens nothing');

reset role;
update public.circle_invites set expires_at = now() + interval '7 days';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.tok2', public.create_invite(current_setting('t.c1')::uuid), true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);

select throws_ok($$select public.join_circle(current_setting('t.tok1'))$$, 'P0001', 'invite_invalid', 'a new invite replaces the old one');
select lives_ok($$select public.join_circle(current_setting('t.tok2'))$$, 'the new invite works');

-- limits: eight people in a circle
reset role;
insert into public.circle_members (circle_id, user_id) select current_setting('t.c1')::uuid, id from auth.users where id in ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d6');
select is((select count(*)::int from public.circle_members where circle_id = current_setting('t.c1')::uuid), 8, 'a circle holds eight people');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);

select throws_ok($$select public.join_circle(current_setting('t.tok2'))$$, 'P0001', 'circle_full', 'a ninth person is refused');

-- limits: ten circles per person
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select lives_ok($$do $x$ begin for i in 1..9 loop perform public.create_circle('Circle ' || i); end loop; end $x$ $$, 'a person can be in ten circles');
select throws_ok($$select public.create_circle('One too many')$$, 'P0001', 'too_many_circles', 'an eleventh circle is refused');

-- sharing, as A
select lives_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'done_today', 'name'), public.set_share('10000000-0000-0000-0000-0000000000a2', current_setting('t.c1')::uuid, 'showed_up', 'name'), public.set_share('10000000-0000-0000-0000-0000000000a3', current_setting('t.c1')::uuid, 'done_today', 'emoji'), public.set_share('10000000-0000-0000-0000-0000000000a4', current_setting('t.c1')::uuid, 'done_today', 'generic'), public.set_share('10000000-0000-0000-0000-0000000000a5', current_setting('t.c1')::uuid, 'done_today', 'name')$$, 'a person can share habits at different levels');
select throws_ok($$select public.set_share('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, 'done_today')$$, 'P0001', 'not_your_habit', 'only your own habits can be shared');
select throws_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'bogus')$$, 'P0001', 'invalid_level', 'a share needs a real level');
select throws_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'done_today', 'bogus')$$, 'P0001', 'invalid_label', 'a share needs a real label');
select lives_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a6', current_setting('t.c1')::uuid, 'done_today'), public.set_share('10000000-0000-0000-0000-0000000000a6', current_setting('t.c1')::uuid, 'hidden')$$, 'a share can be taken back');
select is((select count(*)::int from public.habit_shares where habit_id = '10000000-0000-0000-0000-0000000000a6'), 0, 'sharing at Hidden removes the share');

-- B's circle, to prove a person cannot share into a circle they are not in
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.cb', public.create_circle('B only')::text, true);
select lives_ok($$select public.set_share('10000000-0000-0000-0000-0000000000b1', current_setting('t.c1')::uuid, 'done_today', 'name')$$, 'a member can share their own habit');
select is((select count(*)::int from public.habit_shares), 1, 'a friend sees only their own shares in the table');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.cb')::uuid, 'done_today')$$, 'P0001', 'not_a_member', 'a habit cannot be shared into a circle you are not in');

-- ticks (as the table owner), then what a friend can see, as B
reset role;
insert into public.habit_completions (habit_id, completion_date) values
  ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000a2', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000a3', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000b1', (now() at time zone 'UTC')::date);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.ov', public.circle_overview(current_setting('t.c1')::uuid)::text, true);
select set_config('t.a', (select e::text from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), true);
select set_config('t.b', (select e::text from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000b2'), true);

select is(jsonb_array_length(current_setting('t.a')::jsonb -> 'habits'), 3, 'a friend sees the three habits shared at Done today or higher');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where h ->> 'name' is not null), 1, 'only the habit shared by name is named');
select is((select h ->> 'name' from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where h ->> 'name' is not null), 'Read', 'the named habit is the one shared by name');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where h ->> 'icon' is not null and h ->> 'name' is null), 1, 'a habit shared by emoji shows no name');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where h ->> 'icon' is null and h ->> 'name' is null), 1, 'a habit shared as "a habit" shows neither name nor emoji');
select is((select (h ->> 'done')::boolean from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), true, 'a ticked habit shows as done');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.a')::jsonb -> 'habits') h where (h ->> 'done')::boolean is false), 1, 'an unticked habit shows as not yet');
select is(position('missed' in current_setting('t.ov')), 0, 'the overview has no field about misses');
select is(position('10000000-0000-0000-0000-0000000000a' in current_setting('t.ov')), 0, 'habit ids are never sent');
select is((current_setting('t.a')::jsonb ->> 'showed_up_week')::boolean, true, 'ticking a shared habit this week shows as showed up');
select is(jsonb_array_length(current_setting('t.b')::jsonb -> 'habits'), 1, 'your own entry shows your habits as the circle sees them');
select is((current_setting('t.b')::jsonb ->> 'is_you')::boolean, true, 'your own entry is marked as you');
select is((current_setting('t.ov')::jsonb -> 'circle' ->> 'week_ticks')::int, 3, 'the circle week sums the ticks of habits shared at Done today or higher');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'tag' is not null), 8, 'every member shows their tag');

-- a person who opts out of the circle week
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select lives_ok($$select public.set_circle_prefs(current_setting('t.c1')::uuid, false, true)$$, 'a member can opt out of the circle week');
select is((public.circle_overview(current_setting('t.c1')::uuid) -> 'circle' ->> 'week_ticks')::int, 2, 'their ticks leave the circle week');
select lives_ok($$select public.set_circle_prefs(current_setting('t.c1')::uuid, true, true)$$, 'and opt back in');

-- per-person overrides, as A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'hidden')$$, 'a habit can be hidden from one person');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from jsonb_array_elements((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits') h where h ->> 'name' = 'Read'), 0, 'that person no longer sees it');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a2', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'done_today')$$, 'a habit can be shown to one person at a higher level');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is(jsonb_array_length((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits'), 3, 'that person now sees the extra habit, with no name');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'inherit'), public.set_share_override('10000000-0000-0000-0000-0000000000a2', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'inherit')$$, 'an override can be removed');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is(jsonb_array_length((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits'), 3, 'without overrides the circle level applies again');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000c3', 'hidden')$$, 'P0001', 'viewer_not_member', 'an override needs a viewer who is in the circle');
select throws_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', 'hidden')$$, 'P0001', 'invalid_viewer', 'you cannot override for yourself');

-- Streaks and Everything: a friend's app gets the facts its rules need, and lower levels get none of them
reset role;
insert into public.habit_schedules (habit_id, kind, times_per_week, effective_from) values
  ('10000000-0000-0000-0000-0000000000a1', 'daily', null, '2026-01-01'),
  ('10000000-0000-0000-0000-0000000000a3', 'weekly_count', 3, '2026-01-01');
insert into public.habit_archive_periods (habit_id, archived_on, restored_on) values ('10000000-0000-0000-0000-0000000000a1', '2026-02-01', '2026-02-10');
insert into public.habit_completions (habit_id, completion_date) values ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date - 40);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'streaks', 'name'), public.set_share('10000000-0000-0000-0000-0000000000a3', current_setting('t.c1')::uuid, 'everything', 'emoji')$$, 'a habit can be shared at Streaks and another at Everything');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.a2', (select e::text from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), true);

select is((select h -> 'data' ->> 'start_date' from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), '2026-01-01', 'a Streaks habit carries its start date');
select is((select jsonb_array_length(h -> 'data' -> 'schedules') from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), 1, 'and its schedule rows');
select is((select h -> 'data' -> 'schedules' -> 0 ->> 'kind' from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), 'daily', 'in the shape the domain reads');
select is((select h -> 'data' -> 'pauses' -> 0 ->> 'from' from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), '2026-02-01', 'and its archive pauses, so a pause is never read as a miss');
select is((select jsonb_array_length(h -> 'data' -> 'completions') from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'name' = 'Read'), 2, 'and its tick dates');
select is((select (h -> 'data' -> 'schedules' -> 0 ->> 'times_per_week')::int from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ->> 'icon' = '🚶'), 3, 'an Everything habit carries the same facts');
select is((select count(*)::int from jsonb_array_elements(current_setting('t.a2')::jsonb -> 'habits') h where h ? 'data'), 2, 'a habit shared at Done today carries no data at all');
select is((current_setting('t.a2')::jsonb ->> 'week_starts_on')::int, 1, 'a member carries their week start, so their weeks are their own');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'done_today', 'name')$$, 'a habit can be lowered for one person');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from jsonb_array_elements((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits') h where h ? 'data'), 1, 'and for that person it carries no data');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'inherit'), public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, 'done_today', 'name'), public.set_share('10000000-0000-0000-0000-0000000000a3', current_setting('t.c1')::uuid, 'done_today', 'emoji')$$, 'then back to the earlier levels');

-- pausing sharing
select lives_ok($$update public.profiles set circles_paused = true where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a person can pause sharing');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select e::jsonb from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits', '[]'::jsonb, 'a paused person shows no habits');
select is((select (e ->> 'showed_up_week')::boolean from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), false, 'and does not show as showed up');
select is((public.circle_overview(current_setting('t.c1')::uuid) -> 'circle' ->> 'week_ticks')::int, 1, 'and their ticks leave the circle week');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$update public.profiles set circles_paused = false where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'and resume');

-- "today" is the owner's today
reset role;
update public.profiles set timezone = 'Pacific/Kiritimati' where user_id = '00000000-0000-0000-0000-0000000000a1';
insert into public.habit_completions (habit_id, completion_date) select h, (now() at time zone 'Pacific/Kiritimati')::date from unnest(array['10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-0000000000a4']::uuid[]) h on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select e ->> 'today' from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), ((now() at time zone 'Pacific/Kiritimati')::date)::text, 'a friend sees the owner''s today, in the owner''s timezone');
select is((select count(*)::int from jsonb_array_elements((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'habits') h where (h ->> 'done')::boolean), 3, 'and what is done on that day shows as done');
reset role;
update public.profiles set timezone = 'UTC' where user_id = '00000000-0000-0000-0000-0000000000a1';
delete from public.habit_completions where habit_id in ('10000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-0000000000a4') and completion_date <> (now() at time zone 'UTC')::date;
delete from public.habit_completions where habit_id = '10000000-0000-0000-0000-0000000000a4';
set local role authenticated;

-- cheers
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select lives_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date)$$, 'a member can cheer a friend');
select lives_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date)$$, 'cheering twice is quietly the same cheer');
select is((select count(*)::int from public.cheers), 1, 'there is one cheer per person per day');
select throws_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', (now() at time zone 'UTC')::date)$$, 'P0001', 'cannot_cheer_self', 'you cannot cheer yourself');
select throws_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000c3', (now() at time zone 'UTC')::date)$$, 'P0001', 'not_a_member', 'you cannot cheer someone outside the circle');
select throws_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date - 1)$$, 'P0001', 'cheer_date', 'a cheer is for the friend''s today only');
select is((select (e ->> 'cheered_by_you')::boolean from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1'), true, 'the sender sees that they cheered');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is(jsonb_array_length((select e from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000a1') -> 'cheers_today'), 1, 'the receiver sees the cheer on their own card');
select is((select (e ->> 'cheered_by_you')::boolean from jsonb_array_elements(public.circle_overview(current_setting('t.c1')::uuid) -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000b2'), false, 'and has not cheered back');
select is((select count(*)::int from public.cheers), 1, 'the receiver can read the cheer');
select lives_ok($$select public.set_circle_prefs(current_setting('t.c1')::uuid, true, false)$$, 'a member can turn cheers off');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select throws_ok($$select public.send_cheer(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date)$$, 'P0001', 'cheers_off', 'nobody can cheer someone who turned cheers off');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.cheers), 0, 'someone outside the circle reads no cheers');
select is((select count(*)::int from public.habit_share_overrides), 0, 'and no overrides');

-- leaving removes what you shared there
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.set_share_override('10000000-0000-0000-0000-0000000000a1', current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000b2', 'hidden')$$, 'set up an override for the person about to leave');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select lives_ok($$select public.leave_circle(current_setting('t.c1')::uuid)$$, 'a member can leave');
reset role;
select is((select count(*)::int from public.circle_members where circle_id = current_setting('t.c1')::uuid and user_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'they are no longer a member');
select is((select count(*)::int from public.habit_shares where habit_id = '10000000-0000-0000-0000-0000000000b1' and circle_id = current_setting('t.c1')::uuid), 0, 'what they shared there is gone');
select is((select count(*)::int from public.habit_share_overrides where viewer_id = '00000000-0000-0000-0000-0000000000b2'), 0, 'overrides naming them as the viewer are gone');
select is((select count(*)::int from public.cheers where circle_id = current_setting('t.c1')::uuid), 0, 'the cheers they sent and received there are gone');

-- the last person to leave closes the circle
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select lives_ok($$select public.leave_circle(current_setting('t.cb')::uuid)$$, 'the only member can leave their circle');
reset role;
select is((select count(*)::int from public.circles where id = current_setting('t.cb')::uuid), 0, 'and the empty circle is deleted');

-- the owner leaves: the circle goes on, with the earliest member as owner
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select lives_ok($$select public.leave_circle(current_setting('t.c1')::uuid)$$, 'the owner can leave');
reset role;
select is((select owner_id from public.circles where id = current_setting('t.c1')::uuid), '00000000-0000-0000-0000-0000000000d1'::uuid, 'ownership passes to the earliest member');

-- removing people and closing a circle
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}', true);
select throws_ok($$select public.remove_member(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000d2')$$, 'P0001', 'not_owner', 'only the owner can remove someone');
select throws_ok($$select public.delete_circle(current_setting('t.c1')::uuid)$$, 'P0001', 'not_owner', 'only the owner can close the circle');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select throws_ok($$select public.remove_member(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000d1')$$, 'P0001', 'use_leave', 'the owner leaves instead of removing themselves');
select lives_ok($$select public.remove_member(current_setting('t.c1')::uuid, '00000000-0000-0000-0000-0000000000d2')$$, 'the owner can remove a member');
select lives_ok($$select public.delete_circle(current_setting('t.c1')::uuid)$$, 'the owner can close the circle');
reset role;
select is((select count(*)::int from public.circle_members where circle_id = current_setting('t.c1')::uuid), 0, 'closing a circle removes its members');

-- an account deleted or a habit deleted takes its shares with it, and a circle outlives its owner
insert into public.circles (id, name, owner_id) values ('20000000-0000-0000-0000-000000000001', 'Cascade', '00000000-0000-0000-0000-0000000000d4');
insert into public.circle_members (circle_id, user_id) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4'),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d5');
insert into public.habits (id, user_id, name, icon, color, start_date) values ('10000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000d5', 'Cycle', '🚲', 'moss', '2026-01-01');
insert into public.habit_shares (habit_id, circle_id, level) values ('10000000-0000-0000-0000-0000000000e5', '20000000-0000-0000-0000-000000000001', 'done_today');
delete from public.habits where id = '10000000-0000-0000-0000-0000000000e5';
select is((select count(*)::int from public.habit_shares where circle_id = '20000000-0000-0000-0000-000000000001'), 0, 'deleting a habit removes its shares');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d4';
select is((select owner_id from public.circles where id = '20000000-0000-0000-0000-000000000001'), '00000000-0000-0000-0000-0000000000d5'::uuid, 'a circle outlives its owner and passes to the next member');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d5';
select is((select count(*)::int from public.circles where id = '20000000-0000-0000-0000-000000000001'), 0, 'a circle with no members left is deleted');

select * from finish();
rollback;
