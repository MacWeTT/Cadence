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

## Scheduled

| Version | Feature | Notes |
|---|---|---|
| 0.9 | Accounts and the timer (**next**) | **Sign in:** GitHub next to Google, and sign up or sign in with an email and a password. **Tags:** every account has a tag, `@name` (introduced with the sign-up work, in the same PR): by default the part of the email before the @ for Google and email accounts (`manasbajpai18@gmail.com` becomes `@manasbajpai18`) and the GitHub username for GitHub; made unique automatically, and changeable on the profile. No mail is sent in 0.9 (no paid or hosted mail service yet), so the email is not verified and there is no password reset; both wait for the mail system under *Later*. The stopgap until then: a person who signed up with an email can **link Google or GitHub** to the account (a way back in if the password is forgotten), a **banner at the top of the app** nags until one is linked, and the Account tab has a **change password** modal (no current password needed, so someone signed in through a linked account can set a new one); the login page says, with a joke, that the password must be remembered. A flow to revise once the mail system exists. **Focus timer:** pause and resume, like LeetCode: pause or stop; the server keeps the paused time so the minutes are right on every device. **Small:** the ring on the avatar (in the code since 0.8.0; to be confirmed on screen) and the splash tagline (merged after 0.8.2). The account tab's delete-account flow must cover every kind of account, including one with no email (GitHub can hide it). Build order: email sign-up with tags, GitHub sign-in, pause and resume, then the release |
| 1.0 | Desktop app (Tauri), the installer | native notifications, start on login; opens habit links without the popup limit |
| 1.0 | First release: bug fixes, flow revisions, and the installer | The public release. Everything from 0.8 to 0.9 ships first; 1.0 is the pass over the whole app (the known-issue fixes, the flows reviewed end to end, the privacy page and terms, the accessibility pass) plus the desktop installer. Later releases fix and refine, to be planned after it |

## Before 1.0

- The accessibility pass and the dark-theme contrast check left over from the original milestone 7.
- A privacy page and terms before strangers sign up. Google also needs them (with a home page) to verify the app's name, so the sign-in screen can say Cadence instead of the Supabase address.
- 1.0 is the first release: bug fixes, flow revisions and the installer, on top of everything scheduled above it.

## Later, when there are enough users to justify the cost

Deferred on purpose: they need a mail service, and Cadence stays free until people actually use it.

- **The mail system:** a sending address (a domain of our own, about $10 a year, with Resend's free plan; or a dedicated Gmail account over SMTP as a free stopgap), Supabase's custom SMTP, our own email templates, and a local mail catcher. It unlocks the next three.
- **Verified email and password reset** for the accounts 0.9 adds: a code sent at sign-up and for a forgotten password. Two-factor sign-in (2FA) waits too.
- **Reminders by push and by email:** per-user settings, a scheduler that reuses the Home alert rules in the user's timezone, an unsubscribe link.
- **A support link** ("Buy me a coffee"), if funding makes the mail system and the rest worthwhile.

## After 1.0 (in scope, not yet versioned)

- **Two-factor sign-in (2FA):** wanted after the 0.9 accounts work, not before (it also wants the mail system for its recovery path).
- **Circles:** a friends-only way to share habits, without pressure. Proposed by a contributor in issue #64; to be designed when it is next. It replaces the old "viewing other people's streaks" idea below.
- **User XP:** points for showing up, introduced together with Circles (it is part of that release, not a later one). Design with Circles.

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
