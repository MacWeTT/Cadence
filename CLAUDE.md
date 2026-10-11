# Cadence

Read `AGENTS.md` (this Next.js has breaking changes) and `docs/policies.md` (code policies, enforced by lint) before writing code. The counting rules are in `docs/rules.md`.

- Follow the policies in every new file: arrow `const` functions with block bodies, named handlers (no inline functions as props), absolute imports (`@/...`), properties destructured once instead of read repeatedly, `props` destructured inside components, one `useState` object, blank lines between logic blocks, state → queries → the rest, CSS classes with `@apply`, no raw user-facing text.
- Changes land by pull request into `develop`, never into `master` (releases only). Before raising one, run `npm run lint`, `npx tsc --noEmit` and the tests for what you changed; CI runs the full suite on the PR (format, lint, types, unit tests, build, database tests, Playwright), so do not repeat it locally unless the change is wide or risky.
- Write the failing test first. Unit tests live in `tests/unit/` (mirroring `src/`), never beside the code.
