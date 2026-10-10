# Cadence

Read `AGENTS.md` (this Next.js has breaking changes) and `docs/policies.md` (code policies, enforced by lint) before writing code. The counting rules are in `docs/rules.md`.

- Follow the policies in every new file: arrow `const` functions with block bodies, `props` destructured inside components, one `useState` object, blank lines between logic blocks, state → queries → the rest, CSS classes with `@apply`, no raw user-facing text.
- Changes land by pull request into `develop`, never into `main`. Run `npm run verify` first.
- Write the failing test first.
