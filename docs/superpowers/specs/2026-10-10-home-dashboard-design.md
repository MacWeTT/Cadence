# Cadence — Home dashboard (Milestone 6.1) Design

**Goal:** the page you land on when you open Cadence or click the logo: a full-page view of how today is going, with a friendly rotating greeting and an alert that gets louder as the day runs out while something is still open.

**In:** the Home page at `/`; greeting; progress ring; escalating alert banner; "Next up" and "Done today" lists you can tick from; "Streaks to protect"; "This week" strip; a "New habit" button; the logo as the home link; sign-in landing on Home.

**Out (later):** push or desktop notifications (the alert is in-app only; Tauri is the natural home for real notifications); the "momentum" heatmap and milestone messages (brainstorm items 4 and 5); the cache-first data layer and the code refactor and policies (milestone 6.2, below, built right after this).

**Order of work:** Home (this spec) → 6.2 refactor, code policies and a cache-first data layer → 7 polish and ship → 8 localisation.

## 1. What you said (and what I assumed)
- You chose the single-column feel of option A, stretched to a full page, with the alert banner escalating like Duolingo, "based on how far you're in the day".
- You want custom, rotating greetings (like Claude's home screen), never one fixed line.
- Assumed: the alert tiers below are right (you replied "perfect" to the four-tier design); "alarm" means the in-app banner for now.

## 2. Route and navigation
- `/` renders Home. The redirect from `/` to `/today` in `next.config.ts` is removed.
- The "Cadence" wordmark in the top bar becomes a link to `/`. Home gets no tab beside Today, Habits and Progress, but when you are on Home the wordmark shows as the active page (underlined).
- Sign-in lands on `/` (`src/app/auth/callback/route.ts` redirects there instead of `/today`).
- `/` stays protected like every other signed-in page (unauthenticated visits go to `/login`).

## 3. Page layout (desktop first, content capped at 1180px like the other pages)
1. **Header row:** progress ring ("3/5"), the date (small), the greeting (large), and a "New habit" button on the right. The button opens the existing create-habit dialog (the same one the Habits page uses).
2. **Alert banner** (full width, section 4). Hidden when there is nothing to say.
3. **Main column (about 60%):** "Next up" (unticked habits, tickable) and "Done today" (dimmed, tickable to undo). Same row design as Today, so a habit looks the same everywhere.
4. **Side column (about 40%):** "Streaks to protect" and "This week" (the strip from Today, with "x of y today" and the bar).
5. Below 1024px the columns stack: header, banner, Next up, Streaks to protect, This week, Done today.
6. Empty states: no habits at all shows the same "No habits yet / Create your first habit" card as Today. Habits exist but none are listed today shows "No habits today." with the week strip still visible.

## 4. The alert banner
One banner, one message at a time, chosen by `alertFor(now, view)`, a pure function.

**Inputs:** the current time in the user's timezone (hours until local midnight, local hour), the list of today's habits (ticked or not), and which unticked habits have a streak at risk.

**A streak is at risk when** a habit is listed today, is not ticked, and: it is daily with a current streak above 0; or it is weekly with a current streak above 0 and the goal can now only be met by ticking on every remaining day of the week including today (needed ticks ≥ days left).

**Tiers, first match wins:**

| # | Tier | When | Look | Message (examples) |
|---|------|------|------|-------------------|
| 0 | none | nothing is listed today | no banner | |
| 1 | done | every listed habit is ticked | calm green | "All 5 done. Nice. Tomorrow's streaks: Read 13, Journal 32." (streak part only when there are streaks) |
| 2 | late | 3 hours or less to midnight, and a streak is at risk | strong clay, gentle pulse | "Last call: 1h 40m. Don't lose your 12-day Read streak!" |
| 3 | evening | 6 hours or less to midnight (that is, from 6pm) and something is still open | amber | "5h 20m left. Read's 12-day streak ends at midnight." (without a streak: "5h 20m left. 2 habits to go.") |
| 4 | afternoon | local hour 12 or later | soft tan | "3 left, 9h to go. Run and Read are still open." |
| 5 | morning | otherwise | plain card | "5 habits today. A good day to start with Read." |

- A streak at risk raises the tone only through the clock: before 6pm it never turns the banner amber (every unticked streak is "at risk" all day, which would nag from morning). In the morning and afternoon tiers the message may still name the longest open streak.
- When several streaks are at risk, the message names the longest one and says "and 1 more".
- **Button:** "Do Read now" (tiers 2 and 3) scrolls to that habit's row and focuses its tick button. It never ticks for you. Tiers 4 and 5 have "Open Today" or no button.
- The banner updates as you tick (it is computed from the same optimistic list) and re-evaluates every minute so it escalates while the page stays open.
- Time comes from the browser clock read in the profile's timezone (`Intl`). The banner renders after mount to avoid a hydration mismatch; until then the space is reserved.
- **Accessibility:** `role="status"` with `aria-live="polite"`, so a tier change is announced politely and not on every minute tick (only when the tier or message actually changes). Status is carried by an icon and text, not colour alone. The pulse on the late tier turns off with reduced motion.
- Quiet rule: nothing nags when there is nothing to do (tiers 0 and 1 never use urgent styling).

## 5. Greetings
A new `pickGreeting(context, random)` chooses a line, with the random source injected so it can be tested.

- **Pools:**
  - *Time of day* (local hour): morning 5–11, afternoon 12–17, evening 18–21, night 22–4. Several lines each, e.g. "Good morning, {name}", "Morning, {name}. Ready when you are.", "Still up, {name}?".
  - *Day of week:* a few special lines, e.g. Monday "Fresh week, {name}", Friday "Happy Friday, {name}", Sunday "Slow Sunday, {name}".
  - *State:* all done "All done, {name}. Go enjoy it.", "Clean sweep, {name}."; nothing ticked yet by the afternoon "Fresh page, {name}. One tick gets you moving."
- **Choice:** if everything is done, pick from the state pool; otherwise pick at random from time of day plus today's weekday lines (plus the "nothing ticked yet" lines when they apply).
- **No repeats in a row:** the previous greeting's id is remembered and skipped.
- **Stable during a visit:** the greeting is chosen once when Home first renders in a tab session and kept in `sessionStorage` (keyed by time-of-day and state), so ticking, re-rendering and going back to Home do not reshuffle it. A new tab or a new day-part shows a new one.
- **Name:** the first word of the profile's display name; if there is none, "friend". `getProfile` also returns `displayName`.
- **Localisation-ready** (milestone 8): lines are whole sentences in a static table with a `{name}` placeholder, never assembled by joining pieces.

## 6. Data and code
- No database changes. Home needs the same data as Today, loaded once (`loadHabitData`, shared with Progress; Today moves onto it too, which is a small tidy-up already agreed).
- New pure functions in `src/server/home-view.ts` (free of `server-only`): `buildHomeView(entries, ctx)` returns the Today view for today (reusing `buildTodayView` and `weekStrip`) plus `atRisk` (habit, streak, `neededToday`), and the numbers for the ring. `alertFor` and `pickGreeting` live in `src/lib/` as pure helpers.
- The optimistic tick logic in `today-client.tsx` (in-flight guard, `useOptimistic`, toast on failure, focus restore) moves into a shared hook `useToggleCompletion` used by Today and Home, so a habit behaves the same in both places. (Smallest sensible extraction; the wider refactor is 6.2.)
- Home reuses `CheckRow`, `DayCard`'s strip cells and `setCompletionAction`. The streak-at-risk list uses the same row look, with the "ends at midnight" or "2 more by Sun" tag.
- The "New habit" button reuses the habit dialog; it creates the habit and refreshes Home.

## 7. Testing
- **Unit:** `alertFor` for every tier and boundary (3h, 6h, noon), done and empty cases, daily vs weekly at-risk, several at risk; `pickGreeting` with a fixed random source for each pool, no-repeat, no name; `buildHomeView` at-risk detection; the `useToggleCompletion` rules stay covered by Today's existing tests.
- **Playwright:** `/` renders Home signed in and the logo returns to it from other pages; signing in lands on `/`; ticking from Home moves the row and updates the ring and banner; the banner tier at fixed clock times using Playwright's clock (the suite already runs in UTC): 09:00 morning, 14:00 afternoon, 20:00 with a streak at risk shows the evening banner, 22:30 shows the late banner; all done shows the done banner; no habits shows the empty state; the greeting never shows `{name}` and stays the same after a tick; the "Do Read now" button focuses the Read row.
- Lint, typecheck and build as always.

## 8. Risks and notes
- Greeting and alert depend on the browser clock; a wrong device clock gives a wrong tier. Acceptable for a personal app.
- Playwright clock changes must not break the existing date-sensitive tests; the clock is set only inside the new Home tests.
- The server-fetched Home will show a skeleton on each visit until milestone 6.2 adds the cache-first layer.
