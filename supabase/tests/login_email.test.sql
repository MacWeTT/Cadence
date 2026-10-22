begin;
select plan(15);

-- accounts with a known password, hashed the way Supabase stores it (the signup trigger gives each its tag)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'zqlogin@example.com', extensions.crypt('right-password', extensions.gen_salt('bf')), now(), '{}'),
  ('00000000-0000-0000-0000-0000000000d2', 'zqlogin2@example.com', extensions.crypt('right-password', extensions.gen_salt('bf')), now(), '{}');

set local role anon;

select is((select email from public.login_email('zqlogin', 'right-password')), 'zqlogin@example.com', 'the right tag and password return the email');
select is((select email from public.login_email('  ZQLogin ', 'right-password')), 'zqlogin@example.com', 'the tag is read without regard to case or spaces');
select is((select email from public.login_email('zqlogin', 'wrong')), null, 'a wrong password returns no email');
select is((select email from public.login_email('zqnobody', 'right-password')), null, 'an unknown tag returns no email, like a wrong password');
select is((select locked from public.login_email('zqlogin', 'wrong')), false, 'a wrong password is not a lockout yet');

-- five failures lock the tag, even for the right password; an unknown tag is locked the same way
do $$ begin for i in 1..3 loop perform public.login_email('zqlogin', 'wrong'); end loop; end $$;
select is((select locked from public.login_email('zqlogin', 'right-password')), true, 'five failures in a row lock the tag');
select is((select email from public.login_email('zqlogin', 'right-password')), null, 'a locked tag returns no email, even for the right password');
do $$ begin for i in 1..5 loop perform public.login_email('zqnobody', 'wrong'); end loop; end $$;
select is((select locked from public.login_email('zqnobody', 'wrong')), true, 'an unknown tag locks the same way, so a lockout does not say whether a tag exists');

-- a good sign-in clears the count
do $$ begin for i in 1..4 loop perform public.login_email('zqlogin2', 'wrong'); end loop; end $$;
select is((select email from public.login_email('zqlogin2', 'right-password')), 'zqlogin2@example.com', 'the right password still works after four failures');
do $$ begin for i in 1..4 loop perform public.login_email('zqlogin2', 'wrong'); end loop; end $$;
select is((select email from public.login_email('zqlogin2', 'right-password')), 'zqlogin2@example.com', 'and the count started again after it');

select throws_ok($$select * from public.login_failures$$, '42501', null, 'the failures cannot be read from outside the function');

-- is a tag free to take: valid, not reserved, not in use, without regard to case
select is(public.tag_available('zqfresh'), true, 'a free, valid tag is available');
select is(public.tag_available('ZQLogin'), false, 'a tag in use is not, whatever its case');
select is(public.tag_available('admin'), false, 'a reserved tag is not');
select is(public.tag_available('a'), false, 'an invalid tag is not');

select * from finish();
rollback;
