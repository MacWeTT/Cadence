# Habit Management (Milestone 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create, edit, archive, restore and delete habits from a Habits page, with emoji and color pickers, "pause properly" archive periods, and the signed-in e2e tooling to test it.

**Architecture:** Domain changes first (pauses replace `archivedOn`; a pure `planScheduleChange`), then the database (archive periods plus transactional functions), then shadcn/ui and the server layer, then the Habits page and dialog. Mutations are server actions that verify the user, validate with zod, and call Postgres functions; RLS is the second layer.

**Tech Stack:** Next.js 16 (Cache Components), Tailwind 4, shadcn/ui (Radix), `frimousse`, `sonner`, `zod`, Supabase, Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-habit-crud-design.md` (read first; it builds on `2026-10-09-cadence-design.md`). Work on branch `feat/habit-crud`; it lands as a PR into `develop`, never a direct merge.

## Global Constraints

- Everything from the milestone 1-2 plan still applies: TypeScript only, dates as `YYYY-MM-DD`, domain code pure, `connection()` before Supabase auth calls, session reads behind `<Suspense>`, RLS on every table, no secrets in browser code.
- Read `node_modules/next/dist/docs/` before using a Next API you have not used here (`AGENTS.md`).
- Habit name: trimmed, 1 to 80 characters. Description: at most 280, optional. Colors: exactly `moss clay ochre rose plum teal sky slate`. Schedules: `daily` or `weekly_count` with 1 to 6.
- Start date: a real date from `2000-01-01` up to today in the user's timezone. Archived habits are read-only except Restore and Delete. Delete is offered only for archived habits.
- Light color values: `#6c7d45 #b8643c #c79a3b #b5576a #7d5a8c #3f8079 #4f7fa6 #6f6a63`. Dark values must reach a 3:1 contrast against the dark surface `#2a2118` (Task 6 tests it).
- UI components come from shadcn into `src/components/ui/`; keep generated files unedited apart from theming. User-facing sentences are never built by string concatenation, and dates and numbers are formatted through `Intl` (prepares milestone 8, localisation).
- Every task ends with lint, typecheck and its tests passing, then a commit ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never claim a command passed without running it.

## Review Focus

1. Double-clicking Save creates exactly one habit (Task 8).
2. Emoji validation accepts skin-tone, ZWJ and flag emoji and rejects letters, digits and two emoji (Task 6).
3. Archive then restore on the same day is a zero-length pause with no effect on any day or streak (Task 1).
4. Two schedule edits in one week replace the pending row without a duplicate-date error (Tasks 2, 3).
5. Name of only spaces, 81 characters, description of 281 characters are rejected with a field error (Tasks 6, 8).
6. Passing another user's habit id to any function changes nothing and reports failure (Tasks 3, 7).
7. Moving the start date later than the first tick is rejected; earlier is accepted (Tasks 7, 9).

---

### Task 1: Pauses replace `archivedOn` in the domain

**Files:** Modify `src/domain/types.ts`, `status.ts`, `streaks.ts`, `rates.ts`, `test-helpers.ts`, `status.test.ts`, `streaks.test.ts`, `rates.test.ts`, `index.ts`, `docs/rules.md`.

**Interfaces:**
- Produces in `types.ts`: `Pause = { from: CalendarDate; to: CalendarDate | null }` (`to` exclusive; `null` means still paused). `HabitData` drops `archivedOn` and gains `pauses: Pause[]`.
- Produces in `status.ts`: `isPaused(h: HabitData, date: CalendarDate): boolean`; `WeekStatus.status` gains `'paused'`. `makeHabit` takes `pauses` instead of `archivedOn`.
- Rules (spec section 4, rule 6): a paused day is `inactive` unless ticked, then `done`. A week overlapping a non-empty pause is `paused` (still reporting `done` and `target`), checked before `excluded`. Paused days and paused weeks are neutral in streaks (skipped, never extend or break) and are skipped in rates. A habit with an open pause (`to: null`) has `currentStreak` count 0; `longestStreak` is unaffected.

- [ ] **Step 1: Update the tests first.** Replace every `archivedOn` use with `pauses`, then add (today `2026-10-09`, Monday weeks, daily habit from `2026-10-01` unless stated):
  - Pause `{from:'2026-10-05', to:'2026-10-07'}`, done Oct 1-4 and 7-8: Oct 5 and 6 are `inactive`, Oct 7 `done`; with Oct 5 also ticked, Oct 5 is `done`.
  - Open pause from Oct 5, done Oct 1-5: Oct 5 `done` (ticked archive day), Oct 6 `inactive` (not `missed`).
  - Streak across that closed pause: `currentStreak` is `{day, 6}`. With the open pause: count 0, `longestStreak` `{day, 4}` for done Oct 1-4.
  - Zero-length pause `{from:'2026-10-09', to:'2026-10-09'}` with done Oct 1-8: Oct 9 is `pending` and `currentStreak` is 8 (Review Focus 3).
  - Weekly 3/wk from `2026-09-21` with pause `{from:'2026-09-30', to:'2026-10-02'}`, ticks Sep 21-23 and Oct 5-7: week `2026-09-28` is `paused`; `currentStreak` is `{week, 2}`.
  - Rates: daily from Oct 1, pause `{from:'2026-10-03', to:'2026-10-06'}`, done Oct 1, 2, 6, 7, window Oct 1-9: `{done:4, expected:5}`. Weekly with the pause above and three ticks in each of weeks Sep 21 and Sep 28: `{done:3, expected:3}`.
  - The old archived expectations change deliberately: archived daily from Oct 1 with `{from:'2026-10-05', to:null}` and no ticks gives `{done:0, expected:4}`; the week of `2026-10-05` is `paused`.
- [ ] **Step 2:** `npx vitest run src/domain`. Expected: FAIL (type and behavior mismatches).
- [ ] **Step 3:** Implement per the Interfaces block, reusing `dayStatus` and `weekStatus` in streaks and rates (streak loops skip a day when `isPaused` and it is not done).
- [ ] **Step 4:** `npm test && npm run lint && npm run typecheck`. Expected: all PASS. Update `docs/rules.md` (archive section now describes pauses and neutral streaks).
- [ ] **Step 5:** Commit `feat(domain): archive pauses replace archivedOn`.

### Task 2: `planScheduleChange` and `toCalendarDate`

**Files:** Create `src/domain/schedule-change.ts`, `src/domain/schedule-change.test.ts`. Modify `src/domain/dates.ts`, `dates.test.ts`, `index.ts`.

**Interfaces:**
- Consumes `Schedule`, `scheduleOn`, `nextEditDate`, `WeekStart`.
- Produces `toCalendarDate(ts: string | Date, timeZone: string): CalendarDate` (the calendar date of an instant in a timezone).
- Produces `type ScheduleChange = { action: 'none' } | { action: 'replace_all'; schedule: Schedule } | { action: 'upsert'; schedule: Schedule } | { action: 'delete_pending' }` and `planScheduleChange(input: { schedules: Schedule[]; desired: { kind: 'daily' } | { kind: 'weekly_count'; timesPerWeek: number }; startDate: CalendarDate; today: CalendarDate; weekStartsOn: WeekStart; hasCompletions: boolean }): ScheduleChange`.
- Rules: no ticks yet means a single row effective at `startDate` (`replace_all`, or `none` if that is already the state). Otherwise compare `desired` with the schedule in effect today: equal and nothing pending gives `none`; equal with a pending row gives `delete_pending`; different gives `upsert` effective at `nextEditDate(today, weekStartsOn)`, or `none` if the single pending row already equals `desired` at that date. Applying `upsert` or `delete_pending` removes every row with `effectiveFrom > today` first (Review Focus 4).

- [ ] **Step 1: Write the failing tests** (today Fri `2026-10-09`, Monday weeks, so the effective date is `2026-10-12`; Sunday weeks `2026-10-11`): daily@09-01 with ticks and desired weekly 3 is `upsert` weekly 3 @ 10-12; desired daily is `none`; pending weekly 3@10-12 and desired daily is `delete_pending`; pending weekly 3 and desired weekly 4 is `upsert` weekly 4 @ 10-12; pending weekly 3 and desired weekly 3 is `none`; Sunday weeks give 10-11; no ticks, start `2026-10-01`, schedules `[daily@10-01]`, desired weekly 2 is `replace_all` weekly 2 @ 10-01, desired daily is `none`; no ticks with two rows is `replace_all`. For `toCalendarDate`: `'2026-10-09T20:00:00Z'` in `Asia/Kolkata` is `'2026-10-10'`, in `America/New_York` is `'2026-10-09'`.
- [ ] **Step 2:** `npx vitest run src/domain`. Expected: FAIL.
- [ ] **Step 3:** Implement both; `toCalendarDate` reuses the `todayIn` formatting with the given instant.
- [ ] **Step 4:** `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): planScheduleChange and toCalendarDate`.

### Task 3: Migration 2, functions and pgTAP

**Files:** Create `supabase/migrations/<timestamp>_habit_management.sql` (via `npx supabase migration new habit_management`), `supabase/tests/habit_management.test.sql`, `src/lib/supabase/database.types.ts`. Modify `package.json` (`db:types`), `supabase/tests/schema.test.sql` only if a count changes.

**Interfaces:** Produces table `habit_archive_periods(id uuid pk, habit_id uuid → habits on delete cascade, archived_on date not null, restored_on date null, check (restored_on is null or restored_on >= archived_on))` with a partial unique index on `(habit_id) where restored_on is null`, RLS through `habits.user_id = auth.uid()`. Produces security-invoker functions (execute revoked from `public` and `anon`, granted to `authenticated`), each raising when no row is affected:
- `create_habit(p_name text, p_description text, p_icon text, p_color text, p_start_date date, p_kind text, p_times_per_week smallint) returns uuid` (inserts the habit for `auth.uid()` plus its first schedule effective at `p_start_date`, atomically).
- `archive_habit(p_habit_id uuid, p_on date) returns void` and `restore_habit(p_habit_id uuid, p_on date) returns void` (maintain `archived_at` and the open period; restore closes it with `greatest(p_on, archived_on)`).
- `apply_schedule_change(p_habit_id uuid, p_action text, p_kind text, p_times_per_week smallint, p_effective_from date, p_today date) returns void` with actions `replace_all` (delete all rows, insert one), `upsert` (delete rows with `effective_from > p_today`, insert or update at `p_effective_from`) and `delete_pending` (delete rows with `effective_from > p_today`).
- `npm run db:types` writes `database.types.ts` from the local database.

- [ ] **Step 1: Write the failing pgTAP test** `habit_management.test.sql` (run as users A and B like `schema.test.sql`): `create_habit` creates one habit and one schedule row; with an invalid kind it raises and leaves no habit; `archive_habit` twice raises; archive then restore leaves one closed period, none open; archive on the same day as restore yields a zero-length period; `apply_schedule_change` `upsert` twice for the same date leaves one pending row (Review Focus 4); `replace_all` leaves exactly one row; A calling `archive_habit`, `restore_habit`, `apply_schedule_change` or `create_habit` pointing at B's habit raises or affects nothing (Review Focus 6); `anon` selects zero rows from all five tables; A cannot update or delete B's schedules, delete B's habit or update B's profile; A cannot re-point her own completion or schedule to B's `habit_id`; `habit_archive_periods` is visible only to its owner; deleting a habit cascades to its periods.
- [ ] **Step 2:** `npx supabase test db`. Expected: FAIL (functions and table missing).
- [ ] **Step 3:** Write the migration per the Interfaces block, then `npx supabase db reset`, add the `db:types` script and run it.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): archive periods and habit management functions`.

### Task 4: Signed-in e2e helper

**Files:** Create `e2e/global-setup.ts`, `e2e/support/session.ts`, `e2e/support/data.ts`. Modify `playwright.config.ts`, `e2e/auth.spec.ts`, `.gitignore` (`e2e/.auth/`), `.env.example`, `.env.local` (not committed). Create `e2e/shell.spec.ts`.

**Interfaces:** Produces `signInState(email: string, password: string): Promise<StorageState>` (creates a fresh session with the Supabase admin and password sign-in, capturing the `@supabase/ssr` cookies for `localhost`); `E2E_USER`; `resetUserData(): Promise<void>` (deletes the e2e user's habits with the service client); `seedCompletion(habitId: string, date: string): Promise<void>`; `getHabits(): Promise<Row[]>` for assertions. `SUPABASE_SERVICE_ROLE_KEY` is read from `.env.local` (the local well-known key from `npx supabase status`), loaded with `@next/env`. The config sets `globalSetup`, default `storageState` `e2e/.auth/user.json`, and `timezoneId: 'UTC'`; `auth.spec.ts` uses an empty storage state.

- [ ] **Step 1: Write the failing test** `e2e/shell.spec.ts` (signed in): `/today` shows the heading "Today", the links Today, Habits, Progress, and a button named "Account menu".
- [ ] **Step 2:** `npx playwright test`. Expected: FAIL (redirected to `/login`).
- [ ] **Step 3:** Implement the global setup (create the user if missing with a confirmed email, reset its data, write the storage state) and the helpers.
- [ ] **Step 4:** `npx playwright test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `test(e2e): signed-in session helper`.

### Task 5: shadcn/ui, tokens and the avatar dropdown

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`, `src/components/user-menu.tsx`, `src/components/top-bar.tsx`, `src/components/theme-toggle.tsx`, `src/app/auth/actions.ts`, `package.json`. Create `components.json`, `src/lib/utils.ts`, `src/components/ui/*`, `e2e/user-menu.spec.ts`.

**Interfaces:** Produces the shadcn components `button dialog alert-dialog dropdown-menu popover input textarea label toggle-group sonner` in `src/components/ui/`, and `<Toaster />` mounted in the root layout following the next-themes theme. Token reconciliation: shadcn defines `--muted` as a background; this project's `--muted` is the muted text color. Rename ours to `--ink-muted` (utility `text-ink-muted`, updating every use), then alias shadcn's variables to the project tokens (`--background`→`--bg`, `--card`/`--popover`→`--surface`, `--primary`→`--moss`, `--border`/`--input`→`--line`, `--muted`→`--line`, `--muted-foreground`→`--ink-muted`, `--destructive`→`--clay`, `--ring`→`--clay`) in both themes.

- [ ] **Step 1: Write the failing test** `e2e/user-menu.spec.ts` with a fresh session from `signInState` (so signing out does not break the shared one): opening "Account menu" shows the account name and a "Sign out" item; clicking outside closes it; choosing "Sign out" lands on `/login`.
- [ ] **Step 2:** `npx playwright test e2e/user-menu.spec.ts`. Expected: FAIL (the `<details>` menu does not close on outside click and has no menu roles).
- [ ] **Step 3:** Run `npx shadcn@latest init -t next -b radix -y`, then `npx shadcn@latest add` the components above. Reconcile tokens as described; replace the `<details>` in `user-menu.tsx` with the DropdownMenu (keep the server component reading the user and passing data down); change `signOut` to `signOut({ scope: 'local' })`; remove the `shortcut:` comment.
- [ ] **Step 4:** `npx playwright test && npm run lint && npm run typecheck && npm run build`. Expected: PASS, and light and dark themes still render the shell correctly.
- [ ] **Step 5:** Commit `feat(ui): adopt shadcn/ui, reconcile tokens, accessible avatar menu`.

### Task 6: Palette and validation

**Files:** Create `src/lib/palette.ts`, `src/lib/palette.test.ts`, `src/lib/habit-schema.ts`, `src/lib/habit-schema.test.ts`. Modify `src/app/globals.css`.

**Interfaces:** Produces `COLOR_KEYS` (the eight keys, readonly tuple), `type ColorKey`, `PALETTE: Record<'light' | 'dark', Record<ColorKey, string>>`, `habitColor(key: ColorKey): string` (returns `var(--habit-<key>)`), CSS variables `--habit-<key>` per theme. Produces `isSingleEmoji(s: string): boolean`, `habitInputSchema(today: CalendarDate)` (zod; fields `name`, `description` optional, `icon`, `color`, `kind`, `timesPerWeek` optional, `startDate`; `timesPerWeek` required exactly when `kind` is `weekly_count`), `type HabitInput`, and `isValidTimeZone(tz: string): boolean`.

- [ ] **Step 1: Write the failing tests:** each `PALETTE.light` and `PALETTE.dark` color has a contrast of at least 3:1 against `#faf2e1` and `#2a2118` respectively; `globals.css` defines every `--habit-<key>` with exactly the `PALETTE` values. `isSingleEmoji` accepts `'📖'`, `'👍🏽'`, `'👨‍👩‍👧'`, `'🇮🇳'`, `'❤️'` and rejects `'a'`, `'1'`, `''`, `'📖📖'`, `'ab'` (Review Focus 2). The schema accepts a valid daily and weekly input; rejects name `'   '`, an 81-character name, a 281-character description (Review Focus 5), `timesPerWeek` 0 and 7, a start date after `today` or before `2000-01-01`, an unknown color, and `kind: 'daily'` with `timesPerWeek`. `isValidTimeZone('Asia/Kolkata')` is true, `'Not/AZone'` false.
- [ ] **Step 2:** `npx vitest run src/lib`. Expected: FAIL.
- [ ] **Step 3:** Implement. Pick dark values that meet 3:1 and keep the light values from Global Constraints. `isSingleEmoji` uses `Intl.Segmenter` (one grapheme) plus `/\p{Extended_Pictographic}|\p{Regional_Indicator}/u`.
- [ ] **Step 4:** `npm test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: habit palette and input validation`.

### Task 7: Server data layer and actions

**Files:** Create `src/server/habits.ts`, `src/server/habits.test.ts`, `src/app/(app)/habits/actions.ts`, `src/app/(app)/timezone-sync.tsx`, `src/app/(app)/timezone-actions.ts`. Modify `src/app/(app)/layout.tsx`, `src/lib/supabase/server.ts` (typed client using `Database`).

**Interfaces:**
- Consumes the Task 2 to 6 outputs and `getUser`.
- Produces `type HabitListItem = { id: string; name: string; description: string | null; icon: string; color: ColorKey; startDate: CalendarDate; archivedAt: string | null; schedule: Schedule; pendingSchedule: Schedule | null; hasCompletions: boolean }`.
- Produces in `habits.ts`: `getProfile(): Promise<{ timezone: string; weekStartsOn: WeekStart }>`, `listHabits(): Promise<{ active: HabitListItem[]; archived: HabitListItem[] }>`, `createHabit(input: HabitInput): Promise<void>`, `updateHabit(id: string, input: HabitInput): Promise<void>` (updates fields and start date, then applies `planScheduleChange` through `apply_schedule_change`; rejects archived habits and a start date later than the first tick), `archiveHabit(id)`, `restoreHabit(id)`, `deleteHabit(id)` (archived only). A pure `toListItem(row, today): HabitListItem` is exported for testing.
- Produces `type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> }` and the actions `createHabitAction(input: unknown)`, `updateHabitAction(id: string, input: unknown)`, `archiveHabitAction(id: string)`, `restoreHabitAction(id: string)`, `deleteHabitAction(id: string)`, `syncTimezoneAction(tz: string)`. Each verifies `getUser()` first, validates with the schema (using today in the profile timezone), never throws for expected failures, and revalidates `/habits`.
- `<TimezoneSync />` (client, in the app layout): once per browser session, if the browser timezone is valid and differs from the profile's (still `UTC`), calls `syncTimezoneAction`.

- [ ] **Step 1: Write the failing tests** for the pure parts: `toListItem` picks the schedule in effect today and the pending one, and flags `hasCompletions`; archived rows are split out; an invalid timezone is rejected by `syncTimezoneAction`'s guard function (`shouldSyncTimezone(current: string, browser: string): boolean` is true only for `'UTC'` to a valid different zone).
- [ ] **Step 2:** `npx vitest run src/server`. Expected: FAIL.
- [ ] **Step 3:** Implement. Server-side rejects for edits to archived habits and another user's ids come from RLS plus the functions' row-count checks (covered in Task 3).
- [ ] **Step 4:** `npm test && npm run lint && npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(server): habit data layer, actions and timezone sync`.

### Task 8: Habits page and create dialog

**Files:** Create `src/app/(app)/habits/habit-dialog.tsx`, `emoji-picker.tsx`, `habit-list.tsx`, `habit-row.tsx`, `src/lib/schedule-label.ts`, `e2e/habits-create.spec.ts`. Modify `src/app/(app)/habits/page.tsx`, `package.json` (`frimousse`).

**Interfaces:** Produces `scheduleLabel(s: Schedule): string` (`'Every day'`, `'3× a week'`). `<HabitDialog mode="create" | { edit: HabitListItem } open onOpenChange />` with accessible names: title "New habit", fields "Name", "Description (optional)", button "Choose emoji" (opens a Popover with a search field "Search emoji" and a grid from `frimousse`), a "Color" radio group (each radio named by its key), a "Schedule" toggle group ("Every day", "Times a week") with a "Times per week" number input (1 to 6), a "Starts" date input (`max` today, default today in the profile timezone), "Save habit" and "Cancel". Save is disabled while pending (Review Focus 1); field errors render inline; a success shows the toast "Habit created". The page shows an empty state (heading "No habits yet" and a "New habit" button) when the list is empty, and rows with the emoji tile (tinted by `habitColor`), name, description and schedule chip otherwise. The page reads the session behind `<Suspense>`.

- [ ] **Step 1: Write the failing e2e** `habits-create.spec.ts`: the empty state shows before any habit; creating "Read" with the emoji found by searching "book" and a daily schedule shows a row "Read" with "Every day" and the toast; a weekly habit with 3 shows "3× a week"; an empty name keeps the dialog open with an error; a name of 81 characters shows an error (Review Focus 5); double-clicking "Save habit" creates exactly one row (Review Focus 1, checked with `getHabits()`); Escape closes the dialog and focus returns to "New habit"; keyboard-only: the emoji grid is reachable and selectable with arrow keys and Enter.
- [ ] **Step 2:** `npx playwright test e2e/habits-create.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** `npm i frimousse`. Implement the components with the shadcn pieces from Task 5; read the installed `frimousse` types before wiring `onEmojiSelect`.
- [ ] **Step 4:** `npx playwright test && npm run lint && npm run typecheck && npm run build`. Expected: PASS, and a manual look at both themes.
- [ ] **Step 5:** Commit `feat(habits): Habits page and create dialog`.

### Task 9: Edit dialog and schedule-change message

**Files:** Modify `habit-dialog.tsx`, `habit-row.tsx`. Create `e2e/habits-edit.spec.ts`.

**Interfaces:** Consumes `updateHabitAction`. The dialog in edit mode is titled "Edit habit", prefilled, and shows the note "Changes apply from <weekday date>, so your history stays as it was." (formatted with `Intl.DateTimeFormat`, no string concatenation of sentence parts) only when the habit has ticks and the schedule changed. A row with a pending schedule shows "Changes to <label> on <date>". The toast is "Habit saved".

- [ ] **Step 1: Write the failing e2e:** editing name, emoji and color shows immediately in the row; a habit without ticks changes its schedule immediately (chip updates, no note); a habit with a seeded completion shows the note, keeps its current chip and shows the pending line, and a second edit the same week replaces the pending change (Review Focus 4); changing back removes the pending line; moving the start date later than the seeded completion shows a field error while moving it earlier saves (Review Focus 7); an archived habit has no Edit item.
- [ ] **Step 2:** `npx playwright test e2e/habits-edit.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement edit mode and the row menu "Edit" item with the shadcn DropdownMenu.
- [ ] **Step 4:** `npx playwright test && npm run lint && npm run typecheck`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(habits): edit habits and schedule-change handling`.

### Task 10: Archive, restore and delete

**Files:** Modify `habit-list.tsx`, `habit-row.tsx`. Create `src/app/(app)/habits/delete-dialog.tsx`, `e2e/habits-archive.spec.ts`.

**Interfaces:** Consumes the archive, restore and delete actions. Row menu: active rows offer "Edit" and "Archive"; archived rows (in a collapsed "Archived (n)" section) offer "Restore" and "Delete". Delete opens an AlertDialog "Delete <name>?" with "Cancel" and "Delete" buttons. Toasts: "Habit archived", "Habit restored", "Habit deleted".

- [ ] **Step 1: Write the failing e2e:** archiving moves a habit to the Archived section and updates its count; restoring moves it back; after archive then restore the database has exactly one closed period and none open; archiving and restoring in the same test run leaves `restored_on` equal to `archived_on` (Review Focus 3); Delete exists only in the Archived section; Cancel keeps the habit; confirming removes it; the Escape key closes the confirmation without deleting.
- [ ] **Step 2:** `npx playwright test e2e/habits-archive.spec.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the section, menu items and delete dialog.
- [ ] **Step 4:** Run everything: `npm test && npx supabase test db && npm run lint && npm run typecheck && npm run build && npx playwright test`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(habits): archive, restore and delete`.

---

## Not in this plan

Ticking habits and showing streaks (milestone 4), the Progress page, calendar view, localisation (milestone 8), and self-hosting the emoji data. Opening the PR into `develop` is the final step after the whole-branch review.
