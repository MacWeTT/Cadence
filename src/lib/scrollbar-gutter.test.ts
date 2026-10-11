import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('page width', () => {
  it('reserves room for the scrollbar on every page, so a long page (Progress) and a short one line up, and the title does not shift when content makes the page scroll', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');

    expect(css).toMatch(/html\s*\{[^}]*scrollbar-gutter:\s*stable/);
  });
});
