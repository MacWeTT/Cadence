# Roadmap

The internal list of everything planned or considered, so no feature is lost. The public list is *Planned* in `CHANGELOG.md` (no version numbers, no internals); keep the two in step: a feature that is scheduled belongs in both, an idea that is only considered stays here. Versions are proposals until released.

## Shipped

| Version | What it added |
|---|---|
| 0.3.0 | Habits, Today, Home dashboard, Progress |
| 0.3.5 | Motion and page transitions, What's new page, more themes |
| 0.3.6 | Appearance page, contact form, nav highlight |
| 0.4.0 | Instant pages: the browser cache and optimistic changes |

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 0.5 | Fixed-weekday schedules | Design: `docs/superpowers/specs/2026-10-11-habit-kinds-and-links-design.md` |
| 0.5 | Optional habits (yearly count, no streak) | same design |
| 0.5 | Habit links (one or many, opened together) | same design; popups need allowing once |
| 0.6 | PWA: installable, app icon, offline shell | shares the service worker with push |
| 0.6.5 | Full profile page | proposed contents: name, avatar, timezone, week start, data export, delete account |
| 0.7 | Notifications: browser push and email reminders | Resend needs a verified domain and an unsubscribe link; per-user settings and a scheduler that reuses the Home alert rules in the user's timezone |
| 0.7 | Focus sessions: a timer per habit | timestamp-based; finishing asks "I did it" before ticking; open: one timer or 25/5 cycles, a target length per habit or chosen at start |
| after 0.7 | Desktop app (Tauri) | native notifications, start on login; opens habit links without the popup limit |

## Before 1.0 (not yet versioned)

- The accessibility pass and the dark-theme contrast check left over from the original milestone 7.
- A privacy page and terms before strangers sign up.
- 1.0 itself is the public release; its exact scope is not final. Proposed: everything above up to notifications, plus these two.

## Considered, not scheduled

From the original spec's non-goals, and ideas since. Nothing here is promised.

- Social: viewing other people's streaks (the spec's "later phase"), and sharing.
- Custom avatar upload (the Google picture is used today).
- Integrations (calendar, other trackers), AI coaching, gamification, payments.
- Hover-prefetching of the top-bar links (left out of the cache work).
- Server-side prefetch so a cold first load skips the skeleton.
- Languages beyond English (the app is already localised, `en` only).
- Per-link names, and a yearly goal for optional habits.
