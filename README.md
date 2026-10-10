# Cadence

A personal habit tracker: daily and N-per-week habits, streaks that survive pauses, a year heatmap, and a home page that nudges you as the day runs out. Built with Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres and Google sign-in).

## Run it

```bash
npm install
npm run db:start      # local Supabase (needs Docker)
npm run dev           # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in the values from `npx supabase status`. Google sign-in needs a Google OAuth client in `supabase/.env` (git-ignored).

## Check it

| Command | What it does |
|---------|--------------|
| `npm run verify` | format check, lint, typecheck, unit tests and a production build |
| `npm run verify:full` | the above plus the database tests and Playwright |
| `npm run format` | fix formatting |

## Read next

- [`docs/policies.md`](docs/policies.md): the code policies (enforced by lint and CI)
- [`docs/deploy.md`](docs/deploy.md): how every merge into `develop` is migrated and deployed (and the one-time setup)
- [`docs/rules.md`](docs/rules.md): how streaks, rates and the Home banner are counted
- [`docs/superpowers/specs/`](docs/superpowers/specs/): the design of each milestone
- [`AGENTS.md`](AGENTS.md): notes for coding agents (this Next.js version has breaking changes)
