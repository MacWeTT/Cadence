# Circles, design

Status: proposed, for review. Proposal: issue #64. Scheduled "after 1.0" in `docs/roadmap.md`; this spec is written early so it is ready when Circles is next, and so the work before 1.0 can be built with it in mind.

## Purpose

A small, private group of close friends or classmates where people can see each other **showing up** on the habits they choose to share. The feeling is **company, not pressure**: a friend sees what you did, never what you missed, and nothing is shared until you share it. It is cooperative: no rankings, no leaderboards, no public profiles, no strangers.

Out of scope now: nudges (they need notifications, 0.9.5), comments or messages, discovery or search, public profiles and links, XP (it follows Circles), a shared streak across people (an open question below), live "focusing now" presence (a later option), and photo avatars shown to friends (a private bucket, see **Open questions**).

## What the person sees

- **Circles** (a new page, `/circles`, and a link in the top bar and the phone tab bar). A list of the person's circles and **New circle**. A circle has a name ("Study group", "Run club"), 2 to 8 people, and an owner (its creator).
- **Inviting.** The owner opens **Invite** and gets a link that works for up to the free seats and expires in 7 days; it can be renewed or turned off. Opening the link, signed in, shows the circle's name, who is in it, and **Join** or **No thanks**. Signed out, the link goes to sign-in and returns. A circle of two is simply a pair. Adding someone by their exact `@tag` (they still have to accept) is a possible later option; there is no search, so it is not discovery.
- **A circle's page.** One card per member: avatar, name and `@tag` (every account has a unique tag since 0.9), and **only what they chose to show you** (see below), most recent first. A tag is visible only to people in the same circle. A quiet line at the top: "This week, together: 34 check-ins". No names in that line, and no counts of who did not.
- **What I share** (on each circle, and in a habit's edit dialog under Links). A grid of **my habits down, circles across**. Each cell sets how much of that habit that circle sees:

| Level | A member sees |
|---|---|
| **Hidden** (the default) | Nothing about this habit |
| **Showed up** | That you did something this week, folded into one "showed up" mark, with no habit named |
| **Done today** | This habit, ticked or not yet, for your today |
| **Streaks** | The above, plus its current streak and this week's count |
| **Everything** | The above, plus its history (year heatmap) |

- **How it is shown:** per habit, the name, **emoji only**, or **"a habit"**. A habit that is *Showed up* or *Hidden* never has its name or emoji sent.
- **Per person:** in a circle, **Customise for…** lets me give one member more or less than the circle default for a habit ("hide this one from Sam"). The default circle level applies to everyone else.
- **Pause sharing** (one switch, in What I share and on the profile): while on, nobody sees anything; settings are kept.
- **Cheers.** A friend taps a heart on your card for the day; you see "3 cheers today" and who sent them. One cheer per person per day. Receiving cheers can be turned off, per circle.
- **Home:** a small card, only when a friend has shown up today: "Sam and Priya showed up today". It never lists who did not.
- **Leaving:** any member can leave a circle at once; the owner can remove a member and delete the circle. Leaving removes what I shared there and the cheers in it.

## Rules (pure domain, `src/domain/circles.ts`, tests first)

- **Levels are ordered:** `hidden < showed_up < done_today < streaks < everything`. `visibleFields(level)` gives the fields a level allows; nothing above the level is ever read or sent.
- **A miss is never a fact that is shared.** There is no "missed" in any output: a habit at *Done today* shows `done` or `not yet`, and a day that has ended without a tick shows nothing. This is a rule of the data (the function returns no such field), not of the screen.
- **"Today" is the owner's today**, in their timezone, so a friend in another timezone sees the day as the owner lives it.
- **Showed up:** a member "showed up" on a day when they have a tick on any habit they share at *Showed up* or higher in that circle. The week's mark is the OR of its days.
- **Circle week** (shown at the top of a circle): the sum of ticks, in the current week, of the habits each member shares at *Done today* or higher. It is one number for the circle. It never shows per-person values, ranks, or a denominator. A member can opt out of counting in it.
- **Streaks and heatmaps** use the existing rules in `docs/rules.md` and the same domain functions (`currentStreak`, `longestStreak`, the heatmap's expected-days function) over the habit data the function returns, so a friend's number can never disagree with the owner's.
- **Limits:** 8 members per circle; 10 circles per person; 7-day invites; one cheer per sender per recipient per day. The limits live in one place (`CIRCLE_LIMITS`), used by the checks, the database and the screens.

## Data (additive migrations, the next after `20261012200000`)

All tables have row-level security enabled. **Friends never get select access to `habits`, `habit_completions`, `habit_schedules` or `profiles`.** They read other people's data only through the functions below. **Every change to a Circles table goes through a function**: the new tables have no insert, update or delete policy for `authenticated` (denied by default), only a `select` policy for the rows a person owns or belongs to, so a person cannot, for example, edit their own membership row to join a circle without an invite. `circle_members`, `circle_invites`, `cheers` and the share tables are written only by functions.

- `circles`: `id`, `name`, `owner_id` (references `auth.users`, cascade), `created_at`.
- `circle_members`: `circle_id`, `user_id` (cascade), `joined_at`, `in_week bool default true`, `allow_cheers bool default true`. Primary key `(circle_id, user_id)`; a trigger enforces 8 members; a person sees only circles they belong to.
- `circle_invites`: `circle_id`, `token` (unguessable, hashed at rest), `expires_at`, `revoked`.
- `habit_shares`: `habit_id` (cascade), `circle_id` (cascade), `level` (`showed_up` | `done_today` | `streaks` | `everything`), `label` (`name` | `emoji` | `generic`). Primary key `(habit_id, circle_id)`. **Absence of a row means Hidden**, so `hidden` is never stored here.
- `habit_share_overrides`: `habit_id`, `circle_id`, `viewer_id`, `level` (all five values, including `hidden`, so a habit can be hidden from one person), `label` (default `generic`): a per-person level that wins over the circle's. Removing the row means "use the circle's".
- `cheers`: `circle_id`, `from_user`, `to_user`, `for_date`, `created_at`; unique `(circle_id, from_user, to_user, for_date)`; both are members.
- `profiles.circles_paused bool not null default false`.

**Functions** (`security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`: the same shape as `delete_my_account`):

- `circle_overview(p_circle)`: for each member, their display name, `@tag` and avatar fields (kind `google`, `character` or `emoji`; a `photo` avatar comes back as `initial` for now), whether they **showed up this week**, and, per habit they share with the caller at a level above Hidden: the label per its label mode, the level, and **only the data that level allows**: *Done today* returns a boolean computed from the owner's today (in SQL). The caller's own entry carries the cheers they received today and who sent them; every other entry says whether the caller already cheered today. Nothing is returned when the member has paused sharing, or when the caller is not a member. Habit ids are never returned. **For habits shared at *Streaks* or *Everything* it also returns `data`: the habit's start date, its schedule rows, its archive pauses and its tick dates, which is exactly what the domain's streak and heatmap functions take. The app computes the streak from that and shows only what the level allows.** Members also carry `week_starts_on`, so the domain can use their week.
- `create_circle`, `create_invite`, `join_circle(token)`, `leave_circle`, `remove_member`, `set_share`, `set_share_override`, `send_cheer`: each checks `auth.uid()`, membership and ownership, and does one thing.

**Account data.** Deleting an account cascades through every table above (they reference `auth.users`, or a habit or circle that does). **Importing a backup replaces all habits with new ones, so every `habit_shares` row would be removed**: the Account tab's import warning needs one more line when the person is in a circle ("What you share in your circles resets"). Circle memberships, shares and cheers are not part of an export: they involve other people and are not "your data" alone. `delete_my_account` needs no change; `replace_my_data` needs none, because the cascade does the work.

## Server and app

- `src/domain/circles.ts`: levels, `visibleFields`, `circleWeek`, `labelFor`, `CIRCLE_LIMITS`; pure, with tests.
- `src/server/circles.ts` (+ a pure mapping, free of `server-only`): calls the functions, runs the domain over what comes back, returns view objects. `GET /api/circles` (list), `GET /api/circles/[id]` (overview), and server actions for the mutations (the app's mutation path), with optimistic updates where it helps (cheers, share levels).
- Browser cache: `circles` and `circle` queries, refetched on tab focus so a friend's day appears without a reload; a tick invalidates what a circle shows of me.
- Components, one folder each: `CirclesList`, `CircleCard`, `MemberCard`, `ShareGrid`, `LevelPicker`, `InviteSheet`, `CheerButton`, `CircleWeek`, `HomeCirclesCard`. All text in `locales/en/circles.json`. Modals follow the profile page's pattern (every edit is a modal with an optimistic save and a toast); handlers are named, per policy 9.
- Responsive from the start (320 px): the share grid becomes a list per habit on a phone; 44 px targets.
- Accessibility: levels are a radio group with text, not colour; cheers are buttons with a count announced politely.

## PRs (one per slice; version bump and changelog in the last)

1. **Database:** the tables, constraints, policies and functions, with pgTAP tests, and the cascade checks. No UI.
2. **Domain and server:** `circles.ts`, the mapping, the endpoints and actions, with unit tests.
3. **Circles and invites:** the list, create, invite, join, leave and remove.
4. **What I share:** the grid, the habit dialog's section, per-person overrides, pause.
5. **A friend's card and cheers.**
6. **Circle week, the Home card, the import-warning line, version and changelog.**

## Tasks (PR 1; tests first)

1. `supabase/tests/circles.test.sql`: a three-person matrix (owner, member, outsider) proving each read and write rule below, written before the migration.
2. The migration: tables, the 8-member and 10-circle triggers, policies, the functions, and the `profiles` column.
3. Regenerate `src/lib/supabase/database.types.ts`.

## Edge cases

- **A habit archived or deleted:** deleting removes its shares (cascade); archiving keeps the share but the function returns nothing for an archived habit (a pause is not a miss).
- **A member's timezone or week start changes:** the next read uses the new one; nothing is stored in it.
- **The owner leaves:** the circle passes to the member who joined next; a circle with one person is deleted.
- **A token reused after it expires, or after the circle is full or the person is already in:** a clear message, no change.
- **A friend removed after cheering:** their cheers go with them.
- **Email, password and GitHub accounts (0.9):** nothing here depends on Google; a person is a user id with a name. A person with no display name shows as their `@tag`.
- **Offline:** shares and cheers need a connection; a failed save rolls back and says so, as habit edits do.

## Tests

- **Database (pgTAP):** the matrix above: an outsider reads nothing; a member sees exactly the permitted fields at each level and no more; Hidden returns nothing; an override beats the circle level; pausing returns nothing and keeps settings; leaving removes shares; removing a member; the 8-member and 10-circle limits; invite expiry, revoke and reuse; one cheer per day; cascade on habit delete, circle delete and account delete; no direct select on someone else's `habits`, `habit_completions`, `habit_schedules` or `profiles`; the functions are not executable by `anon`.
- **Unit:** levels and `visibleFields`; the label modes; "showed up"; the circle week sum; that a streak or heatmap from the shared data equals the owner's own; the limits.
- **e2e:** two users (a second e2e user helper): create and join through the link; share a habit at each level and see exactly that on the other side; customise for one person; cheer; pause; leave; phone layout without sideways scroll.

## Decided defaults, open to change

**Streaks and Everything return the tick dates (option A).** The friend's app computes the streak and the heatmap with the existing domain functions, so a friend's number can never disagree with the owner's, and there is only one copy of the rules. The honest consequence: the API returns the same data at *Streaks* and at *Everything*, so a determined friend who calls it directly could read the tick dates of a habit shared at *Streaks*. The levels decide what the app shows; for a habit where even the dates should stay private, share it at *Done today*. Nothing below *Streaks* ever carries dates. The two alternatives (a snapshot the owner's app writes, or the rules mirrored in SQL) were set aside because the first can go stale after midnight and the second means two copies of the rules.

Friends and classmates only; circles of 2 to 8; the five levels; Hidden by default; cheers only; no nudges until notifications; "today" is the owner's; the circle week is a single sum with no names; photos shown as initials to friends for now.

## Open questions

- **Top bar and tab bar:** a fifth item may crowd the phone tab bar; the alternative is a link in the profile and the account menu until it earns a place.
- **Photo avatars:** the `avatars` bucket is private to its owner. Friends could see them through short-lived signed URLs issued by a function that checks the circle; worth doing, but not in v1.
- **A shared streak across a circle** ("don't break the chain together") is not in v1: it creates exactly the pressure this feature avoids, unless it is opt-in per habit and only ever shown as a number, never a break.
- **A class link:** classmates may want one link for 30 people. The limit of 8 keeps this a friends feature; a bigger "class" is a different product and is left out on purpose.
- **Per-person overrides in v1 or v1.1?** They are in the data model from the start; the screen could ship a slice later.
