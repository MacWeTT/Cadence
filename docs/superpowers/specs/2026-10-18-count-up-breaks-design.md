# Count-up breaks, design

Status: proposed, written for the record. Not scheduled: it goes in a release after the 0.8.3 bugfixes.

## Purpose

In a Pomodoro session a break counts down and then the next round starts by itself. Some people want to rest as long as they need and see how long the break really was. A **count-up break** starts at 0:00, chimes when the planned break length is reached, and keeps counting until the person says they are back.

## What the person sees

- The start modal gets a **Breaks** choice next to the plan numbers: **Countdown** (today's behaviour, the default) or **Count up**. Only Pomodoro sessions have it. The last choice is remembered per habit, like the plan and the sound.
- In a count-up break the big clock counts up from 0:00 and the phase label says "Break". The ring fills toward the planned length.
- At the planned length it chimes once (and sends the notification, if allowed) and the display shows how far over: `5:00 +2:14`. It keeps counting.
- A **Back to focus** button (in the panel and the bar) ends the break and starts the next round at that moment. Pressing it before the planned length ends the break early (the same as Skip break today, which is replaced by this button in a count-up session).
- The session does not move on by itself while a break is open. The break's real length is kept, so the rest of the plan starts later and the session's total clock time grows.
- Breaks never count as focus, however long they last. Focus minutes are unchanged.
- Pause works in a break exactly as it does in a focus round.
- There is no break after the last round, so there is no count-up break there: the session still ends by itself when the last round is done.

## How it works

The timeline of a plan stays fixed (focus, break, focus, ... ). Today the running position is `elapsed + skipped_seconds`, where skipping a break moves the position forward. A count-up break needs the opposite as well, a way to hold the position at the end of the break until the person comes back:

- `focus_sessions.break_mode` (`countdown` or `count_up`, default `countdown`, check constraint).
- `focus_sessions.breaks_done` (int, default 0): how many breaks the person has ended.
- `focus_sessions.break_extra_seconds` (int, default 0): the time spent past the planned length of the breaks that are over.

The position is `active elapsed + skipped_seconds - break_extra_seconds` (active elapsed already leaves out pauses, see the pause design). In a count-up session the position is **held** at the end of break number `breaks_done + 1` once it gets there; the time since is the overrun.

- **Back to focus** is a server action with the same shape as pause and resume: it reads the database clock, then sets `breaks_done + 1` and moves the position to the end of that break, adding to `skipped_seconds` when the break is ended early and to `break_extra_seconds` when it ran over. It is idempotent: it only acts if the break it saw is still the open one (a compare on `breaks_done`), and does nothing outside a break.
- The pure maths (`phaseAt`, the held position, the overrun, `focusSecondsAt`) stays in `src/domain/focus.ts` and is shared by the browser and the server, like the pause maths.
- **Settling** a session (stop, plan end, auto-close) uses the held position, so a stop during a break saves the focus done so far, and a session whose break is never ended is closed after 12 hours (the pause limit) with the focus up to that break.
- No new table, and nothing about existing sessions changes: they are `countdown` with zeros.

## Client

- `sessionView` gains `overrun` (seconds past the planned break, 0 otherwise) and a `counting` flag that `FocusRunning` and the bar use for the up-count display.
- The phase chime hook already fires on a phase key change; a count-up break adds one more key (`break:over`) so the chime and notification fire once when the planned length is reached.
- Stop, pause, resume and Back to focus are optimistic where the work is local (see the stop fix); Back to focus waits for the server, since the new position depends on its clock.

## Decisions taken (change them before building if you disagree)

- One chime at the planned length, no repeats.
- An open break is closed after 12 hours, like a pause.
- Long breaks work the same way, with the long length as the mark.

## Tests

- Unit: the held position and the overrun (before, at and past the mark; early end; two breaks in a row; with pauses and skips), settling a stop mid-break and an abandoned break, the view's `overrun`.
- Database (pgTAP): `break_mode` check, the new columns' defaults and non-negative checks.
- e2e: choose Count up in the modal, the clock counts up in a break, the overrun shows past the mark, Back to focus starts the next round, ending a break early, and a plain Countdown session behaves as before.

## Tasks

1. Migration and database test; `database.types.ts`.
2. Domain maths, test first.
3. Server: `break_mode` on start, `endBreak`, settle, the view; action and hook.
4. UI: the Breaks choice in the modal, the up-count display, the Back to focus button in the panel and the bar, the chime key.
5. e2e and the changelog line ("Count-up breaks: rest as long as you need and see how long it was").
