-- The grey accent (0.8): one more preset in the profile's accent check. Additive.

alter table public.profiles drop constraint profiles_accent_check;
alter table public.profiles add constraint profiles_accent_check
  check (accent in ('moss', 'clay', 'sky', 'plum', 'teal', 'grey', 'custom'));
