# Roadmap

The internal list of everything planned or considered, so no feature is lost. The public list is *Planned* in `CHANGELOG.md` (no version numbers, no internals); keep the two in step: a feature that is scheduled belongs in both, an idea that is only considered stays here. Versions are proposals until released.

## Shipped

| Version | What it added |
|---|---|
| 0.3.0 | Habits, Today, Home dashboard, Progress |
| 0.3.5 | Motion and page transitions, What's new page, more themes |
| 0.3.6 | Appearance page, contact form, nav highlight |
| 0.4.0 | Instant pages: the browser cache and optimistic changes |
| 0.5.0 | Fixed-weekday schedules, optional habits, habit links |
| 0.6.0 | Install Cadence as an app (PWA, offline page) |
| 0.6.3 | Every page fits phones and tablets; a new footer |
| 0.7.0 | Focus sessions: a timer per habit (free or pomodoro), chimes, a running bar on every page, focus time on Progress |

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 0.8 | Full profile page (**next**) | name, avatar, timezone and week start, delete account, **sound settings (the chime choice synced to the account, and custom chime uploads: short audio, size and type limits, stored privately)**, and **the install control moves here from the account menu: one Install button with two options, Web app (today's install prompt) and Installer (the desktop app, disabled with a "Coming soon" tooltip until it exists)**, and **export and import of all your data**: one file with habits, schedules, ticks, links and focus sessions, so a person can keep a backup or restore it after a loss. Replace-or-merge on import is to be designed with the page. Notification toggles are shown greyed out with a "Coming soon" tooltip and keep no code behind them; they are enabled, with storage, when notifications ship |
| 0.9 | Notifications: browser push and email reminders | Resend needs a verified domain and an unsubscribe link; per-user settings and a scheduler that reuses the Home alert rules in the user's timezone |
| after 0.9 | Desktop app (Tauri) | native notifications, start on login; opens habit links without the popup limit |

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
