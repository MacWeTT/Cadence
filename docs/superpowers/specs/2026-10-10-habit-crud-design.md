# Cadence — Habit Management (Milestone 3) Design

Date: 2026-10-10 · Status: draft for review · Builds on `2026-10-09-cadence-design.md` (the main spec; its rules still apply unless changed here).

## 1. Scope

**In:** create, edit, archive, restore and delete habits; emoji and color pickers; the Habits page; "pause properly" archive periods; signed-in e2e helper; timezone sync (pulled forward from milestone 4, because a habit's default start date is "today" in the user's timezone).

**Out (later):** ticking habits and showing streaks in the list (milestone 4), the Progress page and heatmap (6), a calendar view (after the MVP), localisation (milestone 8, see section 9).

## 2. Decisions

| Topic | Decision |
|---|---|
| Form presentation | A centered modal dialog, used for both create and edit. |
| UI library | shadcn/ui (Radix primitives, Tailwind, copied into `src/components/ui/`), themed with the existing cream and coffee tokens. Adds Dialog, AlertDialog, DropdownMenu, Popover, Input, Textarea, Label, Button, ToggleGroup and Sonner toasts. The avatar `<details>` menu becomes a DropdownMenu. |
| Emoji picker | `frimousse` (headless, React 19, grid plus search, styled with Tailwind) inside a Popover. Emoji data loads from its default CDN and is cached; self-hosting is a later option. `@emoji-mart/react` was rejected (React 16–18 only, unmaintained) and `emoji-picker-react` (about 40 MB unpacked, its own styling). |
| Archive and restore | "Pause properly": archived periods are stored as date ranges and never count as missed days (section 4). |
| Start date | Defaults to today in the user's timezone, and can never be in the future. |
| Schedule edits | Take effect from next week's start; a habit with no ticks yet is rewritten in place instead. |
| Delete | Only for archived habits, behind a confirmation dialog. |
| Validation | `zod` at the server-action boundary; the domain stays dependency-free. |

## 3. UI

- **Habits page.** A list of active habits. Each row: emoji tile tinted with the habit's color, name, description, schedule chip ("Every day" or "3× a week"), and a "⋯" menu (Edit, Archive). A collapsed **Archived (n)** section lists archived habits with Restore and Delete. A **New habit** button sits in the page header. Empty state for a new user: a short message and a New habit button. No streaks in this milestone.
- **Dialog.** Emoji button (opens the picker popover: a search box plus a grid of emoji, keyboard navigable), name, optional description, 8 color swatches, schedule (toggle: Every day / Times a week, with a 1 to 6 stepper for the latter), start date (native date input, max today). When editing a schedule, the dialog says when the change takes effect ("from next Monday, so your history stays as it was"). Primary action: Save habit.
- **Colors.** Eight keys stored as text: `moss`, `clay`, `ochre`, `rose`, `plum`, `teal`, `sky`, `slate`. Light values start at `#6c7d45 #b8643c #c79a3b #b5576a #7d5a8c #3f8079 #4f7fa6 #6f6a63`; dark values are chosen in the plan and contrast-checked. The tile tint and accents derive from the key.
- **Feedback.** A toast after create, edit, archive and restore; an inline error in the dialog when saving fails. Delete uses an AlertDialog that names the habit.
- **Accessibility.** All dialogs trap focus, close on Escape and return focus; the picker and menus are keyboard operable; color is never the only indicator.

## 4. Behavior rules

1. **Validation.** Name: trimmed, 1 to 80 characters. Description: at most 280, optional. Icon: exactly one emoji (one grapheme, via `Intl.Segmenter`, matching `\p{Extended_Pictographic}`). Color: one of the 8 keys. Schedule: `parseScheduleInput` from the domain. Start date: a real calendar date, from `2000-01-01` up to today in the user's timezone.
2. **Create.** A habit and its first schedule (`effective_from` = start date) are inserted together by a Postgres function, so a habit can never exist without a schedule.
3. **Edit fields.** Name, description, icon and color change immediately and never touch history.
4. **Edit schedule.** A pure domain function `planScheduleChange` decides the outcome: nothing to do (same as the schedule in effect at the effective date); insert or replace a schedule row effective at `nextEditDate`; or delete a pending future row when the user changes back. If the habit has no ticks at all, the schedule rows are replaced by a single row effective at the start date instead (there is no history to protect).
5. **Edit start date.** Moving it earlier is always allowed (a backfill). Moving it later is allowed only up to the habit's earliest tick.
6. **Archive and restore (pauses).**
   - New table `habit_archive_periods (id, habit_id, archived_on date, restored_on date null)`, with at most one open period (`restored_on is null`) per habit. `habits.archived_at` stays as the "currently archived" flag for easy filtering.
   - Archive sets `archived_at` and opens a period with `archived_on` = today in the user's timezone. Restore clears `archived_at` and closes the period with `restored_on` = today. Both happen in one database function each.
   - **Domain:** `HabitData.archivedOn` is replaced by `pauses: { from: CalendarDate; to: CalendarDate | null }[]` (`to` exclusive; null means still paused). A day inside a pause is `inactive` and never `missed`, unless it was ticked, in which case it is `done` (a tick is always honored, including on the archive day itself). A week that overlaps a pause is `excluded` from rates and does not break a streak.
   - **Streaks.** Paused days and paused weeks are neutral: they neither extend nor break a streak, so archiving and restoring a habit keeps the streak it had. A habit that is currently archived has a current streak of 0. A partial first week and a week straddling a schedule-kind change still end a streak, as before.
   - This resolves the minor review finding that an unticked archive day was counted as missed.
7. **Delete.** Only archived habits can be deleted. It requires confirming in a dialog, and removes the habit with its schedules, completions and archive periods (cascade).
8. **Timezone sync.** On load of the signed-in app, if the profile timezone is still `UTC` and the browser reports a different valid IANA timezone, a server action saves it. The value is validated against `Intl.supportedValuesOf('timeZone')` before saving.
9. **Authorization.** Every mutation runs in a server action that verifies the user itself (`getUser()`), then relies on RLS as the second layer. Actions return `{ ok: true }` or `{ ok: false, error, fieldErrors? }` and never throw for expected failures.

## 5. Data model changes (migration 2)

- `habit_archive_periods` with RLS (owner via `habits.user_id`), a partial unique index for one open period per habit, and a check that `restored_on` is after or equal to `archived_on`.
- Functions: `create_habit(...)`, `archive_habit(habit_id, on_date)`, `restore_habit(habit_id, on_date)` (security invoker, so RLS applies, each in one transaction).
- Existing rows: none exist yet in production, so no data migration is needed.

## 6. Architecture

- `src/domain/`: `schedule-change.ts` (`planScheduleChange`), and pauses replacing `archivedOn` in `types.ts`, `status.ts`, `streaks.ts`, `rates.ts` (existing tests are updated and extended).
- `src/server/habits.ts`: data access (list, get, create, update, archive, restore, delete) and the conversion of DB rows to `HabitData`.
- `src/app/(app)/habits/`: `page.tsx`, `actions.ts`, and the dialog and row components. Session reads stay behind `<Suspense>`, and `connection()` is called before Supabase auth calls, as in milestone 1.
- `src/lib/palette.ts`: color keys and their tokens. `src/components/ui/`: shadcn components.
- New dependencies: shadcn's own (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`), `sonner`, `frimousse`, `zod`. Versions are verified at plan time.

## 7. Testing

- **Vitest:** `planScheduleChange` (all outcomes, both week starts); pauses in `dayStatus`, `weekStatus`, streaks and rates (pause inside and across weeks, ticked archive day, restore keeps streak, currently archived); zod schemas; emoji validation.
- **pgTAP:** `create_habit` is atomic; `archive_habit` and `restore_habit` maintain the period and the one-open-period rule; RLS on the new table, including cross-user and `anon` cases (this also closes the deferred pgTAP gaps from the milestone 1 review).
- **Playwright:** a signed-in helper (test user via the Supabase admin API) is added, plus the nav test dropped in milestone 1; flows for create, edit, schedule-change message, archive, restore, delete with confirmation, emoji search, and Escape/focus behavior of the dialog.
- Lint, `tsc` and the full suite must pass before the milestone is done.

## 8. Open items

- Dark-theme values for the 8 colors (chosen and contrast-checked in the plan).
- Whether emoji data should be self-hosted (default: no, revisit before deployment).
- Bulk actions and drag-to-reorder are not included; reordering will be considered if the habit count grows.

## 9. Localisation (for a later milestone)

Planned as **milestone 8**, once the beta is feature-complete: add `next-intl` (built on `use-intl`) with `en` as the first locale and the infrastructure for more. Nothing is built in milestone 3, but two rules keep it cheap later: user-facing sentences are never assembled by string concatenation, and dates and numbers are formatted through `Intl` helpers, never by hand.
