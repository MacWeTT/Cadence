'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { isThemeName } from '@/lib/themes';

/**
 * Keeps the tab icon in step with the theme: the cream tile for Paper, a dark tile for Slate and another for Forest night.
 * The page ships the light icon; this swaps it as soon as the theme is known. The icon links can arrive in the page after
 * this runs (the page's metadata streams in), so it also swaps any that show up later.
 */
export const ThemeFavicon = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const name = isThemeName(resolvedTheme) ? resolvedTheme : 'light';
    const href = `/brand/icon-${name}.svg`;

    const swap = () => {
      const icons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');

      icons.forEach(icon => {
        if (!icon.href.endsWith(href)) {
          icon.href = href;
        }
      });
    };

    swap();

    const watcher = new MutationObserver(swap);

    watcher.observe(document.head, { childList: true });

    return () => {
      watcher.disconnect();
    };
  }, [resolvedTheme]);

  return null;
};
