import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';

/** The web app manifest: what the browser (and the installed app) calls Cadence, and the icons it uses. */
const manifest = async (): Promise<MetadataRoute.Manifest> => {
  const t = await getTranslations('metadata');

  return {
    name: t('title'),
    short_name: t('title'),
    description: t('description'),
    start_url: '/',
    display: 'standalone',
    background_color: '#f3e8d3',
    theme_color: '#5f7036',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
};

export default manifest;
