import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';

/** The web app manifest: what the browser (and the installed app) calls Cadence, and the icons it uses. */
const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const t = await getTranslations('metadata');
  const tn = await getTranslations('common.nav');

  return {
    name: t('title'),
    short_name: t('title'),
    description: t('description'),
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    categories: ['productivity', 'lifestyle'],
    background_color: '#f3e8d3',
    theme_color: '#5f7036',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // Full-bleed with the mark inside the safe zone, so a phone can crop it to a circle or a squircle.
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: tn('today'), url: '/today' },
      { name: tn('progress'), url: '/progress' },
    ],
  };
};

export default manifest;
