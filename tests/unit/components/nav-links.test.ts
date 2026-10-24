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

  it('leave Circles out of the desktop app, which has no server for it, and change nothing else', () => {
    const withoutCircles = (links: readonly { href: string }[]) => {
      return hrefs(links).filter(href => {
        return href !== '/circles';
      });
    };

    expect(hrefs(DESKTOP_TOP_LINKS)).toEqual(withoutCircles(TOP_LINKS));
    expect(hrefs(DESKTOP_TAB_LINKS)).toEqual(withoutCircles(TAB_LINKS));
  });

  it('are swapped for the desktop ones, and the Home card for an empty one, by the desktop build', () => {
    const config = readFileSync('next.config.ts', 'utf8');

    expect(config).toContain("'@/components/nav-links/nav-links': './src/components/nav-links/nav-links.desktop.ts'");
    expect(config).toContain(
      "'@/app/(app)/home/circles-card/circles-card': './src/app/(app)/home/circles-card/circles-card.desktop.tsx'",
    );
  });
});
