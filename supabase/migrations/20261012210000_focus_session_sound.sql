-- A sound for one focus session (0.8): the profile's sound is the default, a session may carry its own. Additive.
-- null follows the profile's sound; otherwise a built-in sound name or the id of one of the person's own sounds.

alter table public.focus_sessions
  add column sound_id text
    constraint focus_sessions_sound_id_check check (
      sound_id is null
      or sound_id in ('bell', 'marimba', 'wood', 'beep', 'rising', 'silent')
      or sound_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );
