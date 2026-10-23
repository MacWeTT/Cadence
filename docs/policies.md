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
| 7a | **Class names never start with a Tailwind utility word** (`accent-`, `text-`, `bg-`, `border-`, `ring-`, ...). `cn()` merges Tailwind classes and would treat `accent-picker__color` and its modifier as two accent colours and keep one. Name the block after the component without such a prefix, or join with `clsx` where the name is fixed. | Review (e2e test for the accent picker) |
| 7b | **One folder per component**, named after it, holding the component and its own CSS file: `check-row/check-row.tsx` and `check-row/check-row.css`. Route files (`page.tsx`, `layout.tsx`, `actions.ts`) stay in their route folder with their own `page.css` or `layout.css`. | Review |
| 8 | **Localise everything.** No raw user-facing text in components, helpers or actions; text lives in `locales/<language>/<area>.json` and is read with `next-intl`. | ESLint `react/jsx-no-literals` and `no-restricted-syntax` + types |
| 9 | **No anonymous functions as props.** A handler passed to a component or element is a named `const` declared above the `return` (`onHabitClose`, `onNameChange`), never an inline `() => {...}`. Pass it by name. (Callbacks for `.map`, `.filter` and hooks stay inline.) | ESLint `no-restricted-syntax` |
| 10 | **Absolute imports.** Import with `@/...` (src), `@tests/...`, `@e2e/...` and `@locales/...`, never `./x` or `../x`. A component's own stylesheet (`import './x.css'`) is the one relative import. | ESLint `no-restricted-syntax` |
| 11 | **Read an object's properties once.** When the same object's properties are read two or more times, destructure it once (`const { week, streak } = row`). Checks like `result.ok`, `action.kind` that narrow a union, calls (`x.method()`), assignments, a ref's `.current` and optional chains (`a?.b`) are not counted. | ESLint `cadence/destructure-repeated-reads` |

```tsx
// check-row/check-row.tsx: a component the way these rules want it.
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
/* check-row/check-row.css */
@reference '../../../globals.css';

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
- One CSS file per component, in the component's own folder, imported by the component. Class names are BEM: `block`, `block__element`, `block--modifier`, prefixed by the component name so they cannot collide (`check-row`, `day-card__cell`).
- Start every CSS file with `@reference` to `globals.css` so `@apply` can use the theme tokens.
- Tailwind classes are written in their canonical (shortest) form, e.g. `size-(--logo-height)` not `size-[var(--logo-height)]`. `npm run lint` checks every `@apply` and class string with Tailwind itself (`scripts/check-tailwind-classes.mjs`).

## Localisation
- Messages live in `locales/en/*.json`, one file per area (`today.json`, `habits.json`, ...), merged in `locales/en/index.ts`. Keys are typed from those files: a missing key fails the typecheck.
- Components read text with `useTranslations('area')` (client components and non-async server components) or `await getTranslations('area')` (async server components and actions).
- Pure code (rules, helpers) never returns English. It returns a `Msg`: `msg('alert.doNow', { name })`, with another `Msg` allowed as a value (a time inside a sentence). The UI turns it into text with `useMsg()` or `getMsg()`. Tests read the words with `tr()` from `tests/support/translate.ts`.
- Server errors are codes (`new HabitError('habitNotFound')`), and validation messages are codes too; the server action translates them.
- Plurals use ICU (`{count, plural, one {# habit} other {# habits}}`), never `count === 1 ? ... : ...`.
- A new language is a new folder `locales/<lang>/` with the same files and index, plus a way to pick it in `src/i18n/request.ts`. Dates are formatted through `formatCalendarDate`, which is fixed to `en-GB` for now (a marked shortcut in `src/lib/format.ts`).

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

## The desktop app
The web app and the desktop app (`src-tauri/`, the SQLite file in `src/data/local/`) share the screens, so a change to what a person can do or see is made for both.
- **A new read or change** is a method on `DataSource` (`src/data/types.ts`), implemented by `remote.ts` and by the local code in `src/data/local/`; the typecheck fails until both exist. Screens call `dataSource`, never `fetch` or a Server Action (`tests/unit/data/desktop-boundary.test.ts` fails otherwise).
- **A rule** lives once in pure code (`src/domain`, `src/server/*-view.ts`, `src/server/page-data.ts`) where both sides run it. A rule kept only in a database function (a migration in `supabase/migrations/`) must also be written in `src/data/local/` with a unit test, or the PC drifts from the account.
- **A table or column** on a synced table is also a new entry in `src/data/local/migrations.ts` (never edit a released one); `tests/unit/data/local/schema-parity.test.ts` fails when the two disagree.
- **A new page** that needs the server (a route handler, Circles, anything signed-in-only) is set aside in `scripts/build-desktop.mjs`; `npm run build:desktop` runs in CI.
- Local code is tested against the in-memory SQLite (`tests/unit/data/local/memory-sql.ts`) and never imports server-only modules.

## Testing
- Write the failing test first; watch it fail; make it pass (TDD). A bug fix starts with a test that reproduces it.
- Rules and calculations are unit-tested in `tests/unit/`, which mirrors `src/` (`tests/unit/domain/dates.test.ts` tests `src/domain/dates.ts`); shared test helpers are in `tests/support/`. Test files never sit beside the code. Database rules have pgTAP tests in `supabase/tests`. User flows have Playwright tests in `e2e/`.
- Tests assert behaviour a user could see, not implementation details. A flaky test is fixed or deleted, never retried until green.

## Process
- Every change lands through a pull request into `develop`. Only a release (develop → master) goes to `master`.
- A PR has **What**, **Verified** and **Not done** sections, and reports anything skipped or unchecked.
- Commit messages are short and imperative, prefixed `feat`, `fix`, `refactor`, `docs`, `test` or `chore`.
- Shortcuts with a known limit are marked in the code as `shortcut: <the limit>, <when to upgrade>`.

## The gate
`npm run verify` runs, in order: `format:check`, `lint`, `typecheck`, `test` (unit) and `build`. `npm run verify:full` adds the database tests and Playwright. CI runs the same on every pull request.
