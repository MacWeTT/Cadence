begin;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.dev'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@test.dev');

-- defaults: an existing person reads as the Google picture and the Bell at 60%
select is((select avatar_kind from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'google', 'the avatar starts as the Google picture');
select is((select sound_id from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'bell', 'the sound starts as the Bell');
select is((select sound_volume from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1')::numeric, 0.6, 'the volume starts at 60%');

-- constraints (as the table owner, before row-level security is in play)
select lives_ok($$update public.profiles set avatar_kind = 'character', avatar_value = 'alien', avatar_color = '#5a6b3d' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a character with a colour is accepted');
select throws_ok($$update public.profiles set avatar_kind = 'robot' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'an unknown avatar kind is rejected');
select throws_ok($$update public.profiles set avatar_kind = 'emoji', avatar_value = null where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'an emoji avatar needs a value');
select throws_ok($$update public.profiles set avatar_color = 'green' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'a colour must be a hex code');
select throws_ok($$update public.profiles set sound_volume = 1.5 where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'the volume stays between 0 and 1');
select throws_ok($$update public.profiles set sound_id = 'airhorn' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'a sound is a built-in name or a custom sound id');

-- the accent: a preset, or custom with its colour; nothing else
select lives_ok($$update public.profiles set accent = 'sky', accent_custom = null where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a preset accent is accepted');
select lives_ok($$update public.profiles set accent = 'grey', accent_custom = null where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'the grey accent is accepted');
select lives_ok($$update public.profiles set accent = 'custom', accent_custom = '#336699' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a custom accent with its colour is accepted');
select throws_ok($$update public.profiles set accent = 'neon', accent_custom = null where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'an unknown accent is rejected');
select throws_ok($$update public.profiles set accent = 'custom', accent_custom = null where user_id = '00000000-0000-0000-0000-0000000000a1'$$, '23514', null, 'a custom accent needs its colour');

-- six custom sounds at most
insert into public.custom_sounds (user_id, name, path, duration_ms)
  select '00000000-0000-0000-0000-0000000000a1', 'Clip ' || n, '00000000-0000-0000-0000-0000000000a1/' || n || '.mp3', 3000 from generate_series(1, 6) n;
select throws_ok($$insert into public.custom_sounds (user_id, name, path, duration_ms) values ('00000000-0000-0000-0000-0000000000a1', 'Seventh', 'x/7.mp3', 3000)$$, 'P0001', 'sound_limit', 'a seventh custom sound is rejected');
select throws_ok($$insert into public.custom_sounds (user_id, name, path, duration_ms) values ('00000000-0000-0000-0000-0000000000b2', 'Long', 'x/l.mp3', 5001)$$, '23514', null, 'a sound over five seconds is rejected');

-- removing the sound in use puts the Bell back
update public.profiles set sound_id = (select id::text from public.custom_sounds where name = 'Clip 1') where user_id = '00000000-0000-0000-0000-0000000000a1';
delete from public.custom_sounds where name = 'Clip 1';
select is((select sound_id from public.profiles where user_id = '00000000-0000-0000-0000-0000000000a1'), 'bell', 'removing the sound in use switches back to the Bell');

-- row-level security, as person A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

select is((select count(*)::int from public.custom_sounds), 5, 'a person sees only their own sounds');
select throws_ok($$insert into public.custom_sounds (user_id, name, path, duration_ms) values ('00000000-0000-0000-0000-0000000000b2', 'Sneaky', 'x/s.mp3', 1000)$$, '42501', null, 'a sound for someone else is rejected');

-- storage: a person writes only inside their own folder
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-0000-0000-0000000000a1/me.png', '00000000-0000-0000-0000-0000000000a1')$$, 'a person can store a file in their own folder');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', '00000000-0000-0000-0000-0000000000b2/you.png', '00000000-0000-0000-0000-0000000000a1')$$, '42501', null, 'a person cannot store a file in someone else''s folder');

reset role;

select * from finish();
rollback;
