<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Raising a pull request

Whoever raises a PR through an agent is its assignee, and the PR gets the label for what it is:

- Assign the person the agent works for: `gh pr create --assignee @me` (or `gh pr edit <n> --add-assignee @me`).
- Add one label with `--label`, by the PR title's prefix: `feat` is `enhancement`, `fix` is `bug`, `docs` is `documentation`, `release` is `release`, `ci` is `ci`, `test` is `tests`, `chore` or a refactor is `chore`. `known-issue` is for issues, not PRs.
- Check an existing PR with `gh pr view <n> --json labels,assignees`, and add what is missing.
