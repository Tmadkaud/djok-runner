// Generates PWA icons from public/opportune-logo.png on a brand-color background.
// Run once with: node scripts/make-pwa-icons.cjs
const sharp = require('sharp');
const path = require('path');

const SRC = path.join(__dirname, '..', 'public', 'opportune-logo.png');
const OUT = path.join(__dirname, '..', 'public');

const BG = { r: 10, g: 61, b: 79, alpha: 1 }; // #0a3d4f opp-deep

async function makeSquare(size, logoFraction, outName) {
  const logoSize = Math.round(size * logoFraction);
  const logo = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(logo).metadata();
  const left = Math.round((size - meta.width) / 2);
  const top = Math.round((size - meta.height) / 2);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toFile(path.join(OUT, outName));
  console.log('wrote', outName, size + 'x' + size);
}

(async () => {
  await makeSquare(192, 0.78, 'icon-192.png');
  await makeSquare(512, 0.78, 'icon-512.png');
  await makeSquare(512, 0.6, 'icon-512-maskable.png');
  await makeSquare(180, 0.78, 'apple-touch-icon.png');
})();
