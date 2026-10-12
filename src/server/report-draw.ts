// Small drawing helpers for the PDF report: colours, text that always fits its box, and rounded rectangles.
import { rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';

export const hex = (value: string) => {
  const n = parseInt(value.slice(1), 16);

  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

export const INK = hex('#3b2f24');
export const MUTED = hex('#6f5e4a');
export const LINE = hex('#e2d3b6');
export const PAPER = hex('#f3e8d3');
export const SURFACE = hex('#faf2e1');
export const CLAY = hex('#b8643c');
export const MOSS = hex('#5a6b3d');
export const MISSED = hex('#e6c3ae');
export const NONE = hex('#eadfc6');

const charSets = new WeakMap<PDFFont, Set<number>>();

/** The fonts cannot draw every letter (emoji, scripts the Latin subset leaves out): those are left out, and a name with nothing left shows a question mark. */
export const safe = (font: PDFFont, value: string): string => {
  const known = charSets.get(font) ?? new Set(font.getCharacterSet());

  charSets.set(font, known);

  const shown = [...value]
    .filter(char => {
      return known.has(char.codePointAt(0) ?? 0);
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return shown === '' && value.trim() !== '' ? '?' : shown;
};

interface Fitted {
  value: string;
  size: number;
}

/**
 * The text at its size if it fits `width`; otherwise smaller (down to `min`), and then cut with an ellipsis. A width scales
 * with the size, so the smaller size is worked out in one step, and the cut is found by halving.
 */
export const fitted = (font: PDFFont, input: string, size: number, width: number, min = size): Fitted => {
  const value = safe(font, input);
  const full = font.widthOfTextAtSize(value, size);
  const current = full > width && min < size ? Math.max(min, Math.floor(((size * width) / full) * 2) / 2) : size;

  if (font.widthOfTextAtSize(value, current) <= width) {
    return { value, size: current };
  }

  let low = 0;
  let high = value.length;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);

    if (font.widthOfTextAtSize(`${value.slice(0, mid).trimEnd()}…`, current) <= width) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return { value: low === 0 ? '…' : `${value.slice(0, low).trimEnd()}…`, size: current };
};

export interface TextStyle {
  font: PDFFont;
  size: number;
  /** The most width the text may take: it shrinks (down to `min`) and is then cut, so it never runs over. */
  width: number;
  min?: number;
  color?: Color;
}

export const text = (page: PDFPage, input: string, x: number, y: number, style: TextStyle) => {
  const { font, size, width, min, color = INK } = style;
  const { value, size: shown } = fitted(font, input, size, width, min);

  page.drawText(value, { x, y, font, size: shown, color });
};

/** Right-aligned at `edge`. */
export const right = (page: PDFPage, input: string, edge: number, y: number, style: TextStyle) => {
  const { font, size, width, min, color = MUTED } = style;
  const { value, size: shown } = fitted(font, input, size, width, min);

  page.drawText(value, { x: edge - font.widthOfTextAtSize(value, shown), y, font, size: shown, color });
};

export interface Box {
  x: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

/** A rectangle with rounded corners (the PDF library has none): a path of lines and arcs, drawn down from its top edge. */
export const rounded = (
  page: PDFPage,
  box: Box,
  paint: { color: Color; borderColor?: Color; borderWidth?: number },
) => {
  const { x, top, width, height, radius: r } = box;
  const path = [
    `M ${r} 0`,
    `H ${width - r}`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `V ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `H ${r}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `V ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    'Z',
  ].join(' ');

  page.drawSvgPath(path, { x, y: top, ...paint });
};
