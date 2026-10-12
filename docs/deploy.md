# Deploying Cadence

Every merge into `master` (a release) is deployed; merges into `develop` are not. The workflow in `.github/workflows/deploy.yml` runs these steps in order, and stops at the first one that fails:

1. **CI**: format, lint, types, unit tests, build, then the database tests and Playwright (the same jobs as a pull request).
2. **Migrate**: `supabase db push` applies any new files from `supabase/migrations/` to the hosted database (a dry run is printed first).
3. **Deploy**: `vercel deploy --prod` builds the app on Vercel and publishes it.
4. **Check**: the login page must answer (needs `APP_URL`).

Nothing runs until the repository variable `DEPLOY_ENABLED` is `true`, so the workflow is safe to merge before the accounts below exist.

## One-time setup

You do these once. Nothing here can be done from the repository.

**1. Hosted Supabase** (supabase.com, a new project)
- Note the **project ref** (the part of the project URL before `.supabase.co`) and the **database password** you chose.
- Create an **access token** (Account → Access Tokens).
- Authentication → URL Configuration: set the **Site URL** to your app's address and add `<address>/auth/callback` to the redirect URLs.
- Authentication → Providers → Google: turn it on with your Google client ID and secret.

**2. Google Cloud Console**
- In the OAuth client, add Supabase's callback (`https://<project-ref>.supabase.co/auth/v1/callback`) to the authorised redirect URIs.
- Reset the client secret you pasted into chat earlier and use the new one in the step above.

**3. Vercel** (vercel.com, import this GitHub repository)
- Framework: Next.js. Production branch: `master` (Settings → Git).
- Turn **off** the automatic Git deployments (Settings → Git → "Ignored Build Step" set to `exit 0`, or disconnect the Git integration after importing). The GitHub workflow deploys, so the migrations always go first.
- Environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL` (the project's API URL) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (its publishable key). Do not add the service role key.
- Create a **token** (Account Settings → Tokens). Note the **Org ID** and **Project ID** (Project Settings, or `.vercel/project.json` after `npx vercel link`).

**4. GitHub** (Settings → Secrets and variables → Actions)
- Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`.
- Variables: `SUPABASE_PROJECT_REF`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `APP_URL` (the production address, for the check), and finally `DEPLOY_ENABLED` = `true`.
- Optional: Settings → Environments → `production` → add yourself as a required reviewer if you want to approve each migration and deploy.

## Day to day

- Features and fixes go by PR into `develop` (protected: a PR with passing checks, no force-push). Nothing deploys. To release, see below; merging the release into `master` starts the **Deploy** workflow; watch it under the Actions tab. A failed CI or migration step stops everything before the app changes.
- A new database change is a new file in `supabase/migrations/` (never edit a file that has been merged). Migrations only go forwards, so write them to be safe for the **previous** version of the app too: add a column before the app uses it, and remove a column only after the app stopped using it.
- To go back after a bad deploy, use Vercel's "Instant Rollback" (Deployments → the previous one → Promote). The database is not rolled back; fix it with a new migration.
- To redeploy without a code change, run the **Deploy** workflow by hand (Actions → Deploy → Run workflow).

## Releases and going back

Two long-lived branches, both protected (changes only by PR with the CI checks passing; no force-push, no deletion): `develop` is where work lands, `master` is what is live. A version is a **tag** on a `master` commit, with a GitHub pre-release (until 1.0).

- To cut a release: open a PR into `develop` that bumps `version` in `package.json` (and the lockfile) and adds a heading for it in `CHANGELOG.md` (`## 0.4.0 (2026-10-11)`) with the features it added, removing those lines from *Planned*. Merge it. Then open a PR from `develop` into `master` and merge it with a **merge commit** (not squash, so the two branches stay in step). That starts the **Deploy** workflow. When it is green, tag the merge commit and publish a release: `git tag -a v0.4.0 <master-merge-sha> -m "..." && git push origin v0.4.0`, then `gh release create v0.4.0 --prerelease`. The changelog is public (the What's new page): features only, nothing internal or sensitive, and no version numbers on *Planned* items.
- A fix that cannot wait for the next release (data loss, security) goes the same way: PR into `develop`, then a patch release into `master`.
- To go back to a release in a hurry, use Instant Rollback (above). To go back in the code, open a PR into `develop` that reverts the bad merge: `git revert -m 1 <merge-sha>`, and release it. Compare with the last tag to see what changed: `git diff v0.4.0..develop`.

## Sign-in mail (Gmail SMTP)

Sign-up confirmation and password reset are 6-digit codes sent by Supabase Auth. Supabase's own mailer reaches only team addresses (about 2 an hour), so production sends through a dedicated Gmail account, which costs nothing and needs no domain.

- Make a Gmail account only for this, turn on 2-step verification, and create an **app password**. Put it in the Supabase dashboard (Authentication, SMTP settings) and nowhere else: never in the repo or in chat.
- In the dashboard also: "Confirm email" on, manual linking on, and edit the confirmation and recovery email templates to show `{{ .Token }}` (the code) instead of a link.
- Limits: about 500 mails a day, and Google may throttle or flag automated mail. Before inviting anyone, sign up, confirm and reset a password with an address outside the team, and check the spam folder. If Gmail proves unreliable, the fallback is a domain and Resend.
- Locally nothing changes: the codes appear in Supabase's mail catcher (Inbucket, port 54324).

## Contact form

The contact page saves every message in the `contact_messages` table (Supabase dashboard: Table Editor; only the dashboard and the service key can read it, the app and the sender cannot) and emails it to you with [Resend](https://resend.com). The email is optional: without the three variables below the message is still saved.

- `RESEND_API_KEY`: an API key from Resend. `CONTACT_TO_EMAIL`: where messages go. `CONTACT_FROM_EMAIL`: the sender, such as `Cadence <hello@your-domain>` (verify the domain in Resend), or `Cadence <onboarding@resend.dev>` for a test when the destination is your own Resend email.
- Put them in `.env.local` and in Vercel (Project settings, Environment Variables, Production). Never commit them or paste them in chat.
- An anonymous message is stored with no name, email or account, and the email says it is anonymous.

## Known issues and bugfix releases

Bugs are not fixed one by one. When we hit one, it becomes a GitHub issue with the **known-issue** label (the `Known issue` template). If people using Cadence can run into it, add a plain line to **Known issues** in `CHANGELOG.md` (it shows on the What's new page; features-style wording, nothing internal). Later a **bugfix release** (a patch version, such as 0.4.1) fixes everything with the label: each fix is a PR that says `Fixes #n`, the release removes the matching lines from Known issues, lists the fixes under its version, and closes the issues. Exceptions that are fixed at once: anything that loses or exposes data, and security problems.

## What is not verified

This pipeline has never run, because it needs the accounts above. The first run may need a small adjustment (for example a Supabase CLI flag). Check the **Migrate** step's dry-run output on the first deploy before trusting it.
