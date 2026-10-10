// Draws every icon from src/app/icon.svg: the .ico, the iOS touch icon and the app-manifest icons.
// Run it after changing the SVG: `node scripts/generate-icons.mjs`.
import fs from 'node:fs';
import sharp from 'sharp';

const svg = fs.readFileSync('src/app/icon.svg');
// iOS rounds the corners itself, so its icon is a plain square.
const square = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'));

const png = (source, size) => {
  return sharp(source, { density: 384 }).resize(size, size).png().toBuffer();
};

// An .ico file is a small header plus the images; modern browsers accept PNG images inside it.
const ico = async sizes => {
  const images = await Promise.all(
    sizes.map(size => {
      return png(svg, size);
    }),
  );
  const header = Buffer.alloc(6 + images.length * 16);

  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;

  images.forEach((image, i) => {
    const entry = 6 + i * 16;

    header.writeUInt8(sizes[i], entry);
    header.writeUInt8(sizes[i], entry + 1);
    header.writeUInt16LE(1, entry + 4); // colour planes
    header.writeUInt16LE(32, entry + 6); // bits per pixel
    header.writeUInt32LE(image.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });

  return Buffer.concat([header, ...images]);
};

fs.writeFileSync('src/app/favicon.ico', await ico([16, 32, 48]));
fs.writeFileSync('src/app/apple-icon.png', await png(square, 180));
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/icon-192.png', await png(svg, 192));
fs.writeFileSync('public/icon-512.png', await png(svg, 512));
console.log('icons written');
