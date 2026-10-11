# Focus sessions, design

Status: proposed, for review. Mockups: the Focus sessions screen of the visual companion (`.superpowers/brainstorm`, not committed).

## Purpose

Start a timer on a habit, stop it when done, and keep how long you focused on each habit. Two kinds of session: **Free** (counts up, stop when you like) and **Pomodoro** (rounds of focus and break). When a session ends, the person confirms "I did it" and the habit is ticked for that day.

Out of scope now: pausing a session, a Focus page with recent sessions (a later option), push alerts when the app is closed (they arrive with reminders), and the desktop app's native alerts.

## What the person sees

- **Focus button** on each habit row on Today and Home (any listed habit, ticked or not; hidden for archived habits and when viewing another day). A small pill beside the row's tags.
- **Setup panel** (a bottom sheet on phones, a centred dialog from 640 px up): a Pomodoro / Free switch. Pomodoro opens on **Classic**; chips for **Deep** and **Short**; the four numbers (focus, break, long break, rounds) are editable. It remembers the last numbers used on that habit. A line says the total and the focus minutes ("About 2 hours, 100 minutes of focus"). Free hides the numbers: Start only.
- **Running panel:** a ring and a large countdown, the phase ("Focus, round 2 of 4" or "Break, next: round 3"), round dots, **Stop**, and **Skip break** during a break. Free counts up with Stop only.
- **Running bar:** a slim bar on every page while a session runs (under the top bar; above the tab bar on phones): habit icon and name, phase, time, Stop. Tapping it reopens the panel. The tab title shows the time ("16:42 · Read").
- **Phase changes:** a chime (Web Audio, no asset) and, if the person has allowed it, a browser notification (asked once, on first start, and optional). Phases roll on by themselves; a break ends and the next focus round begins.
- **Ending:** after the last round, or on Stop, the panel shows the focused minutes and asks **I did it** (ticks the habit) or **Not this time**. If the habit is already ticked that day it only shows the minutes with Close. Under one full minute of focus, nothing is saved and nothing is asked.
- **Progress:** a "Focus time" card: the total and minutes per habit over the page's existing period chips (7, 30, 90 days, year) and habit filter.

## Rules (pure domain, `src/domain/focus.ts`, tests first)

- A Pomodoro plan is `{ focusMin, breakMin, longBreakMin, rounds }`. Limits: focus 1 to 180, break 1 to 60, long break 1 to 60, rounds 1 to 12. After every 4th round the break is the long one; there is no break after the last round.
- `phaseAt(plan, elapsedSeconds)` gives the phase (`focus`, `break`, or `done`), the round, and the seconds left in the phase. `totalSeconds(plan)` is the full length. Everything is derived from the start time, so a refresh, a sleeping tab, or a second device show the same thing.
- `focusSecondsAt(plan, elapsedSeconds)`: the seconds spent in focus phases only; breaks never count. Free: all elapsed seconds, capped at 8 hours (a session left running is closed at the cap).
- Skipping a break moves the rest of the plan earlier. The skip is stored (`skipped_seconds`) so the timeline can be derived again.
- The focused minutes belong to the **calendar day the session started**, in the person's timezone. "I did it" ticks that same day.
- One running session per person. Starting a second one is refused with a message that names the running habit and offers Stop or Open.

## Data (one additive migration)

`focus_sessions`: `id`, `user_id` (default `auth.uid()`), `habit_id` (on delete cascade), `started_at`, `ended_at` (null while running), `mode` (`free` | `pomodoro`), `plan jsonb` (null for free), `skipped_seconds int`, `focus_seconds int` (set when the session ends). Checks: mode and plan agree; the plan limits; `focus_seconds >= 0`. A partial unique index on `user_id` where `ended_at is null` allows one running session. Row-level security: the row's `user_id` is the signed-in user and the habit is theirs (same style as `habit_completions`).

Time comes from the server, never from the browser: `start` stores `now()`, `stop` computes with `now()`. A session whose plan has run out is closed on the next read or start (idempotent), with its planned focus seconds. Last-used numbers per habit are read from that habit's latest Pomodoro session, so no extra table.

## Server and app

- `src/server/focus.ts` (+ pure mapping kept free of `server-only`, unit-tested): `getFocusState()` (the running session with the server time, and last-used plans), `startFocus`, `stopFocus`, `skipBreak`, and `focusByHabit(sessions, from, to, timezone)` for Progress (pure, local-date attribution).
- Server actions for start, stop and skip (the app's mutation path); `GET /api/focus` for the state (401 when signed out, like the other endpoints). Progress's data adds the focus totals for its range.
- Browser cache: a `focus` query (refetched on tab focus, so other devices catch up); start, stop and skip update it at once and invalidate `progress`. A clock hook counts locally from the server time (it corrects for clock skew) and re-reads the server at phase boundaries.
- Components: `FocusButton` (a row pill), `FocusPanel` (sheet or dialog), `FocusBar` (in the app layout), `FocusSetup` and `FocusRunning` inside the panel, and the Progress `FocusCard`. All text in `locales/en/focus.json`. The panel, ring and bar follow the existing styling and the 44 px touch rule.
- Accessibility: the countdown is a `timer` that is not announced every second; phase changes are announced politely; motion respects reduced-motion (no ring animation, a plain bar).

## Edge cases

- Archiving or deleting a habit while it runs: archiving lets the session finish; deleting removes it with the habit.
- Signing out leaves the session running on the server; signing in shows it again.
- Offline: Start and Stop need a connection; a running session keeps counting from its start time and shows the right time when the connection returns.
- Browser notification refused or unsupported: the chime and the tab title still work.

## Tests

- Unit: the domain (phases, long breaks, skip, focus seconds, the free cap, the one-minute rule), the pure server mapping, and `focusByHabit` across timezones and midnight.
- Database (pgTAP): constraints, one running session, row-level security, cascade on delete.
- e2e: start Free then Stop, then the prompt ticks the habit; a Pomodoro run through its phases with a fake clock; the bar on another page and its Stop; a second start is refused; the Progress card; a session under one minute leaves no record; phone layout.

## Decided defaults, open to change

No pause; phases roll on automatically; the free cap is 8 hours; the long break comes every 4 rounds and that number is not editable; focus time belongs to the start day.
