/**
 * Opens each link in its own new tab, cut off from this page. A browser lets one pop-up through per click unless the
 * person allows pop-ups for the site, so this returns how many tabs really opened. `open` is `window.open` by default.
 */
export const openLinks = (
  links: string[],
  open: (url: string, target: string) => Window | null = (url, target) => {
    return window.open(url, target);
  },
): number => {
  let opened = 0;

  for (const link of links) {
    const tab = open(link, '_blank');

    if (tab) {
      tab.opener = null; // the same as `noopener`, which would hide whether the tab opened
      opened++;
    }
  }

  return opened;
};
