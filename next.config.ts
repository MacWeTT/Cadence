import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

// `DESKTOP=1 next build` makes the static copy the desktop app bundles (see scripts/build-desktop.mjs and the desktop spec).
const desktop = process.env.DESKTOP === '1';

const nextConfig: NextConfig = {
  /* config options here */
  // These two are web-only speed-ups that need a server, and a static export cannot have them.
  cacheComponents: !desktop,
  partialPrefetching: !desktop,
  ...(desktop
    ? {
        output: 'export' as const,
        images: { unoptimized: true },
        // The files the desktop build leaves out still sit in the project, so type errors there would stop it;
        // `npm run typecheck` already covers every file.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
  // A profile photo can be 2 MB (the default for an action is 1 MB); a sound is at most 500 KB.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  // Redirects and headers are answered by a server, which a static export does not have.
  ...(desktop
    ? {}
    : {
        // Appearance moved into the profile; old links and bookmarks still work.
        redirects: async () => {
          return [{ source: '/appearance', destination: '/profile/appearance', permanent: false }];
        },
        // The service worker must always be fetched fresh, or a fix to it could take a day to reach anyone.
        headers: async () => {
          return [
            {
              source: '/sw.js',
              headers: [
                { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
              ],
            },
          ];
        },
      }),
  turbopack: {
    // The desktop build swaps these modules for versions that carry no server code.
    resolveAlias: desktop
      ? {
          '@/data/source': './src/data/source.desktop.ts',
          '@/components/user-menu/user-menu': './src/components/user-menu/user-menu.desktop.tsx',
          '@/components/service-worker-register/service-worker-register':
            './src/components/service-worker-register/service-worker-register.desktop.tsx',
          '@/components/footer/footer': './src/components/footer/footer.desktop.tsx',
          '@/lib/notify': './src/lib/notify.desktop.ts',
          '@/app/(app)/profile/desktop-settings/desktop-settings':
            './src/app/(app)/profile/desktop-settings/desktop-settings.desktop.tsx',
          '@/lib/open-links': './src/lib/open-links.desktop.ts',
          '@/components/google-sign-in-button/google-sign-in-button':
            './src/components/google-sign-in-button/google-sign-in-button.desktop.tsx',
          '@/app/(app)/profile/sign-out-form/sign-out-form':
            './src/app/(app)/profile/sign-out-form/sign-out-form.desktop.tsx',
          '@/components/get-the-app/get-the-app': './src/components/get-the-app/get-the-app.desktop.tsx',
          '@/app/(app)/profile/account/sign-in-card/sign-in-card':
            './src/app/(app)/profile/account/sign-in-card/sign-in-card.desktop.tsx',
          '@/app/(app)/profile/account/export-card/export-card':
            './src/app/(app)/profile/account/export-card/export-card.desktop.tsx',
          '@/app/(app)/profile/account/delete-card/delete-card':
            './src/app/(app)/profile/account/delete-card/delete-card.desktop.tsx',
          // Circles need a server, so the desktop app has no link to them and no Home card for them.
          '@/components/nav-links/nav-links': './src/components/nav-links/nav-links.desktop.ts',
          '@/app/(app)/home/circles-card/circles-card': './src/app/(app)/home/circles-card/circles-card.desktop.tsx',
        }
      : {},
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
