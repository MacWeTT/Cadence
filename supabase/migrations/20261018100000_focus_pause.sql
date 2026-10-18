-- Pause and resume for a running focus session (0.8.3). Additive.
-- `paused_at` is set while the session is paused; `paused_seconds` sums the pauses that are over. The browser and the
-- server both count running time as (now, or paused_at) - started_at - paused_seconds, on the database clock.
alter table public.focus_sessions
  add column paused_at timestamptz,
  add column paused_seconds int not null default 0 check (paused_seconds >= 0),
  add constraint focus_sessions_paused_only_running check (paused_at is null or ended_at is null);
