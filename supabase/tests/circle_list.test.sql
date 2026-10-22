begin;
select plan(16);

-- A starts a circle and B joins it. B also has a circle of their own. C is in none.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@test.dev');

select is((select count(*)::int from unnest(array['public.my_circles()']) s where has_function_privilege('anon', s, 'execute')), 0, 'a signed-out visitor cannot list circles');
select is((select count(*)::int from unnest(array['public.my_circles()']) s where has_function_privilege('authenticated', s, 'execute')), 1, 'a signed-in person can');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c1', public.create_circle('Study group')::text, true);
select set_config('t.tok', public.create_invite(current_setting('t.c1')::uuid), true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));
select set_config('t.c2', public.create_circle('B only')::text, true);

-- the list, as A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.my_circles()), 1, 'a person lists the circles they are in');
select is((select name from public.my_circles()), 'Study group', 'with their names');
select is((select is_owner from public.my_circles()), true, 'and whether they started them');
select is((select member_count from public.my_circles()), 2, 'and how many people are in each');

-- the list, as B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select is((select count(*)::int from public.my_circles()), 2, 'a member lists every circle they are in');
select is((select is_owner from public.my_circles() where name = 'Study group'), false, 'and is not the owner of one they joined');
select is((select member_count from public.my_circles() where name = 'Study group'), 2, 'but sees how many people are in it');
select is((select member_count from public.my_circles() where name = 'B only'), 1, 'and a circle of their own is just them');
select is((select is_owner from public.my_circles() where name = 'B only'), true, 'which they own');

-- the list, as C
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}', true);
select is((select count(*)::int from public.my_circles()), 0, 'someone in no circle gets an empty list');

-- the overview says who started the circle
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select set_config('t.ov', public.circle_overview(current_setting('t.c1')::uuid)::text, true);
select is((select count(*)::int from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where (e ->> 'is_owner')::boolean), 1, 'exactly one member is the owner');
select is((select e ->> 'user_id' from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where (e ->> 'is_owner')::boolean), '00000000-0000-0000-0000-0000000000a1', 'and it is the person who started the circle');
select is((select (e ->> 'is_owner')::boolean from jsonb_array_elements(current_setting('t.ov')::jsonb -> 'members') e where e ->> 'user_id' = '00000000-0000-0000-0000-0000000000b2'), false, 'a member is not marked as the owner');
select is(position('missed' in current_setting('t.ov')), 0, 'the overview still has nothing about misses');

select * from finish();
rollback;
