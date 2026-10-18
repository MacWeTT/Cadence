begin;
select plan(24);

-- the rules, directly
select ok(public.valid_tag('manasbajpai18'), 'letters and digits are a tag');
select ok(public.valid_tag('john_doe'), 'an underscore is allowed');
select ok(public.valid_tag('abc'), 'three characters is enough');
select ok(not public.valid_tag('ab'), 'two characters is too short');
select ok(not public.valid_tag(repeat('a', 31)), 'thirty-one characters is too long');
select ok(not public.valid_tag('Manas'), 'capitals are not allowed');
select ok(not public.valid_tag('has-dash'), 'a dash is not allowed');
select ok(not public.valid_tag('has space'), 'a space is not allowed');
select ok(not public.valid_tag('admin'), 'a reserved word cannot be a tag');

-- default tags, made when an account is created
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'zqmanas18@gmail.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'zqmanas18', 'the default is the part of the email before the @');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a2', 'ZQManas18@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a2'), 'zqmanas18_2', 'a taken default gets a number, whatever the case');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a3', 'ZQJohn.Doe-Smith@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a3'), 'zqjohn_doe_smith', 'dots and dashes become underscores, capitals become lowercase');

insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000a4', 'octo@example.com', '{"user_name": "ZQOcto-Cat"}');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a4'), 'zqocto_cat', 'a GitHub account takes its GitHub username');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a5', 'ab@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a5'), 'userab', 'a short default is padded');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a6', '+++@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a6'), 'user', 'a default with nothing usable becomes user');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'admin@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a7'), 'admin_2', 'a reserved default gets a number');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a8', repeat('x', 45) || '@example.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a8'), repeat('x', 30), 'a long default is cut to thirty characters');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', repeat('x', 45) || '@other.com');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a9'), repeat('x', 28) || '_2', 'and a clash on a long one still fits in thirty');

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1');
select is((select tag from public.profiles where user_id = '00000000-0000-0000-0000-0000000000b1'), 'user_2', 'an account with no email still gets a tag');

select is((select count(*)::int from public.profiles where tag is null), 0, 'every account has a tag');

-- changing a tag
select lives_ok($$update public.profiles set tag = 'zq_manas_new' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a free valid tag can be taken');
select throws_ok($$update public.profiles set tag = 'ZQ_MANAS_NEW' where user_id = '00000000-0000-0000-0000-0000000000a2'$$, '23514', null, 'capitals are refused by the check');
select throws_ok($$update public.profiles set tag = 'zq_manas_new' where user_id = '00000000-0000-0000-0000-0000000000a2'$$, '23505', null, 'a tag in use cannot be taken');
select throws_ok($$update public.profiles set tag = 'admin' where user_id = '00000000-0000-0000-0000-0000000000a2'$$, '23514', null, 'a reserved word cannot be taken');

select * from finish();
rollback;
