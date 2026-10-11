'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { useAppearance } from '@/lib/use-appearance';

/**
 * Keeps the tab icon in step with the look: the cream tile in light mode, a dark tile in dark mode, and a green one
 * when the Forest night theme is on in dark mode. The page ships the light icon; this swaps it as soon as the look is
 * known. The icon links can arrive in the page after this runs (the page's metadata streams in), so it also swaps any
 * that show up later.
 */
export const ThemeFavicon = () => {
  const { resolvedTheme } = useTheme();
  const { palette } = useAppearance();

  useEffect(() => {
    let name = 'light';

    if (resolvedTheme === 'dark') {
      name = palette === 'forest-night' ? 'forest' : 'dark';
    }

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
  }, [resolvedTheme, palette]);

  return null;
};
