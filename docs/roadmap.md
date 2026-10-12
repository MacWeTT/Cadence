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
| 0.7.0 | Focus sessions: a timer per habit, free or pomodoro, with chimes and minutes of focus on Progress |

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 0.8 | Profile page (**next**), as a stack of three PRs | Tabs as routes under `/profile`: Overview, Appearance (moves here, `/appearance` redirects), Notifications, Account. Every edit is a modal with an optimistic save and a toast. **PR 1:** Overview (photo, name, timezone, week start, focus sound synced to the account), a "Get the app" dropdown (Web app, and Installer disabled with "Coming soon"), Appearance moved, Notifications (push and email toggles, disabled). Avatar: the Google photo to start, then one of six characters or an emoji (with an accent colour), or an uploaded photo cropped square. Sound: the six built-in sounds or up to six custom ones (5 seconds each), kept privately. Timezone: a city list with a warning that "today" shifts. **PR 2:** Account tab: delete account, and export and import of all your data (habits, schedules, ticks, links, focus sessions; replace-or-merge on import to be designed). **PR 3:** redrawn Alien and Mage, review fixes, version and changelog. Design: `docs/superpowers/specs/2026-10-12-profile-page-design.md` |
| 0.8.1 | Contributors list | Shipped together with 0.8 as one release (two changelog entries, the version in the footer is 0.8.1). Credit for everyone who has helped build Cadence, shown on the About page: name, what they did, and a link to their profile. Kept by hand in one data file, so it can credit design, testing and ideas as well as code; a short "how to be listed" note in the repo for new contributors |
| 0.9 | Regular login: email and password | Sign up, sign in, verify the email, reset a forgotten password, next to Google. Needs the email sender set up (see Notifications) and the account tab's delete-account flow to cover both kinds of account |
| 0.9.5 | Notifications: browser push and email reminders | Resend needs a verified domain and an unsubscribe link; per-user settings and a scheduler that reuses the Home alert rules in the user's timezone |
| 1.0 | Desktop app (Tauri), the installer | native notifications, start on login; opens habit links without the popup limit |
| 1.0 | First release: bug fixes, flow revisions, and the installer | The public release. Everything from 0.8 to 0.9.5 ships first; 1.0 is the pass over the whole app (the known-issue fixes, the flows reviewed end to end, the privacy page and terms, the accessibility pass) plus the desktop installer. Later releases fix and refine, to be planned after it |

## Before 1.0

- The accessibility pass and the dark-theme contrast check left over from the original milestone 7.
- A privacy page and terms before strangers sign up. Google also needs them (with a home page) to verify the app's name, so the sign-in screen can say Cadence instead of the Supabase address.
- 1.0 is the first release: bug fixes, flow revisions and the installer, on top of everything scheduled above it.

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
