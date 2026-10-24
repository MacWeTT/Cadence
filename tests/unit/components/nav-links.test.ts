import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TAB_LINKS, TOP_LINKS } from '@/components/nav-links/nav-links';
import {
  TAB_LINKS as DESKTOP_TAB_LINKS,
  TOP_LINKS as DESKTOP_TOP_LINKS,
} from '@/components/nav-links/nav-links.desktop';

const hrefs = (links: readonly { href: string }[]): string[] => {
  return links.map(({ href }) => {
    return href;
  });
};

describe('the navigation links', () => {
  it('include Circles on the web, in the top bar and the phone tab bar', () => {
    expect(hrefs(TOP_LINKS)).toContain('/circles');
    expect(hrefs(TAB_LINKS)).toContain('/circles');
  });

  it('keep Circles in the desktop app but switched off, coming soon, and change nothing else', () => {
    const soon = (links: readonly object[]) => {
      return links.filter(link => {
        return 'soon' in link;
      });
    };

    // the same pages, in the same order, as on the web
    expect(hrefs(DESKTOP_TOP_LINKS)).toEqual(hrefs(TOP_LINKS));
    expect(hrefs(DESKTOP_TAB_LINKS)).toEqual(hrefs(TAB_LINKS));
    // only Circles is switched off, and only in the app
    expect(soon(TOP_LINKS)).toEqual([]);
    expect(soon(TAB_LINKS)).toEqual([]);
    expect(soon(DESKTOP_TOP_LINKS)).toEqual([{ href: '/circles', name: 'circles', soon: true }]);
    expect(soon(DESKTOP_TAB_LINKS)).toHaveLength(1);
  });

  it('are swapped for the desktop ones, and the Home card for an empty one, by the desktop build', () => {
    // The config is formatted by prettier, which may wrap a long line, so compare it with its spaces collapsed.
    const config = readFileSync('next.config.ts', 'utf8').replaceAll(/\s+/g, ' ');

    expect(config).toContain("'@/components/nav-links/nav-links': './src/components/nav-links/nav-links.desktop.ts'");
    expect(config).toContain(
      "'@/app/(app)/home/circles-card/circles-card': './src/app/(app)/home/circles-card/circles-card.desktop.tsx'",
    );
    expect(config).toContain(
      "'@/app/(app)/habits/habit-circles/habit-circles': './src/app/(app)/habits/habit-circles/habit-circles.desktop.tsx'",
    );
  });
});
