# Testing the desktop app by hand

The automated tests cover the logic (unit tests against an in-memory SQLite and an in-memory account) and the web app (Playwright). What they cannot cover is the app running as a real Windows program. This is the checklist for that, using your **local** Supabase, so no production data is touched.

## Set up

1. Docker and the local Supabase are running (`npm run db:start`), and the web app too (`npm run dev`, port 3000). The web app is the "other device", and it serves the `/auth/desktop` page Google comes back to.
2. `.env.local` has the local values (`NEXT_PUBLIC_SUPABASE_URL` pointing at 127.0.0.1).
3. `npm run seed:demo` makes the demo account: `demo@cadence.test` / `demo-password-123!`, tag `@demo`, a character avatar and three habits with a month of history. `npm run seed:demo -- --empty` makes the same account with no habits.
4. `npm run tauri -- dev` starts the app (the first build takes several minutes). Its data is in `%APPDATA%\app.cadence.desktop\cadence.db`: close the app and delete that file to start with an empty PC.

## The sync at the first sign-in (sign in with the demo account in the app)

| PC file | Account | Expect |
|---|---|---|
| empty | seeded (3 habits) | the habits and history appear on the PC, no question |
| has habits (make one first) | `--empty` | "Upload this PC's habits?" Upload puts them on the account; "Keep them on this PC only" does not, and it is not asked again |
| has habits | seeded | "Which should we keep?" with both counts. "Keep my account's" replaces the PC (a safety copy is kept); "Keep this PC's" replaces the account |
| empty | `--empty` | nothing asked |

Sign out and sign in with a **different** account on the same PC: the table runs again.

## Staying in step (signed in, file linked)

- Tick a habit in the app: it shows on the web app within a minute (or when the window is focused).
- Tick, edit, archive and delete on the web: the app follows.
- Turn off the network, change things in the app, turn it on: the changes go out.
- Change the same habit's name on both sides while offline: the newest edit wins.

## The rest

- Focus: start, pause, resume, skip a break, stop, discard. A notification appears at each phase change.
- Profile: edit the name, week start, timezone, accent. Export JSON and CSV (a file is downloaded). Import one back. "Delete everything on this PC" asks once and empties the PC.
- Home notification: late in the day with a habit's streak at risk, a Windows notification appears once.
- Notifications tab: the "Start Cadence when I sign in to Windows" switch survives a restart. The tray icon opens the window, and Quit quits.
- A habit with several links: the button opens them all in the browser.
- Google sign-in needs real Google credentials, so it is tried on the live site (see below).

## What only production can show

- **Google sign-in.** Needs `https://<site>/auth/desktop` in Supabase's redirect URLs. Try it with an empty PC file (it then only copies your account's data down), and download the account's export from the web app first.
- **The installer.** `npm run tauri -- build` with the production public values set gives `src-tauri/target/release/bundle/nsis/*-setup.exe`; the Desktop workflow builds the same on a release PR into `master`.
- **An update installing.** The first real test is releasing 1.0 and then a 1.0.1.
