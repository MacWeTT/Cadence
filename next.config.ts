import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // A profile photo can be 2 MB (the default for an action is 1 MB); a sound is at most 500 KB.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
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
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
