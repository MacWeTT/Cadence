// Sets web-only files aside while the desktop build runs, and puts them back. Used by build-desktop.mjs.
//
// Everything set aside goes to `.desktop-hold/` under the same path, so the hold folder alone says what belongs where:
// `restore()` walks it instead of trusting a list in memory, which is what lets the next run heal a build that was
// killed half way (a closed terminal, Ctrl+C at the wrong moment) before it starts its own.
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const HOLD = '.desktop-hold';

const move = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
};

const filesUnder = dir => {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);

    return entry.isDirectory() ? filesUnder(path) : [path];
  });
};

/**
 * `webOnly`: paths (files or folders) that only a server can use. `swaps`: [page, its desktop version], where the desktop
 * version stands in for the page while the build runs. Paths are relative to `root`.
 */
export const createHold = (root, { webOnly, swaps }) => {
  const at = (...parts) => {
    return join(root, ...parts);
  };

  const setAside = () => {
    for (const path of webOnly) {
      if (existsSync(at(path))) {
        move(at(path), at(HOLD, path));
      }
    }

    for (const [page, desktopPage] of swaps) {
      move(at(page), at(HOLD, page));
      copyFileSync(at(desktopPage), at(page));
    }
  };

  /**
   * Puts back everything in the hold folder. A swapped page's stand-in is removed first. Anything else that is already
   * in place is left alone (and stays aside): it is newer than the copy, and overwriting it would lose work. Returns the
   * paths that stayed aside.
   */
  const restore = () => {
    const hold = at(HOLD);

    if (!existsSync(hold)) {
      return [];
    }

    const swapped = new Set(
      swaps.map(([page]) => {
        return page.replaceAll('\\', '/');
      }),
    );
    const left = [];

    for (const file of filesUnder(hold)) {
      const path = relative(hold, file);

      if (existsSync(at(path)) && swapped.has(path.replaceAll('\\', '/'))) {
        rmSync(at(path), { force: true });
      }

      if (existsSync(at(path))) {
        left.push(path);
      } else {
        move(file, at(path));
      }
    }

    if (left.length === 0) {
      rmSync(hold, { recursive: true, force: true });
    }

    return left;
  };

  return { setAside, restore };
};
