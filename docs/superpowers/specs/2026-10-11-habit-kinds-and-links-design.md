# 0.5: fixed weekdays, optional habits and links, design

Status: proposed. Defaults are chosen where the answer was not given; the open questions at the end can change them.

## Scope

Three features, shipped together as 0.5:

1. **Fixed-weekday schedules**: a habit expected on chosen days of the week (Mon, Wed, Fri).
2. **Optional habits**: no expected days, no streak, no rate; only a count of how many times it was done this year.
3. **Links**: one or many links on a habit, opened together in one click.

Everything is additive: new schedule kinds, one new column, no data rewrite. Reminders, focus sessions, the PWA and the profile page are later releases (0.6 PWA, 0.6.5 profile, 0.7 notifications and the timer).

## 1. Fixed weekdays

- A new schedule kind `weekdays` with a set of 1 to 6 distinct weekdays (1 = Monday ... 7 = Sunday, fixed, whatever `week_starts_on` is). All seven days is just `daily`.
- **Judging:** a day is expected only if its weekday is in the set. Other days expect nothing (neutral): they never count as missed and never break a streak. A tick on an unexpected day is honoured and shown as done (same as a tick on a paused day), but adds to no rate.
- **Streak:** in days, over expected days only; unexpected days are skipped like paused days. Streaks still never reach back past a change of schedule kind.
- **Today and Home:** the habit is listed on its days (and on any other day only if ticked). Home's "at risk" uses today only when today is an expected day.
- **Progress:** the heatmap expects 1 on its days and 0 elsewhere; the rate is done over expected days; "ticks per week/month" are unchanged.
- **Editing:** like the other schedule edits, a change takes effect at the start of next week and never rewrites history.
- **Database:** `habit_schedules.kind` accepts `'weekdays'`; new column `weekdays smallint[]` (null unless kind is `weekdays`; CHECK: 1 to 6 distinct values between 1 and 7). `set_completion` and the completion trigger need no change (a tick is always honoured).

## 2. Optional habits

- A new schedule kind `optional`, with no parameters.
- **No expectations:** never listed as "to do", never in the Home ring or banner, never in a rate or the heatmap's expected count, no streak, never "at risk".
- **Today and Home:** shown in their own section ("Whenever you like") below the others, with "N this year". Ticking works as for any habit (one tick per day).
- **Progress:** each optional habit has a card with its count for the year and a small per-month bar. The "all habits" heatmap counts its ticks as done days but expects nothing from it.
- Changing a habit to or from `optional` is a normal schedule edit (effective next week).

## 3. Links

- `habits.links text[] not null default '{}'`: up to 10 http or https URLs, in order. Validated in the form schema and with a CHECK on the database (array length, each value starts with `http://` or `https://`). Links are not effective-dated: editing them changes the habit, not its history.
- **Form:** a "Links" field in the habit dialog: add, remove and reorder rows, with inline validation.
- **Opening:** an "Open links" button on the habit row (Today, Home) and the habits list. One click opens each link in its own tab (`window.open` with `noopener`). A browser lets one popup through per click, so the first run asks the person to allow popups for Cadence; if only some tabs open, a toast says how. The desktop app opens them without that step.

## Order of work

Three stacked pull requests into `develop`, then the release:

1. Domain, database and rules: the new kinds, tests first (`docs/rules.md` updated), the migration.
2. UI for the kinds: schedule field, labels, Today, Home, Progress, the habit list, the cache types.
3. Links: column, form, open button.
4. 0.5.0 release (version bump, changelog, `develop` into `master`, tag).

## Open questions (defaults in bold)

1. Weekday sets of 1 to 6 days, since seven days is `daily`: **yes**.
2. Optional habits: a yearly goal ("12 times this year") or only a count: **only a count**.
3. A name or label per link, or the address only: **address only, shown by its host name**.
4. Link limit per habit: **10**.
