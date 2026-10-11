begin;
select plan(6);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev');

select is((select links from public.habits where false), null, 'the column exists');
insert into public.habits (id, user_id, name, icon, color, start_date) values
  ('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Read', '📖', 'moss', '2026-10-01');
select is((select links from public.habits where id = '10000000-0000-0000-0000-0000000000a1'), '{}'::text[], 'a habit has no links by default');
select lives_ok($$update public.habits set links = array['https://leetcode.com/problemset/', 'http://example.com/a?b=c'] where id = '10000000-0000-0000-0000-0000000000a1'$$, 'web addresses are accepted');
select throws_ok($$update public.habits set links = array['javascript:alert(1)'] where id = '10000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'a javascript: address is rejected');
select throws_ok($$update public.habits set links = array['https://a.dev/ x'] where id = '10000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'an address with a space is rejected');
select throws_ok($$update public.habits set links = (select array_agg('https://a.dev/' || n) from generate_series(1, 11) n) where id = '10000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'more than ten links are rejected');

select * from finish();
rollback;
