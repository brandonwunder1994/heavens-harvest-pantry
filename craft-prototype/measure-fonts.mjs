// Measures the shop's three faces against the fonts already on the machine, and
// writes the fallbacks that stop the page jumping while they load.
//
//   node measure-fonts.mjs      ->  fallback-fonts.css
//
// The problem: the page paints in Georgia, then Cormorant arrives and every
// line reflows, because the two faces are not the same width or the same
// height. That lurch is the single most cheap-looking thing a good-looking site
// does, and everybody has seen it a thousand times without knowing what it was.
//
// The fix is not to hide the text until the font lands — that trades a jump for
// a blank page. It is to squeeze the fallback until it occupies almost exactly
// the same space, so the swap is nearly invisible.
//
// Nothing here is guessed. Chrome measures both faces and the numbers fall out.

import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PAGE_URL = process.env.CRAFT_URL || 'http://127.0.0.1:8794/index.html';

// Each of the shop's faces, and the closest thing already on almost every
// machine. Georgia is on Windows and macOS; Arial and Helvetica cover the rest.
const PAIRS = [
  { name: 'Cinzel Fallback', web: 'Cinzel', local: 'Georgia, "Times New Roman", serif', weight: 600 },
  { name: 'Cormorant Fallback', web: 'Cormorant Garamond', local: 'Georgia, "Times New Roman", serif', weight: 500 },
  { name: 'Karla Fallback', web: 'Karla', local: 'Arial, Helvetica, sans-serif', weight: 400 },
];

// Long, mixed, and made of the words this site actually sets.
const SAMPLE =
  'Made slow, in a real kitchen. Taste and see that the Lord is good. ' +
  'Small-batch granola, hand-stirred, jarred by hand, and dropped at your door ' +
  'on Thursday. HEAVEN’S HARVEST PANTRY · Vistancia & Anthem, Arizona 0123456789';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

const measured = await page.evaluate(
  ({ pairs, sample }) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function metrics(family, weight) {
      ctx.font = `${weight} 100px ${family}`;
      const m = ctx.measureText(sample);
      return {
        width: m.width,
        ascent: m.fontBoundingBoxAscent,
        descent: m.fontBoundingBoxDescent,
      };
    }

    return pairs.map((pair) => {
      const web = metrics(`"${pair.web}"`, pair.weight);
      const local = metrics(pair.local, pair.weight);
      // Squeeze the fallback so a line of it is as wide as a line of the real
      // face. 100px em, so the numbers are already percentages.
      const sizeAdjust = (web.width / local.width) * 100;
      // The overrides are read against the ADJUSTED em, so they are the real
      // face's metrics divided by the same factor.
      const scale = sizeAdjust / 100;
      return {
        ...pair,
        webWidth: web.width,
        localWidth: local.width,
        sizeAdjust,
        ascent: (web.ascent / 100 / scale) * 100,
        descent: (web.descent / 100 / scale) * 100,
      };
    });
  },
  { pairs: PAIRS, sample: SAMPLE },
);

await browser.close();

const round = (n) => Math.round(n * 10) / 10;

const blocks = measured
  .map(
    (m) => `/* ${m.web}: a line of the fallback was ${round((m.localWidth / m.webWidth) * 100)}% of
   the real width before this, so it is squeezed to ${round(m.sizeAdjust)}%. */
@font-face {
  font-family: '${m.name}';
  src: local(${m.local.split(',')[0].trim()});
  size-adjust: ${round(m.sizeAdjust)}%;
  ascent-override: ${round(m.ascent)}%;
  descent-override: ${round(m.descent)}%;
  line-gap-override: 0%;
}`,
  )
  .join('\n\n');

const css = `/* Written by measure-fonts.mjs. Do not edit by hand.

   Metric-matched stand-ins for the shop's three faces, measured in Chrome
   against fonts already on the machine. Put each one immediately after its real
   face in the font stack and the page stops lurching when the webfonts land:

     font-family: 'Cormorant Garamond', 'Cormorant Fallback', Georgia, serif;

   Re-run measure-fonts.mjs if a face or a weight ever changes. */

${blocks}
`;

writeFileSync(fileURLToPath(new URL('./fallback-fonts.css', import.meta.url)), css, 'utf8');

console.log('fallback-fonts.css written\n');
for (const m of measured) {
  console.log(
    `${m.web.padEnd(20)} fallback was ${round((m.localWidth / m.webWidth) * 100)
      .toString()
      .padStart(6)}% of the real width  ->  squeezed to ${round(m.sizeAdjust)}%`,
  );
}
