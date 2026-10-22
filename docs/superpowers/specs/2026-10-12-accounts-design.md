# Accounts (1.0), design

Status: approved in conversation, written here for the record. Version: 1.0 (the first release, with Circles). It ships as a stack of PRs; the pause and resume timer shipped in 0.8.3 and was its own design.

## Purpose

Let people sign up and sign in without Google, give every account a **tag** (`@name`, the only word used for it: there is no separate "username") that Circles uses, and make a first Google or GitHub sign-in end with a tag and a password chosen by the person.

**No mail is sent at all.** No email confirmation, no verification codes, no forgot-password, no 2FA. A forgotten password is gone: the answer is to link Google or GitHub, so the account is never lost. Mail (reset by code, a mail service of our own) comes down the line, when there are enough users (see the roadmap, *Later*).

Out of scope: any mail, forgot password, any 2FA, unlinking a sign-in method, and everything about Circles (its own design).

## Tags

- Every account has a **tag**, shown as `@name` on the profile header, and changeable in the profile (a Tag row and a modal with an `@` prefix).
- **Default:** the GitHub username for a GitHub account; otherwise the part of the email before the `@` (`manasbajpai18@gmail.com` becomes `@manasbajpai18`). It is lowercased and stripped of anything not allowed, padded if it is too short, and made unique with a number if it is taken (`@name_2`).
- **Rules:** 3 to 30 characters, lowercase letters, digits and underscores; unique whatever the case; a short reserved list (`admin`, `cadence`, `support`, `help`, `me`, `root`, `system`, `staff`, `official`, `null`, `undefined`) cannot be taken. The database is the last word; the app checks the same rules first.
- **Privacy:** the default shows the first part of an email address, and tags are visible to friends in Circles. A person can change theirs; the profile does not hide the default.
- **Data:** `profiles.tag` (not null, unique on `lower(tag)`, checked by `valid_tag()`); `free_tag(base)` builds a free one; `handle_new_user` uses it for new accounts. Shipped in 0.8.3.

## First Google or GitHub sign-in: the register screen

- A new account made through Google (or GitHub) is not finished until the person **registers**. `profiles.registered_at` is empty for them, and the sign-in callback sends them to `/register` (keeping where they were going, see **Where to next**).
- **The form:** their **email**, filled in from the provider and **locked**; their **tag**, filled in with the default and editable (it is checked as the tag rules say, and a taken one is refused with "That tag is taken"); a **password** and a confirmation, at least 8 characters. **Save** sets the tag and the password, marks the account registered and goes on.
- A GitHub account whose email is hidden has no email to sign in with, so it has no password row: the form is the tag only.
- Visiting `/register` when already registered goes straight on. Skipping the screen (by typing a URL) is possible and is not a security matter: the account just has no password, and the profile says so (see **The profile**).
- **Existing accounts are not forced.** Everyone who has an account when this ships is marked registered by the migration. They are the people who signed in with Google and never chose a password; the profile tells them (below), nothing else does.
- `profiles.password_set` says whether the account has a password: set by the register screen, by sign-up and by the password modal; the migration sets it for accounts that already have an email identity.

## Email sign-up and signing in

- The login page offers Google, GitHub (later) and a form with two modes, **Sign in** and **Create an account**.
- **Create an account:** email, tag (filled in from the email, editable), password and confirmation. No confirmation mail: the account is made and signed in at once, and is registered at once (it chose all of it here, so it does not see the register screen). An email already used by a Google or GitHub account is refused with a message that points at that button.
- **Sign in:** a toggle between **Tag** and **Email**, and a password. That is all: there is no "forgot password".
- **Signing in by tag** needs the account's email, and an anonymous caller must never be able to read an email from a tag. So a database function `login_email(tag, password)` (security definer) checks the password against the account itself and returns the email only when it matches; the app then signs in with it. It has its own throttle (a short lockout after repeated failures for one tag), because it must not be a way round Supabase's own limits.
- **Risks, accepted for friends:** an email is not verified, so anyone can sign up with an address they do not own (how Supabase links such an account to a later Google or GitHub sign-in on that address must be tested before shipping); and a forgotten password cannot be reset.

## The profile

- **Password** row in the profile's Account tab: **Set** or **Change**, with a modal (new password and a confirmation, at least 8 characters, no current password asked).
- **Warnings are on the profile page only, nowhere else.** An account with no password shows a warning there: "No password is set on this account." An account with a password and no linked Google or GitHub shows one too: "Link Google or GitHub, so you cannot lose this account if you forget your password." No banner, no popup, no other page.
- **Sign-in methods** card at the top of the Account tab: Email and password, Google, GitHub, each "Linked" or a **Link** button (Supabase manual linking: `enable_manual_linking = true` locally, one toggle in the dashboard for production). No unlinking yet.
- Deleting an account must work for accounts with no email (GitHub can hide it): the typed confirmation falls back to the word "delete".

## Where to next

A Circles invite link, opened signed out, goes to sign-in and must come back. So a `next` path is kept through the login page, the Google callback and the register screen, and used at the end. It is accepted only as a path on the app itself (starts with one `/`, not `//`, no scheme), whatever else it holds is ignored and the person goes to Home.

## GitHub sign-in

A GitHub button next to Google (a GitHub OAuth app, free; `[auth.external.github]` in `config.toml`, the secret in `supabase/.env` locally and in the Supabase dashboard for production; the callback is the same `/auth/callback`).

## PRs and tasks

1. **Tags**: done (0.8.3).
2. **Register screen and the password**: `registered_at` and `password_set` with the backfill, the `/register` page and its action, the callback sending a new account there (with `next`), the profile's Password row, modal and warning, the e2e support for a registered test user, specs.
3. **Email sign-up and sign-in by tag or email**: `login_email` with its throttle and database tests, the login page's two modes and the create-account form, `config.toml` (confirmations off, minimum length 8), specs.
4. **Sign-in methods and linking**: manual linking, the Sign-in methods card, the second warning, the delete fallback.
5. **GitHub sign-in**: the button and config, with a note on creating the OAuth app.
6. **Circles** (its own six PRs, by their author) and **the 1.0 release**: version, changelog, roadmap, `docs/deploy.md` dashboard toggles.

## Tests

- Unit: the tag rules and schema, the register and password schemas, the sign-in methods mapping, the `next` check.
- Database (pgTAP): the tag check and defaults (done), the backfill of `registered_at` and `password_set`, `login_email` (right password returns the email; wrong password, unknown tag and a locked tag return nothing; the throttle).
- e2e: the register screen (locked email, a taken tag, a short password, a mismatch, going on to `next`), the profile warnings and the password modal, sign-up, signing in by tag and by email, a wrong password, linking.
