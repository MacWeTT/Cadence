import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLOR_KEYS, PALETTE, habitColor } from './palette';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const SURFACE = { light: '#faf2e1', dark: '#2a2118' };

describe('palette', () => {
  it('has the eight spec colors', () => {
    expect([...COLOR_KEYS]).toEqual(['moss', 'clay', 'ochre', 'rose', 'plum', 'teal', 'sky', 'slate']);
  });

  it.each(['light', 'dark'] as const)('keeps every %s color at 3:1 against its surface', theme => {
    for (const key of COLOR_KEYS)
      expect(contrast(PALETTE[theme][key], SURFACE[theme]), `${theme} ${key}`).toBeGreaterThanOrEqual(3);
  });

  it('is mirrored exactly by the CSS variables in globals.css', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const block = (selector: string) => css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
    for (const [theme, selector] of [
      ['light', ':root {'],
      ['dark', '.dark {'],
    ] as const) {
      for (const key of COLOR_KEYS)
        expect(block(selector), `${theme} ${key}`).toContain(`--habit-${key}: ${PALETTE[theme][key]};`);
    }
  });

  it('refers to a color through its CSS variable', () => {
    expect(habitColor('teal')).toBe('var(--habit-teal)');
  });
});

describe('text contrast (WCAG AA, 4.5:1)', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const block = (selector: string) => css.slice(css.indexOf(selector), css.indexOf('}', css.indexOf(selector)));
  const token = (blockText: string, name: string) =>
    blockText.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1] ?? 'missing';

  it.each([
    ['light', ':root {'],
    ['dark', '.dark {'],
  ] as const)('%s: button text, and error text on the surface and the page', (_theme, selector) => {
    const b = block(selector);
    expect(contrast(token(b, 'btn-text'), token(b, 'btn')), 'button text on button').toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(b, 'danger'), token(b, 'surface')), 'error text on surface').toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(b, 'danger'), token(b, 'bg')), 'error text on page').toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(b, 'ink-muted'), token(b, 'surface')), 'muted text on surface').toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(b, 'ink-muted'), token(b, 'bg')), 'muted text on page').toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(b, 'ink-muted'), token(b, 'topbar')), 'muted text on the top bar').toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
