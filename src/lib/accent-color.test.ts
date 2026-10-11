import { describe, expect, it } from 'vitest';
import { BTN_TEXT, contrastRatio, deriveAccent, parseHex } from './accent-color';

describe('parseHex', () => {
  it('normalises to lower-case #rrggbb', () => {
    expect(parseHex('#AABBCC')).toBe('#aabbcc');
    expect(parseHex('aabbcc')).toBe('#aabbcc');
    expect(parseHex('  #1A2b3C ')).toBe('#1a2b3c');
  });

  it('expands the three-digit form', () => {
    expect(parseHex('#abc')).toBe('#aabbcc');
    expect(parseHex('F0a')).toBe('#ff00aa');
  });

  it('rejects anything that is not a colour', () => {
    for (const bad of ['', '#12', '#12345', '#1234567', 'red', '#ggg000', 'rgb(1,2,3)', null, undefined, 42]) {
      expect(parseHex(bad as unknown as string), String(bad)).toBeNull();
    }
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for the same colour', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('does not depend on the order', () => {
    expect(contrastRatio('#336699', '#faf2e1')).toBeCloseTo(contrastRatio('#faf2e1', '#336699'), 10);
  });
});

describe('deriveAccent', () => {
  it('returns null for an invalid colour', () => {
    expect(deriveAccent('nope')).toBeNull();
  });

  it('keeps a colour that is already readable', () => {
    const result = deriveAccent('#3f6f98');

    expect(result?.light).toBe('#3f6f98');
  });

  it('darkens a pale colour for the light theme and keeps its hue', () => {
    const result = deriveAccent('#ffe08a');

    expect(result).not.toBeNull();
    expect(contrastRatio(BTN_TEXT.light, result!.light)).toBeGreaterThanOrEqual(4.5);
    // Still a yellow-ish colour: red and green stay above blue.
    const [r, g, b] = [1, 3, 5].map(i => {
      return parseInt(result!.light.slice(i, i + 2), 16);
    });

    expect(r).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(b);
  });

  it('lightens a dark colour for the dark theme', () => {
    const result = deriveAccent('#10204a');

    expect(contrastRatio(BTN_TEXT.dark, result!.dark)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives readable button text for every sampled colour, in both themes', () => {
    const steps = [0, 51, 102, 153, 204, 255];

    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          const hex = `#${[r, g, b]
            .map(v => {
              return v.toString(16).padStart(2, '0');
            })
            .join('')}`;
          const result = deriveAccent(hex)!;

          expect(contrastRatio(BTN_TEXT.light, result.light), `${hex} light`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(BTN_TEXT.dark, result.dark), `${hex} dark`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
