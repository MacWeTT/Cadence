# Cadence rules

How Cadence decides what counts. Every rule here is computed in one place, `src/domain/`, and nowhere else. Rationale and edge cases are in the design spec (`docs/superpowers/specs/2026-10-09-cadence-design.md`, section 3).

## Basics
- A **tick** is one habit done on one calendar date. A habit can be ticked at most once per day. Unticking removes it.
- Ticks can be added for past days (on or after the habit's start date), never for future days.
- A habit **starts counting on its start date** (the day you create it, or an earlier one you pick). Nothing before it counts.
- "**Today**" is today in your own timezone, not the server's.
- A **week** runs Monday to Sunday by default, or Sunday to Saturday if you choose.

## Two kinds of schedule
- **Daily:** every day is expected. Each day is *done*, *missed* (past, not ticked) or *pending* (today, not ticked yet).
- **N per week** (1 to 6, any days): each week is *met* (N or more ticks), *missed* (the week ended with fewer), or *in progress* (this week, not met yet). Ticks beyond N are shown as bonus but never push a rate past 100%.
- A habit's first week is **left out** of streaks and rates when you start partway through it. It is still shown as progress.
- A week in which the schedule kind changes partway (possible if you change your week start later) is left out the same way, so no tick is counted twice.

## Streaks
- A **daily** streak counts consecutive done days. A **weekly** streak counts consecutive met weeks.
- Today, or the current week still in progress, **never breaks** a streak. A streak breaks only when a day or week ends unmet.
- Changing a schedule within the same kind keeps the streak. Switching between daily and N per week **restarts the current streak**. The longest streak and all history are kept.

## Completion rate
- Rate = done ÷ expected over a time window, counting **closed** days and weeks only. Missed ones stay in the denominator, so an ignored habit doesn't vanish from your stats.
- For N-per-week habits, whole weeks inside the window are counted, each capped at its target.
- If nothing was expected in the window, there is no rate (never 0%).

## Editing and archiving
- A schedule edit never rewrites history. Each day or week is judged by the schedule that was in effect when it started. A weekly target change or a switch of kind takes effect at the start of **next week**.
- Archiving hides a habit but keeps its history. The days it spends archived form a **pause**: they are never counted as missed, and a week that overlaps a pause is left out of rates. Paused days and weeks neither extend nor break a streak, so archiving and restoring a habit keeps the streak it had. A habit that is archived right now has no current streak.
- A tick is always honoured, even on a paused day (for example the day you archive a habit you already did).

## Check-ins (the Today page)
- You can tick a habit for today or any earlier day, but not a day that has not happened yet, not a day before the habit started, and not while the habit is archived. These rules are enforced in the database, for every write and not only the Today page. Ticking an already ticked day, or unticking an unticked one, changes nothing.
- A day lists the habits that had started, had a schedule in effect, and were not archived. A habit paused on that day appears only if you ticked it then.
- A weekly habit shows how many ticks you have this week ("1 of 3 this week") and "Goal met" once you reach the target. Extra ticks are bonus: they never push a rate above 100%.
- Streak tags appear only when you view today. Looking at an earlier day shows what you did then, without a "current streak" that would be confusing.
- The day you view is in the address (`/today?date=2026-10-08`). A missing, malformed or future date means today.
- The side card shows "done of listed" for the viewed day and the week around it, one cell per day. A daily habit is expected on every day it is active. A weekly habit counts only on the days you ticked it, because no particular day is expected of it. Paused and not-yet-started days expect nothing.
