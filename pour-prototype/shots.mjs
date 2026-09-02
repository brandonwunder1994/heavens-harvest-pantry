// Renders the pour in a real browser and saves stills of each beat.
//   node shots.mjs        ->  shots/*.png
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const PAGE_URL = process.env.POUR_URL || 'http://127.0.0.1:8788/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--use-gl=angle', '--use-angle=default', '--enable-unsafe-swiftshader'],
});

const problems = [];

async function capture(name, width, height, work) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForFunction('!!window.__pour', null, { timeout: 15000 });
  await work(page, name);
  await page.close();
}

await capture('desktop', 1440, 900, async (page, name) => {
  // let it play all the way through, words and all
  await page.waitForSelector('.words.in', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${name}-final.png` });

  // then step back through the beats
  for (const [label, t] of [['0.0s', 0.02], ['0.4s', 0.4], ['0.9s', 0.9], ['1.5s', 1.5], ['2.1s', 2.1]]) {
    await page.evaluate((s) => window.__pour.seek(s), t);
    await page.waitForTimeout(120);
    await page.screenshot({ path: `shots/${name}-${label}.png` });
  }
});

await capture('phone', 390, 844, async (page, name) => {
  await page.waitForSelector('.words.in', { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/${name}-final.png` });
});

await browser.close();

if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems) console.log(' -', p);
  process.exitCode = 1;
} else {
  console.log('shots written, no console errors');
}
