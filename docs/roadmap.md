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

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 0.6.5 | Profile page (**next**), as a stack of three PRs | Tabs as routes under `/profile`: Overview, Appearance (moves here, `/appearance` redirects), Notifications, Account. Every edit is a modal with an optimistic save and a toast. **PR 1:** Overview (photo, name, timezone, week start, focus sound synced to the account), a "Get the app" dropdown (Web app, and Installer disabled with "Coming soon"), Appearance moved, Notifications (push and email toggles, disabled). Avatar: the Google photo to start, then one of six characters or an emoji (with an accent colour), or an uploaded photo cropped square. Sound: the six built-in sounds or up to six custom ones (5 seconds each), kept privately. Timezone: a city list with a warning that "today" shifts. **PR 2:** Account tab: delete account, and export and import of all your data (habits, schedules, ticks, links, focus sessions; replace-or-merge on import to be designed). **PR 3:** redrawn Alien and Mage, review fixes, version and changelog. Design: `docs/superpowers/specs/2026-10-12-profile-page-design.md` |
| 0.7 | Notifications: browser push and email reminders | Resend needs a verified domain and an unsubscribe link; per-user settings and a scheduler that reuses the Home alert rules in the user's timezone |
| 0.7 | Focus sessions: a timer per habit (**next**) | free (count up) or pomodoro (presets Classic 25/5, Deep 50/10, Short 15/3, all editable, last numbers remembered per habit); a running bar on every page; "I did it" ticks the habit; minutes of focus on Progress. Design: `docs/superpowers/specs/2026-10-12-focus-sessions-design.md`. Later: a Focus page with recent sessions |
| after 0.7 | Desktop app (Tauri) | native notifications, start on login; opens habit links without the popup limit |

## Before 1.0 (not yet versioned)

- The accessibility pass and the dark-theme contrast check left over from the original milestone 7.
- A privacy page and terms before strangers sign up.
- 1.0 itself is the public release; its exact scope is not final. Proposed: everything above up to notifications, plus these two.

## Considered, not scheduled

From the original spec's non-goals, and ideas since. Nothing here is promised.

- Social: viewing other people's streaks (the spec's "later phase"), and sharing.
- An in-app photo cropper for avatars (uploads are cropped to a square by default until then).
- A proper icon set across the app (lucide is installed; moving the hand-drawn icons over).
- Integrations (calendar, other trackers), AI coaching, gamification, payments.
- Hover-prefetching of the top-bar links (left out of the cache work).
- Server-side prefetch so a cold first load skips the skeleton.
- Languages beyond English (the app is already localised, `en` only).
- Per-link names, and a yearly goal for optional habits.
