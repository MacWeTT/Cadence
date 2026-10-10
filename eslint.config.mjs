import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import policies from './eslint-rules/index.mjs';

// Rules that the existing code does not meet yet are warnings; the refactor (milestone 6.2b) turns them into errors.
const STYLE = 'warn';

const vendorFiles = ['src/components/ui/**', 'src/lib/supabase/database.types.ts'];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'test-results/**']),

  {
    name: 'cadence/code-style',
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    ignores: vendorFiles,
    plugins: { cadence: policies },
    rules: {
      // 1 and 6: arrow functions with a block body and an explicit return, assigned to a const.
      'arrow-body-style': [STYLE, 'always'],
      'func-style': [STYLE, 'expression'],
      'prefer-arrow-callback': STYLE,

      // 4: blank lines separate blocks of logic.
      'padding-line-between-statements': [
        STYLE,
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'do', 'switch', 'try', 'throw', 'block-like'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'do', 'switch', 'try', 'block-like'], next: '*' },
        { blankLine: 'always', prev: 'directive', next: '*' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],

      // 3: one useState per component, holding an object.
      'cadence/max-use-state': [STYLE, { max: 2 }],

      'no-restricted-syntax': [
        STYLE,
        {
          // 2: components take `props` and destructure inside the body.
          selector: 'VariableDeclarator[id.name=/^[A-Z]/] > ArrowFunctionExpression > ObjectPattern.params',
          message: 'Take `props` as the parameter and destructure it in the body.',
        },
        {
          selector: 'FunctionDeclaration[id.name=/^[A-Z]/] > ObjectPattern.params',
          message: 'Take `props` as the parameter and destructure it in the body.',
        },
        {
          // 7: styles live in CSS files (with @apply); a className holds names, not a pile of utilities.
          selector: 'JSXAttribute[name.name="className"] Literal[value=/^\\s*\\S+(\\s+\\S+){3,}\\s*$/]',
          message: 'Move these utility classes into a CSS file with @apply and use a class name here.',
        },
        {
          selector: 'JSXAttribute[name.name="className"] TemplateElement[value.raw=/\\S+\\s+\\S+\\s+\\S+\\s+\\S+/]',
          message: 'Move these utility classes into a CSS file with @apply and use a class name here.',
        },
        {
          // 8: user-facing text comes from the message files.
          selector: 'JSXAttribute[name.name=/^(aria-label|placeholder|title|alt)$/] > Literal',
          message: 'User-facing text must come from the message files (t(...)).',
        },
      ],
      'react/jsx-no-literals': [STYLE, { noStrings: false, ignoreProps: true }],
    },
  },

  {
    name: 'cadence/file-size',
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...vendorFiles, '**/*.test.{ts,tsx}'],
    rules: {
      'max-lines': [STYLE, { max: 250, skipBlankLines: true, skipComments: true }],
    },
  },

  // Architecture: the domain is plain TypeScript and knows nothing about the app, the framework or the database.
  {
    name: 'cadence/boundary-domain',
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/app/*', '@/components/*', '@/lib/*'],
              message: 'The domain must not depend on the app.',
            },
            {
              group: ['react', 'react-dom', 'next', 'next/*', '@supabase/*'],
              message: 'The domain must stay plain TypeScript.',
            },
          ],
        },
      ],
    },
  },

  // Shared helpers do not reach into the server layer or the pages.
  {
    name: 'cadence/boundary-lib',
    files: ['src/lib/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/*', '@/app/*', '@/components/*'],
              message: 'src/lib must not depend on the server layer or the pages.',
            },
          ],
        },
      ],
    },
  },

  // The database is reached from the server layer, server actions and the sign-in pieces only.
  {
    name: 'cadence/boundary-supabase',
    files: [
      'src/domain/**/*.ts',
      'src/lib/*.ts',
      'src/components/!(user-menu|google-sign-in-button).tsx',
      'src/app/**/*-client.tsx',
      'src/app/**/page.tsx',
    ],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*', '@/lib/supabase/*'],
              message: 'Only the server layer and server actions talk to Supabase.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
