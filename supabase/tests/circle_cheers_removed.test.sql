begin;
select plan(6);

-- Cheers are gone: reactions replaced them in the screens, and the table and function were left unused.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');

select is(to_regclass('public.cheers'), null, 'the cheers table is gone');
select is(to_regprocedure('public.send_cheer(uuid,uuid,date)'), null, 'and so is the function that wrote it');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c', public.create_circle('Study group')::text, true);
select set_config('t.tok', public.create_invite(current_setting('t.c')::uuid), true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));

select set_config('t.ov', public.circle_overview(current_setting('t.c')::uuid)::text, true);
select is(position('cheers_today' in current_setting('t.ov')), 0, 'the circle page no longer carries who cheered you');
select is(position('cheered_by_you' in current_setting('t.ov')), 0, 'or whether you cheered');

-- the clean-up that runs when someone leaves still works without the table
select lives_ok($$select public.leave_circle(current_setting('t.c')::uuid)$$, 'a member can still leave');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select is((select count(*)::int from public.my_circles()), 1, 'and the circle goes on for the person who stays');

select * from finish();
rollback;
