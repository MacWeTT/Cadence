import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BTN_TEXT, contrastRatio } from './accent-color';
import {
  ACCENTS,
  ACCENT_PRESETS,
  ACCENT_SWATCH,
  BOOT_SCRIPT,
  DEFAULT_ACCENT,
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_PREVIEW,
  parseChoice,
  readChoice,
  readCustomHex,
  restoreChoices,
  writeChoice,
  writeCustomAccent,
} from './appearance';
import { COLOR_KEYS, PALETTE } from './palette';

const makeRoot = (initial: Record<string, string> = {}) => {
  const attrs = new Map(Object.entries(initial));
  const vars = new Map<string, string>();

  return {
    attrs,
    vars,
    style: {
      getPropertyValue: (name: string) => {
        return vars.get(name) ?? '';
      },
      setProperty: (name: string, value: string) => {
        vars.set(name, value);
      },
      removeProperty: (name: string) => {
        vars.delete(name);
      },
    },
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

const css = readFileSync('src/app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the first rule whose selector list contains `selector` (a rule may list several). */
const block = (selector: string) => {
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    // At-rules such as `@import ...;` and `@custom-variant ...;` sit in front of the first selector.
    const list = (selectors.split(';').pop() ?? '').split(',').map(part => {
      return part.trim();
    });

    if (list.includes(selector)) {
      return body;
    }
  }

  return '';
};

/** The three themes of the app's mode: Paper is the page itself, Slate is `.dark`, Forest night is `.forest`. */
const MODES = ['light', 'dark', 'forest'] as const;
const BASE = { light: ':root', dark: '.dark', forest: '.forest' } as const;

const tokenIn = (text: string, name: string) => {
  return text.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1];
};

/** The value a token has for a mode, theme and accent: the base block, then the theme's, then the accent's. */
const resolve = (mode: (typeof MODES)[number], palette: string, accent: string, name: string) => {
  const base = BASE[mode];

  const withMode = (attr: string) => {
    return `${base}[${attr}]`;
  };

  return (
    tokenIn(block(withMode(`data-accent='${accent}'`)), name) ??
    tokenIn(block(withMode(`data-palette='${palette}'`)), name) ??
    tokenIn(block(base), name) ??
    'missing'
  );
};

describe('themes and accents in globals.css', () => {
  it('names no colour theme after one of the three modes', () => {
    for (const palette of PALETTES) {
      expect(['light', 'dark', 'forest', 'paper', 'slate'], palette).not.toContain(palette);
    }
  });

  it('lists the stock theme and accent first', () => {
    expect(PALETTES[0]).toBe(DEFAULT_PALETTE);
    expect(ACCENTS[0]).toBe(DEFAULT_ACCENT);
  });

  it.each(MODES)('defines every %s theme and accent', mode => {
    for (const palette of PALETTES.filter(p => {
      return p !== DEFAULT_PALETTE;
    })) {
      const selector = `${BASE[mode]}[data-palette='${palette}']`;

      for (const name of ['bg', 'surface', 'topbar', 'ink', 'ink-muted', 'line', 'missed', 'heat-0', 'danger']) {
        expect(tokenIn(block(selector), name), `${mode} ${palette} --${name}`).toBeDefined();
      }
    }

    for (const accent of ACCENT_PRESETS.filter(a => {
      return a !== DEFAULT_ACCENT;
    })) {
      const selector = `${BASE[mode]}[data-accent='${accent}']`;

      expect(tokenIn(block(selector), 'btn'), `${mode} ${accent} --btn`).toBeDefined();
    }
  });

  it.each(MODES)('keeps text readable (AA 4.5:1) in every %s theme', mode => {
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

  it.each(MODES)('keeps every habit colour at 3:1 on every %s theme surface', mode => {
    for (const palette of PALETTES) {
      const surface = resolve(mode, palette, DEFAULT_ACCENT, 'surface');

      for (const key of COLOR_KEYS) {
        expect(contrast(PALETTE[mode][key], surface), `${mode} ${palette} ${key}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it.each(MODES)('keeps button text readable (AA 4.5:1) on every %s accent', mode => {
    for (const accent of ACCENT_PRESETS) {
      const btn = resolve(mode, DEFAULT_PALETTE, accent, 'btn');
      const text = resolve(mode, DEFAULT_PALETTE, accent, 'btn-text');

      expect(contrast(text, btn), `${mode} ${accent}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('shows each preset accent with the colour its light button really has', () => {
    for (const accent of ACCENT_PRESETS) {
      expect(ACCENT_SWATCH[accent], accent).toBe(resolve('light', DEFAULT_PALETTE, accent, 'btn'));
    }
  });

  it.each(['light', 'dark'] as const)('previews each theme with its real %s page, surface and text colours', mode => {
    for (const palette of PALETTES) {
      for (const [field, token] of [
        ['bg', 'bg'],
        ['surface', 'surface'],
        ['ink', 'ink'],
      ] as const) {
        expect(PALETTE_PREVIEW[palette][mode][field], `${palette} ${mode} ${field}`).toBe(
          resolve(mode, palette, DEFAULT_ACCENT, token),
        );
      }
    }
  });

  it.each(MODES)('wires a custom accent to its own %s button colour', mode => {
    const selector = `${BASE[mode]}[data-accent='custom']`;

    // Both dark themes share the custom accent's dark button colour.
    expect(block(selector)).toContain(`--btn: var(--accent-custom-${mode === 'light' ? 'light' : 'dark'});`);
  });
});

describe('custom accent', () => {
  it('applies a picked colour, with a readable button colour for each mode, and remembers it', () => {
    const root = makeRoot();
    const storage = makeStorage();

    expect(writeCustomAccent('#FFE08A', root, storage)).toBe(true);

    expect(root.attrs.get('data-accent')).toBe('custom');
    expect(readCustomHex(root)).toBe('#ffe08a');
    expect(contrastRatio(BTN_TEXT.light, root.vars.get('--accent-custom-light')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(BTN_TEXT.dark, root.vars.get('--accent-custom-dark')!)).toBeGreaterThanOrEqual(4.5);
    expect(storage.items.get('cadence-accent')).toBe('custom');
  });

  it('refuses something that is not a colour and changes nothing', () => {
    const root = makeRoot({ 'data-accent': 'sky' });
    const storage = makeStorage();

    expect(writeCustomAccent('purple', root, storage)).toBe(false);
    expect(root.attrs.get('data-accent')).toBe('sky');
    expect(storage.items.size).toBe(0);
  });

  it('is replaced by a preset, which clears the custom variables', () => {
    const root = makeRoot();
    const storage = makeStorage();

    writeCustomAccent('#336699', root, storage);
    writeChoice('accent', 'teal', root, storage);

    expect(root.attrs.get('data-accent')).toBe('teal');
    expect(root.vars.size).toBe(0);
  });

  it('comes back when custom is chosen again, using the colour picked last', () => {
    const root = makeRoot();
    const storage = makeStorage();

    writeCustomAccent('#336699', root, storage);
    writeChoice('accent', 'teal', root, storage);
    writeChoice('accent', 'custom', root, storage);

    expect(root.attrs.get('data-accent')).toBe('custom');
    expect(readCustomHex(root)).toBe('#336699');
  });

  it('does nothing when custom is chosen but no colour was ever picked', () => {
    const root = makeRoot();

    writeChoice('accent', 'custom', root, makeStorage());

    expect(root.attrs.has('data-accent')).toBe(false);
  });

  it('is restored on load, by the code and by the boot script alike', () => {
    const picked = makeRoot();
    const storage = makeStorage();

    writeCustomAccent('#c2185b', picked, storage);

    const viaCode = makeRoot();
    const viaScript = makeRoot();

    restoreChoices(viaCode, storage);
    new Function('document', 'localStorage', BOOT_SCRIPT)({ documentElement: viaScript }, storage);

    expect(viaCode.attrs.get('data-accent')).toBe('custom');
    expect(viaScript.attrs).toEqual(viaCode.attrs);
    expect(viaScript.vars).toEqual(viaCode.vars);
    expect(viaScript.vars.get('--accent-custom')).toBe('#c2185b');
  });

  it('falls back to the stock accent when the stored colour is damaged', () => {
    const storage = makeStorage({
      'cadence-accent': 'custom',
      'cadence-accent-custom': JSON.stringify({ hex: '#c2185b', light: 'oops', dark: '#ffffff' }),
    });
    const viaCode = makeRoot();
    const viaScript = makeRoot();

    restoreChoices(viaCode, storage);
    new Function('document', 'localStorage', BOOT_SCRIPT)({ documentElement: viaScript }, storage);

    expect(viaCode.attrs.has('data-accent')).toBe(false);
    expect(viaScript.attrs.has('data-accent')).toBe(false);
    expect(viaScript.vars.size).toBe(0);
  });

  it('lists custom last among the accents', () => {
    expect(ACCENTS[ACCENTS.length - 1]).toBe('custom');
  });
});
