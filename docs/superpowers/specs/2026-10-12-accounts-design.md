# Accounts (0.9), design

Status: approved in conversation, written here for the record. Version: 0.9. It ships as a stack of PRs; the pause and resume timer is its own design.

## Purpose

Let people sign up and sign in without Google, with a confirmed email and a way back in by code, and give every account a **tag** (`@name`) that Circles will use later. The mail is Supabase Auth's default mailer: free, and enough for 0.9. A mail service of our own (Resend) and custom SMTP come later, with the notification mail (see the roadmap, *Later*).

Out of scope: custom SMTP and email templates of our own, notification mail, push notifications by mail, authenticator-app 2FA, unlinking a sign-in method, and everything about Circles.

## Tags

- Every account has a **tag**, shown as `@name` on the profile header, and changeable in the profile (a Tag row and a modal with an `@` prefix).
- **Default:** the GitHub username for a GitHub account; otherwise the part of the email before the `@` (`manasbajpai18@gmail.com` becomes `@manasbajpai18`). It is lowercased and stripped of anything not allowed, padded if it is too short, and made unique with a number if it is taken (`@name_2`).
- **Rules:** 3 to 30 characters, lowercase letters, digits and underscores; unique whatever the case; a short reserved list (`admin`, `cadence`, `support`, `help`, `me`, `root`, `system`, `staff`, `official`, `null`, `undefined`) cannot be taken. The database is the last word; the app checks the same rules first.
- **Privacy:** the default shows the first part of an email address, and tags will be visible to friends in Circles. A person can change theirs; the profile does not hide the default.
- **Data:** `profiles.tag` (not null, unique on `lower(tag)`, checked by `valid_tag()`); `free_tag(base)` builds a free one; `handle_new_user` uses it for new accounts; one migration gives every existing account a tag. The profile endpoint returns it; the optimistic save and toast pattern is the one the other profile settings use ("That tag is taken" on a clash).

## Email and password, with a code

- The login page offers Google, GitHub and an email and password form that switches between **Sign in** and **Create an account** (name, email, password of at least 8 characters).
- **Sign-up is confirmed by a 6-digit code** Supabase Auth sends to the address (`enable_confirmations = true`, and "Confirm email" on in the dashboard). The account exists only after the code is entered; an unconfirmed address cannot sign in.
- **Forgot password** on the login form: enter the email, get a 6-digit code, enter it with a new password. It always answers the same ("if that address has an account, a code is on its way") so it does not reveal who has one.
- The mail is Supabase's **default mailer** for now: free, but limited to a few emails an hour and only reliable for a small number of people. Custom SMTP (Resend) comes later with the notification mail, and the email templates (they must show the code, `{{ .Token }}`) are set then; until then the dashboard template is edited by hand. Locally the codes appear in Supabase's mail catcher (Inbucket, port 54324), which the e2e specs read.
- An email already used by a Google or GitHub account is refused with a message that points at that button.
- A new account's name comes from the form; there is no picture, so the avatar shows an initial until one is chosen.

## Sign-in methods, change password, delete

- **Sign-in methods** card at the top of the Account tab: Email and password, Google, GitHub, each "Linked" or a **Link** button (Supabase manual linking: `enable_manual_linking = true` locally, one toggle in the dashboard for production). No unlinking yet. No banner: a forgotten password is now reset by code.
- **Change password** card (email accounts) with a modal: new password and a confirmation, at least 8 characters.
- Deleting an account must work for accounts with no email (GitHub can hide it): the typed confirmation falls back to the word "delete".

## Optional sign-in code (2FA)

Off by default; a switch in the Account tab. When on, signing in with a password is followed by a 6-digit code mailed to the account. Google and GitHub sign-ins are not asked (those providers have their own 2FA). The code step is enforced by the app, not by Supabase: a person who has the password and calls Supabase directly can skip it, so this is a deterrent against a casual guess, not a hard guarantee. A hard guarantee needs authenticator-app (TOTP) factors, which Supabase supports; that is a later option. The extra mail counts against the default mailer's limit.

## GitHub sign-in

A GitHub button next to Google (a GitHub OAuth app, free; `[auth.external.github]` in `config.toml`, the secret in `supabase/.env` locally and in the Supabase dashboard for production; the callback is the same `/auth/callback`).

## PRs and tasks

1. **Tags** (this PR): the migration and its tests, the pure rules (`src/lib/tag.ts`) and schema, the server action, the Tag row and modal, the `@tag` in the profile header, the e2e support reset, specs.
2. **Email sign-up and forgot password**: `config.toml` (confirmations on, minimum length 8), the login form with its code step, forgot password, specs reading the code from the local mail catcher.
3. **Sign-in methods and password**: manual linking, the Sign-in methods card, change password, the delete confirmation fallback.
4. **Optional sign-in code (2FA)**: the switch, the code step after a password sign-in, specs.
5. **GitHub sign-in**: the button and config, with a note on creating the OAuth app.
6. **Pause and resume**: its own design.
7. **The 0.9 release**: version, changelog, roadmap, the dashboard toggles in `docs/deploy.md`.

## Tests

- Unit: the tag rules and schema, the sign-in methods mapping, password and code schemas.
- Database (pgTAP): the tag check, uniqueness without regard to case, the reserved words, default tags (email, GitHub username, clashes, short and odd emails), and the backfill.
- e2e: the tag row and its toast, a taken tag, the header; later, sign-up with a code, sign-in, wrong password, forgot password, linking, change password, the sign-in code switch.
