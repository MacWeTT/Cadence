begin;
select plan(5);

-- a new account is not registered and has no password (the signup trigger makes its profile)
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000c1', 'zqnewcomer@example.com', '{"full_name":"New Comer"}');

select is((select registered_at from public.profiles where user_id = '00000000-0000-0000-0000-0000000000c1'), null, 'a new account is not registered');
select is((select password_set from public.profiles where user_id = '00000000-0000-0000-0000-0000000000c1'), false, 'a new account has no password marked');

-- the person finishes registering through their own row
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);

select lives_ok($$update public.profiles set registered_at = now(), password_set = true where user_id = '00000000-0000-0000-0000-0000000000c1'$$, 'a person can register their own account');
select is((select password_set from public.profiles where user_id = '00000000-0000-0000-0000-0000000000c1'), true, 'and it shows');

-- and cannot touch anyone else's
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c3', 'zqthird@example.com');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
update public.profiles set registered_at = now() where user_id = '00000000-0000-0000-0000-0000000000c3';
reset role;
select is((select registered_at from public.profiles where user_id = '00000000-0000-0000-0000-0000000000c3'), null, 'a person cannot register someone else');

select * from finish();
rollback;
