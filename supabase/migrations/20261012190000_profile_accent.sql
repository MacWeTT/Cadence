-- The app accent colour on the account, so it follows the person to a new device (0.8). Additive.
-- The accent is one of the presets, or 'custom' with its colour; null means the person has not chosen one.

alter table public.profiles
  add column accent text
    constraint profiles_accent_check check (accent in ('moss', 'clay', 'sky', 'plum', 'teal', 'custom')),
  add column accent_custom text
    constraint profiles_accent_custom_check check (accent_custom ~ '^#[0-9a-fA-F]{6}$'),
  add constraint profiles_accent_custom_matches check (coalesce(accent = 'custom', false) = (accent_custom is not null));
