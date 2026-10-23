# The desktop app (1.0), design

Status: proposed, for review. Version: 1.0 (the installer). It is built as a series of PRs, after a short throwaway spike. Nothing here is built yet.

## Purpose

A Windows app that works **without internet and without an account**, and gives the same Cadence the web app does: Today, Home, Habits, Progress, the focus timer, the profile. Signing in is good but never required. When the person signs in, what is on the PC and what is on their account are brought together by a short, clear rule (below), and from then on the two stay in step.

It also gives what a browser cannot: real notifications, start on login, a tray icon, and opening a habit's links without the browser's popup limit.

Out of scope: macOS and Linux (later, once Windows is solid), push reminders (a separate feature), Circles in the desktop app (they need the server, so they are shown only when signed in and online, and are not part of this design), a native Rust UI (decided against: one set of screens and rules is worth more than the speed it would buy).

## What was decided

- **Tauri 2** for the shell and installer (Rust, the system webview, a small installer).
- **The same Cadence screens and rules**, bundled into the app. No second app, no second copy of the rules in `docs/rules.md`.
- **SQLite** on the PC for the offline data, read and written from TypeScript through Tauri's SQL plugin, so the existing pure code (`src/domain`, the pure view mapping in `src/server/*-view.ts`) runs on local rows unchanged. The Rust we write stays small: the shell and the native features.
- **`supabase-js` straight from the app**, signed in as the person. Row-level security already protects the data; the publishable key is meant to be public. The desktop app does not need the Next server.
- **The screens are bundled in the app** (not loaded from the live site as Discord's desktop app does). That is what lets it start and work offline, and an update of the screens ships as a new installer through the auto-updater. Loading the live site when online, with the bundled copy as the offline fallback, was considered and set aside for now: it would give instant UI updates but needs the local database versioned against the screens (an older copy must refuse a newer database). The data-source seam makes it a later switch, not a rewrite.
- **Windows only first.**
- **Google sign-in through the system browser**, then back into the app (below).

## The data-source seam (the hard part, and built first, on the web app)

Today the screens read through `fetchJson('/api/...')` and change data through Server Actions, and neither exists in a bundled app. The fix is one seam, built and shipped on the web app before any desktop code exists:

- A **data source** with one function per thing the screens read or change (today, home, habits, progress, focus, profile, account) and one per mutation. The screens and their TanStack Query hooks call it, never `fetch` or an action directly.
- Two implementations: **`remote`** (what the web app does now, unchanged in behaviour) and **`local`** (SQLite in the desktop app). The build picks one.
- Shared pure code stays shared. The server-only parts (Supabase queries, `connection()`, cookies) stay on the server side of the `remote` implementation.

The existing e2e specs are the proof that the web app did not change.

**How it is built.** `src/data/` has the `DataSource` interface (`types.ts`), the web implementation (`remote.ts`, today's `fetch` and Server Actions) and `index.ts`, the one module the screens import (`dataSource`). The desktop build points `@/data` at a `local` implementation with a bundler alias (Turbopack `resolveAlias`), not a runtime switch, so the desktop bundle never contains Server Action or server-only code. Circles stays outside the seam: it needs the server, so it is left out of the desktop build.

**Spike result** (a throwaway static export of the app): it compiles; the things that stop a desktop build are the route handlers, the manifest route, `cacheComponents` and `partialPrefetching`, Circles' pages (dynamic routes, and `instant`), and above all Server Actions. Sizing: 7 reads (8 call sites) and 31 actions in 10 files; only 2 server components read the session (`UserMenu`, `RegisterContent`).

**The desktop build.** `npm run build:desktop` (`scripts/build-desktop.mjs`) sets `DESKTOP=1`, sets aside what only a server can do (the API routes, the proxy, the manifest route, the sign-in callback, Circles, the Contact page and the register screen), runs `next build` as a static export into `out/`, and puts everything back, even when the build fails. `next.config.ts` in that mode turns off `cacheComponents` and `partialPrefetching`, drops the redirects and headers, and aliases `@/data/source` to `source.desktop.ts` (the local data source; today a stub whose calls all reject) and the top bar's `UserMenu` to a version with no server read. CI runs it in the quick checks, and `tests/unit/data/desktop-boundary.test.ts` fails if any file other than the web data source imports a Server Action module. Left for the desktop app itself: the real local data source, a client-side user menu, and hiding the footer's Contact link.

**Task list for the seam**, one PR each, none changing the web app's behaviour, each run against the existing e2e specs locally:

- [x] **Reads:** habits, home, today, progress, profile, account, focus.
- [x] **Habits and Today:** create, edit, archive, restore, delete, check in (`habits/actions.ts`, `today/actions.ts`).
- [x] **Focus:** start, stop, skip, pause, resume, discard (`focus-actions.ts`).
- [x] **Profile and account:** the eleven profile edits, and export, import and delete (`profile/actions.ts`, `profile/account/actions.ts`).
- [x] **Everything else:** timezone sync, contact, sign in, sign up, register, sign out.
- [x] **The desktop build flag:** the alias, the settings that differ, and leaving the server-only routes and pages out.

## The local database

- Tables mirror the server's: habits, habit schedules, completions, archive periods, focus sessions, and the profile's settings (tag, timezone, week start, sound, accent). Ids are UUIDs made on the device, so offline creation never clashes.
- A schema version, and migrations for the local file, run when the app starts, so an update never leaves an old file behind.
- The same rules run on local rows: the streak, schedule and week code is the web app's.
- **The focus timer offline** counts on the device clock (the web app counts on the server's). A session is stored locally and synced later. A pause or a resume offline uses the device clock too.

## Signing in, and the sync rule

**The local user.** Until someone signs in, every row in the local file belongs to a built-in local user (`local`), and the profile is one row with placeholder values (tag `me`, no name). Nothing needs an account to work. Ids are made on the device (UUIDs), so rows never clash with the server's when they move.

**When the sync runs.** After a sign-in or a sign-up in the app (including a first Google sign-in, which ends on the register screen), if the file is not yet linked to this account, the two sides are compared. A file is **linked** once it has been through this step: `meta.linked_user_id` records the account, and it is remembered after signing out.

| On the PC | On the account | What happens |
|---|---|---|
| has data | has none (a new account, or an empty one) | The person is told, "You have 12 habits on this PC. Upload them to your account?" **Yes** uploads them (below). **No** leaves them on the PC only. |
| has none | has data | The account's data is **pulled** to the PC. |
| has data | has data | The person is **asked which to keep**, shown a count of each side (habits, check-ins, focus sessions, last change). The side they keep **overwrites the other**, after a safety copy (below). |
| has none | has none | Nothing to do. |

**How the data moves: the existing backup, with no file.** There is no new format and no file on disk.

- **Upload** builds a backup object in memory from the local rows (the same `Backup` shape the Account tab's export writes, from `src/lib/backup-types.ts`, built by the same code), checks it with the same parser and limits as an import (`parseBackup`, `BACKUP_LIMITS`: 500 habits, 200,000 ticks, 50,000 focus sessions, 5 MB), and sends it to the `replace_my_data` function through `supabase-js`. That function is all-or-nothing in one transaction and applies the tick rules to every row. A backup over a limit stops before anything is sent, and says what is over.
- **`replace_my_data` replaces everything on the account and always makes new ids.** That is why the upload is only offered for an account with no data, and why the both-have-data case asks first. And because the ids on the server are new, **after an upload the app pulls the account's copy straight back** (replacing the local rows) so both sides hold the same ids. This pull is safe: it is the data that was just uploaded.
- **Pull** reads the account's data into a backup (the same code as the Account tab's export, run with the person's session) and replaces the local rows with it, in one local transaction (`sql.batch`).
- **Settings are not part of the backup.** The account's tag and name always win. The device's timezone, week start, sound and accent carry over to the account only while the account's own are still at their defaults, and are otherwise left as the account has them. After a pull, the local profile takes the account's settings.
- **Safety copy.** Before one side overwrites the other, what is about to be replaced is saved: for the PC, a backup of the local rows in the app's folder; for the account, the person is offered the account's export first. An overwrite is the one thing that cannot be undone, so it never happens silently.
- **A failure part-way** (no connection, the server refusing) changes nothing: the upload is one call, the pull is one local transaction, and the file is only marked linked after the last step succeeds. The person can try again.

**After linking, the two stay in step** (a later step; it comes before 1.0 too). Changes made on the PC are queued and sent when there is a connection; changes made elsewhere are pulled when the app starts, when it is shown, and on a timer. The same record changed on both sides: **the newest edit wins**. Because the changes name records, this step needs ids that are the same on both sides (which the pull-back above gives) and an id-preserving way to write them: a new database function that adds or updates rows by id (and an `updated_at` on the synced tables), written then, in a migration of its own. The queue uses the same idempotent functions the web app calls (`set_completion` and the rest) wherever one exists. *This part is a default and can be changed: the alternative is to sync only at sign-in.*

**Signing out** keeps the PC's data and goes back to local-only. The file stays linked to the account it was linked to, so signing in to the **same** account again just continues, and signing in to a **different** account on the same PC runs the table above again, comparing the file with that account (the safety copy covers the both-have-data case), so one person's history is never mixed into another's.

**All of this ships before 1.0**, with the desktop app: the changes on local rows, the sign-in from the app, this first-sign-in sync, and staying in step.

## Sign in from the app

- **Email or tag and a password**: the same two tabs as the web login page, calling the same database function (`login_email`) and `signInWithPassword`. Creating an account also works from the app.
- **Google, through the system browser**, as other apps do:
  1. The app opens the browser at Supabase's Google sign-in, asking to be sent back to a small page on the site (`/auth/desktop`).
  2. That page receives the code and hands over to the app with a `cadence://auth?...` link.
  3. The app, which registered that link, finishes signing in (PKCE: it keeps the secret half itself).
  - Needs: the link registered on the PC (the deep-link plugin, with the single-instance plugin so a running app receives it), the page added, and one more address in Supabase's allowed redirect URLs. None of it costs anything.
- A first Google sign-in still ends on the register screen (tag and password), as on the web.

## Native features

Notifications (Tauri's notification plugin: the Home alert rules and the focus timer's phase changes, as real notifications), start on login (autostart plugin, a switch in the profile), the system tray (open, and Start focus), and opening a habit's links with the opener plugin (no popup limit).

## Installing and updating

- A Windows installer built by GitHub Actions on a Windows runner and attached to the GitHub release. The profile page's **Installer** option (disabled, "coming soon", since 0.8) becomes the download link.
- **Updates** with Tauri's updater, from GitHub releases. Its update signing key is free and separate from Windows code signing.
- **The installer is not code-signed at first**, so Windows SmartScreen shows "unknown publisher" the first time. A certificate costs money; the decision waits until there are people who would be put off. The same goes for the web app's version: it ships as it does now.
- Windows 11 has the web view the app needs; Windows 10 may need the installer to fetch it.

## Build order (each its own PR, tests first)

0. **Spike (throwaway):** build the current app as a static export against a stub data source, and list what breaks, to size step 1. The answer is a recommendation; anything built is deleted.
1. **The data-source seam** on the web app. No behaviour change.
2. **The desktop build and the Tauri shell**, running on local SQLite, no account.
   - Done: the Tauri shell (`src-tauri/`, run with `npm run tauri -- dev`, build with `npm run tauri -- build`). It opens a Cadence window on the static desktop copy; every screen says "Couldn't load" until the local data source below exists. Needs the Rust toolchain and the Visual Studio C++ build tools.
   - Done: the local SQLite file (`src/data/local/`, with the two Rust commands in `src-tauri/src/db.rs`): versioned migrations that refuse a file made by a newer app, the habit, schedule, pause, tick, focus and profile tables, and the reads (Today, Home, Habits, Progress, Profile, Account, Focus), built with the same pure builders the server uses (`src/server/page-data.ts`), plus the timezone sync. Tested against an in-memory SQLite in unit tests. The desktop build removes the web app's service worker (it cannot reach the app's own address).
   - Next: the changes on local rows (create, edit, archive, restore, delete, tick, with the rules the server's database functions keep), then focus, then the profile and account edits.
3. **Signing in from the app, and the sync at sign-in** (the table above, the choice dialog, the safety copy): a `meta` table in the local file (a migration, with `linked_user_id`), the upload through the backup and the pull straight back, the settings rules, and the prompts at sign-up and sign-in.
4. **Staying in step**: the change queue, `updated_at`, pulling, conflicts.
5. **Native features, the installer and the updater**, and the profile's Installer link.

## Tests

- **Unit:** the sync decision (which of the four cases, from counts and a marker), the choice and its overwrite direction, the queue's ordering and retries, conflict resolution, the local migrations. The sync code takes the database as a parameter, so it runs in unit tests against an in-memory SQLite, with no Tauri.
- **Web e2e:** the existing specs, unchanged, after step 1.
- **Desktop:** a build of the installer on a Windows runner in CI, and a short checklist for the parts that need a real PC (the installer, notifications, start on login, the Google round trip).

## Risks

- **Static export of the screens** may need more change than expected: the spike sizes it before anything else is committed to.
- **Two copies of the schema** (server and local): a change to one is a change to the other. Local migrations and one test that compares the two keep them honest.
- **Newest-wins can lose an edit** when two devices change the same thing offline. Accepted for a habit tracker; the safety copy covers the sign-in case.
- **The Google round trip** is the one flow that cannot be tested in CI.
- **An unsigned installer** shows a warning.

## Open questions, with the default taken

- Windows only first. *(default: yes)*
- After linking, changes sync both ways with newest-wins. *(default: yes; the alternative is sync only at sign-in)*
- Settings (tag, sound, accent) sync with the account, and the desktop-only ones (start on login) stay on the PC. *(default: yes)*
