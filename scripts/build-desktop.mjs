// Builds the static copy of the app that the desktop app bundles, into `out/`.
//
// A static export cannot hold a server, so what only a server can do is set aside while it builds and put back after,
// whether or not the build worked: the route handlers, the proxy, the manifest route, the sign-in callback, Circles (it
// needs the server), the contact page (it sends mail from a server). The screens reach their data through
// `src/data`, which next.config.ts points at the local data source for this build.
//
// The files are put back when the build ends, when it is interrupted (Ctrl+C), and, if the process was killed outright,
// at the start of the next run (see desktop-hold.mjs), so a stopped build never leaves the project missing folders.
import { spawn } from 'node:child_process';
import { createHold } from './desktop-hold.mjs';

const hold = createHold('.', {
  webOnly: [
    'src/app/api',
    'src/app/auth',
    'src/app/manifest.ts',
    'src/app/(app)/circles',
    'src/app/(app)/contact',
    'src/proxy.ts',
  ],
  // Pages whose desktop version stands in for them while it builds: [the page, its desktop version].
  swaps: [['src/app/(auth)/register/page.tsx', 'src/app/(auth)/register/page.desktop.tsx']],
});

// A build that was killed before leaves its files in the hold folder: put them back before starting.
const healed = hold.restore();

if (healed.length > 0) {
  console.warn(`Left aside by an earlier build and in place already, so kept in .desktop-hold: ${healed.join(', ')}`);
}

hold.setAside();
process.on('exit', hold.restore);

const build = spawn('npx', ['next', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, DESKTOP: '1' } });

const stop = signal => {
  build.kill(signal);
  hold.restore();
  process.exit(1);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

build.on('close', code => {
  process.exit(code ?? 1);
});
