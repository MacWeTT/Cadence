import { describe, expect, it } from 'vitest';
import { CONTRIBUTORS } from '@/lib/contributors';

describe('CONTRIBUTORS', () => {
  it('lists at least the primary contributor, first', () => {
    expect(CONTRIBUTORS.length).toBeGreaterThanOrEqual(1);
    expect(CONTRIBUTORS[0].name).toBe('MacWeTT');
  });

  it('gives everyone a name and a GitHub link, and nobody twice', () => {
    for (const { name, url } of CONTRIBUTORS) {
      expect(name.trim()).not.toBe('');
      expect(url).toMatch(/^https:\/\/github\.com\/[A-Za-z0-9-]+$/);
    }

    const names = CONTRIBUTORS.map(({ name }) => {
      return name.toLowerCase();
    });
    const urls = CONTRIBUTORS.map(({ url }) => {
      return url.toLowerCase();
    });

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
