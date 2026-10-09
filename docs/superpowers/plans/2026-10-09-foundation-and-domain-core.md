# Cadence: Foundation and Domain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running Next.js app with the themed shell, Google sign-in against a local Supabase, the full database schema with RLS, and a fully tested pure-TypeScript domain core (dates, schedules, statuses, streaks, rates).

**Architecture:** Spec milestones 1 and 2. Business logic lives in `src/domain/` as pure functions on calendar-date strings, with no React, DB or I/O. The database is created by SQL migrations and verified with pgTAP. Auth uses `@supabase/ssr`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind 4, TypeScript, Vitest, Playwright, Supabase (Postgres, Auth, CLI + Docker), `next-themes`.

**Spec:** `docs/superpowers/specs/2026-10-09-cadence-design.md` (sections 3, 4, 5 and 9 are the ones this plan implements; read them first).

## Global Constraints

- TypeScript everywhere; no `any` without a comment. No Express, GraphQL, Redis or extra backend service.
- Dates are `YYYY-MM-DD` strings. Arithmetic uses UTC so DST never shifts a day. No date library. "Today" is computed in the user's IANA timezone via `Intl`.
- Week start is Monday (`1`) or Sunday (`7`), read from the profile; never hard-coded.
- Schedule kinds are exactly `daily` and `weekly_count` (1 to 6 per week; 7 per week is `daily`).
- Missed days use the muted peach token and never red.
- Light tokens: bg `#f3e8d3`, surface `#faf2e1`, top bar `#efe2c8`, text `#3b2f24`, muted `#8a7761`, divider `#e2d3b6`, moss `#6c7d45`, clay `#b8643c`, missed `#d9b39a`, heat 0-4 `#eadfc6 #d9dcae #b4c07f #8a9c58 #5f7036`. Dark (coffee) tokens: bg `#1f1812`, surface `#2a2118`, top bar `#18120d`, text `#f0e4d0`, muted `#a38f76`, divider `#3b2e21`, moss `#9bb06a`, clay `#e0905f`, missed `#7a5340`, heat 0-4 `#2f251a #414a2b #5d6e3a #80954a #a6be66`.
- Page content is capped at 1180px and centered. Headings and big numbers use a serif stack starting with Georgia; everything else uses the system sans.
- Server secrets never reach browser code. RLS is on for every table.
- Every task ends with lint, typecheck and tests passing, then a commit. Commit messages end with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never claim a command passed without running it.

## Review Focus

Inputs the spec implies but its rules do not spell out. Each has a test in the task named.

1. A habit whose `startDate` is in the future: no crash, streaks 0, rates `null` (Tasks 5, 6, 7).
2. Completions outside a habit's life (before `startDate`, after `archivedOn`, in the future): ignored (Task 5).
3. Sunday week start: the same data gives different week boundaries and a different weekly result (Task 5).
4. An invalid timezone string: throws a clear error instead of returning a wrong date (Task 3).
5. A habit with no schedule rows: treated as inactive, no crash (Task 4).
6. A habit created and ticked on the same day has a streak of 1 (Task 6).

---

### Task 1: Scaffold the app

**Files:** Create the Next.js app at the repo root, `vitest.config.ts`, `.env.example`. Modify `package.json`, `.gitignore`.

**Interfaces:** Produces npm scripts `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `dev`, `build`, and the `@/*` alias to `src/*`.

- [ ] **Step 1:** Scaffold into a sibling temp folder: `npx create-next-app@latest ../cadence-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`. Copy everything except `.git` into the repo root, merge its `.gitignore` entries with the existing ones (keep `.superpowers/`), delete the temp folder.
- [ ] **Step 2:** `npm i -D vitest`. Add `vitest.config.ts` (node environment, `@` alias to `src`, include `src/**/*.test.ts`). Add the `typecheck` and `test` scripts. Create `.env.example` listing the Supabase variables added in Task 9.
- [ ] **Step 3:** Run `npm run lint && npm run typecheck && npx vitest run --passWithNoTests && npm run build`. Expected: all exit 0.
- [ ] **Step 4:** Commit `chore: scaffold Next.js app with Vitest`.

### Task 2: Themed app shell and theme toggle

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`. Create `src/components/top-bar.tsx`, `src/components/theme-toggle.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/today/page.tsx`, `src/app/(app)/habits/page.tsx`, `src/app/(app)/progress/page.tsx`, `playwright.config.ts`, `e2e/shell.spec.ts`.

**Interfaces:** Produces Tailwind color utilities named `bg-bg`, `bg-surface`, `bg-topbar`, `text-ink`, `text-muted`, `border-line`, `text-moss`, `bg-moss`, `text-clay`, `bg-missed`, `bg-heat-0` to `bg-heat-4`, backed by CSS variables for light and `.dark`. Produces `<TopBar />` and `<ThemeToggle />` (a button with `aria-label` `"Switch to dark theme"` or `"Switch to light theme"`).

- [ ] **Step 1: Write the failing e2e** in `e2e/shell.spec.ts` with `test.use({ colorScheme: 'light' })`: (a) `/today` shows a heading "Today" and links "Today", "Habits", "Progress" in the top bar; (b) clicking the toggle gives `<html class="dark">`, and the class is still there after `page.reload()`.
- [ ] **Step 2:** `npm i next-themes && npm i -D @playwright/test && npx playwright install chromium`. Configure Playwright with `webServer: npm run dev`, baseURL `http://localhost:3000`. Run `npx playwright test`. Expected: FAIL.
- [ ] **Step 3:** Implement the shell. Tokens go in `globals.css` as CSS variables mapped through Tailwind 4 `@theme inline`. `layout.tsx` wraps children in `next-themes` `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) with `suppressHydrationWarning` on `<html>`. The top bar has the brand, the three nav links (active link highlighted via `usePathname`), and the toggle on the right. `(app)/layout.tsx` renders the top bar and a `max-w-[1180px]` centered content area. Each page renders only its `<h1>`. `src/app/page.tsx` redirects to `/today`.
- [ ] **Step 4:** Run `npx playwright test`, then lint, typecheck, build. Expected: PASS.
- [ ] **Step 5:** Commit `feat: themed app shell with light/dark toggle`.

### Task 3: Date helpers

**Files:** Create `src/domain/dates.ts`, `src/domain/dates.test.ts`.

**Interfaces:** Produces `type CalendarDate = string`, `type WeekStart = 1 | 7`, `todayIn(timeZone: string, now?: Date): CalendarDate`, `addDays(d: CalendarDate, n: number): CalendarDate`, `diffDays(a: CalendarDate, b: CalendarDate): number` (b minus a), `weekStart(d: CalendarDate, weekStartsOn: WeekStart): CalendarDate`, `weekEnd(...)` (same signature, returns the last day).

- [ ] **Step 1: Write the failing tests:**
  - `todayIn('Asia/Kolkata', new Date('2026-10-09T18:29:59Z'))` is `'2026-10-09'`, and at `18:30:00Z` it is `'2026-10-10'`.
  - `todayIn('America/New_York', new Date('2026-03-09T03:59:59Z'))` is `'2026-03-08'`, and at `04:00:00Z` it is `'2026-03-09'` (spring-forward week). Same pair at `2026-11-02T04:59:59Z` / `05:00:00Z` gives `'2026-11-01'` / `'2026-11-02'` (fall-back).
  - `todayIn('Not/AZone')` throws.
  - `addDays('2026-03-07', 2)` is `'2026-03-09'`; `addDays('2026-12-31', 1)` is `'2027-01-01'`; `addDays('2026-03-01', -1)` is `'2026-02-28'`.
  - `diffDays('2026-03-01', '2026-03-31')` is `30`; `diffDays('2026-10-09', '2026-10-05')` is `-4`.
  - `weekStart('2026-10-09', 1)` is `'2026-10-05'`; `weekStart('2026-10-09', 7)` is `'2026-10-04'`; `weekStart('2026-10-04', 1)` is `'2026-09-28'` (a Sunday belongs to the previous Monday week); `weekEnd('2026-10-09', 1)` is `'2026-10-11'`.
- [ ] **Step 2:** `npx vitest run src/domain/dates.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement. Use `Intl.DateTimeFormat('en-CA', { timeZone, ... }).formatToParts` for `todayIn` (the `Intl` call itself throws for a bad zone; let it throw). Do date arithmetic by parsing to `Date.UTC` and formatting back.
- [ ] **Step 4:** Run the file. Expected: PASS. Run lint and typecheck.
- [ ] **Step 5:** Commit `feat(domain): calendar-date helpers`.

### Task 4: Schedule types and resolution

**Files:** Create `src/domain/types.ts`, `src/domain/schedule.ts`, `src/domain/schedule.test.ts`, `src/domain/test-helpers.ts`.

**Interfaces:**
- Consumes `CalendarDate`, `WeekStart`, `weekStart` from Task 3.
- Produces in `types.ts`: `Schedule = { kind: 'daily'; effectiveFrom: CalendarDate } | { kind: 'weekly_count'; timesPerWeek: number; effectiveFrom: CalendarDate }`; `HabitData = { startDate: CalendarDate; archivedOn: CalendarDate | null; schedules: Schedule[]; completions: ReadonlySet<CalendarDate> }`; `Ctx = { today: CalendarDate; weekStartsOn: WeekStart }`.
- Produces in `schedule.ts`: `scheduleOn(schedules: Schedule[], date: CalendarDate): Schedule | undefined` (latest `effectiveFrom <= date`); `scheduleFor(h: HabitData, date: CalendarDate): Schedule | undefined` (undefined before `startDate`; if the date is on or after `startDate` but before every `effectiveFrom`, the earliest schedule applies, so moving `startDate` earlier works); `parseScheduleInput(input: unknown): { ok: true; value: Schedule } | { ok: false; error: string }`; `nextEditDate(today: CalendarDate, weekStartsOn: WeekStart): CalendarDate` (the first day of next week, the effective date for weekly edits and type switches).
- Produces in `test-helpers.ts`: `makeHabit(over?: Partial<HabitData> & { done?: CalendarDate[] }): HabitData` (defaults: start `'2026-10-01'`, not archived, one daily schedule from the start) and `ctx(today = '2026-10-09', weekStartsOn: WeekStart = 1): Ctx`.

- [ ] **Step 1: Write the failing tests:**
  - `scheduleOn([daily from 2026-09-01, weekly 3 from 2026-10-05], '2026-10-04')` is the daily one; on `'2026-10-05'` the weekly one; on `'2026-08-31'` `undefined`; on `[]` `undefined`.
  - `scheduleFor` with `startDate '2026-09-01'` and its only schedule from `'2026-09-10'`: `'2026-09-05'` resolves to that schedule, `'2026-08-31'` is `undefined`.
  - `parseScheduleInput({ kind: 'weekly_count', timesPerWeek: 3, effectiveFrom: '2026-10-05' })` is ok. Not ok: `timesPerWeek` of 0, 7, 3.5, or missing; `kind: 'daily'` with a `timesPerWeek`; `kind: 'fixed_days'`; a malformed date `'2026-13-40'`.
  - `nextEditDate('2026-10-09', 1)` is `'2026-10-12'`; `nextEditDate('2026-10-09', 7)` is `'2026-10-11'`.
- [ ] **Step 2:** `npx vitest run src/domain/schedule.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `types.ts`, `schedule.ts` and `test-helpers.ts` per the Interfaces block. A habit with an empty `schedules` array returns `undefined` from `scheduleFor` (Review Focus 5).
- [ ] **Step 4:** Run the file, lint, typecheck. Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): schedule types, resolution and validation`.

### Task 5: Day and week statuses

**Files:** Create `src/domain/status.ts`, `src/domain/status.test.ts`.

**Interfaces:**
- Consumes `HabitData`, `Ctx`, `scheduleFor`, `weekStart`, `weekEnd`, `addDays`.
- Produces `dayStatus(h: HabitData, date: CalendarDate, ctx: Ctx): 'done' | 'missed' | 'pending' | 'inactive'` (daily-scheduled days only; `inactive` for dates before `startDate`, after `archivedOn`, in the future, with no schedule, or under a weekly schedule).
- Produces `weekStatus(h: HabitData, weekStartDate: CalendarDate, ctx: Ctx): { status: 'met' | 'missed' | 'in_progress' | 'excluded' | 'inactive'; done: number; target: number }`. The week's schedule is `scheduleFor(h, max(weekStartDate, startDate))`. `excluded` means the partial first week (the week contains `startDate` and `startDate` is not its first day): `done` and `target` are still filled in so the UI can show progress. `inactive` if no weekly schedule, the week ends after `archivedOn`, or the week starts after `ctx.today`. `done` counts only ticks inside the week and inside `[startDate, archivedOn]`.

- [ ] **Step 1: Write the failing tests** (today `'2026-10-09'`, Monday start unless stated):
  - Daily, start `'2026-10-01'`, done `['2026-10-01','2026-10-08','2026-10-09']`: `'2026-10-01'` done, `'2026-10-02'` missed, `'2026-10-08'` done. With done only `['2026-10-01']`: `'2026-10-09'` is `pending`, `'2026-10-10'` and `'2026-09-30'` are `inactive`.
  - Ticks on `'2026-09-30'` (before start) and `'2026-10-12'` (future) leave their days `inactive`, not `done` (Review Focus 2). A tick after `archivedOn` is `inactive`.
  - Start `'2026-10-12'` (future): `dayStatus` for today is `inactive` (Review Focus 1).
  - Weekly 3/wk, start `'2026-09-21'`, done `['2026-09-29','2026-09-30','2026-10-02','2026-10-06']`: week `'2026-09-28'` is `met` with done 3 target 3; week `'2026-10-05'` is `in_progress` with done 1; week `'2026-09-21'` is `missed` with done 0.
  - Weekly 3/wk, start `'2026-09-30'` (a Wednesday): week `'2026-09-28'` is `excluded`. Start `'2026-09-28'` (a Monday): the same week is not excluded.
  - Ticks above target: 4 ticks in a 3/wk week gives `met`, done 4, target 3 (callers cap).
  - Sunday start: with `weekStartsOn: 7`, ticks on `'2026-10-03'` (Sat) and `'2026-10-04'` (Sun) fall in different weeks (`'2026-09-27'` and `'2026-10-04'`), but with Monday start both are in week `'2026-09-28'` (Review Focus 3).
  - Archived `archivedOn: '2026-10-05'`: week `'2026-10-05'` (ends after archive) is `inactive`.
- [ ] **Step 2:** `npx vitest run src/domain/status.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement per the Interfaces block.
- [ ] **Step 4:** Run the file, lint, typecheck. Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): day and week statuses`.

### Task 6: Streaks

**Files:** Create `src/domain/streaks.ts`, `src/domain/streaks.test.ts`.

**Interfaces:**
- Consumes `dayStatus`, `weekStatus`, `scheduleFor`, `weekStart`, `addDays`.
- Produces `type Streak = { unit: 'day' | 'week'; count: number }`, `currentStreak(h: HabitData, ctx: Ctx): Streak`, `longestStreak(h: HabitData, ctx: Ctx): Streak`.
- Rules (spec rule 7): daily streak walks back from today if today is `done`, else from yesterday, counting consecutive `done` days; it stops at `missed` and at any day that is not under a daily schedule, so it never crosses a type change. Weekly streak walks back from the current week if `met`, else from the previous week, counting consecutive `met` weeks; a current `in_progress` week never breaks it; it stops at `missed`, `excluded`, and at a type change. `unit` comes from the schedule at the anchor; no schedule gives `{ unit: 'day', count: 0 }`. An archived habit has `currentStreak` count 0. `longestStreak` is the longest such run anywhere in the habit's history (the most recent wins a tie).

- [ ] **Step 1: Write the failing tests** (today `'2026-10-09'`, `makeHabit` start `'2026-10-01'`):
  - Daily done Oct 1 to 8, today pending: current is `{day, 8}`. Add Oct 9: 9.
  - Daily done Oct 1 to 4 and 6 to 8: current 3. Today pending with Oct 8 not done: 0.
  - Daily done Oct 1 to 3 and 5 to 8: longest is 4.
  - Created and ticked the same day: start `'2026-10-09'`, done `['2026-10-09']`: current 1 (Review Focus 6). Start `'2026-10-12'` (future): current 0 and longest 0 (Review Focus 1).
  - Weekly 3/wk start `'2026-09-28'`, week Sep 28 met, current week `'2026-10-05'` with 1 tick: `{week, 1}`. If that earlier week has only 2 ticks: 0. If the current week is also met: 2.
  - Weekly start `'2026-09-30'` with the first (excluded) week met: current 0 until the current week is met.
  - Type switch: daily from `'2026-09-01'` with every day done through `'2026-10-03'`, plus a weekly 3 schedule from `'2026-10-05'` with 3 ticks in the current week: current is `{week, 1}`, not 34. `longestStreak` is `{day, 33}`.
  - Archived habit: current count 0, longest unchanged.
- [ ] **Step 2:** `npx vitest run src/domain/streaks.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement per the Interfaces block.
- [ ] **Step 4:** Run the file, lint, typecheck. Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): current and longest streaks`.

### Task 7: Completion rates and the rules document

**Files:** Create `src/domain/rates.ts`, `src/domain/rates.test.ts`, `src/domain/index.ts` (re-exports the public API), `docs/rules.md`.

**Interfaces:**
- Consumes `dayStatus`, `weekStatus`, `scheduleFor`, `addDays`, `weekStart`, `weekEnd`.
- Produces `type Rate = { done: number; expected: number }`, `completionRate(h: HabitData, from: CalendarDate, to: CalendarDate, ctx: Ctx): Rate`, `addRates(rates: Rate[]): Rate`, `ratio(r: Rate): number | null` (`null` when `expected` is 0, never 0%).
- Rules (spec rule 8): count closed periods only. Daily: each day in `[from, to]` that is on or after `startDate`, on or before `archivedOn`, before today, and under a daily schedule; `expected` +1 each, `done` +1 if ticked. Weekly: each week lying fully inside `[from, to]`, closed (week end before today), not `excluded` or `inactive`: `expected += target`, `done += min(ticks, target)`. Missed periods stay in `expected`.

- [ ] **Step 1: Write the failing tests** (today `'2026-10-09'`):
  - Daily start `'2026-10-01'`, done Oct 1, 2, 3, 5, 6, window `'2026-10-01'..'2026-10-09'`: `{done: 5, expected: 8}` (today is excluded, even if ticked). Ticking Oct 9 does not change it.
  - Window starting before `startDate` (`'2026-09-20'..'2026-10-09'`) gives the same `{5, 8}`.
  - Weekly 3/wk start `'2026-09-21'`, 5 ticks in the week of Sep 21 and 2 in Sep 28, window `'2026-09-21'..'2026-10-09'`: `{done: 5, expected: 6}` (the 5 is capped to 3). Window `'2026-09-23'..'2026-10-09'`: only the Sep 28 week, `{2, 3}`.
  - Archived daily, start `'2026-10-01'`, `archivedOn '2026-10-05'`, no ticks, window through Oct 9: `{0, 5}`.
  - Habit with start in the future: `{0, 0}` and `ratio` is `null` (Review Focus 1).
  - `addRates([{done:1,expected:2},{done:3,expected:3}])` is `{4, 5}`; `ratio({4,5})` is `0.8`.
- [ ] **Step 2:** `npx vitest run src/domain/rates.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `rates.ts` and `index.ts`. Write `docs/rules.md` as a plain-language restatement of spec section 3 (statuses, streaks, rates, schedule edits, archive), pointing to the spec for rationale and to `src/domain/` as the only place these are computed.
- [ ] **Step 4:** Run the full suite: `npm test && npm run lint && npm run typecheck`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(domain): completion rates and rules doc`.

### Task 8: Database schema, RLS and pgTAP tests

**Files:** Create `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/<timestamp>_init.sql`, `supabase/tests/schema.test.sql`. Modify `package.json` (add scripts `db:start`, `db:test`).

**Interfaces:** Produces the tables from spec section 4: `profiles`, `habits`, `habit_schedules`, `habit_completions`, with the constraints below, the `handle_new_user()` trigger, and owner-only RLS. `habits.archived_at` is `timestamptz` (the server converts it to a calendar date in the user's timezone before calling the domain).

- Constraints: `profiles.week_starts_on` in (1, 7), default 1, `timezone` default `'UTC'`; `habits.name` non-blank; `habit_schedules` check `(kind = 'daily' and times_per_week is null) or (kind = 'weekly_count' and times_per_week between 1 and 6)`, unique `(habit_id, effective_from)`; `habit_completions` unique `(habit_id, completion_date)`; all child tables `on delete cascade`.
- RLS: `profiles` and `habits` by `user_id = auth.uid()`; schedules and completions through an `exists` check on `habits.user_id = auth.uid()`. Policies cover select, insert, update and delete.

- [ ] **Step 1: Write the failing pgTAP test** `supabase/tests/schema.test.sql` covering: (a) inserting an `auth.users` row creates a `profiles` row with name and avatar taken from `raw_user_meta_data`; (b) a duplicate `(habit_id, completion_date)` insert raises `unique_violation`; (c) `times_per_week = 7` and `0` are rejected, and `daily` with `times_per_week = 3` is rejected; (d) as user A (`set local role authenticated`, `request.jwt.claims` set to A), selects on B's habits, schedules and completions return zero rows, and updating or deleting B's rows affects zero rows; inserting a habit with B's `user_id` fails; (e) deleting a habit removes its schedules and completions.
- [ ] **Step 2:** `npx supabase init`, ensure Docker is running, `npx supabase start`, then `npx supabase test db`. Expected: FAIL (tables missing).
- [ ] **Step 3:** Write the migration per the Interfaces block. `handle_new_user()` is `security definer` with a fixed `search_path`.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db`. Expected: all PASS.
- [ ] **Step 5:** Commit `feat(db): initial schema, RLS and pgTAP tests`.

### Task 9: Google sign-in and route protection

**Needs the owner:** a Google Cloud OAuth client (type Web) whose authorized redirect URI is `http://127.0.0.1:54321/auth/v1/callback`. Its client id and secret go in `supabase/.env` as `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (gitignored). The implementer stops and asks for these before Step 4's manual check.

**Files:** Create `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/session.ts`, the Next.js request-interception file (`src/proxy.ts` on Next 16; check the installed version's name), `src/app/(auth)/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/components/avatar-menu.tsx`, `e2e/auth.spec.ts`. Modify `src/components/top-bar.tsx`, `supabase/config.toml` (enable `[auth.external.google]`, set the site URL and redirect `http://localhost:3000/auth/callback`), `.env.example`, `e2e/shell.spec.ts`.

**Interfaces:** Produces `createSupabaseServerClient(): Promise<SupabaseClient>`, `createSupabaseBrowserClient(): SupabaseClient`, `getUser(): Promise<User | null>` (server). Unauthenticated requests to `/today`, `/habits` and `/progress` redirect to `/login`. `/login` shows a "Continue with Google" button that calls `signInWithOAuth({ provider: 'google' })` with the callback URL. The avatar menu shows the Google avatar (initial fallback) and a "Sign out" action. Follow the `@supabase/ssr` Next.js guide for cookie handling; use its current publishable-key variable name in `.env.example`.

- [ ] **Step 1: Write the failing e2e** in `e2e/auth.spec.ts`: visiting `/today` unauthenticated ends at `/login`; the page shows a "Continue with Google" button. Move the theme-toggle test from `e2e/shell.spec.ts` to `/login` (render `<ThemeToggle />` top-right there), since `/today` now requires sign-in.
- [ ] **Step 2:** Run `npx playwright test`. Expected: FAIL.
- [ ] **Step 3:** Implement the clients, the interception file (refresh the session, redirect unauthenticated users on protected paths), the login page, the callback route (exchange code, redirect to `/today`), and the avatar menu in the top bar.
- [ ] **Step 4:** Run lint, typecheck, build and `npx playwright test`. Expected: PASS. Then verify manually with the owner: sign in with Google locally, land on `/today`, see the avatar, see the `profiles` row in Supabase Studio, sign out.
- [ ] **Step 5:** Commit `feat(auth): Google sign-in and route protection`.

---

## Not in this plan

Habit CRUD, check-ins, the Today margin card, the Progress page and heatmap, the production Supabase project and Vercel deploy. Also deferred: syncing the profile timezone from the browser on first login (belongs with milestone 4, when "today" first matters) and moving `habit_schedules.effective_from` when `startDate` moves earlier (handled by `scheduleFor` in the domain; the server action in milestone 3 should still keep the data tidy).
