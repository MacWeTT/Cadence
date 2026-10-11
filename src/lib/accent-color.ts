/**
 * Turns any colour a person picks into a button colour for each theme mode that still has readable text on it.
 * The stock button text colours are fixed (see `--btn-text` in globals.css), so the picked colour is moved along its
 * lightness, keeping its hue and saturation, until the pair reaches WCAG AA (4.5:1).
 */
export const BTN_TEXT = { light: '#faf2e1', dark: '#1a1d21' } as const;

const AA = 4.5;
const STEP = 0.005;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `#abc`, `abc` and `#AABBCC` all become `#aabbcc`; anything else is null. */
export const parseHex = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const match = HEX.exec(value.trim());

  if (!match) {
    return null;
  }

  const digits = match[1].toLowerCase();
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map(c => {
            return c + c;
          })
          .join('')
      : digits;

  return `#${full}`;
};

const channels = (hex: string): [number, number, number] => {
  return [1, 3, 5].map(i => {
    return parseInt(hex.slice(i, i + 2), 16) / 255;
  }) as [number, number, number];
};

const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(v => {
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => {
    return y - x;
  });

  return (hi + 0.05) / (lo + 0.05);
};

const toHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = channels(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) {
    return [0, 0, l];
  }

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;

  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  return [(h * 60 + 360) % 360, s, l];
};

const fromHsl = (h: number, s: number, l: number): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const sector = Math.floor(h / 60) % 6;
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector];

  return `#${[r, g, b]
    .map(v => {
      return Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
};

/** Moves the lightness (down for a light button text, up for a dark one) until the text is readable on it. */
const settle = (hex: string, text: string, direction: 1 | -1): string => {
  if (contrastRatio(text, hex) >= AA) {
    return hex;
  }

  const [h, s, start] = toHsl(hex);

  for (let l = start; l >= 0 && l <= 1; l += direction * STEP) {
    const candidate = fromHsl(h, s, l);

    if (contrastRatio(text, candidate) >= AA) {
      return candidate;
    }
  }

  return direction === 1 ? '#ffffff' : '#000000';
};

/** The light-theme and dark-theme button colours for a picked colour, or null when it is not a colour. */
export const deriveAccent = (value: string): { hex: string; light: string; dark: string } | null => {
  const hex = parseHex(value);

  if (!hex) {
    return null;
  }

  const { light: lightText, dark: darkText } = BTN_TEXT;

  return {
    hex,
    light: settle(hex, lightText, -1),
    dark: settle(hex, darkText, 1),
  };
};
