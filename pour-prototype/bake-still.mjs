// Bakes the still frame that stands in for the pour.
//
//   python -m http.server 8788 --directory .
//   node bake-still.mjs
//
// Renders the settled scene once, here, in a real browser, and writes it out as
// two photographs — one for a landscape screen, one for a phone held upright,
// framed exactly the way the 3D frames itself at each shape. Also writes a
// twenty-pixel-wide version of each, small enough to live inside the stylesheet,
// so there is warm colour on the page before anything at all has downloaded.
//
// Nothing here runs in a visitor's browser. This is a kitchen job: run it when
// the scene changes, commit what falls out.

import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const PAGE_URL = process.env.POUR_URL || 'http://127.0.0.1:8788/index.html';
const OUT = new URL('./still/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// Quality is chosen by eye against file size: this is a soft, warm, low-contrast
// scene, which is the kind WebP is kindest to.
const QUALITY = 0.74;
const LQIP_QUALITY = 0.5;
const LQIP_WIDTH = 20;

const SPECS = [
  // shot at twice the size and scaled down, which is how you get a clean edge
  // on the glass without shipping a retina-sized file
  { key: 'wide', shoot: { width: 1440, height: 900 }, scale: 2, out: [1600, 1000] },
  { key: 'tall', shoot: { width: 390, height: 844 }, scale: 3, out: [860, 1861] },
];

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader'],
});

// A scratch page that does nothing but resize and re-encode images.
const kitchen = await browser.newPage();
await kitchen.setContent('<title>encoder</title>');

async function encode(pngBase64, width, height, quality) {
  return kitchen.evaluate(async ({ src, width, height, quality }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    const url = c.toDataURL('image/webp', quality);
    if (!url.startsWith('data:image/webp')) throw new Error('this browser did not encode webp');
    return url.slice(url.indexOf(',') + 1);
  }, { src: pngBase64, width, height, quality });
}

const problems = [];
const lqip = {};

for (const spec of SPECS) {
  const page = await browser.newPage({ viewport: spec.shoot, deviceScaleFactor: spec.scale });
  page.on('pageerror', (e) => problems.push(`${spec.key}: ${e.message}`));

  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__pour', null, { timeout: 20000 });
  // The words arrive when the last cluster has stopped moving, so this is the
  // scene at rest — the exact frame the fallback is standing in for.
  await page.waitForSelector('.words.in', { state: 'attached', timeout: 20000 });
  await page.waitForTimeout(700);

  // Everything laid over the render — the light shaft, the grain, the scrim,
  // the words — is CSS, and it goes over the still frame just the same. So the
  // baked photograph is the render and nothing else.
  await page.evaluate(() => {
    for (const sel of ['.chrome', '.scrim', '.shaft', '.grain', '.vignette', '.still']) {
      const n = document.querySelector(sel);
      if (n) n.style.display = 'none';
    }
    document.documentElement.style.background = 'transparent';
  });

  const shot = await page.locator('canvas.scene').screenshot({ type: 'png' });
  await page.close();

  const [w, h] = spec.out;
  const full = await encode(shot.toString('base64'), w, h, QUALITY);
  writeFileSync(new URL(`counter-${spec.key}.webp`, OUT), Buffer.from(full, 'base64'));

  const lh = Math.max(1, Math.round((LQIP_WIDTH * h) / w));
  lqip[spec.key] = await encode(shot.toString('base64'), LQIP_WIDTH, lh, LQIP_QUALITY);

  const kb = (Buffer.from(full, 'base64').length / 1024).toFixed(1);
  const lkb = (Buffer.from(lqip[spec.key], 'base64').length / 1024).toFixed(2);
  console.log(`${spec.key.padEnd(5)} ${w}x${h}  ${kb} KB   blur ${LQIP_WIDTH}x${lh} ${lkb} KB`);
}

await browser.close();

writeFileSync(
  new URL('lqip.css', OUT),
  `/* Written by bake-still.mjs. Do not edit by hand.
   Twenty pixels of the settled scene, small enough to sit inside the stylesheet,
   so the page has the right warm colour before a single image is requested. */
:root {
  --still-blur-wide: url("data:image/webp;base64,${lqip.wide}");
  --still-blur-tall: url("data:image/webp;base64,${lqip.tall}");
}
`,
  'utf8'
);
console.log('still/lqip.css written');

if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
}
