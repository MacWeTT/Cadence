import { getTranslations } from 'next-intl/server';
import type { NextRequest } from 'next/server';
import { buildDesktopLink } from '@/lib/desktop-link';

const escape = (text: string): string => {
  return text.replace(/[&<>"']/g, character => {
    return `&#${character.charCodeAt(0)};`;
  });
};

/**
 * Where the desktop app asks Google's sign-in to come back to. The browser cannot finish the sign-in for the app (the
 * secret half of it is on the PC), so this page only hands the one-time code over with a `cadence://` link.
 */
export const GET = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const link = escape(buildDesktopLink({ code: searchParams.get('code'), error: searchParams.get('error') }));
  const t = await getTranslations('auth.desktop');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${link}">
<title>${escape(t('title'))}</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}a{display:inline-block;margin-top:1rem}</style>
</head>
<body>
<main>
<h1>${escape(t('title'))}</h1>
<p>${escape(t('hint'))}</p>
<a href="${link}">${escape(t('button'))}</a>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
