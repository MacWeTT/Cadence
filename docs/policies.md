# Cadence code policies

These rules apply to every file in `src/` and `e2e/`, written by a person or an agent. Most are enforced by tooling (the **Enforced by** column); the rest are reviewed. The generated shadcn files in `src/components/ui/` and `src/lib/supabase/database.types.ts` are exempt.

Run everything with `npm run verify` before opening a PR.

## Style

| # | Rule | Enforced by |
|---|------|-------------|
| 1 | **No inline returns, everything scoped.** An arrow function has a block body with an explicit `return`, and every `if`/`else`/`for`/`while` has braces, even for one statement. | ESLint `arrow-body-style: always`, `curly: all` |
| 2 | **Components take `props` and destructure inside the body**, never in the parameter list. | ESLint `no-restricted-syntax` |
| 2b | **Props have a named type** declared above the component: `(props: EmojiProps)`, not an inline `{ ... }`. | ESLint `no-restricted-syntax` |
| 3 | **One `useState` holding an object** instead of many. One handler updates one field of it. | ESLint `cadence/max-use-state` (max 2) + review |
| 4 | **Blank lines separate blocks of logic**: after declarations, around `if`/`for`/`try`/blocks, before `return`. | ESLint `padding-line-between-statements` |
| 5 | **Order inside a component or hook:** state first, then queries (data hooks), then everything else (derived values, effects, handlers). | Review |
| 6 | **Functions are `const fn = params => { ... }`.** No `function` declarations. | ESLint `func-style: expression` |
| 7 | **Regular class names in JSX, styles in CSS files with `@apply`.** A `className` holds names, not a pile of utilities. Dynamic values (a habit's colour, a ring angle) stay in `style`. | ESLint `no-restricted-syntax` (more than 3 utility classes) |
| 8 | **Localise everything.** No raw user-facing text in components, helpers or actions; text lives in `messages/en.json` and is read with `next-intl`. | ESLint `react/jsx-no-literals` and `no-restricted-syntax` + types |

```tsx
// A component the way these rules want it.
import './check-row.css';

interface CheckRowProps {
  row: TodayRow;
  disabled: boolean;
  onToggle: () => void;
}

const CheckRow = (props: CheckRowProps) => {
  const { row, disabled, onToggle } = props;

  const [state, setState] = useState({ pending: false, error: null });

  const rowQuery = useHabitData();

  const handleChange = (field, value) => {
    setState(current => {
      return { ...current, [field]: value };
    });
  };

  return (
    <li className={cn('check-row', row.ticked && 'check-row--done')}>
      <button type="button" className="check-row__box" onClick={onToggle} disabled={disabled} />
    </li>
  );
};
```

```css
/* check-row.css */
@reference '../../globals.css';

.check-row {
  @apply flex items-center gap-4 border-b border-line px-3 py-3.5;
}

.check-row--done {
  @apply text-ink-muted;
}

.check-row__box {
  @apply size-7 shrink-0 rounded-full border-2;
}
```

### CSS naming
- One CSS file per component, next to it, imported by the component. Class names are BEM: `block`, `block__element`, `block--modifier`, prefixed by the component name so they cannot collide (`check-row`, `day-card__cell`).
- Start every CSS file with `@reference` to `globals.css` so `@apply` can use the theme tokens.

## Formatting
- Prettier formats everything (single quotes, 120 columns, trailing commas, LF line endings). `npm run format` fixes; `npm run format:check` is part of the gate.
- `.editorconfig` and `.gitattributes` keep line endings LF on every platform.

## Architecture
- `src/domain/` is plain TypeScript: no React, no Next, no database, no imports from the rest of the app. Every counting rule lives here (see `docs/rules.md`).
- `src/lib/*.ts` are shared helpers; they do not import `src/server` or `src/app`.
- Only the server layer (`src/server/`, `src/lib/supabase/`, server actions, the sign-in pieces, `src/proxy.ts`) talks to Supabase. Client code and pages never import it.
- Code that must not reach the browser starts with `import 'server-only'`.
- Files stay under 250 lines (blank lines and comments excluded). Split by responsibility when they grow.
- File names are kebab-case; components are PascalCase; one component per file.
- Enforced by ESLint `no-restricted-imports` and `max-lines`.

## Testing
- Write the failing test first; watch it fail; make it pass (TDD). A bug fix starts with a test that reproduces it.
- Rules and calculations are unit-tested next to the code (`*.test.ts`). Database rules have pgTAP tests in `supabase/tests`. User flows have Playwright tests in `e2e/`.
- Tests assert behaviour a user could see, not implementation details. A flaky test is fixed or deleted, never retried until green.

## Process
- Every change lands through a pull request into `develop`. Nothing is merged to `main` directly.
- A PR has **What**, **Verified** and **Not done** sections, and reports anything skipped or unchecked.
- Commit messages are short and imperative, prefixed `feat`, `fix`, `refactor`, `docs`, `test` or `chore`.
- Shortcuts with a known limit are marked in the code as `shortcut: <the limit>, <when to upgrade>`.

## The gate
`npm run verify` runs, in order: `format:check`, `lint`, `typecheck`, `test` (unit) and `build`. `npm run verify:full` adds the database tests and Playwright. CI runs the same on every pull request.
