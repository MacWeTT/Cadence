import { readFileSync } from 'node:fs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

const nextConfig: NextConfig = {
  /* config options here */
  // The footer shows the version, so package.json stays the one place it is written.
  env: { NEXT_PUBLIC_APP_VERSION: version },
  cacheComponents: true,
  partialPrefetching: true,
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
