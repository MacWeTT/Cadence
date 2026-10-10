# Cadence — Check-ins and the Today page (Milestone 4) Design

Date: 2026-10-10 · Status: draft for review · Builds on `2026-10-09-cadence-design.md` and `2026-10-10-habit-crud-design.md`; their rules still apply unless changed here.

## 1. Scope

**In:** the Today page as a checklist; ticking and unticking a habit for a day (optimistic, with rollback); streak and weekly-progress tags on each row; backfill by moving between days; empty states; a database function that enforces the tick rules; tests at every layer.

**Out (later):** the side card with "3 of 5" and the week strip (milestone 5); the Progress page, heatmap and per-habit history (6); reminders; a calendar view (after the MVP); localisation (8).

## 2. Decisions

| Topic | Decision |
|---|---|
| Layout | The checklist-first Today layout chosen in the main spec, section 9: a left column with the date title, then "To do" and "Done" lists. The margin card is milestone 5. |
| Weekly habits | Always listed in "To do" until ticked on the viewed day. The tag shows "1 of 3 this week", and "Goal met" once the target is reached. Extra ticks are bonus and never push a rate above 100%. |
| Moving between days | Previous and next day arrows plus a "Today" button, and the viewed date in the URL. No calendar picker yet (the shadcn Calendar can replace the arrows later without changing the data flow). |
| Ticking | One tap toggles. The change shows immediately and rolls back with a toast if saving fails. |
| Streak tags | Shown only when viewing today, computed by the existing domain functions. |
| Rule enforcement | A Postgres function validates every tick; the server action only translates its errors. |

## 3. UI

- **Header.** "Today" as the page title when viewing today, otherwise the date (for example "Thursday 8 Oct"). Beside it: a previous-day button, a next-day button (disabled on today) and a "Today" button (shown when viewing another day). The earliest reachable day is the earliest start date of any listed habit.
- **Rows.** A round check button on the left (`role="checkbox"`, named "Mark <habit> done" or "Mark <habit> not done"), the emoji tile tinted with the habit color, the name, and a quiet tag on the right: `🔥 12 days` for a daily habit with a streak, `1 of 3 this week` (with `· 4 week streak` when there is one) for a weekly habit. Done rows are dimmed with a strikethrough. Space and Enter toggle the focused row.
- **Sections.** "To do" first, then "Done today" (just "Done" on other days). Rows move between sections as they are ticked.
- **Empty states.** No habits at all: a short message and a "Create your first habit" link to `/habits`. Everything ticked: "Nothing left for today." (or "Nothing left for this day.") above the Done list. No habit applies to the viewed day (for example before every start date): "No habits on this day."
- **Feedback.** A toast only on failure ("Couldn't save that. Try again."); success is the tick itself.
- **Accessibility.** The list is a real list, buttons are keyboard operable with visible focus, and state is never color alone (check mark plus strikethrough).

## 4. Behavior rules

1. **Which habits are listed for a date D.** Active (not archived now) habits whose start date is on or before D and that have a schedule in effect on D. A habit paused on D (a closed archive period) is listed only if it was ticked on D. Archived habits are never listed.
2. **Daily habit on D.** In "Done" if ticked on D, else in "To do". Its tag is the current streak (only when D is today and the streak is above 0).
3. **Weekly habit on D.** In "Done" if ticked on D, else in "To do". Its tag is the week's progress for the week containing D, counting ticks up to today: `done of target this week`, or "Goal met" when `done >= target`, plus the weekly streak when D is today and it is above 0. A partial first week still shows its progress.
4. **Tick rules** (enforced in the database): the day is not after today in the user's timezone; the day is not before the habit's start date; the habit is not archived. Ticking an already ticked day, or unticking an unticked day, succeeds and changes nothing. A tick is always one row per habit per day.
5. **Pending guard.** While a tick for a habit and day is in flight, that row's button is disabled, so a double tap sends one request.
6. **URL.** The viewed day is the `date` search parameter (`/today?date=2026-10-08`). A missing, malformed or future date means today. The Today link in the top bar goes to `/today`.
7. **Errors.** An expected failure (day out of range, habit archived or missing) rolls the row back and shows the toast; the page then refreshes from the server so the list is correct.
8. **Timezone.** "Today" is computed in the profile timezone, as everywhere else.

## 5. Data

- **Migration 3:** `set_completion(p_habit_id uuid, p_date date, p_done boolean, p_today date) returns void`, security invoker (RLS applies), `search_path = ''`, execute revoked from `public` and `anon`. It raises `P0001` with a distinct message for each broken rule (habit not found, archived, before start, in the future) and otherwise inserts with `on conflict do nothing` or deletes.
- No new tables. The existing unique `(habit_id, completion_date)` still prevents duplicates.
- **Reading.** One server read loads the user's active habits with their schedules, archive periods and every completion date, builds `HabitData` for each, and lets the domain compute statuses and streaks. Shortcut: it loads the full completion history, which is fine for one person's data; limit it to a window or aggregate in SQL when volume grows.

## 6. Architecture

- `src/domain/`: `isListedOn(h, date, ctx)` (rule 1) and `weekProgress(h, date, ctx)` (rule 3), pure and unit-tested.
- `src/server/today-view.ts`: pure mapping from database rows to `HabitData` and to the rows the page shows (tags included), unit-tested.
- `src/server/today.ts`: the data read (`server-only`).
- `src/app/(app)/today/`: `page.tsx` (reads `searchParams`, session behind `<Suspense>`, `connection()` before auth calls), `actions.ts` (`setCompletionAction`), `today-client.tsx`, `check-row.tsx`, `date-nav.tsx`.
- Optimistic state lives in the client component with React's `useOptimistic`; the server action returns the same `{ ok } | { ok: false, error }` shape as the habit actions.

## 7. Testing

- **Vitest:** `isListedOn` (before start, archived, closed pause with and without a tick, weekly and daily, schedule change mid-history); `weekProgress` (goal met, bonus ticks, partial first week, Sunday week start); the row mapping (section placement, tags, streak only on today).
- **pgTAP:** `set_completion` for each rule and error; idempotent tick and untick; cross-user and `anon` cases; a tick on the archive day of a paused habit is refused only when the habit is currently archived.
- **Playwright:** tick and untick persists after reload; weekly progress changes; a failed save rolls back (by blocking the request); moving to yesterday and ticking there; arrows disabled at the bounds; future and malformed `date` values fall back to today; the three empty states; keyboard toggling; a double tap sends one request; dark and light screenshots checked by eye.
- Lint, `tsc`, the build and the full suite must pass.

## 8. Open items

- Whether the streak should also show on past-day views (decided: no, to avoid a confusing "current streak" on an old day).
- Keyboard shortcuts such as J and K to move between rows are not included; native Tab, Space and Enter only.
- Performance of the full-history read (see section 5).
