# Circles: partners, design

Status: proposed, for review. Builds on `2026-10-12-circles-design.md` (read it first) and on the conversation screen added after it. A pair is a circle of two, so everything in Circles applies; this spec only adds what makes a pair feel closer.

## Purpose

An **accountability partner**: one person you choose, who can see a little more of you than a circle can, because you both agreed to it. The feeling stays **company, not pressure**: nothing is on by default, either of you can step back at any moment, and the extra access is about being honest with each other, never about ranking or nagging.

Out of scope: nudges and reminders to the other person (they turn into nagging), free-text messages, a shared streak, XP (follows Circles), turning a pair into a group (a pair never takes a third person), habits "done together" as one linked habit (a later slice).

## What the person sees

- **Invite a partner** (next to *New circle* in the list). It makes a pair and opens an invite link, the same link and join page as a circle. The pair holds exactly two people: a link opened by someone when the pair is full says so.
- **A pair looks like a pair.** It is listed under your partner's name (not a circle name), with a small *Partner* mark, and it keeps the colour and pin every circle has. Until the partner joins it shows *Waiting for your partner*, and the link can be renewed.
- **Week together** (a panel above the conversation, pairs only). Two rows, one for each of you, seven days across: the days you each showed up on the habits you share with each other. One line under it: *You both showed up on 4 days.* It is one number, never who did more.
- **Last week, together** (a card on the first day of your week): *You both showed up on 5 of 7 days.* Same rule: one number, no comparison.
- **Closer** (in *What I share*, pairs only). A switch: *Let us see each other's off days.* It does nothing until **both** of you turn it on. Either of you can turn it off, and it ends at once for both of you; leaving the pair ends it too. Nothing is ever shown retroactively beyond the window below.
- **Off days, per habit.** With *Closer* on, each habit shared at **Everything** gets a checkbox: *Show my off days for this one.* Your partner sees off days only for the habits you ticked. Lowering a habit below Everything, or hiding it, clears the checkbox.
- **What an off day looks like.** In *Week together* and in the person's bubble, a day your partner was expected to do the habit and did not shows as a small, quiet mark with the words *Didn't happen* (grey, never red, no count of them, no streak-loss message). Only the last 14 days. A day off by schedule, a paused day, and today (not over yet) show nothing.
- Everything else is as in a circle: levels, labels, per-person tweaks (there is only one other person), reactions, pause sharing.

## Rules

- **The pair rules are pure domain, tests first.** `closerActive(members)` (`src/domain/circles.ts`) is true only for exactly two members who both have it on. `missedDays(habit, ctx, days)` (`src/domain/circle-misses.ts`) returns the days in the window that were scheduled and not ticked, using the existing `dayStatus` and the weekly rule (a weekly habit's week counts as missed only once it has ended without reaching its goal), so it agrees with the rest of the app (`docs/rules.md`).
- **This changes one rule of Circles, on purpose and only here.** Circles says a miss is never a shared fact. In a pair, with Closer active **and** the owner's per-habit tick, the partner may be shown the owner's missed days. In every other case the old rule holds exactly, and the screens must not compute or show a miss.
- **Mutual and revocable.** Closer is two switches, one per person, both stored on the member. Turning yours off, leaving, being removed, or the other person leaving makes it inactive. The per-habit tick is kept but does nothing while Closer is inactive, and is cleared when the habit drops below Everything.
- **Off days only for Everything.** The habit's dates are already sent at Streaks and Everything (see the note in the Circles migration); the app shows off days only for an Everything habit whose tick is on and Closer is active. This is enforced by the database's flag (`shows_misses` in the overview, true only when all of that holds) and by the view layer, which drops the days otherwise. It is the same kind of cut as the rest of Circles: honest about being a display rule, not a way to make the dates unreachable. Hiding the dates themselves at lower levels is a separate hardening task.
- **A pair is two.** Triggers enforce exactly two members for a pair (the limit for a group stays 8), one pair per invite, and that a pair cannot be given a third person by any function. A pair counts towards the 10-circles limit like any circle.
- **Showed up together:** a day counts for *Week together* when each of you has a tick that day on a habit you share with the other at *Showed up* or higher. Days are each person's own (their timezone).

## Data (additive migration, after `20261024100000`)

- `circles.kind text not null default 'group' check (kind in ('group','pair'))`. A pair is created by `create_pair()` (name `Partners`, kind `pair`; the owner is the first member). `circle_members_limits` reads the kind: 2 for a pair, 8 for a group.
- `circle_members.closer boolean not null default false`. Set only by `set_closer(p_circle, p_on)` (pairs only; the caller's own row only).
- `habit_shares.shows_misses boolean not null default false`. Set only by `set_share_misses(p_habit, p_circle, p_on)` (pairs only, level Everything only). `set_share` clears it when the level drops below Everything.
- `circle_overview` adds: `circle.kind`, per member `closer` (their own switch, so each of you sees both), `closer_active` on the circle, and per shared habit `shows_misses` (true only when kind is pair, closer is active, and the owner ticked it). `my_circles()` adds `kind`, and for a pair the partner's name and tag (the only place a member's name is read outside the overview, through the same security-definer rules).
- `circle_member_removed` also clears `closer` for the remaining member. Row-level security is unchanged: every write goes through a function, nothing is readable directly.

## Server and app

- `src/server/circles.ts`: `createPair`, `setCloser`, `setShareMisses`; the view layer (`circles-view.ts`) adds `kind`, `closer`, `closerActive`, `showsMisses`, and computes `missedDays` only when `showsMisses` is true, in the owner's own today. A test proves the view returns no off day in any other case, whatever the payload carries.
- Actions and zod inputs for the three; error codes for the new `raise exception` messages (the test that reads the migrations fails if one is left unmapped).
- Screens: *Invite a partner* in the rail; pair header and rail item; *Week together* and *Last week, together* panels (`week-together/`, one folder, own CSS); *Closer* switch and the per-habit checkbox in *What I share*; off days in the panel and in the bubble. All strings in `locales/en/circles.json`.

## PR (one; version bump and changelog here, since it ends Circles)

Commits in this order, tests first in each:

1. **Domain and database.** `closerActive`, `missedDays`, their tests; the migration; pgTAP for the pair limit, `create_pair`, `set_closer`, `set_share_misses`, the overview flags, cleanup on leaving, and that without Closer or the tick no habit carries `shows_misses`.
2. **Server and view.** Wrappers, actions, schema, error codes; the view tests (including "no off day unless allowed").
3. **Screens.** Pair creation and display, panels, Closer and the checkbox, off days; e2e with two sessions (both turn Closer on, one ticks a habit, the other sees an off day; turning Closer off removes it for both at once; a third person cannot join).
4. **Release notes.** The version bump and the changelog entry (features only), and the roadmap line.

## Edge cases

- Partner never joins: the pair stays *Waiting*, nothing is shared, and the owner can close it. The link expires in 7 days and can be renewed.
- One person pauses sharing: *Week together* shows only the other row, and no off days are shown for the paused person.
- Partner leaves: the pair is closed (an empty or one-person pair is not kept), what each shared there goes with them, as for any circle.
- A habit archived or paused: those days are not off days (the existing pause rule).
- A habit ticked on a day it was not due: a tick is always honoured, never an off day.
- Timezones differ: each person's days are their own; *Week together* aligns by date, not by hour.
- Someone has 10 circles already: *Invite a partner* says so, the same message as *New circle*.

## Tests

- Unit: `closerActive`, `missedDays` (daily, weekdays, weekly, paused, archived, today, tick on an off day, window edges), the view's refusal to show an off day without Closer and the tick, the strings exist.
- Database (pgTAP): as listed in commit 1, plus a fresh `db reset` run of the whole suite.
- e2e: the flows in commit 3, a phone-width check, and that a plain circle never shows an off day.

## Decided defaults, open to change

- The window is 14 days. The wording is *Didn't happen* in grey. Closer needs both switches. Off days need the per-habit tick. One number for *Week together* and *Last week*, never per person.
- Reactions work as in circles (no notes).

## Open questions

- Should the per-habit tick be asked for at the moment someone turns Closer on (a short list to choose from), or only afterwards in *What I share*? Default: afterwards, so turning Closer on shows nothing until each person has chosen.
- Should a pair be able to start from an existing friend in a circle (one tap) as well as by a link? Default: link only, for the first release.
