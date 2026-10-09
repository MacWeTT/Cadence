# Cadence — Design Spec

Date: 2026-10-09 · Status: draft for review

A personal habit tracker for daily use. Web app first (responsive, iPhone-friendly), Tauri desktop later.
Source brief: the original project brief (stack, MVP scope, definition of done). This spec records the decisions made on top of it.

## 1. Goals and non-goals

**Goals:** fast daily check-in, consistency over guilt, correct streaks and rates, polished UI, code the owner can maintain.

**Non-goals (MVP):** social features (viewing other users' streaks is a later phase), sharing, AI coaching, gamification, payments, notifications, integrations, native packaging, PWA, custom avatar upload, fixed-weekday schedules.

## 2. Decisions

| Topic | Decision |
|---|---|
| Auth | Google sign-in via Supabase Auth. No email/password. |
| Profile | `profiles` row per user: display name and avatar (from Google), `timezone` (IANA), `week_starts_on` (1 = Monday default, 7 = Sunday). |
| Schedule types | Exactly two: `daily` and `weekly_count` (N per week, N = 1–6, any days). 7 per week is `daily`. |
| Schedule history | Schedules are effective-dated. An edit adds a row and never rewrites past periods. |
| Streak on schedule edit | Within the same type the streak carries on. Switching type restarts the current streak. Longest streak and all history are kept. |
| Icons | An emoji, chosen with a Notion-style picker, stored as text. |
| Color | One key from a fixed palette (about 8), stored as text. |
| Home screen | Today's checklist first, then a weekly summary. Streaks, heatmap and long-range analytics live on a Progress page. |
| Local DB | Supabase CLI with Docker Desktop (WSL2). A hosted dev project works until Docker is installed. |

## 3. Business rules

Definitions: a **period** is a day (daily habit) or a week (weekly habit). A week runs from `week_starts_on`. All dates are calendar dates (`YYYY-MM-DD`). "Today" is today in the user's `timezone`, never the server's.

1. **One tick per habit per day.** Enforced by `UNIQUE (habit_id, completion_date)`. Unticking deletes the row.
2. **No future ticks.** Past dates on or after `start_date` can be ticked (backfill). The UI blocks ticks before `start_date`.
3. **`start_date`** defaults to the creation date and can be moved earlier. Nothing before it counts.
4. **Daily habit.** Every date from `start_date` to today is expected. A day is `done`, `missed` (past, no tick), or `pending` (today, no tick).
5. **Weekly habit.** A week is `met` (ticks ≥ N), `missed` (week closed with ticks < N), or `in progress` (current week, not yet met). Ticks beyond N are shown as bonus and capped in rates.
6. **Partial first week.** The week containing `start_date` is excluded from streaks and rates unless `start_date` is the first day of that week. This also holds after a type switch, which always takes effect at a week boundary.
7. **Streak.**
   - Daily: consecutive `done` days ending today if today is done, otherwise ending yesterday. A pending today never breaks it.
   - Weekly: consecutive `met` weeks, including the current week only if already met. A current week still in progress never breaks it.
   - A streak does not extend backwards past a schedule type change.
   - The longest streak is the maximum such run in the habit's history.
8. **Completion rate** over a window = sum of `min(done, expected)` ÷ sum of `expected`, counting closed periods only. Today and the current week show as progress, not as part of the rate. Missed periods stay in the denominator. Windows for weekly habits snap to whole weeks.
9. **Schedule edits.** Every period is judged by the schedule in effect when the period started. A weekly target change or a type switch takes effect at the start of the next week. Past ticks are never touched.
10. **Archive** sets `archived_at`. The habit leaves Today and the habit list. Its history stays in the heatmap and totals, and periods after `archived_at` are not counted. Archived habits can be restored. Permanent delete is allowed only on archived habits and requires confirmation.
11. **UI must distinguish** missed from not-yet-due. For daily habits a past day is `done` or `missed`. For weekly habits there is no per-day "missed", only week status.
12. **Heatmap intensity** for a day = the share of active habits ticked that day, in discrete levels (a first proposal, to review at milestone 6).

## 4. Data model

```
profiles(user_id pk → auth.users, display_name, avatar_url, timezone, week_starts_on, created_at)
habits(id pk, user_id, name, description null, icon, color, start_date, created_at, updated_at, archived_at null)
habit_schedules(id pk, habit_id, kind 'daily'|'weekly_count', times_per_week null, effective_from date)
habit_completions(id pk, habit_id, completion_date date, created_at, UNIQUE(habit_id, completion_date))
```

- `habit_completions` omits `updated_at` (a completion has no mutable state). This deviates from the brief on purpose and can be added later.
- `habit_schedules`: `times_per_week` is required when `kind = 'weekly_count'` and between 1 and 6, null when `daily`. A CHECK constraint enforces this. Every habit has at least one schedule row, and `effective_from` is unique per habit.
- A trigger on `auth.users` insert creates the `profiles` row.
- Row-level security on all tables: `user_id = auth.uid()` on `profiles` and `habits`, and ownership through `habits` for schedules and completions. Server actions also check the session.
- All schema changes are SQL migrations in `supabase/migrations/`.

## 5. Architecture

Next.js App Router, server components by default, Server Actions for mutations, Supabase Postgres and Auth, Tailwind and shadcn/ui.

- **`src/domain/`** is pure TypeScript with no React, DB or I/O. It holds date helpers, schedule resolution, streaks and rates, and is the only place those are calculated. It is fully unit-tested with Vitest and reusable by a later Tauri build.
- Dates are `YYYY-MM-DD` strings. Arithmetic uses UTC so DST cannot shift a day. `Intl` gives "today" in a timezone. No date library.
- **`src/server/`** holds DB access, Server Actions and zod validation at the boundary.
- **`src/components/`** is UI only. Check-ins use an optimistic toggle with rollback and an error toast on failure.
- The emoji picker is the one expected new UI dependency (candidate: `emoji-mart`), to be confirmed in milestone 3.

```
cadence/
├─ supabase/migrations/
├─ src/
│  ├─ app/        (auth)/login · (app)/today · habits · habits/[id] · progress
│  ├─ components/
│  ├─ domain/     dates · schedule · streaks · rates  (+ tests)
│  ├─ server/
│  └─ lib/supabase/
├─ e2e/           Playwright
└─ docs/
```

Tauri note: Server Actions don't fit a static export. The likely desktop route is a Tauri shell that loads the hosted app. This doesn't affect the MVP.

## 6. Milestones

1. **Foundation:** scaffold, Tailwind and shadcn, Vitest, lint, Supabase project, initial migration, Google OAuth wiring.
2. **Domain core (test-first):** dates, schedule resolution, streaks, rates, and `docs/rules.md` derived from section 3.
3. **Habit CRUD:** create, edit (with effective-dated schedule), archive, restore, delete. Emoji and color pickers.
4. **Today and check-ins:** checklist, optimistic toggle, backfill of past dates, weekly-habit progress.
5. **Home summary:** weekly summary under the checklist, streaks, empty state.
6. **Progress page:** heatmap, weekly and monthly summaries, per-habit history, rates over configurable periods.
7. **Polish and ship:** dark and light themes, accessibility pass, Playwright flows, Vercel deploy, setup docs.

## 7. Testing

- **Vitest (domain):** streaks and rates for daily and weekly habits, partial first week, schedule edits and type switch, start-date backfill, week-start Monday vs Sunday, timezone and DST day boundaries, archive cut-off.
- **Vitest or integration (server):** input validation and duplicate-tick prevention.
- **DB:** RLS isolation between two users.
- **Playwright:** sign in, create habit, tick and untick, reload persists, archive and restore.
- Lint and `tsc` must pass before any milestone is considered done.

## 8. Open items (defaults chosen, revisit if wrong)

- Heatmap intensity definition (rule 12).
- Whether permanent delete is needed at all in the MVP (rule 10).
- Exact empty-state and error copy, and visual style, to be proposed at the UI milestones.
