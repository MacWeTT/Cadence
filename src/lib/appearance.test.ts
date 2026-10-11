import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ACCENTS,
  ACCENT_SWATCH,
  BOOT_SCRIPT,
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_PREVIEW,
  parseChoice,
  readChoice,
  restoreChoices,
  writeChoice,
} from './appearance';
import { COLOR_KEYS, PALETTE } from './palette';

const makeRoot = (initial: Record<string, string> = {}) => {
  const attrs = new Map(Object.entries(initial));

  return {
    attrs,
    getAttribute: (name: string) => {
      return attrs.get(name) ?? null;
    },
    setAttribute: (name: string, value: string) => {
      attrs.set(name, value);
    },
    removeAttribute: (name: string) => {
      attrs.delete(name);
    },
  };
};

const makeStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));

  return {
    items,
    getItem: (key: string) => {
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
};

describe('parseChoice', () => {
  it('keeps a known value', () => {
    expect(parseChoice('palette', 'ocean')).toBe('ocean');
    expect(parseChoice('accent', 'sky')).toBe('sky');
  });

  it('falls back to the default for anything else', () => {
    expect(parseChoice('palette', 'neon')).toBe(DEFAULT_PALETTE);
    expect(parseChoice('accent', null)).toBe(DEFAULT_ACCENT);
    expect(parseChoice('accent', 'ocean')).toBe(DEFAULT_ACCENT);
  });
});

describe('writeChoice and readChoice', () => {
  it('sets the attribute and remembers the choice', () => {
    const root = makeRoot();
    const storage = makeStorage();

    writeChoice('accent', 'plum', root, storage);

    expect(root.attrs.get('data-accent')).toBe('plum');
    expect(storage.items.get('cadence-accent')).toBe('plum');
    expect(readChoice('accent', root)).toBe('plum');
  });

  it('leaves no attribute for the default, so the stock look is the plain CSS', () => {
    const root = makeRoot({ 'data-palette': 'ocean' });
    const storage = makeStorage();

    writeChoice('palette', DEFAULT_PALETTE, root, storage);

    expect(root.attrs.has('data-palette')).toBe(false);
    expect(storage.items.get('cadence-palette')).toBe(DEFAULT_PALETTE);
    expect(readChoice('palette', root)).toBe(DEFAULT_PALETTE);
  });

  it('still applies the choice when storage is unavailable', () => {
    const root = makeRoot();
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    writeChoice('palette', 'graphite', root, broken);

    expect(root.attrs.get('data-palette')).toBe('graphite');
  });
});

describe('restoreChoices', () => {
  it('applies what was saved and ignores junk', () => {
    const root = makeRoot();
    const storage = makeStorage({ 'cadence-palette': 'blossom', 'cadence-accent': 'not-an-accent' });

    restoreChoices(root, storage);

    expect(root.attrs.get('data-palette')).toBe('blossom');
    expect(root.attrs.has('data-accent')).toBe(false);
  });
});

describe('BOOT_SCRIPT (runs before first paint)', () => {
  const run = (root: ReturnType<typeof makeRoot>, storage: ReturnType<typeof makeStorage>) => {
    new Function('document', 'localStorage', BOOT_SCRIPT)({ documentElement: root }, storage);
  };

  it('does the same thing as restoreChoices', () => {
    const saved = { 'cadence-palette': 'ocean', 'cadence-accent': 'teal' };
    const viaScript = makeRoot();
    const viaCode = makeRoot();

    run(viaScript, makeStorage(saved));
    restoreChoices(viaCode, makeStorage(saved));

    expect(viaScript.attrs).toEqual(viaCode.attrs);
    expect(viaScript.attrs.get('data-palette')).toBe('ocean');
    expect(viaScript.attrs.get('data-accent')).toBe('teal');
  });

  it('ignores values it does not know and survives blocked storage', () => {
    const root = makeRoot();

    run(root, makeStorage({ 'cadence-palette': 'neon' }));
    expect(root.attrs.size).toBe(0);

    expect(() => {
      return new Function('document', 'localStorage', BOOT_SCRIPT)(
        { documentElement: root },
        {
          getItem: () => {
            throw new Error('blocked');
          },
        },
      );
    }).not.toThrow();
  });
});

// WCAG helpers, the same ones palette.test.ts uses.
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map(i => {
      return parseInt(hex.slice(i, i + 2), 16) / 255;
    })
    .map(v => {
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => {
    return y - x;
  });

  return (hi + 0.05) / (lo + 0.05);
};

const css = readFileSync('src/app/globals.css', 'utf8');

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);

  if (start === -1) {
    return '';
  }

  return css.slice(start, css.indexOf('}', start));
};

const tokenIn = (text: string, name: string) => {
  return text.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1];
};

/** The value a token has for a mode, theme and accent: the base block, then the theme's, then the accent's. */
const resolve = (mode: 'light' | 'dark', palette: string, accent: string, name: string) => {
  const base = mode === 'light' ? ':root' : '.dark';

  const withMode = (attr: string) => {
    return mode === 'light' ? `:root[${attr}]` : `.dark[${attr}]`;
  };

  return (
    tokenIn(block(withMode(`data-accent='${accent}'`)), name) ??
    tokenIn(block(withMode(`data-palette='${palette}'`)), name) ??
    tokenIn(block(base), name) ??
    'missing'
  );
};

describe('themes and accents in globals.css', () => {
  it('lists the stock theme and accent first', () => {
    expect(PALETTES[0]).toBe(DEFAULT_PALETTE);
    expect(ACCENTS[0]).toBe(DEFAULT_ACCENT);
  });

  it.each(['light', 'dark'] as const)('defines every %s theme and accent', mode => {
    for (const palette of PALETTES.filter(p => {
      return p !== DEFAULT_PALETTE;
    })) {
      const selector = mode === 'light' ? `:root[data-palette='${palette}']` : `.dark[data-palette='${palette}']`;

      for (const name of ['bg', 'surface', 'topbar', 'ink', 'ink-muted', 'line', 'missed', 'heat-0', 'danger']) {
        expect(tokenIn(block(selector), name), `${mode} ${palette} --${name}`).toBeDefined();
      }
    }

    for (const accent of ACCENTS.filter(a => {
      return a !== DEFAULT_ACCENT;
    })) {
      const selector = mode === 'light' ? `:root[data-accent='${accent}']` : `.dark[data-accent='${accent}']`;

      expect(tokenIn(block(selector), 'btn'), `${mode} ${accent} --btn`).toBeDefined();
    }
  });

  it.each(['light', 'dark'] as const)('keeps text readable (AA 4.5:1) in every %s theme', mode => {
    for (const palette of PALETTES) {
      const get = (name: string) => {
        return resolve(mode, palette, DEFAULT_ACCENT, name);
      };

      expect(contrast(get('ink'), get('bg')), `${mode} ${palette} ink on page`).toBeGreaterThanOrEqual(7);
      expect(contrast(get('ink-muted'), get('surface')), `${mode} ${palette} muted on surface`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(get('ink-muted'), get('bg')), `${mode} ${palette} muted on page`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(get('ink-muted'), get('topbar')), `${mode} ${palette} muted on top bar`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(get('danger'), get('surface')), `${mode} ${palette} error on surface`).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(get('danger'), get('bg')), `${mode} ${palette} error on page`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(['light', 'dark'] as const)('keeps every habit colour at 3:1 on every %s theme surface', mode => {
    for (const palette of PALETTES) {
      const surface = resolve(mode, palette, DEFAULT_ACCENT, 'surface');

      for (const key of COLOR_KEYS) {
        expect(contrast(PALETTE[mode][key], surface), `${mode} ${palette} ${key}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(['light', 'dark'] as const)('keeps button text readable (AA 4.5:1) on every %s accent', mode => {
    for (const accent of ACCENTS) {
      const btn = resolve(mode, DEFAULT_PALETTE, accent, 'btn');
      const text = resolve(mode, DEFAULT_PALETTE, accent, 'btn-text');

      expect(contrast(text, btn), `${mode} ${accent}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('shows each accent with the colour its light button really has', () => {
    for (const accent of ACCENTS) {
      expect(ACCENT_SWATCH[accent], accent).toBe(resolve('light', DEFAULT_PALETTE, accent, 'btn'));
    }
  });

  it('previews each theme with its real light page and surface colours', () => {
    for (const palette of PALETTES) {
      expect(PALETTE_PREVIEW[palette].bg, palette).toBe(resolve('light', palette, DEFAULT_ACCENT, 'bg'));
      expect(PALETTE_PREVIEW[palette].surface, palette).toBe(resolve('light', palette, DEFAULT_ACCENT, 'surface'));
    }
  });
});
