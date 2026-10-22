# Cadence

Read `AGENTS.md` (this Next.js has breaking changes) and `docs/policies.md` (code policies, enforced by lint) before writing code. The counting rules are in `docs/rules.md`.

- Follow the policies in every new file: arrow `const` functions with block bodies, named handlers (no inline functions as props), absolute imports (`@/...`), properties destructured once instead of read repeatedly, `props` destructured inside components, one `useState` object, blank lines between logic blocks, state → queries → the rest, CSS classes with `@apply`, no raw user-facing text.
- Changes land by pull request into `develop`, never into `master` (releases only). Before raising one, run `npm run lint`, `npx tsc --noEmit` and the tests for what you changed, **including the e2e specs and the database tests for what you touched** (the owner's Docker and dev server must be up; ask if they are not): a PR into `develop` only gets the quick checks in CI (format, lint, types, unit tests, build). The full suite (database tests and Playwright) runs on the release PR into `master` and on the deploy, so a break found there is harder to place.
- Write the failing test first. Unit tests live in `tests/unit/` (mirroring `src/`), never beside the code.

## How we work

- The owner mostly merges after CI passes and does not read the code, so tests carry the weight: every feature ships with unit tests, database tests where the schema changes, and e2e specs for what a person sees. Small bugs found later are filed as `known-issue` issues and fixed together in a bugfix release (`docs/deploy.md`).
- Start from the plan: `docs/roadmap.md` says what is next, `docs/superpowers/specs/` holds the design of each feature (the spec carries the task list; no separate plan file). Brainstorm only when there is no spec yet.
- One PR per feature (a stack only when it is too big to review). The version bump and the changelog entry go in the feature's last PR. A release is then one `develop` to `master` PR (merge commit), followed by the tag and a GitHub pre-release (`docs/deploy.md`). Update the roadmap once per release.
- Check lightly: write files once, run `eslint --fix` and `prettier --write` on what changed, run the relevant specs only; the release PR and the deploy run the whole suite. Look at the app once, on a production build, when the change is visual (the dev server can serve stale CSS). Keep command output short.
- The owner runs the dev server and Docker; do not start, stop or restart them. A production build on another port is fine if it is stopped afterwards.
- Never commit secrets or put them in chat; the changelog is public (features only, no internals).

