import { deriveAccent, parseHex } from './accent-color';

/**
 * The look of the app besides light/dark: a theme (the page and surface colours) and an accent (the button colour,
 * the logo and the heatmap). Both are `data-*` attributes on <html> that globals.css reads, and both are remembered in
 * localStorage. The stock choice sets no attribute at all, so the plain CSS is the stock look.
 *
 * A custom accent is the accent `custom` plus three CSS variables on <html>: the picked colour and the button colour
 * worked out for each theme mode (see accent-color.ts). They are stored together so the boot script can apply them.
 */
export const PALETTES = ['cadence', 'ocean', 'meadow', 'dusk', 'sunset', 'blossom', 'steel', 'graphite'] as const;
export const ACCENT_PRESETS = ['moss', 'clay', 'sky', 'plum', 'teal'] as const;
export const ACCENTS = [...ACCENT_PRESETS, 'custom'] as const;

export type Palette = (typeof PALETTES)[number];
export type AccentPreset = (typeof ACCENT_PRESETS)[number];
export type Accent = (typeof ACCENTS)[number];
export type Kind = 'palette' | 'accent';

export const DEFAULT_PALETTE: Palette = 'cadence';
export const DEFAULT_ACCENT: Accent = 'moss';

/** What each preset accent looks like in the picker. Must match `--btn` in the light blocks of globals.css (tested). */
export const ACCENT_SWATCH: Record<AccentPreset, string> = {
  moss: '#5a6b3d',
  clay: '#a8512b',
  sky: '#3f6f98',
  plum: '#7d5a8c',
  teal: '#2f6f69',
};

interface Preview {
  bg: string;
  surface: string;
  ink: string;
}

/** Each theme's page, surface and text colours in both modes, for its card in the picker. Must match globals.css. */
export const PALETTE_PREVIEW: Record<Palette, { light: Preview; dark: Preview }> = {
  cadence: {
    light: { bg: '#f3e8d3', surface: '#faf2e1', ink: '#3b2f24' },
    dark: { bg: '#1a1d21', surface: '#23272c', ink: '#e8e6e1' },
  },
  ocean: {
    light: { bg: '#e6eef2', surface: '#f2f7f9', ink: '#1f2f3a' },
    dark: { bg: '#101a21', surface: '#172530', ink: '#e3eef4' },
  },
  meadow: {
    light: { bg: '#e4ebe0', surface: '#f0f5ed', ink: '#1e2b1f' },
    dark: { bg: '#121a14', surface: '#19231b', ink: '#e2eee3' },
  },
  dusk: {
    light: { bg: '#e9e7f3', surface: '#f5f4fb', ink: '#25223a' },
    dark: { bg: '#15131f', surface: '#1d1b2b', ink: '#e8e6f5' },
  },
  sunset: {
    light: { bg: '#f8e5d8', surface: '#fdf1e8', ink: '#3b261c' },
    dark: { bg: '#1e1410', surface: '#2a1c16', ink: '#f6e4d8' },
  },
  blossom: {
    light: { bg: '#f6e6ea', surface: '#fcf1f4', ink: '#3a2630' },
    dark: { bg: '#1d1519', surface: '#281c22', ink: '#f4e3e8' },
  },
  steel: {
    light: { bg: '#e8ebf0', surface: '#f4f6f9', ink: '#1b2230' },
    dark: { bg: '#0b0d12', surface: '#12151c', ink: '#e6e9f0' },
  },
  graphite: {
    light: { bg: '#ececec', surface: '#f7f7f7', ink: '#222222' },
    dark: { bg: '#161616', surface: '#202020', ink: '#ededed' },
  },
};

const CONFIG = {
  palette: { options: PALETTES as readonly string[], fallback: DEFAULT_PALETTE as string, attr: 'data-palette' },
  accent: { options: ACCENTS as readonly string[], fallback: DEFAULT_ACCENT as string, attr: 'data-accent' },
};

const CUSTOM_KEY = 'cadence-accent-custom';
const CUSTOM_VARS = { hex: '--accent-custom', light: '--accent-custom-light', dark: '--accent-custom-dark' } as const;

const storageKey = (kind: Kind) => {
  return `cadence-${kind}`;
};

interface RootLike {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  style: {
    getPropertyValue: (name: string) => string;
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => void;
  };
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

type Choice<K extends Kind> = K extends 'palette' ? Palette : Accent;

/** A known value is kept; anything else (a stale or hand-edited value) becomes the default. */
export const parseChoice = <K extends Kind>(kind: K, value: string | null): Choice<K> => {
  const { options, fallback } = CONFIG[kind];

  return (value !== null && options.includes(value) ? value : fallback) as Choice<K>;
};

interface CustomAccent {
  hex: string;
  light: string;
  dark: string;
}

/** The stored custom accent, only if all three colours in it are valid. */
const readStoredCustom = (storage: StorageLike): CustomAccent | null => {
  try {
    const raw = storage.getItem(CUSTOM_KEY);
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    const [hex, light, dark] = [parseHex(data?.hex), parseHex(data?.light), parseHex(data?.dark)];

    return hex && light && dark ? { hex, light, dark } : null;
  } catch {
    return null;
  }
};

const applyCustomVars = (custom: CustomAccent | null, root: RootLike) => {
  for (const key of ['hex', 'light', 'dark'] as const) {
    if (custom) {
      root.style.setProperty(CUSTOM_VARS[key], custom[key]);
    } else {
      root.style.removeProperty(CUSTOM_VARS[key]);
    }
  }
};

/** Puts a choice on <html>; the default removes the attribute. */
const applyChoice = (kind: Kind, value: string, root: RootLike) => {
  const { attr, fallback } = CONFIG[kind];

  if (value === fallback) {
    root.removeAttribute(attr);
  } else {
    root.setAttribute(attr, value);
  }

  if (kind === 'accent' && value !== 'custom') {
    applyCustomVars(null, root);
  }
};

const remember = (key: string, value: string, storage: StorageLike) => {
  try {
    storage.setItem(key, value);
  } catch {
    // The choice lasts for this visit only (storage can be blocked in private windows).
  }
};

export const readChoice = <K extends Kind>(kind: K, root: RootLike): Choice<K> => {
  return parseChoice(kind, root.getAttribute(CONFIG[kind].attr));
};

/** The colour picked for the custom accent, if there is one on the page. */
export const readCustomHex = (root: RootLike): string | null => {
  return parseHex(root.style.getPropertyValue(CUSTOM_VARS.hex));
};

/** Applies a choice and remembers it. Choosing `custom` brings back the colour picked last, or does nothing. */
export const writeChoice = (kind: Kind, value: string, root: RootLike, storage: StorageLike) => {
  const choice = parseChoice(kind, value);

  if (choice === 'custom') {
    const custom = readStoredCustom(storage);

    if (!custom) {
      return;
    }

    applyCustomVars(custom, root);
  }

  applyChoice(kind, choice, root);
  remember(storageKey(kind), choice, storage);
};

/** Makes any colour the accent. Returns false (and changes nothing) when it is not a colour. */
export const writeCustomAccent = (value: string, root: RootLike, storage: StorageLike): boolean => {
  const derived = deriveAccent(value);

  if (!derived) {
    return false;
  }

  applyCustomVars(derived, root);
  applyChoice('accent', 'custom', root);
  remember(CUSTOM_KEY, JSON.stringify(derived), storage);
  remember(storageKey('accent'), 'custom', storage);

  return true;
};

/** Applies whatever was saved earlier. */
export const restoreChoices = (root: RootLike, storage: StorageLike) => {
  for (const kind of ['palette', 'accent'] as const) {
    let saved: string | null = null;

    try {
      saved = storage.getItem(storageKey(kind));
    } catch {
      saved = null;
    }

    let choice: string = parseChoice(kind, saved);

    if (kind === 'accent' && choice === 'custom') {
      const custom = readStoredCustom(storage);

      applyCustomVars(custom, root);
      choice = custom ? 'custom' : DEFAULT_ACCENT;
    }

    applyChoice(kind, choice, root);
  }
};

/**
 * The same as `restoreChoices`, as plain JavaScript for a <script> in <head>, so the saved look is on <html> before
 * the first paint and the page never flashes the stock colours. Kept in sync with the code above by a test.
 */
export const BOOT_SCRIPT = `(function(){var r=document.documentElement;var c=${JSON.stringify({
  palette: { ...CONFIG.palette, key: storageKey('palette') },
  accent: { ...CONFIG.accent, key: storageKey('accent') },
})};var v=${JSON.stringify(CUSTOM_VARS)};var h=/^#[0-9a-f]{6}$/;for(var k in c){try{var s=localStorage.getItem(c[k].key);if(!s||s===c[k].fallback||c[k].options.indexOf(s)<0)continue;if(s==='custom'){var d=JSON.parse(localStorage.getItem(${JSON.stringify(CUSTOM_KEY)}));if(!d||!h.test(d.hex)||!h.test(d.light)||!h.test(d.dark))continue;r.style.setProperty(v.hex,d.hex);r.style.setProperty(v.light,d.light);r.style.setProperty(v.dark,d.dark);}r.setAttribute(c[k].attr,s);}catch(e){}}})();`;
