// Renders the weekly verse page in a real browser and saves stills.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const PAGE_URL = process.env.VERSE_URL || 'http://127.0.0.1:8790/index.html';
mkdirSync(new URL('./shots/', import.meta.url), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];

async function capture(name, width, height, opts = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) problems.push(`${name}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`${name}: ${e.message}`));
  if (opts.clock) await page.clock.setFixedTime(new Date(opts.clock));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#wall .mini', { timeout: 8000 });
  await page.waitForTimeout(1800);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${name}: page scrolls sideways by ${overflow}px`);
  const empty = await page.evaluate(() => document.getElementById('verse-text').textContent.trim().length < 10);
  if (empty) problems.push(`${name}: no verse rendered`);

  await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
  await page.close();
}

await capture('desktop', 1440, 900);
await capture('phone', 390, 844);

// Prove the rotation actually moves with the calendar.
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const seen = [];
for (const day of ['2026-09-01', '2026-09-08', '2026-09-15']) {
  await page.clock.setFixedTime(new Date(day + 'T09:00:00'));
  await page.goto(PAGE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('#verse-ref');
  seen.push(await page.$eval('#verse-ref', (e) => e.textContent));
}
await page.close();
await browser.close();

console.log('three consecutive weeks ->', seen.join(' | '));
if (new Set(seen).size !== 3) problems.push('the verse did not change week to week');

if (problems.length) { console.log('PROBLEMS:'); problems.forEach((p) => console.log(' -', p)); process.exitCode = 1; }
else console.log('shots written; no errors, no sideways scroll, rotation advances');
