# Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-page Home at `/` with a rotating greeting, an alert banner that escalates through the day, tickable "Next up" and "Done today" lists, "Streaks to protect", the week strip, and a "New habit" button; the logo links there and sign-in lands there.

**Architecture:** Pure helpers (`pickGreeting`, `alertFor`, `clockIn`, `buildHomeView`) hold every rule and are unit-tested. A shared hook `useToggleCompletion` (extracted from the Today page) gives Today and Home identical ticking. The Home page is a server component that loads data with the existing `loadHabitData`, then a client component renders it and reads the browser clock for the greeting and banner.

**Tech Stack:** Next.js 16 App Router (Cache Components), React 19, TypeScript, Tailwind 4, motion (installed), Vitest, Playwright (`page.clock`).

**Spec:** `docs/superpowers/specs/2026-10-10-home-dashboard-design.md` (read it first). Also read `AGENTS.md`: this Next.js has breaking changes; follow the patterns already used in `src/app/(app)/today/`.

## Global Constraints

- Tier thresholds (spec section 4), first match wins: none (nothing listed today) → done (all ticked) → late (≤ 180 minutes to local midnight AND a streak at risk) → evening (≤ 360 minutes to midnight AND something open) → afternoon (local hour ≥ 12) → morning.
- A streak at risk before 18:00 never makes the banner amber; only the clock does.
- At risk: listed today, unticked, and either daily with current streak > 0, or weekly with current streak > 0 whose goal can now only be met by ticking on every remaining day including today (`needed >= daysLeft`).
- The banner button never ticks; "Do X now" focuses that habit's tick button.
- Greeting: whole sentences with a `{name}` placeholder in one static table; name = first word of the profile display name, else `friend`; never the same line twice in a row; stable within a tab session via `sessionStorage` (guarded with try/catch).
- Time comes from the browser clock read in the profile's timezone via `Intl`. Banner and greeting render after mount (no hydration mismatch); the space is reserved.
- Banner: `role="status"`, `aria-live="polite"`, an icon plus text (never colour alone), pulse disabled under `prefers-reduced-motion`.
- No database changes. Content stays within `max-w-295` (the app layout already does this).
- Code style: match the surrounding files (double quotes in `.tsx`, single quotes in `.ts` domain/server files, `@/` imports). User-facing sentences are never assembled by joining fragments in the UI; build them in the pure helpers.
- Work on branch `feat/home-dashboard`; one PR into `develop`; never merge to main.

## Review Focus

Failure modes the spec implies but a task's happy path would miss, most likely first. Each has a test in the owning task.

1. The clock crosses local midnight while Home is open: the list would show yesterday's data. (Task 5: `clockIn` returns the local `date`; Home refreshes when it differs from the server's `today`.)
2. Odd display names: null, empty, whitespace only, leading spaces, multiple words, a very long single word. (Task 1.)
3. Profile timezone differs from the browser's, including half-hour zones (`Asia/Kolkata`): hour and minutes-to-midnight must follow the profile. (Task 2.)
4. Weekly at-risk edges: goal already met, streak of 0, not listed today, and exactly enough days left. (Task 3.)
5. `sessionStorage` throws or is unavailable (private mode): the greeting must still show. (Task 5.)

---

### Task 1: Greeting picker

**Files:**
- Create: `src/lib/greeting.ts`
- Test: `src/lib/greeting.test.ts`

**Interfaces:**
- Produces (used by Task 5):
```ts
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';
export interface GreetingContext {
  hour: number;          // local hour 0-23
  weekday: number;       // 0 = Sunday ... 6 = Saturday
  allDone: boolean;      // habits listed today and every one ticked
  noneDone: boolean;     // habits listed today and none ticked
  name: string | null;   // raw profile display name
}
export interface Greeting { id: string; text: string }
export const dayPart: (hour: number) => DayPart; // morning 5-11, afternoon 12-17, evening 18-21, night 22-4
export const firstName: (name: string | null) => string; // first word, else 'friend'
export function pickGreeting(ctx: GreetingContext, random: () => number, lastId?: string | null): Greeting;
```

The static table (exact copy, `{name}` is replaced by `firstName(...)`):

| id | when | text |
|----|------|------|
| m1, m2, m3 | morning | "Good morning, {name}" · "Morning, {name}. Ready when you are." · "Rise and tick, {name}." |
| a1, a2 | afternoon | "Good afternoon, {name}" · "Afternoon, {name}. How's the day going?" |
| e1, e2 | evening | "Good evening, {name}" · "Evening, {name}. Let's wrap up well." |
| n1, n2 | night | "Still up, {name}?" · "Late one, {name}. One more tick?" |
| w1, w5, w0 | Monday, Friday, Sunday | "Fresh week, {name}" · "Happy Friday, {name}" · "Slow Sunday, {name}" |
| d1, d2 | allDone | "All done, {name}. Go enjoy it." · "Clean sweep, {name}." |
| z1 | noneDone and hour ≥ 12 | "Fresh page, {name}. One tick gets you moving." |

Pool rule: if `allDone`, the pool is d1, d2 only. Otherwise the pool is the day-part lines + the weekday line for `ctx.weekday` (if one exists) + z1 when it applies. Remove `lastId` from the pool when the pool has more than one line. `random()` in [0, 1) picks `pool[Math.floor(random() * pool.length)]`.

- [ ] **Step 1: Write the failing tests** in `src/lib/greeting.test.ts`: `dayPart` boundaries (4→night, 5→morning, 11→morning, 12→afternoon, 17→afternoon, 18→evening, 21→evening, 22→night, 0→night); `firstName` for `null`, `''`, `'   '`, `'  Manas Bajpai '` (→ `Manas`), `'Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'` (returned whole, no throw); `pickGreeting` with `random = () => 0` returns the first pool line (`m1` at hour 9 on a Wednesday, text `Good morning, Manas`); allDone only ever returns d1/d2 (loop random 0, 0.99); `lastId: 'm1'` is never returned at hour 9 Wednesday for any random in {0, 0.3, 0.6, 0.99}; Friday evening pool includes `w5`; z1 appears at hour 14 with `noneDone` and not at hour 9; name null renders `friend`; text never contains `{name}`.
- [ ] **Step 2: Run** `npx vitest run src/lib/greeting.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `src/lib/greeting.ts` per the interface and table above. Lines live in one `const GREETINGS: { id: string; pool: ...; text: string }[]`-style table; the weekday lines are keyed by weekday number.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/greeting.ts src/lib/greeting.test.ts && git commit -m "feat(home): greeting picker"` (end the message with the Co-Authored-By line from the session attribution).

---

### Task 2: Alert rules and the local clock

**Files:**
- Create: `src/lib/alert.ts`
- Test: `src/lib/alert.test.ts`

**Interfaces:**
- Produces (used by Tasks 3 and 5):
```ts
export interface AtRiskHabit { id: string; name: string; count: number; unit: 'day' | 'week' }
export interface AlertInput {
  hour: number;                 // local hour 0-23
  minutesToMidnight: number;    // 1..1440
  total: number;                // habits listed today
  open: { id: string; name: string }[];   // unticked, in list order
  atRisk: AtRiskHabit[];        // sorted longest streak first
  continuing: { name: string; count: number }[]; // ticked habits with a streak: count = streak so far
}
export type AlertTier = 'none' | 'done' | 'late' | 'evening' | 'afternoon' | 'morning';
export type AlertAction = { kind: 'focus'; id: string; label: string } | { kind: 'link'; href: string; label: string } | null;
export interface Alert { tier: AlertTier; message: string; action: AlertAction }
export function alertFor(input: AlertInput): Alert;
export function formatLeft(minutes: number): string; // 340 -> "5h 40m", 180 -> "3h", 100 -> "1h 40m", 45 -> "45m"
export function clockIn(timeZone: string, now: Date): { date: string; hour: number; weekday: number; minutesToMidnight: number };
```

Message copy (exact; `{left}` = `formatLeft`, `{n}` count, streak phrase = `{n}-{unit} {name} streak`, e.g. `12-day Read streak`):

| tier | message | action |
|------|---------|--------|
| none | `""` | null |
| done | `All {total} done. Nice.` plus, when `continuing` is non-empty, ` Tomorrow's streaks: {name} {count+1}, ...` for the two longest, ending with `.` | null |
| late | `Last call: {left}. Don't lose your {streak phrase of atRisk[0]}!` plus ` And {k} more at risk.` when more than one | focus atRisk[0], label `Do {name} now` |
| evening, at risk | `{left} left. {name}'s {n}-{unit} streak ends at midnight.` (atRisk[0]) | focus atRisk[0], label `Do {name} now` |
| evening, none at risk | `{left} left. {open.length} habit to go.` / `habits to go.` (singular when 1) | focus open[0], label `Do {name} now` |
| afternoon | `{open.length} left, {left} to go.` | link `/today`, label `Open Today` |
| morning | `{total} habit today. A good day to start with {open[0].name}.` / `habits today.` (singular when 1) | null |

`clockIn` uses `Intl.DateTimeFormat('en-CA', { timeZone, hourCycle: 'h23', year, month, day, hour, minute, second, weekday: 'short' })` parts; `minutesToMidnight = 1440 - (hour * 60 + minute)` (so 23:59 gives 1, 00:00 gives 1440).

- [ ] **Step 1: Write the failing tests** in `src/lib/alert.test.ts`, one per row of the table with the exact strings above, plus: tier order (nothing listed → none even at 23:00; all ticked → done even at 23:00 with an at-risk list empty); boundaries (minutesToMidnight 180 + at risk → late, 181 → evening, 360 → evening, 361 at hour 17 → afternoon, hour 12 → afternoon, hour 11 → morning); at risk with minutesToMidnight 600 and hour 14 → afternoon (never amber before 18:00); two at risk → `And 1 more at risk.`; `formatLeft` examples above; `clockIn('UTC', new Date('2026-10-09T23:59:00Z'))` → `{ date: '2026-10-09', hour: 23, weekday: 5, minutesToMidnight: 1 }`; `clockIn('Asia/Kolkata', new Date('2026-10-09T20:00:00Z'))` → date `2026-10-10`, hour 1, minutes 1440 - 90 = `1350`; `clockIn('America/New_York', new Date('2026-10-09T04:30:00Z'))` → date `2026-10-09`... (00:30 local) hour 0, minutesToMidnight 1410.
- [ ] **Step 2: Run** `npx vitest run src/lib/alert.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/alert.ts` per the interface and copy table.
- [ ] **Step 4: Run** the command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(home): alert tiers and local clock`.

---

### Task 3: Home view (at-risk detection)

**Files:**
- Create: `src/server/home-view.ts`
- Test: `src/server/home-view.test.ts`
- Modify: `src/server/today-view.ts` (only if `buildTodayView` needs nothing new, leave it untouched)

**Interfaces:**
- Consumes: `buildTodayView(entries, date, ctx): TodayView`, `TodayRow` from `./today-view`; `currentStreak`, `weekStatus` is not needed — use `weekProgress` data already on `TodayRow.week` (`{ done, target, goalMet }`); `addDays`, `diffDays`, `weekStart` from `@/domain/dates`; `Ctx`, `HabitData`.
- Produces (used by Tasks 5 and 6):
```ts
export interface AtRiskRow { id: string; name: string; icon: string; color: ColorKey; streak: Streak; /** weekly only */ needed: number | null; daysLeft: number | null }
export interface HomeView {
  view: TodayView;                  // today's lists, strip and hasHabits (from buildTodayView with date = ctx.today)
  atRisk: AtRiskRow[];              // longest streak first
  continuing: { name: string; count: number }[]; // ticked listed habits with a streak above 0, longest first (count = current streak)
}
export function buildHomeView(entries: { habit: HabitRow; data: HabitData }[], ctx: Ctx): HomeView;
```
Rules: a row is at risk when it is in `view.todo` and `row.streak` is not null (a streak row exists only for count > 0 and only on today) and either `row.week === null` (daily) or `row.week` is set with `!goalMet` and `needed = target - done`, `daysLeft = 7 - diffDays(ctx.today, weekStart(ctx.today, ctx.weekStartsOn))`, `needed >= daysLeft`. Weekly rows that are not at risk are left out.

- [ ] **Step 1: Write the failing tests** in `src/server/home-view.test.ts` (use `makeHabit`, `ctx` from `@/domain/test-helpers`, today `2026-10-09`, a Friday, week Monday–Sunday so `daysLeft` is 3): daily habit with a 3-day streak unticked → at risk with `needed: null`; same habit ticked today → in `continuing`, not at risk; daily with streak 0 → not at risk; weekly target 3 with 1 done (needed 2, daysLeft 3) → NOT at risk; weekly target 3 with 0 done (needed 3, daysLeft 3) and a weekly streak above 0 → at risk with `needed: 3, daysLeft: 3`; weekly goal met → not at risk; weekly with streak 0 (no `row.streak`) → not at risk; archived habit and a habit starting tomorrow → in neither list; two at risk are sorted longest streak first; `view.todo`/`view.done` equal `buildTodayView(...)` for today.
- [ ] **Step 2: Run** `npx vitest run src/server/home-view.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `buildHomeView` in `src/server/home-view.ts` (no `server-only`).
- [ ] **Step 4: Run** the command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(home): home view and streaks at risk`.

---

### Task 4: Shared ticking hook and revalidation

**Files:**
- Create: `src/app/(app)/today/use-toggle-completion.ts`
- Modify: `src/app/(app)/today/today-client.tsx` (use the hook, behavior unchanged)
- Modify: `src/app/(app)/today/actions.ts:37` (also `revalidatePath("/")`)
- Modify: `src/app/(app)/habits/actions.ts:25` (also `revalidatePath("/")`)

**Interfaces:**
- Produces (used by Tasks 5 and 6):
```ts
export function useToggleCompletion(
  view: TodayView,
  date: CalendarDate,
): { shown: TodayView; saving: ReadonlySet<string>; toggle: (row: TodayRow) => void };
```
It owns exactly what `TodayClient` owns today: `useOptimistic(view, applyToggle)`, the `inFlight` ref and `saving` state, `useTransition`, the toast on failure (`GENERIC_SAVE_ERROR` / `result.error`), and the focus-restore effect (`focusId` ref plus the effect that re-focuses `#check-<id>` when focus fell to `<body>`). Move that code, do not rewrite it.

- [ ] **Step 1: Confirm the safety net** by running `npx playwright test e2e/today.spec.ts e2e/today-nav.spec.ts e2e/today-card.spec.ts`. Expected: all pass before the move (the keyboard-focus, double-tap, rollback and archived-habit tests in `e2e/today.spec.ts` pin this behavior).
- [ ] **Step 2: Extract** the hook into `use-toggle-completion.ts`; `TodayClient` calls `const { shown, saving, toggle } = useToggleCompletion(view, date)` and keeps only its layout. Add `revalidatePath("/")` next to the existing `revalidatePath("/today")` and `revalidatePath("/habits")` calls so Home never shows stale data after a tick or a new habit.
- [ ] **Step 3: Run** `npm run lint && npm run typecheck && npx playwright test e2e/today.spec.ts e2e/today-nav.spec.ts e2e/today-card.spec.ts e2e/habits.spec.ts`. Expected: all pass, no behavior change.
- [ ] **Step 4: Commit** `refactor(today): share the ticking hook`.

---

### Task 5: Profile name, clock and greeting hooks, routing

**Files:**
- Modify: `src/server/habits.ts` (`Profile` gains `displayName: string | null`; `getProfile` selects `display_name`)
- Modify: `src/server/habit-data.ts` (`loadHabitData` also returns `profile: Profile`)
- Modify: `next.config.ts` (remove the `/` → `/today` redirect)
- Modify: `src/app/auth/callback/route.ts:11` (redirect to `${origin}/`)
- Modify: `src/components/top-bar.tsx` (wordmark becomes `<Link href="/">`; `aria-current="page"` and an underline when `pathname === "/"`)
- Create: `src/app/(app)/home/use-now.ts`, `src/app/(app)/home/use-greeting.ts`
- Test: `e2e/shell.spec.ts` (add the logo test now; Home page itself arrives in Task 6, so this task's e2e step comes at the end of Task 6)

**Interfaces:**
- Produces (used by Task 6):
```ts
export function useNow(intervalMs?: number): Date | null; // null until mounted, then updates every intervalMs (default 60_000)
export function useGreeting(ctx: Omit<GreetingContext, 'name'> & { name: string | null } | null): Greeting | null;
```
`useGreeting` returns `null` while `ctx` is `null` (not mounted). Once available it picks with `Math.random`, stores `{ key, id }` in `sessionStorage` under `cadence:greeting` where `key = `${dayPart(hour)}:${allDone ? 'done' : noneDone ? 'none' : 'some'}``, reuses the stored id when the key is unchanged, passes the stored id as `lastId` when the key changed. All storage access is inside try/catch; on failure it still returns a greeting.

- [ ] **Step 1: Write the failing test** `src/app/(app)/home/use-greeting.test.ts` is not possible without a DOM; instead put the storage logic in a pure function `chooseGreeting(ctx, random, storage: Pick<Storage, 'getItem' | 'setItem'> | null): Greeting` in `src/lib/greeting.ts` and test it in `src/lib/greeting.test.ts`: same key twice returns the same id with a different `random`; a changed key returns a line that is not the stored id; a storage whose methods throw still returns a greeting; `storage = null` works. Run it: FAIL.
- [ ] **Step 2: Implement** `chooseGreeting` (in `src/lib/greeting.ts`), then `useGreeting` as a thin hook around it (`useState` + `useEffect`, `window.sessionStorage` read inside try/catch), and `useNow` (`useState<Date | null>(null)`, `useEffect` sets the date and an interval, clears it on unmount). Run the unit tests: PASS.
- [ ] **Step 3: Wire profile, routing and the wordmark.** `getProfile` returns `displayName` (`data?.display_name ?? null`); `loadHabitData` returns `{ entries, ctx, profile }`; update its two callers (`getTodayView` in `src/server/today.ts`, the Progress page) only where TypeScript requires. Remove the redirect in `next.config.ts` (keep `cacheComponents` and `partialPrefetching`). Change the callback redirect to `/`.
- [ ] **Step 4: Verify** `npm run lint && npm run typecheck && npm test`. Expected: all pass. (`/` has no page yet, so do not run e2e here.)
- [ ] **Step 5: Commit** `feat(home): profile name, clock and greeting hooks, route to /`.

---

### Task 6: The Home page

**Files:**
- Create: `src/app/(app)/page.tsx` (Suspense with a `HomeSkeleton` fallback, then `HomeContent`)
- Create: `src/app/(app)/home/home-client.tsx`, `src/app/(app)/home/alert-banner.tsx`, `src/app/(app)/home/streaks-card.tsx`
- Modify: `src/components/skeleton.tsx` (add `HomeSkeleton`: header block, banner block, two columns)
- Modify: `src/app/globals.css` (banner tier colours as classes, `@media (prefers-reduced-motion: no-preference)` pulse for the late tier)
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `loadHabitData()` → `{ entries, ctx, profile }`; `buildHomeView(entries, ctx): HomeView`; `alertFor`, `clockIn`, `Alert`; `pickGreeting` via `useGreeting`, `useNow`; `useToggleCompletion(view, date)`; `CheckRow`, `DayCard` from the Today folder; `HabitDialog` from `src/app/(app)/habits/habit-dialog.tsx` (props: `today`, `weekStartsOn`, `onClose`, `onCloseAutoFocus`; same opener/focus handling as `HabitsClient`).
- `HomeClient` props: `{ home: HomeView; today: CalendarDate; name: string | null; timezone: string; weekStartsOn: WeekStart }` (all serializable).

Behavior to build (from spec sections 3, 4, 5):
- Header: progress ring (done of listed, a conic-gradient ring with the "3/5" text), the date in small text (`formatCalendarDate(today, { weekday: "long", day: "numeric", month: "long" })`), the greeting as the `<h1>` (while the greeting is `null`, render the h1 with a visually reserved empty block so the layout does not jump), and a "New habit" `Button` opening `HabitDialog` in create mode.
- Banner: computed each render from `useNow()`: `clockIn(timezone, now)` plus the optimistic lists (`open` = `shown.todo`, `total` = todo + done, `atRisk` = `home.atRisk` filtered to ids still in `shown.todo`, `continuing` = `home.continuing`). Render nothing for tier `none`; `null` now renders a reserved empty block. `role="status" aria-live="polite"`; an icon per tier (☀️ morning, ⏳ afternoon, 🔥 evening, 🚨 late, ✅ done) plus text. A `focus` action scrolls the habit's `#check-<id>` into view and focuses it; a `link` action is a `Link`.
- Map each `AtRiskRow` to the alert's `AtRiskHabit` as `{ id, name, count: streak.count, unit: streak.unit }`, and `continuing` is passed through unchanged.
- When `clockIn(...).date !== today`, call `router.refresh()` once (midnight rollover).
- Main column: "Next up · N left" list and "Done today · N" list using `CheckRow`; side column: `StreaksCard` (rows with the "ends midnight" tag for daily, `{needed} more by {weekday name of week end}` for weekly, using `useToggleCompletion` ticks removing the row optimistically) and the week strip (`DayCard`'s existing strip component with `view.strip`); below 1024px the columns stack in the spec's order.
- Empty states: `!view.hasHabits` shows the "No habits yet" card with a "Create your first habit" button that opens the dialog; habits exist but none listed today shows "No habits today." with the strip still visible.

- [ ] **Step 1: Write the failing e2e tests** in `e2e/home.spec.ts` (use the helpers in `e2e/support/data.ts`; `page.clock.setFixedTime(new Date('2026-10-10T20:00:00Z'))` before `goto` for time-dependent tests, call it inside each such test only): `/` shows an `h1` greeting that contains `E2E` (the e2e user's name is "E2E User") and never `{name}`; the greeting is unchanged after ticking a habit; with a seeded habit and streak at 20:00 UTC the banner (`getByRole('status')`) contains `left.` and `streak ends at midnight`; at 22:30 with a streak at risk it contains `Last call:`; at 09:00 `A good day to start with`; at 14:00 `left,` and `to go.`; ticking every habit changes the banner to `All 1 done. Nice.`; the `Do Read now` button focuses the Read row's checkbox (`toBeFocused`); ticking from Home moves the row to "Done today" and updates the ring (`3/5`-style text) and persists after reload; the logo link goes from `/habits` to `/` and shows `aria-current="page"`; no habits shows `No habits yet`; "New habit" opens the dialog and creating a habit lists it under Next up (use the same field labels as `e2e/habits.spec.ts`). Run `npx playwright test e2e/home.spec.ts`. Expected: FAIL.
- [ ] **Step 2: Implement** the files above. Keep each component under about 150 lines; put no rules in components (rules live in Tasks 1 to 3).
- [ ] **Step 3: Run** `npx playwright test e2e/home.spec.ts e2e/shell.spec.ts`. Expected: PASS. Fix by changing the implementation, not the thresholds.
- [ ] **Step 4: Look at it** with a throwaway Playwright screenshot at 1400 and 900 px wide, in light and dark (as done for Progress), and fix any layout problem you see.
- [ ] **Step 5: Commit** `feat(home): the Home page`.

---

### Task 7: Docs and final gate

**Files:**
- Modify: `docs/rules.md` (new "Home" section)
- Delete: nothing (workspace under `.superpowers/` is git-ignored)

- [ ] **Step 1: Add to `docs/rules.md`** a "Home" section: the tier table and thresholds, the at-risk definition, the greeting rules (stable per session, no repeats), and "the banner never ticks for you".
- [ ] **Step 2: Run the whole gate:** `npm test && npm run lint && npm run typecheck && npx playwright test`, then stop the dev server, `npm run build`, restart the dev server. Expected: everything passes.
- [ ] **Step 3: Whole-branch review** by a fresh opus reviewer (code-reviewer agent) on `git diff develop...HEAD`, with the spec, this plan and its Review Focus; re-grade findings, fix real ones with a failing test first, rerun the gate.
- [ ] **Step 4: Commit, push `feat/home-dashboard`, open the PR into `develop`** (not merged), with Verified / Not done sections like the earlier PRs.
