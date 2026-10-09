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
- Archived habits have no current streak.

## Completion rate
- Rate = done ÷ expected over a time window, counting **closed** days and weeks only. Missed ones stay in the denominator, so an ignored habit doesn't vanish from your stats.
- For N-per-week habits, whole weeks inside the window are counted, each capped at its target.
- If nothing was expected in the window, there is no rate (never 0%).

## Editing and archiving
- A schedule edit never rewrites history. Each day or week is judged by the schedule that was in effect when it started. A weekly target change or a switch of kind takes effect at the start of **next week**.
- Archiving hides a habit but keeps its history. Days and weeks after the archive date are not counted.
