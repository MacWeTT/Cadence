# Profile page, design

Status: proposed, for review. Mockups: the Profile screens of the visual companion (`.superpowers/brainstorm`, not committed). Version: 0.6.5.

## Purpose

One place for everything about the person and their settings: who they are (name, avatar), how Cadence counts their days (timezone, week start), how it sounds (the focus sound), how it looks (Appearance, moved here), and, later, notifications and the account itself. Today these are scattered: the timezone is set silently, the sound lives in one browser's storage, Appearance is its own page, Install sits in the account menu.

Out of scope: real push and email reminders (0.7; here only disabled toggles), an in-app photo cropper (roadmap, later), the desktop installer itself, and sharing or viewing other people's profiles.

## Layout

`/profile` is a shared layout (header and tab bar) with four routes:

| Route | Tab | PR |
|---|---|---|
| `/profile` | Overview | 1 |
| `/profile/appearance` | Appearance (the existing page, moved; `/appearance` redirects here) | 1 |
| `/profile/notifications` | Notifications | 1 |
| `/profile/account` | Account | 2 |

- The header shows the avatar and name, and a **Get the app** dropdown button: **Web app** (today's install prompt) and **Installer** (disabled, "Coming soon"). The button is hidden once the app is installed. It replaces `InstallMenuItem` in the account menu.
- The account menu and the top bar link to `/profile` instead of `/appearance`.
- Tabs are routes, so each is linkable and has its own skeleton. Switching is near-instant: the profile is one `profile` query in the browser cache (as with Today, Home and Progress), so a tab read is a cache read; Appearance has no loading at all (local settings). The skeleton shows only on a cold first load.
- Overview is one card of rows: Photo, Name, Timezone, Week starts on, Focus sound. Each row shows its current value and opens a modal. Phones: the same list, modals become full-width sheets.
- Notifications has two disabled toggles, **Push notifications** and **Email reminders**, each marked "Coming soon". Nothing else until 0.7.
- Account is a placeholder in PR 1 (it is not linked in the tab bar until PR 2).

## Every edit is a modal, saved optimistically

- Each row opens a small modal holding only that control, with **Cancel** and **Save**.
- Save closes the modal and the row shows the new value at once. The server confirms and a **toast** says so ("Name updated", "Avatar updated", "Timezone set to Los Angeles", "Week now starts on Sunday", "Focus sound set to Marimba"). On failure the row returns to its old value and an error toast says what failed.
- Toasts use `sonner`, as the rest of the app does. A toast for every edit, not only the name.

## Avatar modal

- The **current avatar** is large at the top and always shows what Save would apply: it starts as the saved avatar and changes as a new one is picked. The choices below are small.
- Starting avatar is the Google picture (`avatar_url`). It is the first "current" and is not offered again after the person changes it.
- Choices: **six characters** (Alien, Robot, Cyclops, Ghost, Punk, Mage), **emoji** (a short fixed set plus a "more" picker), and **your own photo**.
- Characters and emoji take a **colour**: the five preset accents plus a colour of your own, using the Appearance accent picker's logic (`deriveAccent`, hex validation). The colour row is hidden for a photo.
- A photo (JPEG, PNG or WebP, up to 2 MB) is **cropped to a centred square** in the browser before upload. The only limit is the file size (2 MB), not the dimensions. There is no cropper yet: it is on the Planned list and the roadmap.
- Characters are SVG components that take the colour. The six drawn in the mockups are placeholders: Alien and Mage are out of proportion and cropped, and are redrawn during development. The picker works with any six SVGs. The wizard is renamed **Mage**.

## Sound modal

- Same shape as the avatar modal. The **current sound** is a large tile at the top. Below: the **six built-in sounds** (Bell, Marimba, Wood, Beep, Rising, Silent; the recipes in `src/lib/chimes.ts`), a **volume** slider, and **your own sounds**.
- Tapping a sound plays it at the chosen volume.
- **Up to six custom sounds** per person. Each is short audio, **at most 5 seconds**, **at most 500 KB**, MP3, WAV or OGG. They sit in a "Yours" row with a remove button and a name taken from the file. At six, the upload box says the limit is reached.
- The focus cues (focus, break, done) use the chosen sound as today: the break cue is the same sound higher and shorter, the done cue repeats it. For a custom sound the pitch change uses `playbackRate`, and "done" plays it three times.
- Silent stays one of the six.

## Timezone modal

- A searchable list of cities from the browser's own zone data (`Intl.supportedValuesOf('timeZone')`, plus `UTC`). It shows the city with spaces and the region beside it ("Los Angeles · America"), and the UTC offset now. The stored value stays the IANA name (`America/Los_Angeles`). Search matches city or region. The browser's zone is pinned first as "Detected". You cannot type a free value; the server rejects anything not in the list.
- Below the list, always shown, a warning with a triangle alert icon: changing the timezone changes what "today" means; if the new zone is behind, ticks from a later date show again when that date arrives, and a habit that started today starts tomorrow; nothing is deleted. There is no second confirm.
- On Save: a running focus session is ended first without ticking the habit (the existing focus ending), then the timezone is saved, then every cached page is refetched (`invalidateQueries`, as `TimezoneSync` does). Old ticks keep their dates.
- Why this is safe: ticks are stored against dates, and the completion trigger checks only on insert or update, so existing future-dated rows cause no errors. A habit whose `start_date` is now in the future must read as "starts tomorrow" (checked in the plan against the habit views).
- The first-visit auto-detect (`TimezoneSync`, only over the `UTC` default) stays.

## Name and week start

- Name: 1 to 50 characters after trimming. Week starts on: Monday or Sunday (1 or 7). Both save through the same optimistic path; a changed week start refetches Progress and Home.

## Data (one additive migration)

- `profiles` adds: `avatar_kind text not null default 'google'` (`google` | `character` | `emoji` | `photo`), `avatar_value text` (character id, emoji, or storage path), `avatar_color text` (hex, characters and emoji only), `sound_id text not null default 'bell'` (a built-in id or a custom sound's uuid), `sound_volume real not null default 0.6` (0 to 1). Checks keep the kinds and volume in range. Existing rows read as the Google picture and the Bell at 60%.
- `custom_sounds`: `id`, `user_id` (default `auth.uid()`), `name`, `path`, `duration_ms`, `created_at`. Row-level security: own rows only. A trigger limits six per user. Deleting the user cascades.
- Storage: two **private** buckets, `avatars` and `sounds`, paths `{user_id}/...`, policies allow only the owner. Reads use short-lived signed URLs, cached in the profile query. Size and type are limited on the bucket as well as in the server action.
- The browser-only chime value (`cadence.chime` in local storage) is read once as a fallback and copied to the account on first sign-in after the update, then no longer used; `useChimeChoice` reads from the profile query.

## Server and app

- `src/server/profile.ts` (a pure mapping kept free of `server-only`, unit-tested): `getProfile()` returning name, avatar (with signed URL), timezone, week start, sound (with signed URL for a custom one), custom sounds, and the zone list. `GET /api/profile` (401 when signed out). Server actions: `updateName`, `updateWeekStart`, `updateTimezone`, `updateAvatar`, `uploadAvatarPhoto`, `updateSound`, `uploadSound`, `removeSound`. Each validates on the server (lengths, kinds, zone in list, colour hex, file type, size and the six-sound cap) and returns a typed result for the toast.
- The sound length (5 seconds) is measured in the browser (`decodeAudioData`) before upload; a longer file is refused there with an error toast, and the server stores `duration_ms` from that. Like a soundboard: pick a clip, hear it, keep it. shortcut: the server trusts the browser's duration; it checks only type, size and magic bytes. Upgrade if the length limit ever needs to be hard.
- Components: `ProfileHeader`, `ProfileTabs`, `GetTheApp`, `SettingRow`, `SettingModal` (shared frame: title, body, Cancel, Save), `AvatarModal`, `AvatarCharacter` (six SVGs), `SoundModal`, `TimezoneModal`, `NameModal`, `WeekStartModal`, and the Notifications toggles. All text in `locales/en/profile.json`; styles with `@apply`. Icons use `lucide-react`.
- Everything follows `docs/policies.md`.

## PRs

1. **Profile page:** layout and tabs, Overview (all rows and modals, including photo and sound uploads with their buckets), Get the app, Appearance moved with the redirect, Notifications, the migration, the data layer, avatar characters. The largest PR.
2. **Account tab:** delete account and export and import of all data. Its own spec (replace-or-merge on import is to be designed) before work starts.
3. **Cleanup and release:** the redrawn Alien and Mage, anything left from review, the version bump, the changelog entry and the roadmap update (this belongs in the feature's last PR).

If PR 1 is too big to review, the sound modal and its upload move to PR 3, and the Overview shows the six built-in sounds only.

## Edge cases

- Removing a custom sound that is the current one switches to Bell with a toast. Removing the current photo cannot happen: a photo is replaced, not removed.
- A failed upload leaves no row and no file (the file is removed if the row insert fails).
- A custom sound or photo that fails to load (offline, expired link) falls back to the Bell, or to the avatar's initials.
- A person who has never opened the profile sees no change: defaults match what they had.
- Offline: edits need a connection; the toast says so.
- Delete account (PR 2) removes both buckets' files for that user.

## Tests

- Unit: the pure profile mapping, validators (name, week start, zone in list, colour, sound file rules, the six cap), zone label formatting (underscores, region, search), the local chime fallback.
- Database (pgTAP): new columns' checks and defaults, `custom_sounds` row-level security and the six limit, storage policies.
- e2e: the `/appearance` redirect; tab navigation and cache-fast switching; editing name, week start and timezone (with the warning shown) and their toasts; the avatar modal (character, colour, emoji); a failed save restoring the row; the Get the app menu with the disabled Installer; the disabled notification toggles. Photo and sound uploads get a unit test and one e2e each.
- The old `appearance.spec.ts` moves to the new route.

## Decided defaults, open to change

- Photo cap 2 MB (size only, no pixel limit); sound cap 500 KB and 5 seconds, six custom sounds.
- Emoji set: a short fixed list plus a picker; the exact set is chosen in development.
- The Google picture is not offered again after the avatar is changed (no "switch back").
- Avatar and sound files are private, with signed URLs, since profiles are not shared with anyone.
