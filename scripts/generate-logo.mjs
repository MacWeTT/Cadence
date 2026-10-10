// Draws the Cadence logo files.
//   mark   "C." — a ring "C" (moss) and a clay full stop: the compact logo, the favicon and the app icon
//   logo   "Cadence." — the same ring as the first letter, then "adence" (ink) and the clay full stop: the full logo
// The letters are Quicksand Bold (SIL Open Font License) turned into outlines, so no font is needed to show them. The
// ring's stroke matches the letters' stems, and the full stop is the only orange. Each letter is its own shape, so the
// app can animate "C." growing into "Cadence."
//
// Run:  npm i --no-save opentype.js @fontsource/quicksand && node scripts/generate-logo.mjs && npx prettier --write src/components/logo/logo-shapes.ts && node scripts/generate-icons.mjs
import fs from 'node:fs';
import opentype from 'opentype.js';

const bytes = fs.readFileSync('node_modules/@fontsource/quicksand/files/quicksand-latin-700-normal.woff');
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const unit = font.unitsPerEm;

const COLORS = {
  light: { moss: '#6c7d45', clay: '#b8643c', ink: '#3b2f24' },
  dark: { moss: '#9bb06a', clay: '#e0905f', ink: '#f0e4d0' },
};

const round = n => {
  return Math.round(n * 100) / 100;
};

/** Lays plain Latin text out glyph by glyph with kerning. */
const layout = (text, x, y, size) => {
  const glyphs = [];
  let pen = x;
  let previous = null;

  for (const char of text) {
    const glyph = font.charToGlyph(char);

    if (previous) {
      pen += (font.getKerningValue(previous, glyph) * size) / unit;
    }

    const path = glyph.getPath(pen, y, size);

    glyphs.push({ char, d: path.toPathData(2), box: path.getBoundingBox() });
    pen += (glyph.advanceWidth * size) / unit;
    previous = glyph;
  }

  return glyphs;
};

const SIZE = 100;
const pad = 10;
const top = char => {
  return (font.charToGlyph(char).getBoundingBox().y2 / unit) * SIZE;
};
const stem = (() => {
  const box = font.charToGlyph('I').getBoundingBox();

  return ((box.x2 - box.x1) / unit) * SIZE;
})();
const xHeight = top('x');
const ascender = top('d');
const diameter = xHeight * 1.05; // a little over the x-height, as a round letter overshoots
const base = pad + ascender + 2; // the baseline
const dotR = round(stem * 0.65);
const gap = SIZE * 0.07; // between the ring and the full stop

/** The ring "C" with a 40° mouth, the same height as a lowercase letter, its left edge at x. */
const ring = x => {
  const r = (diameter - stem) / 2;
  const cx = x + diameter / 2;
  const cy = base - xHeight / 2;
  const angle = (40 * Math.PI) / 180;
  const ex = cx + r * Math.cos(angle);
  const dy = r * Math.sin(angle);

  return {
    d: `M${round(ex)} ${round(cy - dy)}A${round(r)} ${round(r)} 0 1 0 ${round(ex)} ${round(cy + dy)}`,
    strokeWidth: round(stem),
  };
};

const ringShape = ring(pad);
const ringRight = pad + diameter;

// The mark: "C." — the ring and the full stop on its baseline.
const markStop = { cx: round(ringRight + gap + dotR), cy: round(base - dotR), r: dotR };
const markBox = `0 0 ${round(markStop.cx + dotR + pad)} ${round(base + pad)}`;
const markWidth = markStop.cx + dotR + pad;

// The word: the ring, then "adence", then the full stop.
const letters = layout('adence', ringRight + SIZE * 0.025, base, SIZE);
const last = letters[letters.length - 1].box;
const stop = { cx: round(last.x2 + gap + dotR), cy: round(base - dotR), r: dotR };
const wordBox = `0 0 ${round(stop.cx + dotR + pad)} ${round(base + pad)}`;

const svg = (viewBox, body) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>\n`;
};

const ringPath = (colors, shape = ringShape) => {
  return `<path d="${shape.d}" fill="none" stroke="${colors.moss}" stroke-width="${shape.strokeWidth}" stroke-linecap="round"/>`;
};

const dotCircle = (colors, d) => {
  return `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="${colors.clay}"/>`;
};

const markSvg = colors => {
  return svg(markBox, ringPath(colors) + dotCircle(colors, markStop));
};

const wordSvg = colors => {
  return svg(
    wordBox,
    ringPath(colors) +
      letters
        .map(g => {
          return `<path d="${g.d}" fill="${colors.ink}"/>`;
        })
        .join('') +
      dotCircle(colors, stop),
  );
};

// The favicon / app icon tile: the mark on a cream tile, 74% of the tile wide and centred.
const scale = (512 * 0.74) / (markStop.cx + dotR - pad);
const tileRing = ringShape;
const tile = svg(
  '0 0 512 512',
  `<rect width="512" height="512" rx="112" fill="#f3e8d3"/>` +
    `<g transform="translate(${round(256 - ((markStop.cx + dotR + pad) / 2) * scale)} ${round(256 - (base - xHeight / 2) * scale)}) scale(${round(scale * 1000) / 1000})">` +
    ringPath(COLORS.light, tileRing) +
    dotCircle(COLORS.light, markStop) +
    `</g>`,
);

fs.mkdirSync('public/brand', { recursive: true });
fs.rmSync('public/brand/logo-stacked.svg', { force: true });
fs.rmSync('public/brand/logo-stacked-dark.svg', { force: true });
fs.writeFileSync('public/brand/mark.svg', markSvg(COLORS.light));
fs.writeFileSync('public/brand/mark-dark.svg', markSvg(COLORS.dark));
fs.writeFileSync('public/brand/logo.svg', wordSvg(COLORS.light));
fs.writeFileSync('public/brand/logo-dark.svg', wordSvg(COLORS.dark));
fs.writeFileSync('src/app/icon.svg', tile);

// What the app's logo component draws: the same shapes, coloured by the theme's CSS variables instead.
fs.mkdirSync('src/components/logo', { recursive: true });
fs.writeFileSync(
  'src/components/logo/logo-shapes.ts',
  `// Generated by scripts/generate-logo.mjs. Do not edit by hand.

/** The full logo "Cadence.": the ring is the first letter, then one path per letter of "adence", then the full stop. */
export const WORDMARK = ${JSON.stringify({
    viewBox: wordBox,
    ring: ringShape,
    letters: letters.map(g => {
      return { char: g.char, d: g.d };
    }),
    stop,
    /** Where the full stop sits in the compact logo "C.", for the animation that starts there. */
    markStop,
    /** Left edge of the ring, for centring the compact logo. */
    ringLeft: pad,
  })};
`,
);

console.log('logo written', { markBox, wordBox, stem: round(stem), markWidth: round(markWidth) });
