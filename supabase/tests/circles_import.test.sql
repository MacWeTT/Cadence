begin;
select plan(5);

-- Restoring a backup replaces a person's habits, so what they shared goes with them. The Account tab says so.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c', public.create_circle('Study group')::text, true);
select set_config('t.tok', public.create_invite(current_setting('t.c')::uuid), true);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select public.join_circle(current_setting('t.tok'));

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into public.habits (id, user_id, name, icon, color, start_date)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-01-01');
select public.set_share('10000000-0000-4000-8000-000000000001', current_setting('t.c')::uuid, 'streaks', 'name');
select public.set_share_override('10000000-0000-4000-8000-000000000001', current_setting('t.c')::uuid, '00000000-0000-0000-0000-0000000000b2', 'hidden', 'generic');

select is((select count(*)::int from public.habit_shares), 1, 'a share exists before the restore');
select is((select count(*)::int from public.habit_share_overrides), 1, 'and so does a per-person override');

select public.replace_my_data('{"habits": []}'::jsonb);

select is((select count(*)::int from public.habit_shares), 0, 'a restore removes what was shared');
select is((select count(*)::int from public.habit_share_overrides), 0, 'and the per-person overrides');
select is((select count(*)::int from public.my_circles()), 1, 'but the person is still in the circle');

select * from finish();
rollback;
