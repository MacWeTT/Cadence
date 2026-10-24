# Changelog

This file is shown on the app's What's new page, so it is for people using Cadence: features only, nothing internal or sensitive, and no version numbers on what is coming (what ships next is decided internally). Under Known issues, a plain line for each problem people can run into; it is removed when the bugfix release that fixes it ships. A `## Highlights 0.8` section holds the headline and a few bullets for that version line's card on the page, written by hand when a line starts; the releases below it are shown in full on the "every change" page. The version lives in `package.json` and shows in the app's footer.

## Planned

- A photo cropper for your avatar.
- Sign in with GitHub, and link Google or GitHub to your account so you never lose it.
- Reminders: push notifications in your browser.
- XP: points for showing up, coming after Circles.

## Known issues

## Highlights 1.0

Cadence for Windows, and Circles.

- A Windows app that works without internet and without an account, and keeps your habits in step with your account when you sign in.
- Circles: small, private groups of friends or classmates, where nothing is shared until you choose.
- Create an account with an email, a tag and a password, and sign in with your tag or your email.

## Highlights 0.8

Your profile, your sounds, your own tag, and a timer you can pause.

- A profile page: your name, photo or character, timezone, week start and focus sound in one place.
- Your own sounds for focus sessions, and a sound for each session.
- A tag of your own, like @yourname, on your profile.
- Pause and resume a focus session, and Stop answers at once.
- Export your data as JSON, CSV or a PDF report, and restore a backup, or delete your account.

## 1.0.10 (2026-10-24)

Fixes and polish.

- The Windows app now shows your own picture and the colour you chose, in the top bar and on your profile, and knows when your account already has a password (the warning goes away). Without an account the app shows a plain picture and an invitation to sign in.
- Setting or changing your password now works in the Windows app too.
- Signing in with Google in the Windows app now completes properly.
- A Show password button on every password field.
- Every button that is only an icon now says what it does when you hover it, and every button that is switched off says why.
- Saving a Circles setting now shows a message, like every other save.
- The picture in the top bar shows the colour you picked for your character or emoji instead of always the app colour.
- The opening animation on the website now plays before the page shows, instead of after it.
- The Windows app shows Circles in its menu, switched off and marked as coming soon to the app.
- A missing page, or a page that fails, now shows a Cadence page with a way back.
- The Windows app can make the PDF report too, and its export buttons line up. The choice to keep this PC's habits or your account's no longer clips its buttons.
- What's new has a card for the latest update above the version cards. Fixes for a version are listed under every change.

## 1.0.0 (2026-10-24)

Cadence for Windows, and Circles.

- A Windows app, installed from "Get the app" on your profile. It works without internet and without an account. Sign in, and your habits, check-ins and focus sessions are kept in step with your account, so what you do on your PC and on the web is the same everywhere. Sign in with your email or tag, or with Google.
- The app sends you notifications (the end of a focus phase, and a warning in the evening when a streak is at risk), can start when you sign in to Windows, lives in the tray with a way to start a focus session, and opens all of a habit's links in your browser at once. It updates itself.
- Circles: small, private groups of close friends or classmates. Nothing is shared until you choose, and then only as much of each habit as you like. See friends showing up as a conversation, react with an emoji, and give each circle a colour or pin it to the top.
- Partners: a circle for just two of you. Turn on Closer together to see each other's off days, for the habits each of you chooses, and see your week side by side.
- Create an account with an email, a tag and a password, and sign in with your tag or your email. After your first Google sign-in, choose your own tag and a password.

## 0.8.5 (2026-10-18)

A new look for What's new.

- What's new now has one big card for each version line (0.8, 0.7 and so on), with its highlights. The newest card also shows the notes of the latest release.
- A "See every change" page with every release in full.

## 0.8.4 (2026-10-18)

Smoother focus sessions.

- Stop now works at once: the timer stops the moment you press it instead of running on until the server answers. If it cannot be stopped, the timer comes back with an error message.
- The Long break box is greyed out when it cannot be used (it only comes after the 4th round, so it needs a plan of 5 or more rounds), with a note saying why.

## 0.8.3 (2026-10-18)

Pause, and a tag of your own.

- Pause a focus session and carry on later, or stop it, from the panel or the bar at the top. Paused time is never counted as focus, on any device. A session left paused for more than 12 hours is closed with the time up to the pause.
- A tag of your own, like @yourname, on your profile. It starts from the first part of your email (or your GitHub name) and you can change it any time.
- A new line under the logo on the opening screen.

## 0.8.2 (2026-10-12)

Sounds, your way.

- Your own sounds now show up when you start a focus session, next to the built-in ones.
- The sound you choose in your profile is now your default. Pick a different one for a single focus session, and Cadence remembers it for that habit.
- When a session ends, a new box lets you leave its minutes out of your focus time. "I did it" still only ticks the habit.

## 0.8.1 (2026-10-12)

Credit where it's due.

- A list of the people who have helped build Cadence, on the About page.

## 0.8.0 (2026-10-12)

Your profile.

- A profile page, opened from your picture in the top bar: your name, photo, timezone, week start and focus sound in one place, each changed in a moment.
- Choose your avatar: one of six characters or an emoji, in any colour, or upload a photo of your own.
- Your focus sound now follows you to any device. Add up to six sounds of your own, each up to five seconds.
- Pick your timezone from a list of cities, with a note about what changes when you move it.
- Your accent colour follows you to any device too, and there is a new grey to choose from.
- Appearance now lives in your profile.
- Take your data with you: export everything as a JSON or CSV file, or as a PDF report you can read and share, and restore a JSON or CSV backup whenever you like.
- Delete your account, and everything in it, if you ever want to leave.
- A "Get the app" button on your profile. Reminders, by push and by email, are shown as coming soon.

## Highlights 0.7

Focus on a habit.

- A timer on any habit: Free, or Pomodoro with presets and numbers of your own.
- A slim bar on every page while a session runs, with the time in the tab title.
- A chime and a notification when a round or a break ends.
- A Focus time card on Progress.

## 0.7.0 (2026-10-12)

Focus on a habit.

- Start a timer on any habit from Today or Home: Free (counts up until you stop) or Pomodoro (rounds of focus and break, with Classic, Deep and Short presets and your own numbers, remembered for each habit).
- A slim bar on every page while a session runs, with the time in the tab title, so you can leave the page and come back.
- A chime when a round or a break ends, in a sound you choose (or silent), and a browser notification if you allow it.
- When you stop, say "I did it" to tick the habit for that day.
- A new Focus time card on Progress: the minutes you focused, in total and for each habit.

## Highlights 0.6

Cadence goes with you, on every screen.

- Install Cadence on your phone or computer like an app, with an offline page.
- Every page fits phones and tablets, with a tab bar at the foot of the screen.

## 0.6.3 (2026-10-12)

Every screen, every size.

- Every page now fits phones and tablets: a tab bar at the foot of the screen on phones, long habit names that wrap, a year heatmap that scrolls sideways, dialogs that fit the screen, and larger buttons to tap.
- A new footer.

## 0.6.0 (2026-10-11)

Cadence goes with you.

- Install Cadence on your phone or computer like an app, with its own icon and window, shortcuts to Today and Progress, and an offline page when your connection drops.

## Highlights 0.5

More ways to shape a habit.

- Habits on fixed days of the week.
- Optional habits for whenever you like.
- Links on a habit, opened all at once in one click.

## 0.5.0 (2026-10-11)

More ways to shape a habit.

- Habits on fixed days of the week, such as Monday, Wednesday and Friday: they only show on those days, and the other days never break a streak.
- Optional habits, with no fixed days: they sit in their own "Whenever you like" list and count how many times you do them each year.
- Links on a habit: add up to ten, then open them all in one click from Today, Home or the Habits list.

## Highlights 0.4

Instant pages.

- Pages open instantly with your latest data, then refresh quietly.
- Ticking, archiving and deleting a habit answer at once, and go back if something goes wrong.

## 0.4.0 (2026-10-11)

Instant pages.

- Pages open instantly with your latest data, then refresh quietly in the background.
- Ticking, archiving, restoring and deleting a habit answer at once; if something goes wrong, it goes back and tells you.
- A tick on Home or Today shows on every page right away.

## Highlights 0.3

The first numbered versions, and making Cadence yours.

- A Home dashboard with today and week views, progress and a heatmap.
- Ten colour themes with light and dark versions, and an accent colour of your own.
- A contact form, and pages that move in smoothly.

## 0.3.6 (2026-10-11)

Make it yours, and say hello.

- An Appearance page: ten colour themes, each with a light and a dark version, an accent colour (five presets or any colour of your own), and light, dark or match-my-device.
- A contact form, with an option to send anonymously.
- A soft highlight that glides between the selected links in the top bar and the footer.
- Text boxes keep a fixed size and scroll inside.

## 0.3.5 (2026-10-11)

Smoother, with a changelog.

- Every page moves in smoothly: it arrives as one piece and loading no longer pops.
- The Home ring, the alert banner and the habit rows move too: ticking a habit glides it from To do to Done.
- The splash shows the app's description under the logo.
- A What's new page (this one), linked from the footer.
- The tab icon follows the theme.
- Two dark themes, Slate and Forest night, and a theme menu.

## 0.3.0 (2026-10-11)

The first numbered version.

- Home dashboard with a greeting and a day-part alert, today and week views, habits, progress (heatmap, bars, rates).
- Light and dark themes, with a theme toggle.
- The ring "C." logo and favicon, and the animated C-to-Cadence logo and splash.
- A footer with About, Contact and the developer credit, and an About page.
