import { describe, expect, it, vi } from 'vitest';
import { openLinks } from '@/lib/open-links';

describe('openLinks', () => {
  const tab = () => {
    return {} as Window;
  };

  it('opens each link in its own tab, cut off from this page, and counts them', () => {
    const open = vi.fn(tab);

    expect(openLinks(['https://a.dev/1', 'https://a.dev/2'], open)).toBe(2);
    expect(open).toHaveBeenNthCalledWith(1, 'https://a.dev/1', '_blank');
    expect(open).toHaveBeenNthCalledWith(2, 'https://a.dev/2', '_blank');
  });

  it('counts only the tabs the browser allowed', () => {
    const open = vi.fn().mockReturnValueOnce(tab()).mockReturnValueOnce(null).mockReturnValueOnce(null);

    expect(openLinks(['https://a.dev/1', 'https://a.dev/2', 'https://a.dev/3'], open)).toBe(1);
  });

  it('opens nothing for no links', () => {
    expect(openLinks([], vi.fn())).toBe(0);
  });
});
