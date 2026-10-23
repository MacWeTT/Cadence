begin;
select plan(29);

-- A starts a pair and B joins it; C tries to be a third. D is outside everything.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev'),
  ('00000000-0000-0000-0000-0000000000d4', 'd@test.dev');
select set_config('t.tag_a', (select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), true);

select is((select count(*)::int from unnest(array['public.create_pair()', 'public.set_closer(uuid, boolean)', 'public.set_share_misses(uuid, uuid, boolean)']) s where has_function_privilege('anon', s, 'execute')), 0, 'a signed-out visitor cannot make a pair, switch Closer or show off days');
select is((select count(*)::int from unnest(array['public.create_pair()', 'public.set_closer(uuid, boolean)', 'public.set_share_misses(uuid, uuid, boolean)']) s where has_function_privilege('authenticated', s, 'execute')), 3, 'a signed-in person can');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.p', public.create_pair()::text, true);
select set_config('t.g', public.create_circle('Study group')::text, true);

select is((select kind from public.circles where id = current_setting('t.p')::uuid), 'pair', 'a pair is a circle of kind pair');
select is((select kind from public.circles where id = current_setting('t.g')::uuid), 'group', 'and an ordinary circle stays a group');
select is((select kind from public.my_circles() where id = current_setting('t.p')::uuid), 'pair', 'the list says which circles are pairs');
select is((select partner_tag from public.my_circles() where id = current_setting('t.p')::uuid), null::text, 'a pair that is waiting has no partner yet');

select set_config('t.tok', public.create_invite(current_setting('t.p')::uuid), true);
select is((public.circle_invite_preview(current_setting('t.tok')) ->> 'kind'), 'pair', 'an invite says it is for a pair');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));
select is((select partner_tag from public.my_circles() where id = current_setting('t.p')::uuid), current_setting('t.tag_a'), 'once joined, each person is listed under the other''s tag');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select throws_ok($$select public.join_circle(current_setting('t.tok'))$$, 'P0001', 'circle_full', 'a pair holds two people, so a third cannot join');

-- a pair counts towards the ten circles a person can be in (A has the pair and the group, so eight more fill it)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.create_pair() from generate_series(1, 8);
select throws_ok($$select public.create_pair()$$, 'P0001', 'too_many_circles', 'a pair counts towards the limit of circles');

-- Closer: two switches, on only when both are on
select lives_ok($$select public.set_closer(current_setting('t.p')::uuid, true)$$, 'a person can turn Closer on');
select is((public.circle_overview(current_setting('t.p')::uuid) -> 'circle' ->> 'closer_active')::boolean, false, 'one switch alone does nothing');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.set_closer(current_setting('t.p')::uuid, true);
select is((public.circle_overview(current_setting('t.p')::uuid) -> 'circle' ->> 'closer_active')::boolean, true, 'it is on when both have turned it on');
select is((select (e ->> 'closer')::boolean from jsonb_array_elements(public.circle_overview(current_setting('t.p')::uuid) -> 'members') e where e ->> 'is_you' = 'false'), true, 'each person sees whether the other has turned it on');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((public.circle_overview(current_setting('t.p')::uuid) -> 'circle' ->> 'kind'), 'pair', 'the circle page says it is a pair');
select public.set_closer(current_setting('t.p')::uuid, false);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((public.circle_overview(current_setting('t.p')::uuid) -> 'circle' ->> 'closer_active')::boolean, false, 'either person turning it off ends it for both');

select throws_ok($$select public.set_closer(current_setting('t.g')::uuid, true)$$, 'P0001', 'not_a_member', 'someone outside a circle cannot switch it');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$select public.set_closer(current_setting('t.g')::uuid, true)$$, 'P0001', 'not_a_pair', 'Closer is for pairs, not groups');

-- off days: only for an Everything habit, only with Closer on for both, only when the owner ticked it
reset role;
insert into public.habits (id, user_id, name, icon, color, start_date)
values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', 'x', 'moss', '2026-01-01');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.g')::uuid, 'everything', 'name');
select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.p')::uuid, 'streaks', 'name');
select throws_ok($$select public.set_share_misses('10000000-0000-0000-0000-0000000000a1', current_setting('t.g')::uuid, true)$$, 'P0001', 'not_a_pair', 'off days are for pairs, not groups');
select throws_ok($$select public.set_share_misses('10000000-0000-0000-0000-0000000000a1', current_setting('t.p')::uuid, true)$$, 'P0001', 'level_not_everything', 'a habit has to be shared at Everything first');
select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.p')::uuid, 'everything', 'name');
select lives_ok($$select public.set_share_misses('10000000-0000-0000-0000-0000000000a1', current_setting('t.p')::uuid, true)$$, 'the owner can choose to show off days for a habit');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.ov', public.circle_overview(current_setting('t.p')::uuid)::text, true);
select is((select (h ->> 'shows_misses')::boolean from jsonb_array_elements((select e -> 'habits' from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'is_you' = 'false')) h), false, 'with Closer off, the partner is not allowed to see off days');
select public.set_closer(current_setting('t.p')::uuid, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_closer(current_setting('t.p')::uuid, true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.ov', public.circle_overview(current_setting('t.p')::uuid)::text, true);
select is((select (h ->> 'shows_misses')::boolean from jsonb_array_elements((select e -> 'habits' from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'is_you' = 'false')) h), true, 'with Closer on for both and the tick, the partner may see off days');
select is(position('missed' in current_setting('t.ov')), 0, 'and the payload still has no field about what was missed');

-- in a pair, the days a partner showed up this week are listed (days only, nothing about which habit)
reset role;
insert into public.habit_completions (habit_id, completion_date) values
  ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date),
  ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date - 1),
  ('10000000-0000-0000-0000-0000000000a1', (now() at time zone 'UTC')::date - 9);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.days', (select (e -> 'showed_up_days')::text from jsonb_array_elements(public.circle_overview(current_setting('t.p')::uuid) -> 'members') e where e ->> 'is_you' = 'false'), true);
select is(jsonb_array_length(current_setting('t.days')::jsonb), 2, 'a partner''s days are the last seven only');
select is((current_setting('t.days')::jsonb ->> 1), ((now() at time zone 'UTC')::date)::text, 'listed oldest first, ending today');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select jsonb_array_length(e -> 'showed_up_days') from jsonb_array_elements(public.circle_overview(current_setting('t.g')::uuid) -> 'members') e where e ->> 'is_you' = 'true'), 0, 'a group never lists the days people showed up');

-- lowering the habit clears the tick
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.p')::uuid, 'streaks', 'name');
reset role;
select is((select shows_misses from public.habit_shares where habit_id = '10000000-0000-0000-0000-0000000000a1' and circle_id = current_setting('t.p')::uuid), false, 'lowering a habit below Everything clears the choice');

-- a partner leaving closes the pair
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.leave_circle(current_setting('t.p')::uuid);
reset role;
select is((select count(*)::int from public.circles where id = current_setting('t.p')::uuid), 0, 'when a partner leaves, the pair is closed');

select * from finish();
rollback;
