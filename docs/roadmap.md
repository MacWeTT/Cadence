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
| 0.8.0 | Profile page: name, avatar (characters, emoji, photo), timezone, week start, focus sound and accent kept on the account, up to six custom sounds, Appearance moved here, the Account tab (export as JSON, CSV or PDF, import, delete account), a grey accent |
| 0.8.1 | Contributors list on the About page |
| 0.8.2 | A sound for each focus session (your own sounds included, the profile sound as the default), and a box to leave a session's minutes out of the focus time |
| 0.8.3 | Pause and resume on the focus timer (the server keeps the paused time, so the minutes are right on every device), a tag of your own (`@name`) on every account, and the splash tagline |
| 0.8.5 | What's new as cards: one big card for each version line with its highlights (the newest also shows its latest release), and a page with every change in full |

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 1.0 | Desktop app (Tauri), the installer | A Windows app that works offline and without an account, and syncs when signed in (the PC's data and the account's are brought together by a rule: push, pull, or ask which to keep). Native notifications, start on login, opens habit links without the popup limit. Google sign-in through the browser. See `docs/superpowers/specs/2026-10-23-desktop-app-design.md` |
| 1.0 | First release: accounts, Circles, bug fixes and flow revisions | The public release. **Accounts:** no mail is sent (no confirmation, no forgot password, no 2FA). A first sign-in with Google or GitHub ends on a register screen: the email (locked), a tag (the only word for a username) and a password. Sign up with an email, a tag and a password; sign in with a tag or an email and a password. Existing accounts are not forced to register; the profile page, and only it, warns when no password is set or no Google or GitHub is linked (a forgotten password is gone, so link one). Sign-in methods and linking in the Account tab, a password modal, and delete-account for accounts with no email. GitHub sign-in. See `docs/superpowers/specs/2026-10-12-accounts-design.md`. **Circles:** friends-only sharing, six PRs by their author (`docs/superpowers/specs/2026-10-12-circles-design.md`). Then the pass over the whole app (the known-issue fixes, the flows reviewed end to end, the privacy page and terms, the accessibility pass) and the desktop installer. Later releases fix and refine, to be planned after it |

## Before 1.0

- The accessibility pass and the dark-theme contrast check left over from the original milestone 7.
- A privacy page and terms before strangers sign up. Google also needs them (with a home page) to verify the app's name, so the sign-in screen can say Cadence instead of the Supabase address.
- 1.0 is the first release: bug fixes, flow revisions and the installer, on top of everything scheduled above it.

## Later, when there are enough users to justify the cost

Deferred on purpose: Cadence stays free until people actually use it.

- **Push reminders:** Web Push with VAPID keys, per-user settings, and a scheduler that reuses the Home alert rules in the user's timezone: Supabase `pg_cron` calling a Cadence route every minute (Vercel's free plan only runs cron once a day). No email reminders.
- **A mail service of our own:** a domain and Resend, only if Gmail proves unreliable or Cadence outgrows it.
- **A support link** ("Buy me a coffee"), if funding makes the mail system and the rest worthwhile.

## After 1.0 (in scope, not yet versioned)

- **Two-factor sign-in:** authenticator-app codes (TOTP, native to Supabase), when there are enough users to want it.
- **User XP:** points for showing up, follows Circles (the Circles release is the 1.0 one). Design with Circles.

## Considered, not scheduled

From the original spec's non-goals, and ideas since. Nothing here is promised.

- Sharing outside Circles (public profiles, links).
- An in-app photo cropper for avatars (uploads are cropped to a square by default until then).
- A proper icon set across the app (lucide is installed; moving the hand-drawn icons over).
- Integrations (calendar, other trackers), AI coaching, gamification, payments.
- Hover-prefetching of the top-bar links (left out of the cache work).
- Server-side prefetch so a cold first load skips the skeleton.
- Languages beyond English (the app is already localised, `en` only).
- Per-link names, and a yearly goal for optional habits.
