# Deploying Cadence

Every merge into `develop` is deployed. The workflow in `.github/workflows/deploy.yml` runs these steps in order, and stops at the first one that fails:

1. **CI**: format, lint, types, unit tests, build, then the database tests and Playwright (the same jobs as a pull request).
2. **Migrate**: `supabase db push` applies any new files from `supabase/migrations/` to the hosted database (a dry run is printed first).
3. **Deploy**: `vercel deploy --prod` builds the app on Vercel and publishes it.
4. **Check**: the login page must answer (needs `APP_URL`).

Nothing runs until the repository variable `DEPLOY_ENABLED` is `true`, so the workflow is safe to merge before the accounts below exist. `main` is not used.

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
- Framework: Next.js. Production branch: `develop` (Settings → Git).
- Turn **off** the automatic Git deployments (Settings → Git → "Ignored Build Step" set to `exit 0`, or disconnect the Git integration after importing). The GitHub workflow deploys, so the migrations always go first.
- Environment variables (Production): `NEXT_PUBLIC_SUPABASE_URL` (the project's API URL) and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (its publishable key). Do not add the service role key.
- Create a **token** (Account Settings → Tokens). Note the **Org ID** and **Project ID** (Project Settings, or `.vercel/project.json` after `npx vercel link`).

**4. GitHub** (Settings → Secrets and variables → Actions)
- Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`.
- Variables: `SUPABASE_PROJECT_REF`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `APP_URL` (the production address, for the check), and finally `DEPLOY_ENABLED` = `true`.
- Optional: Settings → Environments → `production` → add yourself as a required reviewer if you want to approve each migration and deploy.

## Day to day

- Merge a PR into `develop`. The **Deploy** workflow starts; watch it under the Actions tab. A failed CI or migration step stops everything before the app changes.
- A new database change is a new file in `supabase/migrations/` (never edit a file that has been merged). Migrations only go forwards, so write them to be safe for the **previous** version of the app too: add a column before the app uses it, and remove a column only after the app stopped using it.
- To go back after a bad deploy, use Vercel's "Instant Rollback" (Deployments → the previous one → Promote). The database is not rolled back; fix it with a new migration.
- To redeploy without a code change, run the **Deploy** workflow by hand (Actions → Deploy → Run workflow).

## What is not verified

This pipeline has never run, because it needs the accounts above. The first run may need a small adjustment (for example a Supabase CLI flag). Check the **Migrate** step's dry-run output on the first deploy before trusting it.
