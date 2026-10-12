# Accounts (0.9), design

Status: approved in conversation, written here for the record. Version: 0.9. It ships as a stack of PRs; the pause and resume timer is its own design.

## Purpose

Let people sign up and sign in without Google, keep a way back in without a mail service, and give every account a **tag** (`@name`) that Circles will use later. No mail is sent in 0.9: the paid or hosted mail service is deferred until there are enough users to justify it (see the roadmap, *Later*). So there is no email verification, no password reset and no 2FA yet.

Out of scope: the mail system, verification codes, password reset, 2FA, unlinking a sign-in method, and everything about Circles.

## Tags

- Every account has a **tag**, shown as `@name` on the profile header, and changeable in the profile (a Tag row and a modal with an `@` prefix).
- **Default:** the GitHub username for a GitHub account; otherwise the part of the email before the `@` (`manasbajpai18@gmail.com` becomes `@manasbajpai18`). It is lowercased and stripped of anything not allowed, padded if it is too short, and made unique with a number if it is taken (`@name_2`).
- **Rules:** 3 to 30 characters, lowercase letters, digits and underscores; unique whatever the case; a short reserved list (`admin`, `cadence`, `support`, `help`, `me`, `root`, `system`, `staff`, `official`, `null`, `undefined`) cannot be taken. The database is the last word; the app checks the same rules first.
- **Privacy:** the default shows the first part of an email address, and tags will be visible to friends in Circles. A person can change theirs; the profile does not hide the default.
- **Data:** `profiles.tag` (not null, unique on `lower(tag)`, checked by `valid_tag()`); `free_tag(base)` builds a free one; `handle_new_user` uses it for new accounts; one migration gives every existing account a tag. The profile endpoint returns it; the optimistic save and toast pattern is the one the other profile settings use ("That tag is taken" on a clash).

## Email and password

- The login page offers Google, GitHub and an email and password form that switches between **Sign in** and **Create an account** (name, email, password of at least 8 characters). Email confirmation is off (`enable_confirmations = false` in `config.toml`, and "Confirm email" off in the Supabase dashboard for production), so no mail is sent.
- Under the form, one funny line: "Remember your password. We haven't taught Cadence to send emails yet. (Yet!)".
- An email already used by a Google or GitHub account is refused with a message that points at that button.
- A new account's name comes from the form; there is no picture, so the avatar shows an initial until one is chosen.
- Risks accepted for now: anyone can sign up with an address they do not own (how Supabase links such an account to a later Google or GitHub sign-in on that address must be tested before shipping), and a forgotten password cannot be reset by mail.

## The way back in: linking, the banner, change password

- **Sign-in methods** card at the top of the Account tab: Email and password, Google, GitHub, each "Linked" or a **Link** button (Supabase manual linking: `enable_manual_linking = true` locally, one toggle in the dashboard for production). No unlinking yet.
- A **banner** at the top of the app for an account with an email and password and no linked Google or GitHub: "Link Google or GitHub so you can get back in if you forget your password", with a button to that card. Persistent: no dismiss button, and it disappears once one is linked. The profile endpoint reports the account's sign-in methods.
- **Change password** card (email accounts) with a modal: new password and a confirmation, at least 8 characters, **no current password asked**, so someone who got in through a linked account after forgetting it can set a new one (an unattended signed-in session could change it; accepted for this stopgap).
- The shared e2e account is an email account, so the banner would show on every page; the e2e setup marks it dismissed in its saved browser state, and only the banner's own spec removes that.
- Deleting an account must work for accounts with no email (GitHub can hide it): the typed confirmation falls back to the word "delete".
- This whole flow is a stopgap, to be revised once the mail system exists.

## GitHub sign-in

A GitHub button next to Google (a GitHub OAuth app, free; `[auth.external.github]` in `config.toml`, the secret in `supabase/.env` locally and in the Supabase dashboard for production; the callback is the same `/auth/callback`).

## PRs and tasks

1. **Tags** (this PR): the migration and its tests, the pure rules (`src/lib/tag.ts`) and schema, the server action, the Tag row and modal, the `@tag` in the profile header, the e2e support reset, specs.
2. **Email sign-up and the way back in**: `config.toml` (confirmations off, manual linking on), the login form and the funny line, the Sign-in methods card with linking, the banner, change password, the delete confirmation fallback, the e2e dismissal, specs.
3. **GitHub sign-in**: the button and config, with a note on creating the OAuth app.
4. **Pause and resume**: its own design.
5. **The 0.9 release**: version, changelog, roadmap.

## Tests

- Unit: the tag rules and schema, the sign-in methods mapping, password schema, the banner's condition.
- Database (pgTAP): the tag check, uniqueness without regard to case, the reserved words, default tags (email, GitHub username, clashes, short and odd emails), and the backfill.
- e2e: the tag row and its toast, a taken tag, the header; later, sign-up and sign-in with an email, the banner and its absence, change password.
