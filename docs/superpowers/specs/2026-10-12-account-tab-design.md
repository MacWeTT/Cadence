# The Account tab, design

Status: proposed, for review. Version: 0.8.0 (PR 2 of 3 of the profile page, `2026-10-12-profile-page-design.md`). It stacks on PR 1.

## Purpose

The last tab of the profile: take your data out, put it back, and leave. **Export** a copy of everything you have tracked, as JSON, CSV or a PDF that is good to look at. **Import** a JSON or CSV copy back, replacing what is there. **Delete your account**, with everything in it.

Out of scope: merging an import into existing data (an import replaces), importing from other apps, a PDF import, scheduled backups, and the avatar photo and custom sound files (they are not part of a backup).

## What the person sees

The Account tab (`/profile/account`, added to the tab bar) has three cards:

1. **Export your data.** Three buttons: **JSON** (everything, for backups and other tools), **CSV** (everything, one file, opens in a spreadsheet) and **PDF** (a report for reading and sharing; it cannot be imported). Each downloads at once, named `cadence-2026-10-12.json` and so on. The card says how much you have ("12 habits, 1,204 check-ins, 38 focus sessions"). An export is never cut short, but **if you have more than an import accepts** (the limits below), the card shows a warning before you download: "This is more than Cadence can import back (500 habits, 200,000 check-ins, 50,000 focus sessions). The export is complete; restoring it here would be refused."
2. **Import your data.** A file picker for `.json` or `.csv`, with the limits stated under it ("Up to 5 MB, 500 habits, 200,000 check-ins and 50,000 focus sessions."). When a file is chosen it is read and checked in the browser, and a confirmation modal shows what is in it ("12 habits, 1,204 check-ins, 38 focus sessions") with a warning: **this replaces all your current habits and history, and cannot be undone**. The Import button in the modal is disabled until the person ticks "I understand". A file that is not a Cadence backup, is damaged, has a check-in after today, or is over a limit is refused with a toast that names the limit and the file's own number ("This file has 640 habits; the limit is 500") and nothing changes.
3. **Delete your account** (a red card). A modal: what is deleted (habits, history, focus sessions, uploaded files, your sign-in), and a box to type your email address to confirm. Then the account is deleted and the person lands on the login page with a toast.

Every action uses the profile's modal and toast pattern.

## What a backup holds

Habits (name, description, icon, colour, start date, links, archived date), their schedules (each with its effective date), their check-ins (dates), their pauses (archived and restored dates) and their focus sessions (start, end, mode, plan, skipped and focus seconds). The file also records the account's name, timezone and week start, and the date it was made, for information.

**Import replaces habits and history only.** It does not change the account's own settings (name, timezone, week start, avatar, accent, sound), because a timezone from an old file would silently move what "today" means. Not in a backup: avatar photo, custom sound files, contact messages.

## Formats

All three come from one function, `getBackup()`, that reads the account's rows (paged past the API's row cap) into one typed `Backup` object (`src/lib/backup.ts`, pure, no server code).

- **JSON** is `{ app: "cadence", version: 1, exportedAt, profile, habits: [ { ...habit, schedules: [], ticks: ["2026-10-01", ...], pauses: [], focusSessions: [] } ] }`. Habits nest their own records, so there are no ids to match up. Import reads this back as is.
- **CSV** is one file with one row per record, so it is the easiest to write and to read back, and a spreadsheet can filter it. The first column `record` says what the row is (`habit`, `schedule`, `tick`, `pause`, `focus`), the second `habit` is a number that ties the rows of one habit together (1, 2, 3 in file order), and the rest are the columns each record needs (`name`, `description`, `icon`, `color`, `start_date`, `links` joined with a space, `archived_on`, `effective_from`, `kind`, `times_per_week`, `weekdays` joined with a space, `date`, `restored_on`, `started_at`, `ended_at`, `mode`, `plan` as JSON text, `skipped_seconds`, `focus_seconds`); columns that do not apply are empty. Written and read by a small parser of our own (quotes, commas and line breaks inside a cell; Windows or Unix line ends; a leading byte order mark), tested, so no dependency.
- **Spreadsheet safety:** on export, a text cell that starts with `=`, `+`, `-` or `@` gets a leading apostrophe so a spreadsheet does not run it as a formula; import removes that apostrophe again.
- **PDF** is a report built from the same backup plus the domain's streaks and rates (`src/domain`), so the numbers match the app. Built with `pdf-lib` (pure JavaScript, no native code, the only new dependency). A summary page: name, the period covered, totals (habits, check-ins, focus hours, best current streak), and then each habit as a card: a colour band, name and schedule in words, current and longest streak, the 30-day and 90-day rates, total check-ins and focus minutes, and a year heatmap of the last 12 months drawn as small squares in the habit's colour. Cadence's cream background, moss accents and serif headings (standard fonts, so the file is small and prints well); emoji cannot be drawn in a PDF font, so a habit's icon is replaced by a coloured circle with its first letter. Pages break between cards. An account with no habits gets a one-page "nothing yet" report.

## Import, in one transaction

Parsing and checking is a pure function `parseBackup(text, fileName)` in `src/lib/backup.ts` (zod), run in the browser for the confirmation and again on the server for the write. It enforces the same rules as the database (name 1 to 80 characters, one of the schedule kinds with its weekdays or weekly count, up to 10 web links, a tick not before the habit's start and not after today in the account's timezone, one tick per habit per day, a valid colour name and a single emoji) and sensible caps: 5 MB, 500 habits, 200,000 ticks, 50,000 focus sessions. Habit ids and row ids are never taken from a file; new ones are made.

The write is one Postgres function, `replace_my_data(p_backup jsonb)`, run as the signed-in person (row-level security applies, `auth.uid()` is the owner), so it is atomic: any failure rolls everything back and the old data stays. It deletes the person's habits (which cascades to schedules, ticks, pauses and focus sessions), then inserts the file's habits, schedules, ticks, focus sessions and, last, the archived dates and pauses (the tick trigger refuses ticks on an archived habit, so habits are archived after their ticks are in). It returns the counts. The rules the database already enforces (the tick trigger, the schedule checks) are the final word; a violation becomes a readable error naming what was wrong.

Server action `importBackupAction(formData)`: signed in, size checked, parsed, validated, then the function. After success every cached page is refetched and a toast says what was restored.

## Export, server side

`GET /api/export?format=json|csv|pdf` (a route handler, 401 when signed out, 400 for another format) returns the file as an attachment with the right type. It reads through the signed-in client, so it can only ever return the caller's own rows. It is a download link from the Account card, not a client fetch, so large files stream to the browser's own download.

## Counts and limits

`GET /api/account` returns the account's counts (habits, check-ins, focus sessions) for the Account tab's cache (`account` query), so the export card can show them and warn when they pass the import limits. The limits live in one place (`BACKUP_LIMITS` in `src/lib/backup.ts`), used by the parser, the server check and the warning, so the three never disagree.

## Delete account

A Postgres function `delete_my_account()` (security definer, `search_path` empty, execute granted to signed-in users only) deletes the caller's non-anonymous contact messages (they hold a name and an email) and then the caller's row in `auth.users`, which cascades to the profile, habits, schedules, ticks, pauses, focus sessions and custom sounds. Doing it in the database means production needs no service key in the web app's environment.

The server action first removes the person's files from the `avatars` and `sounds` buckets (storage rows are not covered by the cascade), then calls the function, then signs out and redirects to `/login`. The confirmation needs the typed email to match the account's (checked in the action as well as in the modal). A failure part way leaves the account usable: files go first, the account last.

## Also in this PR

- The default page title in the browser tab becomes **Cadence · For habits that stick**, in `locales/en/metadata.json` (a new `defaultTitle` key, used for `title.default`; the application name, the installed app's name and the manifest stay "Cadence"). A minor tweak: not in the changelog.

## Edge cases

- An import file made by a newer version of Cadence (`version` above the one known) is refused with "update Cadence".
- A CSV opened and saved by a spreadsheet may change dates (`2026-10-01` becoming `10/1/26`): such a date is refused with the row number, never guessed.
- A backup with no habits is valid and empties the account (the warning says so).
- Importing twice gives the same result (it replaces).
- A habit with the same name twice is fine; habits are matched by position, not by name.
- Deleting the account while a focus session runs: the session goes with it.
- Two tabs importing at once: each is one transaction; the later one wins.

## Tests

- Unit: JSON and CSV round trips (a rich account in, the same account out, including quotes, commas, line breaks, emoji and the spreadsheet apostrophe), parse refusals (wrong app, wrong version, bad date, a tick before the start or in the future, a duplicate tick, too many habits, a file over each cap (the message names the limit and the file's number), the over-the-limit warning for an export, a spreadsheet-mangled date, a stray extra column), the caps, the count summary, the PDF builder's page and card layout (it returns bytes that start with `%PDF` and one page per card group, for an empty account and a full one), the file names.
- Database (pgTAP): `replace_my_data` replaces, is atomic (a bad row leaves the old data), cannot touch another person's rows, honours the tick and schedule rules, archives last; `delete_my_account` removes the account and everything under it, anonymous contact messages stay, and it cannot be run signed out.
- e2e: export downloads for each format and the file content is right (JSON parses, CSV has the header and the rows, PDF starts with `%PDF`); import a JSON file with the confirmation and warning, the data appears and the old habits are gone; the same from CSV; a bad file is refused and nothing changes; "I understand" gates the button; delete account needs the typed email, lands on login and the same sign-in then starts a fresh empty account; the new tab title.

## Tasks (tests first in each)

1. Migration: `replace_my_data` and `delete_my_account`; pgTAP tests.
2. `src/lib/backup.ts`: the `Backup` type, JSON and CSV writing and reading, `parseBackup`, summary counts, file names; unit tests.
3. Server: `getBackup()`, the `/api/export` route (JSON and CSV), `GET /api/account` (the counts), `importBackupAction`, `deleteAccountAction`.
4. The PDF builder (`pdf-lib`) and the `pdf` format on the route; unit tests, then look at the file once.
5. The Account tab: route, tab link, export card, import card with the confirmation modal, delete card with the typed-email modal; all text in `locales/en/account.json`.
6. The page title tweak.
7. e2e specs, then lint, types and the changed tests.

## Decided defaults, open to change

- CSV is one file with a `record` column, not several files in a zip (no zip dependency; trade-off: less tidy in a spreadsheet than one sheet per kind).
- Import leaves the account's own settings alone.
- The confirmation to delete is the typed email address.
- Caps: 5 MB, 500 habits, 200,000 ticks, 50,000 focus sessions.
