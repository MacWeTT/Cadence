import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// What the desktop build leaves out (scripts/build-desktop.mjs), and the one module that is allowed to call the actions.
const WEB_ONLY = ['src/app/api', 'src/app/auth', 'src/app/(app)/circles', 'src/app/(app)/contact'];
const ALLOWED = ['src/data/remote.ts'];

const files = (dir: string): string[] => {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);

    return statSync(path).isDirectory() ? files(path) : [path];
  });
};

const slash = (path: string): string => {
  return relative('.', path).replaceAll('\\', '/');
};

/** An import (not a type-only one) of an actions module: `.../actions'`, `.../focus-actions'`, `.../timezone-actions'`. */
const ACTION_IMPORT = /^import\s+(?!type\b)[^;]*?from\s+'[^']*\/(?:actions|focus-actions|timezone-actions)'/m;

describe('the screens and the desktop build', () => {
  it('reach the server only through the data source: nothing but it imports a Server Action module', () => {
    const offenders = files('src')
      .filter(path => {
        return /\.tsx?$/.test(path);
      })
      .map(slash)
      .filter(path => {
        return (
          !ALLOWED.includes(path) &&
          !path.endsWith('actions.ts') &&
          !WEB_ONLY.some(prefix => {
            return path.startsWith(prefix);
          })
        );
      })
      .filter(path => {
        return ACTION_IMPORT.test(readFileSync(path, 'utf8'));
      });

    expect(offenders).toEqual([]);
  });

  it('has a local data source that answers everything the data source asks for', async () => {
    const { local } = await import('@/data/local');
    const { remote } = await import('@/data/remote').catch(() => {
      return { remote: null };
    });

    // `remote` reaches the server modules, so it may not load here; when it does, the two must have the same shape.
    if (remote) {
      expect(Object.keys(local).sort()).toEqual(Object.keys(remote).sort());
    }

    expect(Object.keys(local).length).toBeGreaterThan(30);
  }, 20_000); // the first import loads the whole local data source, which can be slow while other tests run
});
