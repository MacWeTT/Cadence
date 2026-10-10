// Draws the Cadence logo files.
//   mark     the ring "C" with its dot: the compact logo, the favicon and the app icon
//   logo     the wordmark "Cadence." (moss C, ink letters, clay full stop): the full logo
//   stacked  the mark above the word, for splash and login screens
// The wordmark is Gelasio (a Georgia look-alike under the SIL Open Font License) turned into outlines, so no font is
// needed to show it. Each letter is its own shape, so the app can animate the ring "C" expanding into the word.
//
// Run:  npm i --no-save opentype.js @fontsource/gelasio && node scripts/generate-logo.mjs && node scripts/generate-icons.mjs
import fs from 'node:fs';
import opentype from 'opentype.js';

const bytes = fs.readFileSync('node_modules/@fontsource/gelasio/files/gelasio-latin-500-normal.woff');
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const unit = font.unitsPerEm;
const capHeight = font.tables.os2.sCapHeight / unit;

const COLORS = {
  light: { moss: '#6c7d45', clay: '#b8643c', ink: '#3b2f24' },
  dark: { moss: '#9bb06a', clay: '#e0905f', ink: '#f0e4d0' },
};

const round = n => {
  return Math.round(n * 100) / 100;
};

/** Lays plain Latin text out glyph by glyph with kerning (this font's shaping tables need a feature opentype.js lacks). */
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

    glyphs.push({ char, path, box: path.getBoundingBox() });
    pen += (glyph.advanceWidth * size) / unit;
    previous = glyph;
  }

  return glyphs;
};

/** The ring "C" and its dot, drawn in a 100-unit box and scaled so its outer diameter is `diameter`, centred on (cx, cy). */
const mark = (cx, cy, diameter) => {
  const s = diameter / 82; // the ring's outer diameter is 82 units, so a round stroke never touches the box edge
  const r = 34 * s;
  const angle = (38 * Math.PI) / 180;
  const x = cx - 50 * s + (50 + 34 * Math.cos(angle)) * s;
  const dy = 34 * Math.sin(angle) * s;

  return {
    ring: `M${round(x)} ${round(cy - dy)}A${round(r)} ${round(r)} 0 1 0 ${round(x)} ${round(cy + dy)}`,
    strokeWidth: round(14 * s),
    dot: { cx: round(cx - 50 * s + 83 * s), cy: round(cy), r: round(8 * s) },
  };
};

const svg = (viewBox, body) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>\n`;
};

const markBody = (m, colors) => {
  return (
    `<path d="${m.ring}" fill="none" stroke="${colors.moss}" stroke-width="${m.strokeWidth}" stroke-linecap="round"/>` +
    `<circle cx="${m.dot.cx}" cy="${m.dot.cy}" r="${m.dot.r}" fill="${colors.clay}"/>`
  );
};

// The full logo: "Cadence" and a clay full stop.
const SIZE = 100;
const pad = 8;
const base = pad + capHeight * SIZE + 4;
const letters = layout('Cadence', pad, base, SIZE);
const [first, ...rest] = letters;
const last = letters[letters.length - 1];
const dotR = SIZE * 0.065;
const stop = { cx: round(last.box.x2 + SIZE * 0.07 + dotR), cy: round(base - dotR), r: round(dotR) };
const wordBox = `0 0 ${round(stop.cx + dotR + pad)} ${round(base + pad)}`;

// The ring sits over the C, the same height, for the animation that starts as the ring and becomes the letter.
const cHeight = first.box.y2 - first.box.y1;
const ringOverC = mark((first.box.x1 + first.box.x2) / 2, (first.box.y1 + first.box.y2) / 2, cHeight);

const wordSvg = colors => {
  return svg(
    wordBox,
    `<path d="${first.path.toPathData(2)}" fill="${colors.moss}"/>` +
      rest
        .map(g => {
          return `<path d="${g.path.toPathData(2)}" fill="${colors.ink}"/>`;
        })
        .join('') +
      `<circle cx="${stop.cx}" cy="${stop.cy}" r="${stop.r}" fill="${colors.clay}"/>`,
  );
};

// Stacked: the ring above the plain word.
const STACK_SIZE = 70;
const stackRingD = 128;
const stackLetters = layout('Cadence', 0, 0, STACK_SIZE);
const sx1 = stackLetters[0].box.x1;
const sx2 = stackLetters[stackLetters.length - 1].box.x2;
const stackW = Math.max(sx2 - sx1, stackRingD) + pad * 2;
const stackTop = pad + stackRingD + 28;
const stackRing = mark(stackW / 2, pad + stackRingD / 2, stackRingD);
const placed = layout('Cadence', (stackW - (sx2 - sx1)) / 2 - sx1, stackTop - stackLetters[0].box.y1, STACK_SIZE);
const stackH = round(stackTop - stackLetters[0].box.y1 + pad + 4);

const stackedSvg = colors => {
  return svg(
    `0 0 ${round(stackW)} ${stackH}`,
    markBody(stackRing, colors) +
      placed
        .map(g => {
          return `<path d="${g.path.toPathData(2)}" fill="${colors.ink}"/>`;
        })
        .join(''),
  );
};

// The favicon / app icon tile: a cream ring and dot on the moss tile.
const tile = svg(
  '0 0 512 512',
  `<rect width="512" height="512" rx="112" fill="#5f7036"/>` +
    markBody(mark(256, 256, 352), { moss: '#f3e8d3', clay: '#f3e8d3', ink: '' }),
);

fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/mark.svg', svg('0 0 100 100', markBody(mark(50, 50, 82), COLORS.light)));
fs.writeFileSync('public/brand/mark-dark.svg', svg('0 0 100 100', markBody(mark(50, 50, 82), COLORS.dark)));
fs.writeFileSync('public/brand/logo.svg', wordSvg(COLORS.light));
fs.writeFileSync('public/brand/logo-dark.svg', wordSvg(COLORS.dark));
fs.writeFileSync('public/brand/logo-stacked.svg', stackedSvg(COLORS.light));
fs.writeFileSync('public/brand/logo-stacked-dark.svg', stackedSvg(COLORS.dark));
fs.writeFileSync('src/app/icon.svg', tile);

// What the app's logo components draw: the same shapes, coloured by the theme's CSS variables instead.
fs.mkdirSync('src/components/logo', { recursive: true });
fs.writeFileSync(
  'src/components/logo/logo-shapes.ts',
  `// Generated by scripts/generate-logo.mjs. Do not edit by hand.

/** The ring "C" and its dot, in a 100-unit box (the compact logo). */
export const MARK = ${JSON.stringify(mark(50, 50, 82))};

/** The full logo: one path per letter ("Cadence"), the clay full stop, and the ring laid over the C for the animation. */
export const WORDMARK = ${JSON.stringify({
    viewBox: wordBox,
    letters: letters.map(g => {
      return { char: g.char, d: g.path.toPathData(2) };
    }),
    stop,
    ring: ringOverC,
    ringCenter: {
      cx: round((first.box.x1 + first.box.x2) / 2),
      cy: round((first.box.y1 + first.box.y2) / 2),
    },
  })};
`,
);

console.log('logo written', { wordBox, stackBox: `0 0 ${round(stackW)} ${stackH}` });
