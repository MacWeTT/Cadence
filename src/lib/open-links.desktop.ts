import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * The desktop build's `openLinks`: every link opens in the system browser through the app, so there is no pop-up limit
 * to run into. It says all of them opened, because it cannot tell if the browser then did.
 */
export const openLinks = (links: string[]): number => {
  for (const link of links) {
    openUrl(link).catch(() => {
      // a link the system cannot open is skipped
    });
  }

  return links.length;
};
