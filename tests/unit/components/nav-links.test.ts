import { describe, expect, it } from 'vitest';
import { TAB_LINKS as WEB_TAB, TOP_LINKS as WEB_TOP } from '@/components/nav-links/nav-links';
import { TAB_LINKS as APP_TAB, TOP_LINKS as APP_TOP } from '@/components/nav-links/nav-links.desktop';

const names = (links: readonly { name: string }[]) => {
  return links.map(({ name }) => {
    return name;
  });
};

const soon = (links: readonly object[]) => {
  return links.filter(link => {
    return 'soon' in link;
  });
};

describe('the navigation of the website and of the desktop app', () => {
  it('lists the same pages on both, so nothing is missing in the app without being said', () => {
    expect(names(APP_TOP)).toEqual(names(WEB_TOP));
    expect(names(APP_TAB)).toEqual(names(WEB_TAB));
  });

  it('switches off Circles in the app (coming soon), and nothing else', () => {
    expect(soon(WEB_TOP)).toEqual([]);
    expect(soon(WEB_TAB)).toEqual([]);
    expect(soon(APP_TOP)).toEqual([{ href: '/circles', name: 'circles', soon: true }]);
    expect(soon(APP_TAB)).toHaveLength(1);
  });
});
