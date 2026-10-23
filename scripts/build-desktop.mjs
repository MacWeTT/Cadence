// Builds the static copy of the app that the desktop app bundles, into `out/`.
//
// A static export cannot hold a server, so what only a server can do is set aside while it builds and put back after,
// whether or not the build worked: the route handlers, the proxy, the manifest route, the sign-in callback, Circles (it
// needs the server), the contact page and the register screen (they read the session on a server). The screens reach their data through
// `src/data`, which next.config.ts points at the local data source for this build.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const HOLD = '.desktop-hold';
const WEB_ONLY = [
  'src/app/api',
  'src/app/auth',
  'src/app/manifest.ts',
  'src/app/(app)/circles',
  'src/app/(app)/contact',
  'src/app/(auth)/register',
  'src/proxy.ts',
];

const move = (from, to) => {
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
};

const setAside = () => {
  return WEB_ONLY.filter(path => {
    return existsSync(path);
  }).map(path => {
    move(path, join(HOLD, path));

    return path;
  });
};

const putBack = held => {
  held.forEach(path => {
    move(join(HOLD, path), path);
  });
  rmSync(HOLD, { recursive: true, force: true });
};

let held = [];
let status = 1;

try {
  held = setAside();
  status =
    spawnSync('npx', ['next', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, DESKTOP: '1' } })
      .status ?? 1;
} finally {
  putBack(held);
}

process.exit(status);
