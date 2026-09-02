// Renders the invitation page in a real browser and saves stills.
//   node shots.mjs        ->  shots/*.png
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.INVITE_URL || 'http://127.0.0.1:8789/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];

async function capture(name, width, height, full) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) problems.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#campuses .campus', { timeout: 8000 });

  // nothing should push the page sideways
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`${name}: page scrolls sideways by ${overflow}px`);

  await page.screenshot({ path: `shots/${name}.png`, fullPage: full });
  await page.close();
}

await capture('desktop', 1440, 900, true);
await capture('phone', 390, 844, true);

await browser.close();

if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
} else {
  console.log('shots written, no console errors, no sideways scroll');
}
