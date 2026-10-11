/**
 * The look of the app besides light/dark: a theme (the page and surface colours) and an accent (the button colour,
 * the logo and the heatmap). Both are `data-*` attributes on <html> that globals.css reads, and both are remembered in
 * localStorage. The stock choice sets no attribute at all, so the plain CSS is the stock look.
 */
export const PALETTES = ['cadence', 'ocean', 'graphite', 'blossom'] as const;
export const ACCENTS = ['moss', 'clay', 'sky', 'plum', 'teal'] as const;

export type Palette = (typeof PALETTES)[number];
export type Accent = (typeof ACCENTS)[number];
export type Kind = 'palette' | 'accent';

export const DEFAULT_PALETTE: Palette = 'cadence';
export const DEFAULT_ACCENT: Accent = 'moss';

/** What each accent button looks like in the picker. Must match `--btn` in the light blocks of globals.css (tested). */
export const ACCENT_SWATCH: Record<Accent, string> = {
  moss: '#5a6b3d',
  clay: '#a8512b',
  sky: '#3f6f98',
  plum: '#7d5a8c',
  teal: '#2f6f69',
};

/** The page and surface colours of each theme, for its chip in the picker. Must match globals.css (tested). */
export const PALETTE_PREVIEW: Record<Palette, { bg: string; surface: string }> = {
  cadence: { bg: '#f3e8d3', surface: '#faf2e1' },
  ocean: { bg: '#e6eef2', surface: '#f2f7f9' },
  graphite: { bg: '#ececec', surface: '#f7f7f7' },
  blossom: { bg: '#f6e6ea', surface: '#fcf1f4' },
};

const CONFIG = {
  palette: { options: PALETTES as readonly string[], fallback: DEFAULT_PALETTE as string, attr: 'data-palette' },
  accent: { options: ACCENTS as readonly string[], fallback: DEFAULT_ACCENT as string, attr: 'data-accent' },
};

const storageKey = (kind: Kind) => {
  return `cadence-${kind}`;
};

interface RootLike {
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
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

/** Puts a choice on <html>; the default removes the attribute. */
const applyChoice = (kind: Kind, value: string, root: RootLike) => {
  const { attr, fallback } = CONFIG[kind];

  if (value === fallback) {
    root.removeAttribute(attr);

    return;
  }

  root.setAttribute(attr, value);
};

export const readChoice = <K extends Kind>(kind: K, root: RootLike): Choice<K> => {
  return parseChoice(kind, root.getAttribute(CONFIG[kind].attr));
};

/** Applies a choice and remembers it. Storage can be blocked (private windows), so the choice still applies then. */
export const writeChoice = (kind: Kind, value: string, root: RootLike, storage: StorageLike) => {
  const choice = parseChoice(kind, value);

  applyChoice(kind, choice, root);

  try {
    storage.setItem(storageKey(kind), choice);
  } catch {
    // The choice lasts for this visit only.
  }
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

    applyChoice(kind, parseChoice(kind, saved), root);
  }
};

/**
 * The same as `restoreChoices`, as plain JavaScript for a <script> in <head>, so the saved look is on <html> before
 * the first paint and the page never flashes the stock colours. Kept in sync with the code above by a test.
 */
export const BOOT_SCRIPT = `(function(){var r=document.documentElement;var c=${JSON.stringify({
  palette: { ...CONFIG.palette, key: storageKey('palette') },
  accent: { ...CONFIG.accent, key: storageKey('accent') },
})};for(var k in c){try{var v=localStorage.getItem(c[k].key);if(v&&v!==c[k].fallback&&c[k].options.indexOf(v)>-1){r.setAttribute(c[k].attr,v);}}catch(e){}}})();`;
