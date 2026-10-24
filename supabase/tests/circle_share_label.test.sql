begin;
select plan(6);

-- Changing how much of a habit a circle sees must not change how the habit is named to it.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev');
insert into public.habits (id, user_id, name, icon, color, start_date)
values ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', 'x', 'moss', '2026-01-01');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select set_config('t.c', public.create_circle('Study group')::text, true);

select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c')::uuid, 'done_today');
select is((select label from public.habit_shares), 'name', 'a new share with no choice is shown by name');

select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c')::uuid, 'done_today', 'emoji');
select is((select label from public.habit_shares), 'emoji', 'the owner can show it by emoji only');

select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c')::uuid, 'streaks');
select is((select level from public.habit_shares), 'streaks', 'changing only the level changes the level');
select is((select label from public.habit_shares), 'emoji', 'and keeps how it is named');

select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c')::uuid, 'streaks', 'generic');
select is((select label from public.habit_shares), 'generic', 'choosing a name style still changes it');

select throws_ok($$select public.set_share('10000000-0000-0000-0000-0000000000a1', current_setting('t.c')::uuid, 'streaks', 'bogus')$$, 'P0001', 'invalid_label', 'a name style that does not exist is refused');

select * from finish();
rollback;
